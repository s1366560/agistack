/**
 * E2E Test Helpers
 *
 * Reusable helper functions for E2E tests
 */

import { Page, BrowserContext } from '@playwright/test';

/**
 * Test user credentials
 */
export const TEST_USERS = {
  regular: {
    email: 'test@example.com',
    password: 'TestPassword123!',
  },
  admin: {
    email: 'admin@example.com',
    password: 'AdminPassword123!',
  },
};

/**
 * Login helper function
 */
export async function login(
  page: Page,
  user: keyof typeof TEST_USERS = 'regular'
): Promise<void> {
  const credentials = TEST_USERS[user];

  await page.goto('/login');
  await page.fill('input[name="email"]', credentials.email);
  await page.fill('input[name="password"]', credentials.password);
  await page.click('button[type="submit"]');

  // Wait for redirect to projects page
  await page.waitForURL(/\/projects/, { timeout: 5000 });
}

/**
 * Logout helper function
 */
export async function logout(page: Page): Promise<void> {
  await page.click('[data-testid="logout-button"]');
  await page.waitForURL(/\//, { timeout: 5000 });
}

/**
 * Create test project helper
 */
export async function createTestProject(
  page: Page,
  name?: string
): Promise<string> {
  const projectName = name || `Test Project ${Date.now()}`;

  await page.click('[data-testid="create-project-button"]');
  await page.fill('input[name="name"]', projectName);
  await page.fill('textarea[name="description"]', 'This is a test project');
  await page.click('button[type="submit"]');

  // Wait for success message
  await page.waitForSelector('text=项目创建成功', { timeout: 5000 });

  return projectName;
}

/**
 * Create test session helper
 */
export async function createTestSession(page: Page): Promise<void> {
  await page.click('[data-testid="create-session-button"]');
  // Wait for session to be created
  await page.waitForURL(/\/sessions\/[\w-]+/, { timeout: 5000 });
}

/**
 * Send chat message helper
 */
export async function sendChatMessage(
  page: Page,
  message: string
): Promise<void> {
  await page.fill('[data-testid="message-input"]', message);
  await page.click('[data-testid="send-button"]');

  // Wait for message to appear
  await page.waitForSelector(`text=${message}`, { timeout: 5000 });
}

/**
 * Wait for AI response helper
 */
export async function waitForAIResponse(page: Page): Promise<void> {
  // Wait for streaming to complete
  await page.waitForSelector('[data-testid="ai-message"]', { timeout: 15000 });
  await page.waitForSelector('[data-testid="streaming-indicator"]', { state: 'hidden', timeout: 15000 });
}

/**
 * Clear test data helper
 */
export async function clearTestData(context: BrowserContext): Promise<void> {
  // Clear localStorage
  await context.clearCookies();

  // Clear IndexedDB if needed
  await context.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Setup test database state
 */
export async function setupTestDatabase(): Promise<void> {
  // This would typically call an API endpoint to reset the test database
  // For now, it's a placeholder
  console.log('Setting up test database...');
}

/**
 * Teardown test database state
 */
export async function teardownTestDatabase(): Promise<void> {
  // This would typically call an API endpoint to clean up test data
  // For now, it's a placeholder
  console.log('Tearing down test database...');
}

/**
 * Take screenshot on failure
 */
export async function screenshotOnFailure(
  page: Page,
  testName: string
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `failure-${testName}-${timestamp}.png`;

  await page.screenshot({
    path: `test-results/screenshots/${filename}`,
    fullPage: true,
  });
}

/**
 * Mock API responses
 */
export function mockApiResponse(endpoint: string, response: any): void {
  // This would typically use MSW (Mock Service Worker)
  // For now, it's a placeholder
  console.log(`Mocking API response for ${endpoint}`);
}

/**
 * Generate test data
 */
export const testDataGenerators = {
  email: () => `test-${Date.now()}@example.com`,
  password: () => 'TestPassword123!',
  projectName: () => `Test Project ${Date.now()}`,
  message: () => `Test message ${Date.now()}`,
};

/**
 * Wait for element to be stable (not animating)
 */
export async function waitForStable(
  page: Page,
  selector: string,
  timeout = 5000
): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible', timeout });

  // Wait for bounding box to stabilize
  await page.waitForFunction((sel) => {
    const element = document.querySelector(sel);
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }, selector, { timeout });
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }

  throw lastError;
}
