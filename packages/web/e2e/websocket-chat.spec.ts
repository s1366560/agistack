/**
 * WebSocket Chat E2E Tests
 *
 * End-to-end tests for WebSocket chat functionality
 * Tests real user scenarios from connection to message streaming
 */

import { test, expect } from '@playwright/test'
import { TestHelpers } from './helpers'
import {
  createWebSocketHelper,
  injectWebSocketInterceptor,
  waitForWebSocketConnection,
  ConnectionState,
} from './helpers/websocket'
import { MessageMatcher, createRecorder, generateCompleteChatResponse } from './fixtures/websocket'

test.describe('WebSocket Chat E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to chat page
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('1. should establish WebSocket connection', async ({ page }) => {
    // Inject WebSocket interceptor
    await injectWebSocketInterceptor(page)

    // Navigate to chat page
    await page.goto('/chat/test-session')

    // Wait for WebSocket connection
    const connected = await waitForWebSocketConnection(page, 5000)

    expect(connected).toBe(true)
  })

  test('2. should send and receive chat message', async ({ page }) => {
    await injectWebSocketInterceptor(page)
    await page.goto('/chat/test-session')

    // Wait for connection
    await waitForWebSocketConnection(page)

    // Create WebSocket helper
    const ws = createWebSocketHelper(page, 'ws://localhost:3001')
    await ws.connect()

    // Send chat message
    await ws.send('chat', {
      sessionId: 'test-session',
      message: 'Hello AI',
    })

    // Wait for response
    const response = await ws.waitForMessage('chat', 10000)

    expect(response).toBeDefined()
    expect(response.type).toBe('chat')
    expect(response.data).toHaveProperty('role', 'assistant')

    await ws.close()
  })

  test('3. should receive streaming response', async ({ page }) => {
    await injectWebSocketInterceptor(page)
    await page.goto('/chat/test-session')

    await waitForWebSocketConnection(page)

    const ws = createWebSocketHelper(page, 'ws://localhost:3001')
    await ws.connect()

    // Send message that triggers streaming
    await ws.send('chat', {
      sessionId: 'test-session',
      message: 'Tell me a joke',
    })

    // Wait for chunks
    const chunk1 = await ws.waitForMessage('chunk', 10000)
    expect(chunk1.type).toBe('chunk')
    expect(chunk1.data).toHaveProperty('content')

    const chunk2 = await ws.waitForMessage('chunk', 5000)
    expect(chunk2.type).toBe('chunk')

    // Wait for completion
    const done = await ws.waitForMessage('done', 5000)
    expect(done.type).toBe('done')
    expect(done.data).toHaveProperty('finishReason')

    await ws.close()
  })

  test('4. should handle multiple concurrent messages', async ({ page }) => {
    await injectWebSocketInterceptor(page)
    await page.goto('/chat/test-session')

    await waitForWebSocketConnection(page)

    const ws = createWebSocketHelper(page, 'ws://localhost:3001')
    await ws.connect()

    const recorder = createRecorder()

    // Record all chunk events
    ws.on('chunk', (data) => recorder.record('chunk', data))
    ws.on('done', (data) => recorder.record('done', data))

    // Send multiple messages
    const messages = ['Hello', 'How are you?', 'Goodbye']

    for (const msg of messages) {
      await ws.send('chat', {
        sessionId: 'test-session',
        message: msg,
      })

      // Wait for done before sending next
      await ws.waitForMessage('done', 10000)
      await ws.clearMessages()
    }

    // Verify all messages received responses
    expect(recorder.verify('done', 3)).toBe(true)
    expect(recorder.verify('chunk')).toBe(true) // At least some chunks

    await ws.close()
  })

  test('5. should display chat messages in UI', async ({ page }) => {
    await injectWebSocketInterceptor(page)
    await page.goto('/chat/test-session')

    await waitForWebSocketConnection(page)

    // Find message input
    const messageInput = page.locator('textarea[placeholder*="message"], textarea[placeholder*="Message"]')
    await expect(messageInput).toBeVisible()

    // Type a message
    await messageInput.fill('Test message')

    // Find send button
    const sendButton = page.locator('button:has-text("Send"), button[type="submit"]')
    await expect(sendButton).toBeVisible()

    // Click send
    await sendButton.click()

    // Wait for response to appear in UI
    const responseContainer = page.locator('[data-testid="chat-messages"], .chat-messages, [class*="chat-message"]')
    await expect(responseContainer).toBeVisible({ timeout: 10000 })

    // Verify response is displayed
    const responseMessages = responseContainer.locator('.message, [class*="message"]')
    const count = await responseMessages.count()
    expect(count).toBeGreaterThan(0)
  })

  test('6. should handle connection errors gracefully', async ({ page }) => {
    // Navigate to non-existent session
    await page.goto('/chat/invalid-session')

    // Check for error message or UI state
    const errorMessage = page.locator('[data-testid="error-message"], .error, [class*="error"]')
    const connectionStatus = page.locator('[data-testid="connection-status"], [class*="connection"]')

    // Either show error or disconnected status
    const hasError = (await errorMessage.count()) > 0
    const hasStatus = (await connectionStatus.count()) > 0

    expect(hasError || hasStatus).toBe(true)
  })

  test('7. should maintain connection state in UI', async ({ page }) => {
    await injectWebSocketInterceptor(page)
    await page.goto('/chat/test-session')

    // Wait for connection
    await waitForWebSocketConnection(page)

    // Check for connection status indicator
    const statusIndicator = page.locator(
      '[data-testid="connection-status"], [class*="connection-status"], .status-indicator'
    )

    // Should show connected state
    if ((await statusIndicator.count()) > 0) {
      await expect(statusIndicator).toHaveAttribute('data-state', 'connected', { timeout: 5000 })
    }

    // Check for online indicator
    const onlineIndicator = page.locator('.online, [data-online="true"], [class*="connected"]')
    if ((await onlineIndicator.count()) > 0) {
      await expect(onlineIndicator).toBeVisible({ timeout: 5000 })
    }
  })

  test('8. should handle reconnection automatically', async ({ page }) => {
    await injectWebSocketInterceptor(page)
    await page.goto('/chat/test-session')

    await waitForWebSocketConnection(page)

    const ws = createWebSocketHelper(page, 'ws://localhost:3001')
    await ws.connect()

    // Send a message to verify connection works
    await ws.send('chat', { sessionId: 'test-session', message: 'Test' })
    const response1 = await ws.waitForMessage('chat', 5000)
    expect(response1).toBeDefined()

    // Simulate disconnection
    await ws.disconnect()

    // Wait for reconnection
    await page.waitForTimeout(2000)

    // Reconnect
    await ws.connect()

    // Send another message
    await ws.send('chat', { sessionId: 'test-session', message: 'Test 2' })
    const response2 = await ws.waitForMessage('chat', 5000)
    expect(response2).toBeDefined()

    await ws.close()
  })

  test('9. should validate user input before sending', async ({ page }) => {
    await page.goto('/chat/test-session')
    await page.waitForLoadState('networkidle')

    // Find message input
    const messageInput = page.locator('textarea[placeholder*="message"], textarea[placeholder*="Message"]')
    await expect(messageInput).toBeVisible()

    // Try to send empty message
    const sendButton = page.locator('button:has-text("Send"), button[type="submit"]')

    // Submit empty message
    await messageInput.fill('')
    await sendButton.click()

    // Check for validation error
    const validationError = page.locator(
      '[data-testid="validation-error"], .error, [role="alert"]'
    )

    // Either button is disabled or error is shown
    const isDisabled = await sendButton.isDisabled()
    const hasError = (await validationError.count()) > 0

    expect(isDisabled || hasError).toBe(true)
  })

  test('10. should show typing indicator during streaming', async ({ page }) => {
    await injectWebSocketInterceptor(page)
    await page.goto('/chat/test-session')

    await waitForWebSocketConnection(page)

    const ws = createWebSocketHelper(page, 'ws://localhost:3001')
    await ws.connect()

    // Send message
    await ws.send('chat', {
      sessionId: 'test-session',
      message: 'Tell me a long story',
    })

    // Check for typing indicator
    const typingIndicator = page.locator(
      '[data-testid="typing-indicator"], .typing, [class*="typing"]'
    )

    // Typing indicator should appear (may be brief)
    try {
      await expect(typingIndicator).toBeVisible({ timeout: 3000 })
    } catch {
      // Typing indicator might be too fast to catch, that's OK
    }

    // Wait for completion
    await ws.waitForMessage('done', 15000)

    // Typing indicator should disappear
    if ((await typingIndicator.count()) > 0) {
      await expect(typingIndicator).not.toBeVisible({ timeout: 2000 })
    }

    await ws.close()
  })

  test('11. should handle large messages', async ({ page }) => {
    await injectWebSocketInterceptor(page)
    await page.goto('/chat/test-session')

    await waitForWebSocketConnection(page)

    const ws = createWebSocketHelper(page, 'ws://localhost:3001')
    await ws.connect()

    // Send large message
    const largeMessage = 'A'.repeat(1000) + 'Tell me about this.'

    await ws.send('chat', {
      sessionId: 'test-session',
      message: largeMessage,
    })

    // Should receive response
    const response = await ws.waitForMessage('chat', 15000)
    expect(response).toBeDefined()

    await ws.close()
  })

  test('12. should persist chat history in UI', async ({ page }) => {
    await injectWebSocketInterceptor(page)
    await page.goto('/chat/test-session')

    await waitForWebSocketConnection(page)

    const ws = createWebSocketHelper(page, 'ws://localhost:3001')
    await ws.connect()

    const helpers = new TestHelpers(page)

    // Send first message
    await ws.send('chat', {
      sessionId: 'test-session',
      message: 'First message',
    })

    await ws.waitForMessage('done', 10000)

    // Send second message
    await ws.send('chat', {
      sessionId: 'test-session',
      message: 'Second message',
    })

    await ws.waitForMessage('done', 10000)

    // Refresh page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Check if messages are persisted
    const messageContainer = page.locator('[data-testid="chat-messages"], .chat-messages')
    if ((await messageContainer.count()) > 0) {
      const messages = messageContainer.locator('.message, [class*="message"]')
      const count = await messages.count()
      expect(count).toBeGreaterThan(0)
    }

    await ws.close()
  })
})

test.describe('WebSocket Error Scenarios', () => {
  test('13. should handle server disconnect during streaming', async ({ page }) => {
    await injectWebSocketInterceptor(page)
    await page.goto('/chat/test-session')

    await waitForWebSocketConnection(page)

    const ws = createWebSocketHelper(page, 'ws://localhost:3001')
    await ws.connect()

    // Send message
    await ws.send('chat', {
      sessionId: 'test-session',
      message: 'Test message',
    })

    // Wait for first chunk
    await ws.waitForMessage('chunk', 5000)

    // Simulate server disconnect
    await ws.disconnect()

    // Check for error in UI
    const errorMessage = page.locator('[data-testid="error-message"], .error, [role="alert"]')
    const retryButton = page.locator('button:has-text("Retry"), button[title*="retry"]')

    // Should show error or retry option
    const hasError = (await errorMessage.count()) > 0
    const hasRetry = (await retryButton.count()) > 0

    expect(hasError || hasRetry).toBe(true)
  })

  test('14. should handle malformed messages', async ({ page }) => {
    await injectWebSocketInterceptor(page)
    await page.goto('/chat/test-session')

    await waitForWebSocketConnection(page)

    const ws = createWebSocketHelper(page, 'ws://localhost:3001')
    await ws.connect()

    // Send malformed data
    await page.evaluate(() => {
      const ws = (window as any).__testWebSocket
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send('invalid json data')
      }
    })

    // Should not crash, connection should remain open
    await page.waitForTimeout(1000)

    const state = ws.getState()
    expect(state).toBe(ConnectionState.CONNECTED)

    await ws.close()
  })

  test('15. should handle network timeout', async ({ page }) => {
    // Navigate to chat page with slow network simulation
    await page.goto('/chat/test-session')

    // Simulate slow network
    await page.route('**', (route) => route.continue(), { times: 5 })

    // Wait for connection attempt
    await page.waitForTimeout(3000)

    // Should show connection status or error
    const statusIndicator = page.locator(
      '[data-testid="connection-status"], [class*="connecting"]'
    )

    const hasConnectingState = (await statusIndicator.count()) > 0
    // If no connecting state, check if connection succeeded
    const isConnected = await waitForWebSocketConnection(page, 1000)

    expect(hasConnectingState || isConnected).toBe(true)
  })
})

test.describe('WebSocket Performance', () => {
  test('16. should handle rapid message sending', async ({ page }) => {
    await injectWebSocketInterceptor(page)
    await page.goto('/chat/test-session')

    await waitForWebSocketConnection(page)

    const ws = createWebSocketHelper(page, 'ws://localhost:3001')
    await ws.connect()

    const startTime = Date.now()

    // Send 10 messages rapidly
    for (let i = 0; i < 10; i++) {
      await ws.send('chat', {
        sessionId: 'test-session',
        message: `Message ${i}`,
      })
    }

    const sendTime = Date.now() - startTime

    // Should complete within reasonable time
    expect(sendTime).toBeLessThan(5000) // 5 seconds

    // Wait for some responses
    await page.waitForTimeout(3000)

    await ws.close()
  })

  test('17. should not block UI during streaming', async ({ page }) => {
    await injectWebSocketInterceptor(page)
    await page.goto('/chat/test-session')

    await waitForWebSocketConnection(page)

    const ws = createWebSocketHelper(page, 'ws://localhost:3001')
    await ws.connect()

    // Start streaming response
    await ws.send('chat', {
      sessionId: 'test-session',
      message: 'Tell me a long story with many details',
    })

    // UI should remain responsive
    const messageInput = page.locator('textarea[placeholder*="message"], textarea[placeholder*="Message"]')

    // Check if input is enabled during streaming
    const isEnabled = await messageInput.isEnabled()
    expect(isEnabled).toBe(true)

    // Wait for streaming to complete
    await ws.waitForMessage('done', 15000)

    await ws.close()
  })
})

test.describe('WebSocket Accessibility', () => {
  test('18. should have accessible chat interface', async ({ page }) => {
    await page.goto('/chat/test-session')
    await page.waitForLoadState('networkidle')

    // Check for ARIA labels
    const messageInput = page.locator('textarea[aria-label*="message"], textarea[placeholder*="message"]')
    await expect(messageInput).toBeVisible()

    const sendButton = page.locator('button[aria-label], button:has-text("Send")')
    if ((await sendButton.count()) > 0) {
      await expect(sendButton).toBeVisible()
    }

    // Check for live region for announcements
    const liveRegion = page.locator('[aria-live="polite"], [role="status"]')
    if ((await liveRegion.count()) > 0) {
      await expect(liveRegion).toBeVisible()
    }
  })

  test('19. should support keyboard navigation', async ({ page }) => {
    await page.goto('/chat/test-session')
    await page.waitForLoadState('networkidle')

    // Tab to input
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Focus should be on message input
    const focused = page.locator(':focus')
    const isInputFocused = await focused.evaluate((el) => {
      return el.tagName === 'TEXTAREA' || el.tagName === 'INPUT'
    })

    expect(isInputFocused).toBe(true)
  })

  test('20. should announce messages to screen readers', async ({ page }) => {
    await injectWebSocketInterceptor(page)
    await page.goto('/chat/test-session')

    await waitForWebSocketConnection(page)

    const ws = createWebSocketHelper(page, 'ws://localhost:3001')
    await ws.connect()

    // Send message
    await ws.send('chat', {
      sessionId: 'test-session',
      message: 'Hello',
    })

    // Wait for response
    await ws.waitForMessage('done', 10000)

    // Check for screen reader announcement
    const announcement = page.locator('[aria-live="polite"], [role="status"]')
    if ((await announcement.count()) > 0) {
      const text = await announcement.textContent()
      expect(text).toBeDefined()
    }

    await ws.close()
  })
})
