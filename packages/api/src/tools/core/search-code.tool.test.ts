import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readdirSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ToolRegistry } from '../registry';
import { PathValidator } from '../validators/path-validator';
import { Sandbox } from '../sandbox';
import { searchCodeTool } from './search-code.tool';

describe('search-code tool', () => {
  let testDir: string;
  let registry: ToolRegistry;

  beforeEach(() => {
    // Create test directory
    testDir = join(process.cwd(), 'test-files-search');
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    // Initialize registry
    ToolRegistry.resetInstance();
    registry = ToolRegistry.getInstance();

    // Register the tool
    registry.register(searchCodeTool);
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('basic functionality', () => {
    it('should search for text in files', async () => {
      // Create test files
      writeFileSync(join(testDir, 'file1.txt'), 'Hello World\nHello Test');
      writeFileSync(join(testDir, 'file2.txt'), 'Goodbye World');

      const tool = registry.get('search-code');
      const result = await tool?.handler(
        {
          path: testDir,
          pattern: 'Hello',
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data).toBeDefined();
      expect(result?.data?.matches.length).toBeGreaterThan(0);
      expect(result?.data?.matches.some((m: any) => m.content.includes('Hello'))).toBe(true);
    });

    it('should return matches with line numbers', async () => {
      writeFileSync(join(testDir, 'test.txt'), 'line 1\nline 2\nline 3');

      const tool = registry.get('search-code');
      const result = await tool?.handler(
        {
          path: testDir,
          pattern: 'line',
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      const firstMatch = result?.data?.matches[0];
      expect(firstMatch?.lineNumber).toBeDefined();
      expect(firstMatch?.lineNumber).toBeGreaterThan(0);
    });

    it('should handle no matches found', async () => {
      writeFileSync(join(testDir, 'test.txt'), 'no matches here');

      const tool = registry.get('search-code');
      const result = await tool?.handler(
        {
          path: testDir,
          pattern: 'notfound',
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.matches).toHaveLength(0);
    });
  });

  describe('case sensitivity', () => {
    it('should be case-insensitive by default', async () => {
      writeFileSync(join(testDir, 'test.txt'), 'Hello World\nHELLO TEST\nhello again');

      const tool = registry.get('search-code');
      const result = await tool?.handler(
        {
          path: testDir,
          pattern: 'hello',
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.matches.length).toBe(3);
    });

    it('should support case-sensitive search', async () => {
      writeFileSync(join(testDir, 'test.txt'), 'Hello World\nHELLO TEST\nhello again');

      const tool = registry.get('search-code');
      const result = await tool?.handler(
        {
          path: testDir,
          pattern: 'hello',
          caseSensitive: true,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.matches.length).toBe(1);
      expect(result?.data?.matches[0]?.content).toBe('hello again');
    });
  });

  describe('file extension filtering', () => {
    it('should filter by file extensions', async () => {
      writeFileSync(join(testDir, 'test.txt'), 'match');
      writeFileSync(join(testDir, 'test.md'), 'match');
      writeFileSync(join(testDir, 'test.js'), 'match');

      const tool = registry.get('search-code');
      const result = await tool?.handler(
        {
          path: testDir,
          pattern: 'match',
          extensions: ['.txt', '.md'],
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.matches.length).toBe(2);
      const files = result?.data?.matches.map((m: any) => m.file);
      expect(files).toContain(join(testDir, 'test.txt'));
      expect(files).toContain(join(testDir, 'test.md'));
      expect(files).not.toContain(join(testDir, 'test.js'));
    });

    it('should search all files when no extensions specified', async () => {
      writeFileSync(join(testDir, 'test.txt'), 'match');
      writeFileSync(join(testDir, 'test.md'), 'match');

      const tool = registry.get('search-code');
      const result = await tool?.handler(
        {
          path: testDir,
          pattern: 'match',
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.matches.length).toBe(2);
    });
  });

  describe('recursive search', () => {
    it('should search recursively when recursive is true', async () => {
      mkdirSync(join(testDir, 'subdir'), { recursive: true });
      writeFileSync(join(testDir, 'root.txt'), 'match');
      writeFileSync(join(testDir, 'subdir', 'nested.txt'), 'match');

      const tool = registry.get('search-code');
      const result = await tool?.handler(
        {
          path: testDir,
          pattern: 'match',
          recursive: true,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.matches.length).toBe(2);
    });

    it('should only search top level when recursive is false', async () => {
      mkdirSync(join(testDir, 'subdir'), { recursive: true });
      writeFileSync(join(testDir, 'root.txt'), 'match');
      writeFileSync(join(testDir, 'subdir', 'nested.txt'), 'match');

      const tool = registry.get('search-code');
      const result = await tool?.handler(
        {
          path: testDir,
          pattern: 'match',
          recursive: false,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.matches.length).toBe(1);
      expect(result?.data?.matches[0]?.file).toContain('root.txt');
    });
  });

  describe('regex patterns', () => {
    it('should support regex patterns', async () => {
      writeFileSync(join(testDir, 'test.txt'), '123\nabc\n456');

      const tool = registry.get('search-code');
      const result = await tool?.handler(
        {
          path: testDir,
          pattern: '\\d+', // Match digits
          useRegex: true,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.matches.length).toBe(2);
    });

    it('should handle complex regex patterns', async () => {
      writeFileSync(join(testDir, 'test.txt'), 'test@example.com\nuser.name@test.org\ninvalid');

      const tool = registry.get('search-code');
      const result = await tool?.handler(
        {
          path: testDir,
          pattern: '[a-z.]+@[a-z.]+', // Email pattern
          useRegex: true,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.matches.length).toBe(2);
    });
  });

  describe('context lines', () => {
    it('should include context lines when specified', async () => {
      writeFileSync(join(testDir, 'test.txt'), 'line 1\nline 2\nmatch\nline 4\nline 5');

      const tool = registry.get('search-code');
      const result = await tool?.handler(
        {
          path: testDir,
          pattern: 'match',
          contextLines: 1,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      const match = result?.data?.matches[0];
      expect(match?.content).toBe('match');
      expect(match?.context).toBeDefined();
      expect(match?.context.before.length).toBe(1);
      expect(match?.context.after.length).toBe(1);
    });

    it('should handle context at file boundaries', async () => {
      writeFileSync(join(testDir, 'test.txt'), 'match\nline 2\nline 3');

      const tool = registry.get('search-code');
      const result = await tool?.handler(
        {
          path: testDir,
          pattern: 'match',
          contextLines: 2,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      const match = result?.data?.matches[0];
      expect(match?.context?.before.length).toBe(0); // No lines before match
      expect(match?.context?.after.length).toBe(2); // Two lines after
    });
  });

  describe('return value metadata', () => {
    it('should return match count', async () => {
      writeFileSync(join(testDir, 'test.txt'), 'match\nmatch\nmatch');

      const tool = registry.get('search-code');
      const result = await tool?.handler(
        {
          path: testDir,
          pattern: 'match',
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.count).toBe(3);
    });

    it('should return search path', async () => {
      writeFileSync(join(testDir, 'test.txt'), 'match');

      const tool = registry.get('search-code');
      const result = await tool?.handler(
        {
          path: testDir,
          pattern: 'match',
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

  describe('input validation', () => {
    it('should require path parameter', async () => {
      const tool = registry.get('search-code');

      const validationResult = tool?.inputSchema.safeParse({
        pattern: 'test',
      });

      expect(validationResult?.success).toBe(false);
    });

    it('should require pattern parameter', async () => {
      const tool = registry.get('search-code');

      const validationResult = tool?.inputSchema.safeParse({
        path: '/test',
      });

      expect(validationResult?.success).toBe(false);
    });

    it('should validate path type', async () => {
      const tool = registry.get('search-code');

      const validationResult = tool?.inputSchema.safeParse({
        path: 123 as any,
        pattern: 'test',
      });

      expect(validationResult?.success).toBe(false);
    });

    it('should validate pattern type', async () => {
      const tool = registry.get('search-code');

      const validationResult = tool?.inputSchema.safeParse({
        path: '/test',
        pattern: 123 as any,
      });

      expect(validationResult?.success).toBe(false);
    });

    it('should validate extensions array type', async () => {
      const tool = registry.get('search-code');

      const validationResult = tool?.inputSchema.safeParse({
        path: '/test',
        pattern: 'test',
        extensions: '.txt' as any,
      });

      expect(validationResult?.success).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should return error for non-existent directory', async () => {
      const tool = registry.get('search-code');
      const result = await tool?.handler(
        {
          path: join(testDir, 'nonexistent'),
          pattern: 'test',
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

    it('should handle invalid regex patterns gracefully', async () => {
      writeFileSync(join(testDir, 'test.txt'), 'content');

      const tool = registry.get('search-code');
      const result = await tool?.handler(
        {
          path: testDir,
          pattern: '[invalid(', // Invalid regex
          useRegex: true,
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

  describe('security', () => {
    it('should reject path traversal attempts', async () => {
      const tool = registry.get('search-code');
      const result = await tool?.handler(
        {
          path: join(testDir, '../../../etc'),
          pattern: 'test',
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
      const tool = registry.get('search-code');
      const result = await tool?.handler(
        {
          path: join(testDir, 'dir\x00'),
          pattern: 'test',
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

  describe('special cases', () => {
    it('should handle empty files', async () => {
      writeFileSync(join(testDir, 'empty.txt'), '');

      const tool = registry.get('search-code');
      const result = await tool?.handler(
        {
          path: testDir,
          pattern: 'test',
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.matches).toHaveLength(0);
    });

    it('should handle binary files gracefully', async () => {
      writeFileSync(join(testDir, 'binary.bin'), Buffer.from([0x00, 0x01, 0x02]));

      const tool = registry.get('search-code');
      const result = await tool?.handler(
        {
          path: testDir,
          pattern: 'test',
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      // Should succeed but not crash on binary files
      expect(result?.success).toBe(true);
    });

    it('should handle multiple matches in same file', async () => {
      writeFileSync(join(testDir, 'test.txt'), 'match line 1\nother line\nmatch line 2\nmatch line 3');

      const tool = registry.get('search-code');
      const result = await tool?.handler(
        {
          path: testDir,
          pattern: 'match',
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.matches.length).toBe(3);
    });

    it('should handle special regex characters in literal search', async () => {
      writeFileSync(join(testDir, 'test.txt'), 'file.txt\n[match]\n(test)');

      const tool = registry.get('search-code');
      const result = await tool?.handler(
        {
          path: testDir,
          pattern: '.txt',
          useRegex: false, // Literal search
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.matches.length).toBe(1);
      expect(result?.data?.matches[0]?.content).toBe('file.txt');
    });
  });

  describe('max results', () => {
    it('should limit results when maxResults is specified', async () => {
      // Create file with many matches
      const lines = Array.from({ length: 100 }, (_, i) => `match ${i}`);
      writeFileSync(join(testDir, 'many.txt'), lines.join('\n'));

      const tool = registry.get('search-code');
      const result = await tool?.handler(
        {
          path: testDir,
          pattern: 'match',
          maxResults: 10,
        },
        {
          executionId: 'test-exec',
          sessionId: 'test-session',
          permissions: [],
        }
      );

      expect(result?.success).toBe(true);
      expect(result?.data?.matches.length).toBe(10);
      expect(result?.data?.truncated).toBe(true);
    });
  });
});
