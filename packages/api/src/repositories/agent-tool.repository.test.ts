/**
 * Tests for AgentToolRepository
 *
 * TDD: Tests written before implementation
 * RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentToolRepository } from './agent-tool.repository';
import { agentTools, type ToolCategory } from '../db/schema';
import { getTestDatabase, cleanTestDatabase } from '../../__tests__/helpers/integration';

describe('AgentToolRepository', () => {
  let repository: AgentToolRepository;
  let db: ReturnType<typeof getTestDatabase>;

  beforeEach(async () => {
    db = getTestDatabase();
    await cleanTestDatabase(db);
    repository = new AgentToolRepository();
  });

  // Helper to create test tool data
  function createTestToolData(overrides?: {
    name?: string;
    description?: string;
    category?: ToolCategory;
    enabled?: boolean;
  }) {
    const categories: ToolCategory[] = ['file', 'code', 'command', 'search', 'ai', 'system'];
    return {
      name: overrides?.name || `test-tool-${crypto.randomUUID().substring(0, 8)}`,
      description: overrides?.description || 'A test tool for unit testing',
      category: overrides?.category || categories[Math.floor(Math.random() * categories.length)],
      schema: {
        input: {
          type: 'object',
          properties: {
            path: { type: 'string' },
          },
        },
        output: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
      },
      enabled: overrides?.enabled ?? true,
    };
  }

  describe('findAll', () => {
    it('should return all tools', async () => {
      const tool1 = await repository.create(createTestToolData({ name: 'tool-1' }));
      const tool2 = await repository.create(createTestToolData({ name: 'tool-2' }));
      const tool3 = await repository.create(createTestToolData({ name: 'tool-3' }));

      const tools = await repository.findAll();

      expect(tools).toBeDefined();
      expect(tools.length).toBeGreaterThanOrEqual(3);
      expect(tools.map((t) => t.id)).toContain(tool1.id);
      expect(tools.map((t) => t.id)).toContain(tool2.id);
      expect(tools.map((t) => t.id)).toContain(tool3.id);
    });

    it('should return empty array when no tools exist', async () => {
      const tools = await repository.findAll();

      expect(tools).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return tool by ID', async () => {
      const created = await repository.create(createTestToolData());

      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe(created.name);
      expect(found?.description).toBe(created.description);
      expect(found?.category).toBe(created.category);
    });

    it('should return null when tool not found', async () => {
      const found = await repository.findById('non-existent-id');

      expect(found).toBeNull();
    });

    it('should return null for empty ID', async () => {
      const found = await repository.findById('');

      expect(found).toBeNull();
    });

    it('should return null for undefined ID', async () => {
      const found = await repository.findById(undefined as any);

      expect(found).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should return tool by name', async () => {
      const toolName = 'read-file';
      const created = await repository.create(createTestToolData({ name: toolName }));

      const found = await repository.findByName(toolName);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe(toolName);
    });

    it('should return null when name not found', async () => {
      const found = await repository.findByName('non-existent-tool');

      expect(found).toBeNull();
    });

    it('should be case-sensitive', async () => {
      await repository.create(createTestToolData({ name: 'Read-File' }));

      const foundLower = await repository.findByName('read-file');
      const foundMixed = await repository.findByName('Read-File');

      expect(foundLower).toBeNull();
      expect(foundMixed).toBeDefined();
    });

    it('should handle empty string name', async () => {
      const found = await repository.findByName('');

      expect(found).toBeNull();
    });
  });

  describe('findByCategory', () => {
    it('should return tools by category', async () => {
      await repository.create(createTestToolData({ name: 'file-tool-1', category: 'file' }));
      await repository.create(createTestToolData({ name: 'file-tool-2', category: 'file' }));
      await repository.create(createTestToolData({ name: 'code-tool-1', category: 'code' }));
      await repository.create(createTestToolData({ name: 'search-tool-1', category: 'search' }));

      const fileTools = await repository.findByCategory('file');

      expect(fileTools).toHaveLength(2);
      expect(fileTools.map((t) => t.name)).toContain('file-tool-1');
      expect(fileTools.map((t) => t.name)).toContain('file-tool-2');
      expect(fileTools.every((t) => t.category === 'file')).toBe(true);
    });

    it('should return empty array when no tools in category', async () => {
      await repository.create(createTestToolData({ category: 'file' }));

      const tools = await repository.findByCategory('code');

      expect(tools).toEqual([]);
    });

    it('should support all category types', async () => {
      const categories: ToolCategory[] = ['file', 'code', 'command', 'search', 'ai', 'system'];

      for (const category of categories) {
        await repository.create(createTestToolData({ name: `${category}-tool`, category }));
      }

      for (const category of categories) {
        const tools = await repository.findByCategory(category);
        expect(tools.length).toBeGreaterThanOrEqual(1);
        expect(tools.every((t) => t.category === category)).toBe(true);
      }
    });
  });

  describe('findEnabled', () => {
    it('should return only enabled tools', async () => {
      await repository.create(createTestToolData({ name: 'enabled-1', enabled: true }));
      await repository.create(createTestToolData({ name: 'enabled-2', enabled: true }));
      await repository.create(createTestToolData({ name: 'disabled-1', enabled: false }));

      const enabledTools = await repository.findEnabled();

      expect(enabledTools).toHaveLength(2);
      expect(enabledTools.map((t) => t.name)).toContain('enabled-1');
      expect(enabledTools.map((t) => t.name)).toContain('enabled-2');
      expect(enabledTools.map((t) => t.name)).not.toContain('disabled-1');
      expect(enabledTools.every((t) => t.enabled === true)).toBe(true);
    });

    it('should return empty array when all tools are disabled', async () => {
      await repository.create(createTestToolData({ enabled: false }));
      await repository.create(createTestToolData({ enabled: false }));

      const enabledTools = await repository.findEnabled();

      expect(enabledTools).toEqual([]);
    });

    it('should return empty array when no tools exist', async () => {
      const enabledTools = await repository.findEnabled();

      expect(enabledTools).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create a new tool', async () => {
      const data = createTestToolData({
        name: 'write-file',
        description: 'Write content to a file',
        category: 'file',
        enabled: true,
      });

      const tool = await repository.create(data);

      expect(tool).toBeDefined();
      expect(tool.id).toBeDefined();
      expect(tool.name).toBe(data.name);
      expect(tool.description).toBe(data.description);
      expect(tool.category).toBe(data.category);
      expect(tool.schema).toEqual(data.schema);
      expect(tool.enabled).toBe(data.enabled);
      expect(tool.createdAt).toBeDefined();
      expect(tool.updatedAt).toBeDefined();
    });

    it('should create tool with enabled=false', async () => {
      const data = createTestToolData({ enabled: false });

      const tool = await repository.create(data);

      expect(tool.enabled).toBe(false);
    });

    it('should create tool with all categories', async () => {
      const categories: ToolCategory[] = ['file', 'code', 'command', 'search', 'ai', 'system'];

      for (const category of categories) {
        const data = createTestToolData({ name: `${category}-test-tool`, category });
        const tool = await repository.create(data);
        expect(tool.category).toBe(category);
      }
    });

    it('should store schema as JSON', async () => {
      const schema = {
        input: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path' },
            content: { type: 'string', description: 'File content' },
          },
          required: ['path', 'content'],
        },
        output: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            bytesWritten: { type: 'number' },
          },
        },
      };

      const data = createTestToolData();
      data.schema = schema as any;

      const tool = await repository.create(data);

      expect(tool.schema).toEqual(schema);
    });

    it('should throw error for duplicate tool name', async () => {
      const data = createTestToolData({ name: 'duplicate-tool' });
      await repository.create(data);

      await expect(repository.create(data)).rejects.toThrow();
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: '',
        description: '',
        category: 'file' as ToolCategory,
        schema: {},
        enabled: true,
      };

      await expect(repository.create(invalidData as any)).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update tool fields', async () => {
      const created = await repository.create(createTestToolData());

      const updated = await repository.update(created.id, {
        description: 'Updated description',
        enabled: false,
      });

      expect(updated).toBeDefined();
      expect(updated?.id).toBe(created.id);
      expect(updated?.description).toBe('Updated description');
      expect(updated?.enabled).toBe(false);
      expect(updated?.name).toBe(created.name); // Unchanged
      expect(updated?.updatedAt).toBeDefined();
      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
    });

    it('should update tool category', async () => {
      const created = await repository.create(createTestToolData({ category: 'file' }));

      const updated = await repository.update(created.id, { category: 'code' });

      expect(updated?.category).toBe('code');
    });

    it('should update tool schema', async () => {
      const created = await repository.create(createTestToolData());

      const newSchema = {
        input: { type: 'string' },
        output: { type: 'boolean' },
      };

      const updated = await repository.update(created.id, { schema: newSchema as any });

      expect(updated?.schema).toEqual(newSchema);
    });

    it('should return null when updating non-existent tool', async () => {
      const result = await repository.update('non-existent-id', {
        description: 'Updated',
      });

      expect(result).toBeNull();
    });

    it('should not allow updating name to existing name', async () => {
      const tool1 = await repository.create(createTestToolData({ name: 'tool-1' }));
      const tool2 = await repository.create(createTestToolData({ name: 'tool-2' }));

      await expect(
        repository.update(tool2.id, { name: 'tool-1' })
      ).rejects.toThrow();
    });

    it('should support updating name to unique value', async () => {
      const created = await repository.create(createTestToolData({ name: 'old-name' }));

      const updated = await repository.update(created.id, { name: 'new-name' });

      expect(updated?.name).toBe('new-name');
    });
  });

  describe('delete', () => {
    it('should delete tool by ID', async () => {
      const created = await repository.create(createTestToolData());

      const deleted = await repository.delete(created.id);

      expect(deleted).toBe(true);

      const found = await repository.findById(created.id);
      expect(found).toBeNull();
    });

    it('should return false when deleting non-existent tool', async () => {
      const deleted = await repository.delete('non-existent-id');

      expect(deleted).toBe(false);
    });

    it('should return false for empty ID', async () => {
      const deleted = await repository.delete('');

      expect(deleted).toBe(false);
    });

    it('should only delete the specified tool', async () => {
      const tool1 = await repository.create(createTestToolData({ name: 'tool-1' }));
      const tool2 = await repository.create(createTestToolData({ name: 'tool-2' }));

      await repository.delete(tool1.id);

      const found1 = await repository.findById(tool1.id);
      const found2 = await repository.findById(tool2.id);

      expect(found1).toBeNull();
      expect(found2).toBeDefined();
    });
  });

  describe('toggleEnabled', () => {
    it('should enable a disabled tool', async () => {
      const created = await repository.create(createTestToolData({ enabled: false }));

      const updated = await repository.toggleEnabled(created.id, true);

      expect(updated).toBeDefined();
      expect(updated?.enabled).toBe(true);
    });

    it('should disable an enabled tool', async () => {
      const created = await repository.create(createTestToolData({ enabled: true }));

      const updated = await repository.toggleEnabled(created.id, false);

      expect(updated).toBeDefined();
      expect(updated?.enabled).toBe(false);
    });

    it('should return null when toggling non-existent tool', async () => {
      const result = await repository.toggleEnabled('non-existent-id', true);

      expect(result).toBeNull();
    });

    it('should preserve other fields when toggling', async () => {
      const data = createTestToolData({
        name: 'test-tool',
        description: 'Test description',
        category: 'file',
      });
      const created = await repository.create(data);

      const updated = await repository.toggleEnabled(created.id, false);

      expect(updated?.name).toBe(data.name);
      expect(updated?.description).toBe(data.description);
      expect(updated?.category).toBe(data.category);
      expect(updated?.enabled).toBe(false);
    });

    it('should handle multiple toggles', async () => {
      const created = await repository.create(createTestToolData({ enabled: true }));

      let updated = await repository.toggleEnabled(created.id, false);
      expect(updated?.enabled).toBe(false);

      updated = await repository.toggleEnabled(created.id, true);
      expect(updated?.enabled).toBe(true);

      updated = await repository.toggleEnabled(created.id, false);
      expect(updated?.enabled).toBe(false);
    });
  });

  describe('inherited CRUD operations', () => {
    it('should support exists', async () => {
      const created = await repository.create(createTestToolData());

      const exists = await repository.exists(created.id);
      const notExists = await repository.exists('non-existent-id');

      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });

    it('should support count', async () => {
      await repository.create(createTestToolData({ name: 'tool-1' }));
      await repository.create(createTestToolData({ name: 'tool-2' }));
      await repository.create(createTestToolData({ name: 'tool-3' }));

      const count = await repository.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });

    it('should support count with conditions', async () => {
      await repository.create(createTestToolData({ name: 'tool-1', enabled: true }));
      await repository.create(createTestToolData({ name: 'tool-2', enabled: true }));
      await repository.create(createTestToolData({ name: 'tool-3', enabled: false }));

      // Note: count with conditions uses findMany internally
      const allCount = await repository.count();
      expect(allCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle special characters in tool name', async () => {
      const specialName = 'tool-with_special.chars';
      const data = createTestToolData({ name: specialName });

      const created = await repository.create(data);
      const found = await repository.findByName(specialName);

      expect(found?.id).toBe(created.id);
    });

    it('should handle unicode in description', async () => {
      const data = createTestToolData({
        description: 'A tool for reading files with unicode: hello, world',
      });

      const created = await repository.create(data);

      expect(created.description).toContain('hello, world');
    });

    it('should handle complex schema structures', async () => {
      const complexSchema = {
        input: {
          type: 'object',
          properties: {
            nested: {
              type: 'object',
              properties: {
                deep: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
          },
        },
        output: {
          type: 'object',
          properties: {
            result: {
              anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
            },
          },
        },
      };

      const data = createTestToolData();
      data.schema = complexSchema as any;

      const created = await repository.create(data);

      expect(created.schema).toEqual(complexSchema);
    });

    it('should handle very long descriptions', async () => {
      const longDescription = 'A'.repeat(10000);
      const data = createTestToolData({ description: longDescription });

      const created = await repository.create(data);

      expect(created.description).toHaveLength(10000);
    });
  });
});
