/**
 * Page Object Model for Home Page
 */

import { Page, Locator, expect } from '@playwright/test'

export class HomePage {
  readonly page: Page
  readonly heading: Locator
  readonly description: Locator
  readonly projectsLink: Locator
  readonly sessionsLink: Locator
  readonly settingsLink: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.locator('h1')
    this.description = page.locator('text=AI-powered programming assistant')
    this.projectsLink = page.locator('a[href="/projects"]')
    this.sessionsLink = page.locator('a[href="/sessions"]')
    this.settingsLink = page.locator('a[href="/settings"]')
  }

  async goto() {
    await this.page.goto('/')
    await this.page.waitForLoadState('networkidle')
  }

  async clickProjects() {
    await this.projectsLink.click()
    await this.page.waitForLoadState('networkidle')
  }

  async clickSessions() {
    await this.sessionsLink.click()
    await this.page.waitForLoadState('networkidle')
  }

  async clickSettings() {
    await this.settingsLink.click()
    await this.page.waitForLoadState('networkidle')
  }

  async expectVisible() {
    await expect(this.heading).toContainText('Welcome to AgiStack')
  }
}
