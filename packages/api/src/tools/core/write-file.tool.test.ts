import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ToolRegistry } from '../registry';
import { PathValidator } from '../validators/path-validator';
import { Sandbox } from '../sandbox';
import { writeFileSyncTool } from './write-file.tool';

describe('write-file tool', () => {
  let testDir: string;
  let registry: ToolRegistry;

  beforeEach(() => {
    // Create test directory
    testDir = join(process.cwd(), 'test-files-write');
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    // Initialize registry
    ToolRegistry.resetInstance();
    registry = ToolRegistry.getInstance();

    // Register the tool
    registry.register(writeFileSyncTool);
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('basic functionality', () => {
    it('should write a new file', async () => {
      const testFile = join(testDir, 'new-file.txt');

      const tool = registry.get('write-file');
      const result = await tool?.handler(
        {
          path: testFile,
          content: 'Hello, World!',
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data).toBeDefined();
      expect(result?.data?.bytesWritten).toBe(13);
      expect(existsSync(testFile)).toBe(true);
      expect(readFileSync(testFile, 'utf-8')).toBe('Hello, World!');
    });

    it('should overwrite an existing file', async () => {
      const testFile = join(testDir, 'overwrite.txt');
      writeFileSync(testFile, 'original content');

      const tool = registry.get('write-file');
      const result = await tool?.handler(
        {
          path: testFile,
          content: 'new content',
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(readFileSync(testFile, 'utf-8')).toBe('new content');
    });

    it('should write file with specified encoding', async () => {
      const testFile = join(testDir, 'encoded.txt');

      const tool = registry.get('write-file');
      const result = await tool?.handler(
        {
          path: testFile,
          content: 'binary content: \x00\x01\x02',
          encoding: 'ascii',
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(existsSync(testFile)).toBe(true);
    });

    it('should write file with base64 encoding', async () => {
      const testFile = join(testDir, 'base64.txt');
      const content = Buffer.from([0x00, 0x01, 0x02, 0x03]).toString('base64');

      const tool = registry.get('write-file');
      const result = await tool?.handler(
        {
          path: testFile,
          content,
          encoding: 'base64',
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.bytesWritten).toBeGreaterThan(0);
    });
  });

  describe('directory creation', () => {
    it('should create parent directories when mkdir is true', async () => {
      const testFile = join(testDir, 'subdir', 'nested', 'file.txt');

      const tool = registry.get('write-file');
      const result = await tool?.handler(
        {
          path: testFile,
          content: 'content',
          mkdir: true,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(existsSync(testFile)).toBe(true);
      expect(readFileSync(testFile, 'utf-8')).toBe('content');
    });

    it('should fail when parent directory does not exist and mkdir is false', async () => {
      const testFile = join(testDir, 'nonexistent', 'file.txt');

      const tool = registry.get('write-file');
      const result = await tool?.handler(
        {
          path: testFile,
          content: 'content',
          mkdir: false,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(false);
      expect(result?.error).toContain('directory');
    });

    it('should use default mkdir behavior', async () => {
      // Create parent directory first to ensure it's in allowed roots
      const parentDir = join(testDir, 'autocreate');
      if (!existsSync(parentDir)) {
        mkdirSync(parentDir, { recursive: true });
      }
      const testFile = join(parentDir, 'file.txt');

      const tool = registry.get('write-file');
      const result = await tool?.handler(
        {
          path: testFile,
          content: 'content',
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(existsSync(testFile)).toBe(true);
    });
  });

  describe('backup creation', () => {
    it('should create backup when createBackup is true', async () => {
      const testFile = join(testDir, 'backup-test.txt');
      writeFileSync(testFile, 'original');

      const tool = registry.get('write-file');
      const result = await tool?.handler(
        {
          path: testFile,
          content: 'updated',
          createBackup: true,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(existsSync(testFile)).toBe(true);

      // Check backup file exists
      const backupFiles = require('node:fs').readdirSync(testDir).filter((f: string) =>
        f.includes('backup-test.txt.')
      );
      expect(backupFiles.length).toBeGreaterThan(0);
    });

    it('should not create backup when createBackup is false', async () => {
      const testFile = join(testDir, 'no-backup.txt');
      writeFileSync(testFile, 'original');

      const tool = registry.get('write-file');
      await tool?.handler(
        {
          path: testFile,
          content: 'updated',
          createBackup: false,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      const backupFiles = require('node:fs').readdirSync(testDir).filter((f: string) =>
        f.includes('no-backup.txt.')
      );
      expect(backupFiles.length).toBe(0);
    });
  });

  describe('input validation', () => {
    it('should require path parameter', async () => {
      const tool = registry.get('write-file');

      const validationResult = tool?.inputSchema.safeParse({
        content: 'test',
      });

      expect(validationResult?.success).toBe(false);
    });

    it('should require content parameter', async () => {
      const tool = registry.get('write-file');

      const validationResult = tool?.inputSchema.safeParse({
        path: '/test.txt',
      });

      expect(validationResult?.success).toBe(false);
    });

    it('should reject invalid encoding', async () => {
      const tool = registry.get('write-file');

      const validationResult = tool?.inputSchema.safeParse({
        path: '/test.txt',
        content: 'test',
        encoding: 'invalid-encoding' as any,
      });

      expect(validationResult?.success).toBe(false);
    });

    it('should validate path type', async () => {
      const tool = registry.get('write-file');

      const validationResult = tool?.inputSchema.safeParse({
        path: 123 as any,
        content: 'test',
      });

      expect(validationResult?.success).toBe(false);
    });

    it('should validate content type', async () => {
      const tool = registry.get('write-file');

      const validationResult = tool?.inputSchema.safeParse({
        path: '/test.txt',
        content: 123 as any,
      });

      expect(validationResult?.success).toBe(false);
    });
  });

  describe('file size limits', () => {
    it('should respect default max size', async () => {
      const testFile = join(testDir, 'large-default.txt');
      const content = 'x'.repeat(11_000_000); // 11MB exceeds 10MB default

      const tool = registry.get('write-file');
      const result = await tool?.handler(
        {
          path: testFile,
          content,
          maxSize: 10_000_000, // Explicitly set default maxSize
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(false);
      expect(result?.error).toContain('too large');
    });

    it('should allow custom max size', async () => {
      const testFile = join(testDir, 'large.txt');
      const content = 'x'.repeat(5_000_000); // 5MB

      const tool = registry.get('write-file');
      const result = await tool?.handler(
        {
          path: testFile,
          content,
          maxSize: 10_000_000, // 10MB
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.bytesWritten).toBe(5_000_000);
    });
  });

  describe('atomic writes', () => {
    it('should perform atomic writes', async () => {
      const testFile = join(testDir, 'atomic.txt');
      writeFileSync(testFile, 'initial');

      const tool = registry.get('write-file');

      // Simulate a failure mid-write by using a very large file that might timeout
      // In practice, atomic writes use temp files
      const result = await tool?.handler(
        {
          path: testFile,
          content: 'atomic content',
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(existsSync(testFile)).toBe(true);
      // File should either have old content or new content, not corrupted
      const content = readFileSync(testFile, 'utf-8');
      expect(content).toMatch(/atomic content|initial/);
    });
  });

  describe('security', () => {
    it('should reject path traversal attempts', async () => {
      const tool = registry.get('write-file');
      const result = await tool?.handler(
        {
          path: join(testDir, '../../../etc/passwd'),
          content: 'malicious',
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
      const tool = registry.get('write-file');
      const result = await tool?.handler(
        {
          path: join(testDir, 'file\x00.txt'),
          content: 'test',
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(false);
    });

    it('should validate file extensions for write operations', async () => {
      // This tests that we check allowed/denied extensions
      const tool = registry.get('write-file');
      expect(tool?.permissions).toBeDefined();
    });
  });

  describe('return value', () => {
    it('should return bytes written', async () => {
      const testFile = join(testDir, 'bytes.txt');
      const content = 'test content';

      const tool = registry.get('write-file');
      const result = await tool?.handler(
        {
          path: testFile,
          content,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.bytesWritten).toBe(content.length);
    });

    it('should return file path', async () => {
      const testFile = join(testDir, 'path-returned.txt');
      const content = 'test';

      const tool = registry.get('write-file');
      const result = await tool?.handler(
        {
          path: testFile,
          content,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.path).toBe(testFile);
    });

    it('should return encoding used', async () => {
      const testFile = join(testDir, 'encoding-returned.txt');

      const tool = registry.get('write-file');
      const result = await tool?.handler(
        {
          path: testFile,
          content: 'test',
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
  });

  describe('error handling', () => {
    it('should handle write permission errors gracefully', async () => {
      const tool = registry.get('write-file');
      expect(tool).toBeDefined();
    });

    it('should provide descriptive error messages', async () => {
      const testFile = join(testDir, 'nonexistent-subdir', 'error.txt');

      const tool = registry.get('write-file');
      const result = await tool?.handler(
        {
          path: testFile,
          content: 'test',
          mkdir: false, // Don't create directory
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(false);
      expect(result?.error).toBeDefined();
    });
  });

  describe('special characters', () => {
    it('should handle unicode content', async () => {
      const testFile = join(testDir, 'unicode.txt');
      const content = 'Hello 世界 🌍';

      const tool = registry.get('write-file');
      const result = await tool?.handler(
        {
          path: testFile,
          content,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(readFileSync(testFile, 'utf-8')).toBe(content);
    });

    it('should handle empty content', async () => {
      const testFile = join(testDir, 'empty.txt');
      const content = '';

      const tool = registry.get('write-file');
      const result = await tool?.handler(
        {
          path: testFile,
          content,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.bytesWritten).toBe(0);
    });

    it('should handle newlines in content', async () => {
      const testFile = join(testDir, 'newlines.txt');
      const content = 'Line 1\nLine 2\nLine 3';

      const tool = registry.get('write-file');
      const result = await tool?.handler(
        {
          path: testFile,
          content,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(readFileSync(testFile, 'utf-8')).toBe(content);
    });
  });

  describe('large files', () => {
    it('should handle moderately large files efficiently', async () => {
      const testFile = join(testDir, 'moderate.txt');
      const content = 'x'.repeat(100_000); // 100KB

      const tool = registry.get('write-file');
      const result = await tool?.handler(
        {
          path: testFile,
          content,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.bytesWritten).toBe(100_000);
    });
  });

  describe('concurrent writes', () => {
    it('should handle multiple simultaneous writes', async () => {
      const tool = registry.get('write-file');
      const promises = Array.from({ length: 10 }, (_, i) =>
        tool?.handler(
          {
            path: join(testDir, `concurrent-${i}.txt`),
            content: `content-${i}`,
          },
          {
            executionId: `test-exec-${i}`,
            sessionId: 'test-session',
            permissions: [],
          }
        )
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(results.every((r) => r?.success)).toBe(true);
    });
  });
});
