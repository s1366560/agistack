/**
 * Tool Bootstrap Tests
 *
 * Tests for automatic tool registration system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ToolRegistry } from './registry';
import { bootstrapTools } from './bootstrap';
import type { ToolCategory } from '@agistack/shared/types/tool';

describe('bootstrapTools', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    // Reset registry before each test
    ToolRegistry.resetInstance();
    registry = ToolRegistry.getInstance();
  });

  afterEach(() => {
    ToolRegistry.resetInstance();
  });

  describe('Tool Registration', () => {
    it('should register all core tools on bootstrap', () => {
      bootstrapTools(registry);

      const allTools = registry.getAll();
      expect(allTools.length).toBeGreaterThanOrEqual(4); // At least 4 core tools
    });

    it('should register file tools with correct metadata', () => {
      bootstrapTools(registry);

      const readFileTool = registry.get('read-file');
      expect(readFileTool).toBeDefined();
      expect(readFileTool?.category).toBe('file' as ToolCategory);
      expect(readFileTool?.enabled).toBe(true);
      expect(readFileTool?.dangerous).toBe(false);
    });

    it('should register code tools', () => {
      bootstrapTools(registry);

      const searchCodeTool = registry.get('search-code');
      expect(searchCodeTool).toBeDefined();
      expect(searchCodeTool?.category).toBe('search' as ToolCategory);
    });

    it('should not re-register tools if called multiple times', () => {
      bootstrapTools(registry);
      const count1 = registry.getAll().length;

      bootstrapTools(registry);
      const count2 = registry.getAll().length;

      expect(count1).toBe(count2);
    });

    it('should register tools with proper Zod schemas', () => {
      bootstrapTools(registry);

      const readFileTool = registry.get('read-file');
      expect(readFileTool).toBeDefined();

      // Verify inputSchema is a Zod schema
      expect(readFileTool?.inputSchema).toBeDefined();
      expect(typeof (readFileTool?.inputSchema as any).parse).toBe('function');
    });

    it('should provide tool descriptions', () => {
      bootstrapTools(registry);

      const tools = registry.getAll();

      tools.forEach(tool => {
        expect(tool.description).toBeDefined();
        expect(tool.description.length).toBeGreaterThan(0);
      });
    });

    it('should set appropriate dangerous flags for risky tools', () => {
      bootstrapTools(registry);

      // File operations are not dangerous by default
      const readFileTool = registry.get('read-file');
      expect(readFileTool?.dangerous).toBe(false);

      const writeFileTool = registry.get('write-file');
      expect(writeFileTool?.dangerous).toBe(false);
    });
  });

  describe('Tool Availability', () => {
    it('should make registered tools available for AI format conversion', () => {
      bootstrapTools(registry);

      const openaiFormat = registry.toAIFormat('openai');
      expect(openaiFormat.length).toBeGreaterThan(0);

      const anthropicFormat = registry.toAIFormat('anthropic');
      expect(anthropicFormat.length).toBeGreaterThan(0);
    });

    it('should only include enabled tools in AI format', () => {
      bootstrapTools(registry);

      // All core tools should be enabled by default
      const enabledTools = registry.getEnabled();
      const allTools = registry.getAll();

      expect(enabledTools.length).toBe(allTools.length);
    });

    it('should provide proper JSON Schema for tool parameters', () => {
      bootstrapTools(registry);

      const openaiFormat = registry.toAIFormat('openai');
      const readFileTool = openaiFormat.find((t: any) =>
        t.type === 'function' && t.function?.name === 'read-file'
      );

      expect(readFileTool).toBeDefined();
      expect(readFileTool?.function?.parameters).toBeDefined();
      expect(readFileTool?.function?.parameters?.type).toBe('object');
    });
  });

  describe('Error Handling', () => {
    it('should handle gracefully if registry is null', () => {
      expect(() => {
        bootstrapTools(null as any);
      }).not.toThrow();
    });

    it('should continue bootstrap even if one tool fails to register', () => {
      // Mock a tool that throws on register
      const mockRegistry = {
        getAll: () => [],
        getEnabled: () => [],
        register: (tool: any) => {
          if (tool.name === 'failing-tool') {
            throw new Error('Registration failed');
          }
        },
        get: () => undefined,
        has: () => false,
        toAIFormat: () => [],
        findByCategory: () => [],
        getByCategory: () => [],
        getDangerous: () => [],
        setEnabled: () => {},
        unregister: () => false,
        clear: () => {},
      } as any;

      // Add custom tool that will fail
      // This test verifies the bootstrap doesn't fail completely
      expect(() => bootstrapTools(mockRegistry)).not.toThrow();
    });

    it('should handle registerCoreTools throwing error gracefully', () => {
      // Mock registry that throws in registerCoreTools
      const mockRegistry = {
        getAll: () => [],
        getEnabled: () => [],
        register: () => {
          throw new Error('Tool registration error');
        },
        get: () => undefined,
        has: () => false,
        toAIFormat: () => [],
        findByCategory: () => [],
        getByCategory: () => [],
        getDangerous: () => [],
        setEnabled: () => {},
        unregister: () => false,
        clear: () => {},
      } as any;

      // Should not throw despite error in registerCoreTools
      expect(() => bootstrapTools(mockRegistry)).not.toThrow();
    });
  });

  describe('Core Tool Functionality', () => {
    it('should register read-file tool with correct schema', () => {
      bootstrapTools(registry);

      const tool = registry.get('read-file');
      expect(tool).toBeDefined();

      // Test schema validation
      const validInput = { path: '/test/file.txt' };
      const result = tool?.inputSchema.safeParse(validInput);

      expect(result?.success).toBe(true);
    });

    it('should register write-file tool with correct schema', () => {
      bootstrapTools(registry);

      const tool = registry.get('write-file');
      expect(tool).toBeDefined();

      const validInput = {
        path: '/test/file.txt',
        content: 'test content',
      };
      const result = tool?.inputSchema.safeParse(validInput);

      expect(result?.success).toBe(true);
    });

    it('should register list-files tool with correct schema', () => {
      bootstrapTools(registry);

      const tool = registry.get('list-files');
      expect(tool).toBeDefined();

      const validInput = { path: '/test' };
      const result = tool?.inputSchema.safeParse(validInput);

      expect(result?.success).toBe(true);
    });

    it('should register search-code tool with correct schema', () => {
      bootstrapTools(registry);

      const tool = registry.get('search-code');
      expect(tool).toBeDefined();

      const validInput = {
        pattern: 'test',
        path: '/src',
        filePattern: '*.ts',
      };
      const result = tool?.inputSchema.safeParse(validInput);

      expect(result?.success).toBe(true);
    });
  });
});
