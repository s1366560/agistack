import { eq } from 'drizzle-orm';
import { users, workspaces, type User, type NewUser } from '../db/schema';
import { BaseRepository } from './base';
import bcrypt from 'bcrypt';

/**
 * Email validation regex (simple but effective)
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CreateUserData = {
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  password?: string; // For creating with password
};

export type UpdateUserData = {
  email?: string;
  name?: string | null;
  avatarUrl?: string | null;
};

export type UserWithWorkspaces = User & {
  workspaces: Array<{
    id: string;
    name: string;
    settings: any;
    createdAt: Date;
    updatedAt: Date;
  }>;
};

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super(users);
  }

  /**
   * Validate email format
   */
  private validateEmail(email: string): void {
    if (!email || typeof email !== 'string') {
      throw new Error('Email is required and must be a string');
    }

    if (email.trim() === '') {
      throw new Error('Email cannot be empty');
    }

    if (!EMAIL_REGEX.test(email)) {
      throw new Error('Invalid email format');
    }
  }

  /**
   * Find user by email address
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.findOne(eq(users.email, email));
  }

  /**
   * Find user by email with their workspaces
   */
  async findByEmailWithWorkspace(email: string): Promise<UserWithWorkspaces | null> {
    const user = await this.findByEmail(email);

    if (!user) {
      return null;
    }

    const userWorkspaces = await this.findUserWorkspaces(user.id);

    return {
      ...user,
      workspaces: userWorkspaces,
    };
  }

  /**
   * Find all workspaces for a user
   */
  async findUserWorkspaces(userId: string) {
    const result = await this.db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        settings: workspaces.settings,
        createdAt: workspaces.createdAt,
        updatedAt: workspaces.updatedAt,
      })
      .from(workspaces)
      .where(eq(workspaces.userId, userId));

    return result;
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Create user with hashed password
   */
  async createWithHashedPassword(data: CreateUserData): Promise<User> {
    let userData: any = {
      email: data.email,
      name: data.name ?? null,
      avatarUrl: data.avatarUrl ?? null,
    };

    // If password provided, hash it
    if (data.password) {
      const hashedPassword = await this.hashPassword(data.password);
      // Note: We'd need to add passwordHash field to schema
      // For now, this is a placeholder for when auth is implemented
      userData.passwordHash = hashedPassword;
    }

    return this.create(userData);
  }

  /**
   * Update user profile (name, avatarUrl)
   */
  async updateProfile(userId: string, data: Pick<UpdateUserData, 'name' | 'avatarUrl'>) {
    return this.update(userId, data);
  }

  /**
   * Update user password
   */
  async updatePassword(userId: string, newPassword: string) {
    const hashedPassword = await this.hashPassword(newPassword);
    // Note: This would require passwordHash field in schema
    // For now, placeholder implementation
    return this.update(userId, { passwordHash: hashedPassword } as any);
  }

  /**
   * Create user (without password)
   */
  async create(data: Omit<CreateUserData, 'password'>): Promise<User> {
    // Validate email
    this.validateEmail(data.email);

    const newUser: NewUser = {
      email: data.email,
      name: data.name ?? null,
      avatarUrl: data.avatarUrl ?? null,
    };

    const [inserted] = await this.db
      .insert(users)
      .values(newUser)
      .returning();

    if (!inserted) {
      throw new Error('Failed to create user');
    }

    return inserted;
  }

  /**
   * Update user
   */
  async update(id: string, data: UpdateUserData): Promise<User | null> {
    const updateData: Partial<NewUser> = {};

    if (data.email !== undefined) {
      this.validateEmail(data.email);
      updateData.email = data.email;
    }
    if (data.name !== undefined) updateData.name = data.name;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

    const [updated] = await this.db
      .update(users)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (!updated) {
      return null;
    }

    return updated;
  }

  /**
   * Delete user
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(users).where(eq(users.id, id)).returning();

    return result.length > 0;
  }

  /**
   * Find all users
   */
  async findAll(): Promise<User[]> {
    return this.findMany();
  }
}
