/**
 * Integration Test Helpers
 *
 * Utilities for integration testing with in-memory database
 */

import { drizzle, DrizzleD1Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../../src/db/schema';
import { sql, eq } from 'drizzle-orm';
import path from 'path';
import { fileURLToPath } from 'url';
import { setDatabase } from '../../src/db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test database instance
 */
let testDb: DrizzleD1Database<typeof schema> | null = null;
let sqliteDb: Database.Database | null = null;

/**
 * Get or create test database instance
 * Uses in-memory SQLite for fast isolated tests
 */
export function getTestDatabase(): DrizzleD1Database<typeof schema> {
  if (!testDb) {
    // Create in-memory SQLite database
    sqliteDb = new Database(':memory:');

    // Register PostgreSQL compatibility functions BEFORE creating drizzle instance
    // This is critical for the schema defaults to work
    sqliteDb.function('gen_random_uuid', () => {
      return crypto.randomUUID();
    });

    // Register now() function for timestamps
    sqliteDb.function('now', () => {
      return new Date().toISOString();
    });

    testDb = drizzle(sqliteDb, { schema });

    // Run migrations
    const migrationsFolder = path.resolve(__dirname, '../../drizzle');
    try {
      migrate(testDb, { migrationsFolder });
    } catch (error) {
      // Migrations might not exist yet, create tables manually
      createTestTables(testDb);
    }

    // Override the global db instance with test database
    setDatabase(testDb as any);
  }

  return testDb;
}

/**
 * Create test tables manually if migrations don't exist
 */
function createTestTables(db: DrizzleD1Database<typeof schema>) {
  // Create a UUID generation function for SQLite
  db.run(sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create workspaces table
  db.run(sql`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      settings TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create projects table
  db.run(sql`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      description TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create sessions table
  db.run(sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      agent_type TEXT NOT NULL,
      title TEXT,
      messages TEXT,
      context TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create messages table
  db.run(sql`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create agent_executions table
  db.run(sql`
    CREATE TABLE IF NOT EXISTS agent_executions (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      agent_type TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'idle',
      input_prompt TEXT NOT NULL,
      output_summary TEXT,
      error_message TEXT,
      steps TEXT,
      tokens_used TEXT,
      duration_ms TEXT,
      started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create agent_tools table
  db.run(sql`
    CREATE TABLE IF NOT EXISTS agent_tools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      schema TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create agent_tool_usage table
  db.run(sql`
    CREATE TABLE IF NOT EXISTS agent_tool_usage (
      id TEXT PRIMARY KEY,
      execution_id TEXT NOT NULL REFERENCES agent_executions(id) ON DELETE CASCADE,
      tool_name TEXT NOT NULL,
      arguments TEXT,
      result TEXT,
      duration_ms TEXT,
      success INTEGER NOT NULL,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Create a mock gen_random_uuid function for SQLite
 * This is needed because Drizzle schema uses PostgreSQL functions
 */
function createUUIDFunction(db: DrizzleD1Database<typeof schema>) {
  // SQLite doesn't support custom functions in the same way as PostgreSQL
  // Instead, we need to create a scalar function using better-sqlite3's API
  if (sqliteDb) {
    sqliteDb.function('gen_random_uuid', () => {
      return crypto.randomUUID();
    });
  }
}

/**
 * Clean all tables in test database
 */
export async function cleanTestDatabase(db: DrizzleD1Database<typeof schema>) {
  // Delete in reverse order of dependencies
  await db.delete(schema.agentToolUsage);
  await db.delete(schema.agentExecutions);
  await db.delete(schema.agentTools);
  await db.delete(schema.messages);
  await db.delete(schema.sessions);
  await db.delete(schema.projects);
  await db.delete(schema.workspaces);
  await db.delete(schema.users);
}

/**
 * Close test database connection
 */
export function closeTestDatabase() {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
    testDb = null;
  }
  // Reset the database override
  const { resetDatabase } = require('../../src/db');
  resetDatabase();
}

/**
 * Create test user
 */
export async function createTestUser(
  db: DrizzleD1Database<typeof schema>,
  overrides?: Partial<typeof schema.users.$inferInsert>
) {
  const id = overrides?.id || crypto.randomUUID();
  const email = overrides?.email || `test-${id.substring(0, 8)}@example.com`;
  const name = overrides?.name || `Test User ${id.substring(0, 8)}`;

  const user = await db
    .insert(schema.users)
    .values({
      id,
      email,
      name,
      avatarUrl: overrides?.avatarUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()
    .then((rows) => rows[0]);

  return user;
}

/**
 * Create test workspace
 */
export async function createTestWorkspace(
  db: DrizzleD1Database<typeof schema>,
  userId: string,
  overrides?: Partial<typeof schema.workspaces.$inferInsert>
) {
  const id = overrides?.id || crypto.randomUUID();
  const name = overrides?.name || `Test Workspace ${id.substring(0, 8)}`;

  const workspace = await db
    .insert(schema.workspaces)
    .values({
      id,
      userId,
      name,
      settings: overrides?.settings,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()
    .then((rows) => rows[0]);

  return workspace;
}

/**
 * Create test project
 */
export async function createTestProject(
  db: DrizzleD1Database<typeof schema>,
  workspaceId: string,
  overrides?: Partial<typeof schema.projects.$inferInsert>
) {
  const id = overrides?.id || crypto.randomUUID();
  const name = overrides?.name || `Test Project ${id.substring(0, 8)}`;
  const projectPath = overrides?.path || `/tmp/test-project-${id.substring(0, 8)}`;

  const project = await db
    .insert(schema.projects)
    .values({
      id,
      workspaceId,
      name,
      path: projectPath,
      description: overrides?.description,
      metadata: overrides?.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()
    .then((rows) => rows[0]);

  return project;
}

/**
 * Create test session
 */
export async function createTestSession(
  db: DrizzleD1Database<typeof schema>,
  projectId: string,
  overrides?: Partial<typeof schema.sessions.$inferInsert>
) {
  const id = overrides?.id || crypto.randomUUID();
  const agentType = overrides?.agentType || 'build';
  const title = overrides?.title || `Test Session ${id.substring(0, 8)}`;

  const session = await db
    .insert(schema.sessions)
    .values({
      id,
      projectId,
      agentType,
      title,
      messages: overrides?.messages,
      context: overrides?.context,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()
    .then((rows) => rows[0]);

  return session;
}

/**
 * Create test message
 */
export async function createTestMessage(
  db: DrizzleD1Database<typeof schema>,
  sessionId: string,
  overrides?: Partial<typeof schema.messages.$inferInsert>
) {
  const id = overrides?.id || crypto.randomUUID();
  const role = overrides?.role || 'user';
  const content = overrides?.content || 'Test message';

  const message = await db
    .insert(schema.messages)
    .values({
      id,
      sessionId,
      role,
      content,
      metadata: overrides?.metadata,
      createdAt: new Date(),
    })
    .returning()
    .then((rows) => rows[0]);

  return message;
}

/**
 * Create complete test data hierarchy
 */
export async function createTestDataHierarchy(
  db: DrizzleD1Database<typeof schema>
) {
  const user = await createTestUser(db);
  const workspace = await createTestWorkspace(db, user.id);
  const project = await createTestProject(db, workspace.id);
  const session = await createTestSession(db, project.id);
  const message = await createTestMessage(db, session.id);

  return { user, workspace, project, session, message };
}
