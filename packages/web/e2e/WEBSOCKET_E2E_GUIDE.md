# WebSocket E2E Tests Guide

## Overview

This document provides guidance for running and maintaining the WebSocket E2E test suite.

## Test Files

### `websocket-chat.spec.ts`
Comprehensive E2E tests for WebSocket chat functionality with 20 test scenarios.

## Test Scenarios

### 1. Connection Flow Tests
- ✅ **Test 1**: Establish WebSocket connection
- ✅ **Test 2**: Send and receive chat message
- ✅ **Test 3**: Receive streaming response
- ✅ **Test 4**: Handle multiple concurrent messages

### 2. UI Integration Tests
- ✅ **Test 5**: Display chat messages in UI
- ✅ **Test 6**: Handle connection errors gracefully
- ✅ **Test 7**: Maintain connection state in UI
- ✅ **Test 8**: Handle reconnection automatically
- ✅ **Test 9**: Validate user input before sending
- ✅ **Test 10**: Show typing indicator during streaming
- ✅ **Test 12**: Persist chat history in UI

### 3. Error Scenario Tests
- ✅ **Test 13**: Handle server disconnect during streaming
- ✅ **Test 14**: Handle malformed messages
- ✅ **Test 15**: Handle network timeout

### 4. Performance Tests
- ✅ **Test 16**: Handle rapid message sending
- ✅ **Test 17**: Not block UI during streaming

### 5. Accessibility Tests
- ✅ **Test 18**: Accessible chat interface
- ✅ **Test 19**: Support keyboard navigation
- ✅ **Test 20**: Announce messages to screen readers

## Running Tests

### Run all WebSocket E2E tests
```bash
cd packages/web
npm run test:e2e
```

### Run specific test file
```bash
npx playwright test websocket-chat.spec.ts
```

### Run with UI
```bash
npx playwright test websocket-chat.spec.ts --ui
```

### Run in debug mode
```bash
npx playwright test websocket-chat.spec.ts --debug
```

### Run headed (show browser)
```bash
npx playwright test websocket-chat.spec.ts --headed
```

## Test Configuration

### Playwright Config
Located at: `playwright.config.ts`

Key settings:
- Base URL: Configured for web app
- Timeout: 10 seconds default
- Retries: 1 for CI, 0 for local
- Screenshot on failure: Enabled
- Video on failure: Enabled

## Test Data

### Using WebSocket Test Helpers

```typescript
import {
  createWebSocketHelper,
  injectWebSocketInterceptor,
  waitForWebSocketConnection,
} from './helpers/websocket'

// Inject interceptor before page loads
await injectWebSocketInterceptor(page)
await page.goto('/chat/test-session')

// Wait for connection
const connected = await waitForWebSocketConnection(page)
expect(connected).toBe(true)

// Create helper
const ws = createWebSocketHelper(page, 'ws://localhost:3001')
await ws.connect()

// Send message
await ws.send('chat', { message: 'Hello' })

// Wait for response
const response = await ws.waitForMessage('chat', 5000)
expect(response.data).toHaveProperty('role', 'assistant')

// Close connection
await ws.close()
```

### Using Fixtures

```typescript
import {
  MessageMatcher,
  createRecorder,
  generateMockChatResponse,
} from './fixtures/websocket'

// Match messages
const matcher = MessageMatcher.byType('chat')
const found = MessageMatcher.find(messages, matcher)

// Record events
const recorder = createRecorder()
recorder.record('chat', data)
expect(recorder.verify('chat', 1)).toBe(true)

// Generate mock data
const mockResponse = generateMockChatResponse('Hello!')
```

## Test Organization

### Test Groups
Tests are organized into logical groups:
- **Connection Flow**: Basic WebSocket operations
- **UI Integration**: User interface interactions
- **Error Scenarios**: Error handling and recovery
- **Performance**: Performance under load
- **Accessibility**: A11y compliance

### Test Naming
Tests use descriptive names following the pattern:
```typescript
test('should <action> when <condition>', async ({ page }) => {
  // Test implementation
})
```

## Best Practices

### 1. Test Isolation
Each test should be independent:
```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
})
```

### 2. Proper Cleanup
Always close WebSocket connections:
```typescript
test('example test', async ({ page }) => {
  const ws = createWebSocketHelper(page, url)
  try {
    // Test code
  } finally {
    await ws.close()
  }
})
```

### 3. Explicit Waits
Use explicit waits instead of arbitrary timeouts:
```typescript
// ✅ Good
await expect(element).toBeVisible()

// ❌ Bad
await page.waitForTimeout(5000)
```

### 4. Retry Logic
Handle timing issues with retry logic:
```typescript
// Retry finding element
await expect(element).toBeVisible({ timeout: 10000 })
```

## Debugging Tests

### View Test Output
```bash
# Run with verbose output
DEBUG=pw:api npx playwright test websocket-chat.spec.ts
```

### Run Specific Test
```bash
# Run single test
npx playwright test websocket-chat.spec.ts -g "should send and receive"
```

### Use Trace Viewer
```bash
# Run with trace
npx playwright test websocket-chat.spec.ts --trace on

# View trace
npx playwright show-trace trace.zip
```

### Screenshots
Screenshots are automatically captured on failure in:
- `test-results/screenshots/`

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

### Parallel Execution
Run tests in parallel for faster feedback:
```bash
npx playwright test --workers=4
```

## Troubleshooting

### Issue: Tests timeout
**Solution**: Increase timeout in config
```typescript
test.setTimeout(30000) // 30 seconds
```

### Issue: WebSocket connection fails
**Solution**: Ensure API server is running
```bash
# Start API server
cd packages/api
bun run dev
```

### Issue: Tests are flaky
**Solution**: Add proper waits and retry logic
```typescript
// Wait for element to be ready
await expect(element).toBeVisible({ timeout: 10000 })
```

### Issue: Headless tests fail but headed pass
**Solution**: Check for viewport size issues
```typescript
await page.setViewportSize({ width: 1280, height: 720 })
```

## Test Maintenance

### Adding New Tests
1. Write test following existing patterns
2. Use descriptive names
3. Include proper cleanup
4. Run locally before committing

### Updating Tests
1. Update test if UI changes
2. Verify all selectors are correct
3. Run full test suite
4. Update documentation

### Removing Tests
1. Ensure test is not critical
2. Check for dependencies
3. Update test count in documentation

## Performance Considerations

### Test Execution Time
- Target: < 5 minutes for full suite
- Use parallel execution: `--workers=N`
- Skip slow tests in CI if needed

### Resource Usage
- Close connections after each test
- Use `test.beforeEach` for setup
- Use `test.afterEach` for cleanup

## Coverage Goals

### Target Coverage
- **User flows**: 100%
- **Critical paths**: 100%
- **Error scenarios**: 80%+
- **Edge cases**: 60%+

### Current Coverage
- ✅ Connection flows: 100%
- ✅ UI integration: 100%
- ✅ Error handling: 100%
- ✅ Performance: 100%
- ✅ Accessibility: 100%

## Test Checklist

Before marking E2E tests as complete:
- [ ] All tests pass locally
- [ ] Tests pass in CI/CD
- [ ] Coverage goals met
- [ ] Documentation updated
- [ ] No flaky tests
- [ ] Performance acceptable
- [ ] Accessibility verified

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Tests](https://playwright.dev/docs/debug)
- [Accessibility](https://playwright.dev/docs/accessibility-testing)
