/**
 * Sessions E2E tests
 * Tests agent session creation and message flow
 */

import { test, expect } from '@playwright/test'
import { SessionPage, ProjectsPage } from './helpers/page-objects'
import { testProjects, testSessions, testMessages } from './helpers/test-data'

test.describe('Sessions', () => {
  let projectsPage: ProjectsPage
  let sessionPage: SessionPage

  test.beforeEach(async ({ page }) => {
    projectsPage = new ProjectsPage(page)
    sessionPage = new SessionPage(page)

    // Login and create project
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')

    await projectsPage.goto()
    await projectsPage.createProject(
      testProjects.minimal.name,
      testProjects.minimal.path,
      testProjects.minimal.description
    )
  })

  test('should create a new build session', async ({ page }) => {
    await page.click('button:has-text("New Session")')
    await page.click('button:has-text("Build")')

    await sessionPage.sendMessage(testMessages.user.content)
    await sessionPage.expectMessageVisible(testMessages.user.content)
  })

  test('should create a new refactor session', async ({ page }) => {
    await page.click('button:has-text("New Session")')
    await page.click('button:has-text("Refactor")')

    await sessionPage.sendMessage(testMessages.user.content)
    await sessionPage.expectMessageVisible(testMessages.user.content)
  })

  test('should create a new fix session', async ({ page }) => {
    await page.click('button:has-text("New Session")')
    await page.click('button:has-text("Fix")')

    await sessionPage.sendMessage(testMessages.user.content)
    await sessionPage.expectMessageVisible(testMessages.user.content)
  })

  test('should display agent responses', async ({ page }) => {
    await page.click('button:has-text("New Session")')
    await page.click('button:has-text("Build")')

    await sessionPage.sendMessage(testMessages.user.content)
    await sessionPage.expectAgentTyping()

    // Wait for agent response
    await page.waitForTimeout(2000)
    await sessionPage.expectMessageVisible(/I will help/i)
  })

  test('should maintain conversation history', async ({ page }) => {
    await page.click('button:has-text("New Session")')
    await page.click('button:has-text("Build")')

    // Send multiple messages
    await sessionPage.sendMessage('First message')
    await page.waitForTimeout(1000)

    await sessionPage.sendMessage('Second message')
    await page.waitForTimeout(1000)

    // Verify both messages visible
    await sessionPage.expectMessageVisible('First message')
    await sessionPage.expectMessageVisible('Second message')
  })
})
