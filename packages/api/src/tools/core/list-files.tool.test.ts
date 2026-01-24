import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readdirSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ToolRegistry } from '../registry';
import { PathValidator } from '../validators/path-validator';
import { Sandbox } from '../sandbox';
import { listFilesTool } from './list-files.tool';

describe('list-files tool', () => {
  let testDir: string;
  let registry: ToolRegistry;

  beforeEach(() => {
    // Create test directory
    testDir = join(process.cwd(), 'test-files-list');
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    // Initialize registry
    ToolRegistry.resetInstance();
    registry = ToolRegistry.getInstance();

    // Register the tool
    registry.register(listFilesTool);
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('basic functionality', () => {
    it('should list files in a directory', async () => {
      // Create test files
      writeFileSync(join(testDir, 'file1.txt'), 'content1');
      writeFileSync(join(testDir, 'file2.txt'), 'content2');

      const tool = registry.get('list-files');
      const result = await tool?.handler(
        {
          path: testDir,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data).toBeDefined();
      expect(result?.data?.files).toHaveLength(2);
      expect(result?.data?.files).toContain('file1.txt');
      expect(result?.data?.files).toContain('file2.txt');
    });

    it('should handle empty directory', async () => {
      const tool = registry.get('list-files');
      const result = await tool?.handler(
        {
          path: testDir,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.files).toHaveLength(0);
    });

    it('should return directory path', async () => {
      const tool = registry.get('list-files');
      const result = await tool?.handler(
        {
          path: testDir,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.path).toBeDefined();
    });
  });

  describe('recursive listing', () => {
    it('should list files recursively when recursive is true', async () => {
      // Create nested structure
      mkdirSync(join(testDir, 'subdir1'), { recursive: true });
      mkdirSync(join(testDir, 'subdir1', 'subdir2'), { recursive: true });
      writeFileSync(join(testDir, 'root.txt'), 'root');
      writeFileSync(join(testDir, 'subdir1', 'level1.txt'), 'level1');
      writeFileSync(join(testDir, 'subdir1', 'subdir2', 'level2.txt'), 'level2');

      const tool = registry.get('list-files');
      const result = await tool?.handler(
        {
          path: testDir,
          recursive: true,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.files.length).toBeGreaterThan(0);
      // Should contain files from all levels
      const allFiles = result?.data?.files.join(' ');
      expect(allFiles).toContain('root.txt');
      expect(allFiles).toContain('level1.txt');
      expect(allFiles).toContain('level2.txt');
    });

    it('should only list top-level files when recursive is false', async () => {
      // Create nested structure
      mkdirSync(join(testDir, 'subdir'), { recursive: true });
      writeFileSync(join(testDir, 'root.txt'), 'root');
      writeFileSync(join(testDir, 'subdir', 'nested.txt'), 'nested');

      const tool = registry.get('list-files');
      const result = await tool?.handler(
        {
          path: testDir,
          recursive: false,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.files).toContain('root.txt');
      expect(result?.data?.files).not.toContain('nested.txt');
    });
  });

  describe('file type filtering', () => {
    it('should only return files when includeDirectories is false', async () => {
      mkdirSync(join(testDir, 'subdir'), { recursive: true });
      writeFileSync(join(testDir, 'file.txt'), 'content');

      const tool = registry.get('list-files');
      const result = await tool?.handler(
        {
          path: testDir,
          includeDirectories: false,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.files).toContain('file.txt');
      expect(result?.data?.files).not.toContain('subdir');
    });

    it('should include directories when includeDirectories is true', async () => {
      mkdirSync(join(testDir, 'subdir'), { recursive: true });
      writeFileSync(join(testDir, 'file.txt'), 'content');

      const tool = registry.get('list-files');
      const result = await tool?.handler(
        {
          path: testDir,
          includeDirectories: true,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.files).toContain('file.txt');
      expect(result?.data?.files).toContain('subdir');
    });
  });

  describe('pattern matching', () => {
    it('should filter files by pattern', async () => {
      writeFileSync(join(testDir, 'file1.txt'), 'content1');
      writeFileSync(join(testDir, 'file2.md'), 'content2');
      writeFileSync(join(testDir, 'file3.txt'), 'content3');

      const tool = registry.get('list-files');
      const result = await tool?.handler(
        {
          path: testDir,
          pattern: '*.txt',
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.files).toContain('file1.txt');
      expect(result?.data?.files).toContain('file3.txt');
      expect(result?.data?.files).not.toContain('file2.md');
    });

    it('should handle complex patterns', async () => {
      writeFileSync(join(testDir, 'test.spec.ts'), 'content1');
      writeFileSync(join(testDir, 'test.test.ts'), 'content2');
      writeFileSync(join(testDir, 'app.ts'), 'content3');

      const tool = registry.get('list-files');
      const result = await tool?.handler(
        {
          path: testDir,
          pattern: '*.test.ts',
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.files).toContain('test.test.ts');
      expect(result?.data?.files).not.toContain('test.spec.ts');
      expect(result?.data?.files).not.toContain('app.ts');
    });

    it('should return all files when pattern is not specified', async () => {
      writeFileSync(join(testDir, 'file1.txt'), 'content1');
      writeFileSync(join(testDir, 'file2.md'), 'content2');

      const tool = registry.get('list-files');
      const result = await tool?.handler(
        {
          path: testDir,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.files.length).toBe(2);
    });
  });

  describe('input validation', () => {
    it('should require path parameter', async () => {
      const tool = registry.get('list-files');

      const validationResult = tool?.inputSchema.safeParse({});

      expect(validationResult?.success).toBe(false);
    });

    it('should validate path type', async () => {
      const tool = registry.get('list-files');

      const validationResult = tool?.inputSchema.safeParse({
        path: 123 as any,
      });

      expect(validationResult?.success).toBe(false);
    });

    it('should validate recursive type', async () => {
      const tool = registry.get('list-files');

      const validationResult = tool?.inputSchema.safeParse({
        path: '/test',
        recursive: 'yes' as any,
      });

      expect(validationResult?.success).toBe(false);
    });

    it('should validate includeDirectories type', async () => {
      const tool = registry.get('list-files');

      const validationResult = tool?.inputSchema.safeParse({
        path: '/test',
        includeDirectories: 'true' as any,
      });

      expect(validationResult?.success).toBe(false);
    });
  });

  describe('return value metadata', () => {
    it('should return file count', async () => {
      writeFileSync(join(testDir, 'file1.txt'), 'content1');
      writeFileSync(join(testDir, 'file2.txt'), 'content2');

      const tool = registry.get('list-files');
      const result = await tool?.handler(
        {
          path: testDir,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.count).toBe(2);
    });

    it('should return directory path', async () => {
      const tool = registry.get('list-files');
      const result = await tool?.handler(
        {
          path: testDir,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.path).toBe(testDir);
    });
  });

  describe('error handling', () => {
    it('should return error for non-existent directory', async () => {
      const tool = registry.get('list-files');
      const result = await tool?.handler(
        {
          path: join(testDir, 'nonexistent'),
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

    it('should return error for file path instead of directory', async () => {
      const filePath = join(testDir, 'file.txt');
      writeFileSync(filePath, 'content');

      const tool = registry.get('list-files');
      const result = await tool?.handler(
        {
          path: filePath,
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

    it('should provide descriptive error messages', async () => {
      const tool = registry.get('list-files');
      const result = await tool?.handler(
        {
          path: join(testDir, 'nonexistent'),
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(false);
      expect(result?.error?.length).toBeGreaterThan(0);
    });
  });

  describe('security', () => {
    it('should reject path traversal attempts', async () => {
      const tool = registry.get('list-files');
      const result = await tool?.handler(
        {
          path: join(testDir, '../../../etc'),
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
      const tool = registry.get('list-files');
      const result = await tool?.handler(
        {
          path: join(testDir, 'dir\x00'),
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(false);
    });
  });

  describe('hidden files', () => {
    it('should include hidden files by default', async () => {
      writeFileSync(join(testDir, '.hidden'), 'hidden');
      writeFileSync(join(testDir, 'visible.txt'), 'visible');

      const tool = registry.get('list-files');
      const result = await tool?.handler(
        {
          path: testDir,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.files).toContain('.hidden');
      expect(result?.data?.files).toContain('visible.txt');
    });

    it('should exclude hidden files when includeHidden is false', async () => {
      writeFileSync(join(testDir, '.hidden'), 'hidden');
      writeFileSync(join(testDir, 'visible.txt'), 'visible');

      const tool = registry.get('list-files');
      const result = await tool?.handler(
        {
          path: testDir,
          includeHidden: false,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.files).toContain('visible.txt');
      expect(result?.data?.files).not.toContain('.hidden');
    });
  });

  describe('special cases', () => {
    it('should handle directories with many files', async () => {
      // Create 100 files
      for (let i = 0; i < 100; i++) {
        writeFileSync(join(testDir, `file${i}.txt`), `content${i}`);
      }

      const tool = registry.get('list-files');
      const result = await tool?.handler(
        {
          path: testDir,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.count).toBe(100);
    });

    it('should handle symlinks', async () => {
      // Create a file and a symlink
      writeFileSync(join(testDir, 'original.txt'), 'content');
      require('node:fs').symlinkSync(
        join(testDir, 'original.txt'),
        join(testDir, 'link.txt'),
        'file'
      );

      const tool = registry.get('list-files');
      const result = await tool?.handler(
        {
          path: testDir,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      // Should include the symlink
      expect(result?.data?.files.length).toBeGreaterThan(0);
    });
  });
});
