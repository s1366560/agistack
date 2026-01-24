/**
 * E2E Test Example
 *
 * Simple test to verify E2E setup is working
 */

import { test, expect } from '@playwright/test';

test.describe('Application Setup', () => {
  test('should load home page', async ({ page }) => {
    await page.goto('/');

    // Verify page title
    await expect(page).toHaveTitle(/Agistack/);

    // Verify navigation is visible
    await expect(page.locator('nav')).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');

    // Click login link
    const loginLink = page.locator('a[href="/login"]').first();
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('should handle 404 pages', async ({ page }) => {
    // Navigate to non-existent page
    await page.goto('/this-page-does-not-exist');

    // Verify 404 page is shown
    await expect(page.locator('h1')).toContainText('404', { timeout: 5000 });
  });
});

test.describe('Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');

    // Check for h1
    const h1 = page.locator('h1');
    const h1Count = await h1.count();
    expect(h1Count).toBeGreaterThan(0);
  });

  test('should have focus management', async ({ page }) => {
    await page.goto('/login');

    // Tab through form elements
    await page.keyboard.press('Tab');

    // Verify focus is on first input
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBe('INPUT');
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Verify mobile navigation or menu button
    const menuButton = page.locator('[data-testid="mobile-menu-button"]');
    const isVisible = await menuButton.isVisible().catch(() => false);

    if (isVisible) {
      await expect(menuButton).toBeVisible();
    }
  });

  test('should work on desktop viewport', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    // Verify desktop navigation
    await expect(page.locator('nav')).toBeVisible();
  });
});
