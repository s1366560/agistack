import { ToolDefinition } from '@agistack/shared';
import { z } from 'zod';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PathValidator } from '../validators/path-validator';
import { Sandbox } from '../sandbox';

/**
 * List files tool - securely lists directory contents
 */
export const listFilesTool: ToolDefinition = {
  name: 'list-files',
  description: 'List files and directories in a given path',
  category: 'file' as const,
  inputSchema: z.object({
    path: z.string().min(1),
    recursive: z.boolean().default(false),
    includeDirectories: z.boolean().default(true),
    includeHidden: z.boolean().default(true),
    pattern: z.string().optional(),
  }),
  outputSchema: z.object({
    files: z.array(z.string()),
    count: z.number(),
    path: z.string(),
  }),
  permissions: [
    {
      resourceType: 'file',
      pattern: '/**',
      action: 'allow',
    },
  ],
  rateLimit: 100,
  handler: async (input: any, context: any) => {
    const { path, recursive, includeDirectories, includeHidden, pattern } = input;

    // Create path validator with default allowed roots
    const validator = new PathValidator([process.cwd()]);

    // Validate path
    const pathValidation = validator.validate(path, 'read');
    if (!pathValidation.valid) {
      return {
        success: false,
        error: pathValidation.error || 'Invalid file path',
      };
    }

    // Execute file listing in sandbox
    const sandboxResult = await Sandbox.execute(
      async () => {
        // Check if path exists
        if (!existsSync(path)) {
          throw new Error(`Directory not found: ${path}`);
        }

        // Check if path is a directory
        const stats = statSync(path);
        if (!stats.isDirectory()) {
          throw new Error(`Path is not a directory: ${path}`);
        }

        // List files
        const files = listFiles(path, path, {
          recursive,
          includeDirectories,
          includeHidden,
          pattern,
        });

        return {
          files,
          count: files.length,
          path,
        };
      },
      {
        timeoutMs: context.timeout || 30000,
      }
    );

    // Return just the data on success, full result on failure
    if (sandboxResult.success && sandboxResult.data) {
      return {
        success: true,
        data: sandboxResult.data,
      };
    }

    return sandboxResult;
  },
};

/**
 * List files in a directory with options
 */
function listFiles(
  dirPath: string,
  basePath: string,
  options: {
    recursive: boolean;
    includeDirectories: boolean;
    includeHidden: boolean;
    pattern?: string;
  }
): string[] {
  const {
    recursive = false,
    includeDirectories = true,
    includeHidden = true,
    pattern,
  } = options;

  const files: string[] = [];
  const entries = readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    // Skip hidden files if not included
    if (!includeHidden && entry.name.startsWith('.')) {
      continue;
    }

    const fullPath = join(dirPath, entry.name);
    // Calculate relative path from base path
    const relativePath = fullPath.replace(basePath + '/', '').replace(basePath, '');

    // Filter by pattern if specified
    if (pattern) {
      const regex = new RegExp(
        '^' +
          pattern
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.') +
          '$'
      );
      if (!regex.test(entry.name)) {
        // Still need to recurse into subdirectories if recursive
        if (entry.isDirectory() && recursive) {
          const subFiles = listFiles(fullPath, basePath, options);
          files.push(...subFiles);
        }
        continue;
      }
    }

    // Include directories if requested
    if (entry.isDirectory()) {
      if (includeDirectories) {
        files.push(relativePath);
      }

      // Recurse into subdirectories
      if (recursive) {
        const subFiles = listFiles(fullPath, basePath, options);
        files.push(...subFiles);
      }
    } else {
      // Include file
      files.push(relativePath);
    }
  }

  return files;
}
