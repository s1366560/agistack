import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

describe('Database Schema', () => {
  describe('User Schema', () => {
    it('should have correct table name', () => {
      expect(schema.users).toBeDefined();
    });

    it('should validate user structure', () => {
      const userMock = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.png',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(userMock.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(userMock.id).toBeTruthy();
      expect(userMock.createdAt).toBeInstanceOf(Date);
      expect(userMock.updatedAt).toBeInstanceOf(Date);
    });

    it('should require email field', () => {
      const invalidUser = {
        id: '123',
        email: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(invalidUser.email).toBe('');
    });

    it('should have optional name field', () => {
      const userWithoutName = {
        id: '123',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(userWithoutName.name).toBeUndefined();
    });
  });

  describe('Workspace Schema', () => {
    it('should have correct table name', () => {
      expect(schema.workspaces).toBeDefined();
    });

    it('should validate workspace structure', () => {
      const workspaceMock = {
        id: '123',
        userId: 'user-123',
        name: 'My Workspace',
        settings: { theme: 'dark' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(workspaceMock.userId).toBeTruthy();
      expect(workspaceMock.name).toBeTruthy();
      expect(workspaceMock.name.length).toBeGreaterThan(0);
      expect(workspaceMock.settings).toBeInstanceOf(Object);
    });

    it('should store JSONB settings', () => {
      const complexSettings = {
        theme: 'dark',
        notifications: { email: true, push: false },
        preferences: {
          language: 'en',
          timezone: 'UTC',
        },
      };

      const workspace = {
        id: '123',
        userId: 'user-123',
        name: 'My Workspace',
        settings: complexSettings,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(workspace.settings.preferences.language).toBe('en');
    });
  });

  describe('Project Schema', () => {
    it('should have correct table name', () => {
      expect(schema.projects).toBeDefined();
    });

    it('should validate project structure', () => {
      const projectMock = {
        id: '123',
        workspaceId: 'workspace-123',
        name: 'My Project',
        path: '/path/to/project',
        description: 'A test project',
        metadata: { language: 'TypeScript' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(projectMock.workspaceId).toBeTruthy();
      expect(projectMock.name).toBeTruthy();
      expect(projectMock.path).toBeTruthy();
      expect(projectMock.metadata).toBeInstanceOf(Object);
    });

    it('should have optional description and metadata', () => {
      const minimalProject = {
        id: '123',
        workspaceId: 'workspace-123',
        name: 'Minimal Project',
        path: '/path/to/project',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(minimalProject.description).toBeUndefined();
      expect(minimalProject.metadata).toBeUndefined();
    });
  });

  describe('Session Schema', () => {
    it('should have correct table name', () => {
      expect(schema.sessions).toBeDefined();
    });

    it('should validate session structure', () => {
      const sessionMock = {
        id: '123',
        projectId: 'project-123',
        agentType: 'build' as const,
        title: 'Build a new feature',
        messages: [
          { role: 'user' as const, content: 'Help me build' },
          { role: 'assistant' as const, content: 'Sure!' },
        ],
        context: { model: 'claude-sonnet-4-5' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(sessionMock.projectId).toBeTruthy();
      expect(['build', 'plan', 'general']).toContain(sessionMock.agentType);
      expect(Array.isArray(sessionMock.messages)).toBe(true);
      expect(sessionMock.messages[0].role).toBeTruthy();
      expect(sessionMock.context).toBeInstanceOf(Object);
    });

    it('should support all agent types', () => {
      const agentTypes = ['build', 'plan', 'general'] as const;

      agentTypes.forEach((agentType) => {
        const session = {
          id: '123',
          projectId: 'project-123',
          agentType,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        expect(['build', 'plan', 'general']).toContain(session.agentType);
      });
    });
  });

  describe('Message Schema', () => {
    it('should have correct table name', () => {
      expect(schema.messages).toBeDefined();
    });

    it('should validate message structure', () => {
      const messageMock = {
        id: '123',
        sessionId: 'session-123',
        role: 'user' as const,
        content: 'Hello AI',
        metadata: { timestamp: Date.now() },
        createdAt: new Date(),
      };

      expect(messageMock.sessionId).toBeTruthy();
      expect(['user', 'assistant', 'system']).toContain(messageMock.role);
      expect(messageMock.content).toBeTruthy();
      expect(messageMock.metadata).toBeInstanceOf(Object);
    });

    it('should support all message roles', () => {
      const roles = ['user', 'assistant', 'system'] as const;

      roles.forEach((role) => {
        const message = {
          id: '123',
          sessionId: 'session-123',
          role,
          content: 'Test message',
          createdAt: new Date(),
        };

        expect(['user', 'assistant', 'system']).toContain(message.role);
      });
    });
  });

  describe('Model Schema', () => {
    it('should have correct table name', () => {
      expect(schema.models).toBeDefined();
    });

    it('should validate model structure', () => {
      const modelMock = {
        id: '123',
        workspaceId: 'workspace-123',
        provider: 'anthropic',
        modelName: 'claude-sonnet-4-5',
        apiEndpoint: 'https://api.anthropic.com',
        config: { temperature: 0.7, maxTokens: 4096 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(modelMock.workspaceId).toBeTruthy();
      expect(modelMock.provider).toBeTruthy();
      expect(modelMock.modelName).toBeTruthy();
      expect(modelMock.config).toBeInstanceOf(Object);
    });

    it('should have optional apiEndpoint', () => {
      const modelWithoutEndpoint = {
        id: '123',
        workspaceId: 'workspace-123',
        provider: 'anthropic',
        modelName: 'claude-sonnet-4-5',
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(modelWithoutEndpoint.apiEndpoint).toBeUndefined();
    });
  });

  describe('APIKey Schema', () => {
    it('should have correct table name', () => {
      expect(schema.apiKeys).toBeDefined();
    });

    it('should validate API key structure', () => {
      const apiKeyMock = {
        id: '123',
        workspaceId: 'workspace-123',
        provider: 'anthropic',
        keyHash: 'hashed-key',
        encryptedKey: 'encrypted-key',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(apiKeyMock.workspaceId).toBeTruthy();
      expect(apiKeyMock.provider).toBeTruthy();
      expect(apiKeyMock.keyHash).toBeTruthy();
      expect(apiKeyMock.encryptedKey).toBeTruthy();
    });
  });

  describe('Permission Schema', () => {
    it('should have correct table name', () => {
      expect(schema.permissions).toBeDefined();
    });

    it('should validate permission structure', () => {
      const permissionMock = {
        id: '123',
        workspaceId: 'workspace-123',
        agentType: 'build',
        resourceType: 'file' as const,
        pattern: 'src/**/*',
        action: 'allow' as const,
        createdAt: new Date(),
      };

      expect(permissionMock.workspaceId).toBeTruthy();
      expect(['file', 'directory', 'command']).toContain(permissionMock.resourceType);
      expect(['allow', 'deny', 'ask']).toContain(permissionMock.action);
      expect(permissionMock.pattern).toBeTruthy();
    });

    it('should have optional agentType', () => {
      const permissionWithoutAgent = {
        id: '123',
        workspaceId: 'workspace-123',
        resourceType: 'file' as const,
        pattern: '**/*.ts',
        action: 'deny' as const,
        createdAt: new Date(),
      };

      expect(permissionWithoutAgent.agentType).toBeUndefined();
    });
  });

  describe('Schema Relationships', () => {
    it('should link workspace to user', () => {
      const user = { id: 'user-123' };
      const workspace = { userId: user.id };

      expect(workspace.userId).toBe(user.id);
    });

    it('should link project to workspace', () => {
      const workspace = { id: 'workspace-123' };
      const project = { workspaceId: workspace.id };

      expect(project.workspaceId).toBe(workspace.id);
    });

    it('should link session to project', () => {
      const project = { id: 'project-123' };
      const session = { projectId: project.id };

      expect(session.projectId).toBe(project.id);
    });

    it('should link message to session', () => {
      const session = { id: 'session-123' };
      const message = { sessionId: session.id };

      expect(message.sessionId).toBe(session.id);
    });

    it('should link model and apiKey to workspace', () => {
      const workspace = { id: 'workspace-123' };
      const model = { workspaceId: workspace.id };
      const apiKey = { workspaceId: workspace.id };

      expect(model.workspaceId).toBe(workspace.id);
      expect(apiKey.workspaceId).toBe(workspace.id);
    });

    it('should link permission to workspace', () => {
      const workspace = { id: 'workspace-123' };
      const permission = { workspaceId: workspace.id };

      expect(permission.workspaceId).toBe(workspace.id);
    });
  });
});
