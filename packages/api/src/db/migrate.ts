import { db } from './index';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

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
async function executeMigration(filePath: string): Promise<void> {
  const sql = readFileSync(filePath, 'utf-8');
  // Split by semicolon and execute each statement
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await db.execute(statement);
  }
}

/**
 * Run database migrations
 */
export async function migrate(): Promise<MigrationResult> {
  try {
    const migrationFiles = getMigrationFiles();
    let appliedCount = 0;

    for (const file of migrationFiles) {
      const filePath = join(MIGRATIONS_DIR, file);
      await executeMigration(filePath);
      appliedCount++;
    }

    return {
      success: true,
      migrationsApplied: appliedCount,
    };
  } catch (error) {
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
  try {
    const migrationFiles = getMigrationFiles();
    if (migrationFiles.length === 0) {
      return {
        success: true,
        migrationsRolledBack: 0,
      };
    }

    // Get the last migration
    const lastMigration = migrationFiles[migrationFiles.length - 1];
    const downFile = lastMigration.replace('.sql', '_down.sql');
    const downFilePath = join(MIGRATIONS_DIR, downFile);

    // Execute rollback if down file exists
    await executeMigration(downFilePath);

    return {
      success: true,
      migrationsRolledBack: 1,
    };
  } catch (error) {
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
