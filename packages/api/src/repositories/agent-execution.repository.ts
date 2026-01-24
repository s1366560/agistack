/**
 * Agent Execution Repository
 *
 * Manages agent execution records with state tracking and lifecycle management
 */

import { BaseRepository } from './base';
import { agentExecutions, type AgentExecution, type NewAgentExecution, AgentState } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

export interface CreateExecutionData {
  sessionId: string;
  agentType: 'build' | 'plan' | 'general';
  state: AgentState;
  inputPrompt: string;
}

export interface CompleteExecutionData {
  outputSummary?: string;
  tokensUsed?: {
    input: number;
    output: number;
    total: number;
  };
  durationMs?: number;
}

export interface ExecutionStep {
  type: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Repository for agent executions
 */
export class AgentExecutionRepository extends BaseRepository<AgentExecution> {
  constructor() {
    super(agentExecutions);
  }

  /**
   * Create a new agent execution
   */
  async create(data: CreateExecutionData): Promise<AgentExecution> {
    const newExecution: NewAgentExecution = {
      sessionId: data.sessionId,
      agentType: data.agentType,
      state: data.state,
      inputPrompt: data.inputPrompt,
      steps: [],
      startedAt: new Date(),
      tokensUsed: { input: 0, output: 0, total: 0 },
    };

    return super.create(newExecution as any);
  }

  /**
   * Update execution state
   */
  async updateState(id: string, state: AgentState): Promise<AgentExecution | null> {
    return this.update(id, { state });
  }

  /**
   * Add a step to execution
   */
  async addStep(id: string, step: ExecutionStep): Promise<AgentExecution | null> {
    const execution = await this.findById(id);

    if (!execution) {
      return null;
    }

    const updatedSteps = [...(execution.steps || []), step];

    return this.update(id, { steps: updatedSteps as any });
  }

  /**
   * Mark execution as completed
   */
  async complete(id: string, data: CompleteExecutionData): Promise<AgentExecution | null> {
    return this.update(id, {
      state: 'completed',
      outputSummary: data.outputSummary,
      tokensUsed: data.tokensUsed,
      durationMs: data.durationMs,
      completedAt: new Date(),
    });
  }

  /**
   * Mark execution as failed
   */
  async fail(id: string, errorMessage: string): Promise<AgentExecution | null> {
    return this.update(id, {
      state: 'error',
      errorMessage,
      completedAt: new Date(),
    });
  }

  /**
   * Find all executions for a session
   */
  async findBySession(sessionId: string): Promise<AgentExecution[]> {
    return this.findAll({
      where: eq(agentExecutions.sessionId, sessionId),
      orderBy: desc(agentExecutions.startedAt),
    });
  }

  /**
   * Find active (non-completed) execution for a session
   */
  async findActive(sessionId: string): Promise<AgentExecution | null> {
    const executions = await this.findAll({
      where: eq(agentExecutions.sessionId, sessionId),
      orderBy: desc(agentExecutions.startedAt),
    });

    // Return the most recent execution that is not completed or error
    return (
      executions.find(
        (e) => e.state !== 'completed' && e.state !== 'error'
      ) || null
    );
  }

  /**
   * Count executions with optional filters
   */
  async count(filters?: {
    agentType?: 'build' | 'plan' | 'general';
    state?: AgentState;
    sessionId?: string;
  }): Promise<number> {
    // For now, return count from findAll
    // In production, this should use a COUNT query
    const executions = await this.findAll({
      where: filters?.sessionId ? eq(agentExecutions.sessionId, filters.sessionId) : undefined,
      orderBy: desc(agentExecutions.startedAt),
    });

    return executions.length;
  }

  /**
   * Get steps for an execution
   */
  async getSteps(id: string): Promise<ExecutionStep[]> {
    const execution = await this.findById(id);
    return execution?.steps || [];
  }
}
