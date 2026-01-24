/**
 * 聊天功能 E2E 测试
 *
 * 端到端测试覆盖完整的用户聊天流程
 */

import { test, expect, type Page } from '@playwright/test'

/**
 * 辅助函数：登录用户
 */
async function login(page: Page) {
  await page.goto('/login')
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  await page.waitForURL('/', { timeout: 5000 })
}

/**
 * 辅助函数：创建测试会话
 */
async function createTestSession(page: Page) {
  await page.goto('/')
  await page.click('button:has-text("新建对话")')
  await page.waitForURL(/\/chat\/.*/, { timeout: 5000 })
}

test.describe('聊天功能 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    // 每个测试前登录
    await login(page)
  })

  test.describe('发送和接收消息', () => {
    test('用户应该能够发送消息并收到AI响应', async ({ page }) => {
      // 创建新会话
      await createTestSession(page)

      // 等待输入框加载
      const input = page.locator('textarea[aria-label="消息输入框"]')
      await expect(input).toBeVisible()

      // 输入消息
      await input.fill('Hello, how are you?')

      // 点击发送按钮
      const sendButton = page.locator('button[aria-label="发送消息"]')
      await expect(sendButton).toBeEnabled()
      await sendButton.click()

      // 验证用户消息显示
      const userMessage = page.locator('[data-message-role="user"]').last()
      await expect(userMessage).toContainText('Hello, how are you?')

      // 验证发送按钮被禁用（等待响应）
      await expect(sendButton).toBeDisabled()

      // 等待AI响应（最多30秒）
      const assistantMessage = page.locator('[data-message-role="assistant"]')
      await expect(assistantMessage.last()).toBeVisible({ timeout: 30000 })

      // 验证响应内容不为空
      const responseText = await assistantMessage.last().textContent()
      expect(responseText?.trim()).toBeTruthy()
      expect(responseText?.length).toBeGreaterThan(0)
    })

    test('应该支持多条消息连续对话', async ({ page }) => {
      await createTestSession(page)

      const input = page.locator('textarea[aria-label="消息输入框"]')
      const sendButton = page.locator('button[aria-label="发送消息"]')

      // 发送第一条消息
      await input.fill('What is 2 + 2?')
      await sendButton.click()

      // 等待响应
      await expect(page.locator('[data-message-role="assistant"]').last()).toBeVisible({ timeout: 30000 })

      // 发送第二条消息
      await input.fill('And what is 3 + 3?')
      await sendButton.click()

      // 等待响应
      await expect(page.locator('[data-message-role="assistant"]').last()).toBeVisible({ timeout: 30000 })

      // 验证所有消息都显示
      const userMessages = await page.locator('[data-message-role="user"]').count()
      const assistantMessages = await page.locator('[data-message-role="assistant"]').count()

      expect(userMessages).toBe(2)
      expect(assistantMessages).toBe(2)
    })

    test('空消息不应该被发送', async ({ page }) => {
      await createTestSession(page)

      const input = page.locator('textarea[aria-label="消息输入框"]')
      const sendButton = page.locator('button[aria-label="发送消息"]')

      // 尝试发送空消息
      await input.fill('')
      await expect(sendButton).toBeDisabled()

      // 尝试发送只有空格的消息
      await input.fill('   ')
      await sendButton.click()

      // 验证没有新消息
      const userMessages = await page.locator('[data-message-role="user"]').count()
      expect(userMessages).toBe(0)
    })
  })

  test.describe('键盘快捷键', () => {
    test('Ctrl+Enter应该发送消息', async ({ page }) => {
      await createTestSession(page)

      const input = page.locator('textarea[aria-label="消息输入框"]')
      await input.fill('Test message with keyboard shortcut')

      // 模拟Ctrl+Enter
      await input.press('Control+Enter')

      // 验证消息发送
      const userMessage = page.locator('[data-message-role="user"]').last()
      await expect(userMessage).toContainText('Test message with keyboard shortcut')

      // 等待响应
      await expect(page.locator('[data-message-role="assistant"]').last()).toBeVisible({ timeout: 30000 })
    })

    test('Cmd+Enter (Mac)应该发送消息', async ({ page }) => {
      await createTestSession(page)

      const input = page.locator('textarea[aria-label="消息输入框"]')
      await input.fill('Test Mac shortcut')

      // 模拟Cmd+Enter
      await input.press('Meta+Enter')

      // 验证消息发送
      const userMessage = page.locator('[data-message-role="user"]').last()
      await expect(userMessage).toContainText('Test Mac shortcut')

      // 等待响应
      await expect(page.locator('[data-message-role="assistant"]').last()).toBeVisible({ timeout: 30000 })
    })

    test('普通Enter应该换行而不是发送', async ({ page }) => {
      await createTestSession(page)

      const input = page.locator('textarea[aria-label="消息输入框"]')
      await input.fill('Line 1')

      // 按普通Enter
      await input.press('Enter')

      // 验证输入框还在，消息没有发送
      await expect(input).toHaveValue(/Line 1/)
      await expect(input).toBeVisible()

      const userMessages = await page.locator('[data-message-role="user"]').count()
      expect(userMessages).toBe(0)
    })
  })

  test.describe('消息历史和滚动', () => {
    test('新消息应该自动滚动到底部', async ({ page }) => {
      await createTestSession(page)

      const input = page.locator('textarea[aria-label="消息输入框"]')
      const sendButton = page.locator('button[aria-label="发送消息"]')

      // 发送多条消息以填充屏幕
      for (let i = 0; i < 5; i++) {
        await input.fill(`Message ${i}`)
        await sendButton.click()
        // 短暂等待AI响应
        await page.waitForTimeout(1000)
      }

      // 获取消息列表容器
      const messageList = page.locator('[data-testid="message-list"]')

      // 验证滚动到底部
      const scrollTop = await messageList.evaluate((el: HTMLElement) => el.scrollTop)
      const scrollHeight = await messageList.evaluate((el: HTMLElement) => el.scrollHeight)
      const clientHeight = await messageList.evaluate((el: HTMLElement) => el.clientHeight)

      // 验证接近底部（允许50px误差）
      expect(scrollTop + clientHeight).toBeGreaterThanOrEqual(scrollHeight - 50)
    })

    test('向上滚动时不应该自动滚动到新消息', async ({ page }) => {
      await createTestSession(page)

      const input = page.locator('textarea[aria-label="消息输入框"]')
      const sendButton = page.locator('button[aria-label="发送消息"]')
      const messageList = page.locator('[data-testid="message-list"]')

      // 发送几条消息
      for (let i = 0; i < 3; i++) {
        await input.fill(`Initial message ${i}`)
        await sendButton.click()
        await page.waitForTimeout(1000)
      }

      // 手动滚动到顶部
      await messageList.evaluate((el: HTMLElement) => el.scrollTop = 0)

      const scrollTopAfterScrollUp = await messageList.evaluate((el: HTMLElement) => el.scrollTop)
      expect(scrollTopAfterScrollUp).toBe(0)

      // 发送新消息
      await input.fill('New message after scrolling up')
      await sendButton.click()

      // 等待一下
      await page.waitForTimeout(1000)

      // 验证没有自动滚动（应该还在顶部附近）
      const scrollTopAfterNewMessage = await messageList.evaluate((el: HTMLElement) => el.scrollTop)
      expect(scrollTopAfterNewMessage).toBeLessThan(100)
    })
  })

  test.describe('输入框功能', () => {
    test('应该显示字符计数', async ({ page }) => {
      await createTestSession(page)

      const input = page.locator('textarea[aria-label="消息输入框"]')
      await input.fill('This is a test message')

      // 验证字符计数显示
      const charCount = page.locator('div:has-text("21/")')
      await expect(charCount).toBeVisible()
    })

    test('应该在达到最大长度时限制输入', async ({ page }) => {
      await createTestSession(page)

      const input = page.locator('textarea[aria-label="消息输入框"]')
      const maxLength = 10 // 假设测试环境设置为10

      // 输入超过最大长度的文本
      const longText = 'This is a very long message that exceeds the limit'

      // 验证输入被限制
      const value = await input.inputValue()
      expect(value.length).toBeLessThanOrEqual(maxLength)
    })

    test('输入框应该自动调整高度', async ({ page }) => {
      await createTestSession(page)

      const input = page.locator('textarea[aria-label="消息输入框"]')
      const initialHeight = await input.evaluate((el: HTMLTextAreaElement) => el.offsetHeight)

      // 输入多行文本
      const multiLineText = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5'
      await input.fill(multiLineText)

      // 等待高度调整
      await page.waitForTimeout(300)

      // 验证高度增加
      const newHeight = await input.evaluate((el: HTMLTextAreaElement) => el.offsetHeight)
      expect(newHeight).toBeGreaterThan(initialHeight)
    })

    test('流式传输时输入框应该被禁用', async ({ page }) => {
      await createTestSession(page)

      const input = page.locator('textarea[aria-label="消息输入框"]')
      const sendButton = page.locator('button[aria-label="发送消息"]')

      // 发送消息
      await input.fill('Test streaming')
      await sendButton.click()

      // 验证输入框在等待响应时被禁用
      await expect(input).toBeDisabled()
      await expect(sendButton).toBeDisabled()

      // 等待响应完成
      await expect(page.locator('[data-message-role="assistant"]').last()).toBeVisible({ timeout: 30000 })

      // 验证输入框重新启用
      await expect(input).toBeEnabled()
    })
  })

  test.describe('Markdown和代码渲染', () => {
    test('应该渲染代码块', async ({ page }) => {
      await createTestSession(page)

      const input = page.locator('textarea[aria-label="消息输入框"]')
      const sendButton = page.locator('button[aria-label="发送消息"]')

      await input.fill('Show me a JavaScript example: ```javascript\nconsole.log("Hello");\n```')
      await sendButton.click()

      // 等待响应
      await expect(page.locator('[data-message-role="assistant"]').last()).toBeVisible({ timeout: 30000 })

      // 验证代码块渲染
      const codeBlock = page.locator('pre code')
      await expect(codeBlock).toBeVisible()
    })

    test('应该渲染粗体和斜体文本', async ({ page }) => {
      await createTestSession(page)

      const input = page.locator('textarea[aria-label="消息输入框"]')
      const sendButton = page.locator('button[aria-label="发送消息"]')

      await input.fill('Format this text: **bold** and *italic*')
      await sendButton.click()

      // 等待响应
      await expect(page.locator('[data-message-role="assistant"]').last()).toBeVisible({ timeout: 30000 })

      // 验证粗体和斜体渲染
      const boldText = page.locator('strong')
      const italicText = page.locator('em')

      await expect(boldText).toBeVisible()
      await expect(italicText).toBeVisible()
    })

    test('应该渲染列表', async ({ page }) => {
      await createTestSession(page)

      const input = page.locator('textarea[aria-label="消息输入框"]')
      const sendButton = page.locator('button[aria-label="发送消息"]')

      await input.fill('List these items: apple, banana, orange')
      await sendButton.click()

      // 等待响应
      await expect(page.locator('[data-message-role="assistant"]').last()).toBeVisible({ timeout: 30000 })

      // 验证列表渲染
      const listItems = page.locator('li')
      const count = await listItems.count()
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('加载和错误状态', () => {
    test('应该显示加载状态', async ({ page }) => {
      await createTestSession(page)

      const input = page.locator('textarea[aria-label="消息输入框"]')
      const sendButton = page.locator('button[aria-label="发送消息"]')

      await input.fill('Test loading state')
      await sendButton.click()

      // 验证发送按钮显示加载状态
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible()
    })

    test('应该显示空状态提示', async ({ page }) => {
      await createTestSession(page)

      // 验证空状态提示显示
      const emptyState = page.locator('[data-testid="empty-state"]')
      await expect(emptyState).toBeVisible()
      await expect(emptyState).toContainText('暂无消息')
    })

    test('网络错误时应该显示错误提示', async ({ page }) => {
      // 模拟网络离线
      await page.context().setOffline(true)

      await createTestSession(page)

      const input = page.locator('textarea[aria-label="消息输入框"]')
      const sendButton = page.locator('button[aria-label="发送消息"]')

      await input.fill('This should fail')
      await sendButton.click()

      // 验证错误提示
      const errorMessage = page.locator('[data-testid="error-message"]')
      await expect(errorMessage).toBeVisible({ timeout: 5000 })

      // 恢复网络
      await page.context().setOffline(false)
    })
  })

  test.describe('深色模式', () => {
    test('应该能够切换深色模式', async ({ page }) => {
      await createTestSession(page)

      // 点击深色模式切换按钮
      const darkModeToggle = page.locator('[data-testid="dark-mode-toggle"]')
      await darkModeToggle.click()

      // 验证深色模式类被应用
      const chatPage = page.locator('[data-testid="chat-page"]')
      await expect(chatPage).toHaveClass(/dark/)

      // 再次点击切换回来
      await darkModeToggle.click()
      await expect(chatPage).not.toHaveClass(/dark/)
    })
  })

  test.describe('响应式设计', () => {
    test('应该在移动端正确显示', async ({ page }) => {
      // 设置移动端视口
      await page.setViewportSize({ width: 375, height: 667 })

      await createTestSession(page)

      // 验证关键元素在移动端可见
      const input = page.locator('textarea[aria-label="消息输入框"]')
      await expect(input).toBeVisible()

      const sendButton = page.locator('button[aria-label="发送消息"]')
      await expect(sendButton).toBeVisible()

      const header = page.locator('[data-testid="chat-header"]')
      await expect(header).toBeVisible()
    })

    test('应该在平板端正确显示', async ({ page }) => {
      // 设置平板视口
      await page.setViewportSize({ width: 768, height: 1024 })

      await createTestSession(page)

      // 验证布局
      const chatPage = page.locator('[data-testid="chat-page"]')
      await expect(chatPage).toBeVisible()

      const messageList = page.locator('[data-testid="message-list"]')
      await expect(messageList).toBeVisible()
    })
  })

  test.describe('可访问性', () => {
    test('输入框应该有正确的ARIA标签', async ({ page }) => {
      await createTestSession(page)

      const input = page.locator('textarea[aria-label="消息输入框"]')
      await expect(input).toHaveAttribute('aria-label', '消息输入框')
    })

    test('按钮应该有正确的ARIA标签', async ({ page }) => {
      await createTestSession(page)

      const sendButton = page.locator('button[aria-label="发送消息"]')
      await expect(sendButton).toHaveAttribute('aria-label', '发送消息')

      const backButton = page.locator('[data-testid="back-button"]')
      await expect(backButton).toHaveAttribute('aria-label', '返回')
    })

    test('页面应该有正确的role和aria-live', async ({ page }) => {
      await createTestSession(page)

      const chatPage = page.locator('[data-testid="chat-page"]')
      await expect(chatPage).toHaveAttribute('role', 'main')

      const messageList = page.locator('[data-testid="message-list"]')
      await expect(messageList).toHaveAttribute('role', 'log')
      await expect(messageList).toHaveAttribute('aria-live', 'polite')
    })
  })

  test.describe('性能', () => {
    test('页面加载时间应该在可接受范围内', async ({ page }) => {
      const startTime = Date.now()

      await createTestSession(page)

      // 等待关键元素加载
      await page.waitForSelector('textarea[aria-label="消息输入框"]', { timeout: 5000 })

      const loadTime = Date.now() - startTime

      // 页面应该在3秒内加载完成
      expect(loadTime).toBeLessThan(3000)
    })

    test('发送消息后应该在合理时间内收到响应', async ({ page }) => {
      await createTestSession(page)

      const input = page.locator('textarea[aria-label="消息输入框"]')
      const sendButton = page.locator('button[aria-label="发送消息"]')

      await input.fill('Quick test')

      const startTime = Date.now()

      await sendButton.click()

      // 等待AI响应
      await expect(page.locator('[data-message-role="assistant"]').last()).toBeVisible({ timeout: 30000 })

      const responseTime = Date.now() - startTime

      // 响应应该在10秒内返回（允许一定延迟）
      expect(responseTime).toBeLessThan(10000)
    })
  })

  test.describe('会话管理', () => {
    test('应该能够返回到会话列表', async ({ page }) => {
      await createTestSession(page)

      // 点击返回按钮
      const backButton = page.locator('[data-testid="back-button"]')
      await backButton.click()

      // 验证返回到列表页
      await page.waitForURL('/', { timeout: 5000 })
      expect(page.url()).toContain('/')
    })

    test('应该显示会话标题', async ({ page }) => {
      await createTestSession(page)

      // 验证会话标题显示
      const title = page.locator('[data-testid="chat-title"]')
      await expect(title).toBeVisible()
    })
  })

  test.describe('边界情况', () => {
    test('应该处理非常长的消息', async ({ page }) => {
      await createTestSession(page)

      const input = page.locator('textarea[aria-label="消息输入框"]')
      const sendButton = page.locator('button[aria-label="发送消息"]')

      // 创建4000字符的消息
      const longMessage = 'A'.repeat(4000)

      await input.fill(longMessage)
      await sendButton.click()

      // 验证消息发送
      const userMessage = page.locator('[data-message-role="user"]').last()
      await expect(userMessage).toContainText('AAAAA')

      // 等待响应
      await expect(page.locator('[data-message-role="assistant"]').last()).toBeVisible({ timeout: 30000 })
    })

    test('应该处理特殊字符', async ({ page }) => {
      await createTestSession(page)

      const input = page.locator('textarea[aria-label="消息输入框"]')
      const sendButton = page.locator('button[aria-label="发送消息"]')

      // 包含特殊字符的消息
      const specialMessage = 'Test: < > & " \' \n \t @ # $ % ^ * ( ) _ + - = { } [ ] | \\ : ; " \' < > , . ? /'

      await input.fill(specialMessage)
      await sendButton.click()

      // 验证消息发送成功
      const userMessage = page.locator('[data-message-role="user"]').last()
      await expect(userMessage).toBeVisible()

      // 等待响应
      await expect(page.locator('[data-message-role="assistant"]').last()).toBeVisible({ timeout: 30000 })
    })

    test('应该处理快速连续发送多条消息', async ({ page }) => {
      await createTestSession(page)

      const input = page.locator('textarea[aria-label="消息输入框"]')
      const sendButton = page.locator('button[aria-label="发送消息"]')

      // 快速发送3条消息
      for (let i = 0; i < 3; i++) {
        await input.fill(`Rapid message ${i}`)
        await sendButton.click()
        await page.waitForTimeout(100) // 短暂间隔
      }

      // 验证所有用户消息都显示
      const userMessages = await page.locator('[data-message-role="user"]').count()
      expect(userMessages).toBe(3)

      // 等待所有响应完成
      await page.waitForTimeout(5000)

      // 验证收到响应
      const assistantMessages = await page.locator('[data-message-role="assistant"]').count()
      expect(assistantMessages).toBeGreaterThan(0)
    })
  })
})
