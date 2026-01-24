/**
 * Agent API Client
 *
 * Client for agent API endpoints with SSE streaming support
 */

import { ApiClient } from './client';
import type { AgentApiRequest, AgentStreamChunk, ToolInfo, ExecutionList, ExecutionDetails } from './agent-api.types';

export interface AgentApiConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  getToken?: () => string | null;
}

export class AgentApi {
  private client: ApiClient;
  private baseURL: string;
  private getToken?: () => string | null;

  constructor(config: AgentApiConfig);
  constructor(baseURL: string, authToken: string);
  constructor(configOrBaseURL: AgentApiConfig | string, authToken?: string) {
    if (typeof configOrBaseURL === 'string') {
      // Legacy constructor: new AgentApi(baseURL, authToken)
      this.baseURL = configOrBaseURL;
      this.getToken = () => authToken;
      this.client = new ApiClient({
        baseURL: configOrBaseURL,
        timeout: 30000,
        retries: 2,
        getToken: () => authToken,
      });
    } else {
      // New constructor: new AgentApi({ baseURL, getToken, ... })
      this.baseURL = configOrBaseURL.baseURL;
      this.getToken = configOrBaseURL.getToken;
      this.client = new ApiClient({
        baseURL: configOrBaseURL.baseURL,
        timeout: configOrBaseURL.timeout || 30000,
        retries: configOrBaseURL.retries || 2,
        getToken: configOrBaseURL.getToken,
      });
    }
  }

  /**
   * Execute an agent with the given request
   */
  async executeAgent(request: AgentApiRequest): Promise<any> {
    const response = await this.client.request('/api/agents/execute', {
      method: 'POST',
      body: request,
    });

    if (!response.success) {
      throw new Error(response.error || 'Agent execution failed');
    }

    return response.data;
  }

  /**
   * Stream agent responses via SSE
   * Returns an async generator that yields stream chunks
   */
  async *streamAgent(agentType: string, message: string, config?: any): AsyncIterable<AgentStreamChunk> {
    const url = new URL(`${this.baseURL}/api/agents/stream`);
    url.searchParams.set('agentType', agentType);
    url.searchParams.set('message', message);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'text/event-stream',
        ...(this.getToken?.() && {
          Authorization: `Bearer ${this.getToken!()}`,
        }),
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Stream request failed');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last incomplete line in the buffer
        const completeLines = lines.slice(0, -1);
        buffer = lines[lines.length - 1] || '';

        for (const line of completeLines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data.trim()) {
              try {
                const chunk = JSON.parse(data);
                yield chunk;
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Get list of available tools
   */
  async getTools(filters?: {
    category?: string;
    dangerous?: boolean;
  }): Promise<{ tools: ToolInfo[]; meta?: any }> {
    const params: Record<string, string> = {};
    if (filters?.category) params.category = filters.category;
    if (filters?.dangerous !== undefined) params.dangerous = String(filters.dangerous);

    const response = await this.client.request('/api/agents/tools', {
      method: 'GET',
      params,
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to get tools');
    }

    return response.data;
  }

  /**
   * Execute a specific tool
   */
  async executeTool(toolName: string, args: Record<string, unknown>): Promise<any> {
    const response = await this.client.request(`/api/agents/tools/${toolName}`, {
      method: 'POST',
      body: { arguments: args },
    });

    if (!response.success) {
      throw new Error(response.error || 'Tool execution failed');
    }

    return response.data;
  }

  /**
   * Get list of agent executions
   */
  async getExecutions(options?: {
    limit?: number;
    offset?: number;
    agentType?: string;
    state?: string;
    sessionId?: string;
  }): Promise<ExecutionList> {
    const params: Record<string, string> = {};
    if (options?.limit) params.limit = String(options.limit);
    if (options?.offset) params.offset = String(options.offset);
    if (options?.agentType) params.agentType = options.agentType;
    if (options?.state) params.state = options.state;
    if (options?.sessionId) params.sessionId = options.sessionId;

    const response = await this.client.request('/api/agents/executions', {
      method: 'GET',
      params,
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to get executions');
    }

    return response.data;
  }

  /**
   * Get details for a specific execution
   */
  async getExecutionDetails(executionId: string): Promise<ExecutionDetails> {
    const response = await this.client.request(`/api/agents/executions/${executionId}`, {
      method: 'GET',
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to get execution details');
    }

    return response.data;
  }

  /**
   * Cancel a running execution
   */
  async cancelExecution(executionId: string): Promise<{ message: string; executionId: string }> {
    const response = await this.client.request(`/api/agents/executions/${executionId}`, {
      method: 'DELETE',
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to cancel execution');
    }

    return response.data;
  }
}

/**
 * Re-export types
 */
export type { AgentApiRequest, AgentStreamChunk, ToolInfo, ExecutionList, ExecutionDetails } from './agent-api.types';
