/**
 * Page Object Model for Chat Page
 */

import { Page, Locator, expect } from '@playwright/test'

export class ChatPageObj {
  readonly page: Page
  readonly chatContainer: Locator
  readonly header: Locator
  readonly backButton: Locator
  readonly chatTitle: Locator
  readonly darkModeToggle: Locator
  readonly messageList: Locator
  readonly emptyState: Locator
  readonly inputArea: Locator
  readonly textarea: Locator
  readonly sendButton: Locator
  readonly loadingIndicator: Locator

  constructor(page: Page) {
    this.page = page
    this.chatContainer = page.locator('[data-testid="chat-page"]')
    this.header = page.locator('[data-testid="chat-header"]')
    this.backButton = page.locator('[data-testid="back-button"]')
    this.chatTitle = page.locator('[data-testid="chat-title"]')
    this.darkModeToggle = page.locator('[data-testid="dark-mode-toggle"]')
    this.messageList = page.locator('[data-testid="message-list"]')
    this.emptyState = page.locator('[data-testid="empty-state"]')
    this.inputArea = page.locator('[data-testid="input-area"]')
    this.textarea = page.locator('textarea[aria-label="消息输入框"]')
    this.sendButton = page.locator('[data-testid="send-button"]')
    this.loadingIndicator = page.locator('[data-testid="loading-indicator"]')
  }

  async goto(sessionId: string) {
    await this.page.goto(`/chat/${sessionId}`)
    await this.page.waitForLoadState('networkidle')
  }

  async expectVisible() {
    await expect(this.chatContainer).toBeVisible()
  }

  async expectEmptyState() {
    await expect(this.emptyState).toBeVisible()
    await expect(this.emptyState).toContainText('暂无消息')
  }

  async asyncExpectMessageWithRole(role: 'user' | 'assistant', timeout = 30000) {
    await expect(
      this.page.locator(`[data-message-role="${role}"]`).last()
    ).toBeVisible({ timeout })
  }

  async asyncGetLastMessage(role: 'user' | 'assistant') {
    const message = this.page.locator(`[data-message-role="${role}"]`).last()
    return await message.textContent()
  }

  async asyncGetMessageCount(role?: 'user' | 'assistant') {
    if (role) {
      return await this.page.locator(`[data-message-role="${role}"]`).count()
    }
    return await this.page.locator('[data-message-role]').count()
  }

  async asyncSendMessage(message: string) {
    await this.textarea.fill(message)
    await this.sendButton.click()
  }

  async asyncSendAndWait(message: string, timeout = 30000) {
    await this.asyncSendMessage(message)
    await this.asyncExpectMessageWithRole('assistant', timeout)
  }

  async asyncClickBack() {
    await this.backButton.click()
  }

  async asyncToggleDarkMode() {
    await this.darkModeToggle.click()
  }

  async isDarkMode() {
    const chatPage = this.page.locator('[data-testid="chat-page"]')
    const classList = await chatPage.getAttribute('class')
    return classList?.includes('dark') || false
  }

  async isInputDisabled() {
    return await this.textarea.isDisabled()
  }

  async isSendButtonDisabled() {
    return await this.sendButton.isDisabled()
  }
}
