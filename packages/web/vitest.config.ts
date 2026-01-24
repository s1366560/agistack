import { defineConfig } from 'vitest/config'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solidPlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [
      './__tests__/setup/unit.ts',
    ],
    // Include both co-located tests and __tests__ directory
    include: [
      'src/**/*.test.{ts,tsx}',
      '__tests__/unit/**/*.test.{ts,tsx}',
      '__tests__/integration/**/*.test.{ts,tsx}',
    ],
    // Exclude E2E tests from unit test runs
    exclude: [
      'node_modules/',
      'dist/',
      '__tests__/e2e/**',
      '**/*.e2e.test.{ts,tsx}',
      '**/*.config.ts',
      '**/*.config.js',
      '**/types/**',
      '**/*.stories.tsx',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '__tests__/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/*.config.{ts,js}',
        '**/types/**',
        '**/*.stories.tsx',
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
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
