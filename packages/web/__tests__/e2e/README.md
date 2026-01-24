# E2E 测试文档

## 概述

本项目的端到端(E2E)测试使用 Playwright 框架，确保所有关键用户流程在实际浏览器环境中正常工作。

## 测试覆盖范围

### 1. 聊天功能 (`chat.spec.ts`)
- ✅ 发送和接收消息
- ✅ 键盘快捷键 (Ctrl+Enter, Cmd+Enter)
- ✅ 消息历史和自动滚动
- ✅ 输入框功能 (字符计数、自动高度、禁用状态)
- ✅ Markdown和代码渲染
- ✅ 加载和错误状态
- ✅ 深色模式切换
- ✅ 响应式设计 (移动端、平板端)
- ✅ 可访问性验证
- ✅ 性能测试
- ✅ 边界情况处理

### 2. 会话管理 (`session-management.spec.ts`)
- ✅ 会话创建
- ✅ 会话列表显示
- ✅ 会话切换
- ✅ 会话删除
- ✅ 会话重命名
- ✅ 会话搜索
- ✅ 会话持久化
- ✅ 会话排序
- ✅ 性能测试

## 运行测试

### 安装依赖
```bash
npm install
# 或
pnpm install
```

### 安装 Playwright 浏览器
```bash
npx playwright install
```

### 运行所有 E2E 测试
```bash
npm run test:e2e
# 或
bun run test:e2e
```

### 运行特定测试文件
```bash
# 只运行聊天功能测试
npx playwright test chat.spec.ts

# 只运行会话管理测试
npx playwright test session-management.spec.ts
```

### 运行特定测试用例
```bash
# 运行匹配名称的测试
npx playwright test -g "发送消息"

# 运行特定行号的测试
npx playwright test --line 123
```

### 调试模式
```bash
# headed模式 (显示浏览器窗口)
npx playwright test --headed

# 慢动作模式
npx playwright test --slow-mo=1000

# 调试模式 (带开发工具)
npx playwright test --debug
```

### 不同浏览器
```bash
# Chrome (默认)
npx playwright test --project=chromium

# Firefox
npx playwright test --project=firefox

# Safari (WebKit)
npx playwright test --project=webkit

# 移动端 Chrome
npx playwright test --project="Mobile Chrome"

# 移动端 Safari
npx playwright test --project="Mobile Safari"
```

### 生成测试报告
```bash
# HTML 报告
npx playwright test --reporter=html

# 打开报告
npx playwright show-report
```

### 视频录制和截图
```bash
# 失败时自动截图
npx playwright test

# 保留所有视频
npx playwright test --video=retain-on-failure
```

## 测试文件结构

```
__tests__/
├── e2e/
│   ├── chat.spec.ts              # 聊天功能测试
│   ├── session-management.spec.ts # 会话管理测试
│   └── helpers.ts                # 测试辅助工具
```

## 编写新的 E2E 测试

### 基本模板

```typescript
import { test, expect } from '@playwright/test'

describe('功能描述', () => {
  test.beforeEach(async ({ page }) => {
    // 每个测试前的准备工作
    await login(page)
  })

  test('测试用例描述', async ({ page }) => {
    // 1. 导航到页面
    await page.goto('/some-page')

    // 2. 执行操作
    await page.click('button:has-text("提交")')

    // 3. 验证结果
    await expect(page.locator('.success-message')).toBeVisible()
  })
})
```

### 最佳实践

1. **使用语义化选择器**
   ```typescript
   // ✅ 好
   page.locator('button[aria-label="发送消息"]')
   page.locator('[data-testid="submit-button"]')
   page.locator('button:has-text("提交")')

   // ❌ 差
   page.locator('.css-class-xyz')
   page.locator('#element-id')
   ```

2. **等待元素而不是固定延迟**
   ```typescript
   // ✅ 好
   await expect(page.locator('.result')).toBeVisible()

   // ❌ 差
   await page.waitForTimeout(3000)
   ```

3. **使用辅助函数**
   ```typescript
   const helpers = new TestHelpers(page)
   await helpers.login()
   await helpers.sendMessage('Hello')
   await helpers.waitForResponse()
   ```

4. **清理测试数据**
   ```typescript
   test.afterEach(async ({ page }) => {
     // 清理创建的测试数据
   })
   ```

5. **测试边界情况**
   ```typescript
   test('应该处理空输入', async ({ page }) => {
     // 测试空输入处理
   })

   test('应该处理网络错误', async ({ page }) => {
     // 模拟网络离线
     await page.context().setOffline(true)
   })
   ```

## CI/CD 集成

### GitHub Actions 配置示例

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

## 常见问题

### 测试失败怎么办?

1. **查看截图和视频**
   - 失败的测试会自动截图
   - 视频保存在 `test-results/videos/`

2. **调试模式**
   ```bash
   npx playwright test --debug
   ```

3. **headed 模式**
   ```bash
   npx playwright test --headed --project=chromium
   ```

### 测试超时怎么办?

1. 增加超时时间:
   ```typescript
   test('慢速测试', async ({ page }) => {
     test.setTimeout(60000) // 60秒超时
   })
   ```

2. 修改配置文件:
   ```typescript
   // playwright.config.ts
   timeout: 60 * 1000
   ```

### 如何处理登录状态?

使用辅助函数或fixtures:
```typescript
import { TestHelpers } from './helpers'

const helpers = new TestHelpers(page)
await helpers.login('test@example.com', 'password')
```

## 性能基准

当前性能目标:

- 页面加载时间: < 3秒
- AI响应时间: < 10秒
- 会话切换: < 300ms
- 操作响应: < 100ms

## 覆盖率目标

- 关键用户流程: 100% 覆盖
- 错误场景: 80% 覆盖
- 边界情况: 60% 覆盖

## 更多资源

- [Playwright 官方文档](https://playwright.dev)
- [最佳实践指南](https://playwright.dev/docs/best-practices)
- [API 参考](https://playwright.dev/docs/api/class-playwright)
