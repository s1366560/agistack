import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PathValidator, PathValidationResult } from './path-validator';
import { mkdirSync, rmSync, existsSync, symlinkSync, unlinkSync } from 'node:fs';

describe('PathValidator', () => {
  let testRoot: string;
  let validator: PathValidator;

  beforeEach(() => {
    // Create test directory
    testRoot = '/tmp/test-allowed';
    if (!existsSync(testRoot)) {
      mkdirSync(testRoot, { recursive: true });
    }

    // Create validator after directory exists
    validator = new PathValidator([testRoot]);
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(testRoot)) {
      rmSync(testRoot, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create validator with allowed roots', () => {
      const roots = ['/allowed1', '/allowed2'];
      const v = new PathValidator(roots);

      expect(v).toBeInstanceOf(PathValidator);
    });

    it('should handle empty roots array', () => {
      const v = new PathValidator([]);
      expect(v).toBeInstanceOf(PathValidator);
    });
  });

  describe('validate', () => {
    it('should allow absolute path within allowed root', () => {
      const result = validator.validate(`${testRoot}/file.txt`, 'read');

      expect(result.valid).toBe(true);
      expect(result.resolvedPath).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should reject path traversal attacks with ../', () => {
      const result = validator.validate('/tmp/test-allowed/../../../etc/passwd', 'read');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('outside allowed directories');
    });

    it('should reject null bytes in path', () => {
      const result = validator.validate('/tmp/test-allowed/file\x00.txt', 'read');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('null byte');
    });

    it('should reject access outside allowed roots', () => {
      const result = validator.validate('/etc/passwd', 'read');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('outside allowed directories');
    });

    it('should handle read access for existing files', () => {
      // Create a test file
      const { writeFileSync } = require('node:fs');
      writeFileSync(`${testRoot}/test.txt`, 'test content');

      const result = validator.validate(`${testRoot}/test.txt`, 'read');

      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
    });

    it('should validate write access with extension check', () => {
      const v = new PathValidator([testRoot], {
        allowedExtensions: ['.txt', '.md'],
      });

      const result = v.validate(`${testRoot}/file.txt`, 'write');
      expect(result.valid).toBe(true);
    });

    it('should reject write access with denied extension', () => {
      const v = new PathValidator([testRoot], {
        deniedExtensions: ['.exe', '.sh'],
      });

      const result = v.validate(`${testRoot}/script.sh`, 'write');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('blocked by denylist');
    });

    it('should handle empty path', () => {
      const result = validator.validate('', 'read');

      expect(result.valid).toBe(false);
    });

    it('should handle undefined path', () => {
      const result = validator.validate(undefined as any, 'read');

      expect(result.valid).toBe(false);
    });
  });

  describe('sanitize', () => {
    it('should normalize path separators', () => {
      const result = validator.sanitize('path/to\\file.txt');

      expect(result).not.toContain('\\');
    });

    it('should remove redundant slashes', () => {
      const result = validator.sanitize('/tmp//test///file.txt');

      expect(result).not.toContain('//');
    });

    it('should handle empty string', () => {
      const result = validator.sanitize('');

      expect(result).toBe('');
    });
  });

  describe('isAllowed', () => {
    it('should return true for paths within allowed roots', () => {
      const result = validator.isAllowed(`${testRoot}/subdir/file.txt`);

      expect(result).toBe(true);
    });

    it('should return false for paths outside allowed roots', () => {
      const result = validator.isAllowed('/etc/passwd');

      expect(result).toBe(false);
    });

    it('should return false for paths with traversal', () => {
      const result = validator.isAllowed(`${testRoot}/../../etc/passwd`);

      expect(result).toBe(false);
    });

    it('should handle multiple allowed roots', () => {
      const v = new PathValidator(['/root1', '/root2', '/root3']);

      expect(v.isAllowed('/root1/file.txt')).toBe(true);
      expect(v.isAllowed('/root2/file.txt')).toBe(true);
      expect(v.isAllowed('/root3/file.txt')).toBe(true);
      expect(v.isAllowed('/root4/file.txt')).toBe(false);
    });
  });

  describe('extension validation', () => {
    it('should allow all extensions when no restrictions', () => {
      const result = validator.validate(`${testRoot}/file.anyextension`, 'write');

      expect(result.valid).toBe(true);
    });

    it('should respect allowlist when provided', () => {
      const v = new PathValidator([testRoot], {
        allowedExtensions: ['.txt', '.md', '.json'],
      });

      expect(v.validate(`${testRoot}/file.txt`, 'write').valid).toBe(true);
      expect(v.validate(`${testRoot}/file.md`, 'write').valid).toBe(true);
      expect(v.validate(`${testRoot}/file.json`, 'write').valid).toBe(true);
      expect(v.validate(`${testRoot}/file.exe`, 'write').valid).toBe(false);
    });

    it('should respect denylist when provided', () => {
      const v = new PathValidator([testRoot], {
        deniedExtensions: ['.exe', '.sh', '.bat'],
      });

      expect(v.validate(`${testRoot}/file.txt`, 'write').valid).toBe(true);
      expect(v.validate(`${testRoot}/file.exe`, 'write').valid).toBe(false);
      expect(v.validate(`${testRoot}/script.sh`, 'write').valid).toBe(false);
    });

    it('should handle case-insensitive extension matching', () => {
      const v = new PathValidator([testRoot], {
        allowedExtensions: ['.txt', '.md'],
        caseSensitiveExtensions: false,
      });

      expect(v.validate(`${testRoot}/file.TXT`, 'write').valid).toBe(true);
      expect(v.validate(`${testRoot}/file.Md`, 'write').valid).toBe(true);
    });
  });

  describe('security edge cases', () => {
    it('should handle very long paths', () => {
      const longPath = `${testRoot}/${'a'.repeat(1000)}`;
      const result = validator.validate(longPath, 'read');

      expect(result).toBeDefined();
    });

    it('should handle unicode characters in path', () => {
      const result = validator.validate(`${testRoot}/文件.txt`, 'read');

      expect(result).toBeDefined();
    });
  });
});
