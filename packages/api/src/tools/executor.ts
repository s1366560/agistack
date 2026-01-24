import { ToolRegistry } from './registry';
import { ToolDefinition, ToolResult, ToolExecutionContext, Permission } from '@agistack/shared';
import { z } from 'zod';

// Rate limit tracking: toolName -> { count: number, resetTime: number }
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class ToolExecutor {
  private registry: ToolRegistry;
  private usageRepo: any;
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute in ms

  constructor(registry: ToolRegistry, usageRepo?: any) {
    this.registry = registry;
    this.usageRepo = usageRepo;
  }

  /**
   * Execute a tool with validation, permission checking, and rate limiting
   */
  async execute(
    toolName: string,
    input: unknown,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Get tool definition
      const tool = this.registry.get(toolName);
      if (!tool) {
        return {
          success: false,
          error: `Tool '${toolName}' not found`,
        };
      }

      // Validate input schema
      const validationResult = this.validateInput(tool, input);
      if (!validationResult.valid) {
        return {
          success: false,
          error: `Input validation failed: ${validationResult.error}`,
        };
      }

      // Check permissions
      const permissionResult = await this.checkPermissions(tool, input, context);
      if (!permissionResult.valid) {
        return {
          success: false,
          error: `Permission check failed: ${permissionResult.error}`,
        };
      }

      // Enforce rate limit
      const rateLimitResult = this.enforceRateLimit(tool, context);
      if (!rateLimitResult.valid) {
        return {
          success: false,
          error: `Rate limit exceeded: ${rateLimitResult.error}`,
        };
      }

      // Execute tool
      const result = await this.executeTool(tool, input, context);

      // Track usage
      const durationMs = Date.now() - startTime;
      await this.trackUsage(toolName, input, result, durationMs, context);

      return {
        ...result,
        metadata: {
          durationMs,
          ...result.metadata,
        },
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        error: errorMessage,
        metadata: { durationMs },
      };
    }
  }

  /**
   * Validate input against tool's schema
   */
  private validateInput(tool: ToolDefinition, input: unknown): {
    valid: boolean;
    error?: string;
  } {
    try {
      tool.inputSchema.parse(input);
      return { valid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors || [];
        return {
          valid: false,
          error: errors.map((e) => e.message).join(', '),
        };
      }
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }

  /**
   * Check if execution is allowed based on permissions
   */
  private async checkPermissions(
    tool: ToolDefinition,
    input: unknown,
    context: ToolExecutionContext
  ): Promise<{ valid: boolean; error?: string }> {
    // Extract relevant resource from input (e.g., file path)
    const resource = this.extractResource(input);
    if (!resource) {
      return { valid: true }; // No resource to check
    }

    // If tool has permissions, check only tool permissions
    if (tool.permissions && tool.permissions.length > 0) {
      // First check for deny permissions
      for (const permission of tool.permissions) {
        const match = this.matchPermission(permission, resource);
        if (match && permission.action === 'deny') {
          return {
            valid: false,
            error: `Access to '${resource}' is denied by tool permissions`,
          };
        }
      }

      // Then check for allow permissions
      for (const permission of tool.permissions) {
        const match = this.matchPermission(permission, resource);
        if (match && permission.action === 'allow') {
          return { valid: true };
        }
      }

      // If tool has permissions but none matched, deny
      return {
        valid: false,
        error: `No matching allow permission for '${resource}'`,
      };
    }

    // If tool has no permissions, check context permissions
    // First check for deny permissions
    for (const permission of context.permissions) {
      const match = this.matchPermission(permission, resource);
      if (match && permission.action === 'deny') {
        return {
          valid: false,
          error: `Access to '${resource}' is denied by context permissions`,
        };
      }
    }

    // Then check for allow permissions
    for (const permission of context.permissions) {
      const match = this.matchPermission(permission, resource);
      if (match && permission.action === 'allow') {
        return { valid: true };
      }
    }

    // If no permissions matched and tool has no permissions, allow by default
    return { valid: true };
  }

  /**
   * Extract resource path from input (for permission checking)
   */
  private extractResource(input: unknown): string | null {
    if (typeof input !== 'object' || input === null) {
      return null;
    }

    const obj = input as Record<string, unknown>;

    // Common field names for paths/resources
    const pathFields = ['path', 'file', 'filePath', 'directory', 'resource'];

    for (const field of pathFields) {
      if (field in obj && typeof obj[field] === 'string') {
        return obj[field] as string;
      }
    }

    return null;
  }

  /**
   * Check if a permission pattern matches a resource
   */
  private matchPermission(permission: Permission, resource: string): boolean {
    // Replace ** first with a temporary placeholder to avoid conflicts
    let pattern = permission.pattern
      .replace(/\*\*/g, '%%DOUBLESTAR%%')
      .replace(/\*/g, '[^/]*')
      .replace(/%%DOUBLESTAR%%/g, '.*')
      .replace(/\?/g, '[^/]');

    const regex = new RegExp(`^${pattern}$`);
    return regex.test(resource);
  }

  /**
   * Enforce rate limiting for tools
   */
  private enforceRateLimit(
    tool: ToolDefinition,
    context: ToolExecutionContext
  ): { valid: boolean; error?: string } {
    // If no rate limit, allow execution
    if (!tool.rateLimit) {
      return { valid: true };
    }

    const key = `${tool.name}:${context.sessionId}`;
    const now = Date.now();
    const entry = this.rateLimits.get(key);

    // Reset if window expired
    if (entry && now > entry.resetTime) {
      this.rateLimits.delete(key);
    }

    // Check current count
    const currentEntry = this.rateLimits.get(key);
    if (currentEntry && currentEntry.count >= tool.rateLimit) {
      return {
        valid: false,
        error: `rate limit exceeded`,
      };
    }

    // Increment counter
    if (currentEntry) {
      currentEntry.count++;
    } else {
      this.rateLimits.set(key, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW,
      });
    }

    return { valid: true };
  }

  /**
   * Execute the tool with timeout support
   */
  private async executeTool(
    tool: ToolDefinition,
    input: unknown,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    // Get timeout from context (default to 30 seconds)
    const timeout = (context as any).timeout || 30000;

    // Execute with timeout
    const result = await this.withTimeout(
      tool.handler(input, context as any),
      timeout
    );

    // Validate output schema
    if (result.success && result.data !== undefined) {
      try {
        tool.outputSchema.parse(result.data);
      } catch (error) {
        // Log warning but don't fail execution
        console.warn(`Tool '${tool.name}' returned invalid output:`, error);
      }
    }

    return result;
  }

  /**
   * Wrap a promise with timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutHandle: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`Execution timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  /**
   * Track tool usage in repository
   */
  private async trackUsage(
    toolName: string,
    input: unknown,
    result: ToolResult,
    durationMs: number,
    context: ToolExecutionContext
  ): Promise<void> {
    if (!this.usageRepo) {
      return; // Skip tracking if no usage repo provided
    }

    try {
      await this.usageRepo.create({
        executionId: context.executionId,
        toolName,
        arguments: input,
        result,
        durationMs,
        success: result.success,
      });
    } catch (error) {
      // Log error but don't fail execution
      console.error(`Failed to track usage for tool '${toolName}':`, error);
    }
  }
}
