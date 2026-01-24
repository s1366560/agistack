import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ToolRegistry } from './registry';
import { ToolDefinition, ToolCategory } from '@agistack/shared';
import { z } from 'zod';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    // Reset singleton before each test
    ToolRegistry.resetInstance();
    registry = ToolRegistry.getInstance();
  });

  afterEach(() => {
    ToolRegistry.resetInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance across multiple calls', () => {
      const instance1 = ToolRegistry.getInstance();
      const instance2 = ToolRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create a new instance after reset', () => {
      const instance1 = ToolRegistry.getInstance();
      ToolRegistry.resetInstance();
      const instance2 = ToolRegistry.getInstance();

      expect(instance1).not.toBe(instance2);
    });

    it('should maintain state across getInstance calls', () => {
      const instance1 = ToolRegistry.getInstance();

      const mockTool: ToolDefinition = {
        name: 'test-tool',
        description: 'Test tool',
        category: 'system' as ToolCategory,
        inputSchema: z.object({}),
        outputSchema: z.object({}),
        handler: async () => ({ success: true, data: null }),
      };

      instance1.register(mockTool);

      const instance2 = ToolRegistry.getInstance();
      const retrieved = instance2.get('test-tool');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('test-tool');
    });
  });

  describe('register', () => {
    it('should register a new tool', () => {
      const tool: ToolDefinition = {
        name: 'read-file',
        description: 'Read a file',
        category: 'file' as ToolCategory,
        inputSchema: z.object({
          path: z.string(),
        }),
        outputSchema: z.object({
          content: z.string(),
        }),
        handler: async () => ({ success: true, data: { content: 'test' } }),
      };

      registry.register(tool);

      const retrieved = registry.get('read-file');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('read-file');
    });

    it('should allow multiple tools with different names', () => {
      const tool1: ToolDefinition = {
        name: 'tool1',
        description: 'Tool 1',
        category: 'system' as ToolCategory,
        inputSchema: z.object({}),
        outputSchema: z.object({}),
        handler: async () => ({ success: true, data: null }),
      };

      const tool2: ToolDefinition = {
        name: 'tool2',
        description: 'Tool 2',
        category: 'system' as ToolCategory,
        inputSchema: z.object({}),
        outputSchema: z.object({}),
        handler: async () => ({ success: true, data: null }),
      };

      registry.register(tool1);
      registry.register(tool2);

      expect(registry.get('tool1')).toBeDefined();
      expect(registry.get('tool2')).toBeDefined();
    });

    it('should overwrite tool with same name', () => {
      const tool1: ToolDefinition = {
        name: 'test-tool',
        description: 'Original',
        category: 'system' as ToolCategory,
        inputSchema: z.object({}),
        outputSchema: z.object({}),
        handler: async () => ({ success: true, data: null }),
      };

      const tool2: ToolDefinition = {
        name: 'test-tool',
        description: 'Updated',
        category: 'file' as ToolCategory,
        inputSchema: z.object({}),
        outputSchema: z.object({}),
        handler: async () => ({ success: true, data: null }),
      };

      registry.register(tool1);
      registry.register(tool2);

      const retrieved = registry.get('test-tool');
      expect(retrieved?.description).toBe('Updated');
      expect(retrieved?.category).toBe('file');
    });

    it('should handle tools with complex schemas', () => {
      const tool: ToolDefinition = {
        name: 'complex-tool',
        description: 'Tool with complex schema',
        category: 'code' as ToolCategory,
        inputSchema: z.object({
          path: z.string().min(1),
          options: z.object({
            recursive: z.boolean().default(false),
            depth: z.number().int().min(1).max(100),
          }),
          pattern: z.string().optional(),
        }),
        outputSchema: z.object({
          results: z.array(z.object({
            path: z.string(),
            matches: z.array(z.string()),
          })),
        }),
        handler: async () => ({ success: true, data: { results: [] } }),
      };

      registry.register(tool);

      const retrieved = registry.get('complex-tool');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('complex-tool');
    });
  });

  describe('unregister', () => {
    it('should unregister an existing tool', () => {
      const tool: ToolDefinition = {
        name: 'temp-tool',
        description: 'Temporary tool',
        category: 'system' as ToolCategory,
        inputSchema: z.object({}),
        outputSchema: z.object({}),
        handler: async () => ({ success: true, data: null }),
      };

      registry.register(tool);
      expect(registry.get('temp-tool')).toBeDefined();

      const unregistered = registry.unregister('temp-tool');
      expect(unregistered).toBe(true);
      expect(registry.get('temp-tool')).toBeUndefined();
    });

    it('should return false when unregistering non-existent tool', () => {
      const result = registry.unregister('non-existent');

      expect(result).toBe(false);
    });

    it('should handle unregistering multiple tools', () => {
      const tools: ToolDefinition[] = [
        {
          name: 'tool1',
          description: 'Tool 1',
          category: 'system' as ToolCategory,
          inputSchema: z.object({}),
          outputSchema: z.object({}),
          handler: async () => ({ success: true, data: null }),
        },
        {
          name: 'tool2',
          description: 'Tool 2',
          category: 'system' as ToolCategory,
          inputSchema: z.object({}),
          outputSchema: z.object({}),
          handler: async () => ({ success: true, data: null }),
        },
        {
          name: 'tool3',
          description: 'Tool 3',
          category: 'system' as ToolCategory,
          inputSchema: z.object({}),
          outputSchema: z.object({}),
          handler: async () => ({ success: true, data: null }),
        },
      ];

      tools.forEach((tool) => registry.register(tool));

      expect(registry.unregister('tool1')).toBe(true);
      expect(registry.unregister('tool2')).toBe(true);
      expect(registry.get('tool1')).toBeUndefined();
      expect(registry.get('tool2')).toBeUndefined();
      expect(registry.get('tool3')).toBeDefined();
    });
  });

  describe('get', () => {
    it('should return tool by name', () => {
      const tool: ToolDefinition = {
        name: 'find-tool',
        description: 'Find tool',
        category: 'search' as ToolCategory,
        inputSchema: z.object({}),
        outputSchema: z.object({}),
        handler: async () => ({ success: true, data: null }),
      };

      registry.register(tool);

      const retrieved = registry.get('find-tool');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe(tool.name);
      expect(retrieved?.description).toBe(tool.description);
      expect(retrieved?.enabled).toBe(true); // Default value
      expect(retrieved?.dangerous).toBe(false); // Default value
    });

    it('should return undefined for non-existent tool', () => {
      const retrieved = registry.get('does-not-exist');

      expect(retrieved).toBeUndefined();
    });

    it('should be case-sensitive', () => {
      const tool: ToolDefinition = {
        name: 'MyTool',
        description: 'My Tool',
        category: 'system' as ToolCategory,
        inputSchema: z.object({}),
        outputSchema: z.object({}),
        handler: async () => ({ success: true, data: null }),
      };

      registry.register(tool);

      expect(registry.get('MyTool')).toBeDefined();
      expect(registry.get('mytool')).toBeUndefined();
      expect(registry.get('MYTOOL')).toBeUndefined();
    });
  });

  describe('findByCategory', () => {
    beforeEach(() => {
      const tools: ToolDefinition[] = [
        {
          name: 'read-file',
          description: 'Read file',
          category: 'file' as ToolCategory,
          inputSchema: z.object({}),
          outputSchema: z.object({}),
          handler: async () => ({ success: true, data: null }),
        },
        {
          name: 'write-file',
          description: 'Write file',
          category: 'file' as ToolCategory,
          inputSchema: z.object({}),
          outputSchema: z.object({}),
          handler: async () => ({ success: true, data: null }),
        },
        {
          name: 'search-code',
          description: 'Search code',
          category: 'code' as ToolCategory,
          inputSchema: z.object({}),
          outputSchema: z.object({}),
          handler: async () => ({ success: true, data: null }),
        },
        {
          name: 'grep',
          description: 'Grep',
          category: 'search' as ToolCategory,
          inputSchema: z.object({}),
          outputSchema: z.object({}),
          handler: async () => ({ success: true, data: null }),
        },
      ];

      tools.forEach((tool) => registry.register(tool));
    });

    it('should return all tools in a category', () => {
      const fileTools = registry.findByCategory('file');

      expect(fileTools).toHaveLength(2);
      expect(fileTools.every((t) => t.category === 'file')).toBe(true);
    });

    it('should return empty array for category with no tools', () => {
      const aiTools = registry.findByCategory('ai');

      expect(aiTools).toEqual([]);
    });

    it('should return single tool for category with one tool', () => {
      const codeTools = registry.findByCategory('code');

      expect(codeTools).toHaveLength(1);
      expect(codeTools[0].name).toBe('search-code');
    });
  });

  describe('getAll', () => {
    it('should return all registered tools', () => {
      const tools: ToolDefinition[] = [
        {
          name: 'tool1',
          description: 'Tool 1',
          category: 'system' as ToolCategory,
          inputSchema: z.object({}),
          outputSchema: z.object({}),
          handler: async () => ({ success: true, data: null }),
        },
        {
          name: 'tool2',
          description: 'Tool 2',
          category: 'file' as ToolCategory,
          inputSchema: z.object({}),
          outputSchema: z.object({}),
          handler: async () => ({ success: true, data: null }),
        },
      ];

      tools.forEach((tool) => registry.register(tool));

      const allTools = registry.getAll();

      expect(allTools).toHaveLength(2);
      expect(allTools.map((t) => t.name)).toContain('tool1');
      expect(allTools.map((t) => t.name)).toContain('tool2');
    });

    it('should return empty array when no tools registered', () => {
      const allTools = registry.getAll();

      expect(allTools).toEqual([]);
    });

    it('should return tools in registration order', () => {
      const toolNames = ['tool-a', 'tool-b', 'tool-c'];

      toolNames.forEach((name) => {
        registry.register({
          name,
          description: `Tool ${name}`,
          category: 'system' as ToolCategory,
          inputSchema: z.object({}),
          outputSchema: z.object({}),
          handler: async () => ({ success: true, data: null }),
        });
      });

      const allTools = registry.getAll();

      expect(allTools.map((t) => t.name)).toEqual(toolNames);
    });
  });

  describe('toAIFormat', () => {
    beforeEach(() => {
      const tools: ToolDefinition[] = [
        {
          name: 'read-file',
          description: 'Read a file from the filesystem',
          category: 'file' as ToolCategory,
          inputSchema: z.object({
            path: z.string().describe('File path to read'),
            encoding: z.enum(['utf-8', 'ascii']).optional().describe('File encoding'),
          }),
          outputSchema: z.object({
            content: z.string(),
          }),
          handler: async () => ({ success: true, data: { content: '' } }),
        },
        {
          name: 'search-code',
          description: 'Search for patterns in code',
          category: 'code' as ToolCategory,
          inputSchema: z.object({
            pattern: z.string().describe('Search pattern'),
            path: z.string().optional().describe('Directory to search'),
          }),
          outputSchema: z.object({
            matches: z.array(z.string()),
          }),
          handler: async () => ({ success: true, data: { matches: [] } }),
        },
      ];

      tools.forEach((tool) => registry.register(tool));
    });

    describe('OpenAI format', () => {
      it('should convert tools to OpenAI function calling format', () => {
        const openaiTools = registry.toAIFormat('openai');

        expect(openaiTools).toBeInstanceOf(Array);
        expect(openaiTools).toHaveLength(2);
      });

      it('should include tool name and description', () => {
        const openaiTools = registry.toAIFormat('openai');
        const readFileTool = openaiTools[0];

        expect(readFileTool.function.name).toBe('read-file');
        expect(readFileTool.function.description).toBe('Read a file from the filesystem');
      });

      it('should convert Zod schema to JSON Schema', () => {
        const openaiTools = registry.toAIFormat('openai');
        const readFileTool = openaiTools[0];

        expect(readFileTool.function.parameters).toBeDefined();
        expect(readFileTool.function.parameters.type).toBe('object');
        expect(readFileTool.function.parameters.properties).toBeDefined();
        expect(readFileTool.function.parameters.properties.path).toBeDefined();
      });

      it('should handle optional parameters', () => {
        const openaiTools = registry.toAIFormat('openai');
        const readFileTool = openaiTools[0];

        expect(readFileTool.function.parameters.properties.path).toBeDefined();
        // encoding should be optional
        expect(readFileTool.function.parameters.required).not.toContain('encoding');
      });
    });

    describe('Anthropic format', () => {
      it('should convert tools to Anthropic tools format', () => {
        const anthropicTools = registry.toAIFormat('anthropic');

        expect(anthropicTools).toBeInstanceOf(Array);
        expect(anthropicTools).toHaveLength(2);
      });

      it('should include tool name and description', () => {
        const anthropicTools = registry.toAIFormat('anthropic');
        const readFileTool = anthropicTools[0];

        expect(readFileTool.name).toBe('read-file');
        expect(readFileTool.description).toBe('Read a file from the filesystem');
      });

      it('should include input_schema', () => {
        const anthropicTools = registry.toAIFormat('anthropic');
        const readFileTool = anthropicTools[0];

        expect(readFileTool.input_schema).toBeDefined();
        expect(readFileTool.input_schema.type).toBe('object');
      });
    });

    describe('Google format', () => {
      it('should convert tools to Google function calling format', () => {
        const googleTools = registry.toAIFormat('google');

        expect(googleTools).toBeInstanceOf(Array);
        expect(googleTools).toHaveLength(2);
      });

      it('should include function declaration', () => {
        const googleTools = registry.toAIFormat('google');
        const readFileTool = googleTools[0];

        expect(readFileTool.function).toBeDefined();
        expect(readFileTool.function.name).toBe('read-file');
        expect(readFileTool.function.description).toBe('Read a file from the filesystem');
      });
    });

    it('should throw error for unsupported provider', () => {
      expect(() => {
        registry.toAIFormat('unknown' as any);
      }).toThrow('Unsupported AI provider');
    });
  });

  describe('concurrent access', () => {
    it('should handle concurrent registrations', async () => {
      const promises = Array.from({ length: 100 }, (_, i) =>
        Promise.resolve().then(() => {
          const tool: ToolDefinition = {
            name: `concurrent-tool-${i}`,
            description: `Concurrent tool ${i}`,
            category: 'system' as ToolCategory,
            inputSchema: z.object({}),
            outputSchema: z.object({}),
            handler: async () => ({ success: true, data: null }),
          };
          registry.register(tool);
        })
      );

      await Promise.all(promises);

      expect(registry.getAll()).toHaveLength(100);
    });

    it('should handle concurrent reads', async () => {
      const tool: ToolDefinition = {
        name: 'test-tool',
        description: 'Test',
        category: 'system' as ToolCategory,
        inputSchema: z.object({}),
        outputSchema: z.object({}),
        handler: async () => ({ success: true, data: null }),
      };

      registry.register(tool);

      const promises = Array.from({ length: 100 }, () =>
        Promise.resolve().then(() => {
          return registry.get('test-tool');
        })
      );

      const results = await Promise.all(promises);

      expect(results.every((r) => r?.name === 'test-tool')).toBe(true);
    });
  });
});
