/**
 * Agent Tool Usage Repository
 *
 * Manages tool usage tracking for agent executions
 */

import { BaseRepository } from './base';
import {
  agentToolUsage,
  type AgentToolUsage,
  type NewAgentToolUsage,
} from '../db/schema';
import { eq, sql, asc } from 'drizzle-orm';

export interface CreateUsageData {
  executionId: string;
  toolName: string;
  arguments?: Record<string, any> | null;
  result?: string | null;
  durationMs?: number | null;
  success: boolean;
  errorMessage?: string | null;
}

/**
 * Repository for agent tool usage tracking
 */
export class AgentToolUsageRepository extends BaseRepository<AgentToolUsage> {
  constructor() {
    super(agentToolUsage);
  }

  /**
   * Validate usage data before creation
   */
  private validateUsageData(data: CreateUsageData): void {
    if (!data.executionId || data.executionId === '') {
      throw new Error('Execution ID is required');
    }
    if (!data.toolName || data.toolName === '') {
      throw new Error('Tool name is required');
    }
    if (data.success === undefined || data.success === null) {
      throw new Error('Success flag is required');
    }
  }

  /**
   * Normalize entity from database format to application format
   * Parses JSON strings for arguments
   * Converts date strings to Date objects
   */
  private normalizeEntity(entity: AgentToolUsage): AgentToolUsage {
    if (!entity) {
      throw new Error('Cannot normalize null or undefined entity');
    }

    const parseDate = (value: any): Date => {
      if (value === null || value === undefined) {
        return new Date();
      }
      if (value instanceof Date) {
        return isNaN(value.getTime()) ? new Date() : value;
      }
      if (typeof value === 'string') {
        const parsed = new Date(value);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
      }
      if (typeof value === 'number') {
        return new Date(value);
      }
      return new Date();
    };

    const parseJson = (value: any): any => {
      if (value === null || value === undefined) {
        return null;
      }
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    };

    const parsedEntity = {
      ...entity,
      arguments: parseJson(entity.arguments),
      result: entity.result,
      durationMs: entity.durationMs,
      success: Boolean(entity.success),
      errorMessage: entity.errorMessage,
      createdAt: parseDate(entity.createdAt),
    } as AgentToolUsage;

    if (isNaN(parsedEntity.createdAt.getTime())) {
      parsedEntity.createdAt = new Date();
    }

    return parsedEntity;
  }

  /**
   * Normalize array of entities
   */
  private normalizeEntities(entities: AgentToolUsage[]): AgentToolUsage[] {
    return entities.map(e => this.normalizeEntity(e));
  }

  /**
   * Get usage record by ID
   */
  async findById(id: string | undefined): Promise<AgentToolUsage | null> {
    if (!id) {
      return null;
    }
    const entity = await super.findById(id);
    return entity ? this.normalizeEntity(entity) : null;
  }

  /**
   * Get all usage records for an execution
   */
  async findByExecution(executionId: string): Promise<AgentToolUsage[]> {
    const entities = await super.findAll({
      where: eq(agentToolUsage.executionId, executionId),
      orderBy: asc(agentToolUsage.createdAt),
    });
    return this.normalizeEntities(entities);
  }

  /**
   * Create a new usage record
   * Note: Using direct insert for SQLite compatibility with json fields
   */
  async create(data: CreateUsageData): Promise<AgentToolUsage> {
    this.validateUsageData(data);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const argsJson = data.arguments !== undefined && data.arguments !== null
      ? JSON.stringify(data.arguments)
      : null;

    (this.db as any).run(
      sql`INSERT INTO agent_tool_usage (id, execution_id, tool_name, arguments, result, duration_ms, success, error_message, created_at)
          VALUES (${id}, ${data.executionId}, ${data.toolName}, ${argsJson}, ${data.result ?? null}, ${data.durationMs ?? null}, ${data.success ? 1 : 0}, ${data.errorMessage ?? null}, ${now})`
    );

    const [entity] = await this.db
      .select()
      .from(agentToolUsage)
      .where(eq(agentToolUsage.id, id))
      .limit(1);

    return this.normalizeEntity(entity as AgentToolUsage);
  }
}
