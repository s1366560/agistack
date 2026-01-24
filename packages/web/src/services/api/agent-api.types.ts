/**
 * Agent API Types
 *
 * Type definitions for agent API client
 */

/**
 * Agent types
 */
export type AgentType = 'build' | 'plan' | 'general';

/**
 * Agent execution request
 */
export interface AgentApiRequest {
  agentType: AgentType;
  messages: Array<{
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    toolCalls?: Array<{
      id: string;
      name: string;
      arguments: Record<string, unknown>;
    }>;
    toolCallId?: string;
  }>;
  config: {
    type: AgentType;
    state: 'idle' | 'thinking' | 'planning' | 'executing' | 'waiting' | 'completed' | 'error';
    capabilities: {
      canReadFiles: boolean;
      canWriteFiles: boolean;
      canExecuteCommands: boolean;
      canSearchCode: boolean;
      canUseLSP: boolean;
      canUseMCP: boolean;
    };
    permissions: Array<{
      resourceType: 'file' | 'directory' | 'command';
      pattern: string;
      action: 'allow' | 'deny' | 'ask';
    }>;
    maxTokens?: number;
    temperature?: number;
  };
  options?: {
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
  };
}

/**
 * Stream chunk from agent SSE stream
 */
export interface AgentStreamChunk {
  executionId: string;
  content: string;
  done: boolean;
  state?: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  error?: string;
}

/**
 * Tool information
 */
export interface ToolInfo {
  name: string;
  description: string;
  category: string;
  dangerous: boolean;
  metadata?: {
    version?: string;
    author?: string;
    tags?: string[];
  };
}

/**
 * Execution list response
 */
export interface ExecutionList {
  executions: Array<{
    id: string;
    sessionId: string;
    agentType: AgentType;
    state: string;
    inputPrompt: string;
    outputSummary?: string;
    startedAt: string;
    completedAt?: string;
    tokensUsed: {
      input: number;
      output: number;
      total: number;
    };
  }>;
  meta: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Execution details response
 */
export interface ExecutionDetails {
  execution: {
    id: string;
    sessionId: string;
    agentType: AgentType;
    state: string;
    inputPrompt: string;
    outputSummary?: string;
    startedAt: string;
    completedAt?: string;
    tokensUsed: {
      input: number;
      output: number;
      total: number;
    };
  };
  steps: Array<{
    type: string;
    description: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
  }>;
}
