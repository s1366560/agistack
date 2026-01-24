import { getDatabase } from './index';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';

interface MigrationResult {
  success: boolean;
  migrationsApplied: number;
  error?: string;
}

interface RollbackResult {
  success: boolean;
  migrationsRolledBack: number;
  error?: string;
}

const MIGRATIONS_DIR = join(process.cwd(), 'src/db/migrations');
const MIGRATIONS_TABLE = '_drizzle_migrations';

/**
 * Get SQL client for migrations
 */
function getSqlClient(): postgres.Sql<{}> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  return postgres(connectionString, {
    max: 1,
  });
}

/**
 * Ensure migrations table exists
 */
async function ensureMigrationsTable(sqlClient: postgres.Sql<{}>): Promise<void> {
  await sqlClient.unsafe(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

/**
 * Get applied migrations
 */
async function getAppliedMigrations(sqlClient: postgres.Sql<{}>): Promise<string[]> {
  const result = await sqlClient.unsafe(
    `SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY id`
  );
  return result.map((row: any) => row.name);
}

/**
 * Mark migration as applied
 */
async function markMigrationApplied(sqlClient: postgres.Sql<{}>, name: string): Promise<void> {
  await sqlClient.unsafe(
    `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES ($1)`,
    [name]
  );
}

/**
 * Get all migration files sorted by name
 */
function getMigrationFiles(): string[] {
  try {
    const files = readdirSync(MIGRATIONS_DIR);
    return files
      .filter((f) => f.endsWith('.sql') && !f.endsWith('_down.sql'))
      .sort();
  } catch {
    return [];
  }
}

/**
 * Execute SQL migration file
 */
async function executeMigration(sqlClient: postgres.Sql<{}>, filePath: string): Promise<void> {
  const sql = readFileSync(filePath, 'utf-8');

  // Split by statement breakpoint and semicolon
  const statements = sql
    .split(/--> statement-breakpoint\n|;/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    if (statement) {
      await sqlClient.unsafe(statement);
    }
  }
}

/**
 * Run database migrations
 */
export async function migrate(): Promise<MigrationResult> {
  const sqlClient = getSqlClient();

  try {
    // Ensure migrations table exists
    await ensureMigrationsTable(sqlClient);

    // Get applied migrations
    const appliedMigrations = await getAppliedMigrations(sqlClient);

    // Get migration files
    const migrationFiles = getMigrationFiles();
    let appliedCount = 0;

    // Apply only unapplied migrations
    for (const file of migrationFiles) {
      if (!appliedMigrations.includes(file)) {
        const filePath = join(MIGRATIONS_DIR, file);
        await executeMigration(sqlClient, filePath);
        await markMigrationApplied(sqlClient, file);
        appliedCount++;
      }
    }

    await sqlClient.end();

    return {
      success: true,
      migrationsApplied: appliedCount,
    };
  } catch (error) {
    await sqlClient.end();
    return {
      success: false,
      migrationsApplied: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Rollback last migration
 */
export async function rollback(): Promise<RollbackResult> {
  const sqlClient = getSqlClient();

  try {
    // Ensure migrations table exists
    await ensureMigrationsTable(sqlClient);

    // Get applied migrations
    const appliedMigrations = await getAppliedMigrations(sqlClient);

    if (appliedMigrations.length === 0) {
      await sqlClient.end();
      return {
        success: true,
        migrationsRolledBack: 0,
      };
    }

    // Get the last applied migration
    const lastMigration = appliedMigrations[appliedMigrations.length - 1];
    const downFile = lastMigration.replace('.sql', '_down.sql');
    const downFilePath = join(MIGRATIONS_DIR, downFile);

    // Execute rollback if down file exists
    try {
      await executeMigration(sqlClient, downFilePath);
      await sqlClient.unsafe(
        `DELETE FROM ${MIGRATIONS_TABLE} WHERE name = $1`,
        [lastMigration]
      );
    } catch (error) {
      // Down file doesn't exist, just remove from tracking
      await sqlClient.unsafe(
        `DELETE FROM ${MIGRATIONS_TABLE} WHERE name = $1`,
        [lastMigration]
      );
    }

    await sqlClient.end();

    return {
      success: true,
      migrationsRolledBack: 1,
    };
  } catch (error) {
    await sqlClient.end();
    return {
      success: false,
      migrationsRolledBack: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * CLI entrypoint
 */
async function main() {
  const command = process.argv[2];

  if (command === 'rollback') {
    const result = await rollback();
    if (result.success) {
      console.log(`Rolled back ${result.migrationsRolledBack} migration(s)`);
    } else {
      console.error('Rollback failed:', result.error);
      process.exit(1);
    }
  } else {
    // Default to migrate
    const result = await migrate();
    if (result.success) {
      console.log(`Applied ${result.migrationsApplied} migration(s)`);
    } else {
      console.error('Migration failed:', result.error);
      process.exit(1);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
