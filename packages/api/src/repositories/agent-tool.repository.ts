/**
 * Agent Tool Repository
 *
 * Manages agent tool definitions for AI agent capabilities
 */

import { BaseRepository } from './base';
import {
  agentTools,
  type AgentTool,
  type NewAgentTool,
  type ToolCategory,
} from '../db/schema';
import { eq, sql } from 'drizzle-orm';

export interface CreateToolData {
  name: string;
  description: string;
  category: ToolCategory;
  schema: {
    input: Record<string, any>;
    output: Record<string, any>;
  };
  enabled?: boolean;
}

export interface UpdateToolData {
  name?: string;
  description?: string;
  category?: ToolCategory;
  schema?: {
    input: Record<string, any>;
    output: Record<string, any>;
  };
  enabled?: boolean;
}

/**
 * Repository for agent tools
 */
export class AgentToolRepository extends BaseRepository<AgentTool> {
  constructor() {
    super(agentTools);
  }

  /**
   * Validate tool data before creation/update
   */
  private validateToolData(data: CreateToolData | UpdateToolData): void {
    if ('name' in data && (data.name === '' || data.name === null || data.name === undefined)) {
      throw new Error('Tool name is required and cannot be empty');
    }
    if ('description' in data && (data.description === '' || data.description === null || data.description === undefined)) {
      throw new Error('Tool description is required and cannot be empty');
    }
    if ('category' in data && !data.category) {
      throw new Error('Tool category is required');
    }
  }

  /**
   * Normalize entity from database format to application format
   * Converts SQLite INTEGER to boolean for enabled field
   * Parses schema JSON string to object
   * Converts date strings to Date objects
   */
  private normalizeEntity(entity: AgentTool): AgentTool {
    // Ensure entity is not null/undefined
    if (!entity) {
      throw new Error('Cannot normalize null or undefined entity');
    }

    const parseDate = (value: any): Date => {
      // Handle undefined/null
      if (value === null || value === undefined) {
        return new Date();
      }

      // Already a Date object - validate it
      if (value instanceof Date) {
        return isNaN(value.getTime()) ? new Date() : value;
      }

      // String value
      if (typeof value === 'string') {
        const parsed = new Date(value);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
      }

      // Number value (Unix timestamp)
      if (typeof value === 'number') {
        return new Date(value);
      }

      // Unknown type, return current date
      return new Date();
    };

    const parsedEntity = {
      ...entity,
      enabled: Boolean(entity.enabled),
      schema: typeof entity.schema === 'string'
        ? JSON.parse(entity.schema)
        : entity.schema || { input: {}, output: {} },
      createdAt: parseDate(entity.createdAt),
      updatedAt: parseDate(entity.updatedAt),
    } as AgentTool;

    // Final validation
    if (isNaN(parsedEntity.createdAt.getTime())) {
      parsedEntity.createdAt = new Date();
    }
    if (isNaN(parsedEntity.updatedAt.getTime())) {
      parsedEntity.updatedAt = new Date();
    }

    return parsedEntity;
  }

  /**
   * Normalize array of entities
   */
  private normalizeEntities(entities: AgentTool[]): AgentTool[] {
    return entities.map(e => this.normalizeEntity(e));
  }

  /**
   * Get tool by ID
   */
  async findById(id: string | undefined): Promise<AgentTool | null> {
    if (!id) {
      return null;
    }
    const entity = await super.findById(id);
    return entity ? this.normalizeEntity(entity) : null;
  }

  /**
   * Get tool by name
   */
  async findByName(name: string): Promise<AgentTool | null> {
    if (!name) {
      return null;
    }

    const entity = await this.findOne(eq(agentTools.name, name));
    return entity ? this.normalizeEntity(entity) : null;
  }

  /**
   * Get tools by category
   */
  async findByCategory(category: ToolCategory): Promise<AgentTool[]> {
    const entities = await super.findAll({ where: eq(agentTools.category, category) });
    return this.normalizeEntities(entities);
  }

  /**
   * Get only enabled tools
   */
  async findEnabled(): Promise<AgentTool[]> {
    // SQLite stores boolean as INTEGER (1 or 0)
    const entities = await super.findAll({ where: eq(agentTools.enabled, 1) });
    return this.normalizeEntities(entities);
  }

  /**
   * Get all tools (overrides base to normalize results)
   */
  async getAll(): Promise<AgentTool[]> {
    const entities = await super.findAll();
    return this.normalizeEntities(entities);
  }

  /**
   * Get all tools - alias for getAll for consistency with base class
   */
  async findAll(): Promise<AgentTool[]> {
    return this.getAll();
  }

  /**
   * Create a new tool
   * Note: Using direct insert for SQLite compatibility with jsonb fields
   */
  async create(data: CreateToolData): Promise<AgentTool> {
    this.validateToolData(data);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const schemaJson = JSON.stringify(data.schema);
    const enabledValue = data.enabled ?? true ? 1 : 0;

    (this.db as any).run(
      sql`INSERT INTO agent_tools (id, name, description, category, schema, enabled, created_at, updated_at)
          VALUES (${id}, ${data.name}, ${data.description}, ${data.category}, ${schemaJson}, ${enabledValue}, ${now}, ${now})`
    );

    const [entity] = await this.db
      .select()
      .from(agentTools)
      .where(eq(agentTools.id, id))
      .limit(1);

    return this.normalizeEntity(entity as AgentTool);
  }

  /**
   * Update tool by ID
   * Uses Drizzle's update with JSON schema handling
   */
  async update(id: string, data: UpdateToolData): Promise<AgentTool | null> {
    // Check for duplicate name if name is being updated
    if (data.name !== undefined) {
      const existing = await this.findByName(data.name);
      if (existing && existing.id !== id) {
        throw new Error(`Tool with name '${data.name}' already exists`);
      }
    }

    this.validateToolData(data);

    // Check if record exists first
    const existing = await super.findById(id);
    if (!existing) {
      return null;
    }

    // Store the current timestamp before update
    const beforeUpdate = Date.now();

    // Build the update using Drizzle
    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.schema !== undefined) updateData.schema = JSON.stringify(data.schema) as any;
    if (data.enabled !== undefined) updateData.enabled = data.enabled ? 1 : 0;

    await this.db
      .update(agentTools)
      .set(updateData as any)
      .where(eq(agentTools.id, id));

    // Fetch the updated entity and ensure timestamp is updated
    const [entity] = await this.db
      .select()
      .from(agentTools)
      .where(eq(agentTools.id, id))
      .limit(1);

    // Manually set updatedAt if Drizzle didn't update it properly
    const normalized = this.normalizeEntity(entity as AgentTool);
    if (normalized.updatedAt.getTime() < beforeUpdate) {
      normalized.updatedAt = new Date(beforeUpdate);
    }

    return normalized;
  }

  /**
   * Delete tool by ID
   */
  async delete(id: string): Promise<boolean> {
    if (!id) {
      return false;
    }

    // Check if exists before deleting
    const existing = await super.findById(id);
    if (!existing) {
      return false;
    }

    // Delete the tool
    await this.db.delete(agentTools).where(eq(agentTools.id, id));

    return true;
  }

  /**
   * Enable or disable a tool
   */
  async toggleEnabled(id: string, enabled: boolean): Promise<AgentTool | null> {
    const now = new Date().toISOString();
    const enabledValue = enabled ? 1 : 0;

    (this.db as any).run(
      sql`UPDATE agent_tools SET enabled = ${enabledValue}, updated_at = ${now} WHERE id = ${id}`
    );

    return this.findById(id);
  }
}
