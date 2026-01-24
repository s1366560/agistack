/**
 * E2E Tests: Projects Management Flow
 *
 * TDD Approach: Tests written first, implementation will follow
 */

import { test, expect } from '@playwright/test';

describe('Projects Management Flow', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/projects/, { timeout: 5000 });
  });

  describe('Projects List', () => {
    it('should display projects list', async ({ page }) => {
      // Verify projects page is loaded
      await expect(page.locator('h1')).toContainText('项目');

      // Verify projects list is visible
      const projectsList = page.locator('[data-testid="project-card"]');
      await expect(projectsList).toBeVisible();
    });

    it('should create new project', async ({ page }) => {
      // Click "Create Project" button
      await page.click('[data-testid="create-project-button"]');

      // Verify modal or form appears
      await expect(page.locator('[data-testid="project-form"]')).toBeVisible();

      // Fill project details
      const projectName = `Test Project ${Date.now()}`;
      await page.fill('input[name="name"]', projectName);
      await page.fill('textarea[name="description"]', 'This is a test project');

      // Submit form
      await page.click('button[type="submit"]');

      // Verify success message
      await expect(page.locator('text=项目创建成功')).toBeVisible();

      // Verify project appears in list
      await expect(page.locator(`text=${projectName}`)).toBeVisible();
    });

    it('should validate project name', async ({ page }) => {
      await page.click('[data-testid="create-project-button"]');

      // Try to submit without name
      await page.click('button[type="submit"]');

      // Verify error message
      await expect(page.locator('text=项目名称不能为空')).toBeVisible();
    });

    it('should search projects', async ({ page }) => {
      // Fill search input
      await page.fill('input[placeholder="搜索项目"]', 'test');

      // Wait for debounce
      await page.waitForTimeout(300);

      // Verify filtered results
      const projects = page.locator('[data-testid="project-card"]');
      const count = await projects.count();

      // All results should contain search term
      for (let i = 0; i < count; i++) {
        const project = projects.nth(i);
        await expect(project).toContainText('test', { ignoreCase: true });
      }
    });

    it('should delete project', async ({ page }) => {
      // Find first project
      const firstProject = page.locator('[data-testid="project-card"]').first();

      // Get project name before deletion
      const projectName = await firstProject.locator('[data-testid="project-name"]').textContent();

      // Click delete button
      await firstProject.locator('[data-testid="delete-project-button"]').click();

      // Confirm deletion in modal
      await page.click('[data-testid="confirm-delete-button"]');

      // Verify success message
      await expect(page.locator('text=项目删除成功')).toBeVisible();

      // Verify project is removed from list
      await expect(page.locator(`text=${projectName}`)).not.toBeVisible();
    });
  });

  describe('Project Details', () => {
    it('should navigate to project details', async ({ page }) => {
      // Click on first project
      await page.locator('[data-testid="project-card"]').first().click();

      // Verify project details page
      await expect(page).toHaveURL(/\/projects\/[\w-]+/);
      await expect(page.locator('[data-testid="project-details"]')).toBeVisible();
    });

    it('should edit project details', async ({ page }) => {
      // Navigate to project details
      await page.locator('[data-testid="project-card"]').first().click();

      // Click edit button
      await page.click('[data-testid="edit-project-button"]');

      // Update project name
      const newName = `Updated Project ${Date.now()}`;
      await page.fill('input[name="name"]', newName);

      // Submit form
      await page.click('button[type="submit"]');

      // Verify success message
      await expect(page.locator('text=项目更新成功')).toBeVisible();

      // Verify updated name is displayed
      await expect(page.locator('[data-testid="project-name"]')).toContainText(newName);
    });

    it('should display project sessions', async ({ page }) => {
      // Navigate to project details
      await page.locator('[data-testid="project-card"]').first().click();

      // Verify sessions section is visible
      await expect(page.locator('[data-testid="sessions-list"]')).toBeVisible();

      // Click on "New Session" button
      await page.click('[data-testid="create-session-button"]');

      // Verify new session is created
      await expect(page).toHaveURL(/\/projects\/[\w-]+\/sessions\/[\w-]+/);
    });
  });

  describe('Session Management', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to a project
      await page.locator('[data-testid="project-card"]').first().click();
      // Create or enter a session
      await page.click('[data-testid="create-session-button"]');
    });

    it('should display chat interface', async ({ page }) => {
      // Verify chat interface is loaded
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
      await expect(page.locator('[data-testid="message-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="send-button"]')).toBeVisible();
    });

    it('should send message to AI', async ({ page }) => {
      // Type message
      const message = 'Hello, AI!';
      await page.fill('[data-testid="message-input"]', message);

      // Send message
      await page.click('[data-testid="send-button"]');

      // Verify message appears in chat
      await expect(page.locator(`text=${message}`)).toBeVisible();

      // Wait for AI response (with timeout)
      await expect(page.locator('[data-testid="ai-message"]')).toBeVisible({ timeout: 10000 });
    });

    it('should display message history', async ({ page }) => {
      // Verify previous messages are loaded
      const messages = page.locator('[data-testid="chat-message"]');
      const count = await messages.count();

      expect(count).toBeGreaterThan(0);
    });

    it('should handle streaming AI responses', async ({ page }) => {
      // Send a message that triggers streaming
      await page.fill('[data-testid="message-input"]', 'Tell me a story');
      await page.click('[data-testid="send-button"]');

      // Verify streaming indicator
      await expect(page.locator('[data-testid="streaming-indicator"]')).toBeVisible();

      // Wait for completion
      await expect(page.locator('[data-testid="streaming-indicator"]')).not.toBeVisible({ timeout: 15000 });
    });

    it('should allow stopping AI response', async ({ page }) => {
      // Send a long message
      await page.fill('[data-testid="message-input"]', 'Write a long article');
      await page.click('[data-testid="send-button"]');

      // Wait a bit for streaming to start
      await page.waitForTimeout(1000);

      // Click stop button
      await page.click('[data-testid="stop-button"]');

      // Verify streaming stopped
      await expect(page.locator('[data-testid="streaming-indicator"]')).not.toBeVisible();
    });
  });
});
