import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Database connection singleton
 */
let client: postgres.Sql | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

/**
 * Get database connection
 */
export function getDatabase() {
  if (!dbInstance) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    client = postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    dbInstance = drizzle(client, { schema });
  }

  return dbInstance;
}

/**
 * Internal db instance (can be overridden for tests)
 */
let _dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Export db instance for convenience
 * This calls getDatabase() internally
 */
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(target, prop) {
    const instance = _dbInstance || getDatabase();
    return instance[prop as keyof typeof instance];
  },
});

/**
 * Set database instance (for testing)
 */
export function setDatabase(db: ReturnType<typeof drizzle<typeof schema>>) {
  _dbInstance = db;
}

/**
 * Reset database instance (for testing)
 */
export function resetDatabase() {
  _dbInstance = null;
}

/**
 * Close database connection
 */
export async function closeDatabase() {
  if (client) {
    await client.end();
    client = null;
    dbInstance = null;
  }
}

/**
 * Database type
 */
export type Database = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Export schema for use in queries
 */
export * from './schema';
