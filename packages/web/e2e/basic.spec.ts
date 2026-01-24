/**
 * Basic Navigation E2E Tests
 *
 * Tests basic navigation and UI functionality for routes that exist
 */

import { test, expect } from '@playwright/test'

test.describe('Basic Navigation', () => {
  test('should load home page successfully', async ({ page }) => {
    await page.goto('/')

    // Verify page title
    const title = await page.title()
    expect(title.toLowerCase()).toContain('agistack')

    // Verify main heading is visible
    const heading = page.locator('h1')
    await expect(heading).toContainText('Welcome to AgiStack')

    // Verify description is visible
    await expect(page.locator('text=AI-powered programming assistant')).toBeVisible()
  })

  test('should display navigation cards', async ({ page }) => {
    await page.goto('/')

    // Verify all three navigation cards are visible
    await expect(page.locator('a[href="/projects"]')).toBeVisible()
    await expect(page.locator('a[href="/sessions"]')).toBeVisible()
    await expect(page.locator('a[href="/settings"]')).toBeVisible()
  })

  test('should navigate to projects page', async ({ page }) => {
    await page.goto('/')

    // Click Projects link
    await page.click('a[href="/projects"]')

    // Verify navigation - the projects page should load
    // Note: It might show empty state or error depending on backend
    await expect(page).toHaveURL('/projects')
  })

  test('should navigate to sessions link (even if route not implemented)', async ({ page }) => {
    await page.goto('/')

    // Click Sessions link - it exists in UI but route might not be implemented
    await page.click('a[href="/sessions"]')

    // Will show 404 if not implemented, which is expected
    const url = page.url()
    expect(url).toContain('/sessions')
  })

  test('should navigate to settings link (even if route not implemented)', async ({ page }) => {
    await page.goto('/')

    // Click Settings link - it exists in UI but route might not be implemented
    await page.click('a[href="/settings"]')

    // Will show 404 if not implemented, which is expected
    const url = page.url()
    expect(url).toContain('/settings')
  })

  test('should handle back button navigation', async ({ page }) => {
    await page.goto('/')

    // Navigate to projects
    await page.click('a[href="/projects"]')
    await expect(page).toHaveURL('/projects')

    // Go back
    await page.goBack()
    await expect(page).toHaveURL('/')

    // Navigate forward
    await page.goForward()
    await expect(page).toHaveURL('/projects')
  })
})

test.describe('Responsive Layout', () => {
  test('should display correctly on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/')

    // Verify main container is visible
    const mainContainer = page.locator('.max-w-7xl')
    await expect(mainContainer).toBeVisible()

    // Verify cards are in grid layout
    const cards = page.locator('.grid')
    await expect(cards.first()).toBeVisible()
  })

  test('should display correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Verify page is still accessible
    await expect(page.locator('h1')).toBeVisible()

    // Verify navigation links work
    await expect(page.locator('a[href="/projects"]')).toBeVisible()
  })

  test('should display correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')

    // Verify page is accessible
    await expect(page.locator('h1')).toBeVisible()
  })
})
