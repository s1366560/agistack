import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkspaceRepository } from './workspace.repository';

// Mock db module
vi.mock('../db', () => {
  const mockDb = {
    select: vi.fn(() => mockDb),
    insert: vi.fn(() => mockDb),
    update: vi.fn(() => mockDb),
    delete: vi.fn(() => mockDb),
    from: vi.fn(() => mockDb),
    values: vi.fn(() => mockDb),
    set: vi.fn(() => mockDb),
    where: vi.fn(() => mockDb),
    orderBy: vi.fn(() => mockDb),
    limit: vi.fn(() => mockDb),
    offset: vi.fn(() => mockDb),
    returning: vi.fn(() => mockDb),
    execute: vi.fn(),
    transaction: vi.fn(),
    leftJoin: vi.fn(() => mockDb),
    innerJoin: vi.fn(() => mockDb),
    groupBy: vi.fn(() => mockDb),
  };

  Object.defineProperty(mockDb, 'rowCount', {
    value: 1,
    writable: true,
  });

  return {
    db: mockDb,
    users: { id: 'id' },
    workspaces: { id: 'id', userId: 'userId' },
    projects: { id: 'id', workspaceId: 'workspaceId' },
  };
});

describe('WorkspaceRepository', () => {
  let repository: WorkspaceRepository;
  let mockDb: any;

  beforeEach(async () => {
    const { db } = await import('../db');
    mockDb = db;
    vi.clearAllMocks();
    repository = new WorkspaceRepository();
  });

  describe('Repository Structure', () => {
    it('should extend BaseRepository', () => {
      expect(repository).toBeInstanceOf(WorkspaceRepository);
    });

    it('should have all CRUD methods', () => {
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.findAll).toBe('function');
      expect(typeof repository.update).toBe('function');
      expect(typeof repository.delete).toBe('function');
    });

    it('should have workspace-specific methods', () => {
      expect(typeof repository.findByUserId).toBe('function');
      expect(typeof repository.findWithProjects).toBe('function');
      expect(typeof repository.findWithOwner).toBe('function');
      expect(typeof repository.updateSettings).toBe('function');
    });
  });

  describe('findByUserId', () => {
    it('should find workspaces by user ID', async () => {
      const mockWorkspaces = [
        {
          id: 'w1',
          userId: 'user-1',
          name: 'Workspace 1',
          settings: { theme: 'dark' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'w2',
          userId: 'user-1',
          name: 'Workspace 2',
          settings: { theme: 'light' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce(mockWorkspaces),
        }),
      });

      const result = await repository.findByUserId('user-1');

      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(result[0].name).toBe('Workspace 1');
      expect(result[1].name).toBe('Workspace 2');
    });

    it('should return empty array if no workspaces found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      const result = await repository.findByUserId('nonexistent-user');

      expect(result).toEqual([]);
    });
  });

  describe('findWithProjects', () => {
    it('should find workspace with project count', async () => {
      const mockWorkspace = {
        id: 'w1',
        userId: 'user-1',
        name: 'Test Workspace',
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        projectCount: '5',
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          leftJoin: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              groupBy: vi.fn().mockReturnValueOnce({
                limit: vi.fn().mockResolvedValueOnce([mockWorkspace]),
              }),
            }),
          }),
        }),
      });

      const result = await repository.findWithProjects('w1');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Test Workspace');
      expect(result?.projectCount).toBeDefined();
    });

    it('should return null if workspace not found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          leftJoin: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              groupBy: vi.fn().mockReturnValueOnce({
                limit: vi.fn().mockResolvedValueOnce([]),
              }),
            }),
          }),
        }),
      });

      const result = await repository.findWithProjects('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findWithOwner', () => {
    it('should find workspace with owner user', async () => {
      const mockWorkspace = {
        id: 'w1',
        userId: 'user-1',
        name: 'Test Workspace',
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: {
          id: 'user-1',
          email: 'owner@example.com',
          name: 'Owner Name',
          avatarUrl: null,
        },
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          innerJoin: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce([mockWorkspace]),
            }),
          }),
        }),
      });

      const result = await repository.findWithOwner('w1');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Test Workspace');
      expect(result?.owner).toBeDefined();
      expect(result?.owner.email).toBe('owner@example.com');
    });
  });

  describe('updateSettings', () => {
    it('should update workspace settings', async () => {
      const updatedWorkspace = {
        id: 'w1',
        userId: 'user-1',
        name: 'Test Workspace',
        settings: {
          theme: 'dark',
          notifications: { email: true, push: false },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.update.mockReturnValue(mockDb);
      mockDb.set.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.returning.mockResolvedValueOnce([updatedWorkspace]);

      const result = await repository.updateSettings('w1', {
        theme: 'dark',
        notifications: { email: true, push: false },
      });

      expect(result).toBeDefined();
      expect(result.settings.theme).toBe('dark');
      expect(result.settings.notifications.email).toBe(true);
    });
  });

  describe('create', () => {
    it('should create workspace with default settings', async () => {
      const mockWorkspace = {
        id: 'w1',
        userId: 'user-1',
        name: 'New Workspace',
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.insert.mockReturnValue(mockDb);
      mockDb.values.mockReturnValue(mockDb);
      mockDb.returning.mockResolvedValueOnce([mockWorkspace]);

      const result = await repository.create({
        userId: 'user-1',
        name: 'New Workspace',
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('New Workspace');
    });

    it('should create workspace with custom settings', async () => {
      const mockWorkspace = {
        id: 'w1',
        userId: 'user-1',
        name: 'Custom Workspace',
        settings: { theme: 'dark' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.insert.mockReturnValue(mockDb);
      mockDb.values.mockReturnValue(mockDb);
      mockDb.returning.mockResolvedValueOnce([mockWorkspace]);

      const result = await repository.create({
        userId: 'user-1',
        name: 'Custom Workspace',
        settings: { theme: 'dark' },
      });

      expect(result).toBeDefined();
      expect(result.settings.theme).toBe('dark');
    });
  });

  describe('delete', () => {
    it('should delete workspace and return true', async () => {
      mockDb.delete.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      Object.defineProperty(mockDb, 'rowCount', { value: 1 });

      const result = await repository.delete('w1');

      expect(result).toBe(true);
    });

    it('should return false when workspace not found', async () => {
      mockDb.delete.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      Object.defineProperty(mockDb, 'rowCount', { value: 0 });

      const result = await repository.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('Type Exports', () => {
    it('should export CreateWorkspaceData type', async () => {
      const { CreateWorkspaceData } = await import('./workspace.repository');

      const data: CreateWorkspaceData = {
        userId: 'user-1',
        name: 'Test Workspace',
        settings: { theme: 'dark' },
      };

      expect(data.name).toBe('Test Workspace');
    });

    it('should export UpdateWorkspaceData type', async () => {
      const { UpdateWorkspaceData } = await import('./workspace.repository');

      const data: UpdateWorkspaceData = {
        name: 'Updated Name',
        settings: { theme: 'light' },
      };

      expect(data.name).toBe('Updated Name');
    });
  });
});
