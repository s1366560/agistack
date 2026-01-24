import { db } from '../db';
import { PgTable } from 'drizzle-orm/pg-core';
import { SQL, eq, and, desc } from 'drizzle-orm';

export interface PaginationOptions {
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface FindOptions {
  limit?: number;
  offset?: number;
  orderBy?: SQL;
  where?: SQL;
}

/**
 * Base repository class providing common CRUD operations
 * @template T - The entity type
 */
export abstract class BaseRepository<T extends { id: string }> {
  protected readonly db = db;
  protected readonly table: PgTable;

  constructor(table: PgTable) {
    this.table = table;
  }

  /**
   * Create a single entity
   */
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const [entity] = await this.db
      .insert(this.table)
      .values(data as any)
      .returning();
    return entity as T;
  }

  /**
   * Create multiple entities
   */
  async createMany(
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>[]
  ): Promise<T[]> {
    if (data.length === 0) return [];

    const entities = await this.db
      .insert(this.table)
      .values(data as any[])
      .returning();
    return entities as T[];
  }

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<T | null> {
    try {
      const [entity] = await this.db
        .select()
        .from(this.table)
        .where(eq(this.table.id as any, id))
        .limit(1);

      return (entity as T) || null;
    } catch {
      return null;
    }
  }

  /**
   * Find all entities
   */
  async findAll(options?: FindOptions): Promise<T[]> {
    let query = this.db.select().from(this.table) as any;

    if (options?.where) {
      query = query.where(options.where);
    }

    if (options?.orderBy) {
      query = query.orderBy(options.orderBy);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return (await query) as T[];
  }

  /**
   * Find entities with custom filters
   */
  async findMany(...conditions: SQL[]): Promise<T[]> {
    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

    let query = this.db.select().from(this.table) as any;

    if (whereClause) {
      query = query.where(whereClause);
    }

    return (await query) as T[];
  }

  /**
   * Find one entity with filters
   */
  async findOne(...conditions: SQL[]): Promise<T | null> {
    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

    try {
      let query = this.db.select().from(this.table) as any;

      if (whereClause) {
        query = query.where(whereClause);
      }

      const [entity] = await query.limit(1);
      return (entity as T) || null;
    } catch {
      return null;
    }
  }

  /**
   * Count all entities
   */
  async count(...conditions: SQL[]): Promise<number> {
    if (conditions.length === 0) {
      const result = await this.db
        .select({ count: this.table.id as any })
        .from(this.table);
      return result.length;
    }

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

    const result = await this.db
      .select({ count: this.table.id as any })
      .from(this.table)
      .where(whereClause as any);

    return result.length;
  }

  /**
   * Check if entity exists
   */
  async exists(id: string): Promise<boolean> {
    const entity = await this.findById(id);
    return entity !== null;
  }

  /**
   * Update entity by ID
   */
  async update(
    id: string,
    data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<T | null> {
    try {
      const [entity] = await this.db
        .update(this.table)
        .set({ ...data, updatedAt: new Date() } as any)
        .where(eq(this.table.id as any, id))
        .returning();

      return (entity as T) || null;
    } catch {
      return null;
    }
  }

  /**
   * Update multiple entities
   */
  async updateMany(
    where: SQL,
    data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<number> {
    const result = await this.db
      .update(this.table)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(where);

    return result.rowCount || 0;
  }

  /**
   * Delete entity by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.db
        .delete(this.table)
        .where(eq(this.table.id as any, id));

      return (result.rowCount || 0) > 0;
    } catch {
      return false;
    }
  }

  /**
   * Delete multiple entities
   */
  async deleteMany(where: SQL): Promise<number> {
    const result = await this.db.delete(this.table).where(where);
    return result.rowCount || 0;
  }

  /**
   * Execute operations in a transaction
   */
  async transaction<R>(
    callback: (tx: typeof db) => Promise<R>
  ): Promise<R> {
    return this.db.transaction(callback);
  }

  /**
   * Paginate results
   */
  async paginate(options: PaginationOptions): Promise<PaginatedResult<T>> {
    const { limit, offset } = options;

    // Get total count
    const total = await this.count();

    // Get paginated data
    const data = await this.findAll({ limit, offset });

    return {
      data,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Truncate all records (use with caution)
   */
  async truncate(): Promise<void> {
    await this.db.delete(this.table);
  }
}
