import { ToolDefinition } from '@agistack/shared';
import { z } from 'zod';
import {
  writeFileSync,
  mkdirSync,
  existsSync,
  renameSync,
  readFileSync,
  copyFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { PathValidator } from '../validators/path-validator';
import { Sandbox } from '../sandbox';

/**
 * Write file tool - securely writes content to files
 */
export const writeFileSyncTool: ToolDefinition = {
  name: 'write-file',
  description: 'Write content to a file on the filesystem',
  category: 'file' as const,
  inputSchema: z.object({
    path: z.string().min(1),
    content: z.string(),
    encoding: z.enum(['utf-8', 'ascii', 'base64', 'binary']).default('utf-8'),
    mkdir: z.boolean().default(true),
    createBackup: z.boolean().default(false),
    maxSize: z.number().int().min(1).max(50_000_000).default(10_000_000), // 50MB max
  }),
  outputSchema: z.object({
    bytesWritten: z.number(),
    path: z.string(),
    encoding: z.string(),
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
    const { path, content, encoding, mkdir, createBackup, maxSize } = input;

    // Create path validator with default allowed roots
    const validator = new PathValidator([process.cwd()]);

    // Validate path
    const pathValidation = validator.validate(path, 'write');
    if (!pathValidation.valid) {
      return {
        success: false,
        error: pathValidation.error || 'Invalid file path',
      };
    }

    // Check content size
    const contentSize = Buffer.byteLength(content, encoding === 'base64' ? 'base64' : 'utf-8');
    if (contentSize > maxSize) {
      return {
        success: false,
        error: `Content too large: ${contentSize} bytes (max ${maxSize} bytes)`,
      };
    }

    // Execute file writing in sandbox
    const sandboxResult = await Sandbox.execute(
      async () => {
        // Create parent directory if needed
        if (mkdir && !existsSync(dirname(path))) {
          mkdirSync(dirname(path), { recursive: true });
        }

        // Create backup if requested
        if (createBackup && existsSync(path)) {
          const backupPath = `${path}.${Date.now()}.bak`;
          copyFileSync(path, backupPath);
        }

        // Convert content to buffer based on encoding
        let buffer: Buffer;
        if (encoding === 'base64') {
          buffer = Buffer.from(content, 'base64');
        } else if (encoding === 'binary' || encoding === 'ascii') {
          buffer = Buffer.from(content, 'ascii');
        } else {
          buffer = Buffer.from(content, 'utf-8');
        }

        // Write file atomically using temp file
        const tempPath = `${path}.tmp`;

        try {
          writeFileSync(tempPath, buffer);
          renameSync(tempPath, path);
        } catch (error) {
          // Clean up temp file if write failed
          if (existsSync(tempPath)) {
            require('node:fs').unlinkSync(tempPath);
          }
          throw error;
        }

        return {
          bytesWritten: buffer.length,
          path,
          encoding,
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
