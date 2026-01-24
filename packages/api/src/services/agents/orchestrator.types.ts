/**
 * Agent Orchestrator Types
 *
 * Type definitions for agent orchestration and collaboration
 */

import { z } from 'zod';
import type { AgentType, AgentState } from '@agistack/shared/types/agent';
import type { ChatMessage, CompletionResponse, ToolCall } from '../ai';

/**
 * Agent execution result
 */
export interface AgentExecutionResult {
  content: string;
  toolCalls?: ToolCall[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  state: AgentState;
  model: string;
  steps?: ExecutionStep[];
}

/**
 * Execution step for tracking agent progress
 */
export interface ExecutionStep {
  type: 'thinking' | 'tool_call' | 'delegation' | 'error' | 'completion';
  description: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  agentType?: AgentType;
  toolName?: string;
}

/**
 * Delegation request from one agent to another
 */
export interface DelegationRequest {
  agentType: AgentType;
  task: string;
  context?: string;
  permissions?: string[];
}

/**
 * Delegation result
 */
export interface DelegationResult {
  success: boolean;
  content: string;
  delegatedTo: AgentType;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  toolName: string;
  duration?: number;
}

/**
 * Agent execution context
 */
export interface AgentExecutionContext {
  sessionId: string;
  agentType: AgentType;
  messages: ChatMessage[];
  config: any; // AgentConfig from shared types
  currentStep: number;
  maxSteps?: number;
  visitedAgents: AgentType[];
  parentAgent?: AgentType;
}

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  maxDelegationDepth: number;
  maxToolCallsPerExecution: number;
  maxExecutionTime: number; // in milliseconds
  enableParallelToolCalls: boolean;
  defaultMaxTokens: number;
  defaultTemperature: number;
}

/**
 * Stream chunk from agent
 */
export interface AgentStreamChunk {
  content: string;
  done: boolean;
  toolCalls?: ToolCall[];
  state?: AgentState;
  step?: ExecutionStep;
}
