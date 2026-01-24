/**
 * Vitest Configuration for Integration Tests
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./__tests__/setup/integration.ts'],
    include: [
      '__tests__/integration/**/*.test.ts',
    ],
    exclude: [
      'node_modules/',
      'dist/',
      '**/*.spec.ts',
    ],
    // Integration tests run against actual test database
    testTimeout: 30000,
    hookTimeout: 30000,
    isolate: false, // Share database state between tests in same file
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Run integration tests sequentially
      },
    },
  },
});
