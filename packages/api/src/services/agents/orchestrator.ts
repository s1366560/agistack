/**
 * Agent Orchestrator
 *
 * Manages agent lifecycle, delegation, and collaboration
 * Supports multiple agent types with tool calling and streaming
 */

import type { AIProvider } from '../ai';
import type { ChatMessage, CompletionResponse, CompletionOptions, ToolCall } from '../ai';
import type {
  AgentExecutionResult,
  AgentExecutionContext,
  DelegationRequest,
  DelegationResult,
  ExecutionStep,
  OrchestratorConfig,
  ToolExecutionResult,
  AgentStreamChunk,
} from './orchestrator.types';
import type { AgentType, AgentState } from '@agistack/shared/types/agent';

/**
 * Default orchestrator configuration
 */
const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  maxDelegationDepth: 5,
  maxToolCallsPerExecution: 10,
  maxExecutionTime: 300000, // 5 minutes
  enableParallelToolCalls: true,
  defaultMaxTokens: 4096,
  defaultTemperature: 0.7,
};

/**
 * Agent Orchestrator Class
 *
 * Manages agent execution, delegation, and tool calling
 */
export class AgentOrchestrator {
  private aiProvider: AIProvider;
  private toolRegistry: any;
  private config: OrchestratorConfig;
  private stateChangeCallbacks: ((state: AgentState) => void)[] = [];

  constructor(aiProvider: AIProvider, toolRegistry: any, config?: Partial<OrchestratorConfig>) {
    this.aiProvider = aiProvider;
    this.toolRegistry = toolRegistry;
    this.config = { ...DEFAULT_ORCHESTRATOR_CONFIG, ...config };
  }

  /**
   * Execute an agent with the given messages and configuration
   */
  async executeAgent(
    agentType: AgentType,
    messages: ChatMessage[],
    agentConfig: any,
    options?: CompletionOptions
  ): Promise<AgentExecutionResult> {
    const context: AgentExecutionContext = {
      sessionId: this.generateSessionId(),
      agentType,
      messages: [...messages],
      config: agentConfig,
      currentStep: 0,
      maxSteps: this.config.maxToolCallsPerExecution,
      visitedAgents: [agentType],
    };

    this.updateState('thinking');

    const steps: ExecutionStep[] = [];
    let totalTokens = { input: 0, output: 0, total: 0 };

    try {
      // Execute agent loop
      while (context.currentStep < context.maxSteps!) {
        context.currentStep++;

        // Prepare completion options
        const completionOptions: CompletionOptions = {
          maxTokens: agentConfig.maxTokens || this.config.defaultMaxTokens,
          temperature: agentConfig.temperature || this.config.defaultTemperature,
          ...options,
        };

        // Add tools if available
        const availableTools = this.getAvailableTools(agentConfig);
        if (availableTools.length > 0) {
          completionOptions.tools = availableTools;
        }

        // Get AI response
        const response = await this.aiProvider.complete(context.messages, completionOptions);

        // Accumulate token usage
        totalTokens.input += response.usage.inputTokens;
        totalTokens.output += response.usage.outputTokens;
        totalTokens.total += response.usage.totalTokens;

        // Check for delegation requests
        const delegationCall = this.findDelegationCall(response.toolCalls);
        if (delegationCall) {
          this.updateState('planning');
          const delegationStep: ExecutionStep = {
            type: 'delegation',
            description: `Delegating to ${delegationCall.arguments.agentType} agent`,
            timestamp: new Date(),
            metadata: delegationCall.arguments,
            agentType: delegationCall.arguments.agentType,
          };
          steps.push(delegationStep);

          // Check delegation depth
          if (context.visitedAgents.length >= this.config.maxDelegationDepth) {
            throw new Error(`Max delegation depth ${this.config.maxDelegationDepth} exceeded`);
          }

          // Prevent circular delegation
          if (context.visitedAgents.includes(delegationCall.arguments.agentType)) {
            throw new Error(
              `Circular delegation detected: ${context.visitedAgents.join(' -> ')} -> ${delegationCall.arguments.agentType}`
            );
          }

          // Execute delegation
          const delegationResult = await this.delegate(
            delegationCall.arguments,
            context,
            response
          );

          // Add delegation result to messages
          context.messages.push({
            role: 'tool',
            content: JSON.stringify(delegationResult),
            toolCallId: delegationCall.id,
          });

          context.visitedAgents.push(delegationCall.arguments.agentType);
          if (context.parentAgent) {
            context.visitedAgents.push(context.parentAgent);
          }
          continue;
        }

        // Check for tool calls
        if (response.toolCalls && response.toolCalls.length > 0) {
          this.updateState('executing');

          for (const toolCall of response.toolCalls) {
            const toolStep: ExecutionStep = {
              type: 'tool_call',
              description: `Calling tool: ${toolCall.name}`,
              timestamp: new Date(),
              metadata: toolCall.arguments,
              toolName: toolCall.name,
            };
            steps.push(toolStep);

            // Execute tool
            const toolResult = await this.executeTool(toolCall, agentConfig);

            // Add tool result to messages
            context.messages.push({
              role: 'tool',
              content: JSON.stringify(toolResult),
              toolCallId: toolCall.id,
            });

            // Add step for tool result
            if (!toolResult.success) {
              const errorStep: ExecutionStep = {
                type: 'error',
                description: `Tool ${toolCall.name} failed: ${toolResult.error}`,
                timestamp: new Date(),
                metadata: { toolName: toolCall.name, error: toolResult.error },
              };
              steps.push(errorStep);
            }
          }

          // Continue loop to get final response after tool execution
          continue;
        }

        // No tool calls or delegation - we're done
        this.updateState('completed');
        const completionStep: ExecutionStep = {
          type: 'completion',
          description: 'Agent execution completed',
          timestamp: new Date(),
        };
        steps.push(completionStep);

        return {
          content: response.content,
          toolCalls: response.toolCalls,
          usage: {
            inputTokens: totalTokens.input,
            outputTokens: totalTokens.output,
            totalTokens: totalTokens.total,
          },
          state: 'completed',
          model: response.model,
          steps,
        };
      }

      // Max steps reached
      this.updateState('completed');
      return {
        content: 'Maximum execution steps reached',
        usage: {
          inputTokens: totalTokens.input,
          outputTokens: totalTokens.output,
          totalTokens: totalTokens.total,
        },
        state: 'completed',
        model: this.aiProvider.model,
        steps,
      };
    } catch (error) {
      this.updateState('error');
      const errorStep: ExecutionStep = {
        type: 'error',
        description: `Execution error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
      };
      steps.push(errorStep);

      throw error;
    }
  }

  /**
   * Stream agent execution
   */
  async *streamAgent(
    agentType: AgentType,
    messages: ChatMessage[],
    agentConfig: any,
    options?: CompletionOptions
  ): AsyncIterable<AgentStreamChunk> {
    const completionOptions: CompletionOptions = {
      maxTokens: agentConfig.maxTokens || this.config.defaultMaxTokens,
      temperature: agentConfig.temperature || this.config.defaultTemperature,
      ...options,
    };

    const availableTools = this.getAvailableTools(agentConfig);
    if (availableTools.length > 0) {
      completionOptions.tools = availableTools;
    }

    this.updateState('thinking');

    for await (const chunk of this.aiProvider.stream(messages, completionOptions)) {
      yield {
        ...chunk,
        state: 'executing',
      };
    }

    this.updateState('completed');
  }

  /**
   * Delegate task to another agent
   */
  private async delegate(
    delegation: DelegationRequest,
    context: AgentExecutionContext,
    originalResponse: CompletionResponse
  ): Promise<DelegationResult> {
    const delegatedMessages: ChatMessage[] = [
      {
        role: 'user',
        content: `Task: ${delegation.task}\n${delegation.context || ''}`,
      },
    ];

    const delegatedConfig = {
      ...context.config,
      type: delegation.agentType,
    };

    // Execute delegated agent
    const result = await this.executeAgent(
      delegation.agentType,
      delegatedMessages,
      delegatedConfig
    );

    return {
      success: true,
      content: result.content,
      delegatedTo: delegation.agentType,
      usage: result.usage,
    };
  }

  /**
   * Execute a tool call
   */
  private async executeTool(toolCall: ToolCall, agentConfig: any): Promise<ToolExecutionResult> {
    const tool = this.toolRegistry.get(toolCall.name);

    if (!tool) {
      return {
        success: false,
        error: `Tool ${toolCall.name} not found`,
        toolName: toolCall.name,
      };
    }

    // Check permissions
    if (!this.checkToolPermission(toolCall.name, agentConfig)) {
      return {
        success: false,
        error: `Tool ${toolCall.name} not allowed by agent permissions`,
        toolName: toolCall.name,
      };
    }

    try {
      const startTime = Date.now();
      const result = await tool.handler(toolCall.arguments);
      const duration = Date.now() - startTime;

      return {
        success: result.success,
        data: result.data,
        error: result.error,
        toolName: toolCall.name,
        duration,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        toolName: toolCall.name,
      };
    }
  }

  /**
   * Get available tools for agent
   */
  private getAvailableTools(agentConfig: any): any[] {
    const tools = this.toolRegistry.getEnabled();
    return tools.filter((tool: any) => this.checkToolPermission(tool.name, agentConfig));
  }

  /**
   * Check if agent has permission to use tool
   */
  private checkToolPermission(toolName: string, agentConfig: any): boolean {
    // If no permissions specified, allow all
    if (!agentConfig.permissions || agentConfig.permissions.length === 0) {
      return true;
    }

    // Check if tool is explicitly allowed
    const allowed = agentConfig.permissions.some(
      (perm: any) => perm.action === 'allow' && this.matchesPattern(toolName, perm.pattern)
    );

    // Check if tool is explicitly denied
    const denied = agentConfig.permissions.some(
      (perm: any) => perm.action === 'deny' && this.matchesPattern(toolName, perm.pattern)
    );

    return allowed && !denied;
  }

  /**
   * Check if tool name matches permission pattern
   */
  private matchesPattern(toolName: string, pattern: string): boolean {
    // Simple glob pattern matching
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(toolName);
  }

  /**
   * Find delegation call in tool calls
   */
  private findDelegationCall(toolCalls?: ToolCall[]): ToolCall | undefined {
    return toolCalls?.find(call => call.name === 'delegate');
  }

  /**
   * Update agent state
   */
  private updateState(state: AgentState): void {
    this.stateChangeCallbacks.forEach(callback => callback(state));
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: (state: AgentState) => void): void {
    this.stateChangeCallbacks.push(callback);
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
