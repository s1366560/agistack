import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./__tests__/setup/unit.ts'],
    // Include both co-located tests and __tests__ directory
    include: [
      'src/**/*.test.ts',  // Co-located unit tests
      '__tests__/integration/**/*.test.ts',  // Integration tests
    ],
    // Exclude E2E tests from unit test runs
    exclude: [
      'node_modules/',
      'dist/',
      '**/*.spec.ts',
      '**/types/',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types/',
        '__tests__/',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    // Test timeout
    testTimeout: 10000,
    // Hook timeout
    hookTimeout: 10000,
  },
});
