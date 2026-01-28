# WebSocket E2E Testing Guide

This guide provides examples and best practices for testing WebSocket functionality in E2E tests.

## Setup

### 1. Import WebSocket helpers

```typescript
import { test, expect } from '@playwright/test'
import {
  createWebSocketHelper,
  injectWebSocketInterceptor,
  waitForWebSocketConnection,
  ConnectionState,
} from '../e2e/helpers/websocket'
import {
  MessageMatcher,
  createRecorder,
  MockChatMessages,
  generateCompleteChatResponse,
  calculateMessageStats,
} from '../e2e/fixtures/websocket'
```

## Basic Examples

### Example 1: Test WebSocket Connection

```typescript
test('should connect to WebSocket server', async ({ page }) => {
  // Navigate to chat page
  await page.goto('/chat/test-session')

  // Inject WebSocket interceptor
  await injectWebSocketInterceptor(page)

  // Wait for connection
  const connected = await waitForWebSocketConnection(page)
  expect(connected).toBe(true)
})
```

### Example 2: Send and Receive Messages

```typescript
test('should send message and receive response', async ({ page }) => {
  await page.goto('/chat/test-session')
  await injectWebSocketInterceptor(page)

  // Create WebSocket helper
  const ws = createWebSocketHelper(page, 'ws://localhost:3001')

  // Connect
  await ws.connect()

  // Send message
  await ws.send('chat', {
    message: 'Hello AI',
    sessionId: 'test-session',
  })

  // Wait for response
  const response = await ws.waitForMessage('chat')
  expect(response.data).toHaveProperty('role', 'assistant')

  // Cleanup
  await ws.close()
})
```

### Example 3: Test Streaming Response

```typescript
test('should receive streaming chunks', async ({ page }) => {
  await page.goto('/chat/test-session')
  await injectWebSocketInterceptor(page)

  const ws = createWebSocketHelper(page, 'ws://localhost:3001')
  await ws.connect()

  // Send message
  await ws.send('chat', { message: 'Tell me a joke' })

  // Wait for chunks
  const chunk1 = await ws.waitForMessage('chunk')
  expect(chunk1.data).toHaveProperty('content')

  const chunk2 = await ws.waitForMessage('chunk')
  expect(chunk2.data).toHaveProperty('index', 1)

  // Wait for completion
  const done = await ws.waitForMessage('done')
  expect(done.data).toHaveProperty('finishReason')

  await ws.close()
})
```

### Example 4: Test Error Handling

```typescript
test('should handle WebSocket errors', async ({ page }) => {
  await page.goto('/chat/test-session')
  await injectWebSocketInterceptor(page)

  const ws = createWebSocketHelper(page, 'ws://localhost:3001')
  await ws.connect()

  // Send invalid message
  await ws.send('chat', { message: '' }) // Empty message

  // Wait for error
  const error = await ws.waitForMessage('error')
  expect(error.data).toHaveProperty('code')

  await ws.close()
})
```

## Advanced Examples

### Example 5: Verify Message Sequence

```typescript
test('should receive messages in correct order', async ({ page }) => {
  await page.goto('/chat/test-session')
  await injectWebSocketInterceptor(page)

  const ws = createWebSocketHelper(page, 'ws://localhost:3001')
  await ws.connect()

  // Send message
  await ws.send('chat', { message: 'Test streaming' })

  // Get all messages
  await ws.waitForMessage('done', 10000)
  const messages = await ws.getMessages()

  // Verify sequence
  const messageTypes = messages.map(m => m.type)
  expect(messageTypes).toContain('chunk')
  expect(messageTypes[messageTypes.length - 1]).toBe('done')

  // Verify chunk order
  const chunks = await ws.getMessagesByType('chunk')
  chunks.forEach((chunk, index) => {
    expect(chunk.data.index).toBe(index)
  })

  await ws.close()
})
```

### Example 6: Use Event Recorder

```typescript
test('should record WebSocket events', async ({ page }) => {
  const recorder = createRecorder()

  await page.goto('/chat/test-session')
  await injectWebSocketInterceptor(page)

  const ws = createWebSocketHelper(page, 'ws://localhost:3001')
  await ws.connect()

  // Record events
  ws.on('chat', (data) => recorder.record('chat', data))
  ws.on('chunk', (data) => recorder.record('chunk', data))
  ws.on('done', (data) => recorder.record('done', data))

  // Send message
  await ws.send('chat', { message: 'Test' })

  // Wait for completion
  await ws.waitForMessage('done')

  // Verify events
  expect(recorder.verify('chat', 1)).toBe(true)
  expect(recorder.verify('chunk')).toBe(true) // At least one chunk
  expect(recorder.verify('done', 1)).toBe(true)

  // Verify sequence
  expect(recorder.verifySequence(['chat', 'chunk', 'done'])).toBe(true)

  await ws.close()
})
```

### Example 7: Message Statistics

```typescript
test('should calculate message statistics', async ({ page }) => {
  await page.goto('/chat/test-session')
  await injectWebSocketInterceptor(page)

  const ws = createWebSocketHelper(page, 'ws://localhost:3001')
  await ws.connect()

  // Send multiple messages
  for (let i = 0; i < 3; i++) {
    await ws.send('chat', { message: `Message ${i}` })
    await ws.waitForMessage('done')
  }

  // Get statistics
  const messages = await ws.getMessages()
  const stats = calculateMessageStats(messages)

  expect(stats.total).toBeGreaterThan(0)
  expect(stats.byType['chat']).toBe(3)
  expect(stats.byType['done']).toBe(3)
  expect(stats.duration).toBeGreaterThan(0)

  await ws.close()
})
```

### Example 8: Test Connection States

```typescript
test('should handle connection states', async ({ page }) => {
  await page.goto('/chat/test-session')
  await injectWebSocketInterceptor(page)

  const ws = createWebSocketHelper(page, 'ws://localhost:3001')

  // Initially disconnected
  expect(ws.getState()).toBe(ConnectionState.DISCONNECTED)

  // Connect
  await ws.connect()
  expect(ws.getState()).toBe(ConnectionState.CONNECTED)

  // Disconnect
  await ws.disconnect()
  expect(ws.getState()).toBe(ConnectionState.DISCONNECTED)

  await ws.close()
})
```

## Testing Patterns

### Pattern 1: Wait for Specific Conditions

```typescript
test('should wait for specific message', async ({ page }) => {
  const ws = createWebSocketHelper(page, 'ws://localhost:3001')
  await ws.connect()

  await ws.send('chat', { message: 'Test' })

  // Wait for chunk with specific content
  const message = await ws.waitForMessage('chunk')
  expect(message.data.content).toContain('expected')

  await ws.close()
})
```

### Pattern 2: Timeout Handling

```typescript
test('should timeout waiting for message', async ({ page }) => {
  const ws = createWebSocketHelper(page, 'ws://localhost:3001')
  await ws.connect()

  // Send message that won't get response
  await ws.send('chat', { message: 'ignore' })

  // Wait with custom timeout
  try {
    await ws.waitForMessage('response', 2000)
    expect.fail('Should have timed out')
  } catch (error) {
    expect(error.message).toContain('Timeout')
  }

  await ws.close()
})
```

### Pattern 3: Clear Message History

```typescript
test('should clear message history between tests', async ({ page }) => {
  const ws = createWebSocketHelper(page, 'ws://localhost:3001')
  await ws.connect()

  // First message
  await ws.send('chat', { message: 'First' })
  await ws.waitForMessage('done')

  // Clear history
  await ws.clearMessages()

  // Second message
  await ws.send('chat', { message: 'Second' })
  await ws.waitForMessage('done')

  // Should only have second message's data
  const messages = await ws.getMessages()
  const doneMessages = messages.filter(m => m.type === 'done')
  expect(doneMessages.length).toBe(1)

  await ws.close()
})
```

## Best Practices

1. **Always cleanup**: Use `try/finally` to ensure WebSocket is closed
2. **Use specific timeouts**: Set appropriate timeouts for each test
3. **Verify state changes**: Check connection state changes
4. **Test error cases**: Include negative tests
5. **Use message matchers**: Leverage `MessageMatcher` for flexible assertions
6. **Record events**: Use `WebSocketEventRecorder` for complex scenarios

## Debugging

### Enable WebSocket Logging

```typescript
test('debug WebSocket messages', async ({ page }) => {
  // Log all WebSocket messages
  page.on('console', msg => {
    if (msg.text().includes('WebSocket')) {
      console.log('WS:', msg.text())
    }
  })

  // Your test code...
})
```

### Take Screenshots on Failure

```typescript
test('should handle errors gracefully', async ({ page }) => {
  try {
    // Test code
  } catch (error) {
    await page.screenshot({ path: 'error-screenshot.png' })
    throw error
  }
})
```

## Mock Data

### Using Fixtures

```typescript
import { MockChatMessages, generateCompleteChatResponse } from '../fixtures/websocket'

test('should use mock data', async ({ page }) => {
  // Use predefined mock
  const greeting = MockChatMessages.greeting

  // Or generate complete response
  const response = generateCompleteChatResponse('This is a test response')

  // Use in tests...
})
```

## Troubleshooting

### Issue: WebSocket not connecting

**Solution**: Ensure the page has loaded before connecting:
```typescript
await page.waitForLoadState('networkidle')
await ws.connect()
```

### Issue: Messages not being received

**Solution**: Inject interceptor before page loads:
```typescript
await page.addInitScript(() => {
  // Interceptor code
})
await page.goto('/chat')
```

### Issue: Timeout waiting for messages

**Solution**: Increase timeout or verify server is sending messages:
```typescript
const message = await ws.waitForMessage('type', 10000) // 10s timeout
```
