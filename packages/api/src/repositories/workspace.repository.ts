import { eq, sql, count } from 'drizzle-orm';
import { workspaces, users, projects, type Workspace, type NewWorkspace } from '../db/schema';
import { BaseRepository } from './base';

export type CreateWorkspaceData = {
  userId: string;
  name: string;
  settings?: NewWorkspace['settings'];
};

export type UpdateWorkspaceData = {
  name?: string;
  settings?: NewWorkspace['settings'];
};

export type WorkspaceWithProjectCount = Workspace & {
  projectCount: number;
};

export type WorkspaceWithOwner = Workspace & {
  owner: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  };
};

export class WorkspaceRepository extends BaseRepository<Workspace> {
  constructor() {
    super(workspaces);
  }

  /**
   * Find all workspaces for a user
   */
  async findByUserId(userId: string): Promise<Workspace[]> {
    return this.findMany(eq(workspaces.userId, userId));
  }

  /**
   * Find workspace with project count
   */
  async findWithProjects(workspaceId: string): Promise<WorkspaceWithProjectCount | null> {
    const result = await this.db
      .select({
        id: workspaces.id,
        userId: workspaces.userId,
        name: workspaces.name,
        settings: workspaces.settings,
        createdAt: workspaces.createdAt,
        updatedAt: workspaces.updatedAt,
        projectCount: count(projects.id),
      })
      .from(workspaces)
      .leftJoin(projects, eq(projects.workspaceId, workspaces.id))
      .where(eq(workspaces.id, workspaceId))
      .groupBy(workspaces.id)
      .limit(1);

    if (!result || result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      settings: row.settings,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      projectCount: Number(row.projectCount),
    };
  }

  /**
   * Find workspace with owner user
   */
  async findWithOwner(workspaceId: string): Promise<WorkspaceWithOwner | null> {
    const result = await this.db
      .select({
        id: workspaces.id,
        userId: workspaces.userId,
        name: workspaces.name,
        settings: workspaces.settings,
        createdAt: workspaces.createdAt,
        updatedAt: workspaces.updatedAt,
        owner: {
          id: users.id,
          email: users.email,
          name: users.name,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(workspaces)
      .innerJoin(users, eq(users.id, workspaces.userId))
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!result || result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      settings: row.settings,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      owner: row.owner,
    };
  }

  /**
   * Update workspace settings
   */
  async updateSettings(
    workspaceId: string,
    settings: NewWorkspace['settings']
  ): Promise<Workspace | null> {
    return this.update(workspaceId, { settings });
  }

  /**
   * Create workspace
   */
  async create(data: CreateWorkspaceData): Promise<Workspace> {
    const newWorkspace: NewWorkspace = {
      userId: data.userId,
      name: data.name,
      settings: data.settings ?? null,
    };

    const [inserted] = await this.db
      .insert(workspaces)
      .values(newWorkspace)
      .returning();

    if (!inserted) {
      throw new Error('Failed to create workspace');
    }

    return inserted;
  }

  /**
   * Update workspace
   */
  async update(
    workspaceId: string,
    data: UpdateWorkspaceData
  ): Promise<Workspace | null> {
    const updateData: Partial<NewWorkspace> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.settings !== undefined) updateData.settings = data.settings;

    const [updated] = await this.db
      .update(workspaces)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(workspaces.id, workspaceId))
      .returning();

    if (!updated) {
      return null;
    }

    return updated;
  }

  /**
   * Delete workspace
   */
  async delete(workspaceId: string): Promise<boolean> {
    const result = await this.db
      .delete(workspaces)
      .where(eq(workspaces.id, workspaceId));

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Find all workspaces
   */
  async findAll(): Promise<Workspace[]> {
    return this.findMany();
  }
}
