import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  ToolCategoryEnum,
  ToolCategory,
  ToolResult,
  ToolDefinition,
  ToolPermission,
  ToolExecutionContext,
  ToolMetadata,
} from "./tool";

describe("Tool Types", () => {
  describe("ToolCategoryEnum", () => {
    it("should contain all expected categories", () => {
      expect(ToolCategoryEnum).toEqual(
        expect.arrayContaining([
          "file",
          "code",
          "command",
          "search",
          "ai",
          "system",
        ]),
      );
    });

    it("should be readonly array", () => {
      expect(ToolCategoryEnum).toHaveLength(6);
    });
  });

  describe("ToolResult", () => {
    it("should accept successful result with data", () => {
      const result: ToolResult = {
        success: true,
        data: { message: "File read successfully" },
        metadata: {
          durationMs: 100,
        },
      };

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ message: "File read successfully" });
      expect(result.metadata?.durationMs).toBe(100);
    });

    it("should accept error result", () => {
      const result: ToolResult = {
        success: false,
        error: "File not found",
        metadata: {
          durationMs: 50,
        },
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe("File not found");
    });

    it("should accept result with token usage", () => {
      const result: ToolResult = {
        success: true,
        data: { text: "processed" },
        metadata: {
          durationMs: 200,
          tokensUsed: 50,
        },
      };

      expect(result.metadata?.tokensUsed).toBe(50);
    });

    it("should accept minimal result", () => {
      const result: ToolResult = {
        success: true,
        data: "done",
      };

      expect(result.success).toBe(true);
      expect(result.data).toBe("done");
      expect(result.metadata).toBeUndefined();
    });
  });

  describe("ToolDefinition", () => {
    it("should accept valid tool definition", () => {
      const inputSchema = z.object({
        path: z.string(),
        encoding: z.enum(["utf-8", "ascii"]).optional(),
      });

      const outputSchema = z.object({
        content: z.string(),
        size: z.number(),
      });

      const definition: ToolDefinition = {
        name: "read-file",
        description: "Reads a file from the filesystem",
        category: "file" as ToolCategory,
        inputSchema,
        outputSchema,
        handler: async (input) => {
          return {
            success: true,
            data: { content: "test", size: 4 },
          };
        },
        permissions: [
          {
            resourceType: "file",
            pattern: "/allowed/**",
            action: "allow",
          },
        ],
        rateLimit: 10,
      };

      expect(definition.name).toBe("read-file");
      expect(definition.category).toBe("file");
      expect(definition.rateLimit).toBe(10);
      expect(definition.permissions).toHaveLength(1);
    });

    it("should accept tool definition without optional fields", () => {
      const definition: ToolDefinition = {
        name: "simple-tool",
        description: "A simple tool",
        category: "system" as ToolCategory,
        inputSchema: z.object({}),
        outputSchema: z.object({}),
        handler: async () => {
          return { success: true, data: null };
        },
      };

      expect(definition.permissions).toBeUndefined();
      expect(definition.rateLimit).toBeUndefined();
    });
  });

  describe("Permission", () => {
    it("should accept allow permission", () => {
      const permission: Permission = {
        resourceType: "file",
        pattern: "/home/user/**",
        action: "allow",
      };

      expect(permission.action).toBe("allow");
      expect(permission.resourceType).toBe("file");
    });

    it("should accept deny permission", () => {
      const permission: Permission = {
        resourceType: "directory",
        pattern: "/etc/**",
        action: "deny",
      };

      expect(permission.action).toBe("deny");
    });

    it("should accept ask permission", () => {
      const permission: Permission = {
        resourceType: "command",
        pattern: "rm -rf",
        action: "ask",
      };

      expect(permission.action).toBe("ask");
    });
  });

  describe("ToolExecutionContext", () => {
    it("should accept execution context with all fields", () => {
      const context: ToolExecutionContext = {
        executionId: "exec-123",
        sessionId: "session-456",
        userId: "user-789",
        projectId: "project-101",
        permissions: [
          {
            resourceType: "file",
            pattern: "/project/**",
            action: "allow",
          },
        ],
      };

      expect(context.executionId).toBe("exec-123");
      expect(context.sessionId).toBe("session-456");
      expect(context.userId).toBe("user-789");
      expect(context.projectId).toBe("project-101");
      expect(context.permissions).toHaveLength(1);
    });

    it("should accept minimal execution context", () => {
      const context: ToolExecutionContext = {
        executionId: "exec-123",
        sessionId: "session-456",
        permissions: [],
      };

      expect(context.userId).toBeUndefined();
      expect(context.projectId).toBeUndefined();
      expect(context.permissions).toEqual([]);
    });
  });

  describe("ToolMetadata", () => {
    it("should accept tool metadata", () => {
      const metadata: ToolMetadata = {
        name: "read-file",
        version: "1.0.0",
        category: "file" as ToolCategory,
        dangerous: false,
        deprecated: false,
      };

      expect(metadata.name).toBe("read-file");
      expect(metadata.version).toBe("1.0.0");
      expect(metadata.dangerous).toBe(false);
      expect(metadata.deprecated).toBe(false);
    });

    it("should accept deprecated tool metadata", () => {
      const metadata: ToolMetadata = {
        name: "old-tool",
        version: "0.5.0",
        category: "system" as ToolCategory,
        dangerous: true,
        deprecated: true,
      };

      expect(metadata.deprecated).toBe(true);
      expect(metadata.dangerous).toBe(true);
    });
  });

  describe("Zod Schema Validation", () => {
    it("should validate tool input with schema", async () => {
      const schema = z.object({
        path: z.string().min(1),
        encoding: z.enum(["utf-8", "ascii"]).default("utf-8"),
      });

      const validInput = { path: "/test/file.txt" };
      const result = await schema.parseAsync(validInput);

      expect(result.path).toBe("/test/file.txt");
      expect(result.encoding).toBe("utf-8");
    });

    it("should reject invalid input", async () => {
      const schema = z.object({
        path: z.string().min(1),
      });

      const invalidInput = { path: "" };

      await expect(schema.parseAsync(invalidInput)).rejects.toThrow();
    });

    it("should validate nested schemas", async () => {
      const schema = z.object({
        options: z.object({
          recursive: z.boolean().default(false),
          depth: z.number().int().min(1).max(100),
        }),
      });

      const input = {
        options: {
          recursive: true,
          depth: 5,
        },
      };

      const result = await schema.parseAsync(input);
      expect(result.options.recursive).toBe(true);
      expect(result.options.depth).toBe(5);
    });

    it("should reject out-of-range numbers", async () => {
      const schema = z.object({
        depth: z.number().int().min(1).max(100),
      });

      const invalidInput = { depth: 150 };

      await expect(schema.parseAsync(invalidInput)).rejects.toThrow();
    });
  });

  describe("Type Inference", () => {
    it("should infer input type from schema", () => {
      const inputSchema = z.object({
        path: z.string(),
        count: z.number(),
      });

      type InputType = z.infer<typeof inputSchema>;

      const input: InputType = {
        path: "/test",
        count: 5,
      };

      expect(typeof input.path).toBe("string");
      expect(typeof input.count).toBe("number");
    });

    it("should infer output type from schema", () => {
      const outputSchema = z.object({
        content: z.string(),
        lines: z.number(),
      });

      type OutputType = z.infer<typeof outputSchema>;

      const output: OutputType = {
        content: "file content",
        lines: 10,
      };

      expect(output.content).toBe("file content");
      expect(output.lines).toBe(10);
    });
  });
});
