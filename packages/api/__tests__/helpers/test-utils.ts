/**
 * Test Utilities
 *
 * General utility functions for testing
 */

import { describe, beforeEach, afterEach, vi } from 'vitest';

/**
 * Wait for async operations
 */
export async function waitFor(ms: number = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for condition to be true
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout: number = 5000
): Promise<void> {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error(`Condition not met within ${timeout}ms`);
    }
    await waitFor(10);
  }
}

/**
 * Mock console to avoid cluttering test output
 */
export function mockConsole() {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
}

/**
 * Generate random test data
 */
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate random email for testing
 */
export function generateTestEmail(): string {
  return `test-${Math.random().toString(36).substr(2, 9)}@example.com`;
}

/**
 * Create a delayed promise
 */
export function createDelayedPromise<T>(
  value: T,
  delay: number = 100
): Promise<T> {
  return new Promise(resolve =>
    setTimeout(() => resolve(value), delay)
  );
}

/**
 * Mock date for consistent testing
 */
export function mockDate(dateString: string) {
  vi.setSystemTime(new Date(dateString));
}

/**
 * Reset mock date
 */
export function resetMockDate() {
  vi.useRealTimers();
}
