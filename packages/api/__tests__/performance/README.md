# WebSocket Performance Tests

This directory contains performance and stability tests for the WebSocket server.

## Test Files

### `websocket-load.test.ts`
Tests WebSocket server under high concurrent connection load:
- **100 concurrent connections** - Validates server can handle connection load
- **Load stability** - Ensures server remains responsive under load
- **Rapid connect/disconnect** - Tests connection cycling stability
- **Memory leak detection** - Monitors memory usage during load cycles

### `websocket-stability.test.ts`
Tests WebSocket server stability over extended periods:
- **Message throughput** - Validates 1000+ messages/second capacity
- **Streaming latency** - Ensures low latency for streaming responses
- **Long-term stability** - Tests server stability over time (30s in CI, 5min locally)
- **Error recovery** - Validates server recovers from temporary errors

### `baseline.json`
Defines performance baselines and thresholds:
- Target metrics for each test category
- Warning and critical thresholds (110% and 125% of baseline)
- Used to detect performance regressions

## Running Performance Tests

### Run all performance tests
```bash
npm test -- __tests__/performance/
```

### Run specific test file
```bash
npm test -- websocket-load.test.ts
npm test -- websocket-stability.test.ts
```

### Run with coverage
```bash
npm test -- __tests__/performance/ --coverage
```

## Performance Baselines

Current baselines are defined in `baseline.json`:

```json
{
  "baseline": {
    "concurrentConnections": {
      "target": 100,
      "acceptableLatencyMs": 100,
      "maxMemoryMB": 512
    },
    "connectionStability": {
      "cycles": 1000,
      "targetSuccessRate": 0.99
    },
    "messageThroughput": {
      "messagesPerSecond": 1000,
      "maxLatencyMs": 50
    },
    "streamingLatency": {
      "targetLatencyMs": 100,
      "chunkIntervalMs": 50,
      "maxJitterMs": 20
    },
    "longTermStability": {
      "durationMinutes": 5,
      "maxMemoryGrowthMB": 100,
      "maxErrorRate": 0.01
    }
  }
}
```

## Interpreting Results

### Success Criteria
Tests pass if:
- ✅ Connections/throughput meet or exceed targets
- ✅ Latency remains within acceptable limits
- ✅ Error rates stay below threshold
- ✅ Memory growth is controlled

### Performance Regression Detection
Results are compared against baselines with thresholds:
- **Warning** (110%): Performance degraded by 10%
- **Critical** (125%): Performance degraded by 25%

### Memory Leak Detection
Memory is monitored during tests:
- Initial memory snapshot taken
- Final memory snapshot taken
- Growth calculated (final - initial)
- Test fails if growth exceeds threshold

## Test Configuration

### Adjusting Test Duration
For CI/CD environments, tests use shorter durations:

```typescript
// In websocket-stability.test.ts
const testDurationSeconds = 30 // 30 seconds for CI
// Originally 5 minutes (300 seconds) for local testing
```

### Adjusting Connection Counts
Load test connection counts can be adjusted:

```typescript
const targetConnections = 100 // Increase to 200, 500, etc.
```

### Adjusting Message Rates
Throughput test targets can be modified:

```typescript
const messagesToSend = 1000 // Increase as needed
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Performance Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    # Run daily at midnight UTC
    - cron: '0 0 * * *'

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test -- __tests__/performance/ --run
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: test-results/
```

## Performance Profiling

### Enable CPU Profiling
```bash
node --prof npm test -- __tests__/performance/
```

### Enable Heap Snapshots
```bash
node --heapsnapshot-signal=SIGUSR2 npm test -- __tests__/performance/
```

### Analyze with Chrome DevTools
1. Run tests with profiling enabled
2. Import CPU profile or heap snapshot into Chrome DevTools
3. Analyze hot paths and memory allocations

## Troubleshooting

### Tests Timeout
- Increase `testTimeout` in `vitest.config.ts`
- Reduce connection/message counts for slower CI systems

### Port Already in Use
- Tests use random port selection: `3001 + Math.random() * 1000`
- If conflicts persist, increase port range

### Flaky Tests
- Add longer delays between operations
- Increase timeout values in `createWebSocket()`
- Check for resource exhaustion (file descriptors, memory)

### High Memory Usage
- Check for memory leaks in WebSocket handlers
- Verify connections are properly closed
- Review event listener cleanup

## Best Practices

1. **Run locally before pushing**: Performance tests can be flaky in CI
2. **Use consistent environments**: Ensure consistent hardware/resources
3. **Monitor trends**: Track performance over time, not absolute values
4. **Update baselines**: When legitimate improvements are made
5. **Investigate regressions**: Don't just update baselines, fix the issue

## Contributing

When adding new performance tests:
1. Add baseline metrics to `baseline.json`
2. Document the test purpose
3. Include success criteria
4. Add examples to this README
5. Verify tests pass locally before committing

## Resources

- [Vitest Performance Testing](https://vitest.dev/guide/features.html#benchmark)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)
- [WebSocket Protocol RFC](https://tools.ietf.org/html/rfc6455)
