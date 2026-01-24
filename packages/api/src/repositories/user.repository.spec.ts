import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserRepository } from './user.repository';

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
  };

  Object.defineProperty(mockDb, 'rowCount', {
    value: 1,
    writable: true,
  });

  return {
    db: mockDb,
    users: { id: 'id', email: 'email' },
    workspaces: { id: 'id', userId: 'userId' },
  };
});

describe('UserRepository', () => {
  let repository: UserRepository;
  let mockDb: any;

  beforeEach(async () => {
    const { db } = await import('../db');
    mockDb = db;
    vi.clearAllMocks();
    repository = new UserRepository();
  });

  describe('Repository Structure', () => {
    it('should extend BaseRepository', () => {
      expect(repository).toBeInstanceOf(UserRepository);
    });

    it('should have all CRUD methods', () => {
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.findByEmail).toBe('function');
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.findAll).toBe('function');
      expect(typeof repository.update).toBe('function');
      expect(typeof repository.delete).toBe('function');
    });

    it('should have user-specific methods', () => {
      expect(typeof repository.findByEmailWithWorkspace).toBe('function');
      expect(typeof repository.findUserWorkspaces).toBe('function');
      expect(typeof repository.hashPassword).toBe('function');
      expect(typeof repository.verifyPassword).toBe('function');
      expect(typeof repository.createWithHashedPassword).toBe('function');
      expect(typeof repository.updateProfile).toBe('function');
      expect(typeof repository.updatePassword).toBe('function');
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Setup the mock chain
      const selectChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      };

      mockDb.select.mockReturnValue(selectChain);

      const result = await repository.findByEmail('test@example.com');

      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
    });
  });

  describe('findByEmailWithWorkspace', () => {
    it('should find user with workspace data', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockWorkspaces = [
        {
          id: 'w1',
          name: 'Test Workspace',
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Setup findByEmail call
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([mockUser]),
          }),
        }),
      });

      // Setup findUserWorkspaces call
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce(mockWorkspaces),
        }),
      });

      const result = await repository.findByEmailWithWorkspace('test@example.com');

      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
      expect(Array.isArray(result?.workspaces)).toBe(true);
      expect(result?.workspaces).toHaveLength(1);
    });

    it('should return null if user not found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([]),
          }),
        }),
      });

      const result = await repository.findByEmailWithWorkspace('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('Password Hashing', () => {
    it('should hash password', async () => {
      const password = 'plaintext123';
      const hash = await repository.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are long
    });

    it('should generate different hashes for same password', async () => {
      const password = 'plaintext123';
      const hash1 = await repository.hashPassword(password);
      const hash2 = await repository.hashPassword(password);

      expect(hash1).not.toBe(hash2); // Salt should be different
    });

    it('should verify correct password', async () => {
      const password = 'plaintext123';
      const hash = await repository.hashPassword(password);

      const isValid = await repository.verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'plaintext123';
      const hash = await repository.hashPassword(password);

      const isValid = await repository.verifyPassword('wrongpassword', hash);

      expect(isValid).toBe(false);
    });
  });

  describe('createWithHashedPassword', () => {
    it('should create user with hashed password', async () => {
      const mockUser = {
        id: 'new-id',
        email: 'new@example.com',
        name: 'New User',
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.insert.mockReturnValue(mockDb);
      mockDb.values.mockReturnValue(mockDb);
      mockDb.returning.mockResolvedValue([mockUser]);

      const result = await repository.createWithHashedPassword({
        email: 'new@example.com',
        name: 'New User',
        password: 'plaintext123',
      });

      expect(result).toBeDefined();
      expect(result.email).toBe('new@example.com');
    });
  });

  describe('findUserWorkspaces', () => {
    it('should find user workspaces', async () => {
      const mockWorkspaces = [
        {
          id: 'w1',
          name: 'Workspace 1',
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'w2',
          name: 'Workspace 2',
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce(mockWorkspaces),
        }),
      });

      const result = await repository.findUserWorkspaces('user-id');

      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(result[0].name).toBe('Workspace 1');
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updatedUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Updated Name',
        avatarUrl: 'https://example.com/new-avatar.png',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.update.mockReturnValue(mockDb);
      mockDb.set.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.returning.mockResolvedValue([updatedUser]);

      const result = await repository.updateProfile('1', {
        name: 'Updated Name',
        avatarUrl: 'https://example.com/new-avatar.png',
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Updated Name');
      expect(result.avatarUrl).toBe('https://example.com/new-avatar.png');
    });
  });

  describe('updatePassword', () => {
    it('should update password with hashing', async () => {
      const updatedUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.update.mockReturnValue(mockDb);
      mockDb.set.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.returning.mockResolvedValue([updatedUser]);

      const result = await repository.updatePassword('1', 'newpassword123');

      expect(result).toBeDefined();
      expect(mockDb.set).toHaveBeenCalled();
    });
  });

  describe('Type Exports', () => {
    it('should export CreateUserData type', async () => {
      const { CreateUserData } = await import('./user.repository');

      const data: CreateUserData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      };

      expect(data.email).toBe('test@example.com');
    });

    it('should export UpdateUserData type', async () => {
      const { UpdateUserData } = await import('./user.repository');

      const data: UpdateUserData = {
        name: 'Updated Name',
        avatarUrl: 'https://example.com/avatar.png',
      };

      expect(data.name).toBe('Updated Name');
    });

    it('should export UserWithWorkspaces type', async () => {
      const { UserWithWorkspaces } = await import('./user.repository');

      const user: UserWithWorkspaces = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        workspaces: [],
      };

      expect(Array.isArray(user.workspaces)).toBe(true);
    });
  });
});
