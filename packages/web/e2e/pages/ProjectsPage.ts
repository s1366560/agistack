/**
 * Page Object Model for Projects Page
 */

import { Page, Locator, expect } from '@playwright/test'

export class ProjectsPage {
  readonly page: Page
  readonly heading: Locator
  readonly createProjectLink: Locator
  readonly projectCards: Locator
  readonly emptyState: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.locator('h1:has-text("Projects")')
    this.createProjectLink = page.locator('a[href="/projects/new"]')
    this.projectCards = page.locator('.grid .grid-cols-1 > div')
    this.emptyState = page.locator('text=No projects yet')
  }

  async goto() {
    await this.page.goto('/projects')
    await this.page.waitForLoadState('networkidle')
  }

  async expectVisible() {
    await expect(this.heading).toBeVisible()
  }

  async getProjectCount() {
    return await this.projectCards.count()
  }

  async isEmpty() {
    return await this.emptyState.isVisible()
  }

  async clickCreateProject() {
    await this.createProjectLink.click()
  }

  async getProjectNames() {
    const names: string[] = []
    const count = await this.getProjectCount()
    for (let i = 0; i < count; i++) {
      const name = await this.projectCards.nth(i).locator('a').first().textContent()
      if (name) names.push(name.trim())
    }
    return names
  }

  async clickProject(name: string) {
    const projectLink = this.page.locator(`a:has-text("${name}")`)
    await projectLink.click()
  }

  async deleteProject(name: string) {
    // Find the project card with the name
    const card = this.page.locator('.grid .grid-cols-1 > div').filter({ hasText: name })

    // Click the delete button (SVG icon)
    const deleteButton = card.locator('button[title="Delete project"]')

    // Accept the confirmation dialog
    this.page.once('dialog', async dialog => {
      await dialog.accept()
    })

    await deleteButton.click()
    await this.page.waitForTimeout(500) // Wait for deletion to process
  }
}
