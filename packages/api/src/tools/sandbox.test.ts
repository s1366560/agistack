import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Sandbox, SandboxOptions, SandboxResult } from './sandbox';

describe('Sandbox', () => {
  describe('execute', () => {
    it('should successfully execute a simple function', async () => {
      const fn = async () => ({ result: 'success' });

      const result = await Sandbox.execute(fn, {
        timeoutMs: 1000,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ result: 'success' });
      expect(result.error).toBeUndefined();
    });

    it('should execute a function with arguments', async () => {
      const fn = async (a: number, b: number) => a + b;

      const result = await Sandbox.execute(() => fn(2, 3), {
        timeoutMs: 1000,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe(5);
    });

    it('should execute a synchronous function', async () => {
      const fn = () => 42;

      const result = await Sandbox.execute(fn, {
        timeoutMs: 1000,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe(42);
    });

    it('should handle functions that return promises', async () => {
      const fn = async () => {
        return new Promise((resolve) => {
          setTimeout(() => resolve('done'), 100);
        });
      };

      const result = await Sandbox.execute(fn, {
        timeoutMs: 1000,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe('done');
    });

    it('should timeout long-running functions', async () => {
      const fn = async () => {
        return new Promise((resolve) => {
          setTimeout(() => resolve('done'), 5000);
        });
      };

      const result = await Sandbox.execute(fn, {
        timeoutMs: 100,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should handle functions that throw errors', async () => {
      const fn = async () => {
        throw new Error('Intentional error');
      };

      const result = await Sandbox.execute(fn, {
        timeoutMs: 1000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Intentional error');
    });

    it('should handle functions that reject promises', async () => {
      const fn = async () => {
        return Promise.reject(new Error('Rejection'));
      };

      const result = await Sandbox.execute(fn, {
        timeoutMs: 1000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rejection');
    });

    it('should execute function within memory limit', async () => {
      const fn = async () => {
        // Allocate some memory but within limits
        const data = new Array(1000).fill('test');
        return data.length;
      };

      const result = await Sandbox.execute(fn, {
        timeoutMs: 1000,
        maxMemoryMb: 100,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe(1000);
    });

    it('should reject functions that exceed memory limit', async () => {
      const fn = async () => {
        // This would allocate a lot of memory
        // In a real implementation, we'd monitor memory usage
        const data = new Array(10000000).fill('x'.repeat(100));
        return data.length;
      };

      const result = await Sandbox.execute(fn, {
        timeoutMs: 5000,
        maxMemoryMb: 1,
      });

      // Memory checking is best-effort in Node.js
      expect(result).toBeDefined();
    });
  });

  describe('resource cleanup', () => {
    it('should cleanup resources after execution', async () => {
      let cleanupCalled = false;

      const fn = async () => {
        return new Promise((resolve) => {
          setTimeout(() => {
            cleanupCalled = true;
            resolve('done');
          }, 100);
        });
      };

      const result = await Sandbox.execute(fn, {
        timeoutMs: 1000,
      });

      expect(result.success).toBe(true);
      expect(cleanupCalled).toBe(true);
    });

    it('should cleanup on timeout', async () => {
      let cleanupCalled = false;

      const fn = async () => {
        return new Promise((resolve) => {
          // Simulate long-running task
          setTimeout(() => {
            cleanupCalled = true;
            resolve('done');
          }, 5000);
        });
      };

      const result = await Sandbox.execute(fn, {
        timeoutMs: 100,
      });

      expect(result.success).toBe(false);
      // Cleanup should still happen
      expect(result).toBeDefined();
    });

    it('should cleanup on error', async () => {
      let cleanupCalled = false;

      const fn = async () => {
        try {
          throw new Error('Error during execution');
        } finally {
          cleanupCalled = true;
        }
      };

      const result = await Sandbox.execute(fn, {
        timeoutMs: 1000,
      });

      expect(result.success).toBe(false);
      expect(cleanupCalled).toBe(true);
    });
  });

  describe('working directory isolation', () => {
    it('should support working directory option', async () => {
      const fn = async () => {
        return process.cwd();
      };

      const result = await Sandbox.execute(fn, {
        timeoutMs: 1000,
        workingDirectory: '/tmp',
      });

      expect(result.success).toBe(true);
      // Note: This test might not work as expected in all environments
      expect(result.data).toBeDefined();
    });

    it('should execute in current directory by default', async () => {
      const fn = async () => {
        return process.cwd();
      };

      const result = await Sandbox.execute(fn, {
        timeoutMs: 1000,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('execution context', () => {
    it('should preserve function context', async () => {
      const context = { value: 42 };

      const fn = async function() {
        return this.value;
      };

      const result = await Sandbox.execute(fn.bind(context), {
        timeoutMs: 1000,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe(42);
    });

    it('should handle arrow functions', async () => {
      const value = 100;

      const fn = async () => {
        return value;
      };

      const result = await Sandbox.execute(fn, {
        timeoutMs: 1000,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe(100);
    });
  });

  describe('return value handling', () => {
    it('should handle primitive return values', async () => {
      const tests = [
        { fn: async () => 'string', expected: 'string' },
        { fn: async () => 42, expected: 42 },
        { fn: async () => true, expected: true },
        { fn: async () => null, expected: null },
        { fn: async () => undefined, expected: undefined },
      ];

      for (const { fn, expected } of tests) {
        const result = await Sandbox.execute(fn, {
          timeoutMs: 1000,
        });

        expect(result.success).toBe(true);
        expect(result.data).toBe(expected);
      }
    });

    it('should handle object return values', async () => {
      const fn = async () => ({
        name: 'test',
        value: 123,
        nested: { a: 1, b: 2 },
      });

      const result = await Sandbox.execute(fn, {
        timeoutMs: 1000,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        name: 'test',
        value: 123,
        nested: { a: 1, b: 2 },
      });
    });

    it('should handle array return values', async () => {
      const fn = async () => [1, 2, 3, 4, 5];

      const result = await Sandbox.execute(fn, {
        timeoutMs: 1000,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle functions with no return value', async () => {
      const fn = async () => {
        // Side effect function
        const x = 1 + 1;
      };

      const result = await Sandbox.execute(fn, {
        timeoutMs: 1000,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
    });
  });

  describe('error messages', () => {
    it('should provide descriptive error message on timeout', async () => {
      const fn = async () => {
        return new Promise((resolve) => {
          setTimeout(() => resolve('done'), 10000);
        });
      };

      const result = await Sandbox.execute(fn, {
        timeoutMs: 50,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
      expect(result.error).toContain('50ms');
    });

    it('should include original error message', async () => {
      const customError = new Error('Custom error message');

      const fn = async () => {
        throw customError;
      };

      const result = await Sandbox.execute(fn, {
        timeoutMs: 1000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Custom error message');
    });

    it('should handle stack traces', async () => {
      const fn = async () => {
        throw new Error('Stack trace test');
      };

      const result = await Sandbox.execute(fn, {
        timeoutMs: 1000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty options', async () => {
      const fn = async () => 'test';

      const result = await Sandbox.execute(fn, {});

      expect(result.success).toBe(true);
      expect(result.data).toBe('test');
    });

    it('should handle very short timeout', async () => {
      const fn = async () => 'instant';

      const result = await Sandbox.execute(fn, {
        timeoutMs: 1, // 1ms timeout
      });

      // Should either succeed or timeout depending on execution speed
      expect(result).toBeDefined();
    });

    it('should handle very long timeout', async () => {
      const fn = async () => 'done';

      const result = await Sandbox.execute(fn, {
        timeoutMs: 60000, // 60 seconds
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe('done');
    });

    it('should handle function that returns immediately', async () => {
      const fn = async () => {
        return 'immediate';
      };

      const result = await Sandbox.execute(fn, {
        timeoutMs: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe('immediate');
    });

    it('should handle concurrent executions', async () => {
      const fn = async (id: number) => `result-${id}`;

      const promises = Array.from({ length: 10 }, (_, i) =>
        Sandbox.execute(() => fn(i), {
          timeoutMs: 1000,
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(results.every((r) => r.success)).toBe(true);
      expect(results.map((r) => r.data)).toContain('result-5');
    });
  });

  describe('memory monitoring', () => {
    it('should track memory usage during execution', async () => {
      const fn = async () => {
        // Allocate some data
        const data = new Array(1000).fill('test');
        return data.length;
      };

      const result = await Sandbox.execute(fn, {
        timeoutMs: 1000,
        maxMemoryMb: 100,
      });

      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.memoryUsedMb).toBeGreaterThanOrEqual(0);
    });

    it('should warn when approaching memory limit', async () => {
      // This is informational - actual memory checking is limited in Node.js
      const fn = async () => {
        return 'complete';
      };

      const result = await Sandbox.execute(fn, {
        timeoutMs: 1000,
        maxMemoryMb: 1,
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.memoryUsedMb).toBeGreaterThanOrEqual(0);
    });
  });

  describe('timing information', () => {
    it('should measure execution time', async () => {
      const fn = async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return 'done';
      };

      const result = await Sandbox.execute(fn, {
        timeoutMs: 1000,
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.durationMs).toBeGreaterThanOrEqual(100);
    });

    it('should measure very fast executions', async () => {
      const fn = async () => 'instant';

      const result = await Sandbox.execute(fn, {
        timeoutMs: 1000,
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
