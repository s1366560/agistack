/**
 * Authentication E2E tests
 * Tests user login/logout flows
 */

import { test, expect } from '@playwright/test'
import { LoginPage } from './helpers/page-objects'
import { testUsers } from './helpers/test-data'

test.describe('Authentication', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
  })

  test('should login with valid credentials', async ({ page }) => {
    await loginPage.goto()
    await loginPage.login(
      testUsers.valid.email,
      testUsers.valid.password
    )
    await loginPage.expectLoggedIn()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await loginPage.goto()
    await loginPage.login('invalid@example.com', 'wrongpassword')
    await loginPage.expectError(/invalid credentials/i)
  })

  test('should validate email format', async ({ page }) => {
    await loginPage.goto()
    await loginPage.fillEmail(testUsers.invalid.email)
    await loginPage.submit()
    await loginPage.expectError(/invalid email/i)
  })

  test('should logout successfully', async ({ page }) => {
    await loginPage.goto()
    await loginPage.login(
      testUsers.valid.email,
      testUsers.valid.password
    )

    await page.click('button:has-text("Logout")')
    await expect(page).toHaveURL('/login')
  })
})
