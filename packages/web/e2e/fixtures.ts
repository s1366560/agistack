/**
 * E2E Test Fixtures
 *
 * Extended Playwright fixtures for common test scenarios
 */

import { test as base, Page, BrowserContext } from '@playwright/test';
import {
  login,
  logout,
  createTestProject,
  createTestSession,
  sendChatMessage,
  waitForAIResponse,
  clearTestData,
} from './helpers';

// Define custom fixtures
export type TestOptions = {
  loggedIn: boolean;
  userType: 'regular' | 'admin';
};

export const test = base.extend<TestOptions>({
  // Option to automatically login before test
  loggedIn: [true, { option: true }],
  userType: ['regular', { option: true }],

  // Custom page fixture that can auto-login
  page: async ({ page, loggedIn, userType }, use) => {
    // Auto-login if requested
    if (loggedIn) {
      await login(page, userType);
    }

    await use(page);

    // Cleanup after test
    if (loggedIn) {
      await clearTestData(page.context());
    }
  },
});

// Export everything from Playwright test
export { expect } from '@playwright/test';

/**
 * Pre-configured test for authenticated users
 */
export const authenticatedTest = test.extend({
  page: async ({ page }, use) => {
    await login(page, 'regular');
    await use(page);
    await clearTestData(page.context());
  },
});

/**
 * Pre-configured test for admin users
 */
export const adminTest = test.extend({
  page: async ({ page }, use) => {
    await login(page, 'admin');
    await use(page);
    await clearTestData(page.context());
  },
});

/**
 * Test with project context
 */
export const projectTest = test.extend({
  page: async ({ page }, use) => {
    await login(page, 'regular');
    const projectName = await createTestProject(page);
    await use(page);
    await clearTestData(page.context());
  },
  projectName: async ({ page }, use) => {
    const name = await createTestProject(page);
    await use(name);
  },
});

/**
 * Test with session context
 */
export const sessionTest = test.extend({
  page: async ({ page }, use) => {
    await login(page, 'regular');
    await createTestProject(page);
    await createTestSession(page);
    await use(page);
    await clearTestData(page.context());
  },
});
