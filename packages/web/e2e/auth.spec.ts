/**
 * E2E Tests: Authentication Flow
 *
 * TDD Approach: Tests written first, implementation will follow
 */

import { test, expect } from '@playwright/test';

describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
  });

  describe('User Registration', () => {
    it('should navigate to registration page', async ({ page }) => {
      // Click on register link
      await page.click('a[href="/register"]');

      // Verify URL
      await expect(page).toHaveURL(/\/register/);

      // Verify registration form is visible
      await expect(page.locator('h1')).toContainText('注册');
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    });

    it('should register new user successfully', async ({ page }) => {
      // Navigate to registration page
      await page.goto('/register');

      // Fill registration form
      const testUser = {
        email: `test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!'
      };

      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.confirmPassword);

      // Submit form
      await page.click('button[type="submit"]');

      // Verify success message or redirect
      await expect(page).toHaveURL(/\/(login|projects)/, { timeout: 5000 });

      // Check for success message
      const successMessage = page.locator('text=注册成功');
      await expect(successMessage).toBeVisible({ timeout: 3000 });
    });

    it('should validate email format', async ({ page }) => {
      await page.goto('/register');

      // Fill with invalid email
      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('input[name="password"]', 'TestPassword123!');
      await page.fill('input[name="confirmPassword"]', 'TestPassword123!');

      // Submit form
      await page.click('button[type="submit"]');

      // Verify error message
      const errorMessage = page.locator('text=邮箱格式不正确');
      await expect(errorMessage).toBeVisible();
    });

    it('should validate password matching', async ({ page }) => {
      await page.goto('/register');

      // Fill with mismatched passwords
      await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
      await page.fill('input[name="password"]', 'TestPassword123!');
      await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');

      // Submit form
      await page.click('button[type="submit"]');

      // Verify error message
      const errorMessage = page.locator('text=密码不匹配');
      await expect(errorMessage).toBeVisible();
    });

    it('should enforce password strength requirements', async ({ page }) => {
      await page.goto('/register');

      // Fill with weak password
      await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
      await page.fill('input[name="password"]', '123');
      await page.fill('input[name="confirmPassword"]', '123');

      // Submit form
      await page.click('button[type="submit"]');

      // Verify error message
      const errorMessage = page.locator('text=密码强度不够');
      await expect(errorMessage).toBeVisible();
    });
  });

  describe('User Login', () => {
    it('should navigate to login page', async ({ page }) => {
      // Click on login link
      await page.click('a[href="/login"]');

      // Verify URL
      await expect(page).toHaveURL(/\/login/);

      // Verify login form is visible
      await expect(page.locator('h1')).toContainText('登录');
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
    });

    it('should login successfully with valid credentials', async ({ page }) => {
      // Navigate to login page
      await page.goto('/login');

      // Fill login form (assuming test user exists)
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'TestPassword123!');

      // Submit form
      await page.click('button[type="submit"]');

      // Verify redirect to projects page
      await expect(page).toHaveURL(/\/projects/, { timeout: 5000 });
    });

    it('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill with invalid credentials
      await page.fill('input[name="email"]', 'nonexistent@example.com');
      await page.fill('input[name="password"]', 'WrongPassword123!');

      // Submit form
      await page.click('button[type="submit"]');

      // Verify error message
      const errorMessage = page.locator('text=邮箱或密码错误');
      await expect(errorMessage).toBeVisible();

      // Verify still on login page
      await expect(page).toHaveURL(/\/login/);
    });

    it('should remember user with "Remember Me" option', async ({ page }) => {
      await page.goto('/login');

      // Fill form
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'TestPassword123!');

      // Check "Remember Me"
      await page.check('input[type="checkbox"]');

      // Submit form
      await page.click('button[type="submit"]');

      // Verify token is stored
      await expect(page).toHaveURL(/\/projects/);

      // Close and reopen browser
      await page.context().close();

      // Navigate to site again
      await page.goto('/');

      // Verify user is still logged in
      await expect(page).toHaveURL(/\/projects/, { timeout: 5000 });
    });
  });

  describe('User Logout', () => {
    it('should logout successfully', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'TestPassword123!');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/projects/);

      // Click logout button
      await page.click('[data-testid="logout-button"]');

      // Verify redirect to home page
      await expect(page).toHaveURL(/\//);

      // Verify auth token is cleared
      const localStorage = await page.evaluate(() => window.localStorage);
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('Protected Routes', () => {
    it('should redirect unauthenticated users to login', async ({ page }) => {
      // Try to access protected route
      await page.goto('/projects');

      // Verify redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    it('should allow authenticated users to access protected routes', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'TestPassword123!');
      await page.click('button[type="submit"]');

      // Navigate to protected route
      await page.goto('/projects');

      // Verify access granted
      await expect(page).toHaveURL(/\/projects/);
      await expect(page.locator('h1')).toContainText('项目', { timeout: 5000 });
    });
  });
});
