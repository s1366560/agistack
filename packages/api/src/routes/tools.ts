import { Hono } from 'hono';
import { ToolRegistry } from '../tools/registry';
import { ToolExecutor } from '../tools/executor';
import { z } from 'zod';

const toolsRoutes = new Hono();

/**
 * GET /tools/registry - Get tool registry status
 * NOTE: This route must come before /:name to avoid conflicts
 */
toolsRoutes.get('/registry', async (c) => {
  const registry = ToolRegistry.getInstance();
  const tools = registry.getAll();

  return c.json({
    success: true,
    data: {
      registry: {
        count: tools.length,
        tools: tools.map((t) => ({
          name: t.name,
          category: t.category,
        })),
      },
    },
  });
});

/**
 * GET /tools/schema/:name - Get JSON schema for a tool
 * NOTE: This route must come before /:name to avoid conflicts
 */
toolsRoutes.get('/schema/:name', async (c) => {
  const registry = ToolRegistry.getInstance();
  const toolName = c.req.param('name');
  const format = c.req.query('format') || 'json';

  const tool = registry.get(toolName);

  if (!tool) {
    return c.json(
      {
        success: false,
        error: `Tool not found: ${toolName}`,
      },
      404
    );
  }

  let schema: any;

  try {
    // Convert to requested format using toAIFormat
    switch (format) {
      case 'openai':
        const openaiFormat = registry.toAIFormat('openai');
        const openaiTool = openaiFormat.find((t: any) => t.type === 'function' && t.function?.name === toolName);
        schema = openaiTool || { type: 'function', function: { name: toolName, description: tool.description } };
        break;
      case 'anthropic':
        const anthropicFormat = registry.toAIFormat('anthropic');
        const anthropicTool = anthropicFormat.find((t: any) => t.name === toolName);
        schema = anthropicTool || { name: toolName, description: tool.description, input_schema: {} };
        break;
      case 'google':
        const googleFormat = registry.toAIFormat('google');
        const googleTool = googleFormat.find((t: any) => t.function?.name === toolName);
        schema = googleTool || { function: { name: toolName, description: tool.description, parameters: {} } };
        break;
      case 'json':
        // Return raw Zod schema info
        schema = {
          name: toolName,
          description: tool.description,
          category: tool.category,
        };
        break;
      default:
        return c.json(
          {
            success: false,
            error: `Invalid format: ${format}. Valid formats: openai, anthropic, google, json`,
          },
          400
        );
    }
  } catch (error) {
    // If toAIFormat fails, return minimal schema
    schema = {
      name: toolName,
      description: tool.description,
      category: tool.category,
    };
  }

  return c.json({
    success: true,
    data: {
      schema,
      format,
    },
  });
});

/**
 * GET /tools - List all registered tools
 */
toolsRoutes.get('/', async (c) => {
  const registry = ToolRegistry.getInstance();

  // Get category filter from query params
  const category = c.req.query('category');

  let tools = registry.getAll();

  // Filter by category if specified
  if (category) {
    const validCategories = ['file', 'code', 'command', 'search', 'ai', 'system'];
    if (!validCategories.includes(category)) {
      return c.json(
        {
          success: false,
          error: `Invalid category: ${category}. Valid categories: ${validCategories.join(', ')}`,
        },
        400
      );
    }
    tools = tools.filter((t) => t.category === category);
  }

  // Return tool metadata (not the full tool with handler)
  const toolMetadata = tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    category: tool.category,
    permissions: tool.permissions,
    rateLimit: tool.rateLimit,
  }));

  return c.json({
    success: true,
    data: {
      tools: toolMetadata,
      count: toolMetadata.length,
    },
  });
});

/**
 * GET /tools/:name - Get a specific tool's details
 */
toolsRoutes.get('/:name', async (c) => {
  const registry = ToolRegistry.getInstance();
  const toolName = c.req.param('name');

  const tool = registry.get(toolName);

  if (!tool) {
    return c.json(
      {
        success: false,
        error: `Tool not found: ${toolName}`,
      },
      404
    );
  }

  // Return tool details (excluding handler function)
  const toolDetails = {
    name: tool.name,
    description: tool.description,
    category: tool.category,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema,
    permissions: tool.permissions,
    rateLimit: tool.rateLimit,
  };

  return c.json({
    success: true,
    data: {
      tool: toolDetails,
    },
  });
});

/**
 * POST /tools/execute - Execute a tool
 */
toolsRoutes.post('/execute', async (c) => {
  const registry = ToolRegistry.getInstance();
  const executor = new ToolExecutor(registry);

  // Parse request body
  const body = await c.req.json().catch(() => ({}));

  // Validate request body
  const executeSchema = z.object({
    toolName: z.string().min(1),
    input: z.any(),
    context: z
      .object({
        executionId: z.string().optional(),
        sessionId: z.string().optional(),
        userId: z.string().optional(),
        timeout: z.number().optional(),
        permissions: z.array(z.any()).optional(),
      })
      .optional(),
  });

  const validationResult = executeSchema.safeParse(body);

  if (!validationResult.success) {
    return c.json(
      {
        success: false,
        error: 'Invalid request body',
        details: validationResult.error.errors,
      },
      400
    );
  }

  const { toolName, input, context = {} } = validationResult.data;

  // Check if tool exists
  const tool = registry.get(toolName);
  if (!tool) {
    return c.json(
      {
        success: false,
        error: `Tool not found: ${toolName}`,
      },
      404
    );
  }

  // Execute tool
  const result = await executor.execute(toolName, input, context);

  // Return result - include success in response
  if (!result.success) {
    return c.json({
      success: true,
      data: { result },
    });
  }

  return c.json({
    success: true,
    data: {
      result,
    },
  });
});

export { toolsRoutes };
