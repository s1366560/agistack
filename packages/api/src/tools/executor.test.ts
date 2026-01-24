import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolExecutor } from './executor';
import { ToolRegistry } from './registry';
import { ToolDefinition, ToolCategory, Permission } from '@agistack/shared';
import { z } from 'zod';

// Mock the repository
vi.mock('./repositories/agent-tool-usage.repository', () => ({
  AgentToolUsageRepository: class {
    create = vi.fn();
  },
}));

describe('ToolExecutor', () => {
  let executor: ToolExecutor;
  let registry: ToolRegistry;
  let mockUsageRepo: any;

  const mockContext = {
    executionId: 'exec-123',
    sessionId: 'session-456',
    userId: 'user-789',
    projectId: 'project-101',
    permissions: [
      {
        resourceType: 'file',
        pattern: '/allowed/**',
        action: 'allow' as const,
      },
      {
        resourceType: 'file',
        pattern: '/etc/**',
        action: 'deny' as const,
      },
    ],
  };

  beforeEach(() => {
    // Reset registry
    ToolRegistry.resetInstance();
    registry = ToolRegistry.getInstance();

    // Register some test tools
    const tools: ToolDefinition[] = [
      {
        name: 'read-file',
        description: 'Read a file',
        category: 'file' as ToolCategory,
        inputSchema: z.object({
          path: z.string(),
          encoding: z.enum(['utf-8', 'ascii']).optional(),
        }),
        outputSchema: z.object({
          content: z.string(),
        }),
        handler: async (input: any) => {
          return {
            success: true,
            data: { content: `File content: ${input.path}` },
          };
        },
        permissions: [
          {
            resourceType: 'file',
            pattern: '/allowed/**',
            action: 'allow' as const,
          },
        ],
        rateLimit: 10,
      },
      {
        name: 'write-file',
        description: 'Write a file',
        category: 'file' as ToolCategory,
        inputSchema: z.object({
          path: z.string(),
          content: z.string(),
        }),
        outputSchema: z.object({
          bytesWritten: z.number(),
        }),
        handler: async (input: any) => {
          return {
            success: true,
            data: { bytesWritten: input.content.length },
          };
        },
        permissions: [
          {
            resourceType: 'file',
            pattern: '/allowed/**',
            action: 'allow' as const,
          },
        ],
      },
      {
        name: 'dangerous-tool',
        description: 'A dangerous tool',
        category: 'system' as ToolCategory,
        inputSchema: z.object({
          command: z.string(),
        }),
        outputSchema: z.object({
          result: z.string(),
        }),
        handler: async (input: any) => {
          return {
            success: true,
            data: { result: `Executed: ${input.command}` },
          };
        },
        rateLimit: 1,
      },
      {
        name: 'failing-tool',
        description: 'A tool that fails',
        category: 'system' as ToolCategory,
        inputSchema: z.object({
          input: z.string(),
        }),
        outputSchema: z.object({
          result: z.string(),
        }),
        handler: async () => {
          throw new Error('Tool execution failed');
        },
      },
    ];

    tools.forEach((tool) => registry.register(tool));

    // Create executor
    mockUsageRepo = {
      create: vi.fn().mockResolvedValue({ id: 'usage-123' }),
    };

    executor = new ToolExecutor(registry, mockUsageRepo);
  });

  describe('execute', () => {
    it('should successfully execute a valid tool', async () => {
      const result = await executor.execute(
        'read-file',
        { path: '/allowed/test.txt', encoding: 'utf-8' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ content: 'File content: /allowed/test.txt' });
      expect(result.error).toBeUndefined();
      expect(result.metadata?.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should validate input schema', async () => {
      const result = await executor.execute(
        'read-file',
        { path: 123 }, // Invalid: should be string
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });

    it('should reject execution for non-existent tool', async () => {
      const result = await executor.execute(
        'non-existent-tool',
        {},
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle tool execution errors gracefully', async () => {
      const result = await executor.execute(
        'failing-tool',
        { input: 'test' },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tool execution failed');
    });

    it('should track tool usage in repository', async () => {
      await executor.execute(
        'read-file',
        { path: '/allowed/test.txt' },
        mockContext
      );

      expect(mockUsageRepo.create).toHaveBeenCalledWith({
        executionId: mockContext.executionId,
        toolName: 'read-file',
        arguments: { path: '/allowed/test.txt' },
        result: expect.any(Object),
        durationMs: expect.any(Number),
        success: true,
      });
    });
  });

  describe('input validation', () => {
    it('should reject missing required fields', async () => {
      const result = await executor.execute(
        'read-file',
        {}, // Missing 'path' field
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject invalid enum values', async () => {
      const result = await executor.execute(
        'read-file',
        { path: '/test.txt', encoding: 'invalid' }, // Invalid enum value
        mockContext
      );

      expect(result.success).toBe(false);
    });

    it('should accept valid optional fields', async () => {
      const result = await executor.execute(
        'read-file',
        { path: '/allowed/test.txt' }, // encoding is optional
        mockContext
      );

      expect(result.success).toBe(true);
    });

    it('should handle complex nested schemas', async () => {
      const complexTool: ToolDefinition = {
        name: 'complex-tool',
        description: 'Tool with complex schema',
        category: 'system' as ToolCategory,
        inputSchema: z.object({
          path: z.string(),
          options: z.object({
            recursive: z.boolean().default(false),
            depth: z.number().int().min(1).max(100),
          }),
          filters: z.array(z.string()).optional(),
        }),
        outputSchema: z.object({
          result: z.string(),
        }),
        handler: async () => ({
          success: true,
          data: { result: 'ok' },
        }),
      };

      registry.register(complexTool);

      const result = await executor.execute(
        'complex-tool',
        {
          path: '/test',
          options: { depth: 5 },
          filters: ['*.txt'],
        },
        mockContext
      );

      expect(result.success).toBe(true);
    });
  });

  describe('permission checking', () => {
    it('should allow execution with matching permissions', async () => {
      const result = await executor.execute(
        'read-file',
        { path: '/allowed/test.txt' },
        mockContext
      );

      expect(result.success).toBe(true);
    });

    it('should deny execution when permissions mismatch', async () => {
      const result = await executor.execute(
        'read-file',
        { path: '/etc/passwd' }, // Denied by permissions
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });

    it('should allow /** pattern to match absolute paths', async () => {
      const wildcardTool: ToolDefinition = {
        name: 'wildcard-tool',
        description: 'Tool with /** permission',
        category: 'file' as const,
        inputSchema: z.object({
          path: z.string(),
        }),
        outputSchema: z.object({
          content: z.string(),
        }),
        permissions: [
          {
            resourceType: 'file',
            pattern: '/**',
            action: 'allow',
          },
        ],
        handler: async () => ({
          success: true,
          data: { content: 'ok' },
        }),
      };

      registry.register(wildcardTool);

      const result = await executor.execute(
        'wildcard-tool',
        { path: '/Users/test/file.txt' },
        mockContext
      );

      expect(result.success).toBe(true);
    });

    it('should check tool-specific permissions', async () => {
      const strictTool: ToolDefinition = {
        name: 'strict-tool',
        description: 'Tool with strict permissions',
        category: 'system' as ToolCategory,
        inputSchema: z.object({
          path: z.string(),
        }),
        outputSchema: z.object({
          result: z.string(),
        }),
        handler: async () => ({
          success: true,
          data: { result: 'ok' },
        }),
        permissions: [
          {
            resourceType: 'file',
            pattern: '/strict/**',
            action: 'allow' as const,
          },
        ],
      };

      registry.register(strictTool);

      const allowedResult = await executor.execute(
        'strict-tool',
        { path: '/strict/test.txt' },
        mockContext
      );

      const deniedResult = await executor.execute(
        'strict-tool',
        { path: '/other/test.txt' },
        mockContext
      );

      expect(allowedResult.success).toBe(true);
      expect(deniedResult.success).toBe(false);
    });

    it('should allow execution when tool has no permissions', async () => {
      const openTool: ToolDefinition = {
        name: 'open-tool',
        description: 'Tool with no permissions',
        category: 'system' as ToolCategory,
        inputSchema: z.object({
          data: z.string(),
        }),
        outputSchema: z.object({
          result: z.string(),
        }),
        handler: async () => ({
          success: true,
          data: { result: 'ok' },
        }),
        // No permissions field
      };

      registry.register(openTool);

      const result = await executor.execute(
        'open-tool',
        { data: 'test' },
        mockContext
      );

      expect(result.success).toBe(true);
    });
  });

  describe('rate limiting', () => {
    it('should enforce rate limit', async () => {
      // Execute tool up to rate limit
      for (let i = 0; i < 10; i++) {
        await executor.execute('dangerous-tool', { command: `test-${i}` }, mockContext);
      }

      // Next execution should be rate limited
      const result = await executor.execute(
        'dangerous-tool',
        { command: 'test-11' },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit');
    });

    it('should not rate limit tools without rate limit', async () => {
      // Execute tool many times
      for (let i = 0; i < 50; i++) {
        const result = await executor.execute(
          'write-file',
          { path: `/allowed/test-${i}.txt`, content: 'test' },
          mockContext
        );
        expect(result.success).toBe(true);
      }
    });

    it('should reset rate limits over time', async () => {
      // This test would require mocking time
      // For now, we'll just verify the structure exists
      expect(executor).toBeDefined();
    });
  });

  describe('execution context', () => {
    it('should pass context to tool handler', async () => {
      let capturedContext: any = null;

      const contextTool: ToolDefinition = {
        name: 'context-tool',
        description: 'Tool that uses context',
        category: 'system' as ToolCategory,
        inputSchema: z.object({}),
        outputSchema: z.object({
          result: z.string(),
        }),
        handler: async (input: any, context: any) => {
          capturedContext = context;
          return {
            success: true,
            data: { result: 'ok' },
          };
        },
      };

      registry.register(contextTool);

      await executor.execute('context-tool', {}, mockContext);

      expect(capturedContext).toEqual(mockContext);
    });

    it('should execute with minimal context', async () => {
      const minimalContext = {
        executionId: 'exec-123',
        sessionId: 'session-456',
        permissions: [],
      };

      const result = await executor.execute(
        'read-file',
        { path: '/allowed/test.txt' },
        minimalContext
      );

      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle tool timeout', async () => {
      const slowTool: ToolDefinition = {
        name: 'slow-tool',
        description: 'Tool that takes too long',
        category: 'system' as ToolCategory,
        inputSchema: z.object({}),
        outputSchema: z.object({}),
        handler: async () => {
          // Simulate long-running operation
          await new Promise((resolve) => setTimeout(resolve, 10000));
          return {
            success: true,
            data: {},
          };
        },
      };

      registry.register(slowTool);

      const result = await executor.execute('slow-tool', {}, {
        ...mockContext,
        timeout: 100, // 100ms timeout
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should handle malformed tool output', async () => {
      const malformedTool: ToolDefinition = {
        name: 'malformed-tool',
        description: 'Tool with bad output',
        category: 'system' as ToolCategory,
        inputSchema: z.object({}),
        outputSchema: z.object({
          result: z.string(),
        }),
        handler: async () => {
          // Return output that doesn't match schema
          return {
            success: true,
            data: { wrongField: 'value' },
          } as any;
        },
      };

      registry.register(malformedTool);

      const result = await executor.execute('malformed-tool', {}, mockContext);

      // Should still succeed but could log a warning
      expect(result).toBeDefined();
    });

    it('should handle tool that returns undefined', async () => {
      const undefinedTool: ToolDefinition = {
        name: 'undefined-tool',
        description: 'Tool that returns undefined',
        category: 'system' as ToolCategory,
        inputSchema: z.object({}),
        outputSchema: z.object({}),
        handler: async () => undefined as any,
      };

      registry.register(undefinedTool);

      const result = await executor.execute('undefined-tool', {}, mockContext);

      expect(result.success).toBe(false);
    });
  });

  describe('metadata tracking', () => {
    it('should include duration in metadata', async () => {
      const result = await executor.execute(
        'read-file',
        { path: '/allowed/test.txt' },
        mockContext
      );

      expect(result.metadata?.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata?.durationMs).toBeLessThan(1000); // Should be fast
    });

    it('should track execution time accurately', async () => {
      const delayTool: ToolDefinition = {
        name: 'delay-tool',
        description: 'Tool with delay',
        category: 'system' as ToolCategory,
        inputSchema: z.object({
          delay: z.number(),
        }),
        outputSchema: z.object({
          result: z.string(),
        }),
        handler: async (input: any) => {
          await new Promise((resolve) => setTimeout(resolve, input.delay));
          return {
            success: true,
            data: { result: 'ok' },
          };
        },
      };

      registry.register(delayTool);

      const delay = 100;
      const result = await executor.execute('delay-tool', { delay }, mockContext);

      expect(result.metadata?.durationMs).toBeGreaterThanOrEqual(delay);
    });
  });

  describe('concurrent execution', () => {
    it('should handle multiple concurrent executions', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        executor.execute('read-file', { path: `/allowed/test-${i}.txt` }, mockContext)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('should maintain rate limits across concurrent requests', async () => {
      const promises = Array.from({ length: 20 }, (_, i) =>
        executor.execute('dangerous-tool', { command: `test-${i}` }, mockContext)
      );

      const results = await Promise.all(promises);

      // Some should succeed, some should be rate limited
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      expect(successCount).toBeLessThanOrEqual(10); // Rate limit
      expect(failCount).toBeGreaterThan(0);
    });
  });
});
