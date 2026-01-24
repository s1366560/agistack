import { ToolDefinition, ToolCategory } from '@agistack/shared/types/tool';
import { z } from 'zod';

/**
 * Extended tool definition with runtime flags
 */
export interface RegisteredTool extends ToolDefinition {
  enabled: boolean;
  dangerous: boolean;
  metadata?: {
    version: string;
    author?: string;
    tags?: string[];
  };
}

/**
 * ToolRegistry - Unified singleton pattern for managing tools
 * Combines features from both tool registries:
 * - AI format conversion (OpenAI, Anthropic, Google)
 * - Enabled/dangerous flag management
 * - Tool metadata tracking
 */
export class ToolRegistry {
  private static instance: ToolRegistry | null = null;
  private tools: Map<string, RegisteredTool> = new Map();

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static resetInstance(): void {
    ToolRegistry.instance = null;
  }

  /**
   * Register a tool
   * If a tool with the same name exists, it will be overwritten
   */
  register(tool: ToolDefinition): void {
    if (!tool.name || tool.name.trim() === '') {
      throw new Error('Tool name is required');
    }

    const registeredTool: RegisteredTool = {
      ...tool,
      enabled: tool.enabled !== undefined ? tool.enabled : true,
      dangerous: tool.dangerous !== undefined ? tool.dangerous : false,
      metadata: tool.metadata,
    };

    this.tools.set(tool.name, registeredTool);
  }

  /**
   * Unregister a tool by name
   * @returns true if tool was removed, false if it didn't exist
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Get a tool by name
   */
  get(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Find all tools in a category (legacy method - returns all tools in category)
   */
  findByCategory(category: ToolCategory): RegisteredTool[] {
    return Array.from(this.tools.values()).filter(
      (tool) => tool.category === category
    );
  }

  /**
   * Get all registered tools
   */
  getAll(): RegisteredTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get only enabled tools
   */
  getEnabled(): RegisteredTool[] {
    return Array.from(this.tools.values()).filter(tool => tool.enabled);
  }

  /**
   * Get tools by category (only enabled)
   */
  getByCategory(category: ToolCategory): RegisteredTool[] {
    return Array.from(this.tools.values()).filter(tool => tool.category === category && tool.enabled);
  }

  /**
   * Get dangerous tools (only enabled)
   */
  getDangerous(): RegisteredTool[] {
    return Array.from(this.tools.values()).filter(tool => tool.dangerous && tool.enabled);
  }

  /**
   * Set tool enabled/disabled
   */
  setEnabled(name: string, enabled: boolean): void {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }
    tool.enabled = enabled;
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
  }

  /**
   * Convert tools to AI provider format
   * Only includes enabled tools
   */
  toAIFormat(provider: 'openai' | 'anthropic' | 'google'): unknown[] {
    const tools = this.getEnabled();

    switch (provider) {
      case 'openai':
        return tools.map((tool) => this.toOpenAIFormat(tool));
      case 'anthropic':
        return tools.map((tool) => this.toAnthropicFormat(tool));
      case 'google':
        return tools.map((tool) => this.toGoogleFormat(tool));
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  /**
   * Convert a single tool to OpenAI function calling format
   */
  private toOpenAIFormat(tool: RegisteredTool): unknown {
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: this.zodToJSONSchema(tool.inputSchema),
      },
    };
  }

  /**
   * Convert a single tool to Anthropic tools format
   */
  private toAnthropicFormat(tool: RegisteredTool): unknown {
    return {
      name: tool.name,
      description: tool.description,
      input_schema: this.zodToJSONSchema(tool.inputSchema),
    };
  }

  /**
   * Convert a single tool to Google function calling format
   */
  private toGoogleFormat(tool: RegisteredTool): unknown {
    return {
      function: {
        name: tool.name,
        description: tool.description,
        parameters: this.zodToJSONSchema(tool.inputSchema),
      },
    };
  }

  /**
   * Convert Zod schema to JSON Schema format
   */
  private zodToJSONSchema(schema: z.ZodTypeAny): unknown {
    const zodSchema: any = schema;

    // Check if it's a ZodObject (has shape property)
    if ('shape' in zodSchema && typeof zodSchema.shape === 'object') {
      const shape = zodSchema.shape;
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        const zodValue: any = value;
        properties[key] = this.zodTypeToJSONSchema(zodValue);

        // Check if the field is optional using Zod's built-in method
        // Try to access the optional flag from Zod's internals
        const isOptional =
          // Direct type check
          zodValue._def?.typeName === 'ZodOptional' ||
          zodValue._def?.typeName === 'ZodDefault' ||
          // Check if it's an optional wrapper (unwraps to inner type)
          (zodValue.safeParse && zodValue.safeParse(undefined).success);

        if (!isOptional) {
          required.push(key);
        }
      }

      return {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined,
      };
    }

    // Handle primitive types
    return this.zodTypeToJSONSchema(zodSchema);
  }

  /**
   * Convert individual Zod type to JSON Schema type
   */
  private zodTypeToJSONSchema(zodType: any): unknown {
    const typeName = zodType._def?.typeName;
    const description = zodType._def?.description || zodType.description;

    switch (typeName) {
      case 'ZodString':
        return {
          type: 'string',
          ...(description && { description }),
        };

      case 'ZodNumber':
        return {
          type: 'number',
          ...(description && { description }),
        };

      case 'ZodBoolean':
        return {
          type: 'boolean',
          ...(description && { description }),
        };

      case 'ZodArray':
        const itemType = this.zodTypeToJSONSchema(zodType._def?.type);
        return {
          type: 'array',
          items: itemType,
          ...(description && { description }),
        };

      case 'ZodObject':
        return this.zodToJSONSchema(zodType);

      case 'ZodOptional':
      case 'ZodDefault':
        // Return the inner type for optional/default values
        return this.zodTypeToJSONSchema(zodType._def?.innerType);

      case 'ZodEnum':
        const enumValues = zodType._def?.values;
        return {
          type: 'string',
          enum: enumValues,
          ...(description && { description }),
        };

      case 'ZodLiteral':
        return {
          type: typeof zodType._def?.value,
          const: zodType._def?.value,
          ...(description && { description }),
        };

      case 'ZodUnion':
        // For unions, return the first option's type
        const options = zodType._def?.options || [];
        return this.zodTypeToJSONSchema(options[0]);

      case 'ZodEffects':
        // Handle transformed/refined schemas
        return this.zodTypeToJSONSchema(zodType._def?.schema);

      case 'ZodAny':
      case 'ZodUnknown':
        return {
          type: 'object',
          ...(description && { description }),
        };

      default:
        // Fallback for unknown types - check if it has optional wrapper
        if (zodType.safeParse && typeof zodType.safeParse === 'function') {
          // It's a Zod type, try to extract inner type
          const innerType = zodType._def?.innerType;
          if (innerType) {
            return this.zodTypeToJSONSchema(innerType);
          }
        }
        return {
          type: 'object',
          ...(description && { description: description || typeName }),
        };
    }
  }
}
