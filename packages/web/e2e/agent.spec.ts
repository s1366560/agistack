/**
 * E2E Tests: Agent Execution Flow
 *
 * TDD Approach: Tests written first, implementation will follow
 */

import { test, expect } from '@playwright/test';

describe('Agent Execution Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to a session
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/projects/, { timeout: 5000 });

    // Navigate to first project
    await page.locator('[data-testid="project-card"]').first().click();
    // Create or enter a session
    await page.click('[data-testid="create-session-button"]');
  });

  describe('Agent Interaction', () => {
    it('should execute agent command', async ({ page }) => {
      // Send command to agent
      await page.fill('[data-testid="message-input"]', 'List all files in current directory');
      await page.click('[data-testid="send-button"]');

      // Verify agent starts processing
      await expect(page.locator('[data-testid="agent-status"]')).toContainText('思考中');

      // Verify tool execution
      await expect(page.locator('[data-testid="tool-execution"]')).toBeVisible();

      // Verify final response
      await expect(page.locator('[data-testid="agent-response"]')).toBeVisible({ timeout: 15000 });
    });

    it('should display agent execution steps', async ({ page }) => {
      // Send complex command
      await page.fill('[data-testid="message-input"]', 'Create a new file called test.txt with content "Hello World"');
      await page.click('[data-testid="send-button"]');

      // Wait for execution to complete
      await expect(page.locator('[data-testid="agent-response"]')).toBeVisible({ timeout: 20000 });

      // Click on execution details
      await page.click('[data-testid="view-execution-details"]');

      // Verify execution steps are displayed
      await expect(page.locator('[data-testid="execution-steps"]')).toBeVisible();

      const steps = page.locator('[data-testid="execution-step"]');
      const count = await steps.count();
      expect(count).toBeGreaterThan(0);

      // Verify each step has tool name and result
      for (let i = 0; i < count; i++) {
        const step = steps.nth(i);
        await expect(step.locator('[data-testid="tool-name"]')).toBeVisible();
        await expect(step.locator('[data-testid="tool-result"]')).toBeVisible();
      }
    });

    it('should handle agent errors gracefully', async ({ page }) => {
      // Send command that will fail
      await page.fill('[data-testid="message-input"]', 'Delete /system/file');
      await page.click('[data-testid="send-button"]');

      // Wait for execution to complete
      await expect(page.locator('[data-testid="agent-response"]')).toBeVisible({ timeout: 15000 });

      // Verify error is displayed
      await expect(page.locator('[data-testid="agent-error"]')).toBeVisible();

      // Verify error message is user-friendly
      const errorMessage = await page.locator('[data-testid="agent-error"]').textContent();
      expect(errorMessage).toContain('权限不足');
    });

    it('should allow selecting agent type', async ({ page }) => {
      // Open agent settings
      await page.click('[data-testid="agent-settings-button"]');

      // Select different agent type
      await page.selectOption('select[name="agentType"]', 'planner');

      // Verify selection is saved
      await expect(page.locator('select[name="agentType"]')).toHaveValue('planner');

      // Close settings
      await page.click('[data-testid="close-settings-button"]');

      // Send command to verify agent type
      await page.fill('[data-testid="message-input"]', 'What files are in this directory?');
      await page.click('[data-testid="send-button"]');

      // Verify planner agent is used (shows planning steps)
      await expect(page.locator('[data-testid="planning-step"]')).toBeVisible({ timeout: 10000 });
    });
  });

  describe('Tool Execution', () => {
    it('should show tool usage in real-time', async ({ page }) => {
      // Send command that uses multiple tools
      await page.fill('[data-testid="message-input"]', 'Read package.json and create a summary');
      await page.click('[data-testid="send-button"]');

      // Wait for tool execution to start
      await expect(page.locator('[data-testid="tool-execution"]')).toBeVisible({ timeout: 5000 });

      // Verify tool name is displayed
      await expect(page.locator('[data-testid="tool-name"]')).toContainText('read_file');

      // Verify tool status (running/completed)
      await expect(page.locator('[data-testid="tool-status"]')).toBeVisible();
    });

    it('should allow approving dangerous tools', async ({ page }) => {
      // Send command that requires approval
      await page.fill('[data-testid="message-input"]', 'Execute: rm -rf test-directory');
      await page.click('[data-testid="send-button"]');

      // Wait for approval modal
      await expect(page.locator('[data-testid="tool-approval-modal"]')).toBeVisible({ timeout: 10000 });

      // Verify tool details are shown
      await expect(page.locator('[data-testid="tool-name"]')).toContainText('execute_command');
      await expect(page.locator('[data-testid="tool-arguments"]')).toContainText('rm -rf test-directory');

      // Approve tool execution
      await page.click('[data-testid="approve-tool-button"]');

      // Verify execution continues
      await expect(page.locator('[data-testid="tool-approval-modal"]')).not.toBeVisible();
    });

    it('should allow rejecting dangerous tools', async ({ page }) => {
      // Send command that requires approval
      await page.fill('[data-testid="message-input"]', 'Execute: rm -rf important-files');
      await page.click('[data-testid="send-button"]');

      // Wait for approval modal
      await expect(page.locator('[data-testid="tool-approval-modal"]')).toBeVisible({ timeout: 10000 });

      // Reject tool execution
      await page.click('[data-testid="reject-tool-button"]');

      // Verify execution is stopped
      await expect(page.locator('[data-testid="tool-approval-modal"]')).not.toBeVisible();

      // Verify error message about rejection
      await expect(page.locator('text=工具执行被拒绝')).toBeVisible();
    });
  });

  describe('Execution History', () => {
    it('should display execution history', async ({ page }) => {
      // Open execution history panel
      await page.click('[data-testid="execution-history-button"]');

      // Verify history list is visible
      await expect(page.locator('[data-testid="execution-history-list"]')).toBeVisible();

      // Verify executions are listed
      const executions = page.locator('[data-testid="execution-item"]');
      const count = await executions.count();
      expect(count).toBeGreaterThan(0);

      // Each execution should show status and timestamp
      for (let i = 0; i < Math.min(count, 3); i++) {
        const execution = executions.nth(i);
        await expect(execution.locator('[data-testid="execution-status"]')).toBeVisible();
        await expect(execution.locator('[data-testid="execution-timestamp"]')).toBeVisible();
      }
    });

    it('should filter execution history by status', async ({ page }) => {
      // Open execution history
      await page.click('[data-testid="execution-history-button"]');

      // Filter by "completed" status
      await page.selectOption('select[name="statusFilter"]', 'completed');

      // Wait for filtering
      await page.waitForTimeout(300);

      // Verify only completed executions are shown
      const executions = page.locator('[data-testid="execution-item"]');
      const count = await executions.count();

      for (let i = 0; i < count; i++) {
        const execution = executions.nth(i);
        await expect(execution.locator('[data-testid="execution-status"]')).toContainText('已完成');
      }
    });

    it('should replay previous execution', async ({ page }) => {
      // Open execution history
      await page.click('[data-testid="execution-history-button"]');

      // Click on first execution
      await page.locator('[data-testid="execution-item"]').first().click();

      // Click replay button
      await page.click('[data-testid="replay-execution-button"]');

      // Verify confirmation modal
      await expect(page.locator('[data-testid="replay-confirmation-modal"]')).toBeVisible();

      // Confirm replay
      await page.click('[data-testid="confirm-replay-button"]');

      // Verify execution starts
      await expect(page.locator('[data-testid="agent-status"]')).toContainText('思考中');
    });
  });

  describe('Agent Capabilities', () => {
    it('should use code search tool', async ({ page }) => {
      // Send search command
      await page.fill('[data-testid="message-input"]', 'Search for function named "calculateTotal"');
      await page.click('[data-testid="send-button"]');

      // Wait for execution
      await expect(page.locator('[data-testid="agent-response"]')).toBeVisible({ timeout: 15000 });

      // Verify search results
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    });

    it('should use file operations tools', async ({ page }) => {
      // Send file operations command
      await page.fill('[data-testid="message-input"]', 'Create a file called hello.md with content "# Hello World"');
      await page.click('[data-testid="send-button"]');

      // Wait for execution
      await expect(page.locator('[data-testid="agent-response"]')).toBeVisible({ timeout: 15000 });

      // Verify file creation in execution details
      await page.click('[data-testid="view-execution-details"]');

      await expect(page.locator('text=write_file')).toBeVisible();
      await expect(page.locator('text=hello.md')).toBeVisible();
    });

    it('should use git operations tools', async ({ page }) => {
      // Send git command
      await page.fill('[data-testid="message-input"]', 'Show git status');
      await page.click('[data-testid="send-button"]');

      // Wait for execution
      await expect(page.locator('[data-testid="agent-response"]')).toBeVisible({ timeout: 15000 });

      // Verify git status output
      await expect(page.locator('text=git status')).toBeVisible();
    });
  });
});
