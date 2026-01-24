import { beforeAll, afterEach, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../src/db/schema';
import { setDatabase, resetDatabase } from '../src/db';
import { randomUUID } from 'node:crypto';

// In-memory SQLite database for testing
let sqlite: Database.Database | null = null;
let testDb: ReturnType<typeof drizzle> | null = null;

// Custom UUID function for SQLite
function gen_random_uuid() {
  return randomUUID();
}

// Custom now() function for SQLite
// Returns ISO string for SQLite storage
function now() {
  return new Date().toISOString();
}

beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';

  // Create in-memory SQLite database
  sqlite = new Database(':memory:');

  // Enable foreign keys
  sqlite.pragma('foreign_keys = ON');

  // Register custom functions for SQLite
  sqlite.function('gen_random_uuid', gen_random_uuid);
  sqlite.function('now', now);
  sqlite.function('current_timestamp', () => new Date().toISOString());

  testDb = drizzle(sqlite, { schema });

  // Set the test database globally
  setDatabase(testDb as any);

  // Create tables manually with proper schema
  // Using SQL functions instead of Drizzle schema to avoid PG-specific defaults
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (now()),
      updated_at TEXT NOT NULL DEFAULT (now())
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      settings TEXT,
      created_at TEXT NOT NULL DEFAULT (now()),
      updated_at TEXT NOT NULL DEFAULT (now()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      description TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (now()),
      updated_at TEXT NOT NULL DEFAULT (now()),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT NOT NULL,
      agent_type TEXT NOT NULL,
      title TEXT,
      messages TEXT,
      context TEXT,
      created_at TEXT NOT NULL DEFAULT (now()),
      updated_at TEXT NOT NULL DEFAULT (now()),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (now()),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      workspace_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      model_name TEXT NOT NULL,
      api_endpoint TEXT,
      config TEXT,
      created_at TEXT NOT NULL DEFAULT (now()),
      updated_at TEXT NOT NULL DEFAULT (now()),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      workspace_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      encrypted_key TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (now()),
      updated_at TEXT NOT NULL DEFAULT (now()),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      workspace_id TEXT NOT NULL,
      agent_type TEXT,
      resource_type TEXT NOT NULL,
      pattern TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (now()),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    )
  `);
});

afterEach(async () => {
  // Clean up all tables after each test
  if (testDb) {
    // Delete in order to respect foreign key constraints
    await testDb.delete(schema.permissions);
    await testDb.delete(schema.apiKeys);
    await testDb.delete(schema.models);
    await testDb.delete(schema.messages);
    await testDb.delete(schema.sessions);
    await testDb.delete(schema.projects);
    await testDb.delete(schema.workspaces);
    await testDb.delete(schema.users);
  }
});

afterAll(() => {
  // Reset database singleton
  resetDatabase();
});

/**
 * Get a test database instance
 */
export function getTestDatabase() {
  if (!testDb) {
    throw new Error('Test database not initialized. Call setup first.');
  }

  return testDb;
}

/**
 * Clean up test database
 */
export async function cleanupTestDatabase() {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    testDb = null;
  }
}
