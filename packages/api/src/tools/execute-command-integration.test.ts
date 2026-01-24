/**
 * Execute Command Tool Integration Tests
 *
 * Tests the execute_command tool integration with the system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ToolRegistry } from './registry';
import { bootstrapTools } from './bootstrap';

describe('Execute Command Tool Integration', () => {
  beforeEach(() => {
    ToolRegistry.resetInstance();
  });

  afterEach(() => {
    ToolRegistry.resetInstance();
  });

  it('should register execute_command tool', () => {
    const registry = ToolRegistry.getInstance();
    bootstrapTools(registry);

    const tool = registry.get('execute_command');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('execute_command');
    expect(tool?.category).toBe('command');
    expect(tool?.dangerous).toBe(true);
    expect(tool?.enabled).toBe(true);
  });

  it('should have correct input schema', () => {
    const registry = ToolRegistry.getInstance();
    bootstrapTools(registry);

    const tool = registry.get('execute_command');
    expect(tool?.inputSchema).toBeDefined();

    // Valid input
    const validInput = {
      command: 'echo',
      args: ['test'],
      timeout: 5000,
    };

    const result = tool?.inputSchema.safeParse(validInput);
    expect(result?.success).toBe(true);
  });

  it('should have correct output schema', () => {
    const registry = ToolRegistry.getInstance();
    bootstrapTools(registry);

    const tool = registry.get('execute_command');
    expect(tool?.outputSchema).toBeDefined();

    const outputSchema = tool?.outputSchema;
    expect(outputSchema).toBeDefined();
  });

  it('should be included in AI format conversion', () => {
    const registry = ToolRegistry.getInstance();
    bootstrapTools(registry);

    const openaiFormat = registry.toAIFormat('openai');
    const executeCommandTool = openaiFormat.find((t: any) =>
      t.type === 'function' && t.function?.name === 'execute_command'
    );

    expect(executeCommandTool).toBeDefined();
    expect(executeCommandTool?.function?.name).toBe('execute_command');
    expect(executeCommandTool?.function?.description).toBeDefined();
    expect(executeCommandTool?.function?.parameters).toBeDefined();
  });

  it('should execute simple command via handler', async () => {
    const registry = ToolRegistry.getInstance();
    bootstrapTools(registry);

    const tool = registry.get('execute_command');

    const result = await tool?.handler({
      command: 'echo',
      args: ['hello from integration test'],
      timeout: 5000,
    });

    expect(result?.success).toBe(true);
    expect(result?.data?.stdout).toContain('hello from integration test');
    expect(result?.data?.exitCode).toBe(0);
  });

  it('should handle command errors gracefully', async () => {
    const registry = ToolRegistry.getInstance();
    bootstrapTools(registry);

    const tool = registry.get('execute_command');

    const result = await tool?.handler({
      command: 'nonexistent-command-xyz-123',
      args: [],
      timeout: 5000,
    });

    expect(result?.success).toBe(false);
    expect(result?.error).toContain('not found');
  });

  it('should respect dangerous flag', async () => {
    const registry = ToolRegistry.getInstance();
    bootstrapTools(registry);

    const tool = registry.get('execute_command');

    // Should reject dangerous command without flag
    const result1 = await tool?.handler({
      command: 'rm',
      args: ['-rf', '/tmp/test'],
      timeout: 5000,
      allowDangerous: false,
    });

    expect(result1?.success).toBe(false);
    expect(result1?.error).toContain('dangerous');
  });

  it('should have metadata', () => {
    const registry = ToolRegistry.getInstance();
    bootstrapTools(registry);

    const tool = registry.get('execute_command');

    expect(tool?.metadata).toBeDefined();
    expect(tool?.metadata?.version).toBe('1.0.0');
    expect(tool?.metadata?.author).toBe('Agistack');
    expect(tool?.metadata?.tags).toContain('shell');
    expect(tool?.metadata?.tags).toContain('command');
  });

  it('should be enabled by default', () => {
    const registry = ToolRegistry.getInstance();
    bootstrapTools(registry);

    const enabledTools = registry.getEnabled();
    const executeCommand = enabledTools.find(t => t.name === 'execute_command');

    expect(executeCommand).toBeDefined();
    expect(executeCommand?.enabled).toBe(true);
  });
});
