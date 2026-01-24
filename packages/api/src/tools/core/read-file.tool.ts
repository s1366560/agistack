import { ToolDefinition } from '@agistack/shared';
import { z } from 'zod';
import { readFileSync, existsSync } from 'node:fs';
import { extname } from 'node:path';
import { PathValidator } from '../validators/path-validator';
import { Sandbox } from '../sandbox';

/**
 * Read file tool - securely reads file contents
 */
export const readFileSyncTool: ToolDefinition = {
  name: 'read-file',
  description: 'Read the contents of a file from the filesystem',
  category: 'file' as const,
  inputSchema: z.object({
    path: z.string().min(1),
    encoding: z.enum(['utf-8', 'ascii', 'base64', 'binary']).default('utf-8'),
    startLine: z.number().int().min(1).optional(),
    endLine: z.number().int().min(1).optional(),
    maxSize: z.number().int().min(1).max(100_000_000).default(1_000_000), // 100MB max
  }),
  outputSchema: z.object({
    content: z.string(),
    encoding: z.string(),
    size: z.number(),
    isBinary: z.boolean().optional(),
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
    const { path, encoding = 'utf-8', startLine, endLine, maxSize } = input;

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

    // Check file exists
    if (!existsSync(path)) {
      return {
        success: false,
        error: `File not found: ${path}`,
      };
    }

    // Get file stats
    const stats = require('node:fs').statSync(path);

    // Check file size
    if (stats.size > maxSize) {
      return {
        success: false,
        error: `File too large: ${stats.size} bytes (max ${maxSize} bytes)`,
      };
    }

    // Execute file reading in sandbox
    const sandboxResult = await Sandbox.execute(
      async () => {
        const buffer = readFileSync(path);

        // Determine if file is binary
        const ext = extname(path).toLowerCase();
        const binaryExtensions = [
          '.bin', '.exe', '.dll', '.so', '.dylib', '.jpg', '.jpeg', '.png', '.gif', '.ico',
          '.pdf', '.zip', '.tar', '.gz', '.bz2', '.xz', '.7z', '.mp3', '.mp4', '.wav',
        ];
        const isBinary = binaryExtensions.includes(ext) || isBinaryFile(buffer);

        // Convert to requested encoding
        let content: string;
        if (encoding === 'base64') {
          content = buffer.toString('base64');
        } else if (encoding === 'binary' || encoding === 'ascii') {
          content = buffer.toString('ascii');
        } else {
          content = buffer.toString('utf-8');
        }

        // Apply line range if specified
        if (startLine || endLine) {
          content = applyLineRange(content, startLine, endLine);
        }

        return {
          content,
          encoding,
          size: stats.size,
          ...(isBinary && { isBinary }),
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
 * Check if buffer contains binary data
 */
function isBinaryFile(buffer: Buffer): boolean {
  // Check for null bytes in first 1KB
  const checkSize = Math.min(buffer.length, 1024);
  for (let i = 0; i < checkSize; i++) {
    if (buffer[i] === 0) {
      return true;
    }
  }
  return false;
}

/**
 * Extract a line range from text content
 */
function applyLineRange(
  content: string,
  startLine?: number,
  endLine?: number
): string {
  const lines = content.split('\n');

  const start = startLine ? Math.max(1, startLine) - 1 : 0;
  const end = endLine ? Math.min(lines.length, endLine) : lines.length;

  if (start >= lines.length) {
    return '';
  }

  return lines.slice(start, end).join('\n');
}
