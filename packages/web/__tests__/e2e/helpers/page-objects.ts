/**
 * Page Object Models for E2E testing
 * Encapsulates page interactions to reduce test brittleness
 */

import { Page, expect } from '@playwright/test'

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login')
  }

  async fillEmail(email: string) {
    await this.page.fill('input[name="email"]', email)
  }

  async fillPassword(password: string) {
    await this.page.fill('input[name="password"]', password)
  }

  async submit() {
    await this.page.click('button[type="submit"]')
  }

  async login(email: string, password: string) {
    await this.fillEmail(email)
    await this.fillPassword(password)
    await this.submit()
  }

  async expectLoggedIn() {
    await expect(this.page).toHaveURL(/\/dashboard/)
  }

  async expectError(message: string) {
    await expect(this.page.getByText(message)).toBeVisible()
  }
}

export class ProjectsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/projects')
  }

  async search(query: string) {
    await this.page.fill('input[placeholder*="search" i]', query)
    await this.page.waitForTimeout(600) // Wait for debounce
  }

  async clickCreateProject() {
    await this.page.click('button:has-text("Create Project")')
  }

  async fillProjectName(name: string) {
    await this.page.fill('input[name="name"]', name)
  }

  async fillProjectPath(path: string) {
    await this.page.fill('input[name="path"]', path)
  }

  async fillDescription(description: string) {
    await this.page.fill('textarea[name="description"]', description)
  }

  async submit() {
    await this.page.click('button[type="submit"]')
  }

  async createProject(name: string, path: string, description: string) {
    await this.clickCreateProject()
    await this.fillProjectName(name)
    await this.fillProjectPath(path)
    await this.fillDescription(description)
    await this.submit()
  }

  async expectProjectCount(count: number) {
    await expect(this.page.locator('[data-testid="project-card"]')).toHaveCount(
      count
    )
  }

  async expectProjectVisible(name: string) {
    await expect(this.page.getByText(name)).toBeVisible()
  }
}

export class SessionPage {
  constructor(private page: Page) {}

  async goto(projectSlug: string, sessionId: string) {
    await this.page.goto(`/projects/${projectSlug}/sessions/${sessionId}`)
  }

  async sendMessage(message: string) {
    await this.page.fill('textarea[placeholder*="message" i]', message)
    await this.page.click('button[type="submit"]')
  }

  async expectMessageVisible(content: string) {
    await expect(this.page.getByText(content)).toBeVisible()
  }

  async expectAgentTyping() {
    await expect(
      this.page.getByText(/typing|thinking|generating/i)
    ).toBeVisible()
  }

  async clickAgentType(type: string) {
    await this.page.click(`button:has-text("${type}")`)
  }
}
