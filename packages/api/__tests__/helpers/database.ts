/**
 * Database Test Helpers
 *
 * Utilities for database testing
 */

import { describe, beforeEach, afterEach, vi } from 'vitest';
import { drizzle } from '../src/db';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import sql from 'drizzle-orm';

/**
 * Setup database test suite
 */
export function setupDatabaseTest() {
  beforeAll(async () => {
    // Run migrations before all tests
    await migrate(drizzle, { migrationsFolder: './src/db/migrations' });
  });

  beforeEach(async () => {
    // Clean database before each test
    await cleanDatabase();
  });

  afterEach(async () => {
    // Clean up after each test
    await cleanDatabase();
  });

  afterAll(async () => {
    // Close database connection
    await drizzle.execute(sql`SELECT 1`); // Test connection
  });
}

/**
 * Clean all tables in test database
 */
async function cleanDatabase() {
  const tables = [
    'messages',
    'sessions',
    'projects',
    'workspaces',
    'users',
    'api_keys',
    'models',
    'permissions',
  ];

  for (const table of tables) {
    await drizzle.execute(sql.raw(`TRUNCATE TABLE ${table} CASCADE`));
  }
}

/**
 * Wrap tests in database transaction for rollback
 */
export function useTransaction(fn: () => Promise<void> | void) {
  return async () => {
    await drizzle.execute(sql`BEGIN`);
    try {
      await fn();
    } finally {
      await drizzle.execute(sql`ROLLBACK`);
    }
  };
}
