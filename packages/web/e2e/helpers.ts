/**
 * E2E Test Helpers and Utilities
 *
 * Provides test helper functions and global configuration
 */

import { test as base, type Page } from '@playwright/test'

// Define custom test fixtures
export const test = base.extend({
  // Custom page setup with error logging
  page: async ({ page }, use) => {
    // Set default timeout
    page.setDefaultTimeout(10000)

    // Listen for page errors
    page.on('pageerror', (error) => {
      console.error('Page error:', error)
    })

    // Listen for console messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Console error:', msg.text())
      }
    })

    await use(page)
  },
})

/**
 * Test helper class for common operations
 */
export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Navigate to home page
   */
  async gotoHome() {
    await this.page.goto('/')
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Wait for page load
   */
  async waitForLoad() {
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Take screenshot for debugging
   */
  async screenshot(name: string) {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: true
    })
  }

  /**
   * Get current URL
   */
  getUrl() {
    return this.page.url()
  }
}

/**
 * Test data generator
 */
export class TestDataGenerator {
  /**
   * Generate random email
   */
  static randomEmail() {
    return `test-${Date.now()}@example.com`
  }

  /**
   * Generate random username
   */
  static randomUsername() {
    return `user_${Date.now()}`
  }

  /**
   * Generate random message
   */
  static randomMessage() {
    const messages = [
      'Hello AI',
      'How are you?',
      'What can you do?',
      'Tell me a joke',
      'Help me with code'
    ]
    return messages[Math.floor(Math.random() * messages.length)]
  }

  /**
   * Generate long text
   */
  static longText(length: number) {
    return 'A'.repeat(length)
  }

  /**
   * Generate text with special characters
   */
  static specialCharsText() {
    return 'Test: < > & " \' \n \t @ # $ % ^ * ( ) _ + - = { } [ ] | \\ : ; " \' < > , . ? /'
  }
}

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map()

  /**
   * Record performance metric
   */
  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name)!.push(value)
  }

  /**
   * Get average metric value
   */
  getAverageMetric(name: string) {
    const values = this.metrics.get(name)
    if (!values || values.length === 0) {
      return 0
    }
    return values.reduce((a, b) => a + b, 0) / values.length
  }

  /**
   * Verify threshold
   */
  verifyThreshold(name: string, threshold: number) {
    const avg = this.getAverageMetric(name)
    return avg <= threshold
  }
}
