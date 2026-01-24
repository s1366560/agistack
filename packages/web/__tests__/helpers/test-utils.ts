/**
 * Test Utilities
 *
 * General utility functions for testing
 */

/**
 * Wait for async operations to complete
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
 * Create a mock function with delay
 */
export function createDelayedMock<T>(
  returnValue: T,
  delay: number = 100
): () => Promise<T> {
  return () =>
    new Promise(resolve => {
      setTimeout(() => resolve(returnValue), delay);
    });
}

/**
 * Suppress console errors during test
 */
export function suppressConsoleErrors() {
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });
}

/**
 * Mock window.location
 */
export function mockLocation(href: string) {
  delete (window.location as any).href;
  (window.location as any).href = href;
}

/**
 * Create a mock element with attributes
 */
export function createMockElement(
  tag: string,
  attributes: Record<string, string> = {}
): HTMLElement {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
}
