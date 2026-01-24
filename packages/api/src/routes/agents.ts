/**
 * Agents API Routes
 *
 * API endpoints for agent execution, tool management, and SSE streaming
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { AgentOrchestrator } from '../services/agents';
import { AgentExecutionRepository } from '../repositories/agent-execution.repository';
import { ToolRegistry } from '../tools/registry';
import type { AgentType, AgentState } from '@agistack/shared/types/agent';

export const agentsRouter = new Hono();

// Initialize repositories and services
export const agentExecutionRepository = new AgentExecutionRepository();
export const toolRegistry = new ToolRegistry();
let orchestratorInstance: AgentOrchestrator | null = null;

/**
 * Get or create orchestrator instance
 */
function getOrchestrator(): AgentOrchestrator {
  if (!orchestratorInstance) {
    // Import AI provider dynamically to avoid circular dependencies
    const { createProvider } = require('../services/ai/index');
    const aiProvider = createProvider({
      type: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: 'claude-3-5-sonnet-20241022',
    });
    orchestratorInstance = new AgentOrchestrator(aiProvider, toolRegistry);
  }
  return orchestratorInstance;
}

/**
 * Validation Schemas
 */
const agentTypeEnum = z.enum(['build', 'plan', 'general']) as z.ZodType<AgentType>;
const agentStateEnum = z.enum(['idle', 'thinking', 'planning', 'executing', 'waiting', 'completed', 'error']) as z.ZodType<AgentState>;

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  toolCalls: z.array(z.object({
    id: z.string(),
    name: z.string(),
    arguments: z.record(z.any()),
  })).optional(),
  toolCallId: z.string().optional(),
});

const AgentCapabilitiesSchema = z.object({
  canReadFiles: z.boolean(),
  canWriteFiles: z.boolean(),
  canExecuteCommands: z.boolean(),
  canSearchCode: z.boolean(),
  canUseLSP: z.boolean(),
  canUseMCP: z.boolean(),
});

const PermissionSchema = z.object({
  resourceType: z.enum(['file', 'directory', 'command']),
  pattern: z.string(),
  action: z.enum(['allow', 'deny', 'ask']),
});

const AgentConfigSchema = z.object({
  type: agentTypeEnum,
  state: agentStateEnum,
  capabilities: AgentCapabilitiesSchema,
  permissions: z.array(PermissionSchema),
  maxTokens: z.number().optional(),
  temperature: z.number().optional(),
});

const ExecuteAgentSchema = z.object({
  agentType: agentTypeEnum,
  messages: z.array(ChatMessageSchema).min(1, 'At least one message is required'),
  config: AgentConfigSchema,
  options: z.object({
    maxTokens: z.number().int().positive().optional(),
    temperature: z.number().min(0).max(2).optional(),
    stream: z.boolean().optional(),
  }).optional(),
});

const StreamAgentSchema = z.object({
  agentType: agentTypeEnum,
  message: z.string().min(1, 'Message is required'),
  config: AgentConfigSchema.partial(),
});

const ExecuteToolSchema = z.object({
  arguments: z.record(z.any()),
});

const ListExecutionsQuerySchema = z.object({
  agentType: agentTypeEnum.optional(),
  state: agentStateEnum.optional(),
  sessionId: z.string().optional(),
  limit: z.string().optional().transform((val) => {
    if (!val) return 50;
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 100) return 50;
    return parsed;
  }),
  offset: z.string().optional().transform((val) => {
    if (!val) return 0;
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed < 0) return 0;
    return parsed;
  }),
});

const ListToolsQuerySchema = z.object({
  category: z.enum(['file', 'code', 'command', 'search', 'ai', 'system']).optional(),
  dangerous: z.string().optional().transform((val) => {
    if (!val) return undefined;
    if (val === 'true') return true;
    if (val === 'false') return false;
    return undefined;
  }),
});

/**
 * POST /api/agents/execute
 * Execute an agent with the given messages and configuration
 */
agentsRouter.post('/execute', zValidator('json', ExecuteAgentSchema), async (c) => {
  try {
    const { agentType, messages, config, options } = c.req.valid('json');
    const orchestrator = getOrchestrator();

    // Create execution record
    const execution = await agentExecutionRepository.create({
      sessionId: config.sessionId || 'default',
      agentType,
      state: 'thinking',
      inputPrompt: messages[messages.length - 1].content,
    });

    // Execute agent
    const result = await orchestrator.executeAgent(agentType, messages, config, options);

    // Update execution record
    await agentExecutionRepository.complete(execution.id, {
      outputSummary: result.content.substring(0, 500),
      tokensUsed: {
        input: result.usage.inputTokens,
        output: result.usage.outputTokens,
        total: result.usage.totalTokens,
      },
    });

    return c.json({
      success: true,
      data: {
        executionId: execution.id,
        ...result,
      },
    });
  } catch (error) {
    console.error('Agent execution error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Agent execution failed',
    }, 500);
  }
});

/**
 * GET /api/agents/stream
 * Stream agent responses via Server-Sent Events (SSE)
 */
agentsRouter.get('/stream', zValidator('query', StreamAgentSchema), async (c) => {
  const { agentType, message, config } = c.req.valid('query');
  const orchestrator = getOrchestrator();

  // Create execution record
  const execution = await agentExecutionRepository.create({
    sessionId: config?.sessionId || 'default',
    agentType,
    state: 'thinking',
    inputPrompt: message,
  });

  // Set SSE headers
  return c.streamText(async (stream) => {
    try {
      const messages = [{ role: 'user' as const, content: message }];
      const agentConfig = config || {
        type: agentType,
        state: 'idle' as const,
        capabilities: {
          canReadFiles: true,
          canWriteFiles: true,
          canExecuteCommands: false,
          canSearchCode: true,
          canUseLSP: false,
          canUseMCP: false,
        },
        permissions: [],
      };

      // Stream agent responses
      for await (const chunk of orchestrator.streamAgent(agentType, messages, agentConfig)) {
        // Send SSE event
        await stream.write(`event: message\n`);
        await stream.write(`data: ${JSON.stringify({
          executionId: execution.id,
          content: chunk.content,
          done: chunk.done,
          state: chunk.state,
          toolCalls: chunk.toolCalls,
        })}\n\n`);
      }

      // Send completion event
      await stream.write(`event: completed\n`);
      await stream.write(`data: ${JSON.stringify({
        executionId: execution.id,
        done: true,
      })}\n\n`);

      // Update execution record
      await agentExecutionRepository.complete(execution.id, {
        outputSummary: 'Streaming completed',
      });
    } catch (error) {
      console.error('Agent streaming error:', error);
      await stream.write(`event: error\n`);
      await stream.write(`data: ${JSON.stringify({
        error: error instanceof Error ? error.message : 'Streaming failed',
      })}\n\n`);
    }
  });
});

/**
 * GET /api/agents/tools
 * List available tools
 */
agentsRouter.get('/tools', zValidator('query', ListToolsQuerySchema), async (c) => {
  try {
    const { category, dangerous } = c.req.valid('query');

    let tools = toolRegistry.getEnabled();

    // Filter by category
    if (category) {
      tools = tools.filter((tool: any) => tool.category === category);
    }

    // Filter by dangerous flag
    if (dangerous !== undefined) {
      tools = tools.filter((tool: any) => tool.dangerous === dangerous);
    }

    return c.json({
      success: true,
      data: {
        tools: tools.map((tool: any) => ({
          name: tool.name,
          description: tool.description,
          category: tool.category,
          dangerous: tool.dangerous,
          metadata: tool.metadata,
        })),
        meta: {
          total: tools.length,
          filteredBy: { category, dangerous },
        },
      },
    });
  } catch (error) {
    console.error('List tools error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list tools',
    }, 500);
  }
});

/**
 * POST /api/agents/tools/:toolName
 * Execute a specific tool
 */
agentsRouter.post('/tools/:toolName', zValidator('json', ExecuteToolSchema), async (c) => {
  try {
    const { toolName } = c.req.param();
    const { arguments: toolArgs } = c.req.valid('json');

    const tool = toolRegistry.get(toolName);

    if (!tool) {
      return c.json({
        success: false,
        error: `Tool '${toolName}' not found`,
      }, 404);
    }

    // Check if tool is dangerous
    if (tool.dangerous) {
      return c.json({
        success: false,
        error: `Tool '${toolName}' is dangerous and requires explicit approval`,
      }, 403);
    }

    // Execute tool
    const result = await tool.handler(toolArgs);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Tool execution error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Tool execution failed',
    }, 500);
  }
});

/**
 * GET /api/agents/executions
 * List agent executions
 */
agentsRouter.get('/executions', zValidator('query', ListExecutionsQuerySchema), async (c) => {
  try {
    const { agentType, state, sessionId, limit, offset } = c.req.valid('query');

    const executions = await agentExecutionRepository.findAll({
      agentType,
      state,
      sessionId,
      limit,
      offset,
    });

    const total = await agentExecutionRepository.count({
      agentType,
      state,
      sessionId,
    });

    return c.json({
      success: true,
      data: {
        executions,
        meta: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  } catch (error) {
    console.error('List executions error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list executions',
    }, 500);
  }
});

/**
 * GET /api/agents/executions/:id
 * Get execution details
 */
agentsRouter.get('/executions/:id', async (c) => {
  try {
    const { id } = c.req.param();

    const execution = await agentExecutionRepository.findById(id);

    if (!execution) {
      return c.json({
        success: false,
        error: `Execution '${id}' not found`,
      }, 404);
    }

    // Get execution steps if available
    const steps = await agentExecutionRepository.getSteps(id);

    return c.json({
      success: true,
      data: {
        execution,
        steps,
      },
    });
  } catch (error) {
    console.error('Get execution error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get execution',
    }, 500);
  }
});

/**
 * DELETE /api/agents/executions/:id
 * Cancel or delete an execution
 */
agentsRouter.delete('/executions/:id', async (c) => {
  try {
    const { id } = c.req.param();

    const execution = await agentExecutionRepository.findById(id);

    if (!execution) {
      return c.json({
        success: false,
        error: `Execution '${id}' not found`,
      }, 404);
    }

    // Only allow cancellation of running executions
    if (execution.state === 'thinking' || execution.state === 'executing' || execution.state === 'planning') {
      await agentExecutionRepository.update(id, {
        state: 'error',
      });

      return c.json({
        success: true,
        data: {
          message: 'Execution cancelled',
          executionId: id,
        },
      });
    }

    // For completed executions, just delete them
    await agentExecutionRepository.delete(id);

    return c.json({
      success: true,
      data: {
        message: 'Execution deleted',
        executionId: id,
      },
    });
  } catch (error) {
    console.error('Cancel execution error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel execution',
    }, 500);
  }
});
