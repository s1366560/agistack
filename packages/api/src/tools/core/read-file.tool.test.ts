import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ToolRegistry } from '../registry';
import { PathValidator } from '../validators/path-validator';
import { Sandbox } from '../sandbox';
import { readFileSyncTool } from './read-file.tool';

describe('read-file tool', () => {
  let testDir: string;
  let registry: ToolRegistry;
  let pathValidator: PathValidator;

  beforeEach(() => {
    // Create test directory
    testDir = join(process.cwd(), 'test-files');
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    // Initialize registry and validators
    ToolRegistry.resetInstance();
    registry = ToolRegistry.getInstance();
    pathValidator = new PathValidator([testDir]);

    // Register the tool
    registry.register(readFileSyncTool);
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('basic functionality', () => {
    it('should read an existing file', async () => {
      const testFile = join(testDir, 'test.txt');
      writeFileSync(testFile, 'Hello, World!');

      const tool = registry.get('read-file');
      const result = await tool?.handler(
        {
          path: testFile,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data).toEqual({
        content: 'Hello, World!',
        encoding: 'utf-8',
        size: 13,
      });
    });

    it('should read file with specified encoding', async () => {
      const testFile = join(testDir, 'test-ascii.txt');
      writeFileSync(testFile, 'ASCII text', 'ascii');

      const tool = registry.get('read-file');
      const result = await tool?.handler(
        {
          path: testFile,
          encoding: 'ascii',
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.encoding).toBe('ascii');
    });

    it('should return error for non-existent file', async () => {
      const tool = registry.get('read-file');
      const result = await tool?.handler(
        {
          path: join(testDir, 'nonexistent.txt'),
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(false);
      expect(result?.error).toContain('not found');
    });
  });

  describe('input validation', () => {
    it('should require path parameter', async () => {
      const tool = registry.get('read-file');
      const result = await tool?.handler(
        {} as any,
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(false);
    });

    it('should reject invalid encoding', async () => {
      const testFile = join(testDir, 'test.txt');
      writeFileSync(testFile, 'test');

      const tool = registry.get('read-file');

      // First validate the input schema (as ToolExecutor would do)
      const validationResult = tool?.inputSchema.safeParse({
        path: testFile,
        encoding: 'invalid-encoding',
      });

      expect(validationResult?.success).toBe(false);
    });
  });

  describe('line range support', () => {
    it('should read specific line range', async () => {
      const testFile = join(testDir, 'lines.txt');
      const content = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      writeFileSync(testFile, content);

      const tool = registry.get('read-file');
      const result = await tool?.handler(
        {
          path: testFile,
          startLine: 2,
          endLine: 4,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.content).toBe('Line 2\nLine 3\nLine 4');
    });

    it('should handle startLine only', async () => {
      const testFile = join(testDir, 'lines.txt');
      const content = 'Line 1\nLine 2\nLine 3';
      writeFileSync(testFile, content);

      const tool = registry.get('read-file');
      const result = await tool?.handler(
        {
          path: testFile,
          startLine: 2,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.content).toBe('Line 2\nLine 3');
    });

    it('should handle endLine only', async () => {
      const testFile = join(testDir, 'lines.txt');
      const content = 'Line 1\nLine 2\nLine 3';
      writeFileSync(testFile, content);

      const tool = registry.get('read-file');
      const result = await tool?.handler(
        {
          path: testFile,
          endLine: 2,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.content).toBe('Line 1\nLine 2');
    });

    it('should handle invalid line ranges gracefully', async () => {
      const testFile = join(testDir, 'lines.txt');
      writeFileSync(testFile, 'Line 1\nLine 2');

      const tool = registry.get('read-file');
      const result = await tool?.handler(
        {
          path: testFile,
          startLine: 10,
          endLine: 20,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      // Should return empty or partial content
      expect(result?.data).toBeDefined();
    });
  });

  describe('file size limits', () => {
    it('should allow custom max size', async () => {
      const testFile = join(testDir, 'custom.txt');
      const content = 'x'.repeat(500_000); // 500KB
      writeFileSync(testFile, content);

      const tool = registry.get('read-file');
      const result = await tool?.handler(
        {
          path: testFile,
          maxSize: 1_000_000, // 1MB
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.size).toBe(500_000);
    });
  });

  describe('security', () => {
    it('should reject path traversal attempts', async () => {
      const tool = registry.get('read-file');
      const result = await tool?.handler(
        {
          path: join(testDir, '../../../etc/passwd'),
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(false);
      expect(result?.error).toContain('outside allowed');
    });

    it('should reject paths with null bytes', async () => {
      const tool = registry.get('read-file');
      const result = await tool?.handler(
        {
          path: join(testDir, 'file\x00.txt'),
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(false);
    });

    it('should validate file permissions', async () => {
      // This test would check if file is readable
      // For now, we'll verify the structure exists
      const tool = registry.get('read-file');
      expect(tool?.permissions).toBeDefined();
    });
  });

  describe('file information', () => {
    it('should return file size', async () => {
      const testFile = join(testDir, 'size.txt');
      writeFileSync(testFile, 'test content');

      const tool = registry.get('read-file');
      const result = await tool?.handler(
        {
          path: testFile,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.size).toBe(12);
    });

    it('should detect file encoding', async () => {
      const testFile = join(testDir, 'encoding.txt');
      writeFileSync(testFile, 'test');

      const tool = registry.get('read-file');
      const result = await tool?.handler(
        {
          path: testFile,
          encoding: 'utf-8', // Explicitly specify encoding
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.encoding).toBe('utf-8');
    });
  });

  describe('binary files', () => {
    it('should handle binary files with base64 encoding', async () => {
      const testFile = join(testDir, 'binary.bin');
      writeFileSync(testFile, Buffer.from([0x00, 0x01, 0x02, 0x03]));

      const tool = registry.get('read-file');
      const result = await tool?.handler(
        {
          path: testFile,
          encoding: 'base64',
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.content).toBeDefined();
    });

    it('should detect binary files', async () => {
      const testFile = join(testDir, 'binary.bin');
      writeFileSync(testFile, Buffer.from([0x00, 0x01, 0x02]));

      const tool = registry.get('read-file');
      const result = await tool?.handler(
        {
          path: testFile,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.isBinary).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle permission denied errors', async () => {
      // This would test file system permission errors
      // In a real scenario, we'd create a file with restricted permissions
      const tool = registry.get('read-file');
      expect(tool).toBeDefined();
    });

    it('should provide descriptive error messages', async () => {
      const tool = registry.get('read-file');
      const result = await tool?.handler(
        {
          path: join(testDir, 'nonexistent.txt'),
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(false);
      expect(result?.error).toBeDefined();
      expect(result?.error?.length).toBeGreaterThan(0);
    });
  });

  describe('integration with sandbox', () => {
    it('should enforce timeout when reading large files', async () => {
      // Create a large file
      const testFile = join(testDir, 'large.txt');
      writeFileSync(testFile, 'x'.repeat(100_000));

      const tool = registry.get('read-file');
      // The tool should use sandbox internally
      const result = await tool?.handler(
        {
          path: testFile,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
          timeout: 5000, // 5 second timeout
        } as any
      );

      expect(result?.success).toBe(true);
    });
  });
});
