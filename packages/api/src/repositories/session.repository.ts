import { eq, desc, and } from 'drizzle-orm';
import { sessions, messages, projects, workspaces, type Session, type NewSession } from '../db/schema';
import { BaseRepository } from './base';
import type { AgentType, MessageRole } from '../db/schema';

export type CreateSessionData = {
  projectId: string;
  agentType: AgentType;
  title?: string | null;
  messages?: NewSession['messages'];
  context?: NewSession['context'];
};

export type UpdateSessionData = {
  title?: string | null;
  messages?: NewSession['messages'];
  context?: NewSession['context'];
};

export type SessionMessage = {
  role: MessageRole;
  content: string;
  metadata?: Record<string, any>;
};

export type SessionWithProject = Session & {
  project: {
    id: string;
    workspaceId: string;
    name: string;
    path: string;
    description: string | null;
    metadata: Record<string, any> | null;
    createdAt: Date;
    updatedAt: Date;
    workspace: {
      id: string;
      userId: string;
      name: string;
      settings: Record<string, any> | null;
      createdAt: Date;
      updatedAt: Date;
    };
  };
};

/**
 * Valid agent types
 */
const VALID_AGENT_TYPES: AgentType[] = ['build', 'plan', 'general'];

export class SessionRepository extends BaseRepository<Session> {
  constructor() {
    super(sessions);
  }

  /**
   * Validate agent type
   */
  private validateAgentType(agentType: AgentType): void {
    if (!agentType || typeof agentType !== 'string') {
      throw new Error('Agent type is required and must be a string');
    }

    if (!VALID_AGENT_TYPES.includes(agentType)) {
      throw new Error(
        `Invalid agent type: ${agentType}. Must be one of: ${VALID_AGENT_TYPES.join(', ')}`
      );
    }
  }

  /**
   * Validate and sanitize project ID
   */
  private validateProjectId(projectId: string): void {
    if (!projectId || typeof projectId !== 'string') {
      throw new Error('Project ID is required and must be a string');
    }

    if (projectId.trim() === '') {
      throw new Error('Project ID cannot be empty');
    }
  }

  /**
   * Sanitize title by trimming whitespace
   */
  private sanitizeTitle(title: string | null | undefined): string | null {
    if (title === null || title === undefined) {
      return null;
    }

    if (typeof title !== 'string') {
      throw new Error('Title must be a string or null');
    }

    const trimmed = title.trim();
    if (trimmed === '') {
      return null;
    }

    return trimmed;
  }

  /**
   * Find all sessions for a project
   */
  async findByProjectId(projectId: string): Promise<Session[]> {
    return this.findMany(
      eq(sessions.projectId, projectId)
    ).then(sessions => sessions.sort((a, b) =>
      b.updatedAt.getTime() - a.updatedAt.getTime()
    ));
  }

  /**
   * Find sessions by agent type within a project
   */
  async findByAgentType(projectId: string, agentType: AgentType): Promise<Session[]> {
    return this.findMany(
      eq(sessions.projectId, projectId),
      eq(sessions.agentType, agentType)
    );
  }

  /**
   * Find session with project data
   */
  async findWithProject(sessionId: string): Promise<SessionWithProject | null> {
    const result = await this.db
      .select({
        id: sessions.id,
        projectId: sessions.projectId,
        agentType: sessions.agentType,
        title: sessions.title,
        messages: sessions.messages,
        context: sessions.context,
        createdAt: sessions.createdAt,
        updatedAt: sessions.updatedAt,
        project: {
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
        },
      })
      .from(sessions)
      .innerJoin(projects, eq(projects.id, sessions.projectId))
      .innerJoin(workspaces, eq(workspaces.id, projects.workspaceId))
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (!result || result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      id: row.id,
      projectId: row.projectId,
      agentType: row.agentType,
      title: row.title,
      messages: row.messages,
      context: row.context,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      project: row.project,
    };
  }

  /**
   * Add a message to session messages array
   */
  async addMessage(sessionId: string, message: SessionMessage): Promise<Session | null> {
    const session = await this.findById(sessionId);

    if (!session) {
      return null;
    }

    const updatedMessages = [
      ...(session.messages || []),
      message,
    ];

    return this.update(sessionId, { messages: updatedMessages });
  }

  /**
   * Clear all messages from session
   */
  async clearMessages(sessionId: string): Promise<Session | null> {
    return this.update(sessionId, { messages: [] });
  }

  /**
   * Count sessions by project
   */
  async countByProject(projectId: string): Promise<number> {
    return this.count(eq(sessions.projectId, projectId));
  }

  /**
   * Find recent sessions for a project
   */
  async findRecentByProject(projectId: string, limit: number): Promise<Session[]> {
    return this.findAll({
      where: eq(sessions.projectId, projectId),
      orderBy: desc(sessions.updatedAt),
      limit,
    });
  }

  /**
   * Create session
   */
  async create(data: CreateSessionData): Promise<Session> {
    this.validateProjectId(data.projectId);
    this.validateAgentType(data.agentType);

    const newSession: NewSession = {
      projectId: data.projectId,
      agentType: data.agentType,
      title: this.sanitizeTitle(data.title ?? null),
      messages: data.messages ?? [],
      context: data.context ?? {},
    };

    const [inserted] = await this.db
      .insert(sessions)
      .values(newSession)
      .returning();

    if (!inserted) {
      throw new Error('Failed to create session');
    }

    return inserted;
  }

  /**
   * Update session
   */
  async update(sessionId: string, data: UpdateSessionData): Promise<Session | null> {
    const updateData: Partial<NewSession> = {};

    if (data.title !== undefined) {
      updateData.title = this.sanitizeTitle(data.title);
    }
    if (data.messages !== undefined) {
      updateData.messages = data.messages;
    }
    if (data.context !== undefined) {
      updateData.context = data.context;
    }

    const [updated] = await this.db
      .update(sessions)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(sessions.id, sessionId))
      .returning();

    if (!updated) {
      return null;
    }

    return updated;
  }

  /**
   * Delete session
   */
  async delete(sessionId: string): Promise<boolean> {
    const result = await this.db
      .delete(sessions)
      .where(eq(sessions.id, sessionId))
      .returning();

    return result.length > 0;
  }

  /**
   * Find all sessions
   */
  async findAll(options?: import('./base').FindOptions): Promise<Session[]> {
    // If no options, use base findAll
    if (!options) {
      return this.findMany();
    }
    // Otherwise use base findAll with options
    return super.findAll(options);
  }
}
