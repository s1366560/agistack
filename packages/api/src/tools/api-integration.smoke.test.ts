/**
 * API Smoke Test - Git Tools
 *
 * Quick smoke test to verify Git tools are accessible via API
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('API Git Tools Smoke Test', () => {
  let api: any;
  let server: any;

  beforeAll(async () => {
    // Import and start API
    const module = await import('../index');
    api = module.api;
  });

  afterAll(() => {
    // Cleanup if needed
  });

  it('should have bootstrapped tools on startup', async () => {
    // Import registry
    const { ToolRegistry } = await import('../tools/registry');
    const registry = ToolRegistry.getInstance();

    const tools = registry.getAll();
    expect(tools.length).toBeGreaterThan(0);

    // Verify Git tools are registered
    const gitTools = tools.filter(t => t.name.startsWith('git_'));
    expect(gitTools.length).toBe(3);
  });

  it('should include git_status in enabled tools', async () => {
    const { ToolRegistry } = await import('../tools/registry');
    const registry = ToolRegistry.getInstance();

    const enabledTools = registry.getEnabled();
    const gitStatus = enabledTools.find(t => t.name === 'git_status');

    expect(gitStatus).toBeDefined();
    expect(gitStatus?.enabled).toBe(true);
  });

  it('should convert git_status to OpenAI format', async () => {
    const { ToolRegistry } = await import('../tools/registry');
    const registry = ToolRegistry.getInstance();

    const openaiFormat = registry.toAIFormat('openai');
    const gitStatusTool = openaiFormat.find((t: any) =>
      t.type === 'function' && t.function?.name === 'git_status'
    );

    expect(gitStatusTool).toBeDefined();
    expect(gitStatusTool?.function?.name).toBe('git_status');
    expect(gitStatusTool?.function?.description).toBeDefined();
    expect(gitStatusTool?.function?.parameters).toBeDefined();
  });

  it('should convert git_diff to Anthropic format', async () => {
    const { ToolRegistry } = await import('../tools/registry');
    const registry = ToolRegistry.getInstance();

    const anthropicFormat = registry.toAIFormat('anthropic');
    const gitDiffTool = anthropicFormat.find((t: any) => t.name === 'git_diff');

    expect(gitDiffTool).toBeDefined();
    expect(gitDiffTool?.name).toBe('git_diff');
    expect(gitDiffTool?.description).toBeDefined();
    expect(gitDiffTool?.input_schema).toBeDefined();
  });

  it('should convert git_commit to Google format', async () => {
    const { ToolRegistry } = await import('../tools/registry');
    const registry = ToolRegistry.getInstance();

    const googleFormat = registry.toAIFormat('google');
    const gitCommitTool = googleFormat.find((t: any) => t.function?.name === 'git_commit');

    expect(gitCommitTool).toBeDefined();
    expect(gitCommitTool?.function?.name).toBe('git_commit');
    expect(gitCommitTool?.function?.description).toBeDefined();
    expect(gitCommitTool?.function?.parameters).toBeDefined();
  });
});
