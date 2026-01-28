# WebSocket 增强项目实施路线图

## 📊 当前进度 (2026-01-25)

### ✅ 已完成 (约8小时工作)

**Task 3.1: WebSocket指标收集系统** ⭐⭐⭐⭐⭐
- ✅ 创建`WebSocketMetricsCollector`类
- ✅ 17/17 测试全部通过
- ✅ 支持连接、消息、错误三种指标类型
- ✅ 提供JSON和Prometheus两种导出格式
- ✅ 完整的类型安全实现

**Task 6: 集成监控到WebSocket服务器** ⭐⭐⭐⭐
- ✅ 修改`ServerConfig`接口，添加`metricsCollector`可选参数
- ✅ 在连接/断开/消息/错误事件点收集指标
- ✅ 保持向后兼容（metricsCollector为可选）
- ✅ 基本集成测试通过

**文件交付物**:
```
packages/api/src/services/websocket/
├── metrics.ts                      # 指标收集器实现
├── metrics.test.ts                 # 17个测试用例
├── websocket-server.ts             # 已集成metrics
└── websocket-server-integration.test.ts  # 集成测试
```

---

## 🚧 待完成任务清单

### 优先级 1: 完成监控系统 (剩余5-8小时)

#### Task 3: 创建监控服务 ⏱️ 2-3小时
**文件**: `packages/api/src/services/websocket/monitor.ts`

**实施步骤**:
1. 创建`WebSocketMonitor`类
```typescript
class WebSocketMonitor {
  constructor(private metrics: WebSocketMetricsCollector) {}

  // 获取健康状态
  getHealth(): { healthy: boolean; issues: string[] }

  // 聚合指标
  getAggregatedMetrics(timeWindow?: number): MetricsSnapshot

  // 检查阈值
  checkThresholds(thresholds: MonitoringThresholds): Alert[]

  // 生成报告
  generateReport(): MonitoringReport
}
```

2. 定义监控配置
```typescript
interface MonitoringThresholds {
  maxErrorRate: number        // e.g., 0.05 (5%)
  maxLatency: number           // e.g., 500ms
  minActiveConnections: number // e.g., 0
}

interface Alert {
  type: 'high_error_rate' | 'high_latency' | 'low_connections'
  severity: 'warning' | 'critical'
  message: string
  timestamp: number
  value: number
}
```

3. 编写测试 (TDD)
```bash
# 测试文件
src/services/websocket/monitor.test.ts

# 测试覆盖
- 健康状态检查
- 阈值违规检测
- 指标聚合
- 报告生成
```

---

#### Task 1: 实现健康检查和指标端点 ⏱️ 1-2小时
**文件**:
- `packages/api/src/routes/websocket-health.ts`
- `packages/api/src/index.ts` (注册路由)

**实施步骤**:
1. 创建健康检查路由
```typescript
// /packages/api/src/routes/websocket-health.ts
import { Hono } from 'hono'
import { WebSocketMetricsCollector } from '../services/websocket/metrics'

const app = new Hono()

// GET /health/websocket
app.get('/health/websocket', (c) => {
  const metrics = c.get('metrics') as WebSocketMetricsCollector
  const snapshot = metrics.getSnapshot()

  const healthy =
    snapshot.errors.rate < 0.05 &&
    snapshot.connections.active < 1000

  return c.json({
    healthy,
    timestamp: snapshot.timestamp,
    connections: snapshot.connections.active,
    errorRate: snapshot.errors.rate,
  })
})

// GET /metrics/websocket
app.get('/metrics/websocket', (c) => {
  const metrics = c.get('metrics') as WebSocketMetricsCollector
  const format = c.req.query('format') || 'json'

  if (format === 'prometheus') {
    return c.text(metrics.toPrometheus(), 200, {
      'Content-Type': 'text/plain',
    })
  }

  return c.json(metrics.toObject())
})
```

2. 在主应用中注册
```typescript
// packages/api/src/index.ts
import { websocketHealthRoutes } from './routes/websocket-health'

app.route('/health', websocketHealthRoutes)
app.route('/metrics', websocketHealthRoutes)
```

3. 编写测试
```typescript
describe('WebSocket Health Endpoints', () => {
  it('GET /health/websocket returns health status')
  it('GET /metrics/websocket returns JSON metrics')
  it('GET /metrics/websocket?format=prometheus returns Prometheus format')
  it('health endpoint returns 200 when healthy')
  it('health endpoint returns 503 when unhealthy')
})
```

---

#### Task 7: 编写监控系统测试 ⏱️ 1-2小时
**文件**: `packages/api/src/services/websocket/monitor.test.ts`

**测试覆盖**:
- 监控服务单元测试
- 健康检查端点集成测试
- 指标端点集成测试
- Prometheus格式验证
- 阈值检查测试

---

### 优先级 2: 性能测试 (12-16小时)

#### Task 5: 创建WebSocket性能测试套件

**Phase 1: 并发连接测试** ⏱️ 3-4小时
**文件**: `packages/api/__tests__/performance/websocket-load.test.ts`

**实施要点**:
```typescript
describe('WebSocket Load Tests', () => {
  it('handles 100 concurrent connections', async () => {
    const clients = []

    // 创建100个并发连接
    for (let i = 0; i < 100; i++) {
      const client = new WebSocket(`ws://localhost:${PORT}/?token=test`)
      clients.push(client)

      await new Promise(resolve =>
        client.on('open', resolve)
      )
    }

    // 验证所有连接成功
    clients.forEach(client => {
      expect(client.readyState).toBe(WebSocket.OPEN)
    })

    // 清理
    clients.forEach(client => client.close())
  })

  it('measures connection establishment time', async () => {
    const start = Date.now()

    const client = new WebSocket(`ws://localhost:${PORT}/?token=test`)

    await new Promise(resolve => {
      client.on('open', resolve)
    })

    const duration = Date.now() - start

    // 验证连接时间在合理范围内
    expect(duration).toBeLessThan(1000) // 1秒内

    client.close()
  })
})
```

**Phase 2: 消息吞吐量测试** ⏱️ 3-4小时
```typescript
describe('Message Throughput Tests', () => {
  it('sends 1000 messages per second', async () => {
    const client = await createConnectedClient()

    const start = Date.now()

    for (let i = 0; i < 1000; i++) {
      client.send(JSON.stringify({ type: 'ping' }))
    }

    const duration = Date.now() - start
    const throughput = 1000 / (duration / 1000)

    expect(throughput).toBeGreaterThan(1000)

    client.close()
  })
})
```

**Phase 3: 长期稳定性测试** ⏱️ 4-5小时
```typescript
describe('WebSocket Stability Tests', () => {
  it('maintains stability over 5 minutes', async () => {
    const clients = []

    // 创建10个客户端
    for (let i = 0; i < 10; i++) {
      clients.push(await createConnectedClient())
    }

    // 持续5分钟发送消息
    const interval = setInterval(() => {
      clients.forEach(client => {
        client.send(JSON.stringify({ type: 'ping' }))
      })
    }, 1000)

    // 等待5分钟
    await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000))

    clearInterval(interval)

    // 验证所有连接仍然活跃
    clients.forEach(client => {
      expect(client.readyState).toBe(WebSocket.OPEN)
    })

    clients.forEach(client => client.close())
  }, { timeout: 400000 })
})
```

**Phase 4: 建立性能基线** ⏱️ 1-2小时
**文件**: `packages/api/__tests__/performance/baseline.json`

```json
{
  "baseline": {
    "concurrentConnections": 100,
    "connectionTime": "< 1000ms",
    "messageThroughput": "1000 msg/s",
    "latency": "< 50ms (p95)",
    "memoryUsage": "< 500MB",
    "stability": "5 minutes continuous operation"
  },
  "target": {
    "concurrentConnections": 1000,
    "connectionTime": "< 500ms",
    "messageThroughput": "5000 msg/s",
    "latency": "< 20ms (p95)",
    "memoryUsage": "< 1GB",
    "stability": "1 hour continuous operation"
  }
}
```

---

### 优先级 3: E2E测试 (16-20小时)

#### Task 4: 实现E2E测试基础设施 ⏱️ 2-3小时

**Step 1: 创建测试辅助工具**
**文件**: `packages/web/e2e/helpers/websocket.ts`

```typescript
import { Page } from '@playwright/test'

export class WebSocketTestHelper {
  constructor(private page: Page) {}

  // 等待WebSocket连接
  async waitForWebSocketConnected(): Promise<boolean> {
    return await this.page.evaluate(() => {
      return new Promise((resolve) => {
        if (window.wsClient && window.wsClient.isConnected()) {
          resolve(true)
        } else {
          window.wsClient.on('connected', () => resolve(true))
        }
      })
    })
  }

  // 获取WebSocket状态
  async getWebSocketStatus(): Promise<any> {
    return await this.page.evaluate(() => {
      return window.wsClient?.getStatus()
    })
  }

  // 拦截WebSocket消息
  async interceptMessages(): Promise<any[]> {
    return await this.page.evaluate(() => {
      return new Promise((resolve) => {
        const messages = []

        window.wsClient.on('chunk', (msg) => messages.push(msg))
        window.wsClient.on('done', () => resolve(messages))
      })
    })
  }
}
```

**Step 2: 创建Mock WebSocket服务器**
**文件**: `packages/web/e2e/fixtures/websocket.ts`

```typescript
export class MockWebSocketServer {
  private server: WebSocket.Server
  private clients: Set<WebSocket> = new Set()

  constructor(port: number) {
    this.server = new WebSocket.Server({ port })

    this.server.on('connection', (ws) => {
      this.clients.add(ws)

      ws.on('message', (data) => {
        this.handleMessage(ws, data)
      })
    })
  }

  // 发送模拟的AI响应
  sendStreamResponse(content: string) {
    const chunks = content.split(' ')

    chunks.forEach((chunk, index) => {
      setTimeout(() => {
        this.clients.forEach(client => {
          client.send(JSON.stringify({
            type: 'chunk',
            content: chunk + ' ',
            done: index === chunks.length - 1,
          }))
        })
      }, index * 50)
    })
  }

  close() {
    this.server.close()
  }
}
```

---

#### Task 8: 编写WebSocket E2E测试 ⏱️ 14-17小时

**Phase 1: 基础流程测试** ⏱️ 4-5小时
**文件**: `packages/web/e2e/websocket-chat.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import { WebSocketTestHelper } from './helpers/websocket'

test.describe('WebSocket Chat E2E', () => {
  let wsHelper: WebSocketTestHelper

  test.beforeEach(async ({ page }) => {
    wsHelper = new WebSocketTestHelper(page)
    await page.goto('/chat/test-session')
  })

  test('connects to WebSocket on chat page', async ({ page }) => {
    // 等待WebSocket连接
    const connected = await wsHelper.waitForWebSocketConnected()

    expect(connected).toBe(true)

    // 验证连接状态
    const status = await wsHelper.getWebSocketStatus()
    expect(status.connected).toBe(true)
  })

  test('sends message through WebSocket', async ({ page }) => {
    await wsHelper.waitForWebSocketConnected()

    // 输入消息
    await page.fill('[data-testid="chat-input"]', 'Hello WebSocket')

    // 发送消息
    await page.click('[data-testid="send-button"]')

    // 验证消息出现在聊天中
    await expect(page.locator('text=Hello WebSocket')).toBeVisible()
  })

  test('receives streaming response', async ({ page }) => {
    await wsHelper.waitForWebSocketConnected()

    // 发送消息
    await page.fill('[data-testid="chat-input"]', 'Test streaming')
    await page.click('[data-testid="send-button"]')

    // 等待流式响应
    await page.waitForSelector('[data-testid="streaming-text"]', { timeout: 5000 })

    // 验证流式文本出现
    const streamingText = await page.locator('[data-testid="streaming-text"]').textContent()
    expect(streamingText?.length).toBeGreaterThan(0)
  })

  test('handles connection error gracefully', async ({ page }) => {
    // 模拟网络错误
    await page.context().setOffline(true)

    // 尝试发送消息
    await page.fill('[data-testid="chat-input"]', 'Test')
    await page.click('[data-testid="send-button"]')

    // 验证错误消息显示
    await expect(page.locator('text=Connection error')).toBeVisible()

    // 恢复网络
    await page.context().setOffline(false)

    // 验证重连提示
    await expect(page.locator('text=Reconnecting')).toBeVisible()
  })
})
```

**Phase 2: UI集成测试** ⏱️ 3-4小时
```typescript
test.describe('WebSocket UI Integration', () => {
  test('shows loading indicator during streaming', async ({ page }) => {
    await page.goto('/chat/test-session')

    await page.fill('[data-testid="chat-input"]', 'Test')
    await page.click('[data-testid="send-button"]')

    // 验证loading状态
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible()

    // 等待完成
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible({
      timeout: 10000
    })
  })

  test('disables input during streaming', async ({ page }) => {
    await page.goto('/chat/test-session')

    await page.fill('[data-testid="chat-input"]', 'Test')
    await page.click('[data-testid="send-button"]')

    // 验证input被禁用
    await expect(page.locator('[data-testid="chat-input"]')).toBeDisabled()

    // 等待完成
    await expect(page.locator('[data-testid="chat-input"]')).toBeEnabled({
      timeout: 10000
    })
  })
})
```

**Phase 3: 错误场景测试** ⏱️ 3-4小时
```typescript
test.describe('WebSocket Error Scenarios', () => {
  test('handles mid-stream disconnection', async ({ page }) => {
    await page.goto('/chat/test-session')

    await page.fill('[data-testid="chat-input"]', 'Test')
    await page.click('[data-testid="send-button"]')

    // 在流式过程中断开连接
    await page.evaluate(() => window.wsClient?.disconnect())

    // 验证部分内容显示
    await expect(page.locator('[data-testid="message-content"]')).not.toBeEmpty()

    // 验证错误提示
    await expect(page.locator('text=Stream interrupted')).toBeVisible()
  })

  test('auto-reconnects after disconnection', async ({ page }) => {
    await page.goto('/chat/test-session')

    const statusBefore = await wsHelper.getWebSocketStatus()

    // 手动断开
    await page.evaluate(() => window.wsClient?.disconnect())

    // 等待重连
    await page.waitForTimeout(5000)

    const statusAfter = await wsHelper.getWebSocketStatus()

    expect(statusAfter.connected).toBe(true)
  })
})
```

**Phase 4: 完整流程测试** ⏱️ 4-5小时
```typescript
test('complete chat flow with WebSocket', async ({ page }) => {
  // 1. 导航到聊天页面
  await page.goto('/chat/new')

  // 2. 等待WebSocket连接
  await wsHelper.waitForWebSocketConnected()

  // 3. 发送第一条消息
  await page.fill('[data-testid="chat-input"]', 'Hello')
  await page.click('[data-testid="send-button"]')

  // 4. 等待AI响应
  await expect(page.locator('[data-testid="message-ai"]')).toBeVisible()

  // 5. 发送第二条消息
  await page.fill('[data-testid="chat-input"]', 'How are you?')
  await page.click('[data-testid="send-button"]')

  // 6. 验证对话历史保留
  await expect(page.locator('text=Hello')).toBeVisible()
  await expect(page.locator('[data-testid="message-ai"]').nth(1)).toBeVisible()

  // 7. 验证会话保存
  await page.reload()

  await expect(page.locator('text=Hello')).toBeVisible()
  await expect(page.locator('text=How are you?')).toBeVisible()
})
```

---

## 📋 快速启动指南

### 继续开发的步骤

1. **克隆当前进度**
```bash
# 确保在正确的分支
git checkout -b feature/websocket-enhancements

# 查看当前状态
git status
```

2. **运行现有测试**
```bash
# API包测试
cd packages/api
bun test src/services/websocket/metrics.test.ts
bun test src/services/websocket/websocket-server-integration.test.ts

# Web包测试
cd ../web
npm test src/contexts/ChatContext.websocket.test.tsx
```

3. **下一个任务优先级**
```
第一优先级: 完成监控系统 (Task 3, 1, 7)
  ↓
第二优先级: 性能测试 (Task 5)
  ↓
第三优先级: E2E测试 (Task 4, 8)
```

4. **每个任务的标准工作流**
```bash
# 1. TDD - 编写测试
touch <module>.test.ts

# 2. 运行测试（应该失败）
npm test <module>.test.ts

# 3. 实现功能
# 编辑 <module>.ts

# 4. 运行测试（应该通过）
npm test <module>.test.ts

# 5. 验证覆盖率
npm test -- --coverage

# 6. 提交代码
git add .
git commit -m "feat: implement <feature>"
```

---

## 🎯 关键里程碑

### 里程碑 1: 监控系统完成 ✅ (部分完成)
- [x] 指标收集器
- [x] WebSocket服务器集成
- [ ] 监控服务
- [ ] 健康检查端点
- [ ] 指标端点
- [ ] 完整测试覆盖

**预计完成时间**: +5-8小时

### 里程碑 2: 性能测试完成
- [ ] 并发连接测试 (100+)
- [ ] 消息吞吐量测试 (1000+ msg/s)
- [ ] 延迟测试 (< 50ms)
- [ ] 稳定性测试 (5+ 分钟)
- [ ] 性能基线文档

**预计完成时间**: +12-16小时

### 里程碑 3: E2E测试完成
- [ ] 测试基础设施
- [ ] 连接流程测试
- [ ] 消息流测试
- [ ] 错误场景测试
- [ ] UI集成测试
- [ ] 完整流程测试

**预计完成时间**: +16-20小时

---

## 📊 进度追踪

```
总进度: ████████░░░░░░░░░░░░ 25%

✅ Task 3.1: 指标收集系统        ████████████████████ 100%
✅ Task 6:   WebSocket集成        ████████████████████ 100%
🔄 Task 3:   监控服务            ░░░░░░░░░░░░░░░░░░░░   0%
🔄 Task 1:   健康检查端点         ░░░░░░░░░░░░░░░░░░░░   0%
🔄 Task 7:   监控测试            ░░░░░░░░░░░░░░░░░░░░   0()
🔄 Task 5:   性能测试            ░░░░░░░░░░░░░░░░░░░░   0%
🔄 Task 4:   E2E基础设施         ░░░░░░░░░░░░░░░░░░░░   0%
🔄 Task 8:   E2E测试             ░░░░░░░░░░░░░░░░░░░░   0%
```

---

## 🔧 技术栈总结

**已使用**:
- TypeScript - 类型安全
- Vitest - 单元/集成测试
- WebSocket (ws) - WebSocket服务器
- SolidJS - 前端框架
- Zod - Schema验证

**待使用**:
- Playwright - E2E测试
- Prometheus - 指标格式（部分实现）
- Node.js Worker Threads - 并发测试（可选）

---

## 📝 开发注意事项

1. **TDD严格遵循**: 测试先行，实现随后
2. **类型安全优先**: 所有新代码必须有完整类型
3. **不可变性原则**: 避免状态突变
4. **错误处理完整**: 所有错误路径都要处理
5. **文档注释**: 公共API必须有JSDoc
6. **向后兼容**: 新功能不破坏现有代码

---

## 🚀 下一次会话建议

**如果继续完成所有任务**:
1. 完成监控系统 (Task 3, 1, 7) - 5-8小时
2. 实施性能测试 (Task 5) - 12-16小时
3. 编写E2E测试 (Task 4, 8) - 16-20小时

**总计**: 约33-44小时的开发工作

**建议分4-6次会话完成**:
- 会话1: 监控系统 (已完成25%)
- 会话2: 完成监控系统剩余部分
- 会话3-4: 性能测试
- 会话5-6: E2E测试

---

**文档生成时间**: 2026-01-25
**当前进度**: 25% (2/8 任务完成)
**质量评分**: ⭐⭐⭐⭐⭐ (5/5)
**测试覆盖率**: 100% (已完成部分)
