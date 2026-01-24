/**
 * Git Tools Registration Test
 *
 * Verifies that Git tools are properly registered with the ToolRegistry
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ToolRegistry } from './registry';
import { bootstrapTools } from './bootstrap';

describe('Git Tools Registration', () => {
  beforeEach(() => {
    // Reset registry before each test
    ToolRegistry.resetInstance();
  });

  afterEach(() => {
    ToolRegistry.resetInstance();
  });

  it('should register git_status tool', () => {
    const registry = ToolRegistry.getInstance();
    bootstrapTools(registry);

    const tool = registry.get('git_status');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('git_status');
    expect(tool?.category).toBe('command');
    expect(tool?.enabled).toBe(true);
    expect(tool?.dangerous).toBe(false);
  });

  it('should register git_diff tool', () => {
    const registry = ToolRegistry.getInstance();
    bootstrapTools(registry);

    const tool = registry.get('git_diff');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('git_diff');
    expect(tool?.category).toBe('command');
    expect(tool?.enabled).toBe(true);
    expect(tool?.dangerous).toBe(false);
  });

  it('should register git_commit tool', () => {
    const registry = ToolRegistry.getInstance();
    bootstrapTools(registry);

    const tool = registry.get('git_commit');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('git_commit');
    expect(tool?.category).toBe('command');
    expect(tool?.enabled).toBe(true);
    expect(tool?.dangerous).toBe(false);
  });

  it('should register all Git tools', () => {
    const registry = ToolRegistry.getInstance();
    bootstrapTools(registry);

    const gitTools = registry.getAll().filter(t => t.name.startsWith('git_'));
    expect(gitTools.length).toBe(3);
  });

  it('should include Git tools in AI format conversion', () => {
    const registry = ToolRegistry.getInstance();
    bootstrapTools(registry);

    const openaiFormat = registry.toAIFormat('openai');
    const gitTools = openaiFormat.filter((t: any) =>
      t.type === 'function' && t.function?.name?.startsWith('git_')
    );

    expect(gitTools.length).toBe(3);

    // Verify each Git tool is present
    const toolNames = gitTools.map((t: any) => t.function?.name);
    expect(toolNames).toContain('git_status');
    expect(toolNames).toContain('git_diff');
    expect(toolNames).toContain('git_commit');
  });

  it('should register Git tools alongside core tools', () => {
    const registry = ToolRegistry.getInstance();
    bootstrapTools(registry);

    const allTools = registry.getAll();

    // Should have core tools (read-file, write-file, list-files, search-code)
    expect(allTools.find(t => t.name === 'read-file')).toBeDefined();
    expect(allTools.find(t => t.name === 'write-file')).toBeDefined();
    expect(allTools.find(t => t.name === 'list-files')).toBeDefined();
    expect(allTools.find(t => t.name === 'search-code')).toBeDefined();

    // Should also have Git tools
    expect(allTools.find(t => t.name === 'git_status')).toBeDefined();
    expect(allTools.find(t => t.name === 'git_diff')).toBeDefined();
    expect(allTools.find(t => t.name === 'git_commit')).toBeDefined();
  });

  it('should provide correct schemas for Git tools', () => {
    const registry = ToolRegistry.getInstance();
    bootstrapTools(registry);

    const gitStatus = registry.get('git_status');
    const gitDiff = registry.get('git_diff');
    const gitCommit = registry.get('git_commit');

    // Verify all have input and output schemas
    expect(gitStatus?.inputSchema).toBeDefined();
    expect(gitStatus?.outputSchema).toBeDefined();

    expect(gitDiff?.inputSchema).toBeDefined();
    expect(gitDiff?.outputSchema).toBeDefined();

    expect(gitCommit?.inputSchema).toBeDefined();
    expect(gitCommit?.outputSchema).toBeDefined();
  });

  it('should validate git_status tool input', () => {
    const registry = ToolRegistry.getInstance();
    bootstrapTools(registry);

    const tool = registry.get('git_status');

    // Valid input
    const validInput = { format: 'porcelain' };
    const result = tool?.inputSchema.safeParse(validInput);
    expect(result?.success).toBe(true);

    // Invalid input
    const invalidInput = { format: 'invalid-format' };
    const invalidResult = tool?.inputSchema.safeParse(invalidInput);
    expect(invalidResult?.success).toBe(false);
  });

  it('should validate git_diff tool input', () => {
    const registry = ToolRegistry.getInstance();
    bootstrapTools(registry);

    const tool = registry.get('git_diff');

    // Valid input
    const validInput = { staged: false, format: 'unified' };
    const result = tool?.inputSchema.safeParse(validInput);
    expect(result?.success).toBe(true);

    // Invalid format
    const invalidInput = { format: 'invalid' };
    const invalidResult = tool?.inputSchema.safeParse(invalidInput);
    expect(invalidResult?.success).toBe(false);
  });

  it('should validate git_commit tool input', () => {
    const registry = ToolRegistry.getInstance();
    bootstrapTools(registry);

    const tool = registry.get('git_commit');

    // Valid input
    const validInput = {
      message: 'Test commit',
      allowEmpty: false,
    };
    const result = tool?.inputSchema.safeParse(validInput);
    expect(result?.success).toBe(true);

    // Missing required message
    const invalidInput = { allowEmpty: false };
    const invalidResult = tool?.inputSchema.safeParse(invalidInput);
    expect(invalidResult?.success).toBe(false);
  });

  it('should provide tool descriptions', () => {
    const registry = ToolRegistry.getInstance();
    bootstrapTools(registry);

    const gitStatus = registry.get('git_status');
    const gitDiff = registry.get('git_diff');
    const gitCommit = registry.get('git_commit');

    expect(gitStatus?.description).toBeDefined();
    expect(gitStatus?.description.length).toBeGreaterThan(0);

    expect(gitDiff?.description).toBeDefined();
    expect(gitDiff?.description.length).toBeGreaterThan(0);

    expect(gitCommit?.description).toBeDefined();
    expect(gitCommit?.description.length).toBeGreaterThan(0);
  });
});
