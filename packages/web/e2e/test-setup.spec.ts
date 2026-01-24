import { test, expect } from '@playwright/test'

test('basic playwright test', async ({ page }) => {
  await page.goto('https://playwright.dev')
  await expect(page).toHaveTitle(/Playwright/)
})
