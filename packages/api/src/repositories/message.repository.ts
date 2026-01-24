import { eq, desc, and } from 'drizzle-orm';
import { messages, type Message, type NewMessage } from '../db/schema';
import { BaseRepository } from './base';
import type { MessageRole } from '../db/schema';

export type CreateMessageData = {
  sessionId: string;
  role: MessageRole;
  content: string;
  metadata?: NewMessage['metadata'];
};

export type UpdateMessageData = {
  content?: string;
  metadata?: NewMessage['metadata'];
};

/**
 * Valid message roles
 */
const VALID_MESSAGE_ROLES: MessageRole[] = ['user', 'assistant', 'system'];

export class MessageRepository extends BaseRepository<Message> {
  constructor() {
    super(messages);
  }

  /**
   * Validate message role
   */
  private validateRole(role: MessageRole): void {
    if (!role || typeof role !== 'string') {
      throw new Error('Message role is required and must be a string');
    }

    if (!VALID_MESSAGE_ROLES.includes(role)) {
      throw new Error(
        `Invalid message role: ${role}. Must be one of: ${VALID_MESSAGE_ROLES.join(', ')}`
      );
    }
  }

  /**
   * Validate and sanitize session ID
   */
  private validateSessionId(sessionId: string): void {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('Session ID is required and must be a string');
    }

    if (sessionId.trim() === '') {
      throw new Error('Session ID cannot be empty');
    }
  }

  /**
   * Validate and sanitize content
   */
  private validateContent(content: string): string {
    if (!content || typeof content !== 'string') {
      throw new Error('Message content is required and must be a string');
    }

    const trimmed = content.trim();
    if (trimmed === '') {
      throw new Error('Message content cannot be empty');
    }

    return trimmed;
  }

  /**
   * Sanitize metadata (null if undefined)
   */
  private sanitizeMetadata(metadata: NewMessage['metadata']): NewMessage['metadata'] {
    return metadata === undefined ? null : metadata;
  }

  /**
   * Find all messages for a session
   */
  async findBySessionId(sessionId: string): Promise<Message[]> {
    return this.findMany(eq(messages.sessionId, sessionId));
  }

  /**
   * Find messages by role within a session
   */
  async findByRole(sessionId: string, role: MessageRole): Promise<Message[]> {
    return this.findMany(
      eq(messages.sessionId, sessionId),
      eq(messages.role, role)
    );
  }

  /**
   * Count messages by session
   */
  async countBySession(sessionId: string): Promise<number> {
    return this.count(eq(messages.sessionId, sessionId));
  }

  /**
   * Find recent messages for a session
   */
  async findRecentBySession(sessionId: string, limit: number): Promise<Message[]> {
    return this.findAll({
      where: eq(messages.sessionId, sessionId),
      orderBy: desc(messages.createdAt),
      limit,
    });
  }

  /**
   * Find the latest message for a session
   */
  async findLatestBySession(sessionId: string): Promise<Message | null> {
    const results = await this.findAll({
      where: eq(messages.sessionId, sessionId),
      orderBy: desc(messages.createdAt),
      limit: 1,
    });

    return results.length > 0 ? results[0] : null;
  }

  /**
   * Paginate messages by session
   */
  async paginateBySession(
    sessionId: string,
    options: { limit: number; offset: number }
  ): Promise<{
    data: Message[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  }> {
    const total = await this.countBySession(sessionId);
    const data = await this.findAll({
      where: eq(messages.sessionId, sessionId),
      limit: options.limit,
      offset: options.offset,
    });

    return {
      data,
      total,
      limit: options.limit,
      offset: options.offset,
      hasMore: options.offset + options.limit < total,
    };
  }

  /**
   * Delete all messages for a session
   */
  async deleteBySession(sessionId: string): Promise<number> {
    const result = await this.db
      .delete(messages)
      .where(eq(messages.sessionId, sessionId))
      .returning();

    return result.length;
  }

  /**
   * Create message
   */
  async create(data: CreateMessageData): Promise<Message> {
    this.validateSessionId(data.sessionId);
    this.validateRole(data.role);
    const sanitizedContent = this.validateContent(data.content);

    const newMessage: NewMessage = {
      sessionId: data.sessionId,
      role: data.role,
      content: sanitizedContent,
      metadata: this.sanitizeMetadata(data.metadata),
    };

    const [inserted] = await this.db
      .insert(messages)
      .values(newMessage)
      .returning();

    if (!inserted) {
      throw new Error('Failed to create message');
    }

    return inserted;
  }

  /**
   * Update message
   */
  async update(messageId: string, data: UpdateMessageData): Promise<Message | null> {
    const updateData: Partial<NewMessage> = {};

    if (data.content !== undefined) {
      updateData.content = this.validateContent(data.content);
    }
    if (data.metadata !== undefined) {
      updateData.metadata = this.sanitizeMetadata(data.metadata);
    }

    // If no fields to update, return null (sessionId and role cannot be updated)
    if (Object.keys(updateData).length === 0) {
      return null;
    }

    const [updated] = await this.db
      .update(messages)
      .set(updateData)
      .where(eq(messages.id, messageId))
      .returning();

    if (!updated) {
      return null;
    }

    return updated;
  }

  /**
   * Delete message
   */
  async delete(messageId: string): Promise<boolean> {
    const result = await this.db
      .delete(messages)
      .where(eq(messages.id, messageId))
      .returning();

    return result.length > 0;
  }

  /**
   * Create many messages with validation
   */
  async createMany(data: CreateMessageData[]): Promise<Message[]> {
    if (data.length === 0) return [];

    // Validate all messages before insertion
    for (const item of data) {
      this.validateSessionId(item.sessionId);
      this.validateRole(item.role);
      this.validateContent(item.content);
    }

    const newMessages: NewMessage[] = data.map(item => ({
      sessionId: item.sessionId,
      role: item.role,
      content: this.validateContent(item.content),
      metadata: this.sanitizeMetadata(item.metadata),
    }));

    return super.createMany(newMessages);
  }

  /**
   * Find all messages
   */
  async findAll(options?: import('./base').FindOptions): Promise<Message[]> {
    if (!options) {
      return this.findMany();
    }
    return super.findAll(options);
  }
}
