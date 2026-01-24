/**
 * Projects E2E tests
 * Tests project creation, listing, and management
 */

import { test, expect } from '@playwright/test'
import { ProjectsPage } from './helpers/page-objects'
import { testProjects } from './helpers/test-data'

test.describe('Projects', () => {
  let projectsPage: ProjectsPage

  test.beforeEach(async ({ page }) => {
    projectsPage = new ProjectsPage(page)

    // Login before each test
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('should display projects list', async ({ page }) => {
    await projectsPage.goto()
    await expect(page.locator('h1')).toContainText('Projects')
  })

  test('should create a new project with minimal data', async ({ page }) => {
    await projectsPage.goto()
    await projectsPage.createProject(
      testProjects.minimal.name,
      testProjects.minimal.path,
      testProjects.minimal.description
    )

    await projectsPage.expectProjectVisible(testProjects.minimal.name)
  })

  test('should create a new project with full data', async ({ page }) => {
    await projectsPage.goto()
    await projectsPage.createProject(
      testProjects.full.name,
      testProjects.full.path,
      testProjects.full.description
    )

    await projectsPage.expectProjectVisible(testProjects.full.name)
  })

  test('should validate project name is required', async ({ page }) => {
    await projectsPage.goto()
    await projectsPage.clickCreateProject()

    await projectsPage.fillProjectName(testProjects.invalid.name)
    await projectsPage.submit()

    await expect(
      page.getByText(/name is required/i)
    ).toBeVisible()
  })

  test('should search projects by name', async ({ page }) => {
    await projectsPage.goto()

    // Create test projects
    await projectsPage.createProject('Search Test 1', '/tmp/test1', '')
    await projectsPage.createProject('Search Test 2', '/tmp/test2', '')

    // Search
    await projectsPage.search('Search Test 1')

    // Verify filtered results
    await projectsPage.expectProjectCount(1)
    await projectsPage.expectProjectVisible('Search Test 1')
  })

  test('should navigate to project detail page', async ({ page }) => {
    await projectsPage.goto()
    await projectsPage.createProject(
      testProjects.minimal.name,
      testProjects.minimal.path,
      testProjects.minimal.description
    )

    await page.click(`text=${testProjects.minimal.name}`)
    await expect(page).toHaveURL(/\/projects\/[^/]+$/)
  })
})
