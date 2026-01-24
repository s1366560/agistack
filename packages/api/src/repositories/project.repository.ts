import { eq } from 'drizzle-orm';
import { projects, workspaces, type Project, type NewProject } from '../db/schema';
import { BaseRepository } from './base';

export type CreateProjectData = {
  workspaceId: string;
  name: string;
  path: string;
  description?: NewProject['description'];
  metadata?: NewProject['metadata'];
};

export type UpdateProjectData = {
  name?: string;
  path?: string;
  description?: NewProject['description'];
  metadata?: NewProject['metadata'];
};

export type ProjectWithWorkspace = Project & {
  workspace: {
    id: string;
    userId: string;
    name: string;
    settings: any;
    createdAt: Date;
    updatedAt: Date;
  };
};

export class ProjectRepository extends BaseRepository<Project> {
  constructor() {
    super(projects);
  }

  /**
   * Validate project name
   */
  private validateName(name: string): void {
    if (!name || typeof name !== 'string') {
      throw new Error('Project name is required');
    }

    const trimmedName = name.trim();
    if (trimmedName === '') {
      throw new Error('Project name is required');
    }
  }

  /**
   * Validate and sanitize project path (must be absolute)
   */
  private sanitizePath(path: string): string {
    if (!path || typeof path !== 'string') {
      throw new Error('Project path is required');
    }

    const trimmedPath = path.trim();
    if (trimmedPath === '') {
      throw new Error('Project path is required');
    }

    // Check if path is absolute (starts with / or a drive letter like C:)
    const isAbsolutePath = /^([a-zA-Z]:)?[/\\]/.test(trimmedPath);
    if (!isAbsolutePath) {
      throw new Error('Project path must be absolute');
    }

    return trimmedPath;
  }

  /**
   * Trim and return validated project name
   */
  private sanitizeName(name: string): string {
    this.validateName(name);
    return name.trim();
  }

  /**
   * Find all projects in a workspace
   */
  async findByWorkspaceId(workspaceId: string): Promise<Project[]> {
    return this.findMany(eq(projects.workspaceId, workspaceId));
  }

  /**
   * Find project with workspace data
   */
  async findWithWorkspace(projectId: string): Promise<ProjectWithWorkspace | null> {
    const result = await this.db
      .select({
        id: projects.id,
        workspaceId: projects.workspaceId,
        name: projects.name,
        path: projects.path,
        description: projects.description,
        metadata: projects.metadata,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        workspace: {
          id: workspaces.id,
          userId: workspaces.userId,
          name: workspaces.name,
          settings: workspaces.settings,
          createdAt: workspaces.createdAt,
          updatedAt: workspaces.updatedAt,
        },
      })
      .from(projects)
      .innerJoin(workspaces, eq(workspaces.id, projects.workspaceId))
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!result || result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      name: row.name,
      path: row.path,
      description: row.description,
      metadata: row.metadata,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      workspace: row.workspace,
    };
  }

  /**
   * Create project
   */
  async create(data: CreateProjectData): Promise<Project> {
    const sanitizedName = this.sanitizeName(data.name);
    const sanitizedPath = this.sanitizePath(data.path);

    const newProject: NewProject = {
      workspaceId: data.workspaceId,
      name: sanitizedName,
      path: sanitizedPath,
      description: data.description ?? null,
      metadata: data.metadata ?? null,
    };

    const [inserted] = await this.db
      .insert(projects)
      .values(newProject)
      .returning();

    if (!inserted) {
      throw new Error('Failed to create project');
    }

    return inserted;
  }

  /**
   * Update project
   */
  async update(projectId: string, data: UpdateProjectData): Promise<Project | null> {
    const updateData: Partial<NewProject> = {};

    if (data.name !== undefined) {
      updateData.name = this.sanitizeName(data.name);
    }
    if (data.path !== undefined) {
      updateData.path = this.sanitizePath(data.path);
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.metadata !== undefined) {
      updateData.metadata = data.metadata;
    }

    const [updated] = await this.db
      .update(projects)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .returning();

    if (!updated) {
      return null;
    }

    return updated;
  }

  /**
   * Delete project
   */
  async delete(projectId: string): Promise<boolean> {
    const result = await this.db
      .delete(projects)
      .where(eq(projects.id, projectId))
      .returning();

    return result.length > 0;
  }

  /**
   * Find all projects
   */
  async findAll(): Promise<Project[]> {
    return this.findMany();
  }
}
