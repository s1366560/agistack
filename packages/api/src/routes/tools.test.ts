import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ToolRegistry } from '../tools/registry';
import { Hono } from 'hono';
import { toolsRoutes } from './tools';
import { registerCoreTools } from '../tools/core';

describe('Tools Routes', () => {
  let app: Hono;
  let registry: ToolRegistry;

  beforeEach(() => {
    // Initialize registry
    ToolRegistry.resetInstance();
    registry = ToolRegistry.getInstance();

    // Register core tools
    registerCoreTools(registry);

    // Create app with routes
    app = new Hono();
    app.route('/tools', toolsRoutes);
  });

  afterEach(() => {
    ToolRegistry.resetInstance();
  });

  describe('GET /tools', () => {
    it('should list all registered tools', async () => {
      const response = await app.request('/tools');
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.tools).toBeDefined();
      expect(json.data.tools.length).toBeGreaterThan(0);
    });

    it('should return tool metadata', async () => {
      const response = await app.request('/tools');
      const json = await response.json();

      const firstTool = json.data.tools[0];
      expect(firstTool).toHaveProperty('name');
      expect(firstTool).toHaveProperty('description');
      expect(firstTool).toHaveProperty('category');
    });

    it('should filter tools by category', async () => {
      const response = await app.request('/tools?category=file');
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.tools.every((t: any) => t.category === 'file')).toBe(true);
    });

    it('should return 400 for invalid category', async () => {
      const response = await app.request('/tools?category=invalid');
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
    });
  });

  describe('GET /tools/:name', () => {
    it('should get a specific tool by name', async () => {
      const response = await app.request('/tools/read-file');
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.tool).toBeDefined();
      expect(json.data.tool.name).toBe('read-file');
    });

    it('should include tool input schema', async () => {
      const response = await app.request('/tools/read-file');
      const json = await response.json();

      expect(json.data.tool.inputSchema).toBeDefined();
    });

    it('should include tool output schema', async () => {
      const response = await app.request('/tools/read-file');
      const json = await response.json();

      expect(json.data.tool.outputSchema).toBeDefined();
    });

    it('should include tool permissions', async () => {
      const response = await app.request('/tools/read-file');
      const json = await response.json();

      expect(json.data.tool.permissions).toBeDefined();
      expect(Array.isArray(json.data.tool.permissions)).toBe(true);
    });

    it('should return 404 for non-existent tool', async () => {
      const response = await app.request('/tools/nonexistent');
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.success).toBe(false);
    });
  });

  describe('POST /tools/execute', () => {
    it('should execute a tool', async () => {
      const response = await app.request('/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'list-files',
          input: { path: process.cwd() },
        }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.result).toBeDefined();
    });

    it('should validate tool name', async () => {
      const response = await app.request('/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'nonexistent',
          input: {},
        }),
      });
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.success).toBe(false);
    });

    it('should validate input schema', async () => {
      const response = await app.request('/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'read-file',
          input: {}, // Missing required 'path' parameter
        }),
      });
      const json = await response.json();

      // Tool executor will handle validation and return success: false
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.result.success).toBe(false);
    });

    it('should pass execution context to tool', async () => {
      const response = await app.request('/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'list-files',
          input: { path: process.cwd() },
          context: {
            executionId: 'test-exec-123',
            sessionId: 'test-session-456',
            timeout: 5000,
          },
        }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
    });

    it('should handle tool errors gracefully', async () => {
      const response = await app.request('/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'read-file',
          input: { path: '/nonexistent/file.txt' },
        }),
      });
      const json = await response.json();

      // Route returns success: true even when tool fails (execution succeeded)
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.result.success).toBe(false);
      expect(json.data.result.error).toBeDefined();
    });
  });

  describe('GET /tools/registry', () => {
    it('should return registry status', async () => {
      const response = await app.request('/tools/registry');
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.registry).toBeDefined();
    });

    it('should include tool count', async () => {
      const response = await app.request('/tools/registry');
      const json = await response.json();

      expect(json.data.registry.count).toBeDefined();
      expect(typeof json.data.registry.count).toBe('number');
    });

    it('should include list of registered tool names', async () => {
      const response = await app.request('/tools/registry');
      const json = await response.json();

      expect(json.data.registry.tools).toBeDefined();
      expect(Array.isArray(json.data.registry.tools)).toBe(true);
      expect(json.data.registry.tools.length).toBeGreaterThan(0);
    });
  });

  describe('GET /tools/schema/:name', () => {
    it('should return JSON schema for a tool', async () => {
      const response = await app.request('/tools/schema/read-file');
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.schema).toBeDefined();
    });

    it('should include OpenAI format', async () => {
      const response = await app.request('/tools/schema/read-file?format=openai');
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.format).toBe('openai');
    });

    it('should include Anthropic format', async () => {
      const response = await app.request('/tools/schema/read-file?format=anthropic');
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.format).toBe('anthropic');
    });

    it('should include Google format', async () => {
      const response = await app.request('/tools/schema/read-file?format=google');
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.format).toBe('google');
    });

    it('should return 404 for non-existent tool', async () => {
      const response = await app.request('/tools/schema/nonexistent');
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.success).toBe(false);
    });

    it('should return 400 for invalid format', async () => {
      const response = await app.request('/tools/schema/read-file?format=invalid');
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
    });
  });
});
