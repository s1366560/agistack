import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ToolRegistry } from '../../src/tools/registry';
import { registerCoreTools } from '../../src/tools/core';
import { toolsRoutes } from '../../src/routes/tools';

describe('Tools Integration Tests', () => {
  let app: Hono;
  let registry: ToolRegistry;

  // Helper to get default context with permissions
  const getDefaultContext = () => ({
    permissions: [
      { resourceType: 'file', pattern: process.cwd() + '/**', action: 'allow' },
    ],
  });

  beforeAll(async () => {
    // Create Hono app
    app = new Hono();

    // Initialize registry
    ToolRegistry.resetInstance();
    registry = ToolRegistry.getInstance();
    registerCoreTools(registry);

    // Register tools routes
    app.route('/tools', toolsRoutes);
  });

  afterAll(() => {
    // Reset registry
    ToolRegistry.resetInstance();

    // Clean up test files
    const testFiles = [
      'test-integration-read.txt',
      'test-integration-write.txt',
      'test-list-1.txt',
      'test-list-2.txt',
      'test-search.txt',
      'test-context.txt',
      'test-metadata.txt',
      'test-chained.txt',
      'test-doc-1.txt',
      'test-doc-2.txt',
      'test-doc-3.txt',
      'test-encoding.txt',
      'test-binary.bin',
      'test-empty',
      'test-special.txt',
    ];

    for (const file of testFiles) {
      const filePath = join(process.cwd(), file);
      if (existsSync(filePath)) {
        rmSync(filePath);
      }
      const dirPath = join(process.cwd(), 'test-empty');
      if (existsSync(dirPath)) {
        rmSync(dirPath, { recursive: true });
      }
    }
  });

  beforeEach(() => {
    // Reset rate limits before each test
    const executor = registry as any;
    if (executor.rateLimiter) {
      executor.rateLimiter.clear();
    }
  });

  describe('Complete Tool Execution Flow', () => {
    it('should execute read-file tool through API', async () => {
      const testFile = join(process.cwd(), 'test-integration-read.txt');
      writeFileSync(testFile, 'Hello from integration test!');

      const response = await app.request('/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'read-file',
          input: { path: testFile },
          context: getDefaultContext(),
        }),
      });

      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.result.success).toBe(true);
      expect(json.data.result.data.content).toBe('Hello from integration test!');

      rmSync(testFile);
    });

    it('should execute write-file tool through API', async () => {
      const testFile = join(process.cwd(), 'test-integration-write.txt');

      const response = await app.request('/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'write-file',
          input: {
            path: testFile,
            content: 'Written by API',
          },
          context: getDefaultContext(),
        }),
      });

      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.result.success).toBe(true);
      expect(existsSync(testFile)).toBe(true);
      expect(readFileSync(testFile, 'utf-8')).toBe('Written by API');

      rmSync(testFile);
    });

    it('should execute list-files tool through API', async () => {
      const file1 = join(process.cwd(), 'test-list-1.txt');
      const file2 = join(process.cwd(), 'test-list-2.txt');
      writeFileSync(file1, 'content1');
      writeFileSync(file2, 'content2');

      const response = await app.request('/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'list-files',
          input: { path: process.cwd() },
          context: getDefaultContext(),
        }),
      });

      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.result.success).toBe(true);
      const allFiles = json.data.result.data.files.join(' ');
      expect(allFiles.includes('test-list-1.txt') || allFiles.includes('test-list-2.txt')).toBe(true);

      rmSync(file1);
      rmSync(file2);
    });

    it('should execute search-code tool through API', async () => {
      const testFile = join(process.cwd(), 'test-search.txt');
      writeFileSync(testFile, 'line 1\npattern match\nline 3');

      const response = await app.request('/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'search-code',
          input: {
            path: process.cwd(),
            pattern: 'pattern',
            extensions: ['.txt'],
          },
          context: getDefaultContext(),
        }),
      });

      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.result.success).toBe(true);
      expect(json.data.result.data.matches.length).toBeGreaterThan(0);

      rmSync(testFile);
    });
  });

  describe('Tool Discovery', () => {
    it('should list all available tools', async () => {
      const response = await app.request('/tools');
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.tools.length).toBeGreaterThanOrEqual(4);

      const toolNames = json.data.tools.map((t: any) => t.name);
      expect(toolNames).toContain('read-file');
      expect(toolNames).toContain('write-file');
      expect(toolNames).toContain('list-files');
      expect(toolNames).toContain('search-code');
    });

    it('should get tool details', async () => {
      const response = await app.request('/tools/read-file');
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.tool.name).toBe('read-file');
      expect(json.data.tool.inputSchema).toBeDefined();
      expect(json.data.tool.outputSchema).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent tool', async () => {
      const response = await app.request('/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'nonexistent-tool',
          input: {},
          context: getDefaultContext(),
        }),
      });

      expect(response.status).toBe(404);
    });

    it('should handle tool execution errors', async () => {
      const response = await app.request('/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'read-file',
          input: { path: '/nonexistent/file.txt' },
          context: getDefaultContext(),
        }),
      });

      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.result.success).toBe(false);
      expect(json.data.result.error).toBeDefined();
    });
  });

  describe('Security', () => {
    it('should reject path traversal attacks', async () => {
      const response = await app.request('/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'read-file',
          input: { path: join(process.cwd(), '../../../etc/passwd') },
          context: getDefaultContext(),
        }),
      });

      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.result.success).toBe(false);
    });
  });

  describe('Multi-Tool Workflows', () => {
    it('should support chained operations', async () => {
      const chainedFile = join(process.cwd(), 'test-chained.txt');

      // Step 1: Write
      const writeResponse = await app.request('/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'write-file',
          input: {
            path: chainedFile,
            content: 'Chained operation result',
          },
          context: getDefaultContext(),
        }),
      });

      const writeJson = await writeResponse.json();
      expect(writeJson.data.result.success).toBe(true);

      // Step 2: Read
      const readResponse = await app.request('/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'read-file',
          input: { path: chainedFile },
          context: getDefaultContext(),
        }),
      });

      const readJson = await readResponse.json();
      expect(readJson.data.result.success).toBe(true);
      expect(readJson.data.result.data.content).toBe('Chained operation result');

      rmSync(chainedFile);
    });
  });

  describe('Registry Status', () => {
    it('should return registry information', async () => {
      const response = await app.request('/tools/registry');
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.registry.count).toBeGreaterThanOrEqual(4);
    });
  });

  describe('AI Provider Schemas', () => {
    it('should convert to OpenAI format', async () => {
      const response = await app.request('/tools/schema/read-file?format=openai');
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.format).toBe('openai');
    });

    it('should convert to Anthropic format', async () => {
      const response = await app.request('/tools/schema/read-file?format=anthropic');
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.format).toBe('anthropic');
    });

    it('should convert to Google format', async () => {
      const response = await app.request('/tools/schema/list-files?format=google');
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.format).toBe('google');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty directory listing', async () => {
      const emptyDir = join(process.cwd(), 'test-empty');
      mkdirSync(emptyDir, { recursive: true });

      const response = await app.request('/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'list-files',
          input: { path: emptyDir },
          context: getDefaultContext(),
        }),
      });

      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.result.success).toBe(true);
      expect(json.data.result.data.files).toEqual([]);

      rmSync(emptyDir, { recursive: true });
    });

    it('should handle no search results', async () => {
      const response = await app.request('/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'search-code',
          input: {
            path: process.cwd(),
            pattern: 'this-pattern-does-not-exist-xyz123',
            extensions: ['.xyz'],
          },
          context: getDefaultContext(),
        }),
      });

      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.result.success).toBe(true);
      expect(json.data.result.data.matches).toEqual([]);
    });
  });
});
