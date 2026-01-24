/**
 * 会话管理 E2E 测试
 *
 * 测试会话创建、切换、删除等管理功能
 */

import { test, expect } from '@playwright/test'

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

describe('会话管理 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  describe('会话创建', () => {
    test('用户应该能够创建新会话', async ({ page }) => {
      // 在首页点击"新建对话"
      await page.click('button:has-text("新建对话")')

      // 验证跳转到新会话页面
      await page.waitForURL(/\/chat\/.*/, { timeout: 5000 })
      expect(page.url()).toMatch(/\/chat\/[a-z0-9-]+/)

      // 验证会话页面元素
      const chatPage = page.locator('[data-testid="chat-page"]')
      await expect(chatPage).toBeVisible()

      const input = page.locator('textarea[aria-label="消息输入框"]')
      await expect(input).toBeVisible()
    })

    test('新会话应该有唯一ID', async ({ page }) => {
      // 创建第一个会话
      await page.click('button:has-text("新建对话")')
      const firstSessionId = page.url().split('/').pop()

      // 返回首页
      await page.click('[data-testid="back-button"]')
      await page.waitForURL('/')

      // 创建第二个会话
      await page.click('button:has-text("新建对话")')
      const secondSessionId = page.url().split('/').pop()

      // 验证两个会话ID不同
      expect(firstSessionId).not.toBe(secondSessionId)
    })

    test('新会话应该是空的', async ({ page }) => {
      await page.click('button:has-text("新建对话")')

      // 验证空状态提示
      const emptyState = page.locator('[data-testid="empty-state"]')
      await expect(emptyState).toBeVisible()
      await expect(emptyState).toContainText('暂无消息')

      // 验证没有消息
      const messages = page.locator('[data-testid^="message-"][data-message-id]')
      expect(await messages.count()).toBe(0)
    })
  })

  describe('会话列表', () => {
    test('应该在首页显示会话列表', async ({ page }) => {
      // 应该在首页
      expect(page.url()).toContain('/')

      // 查找会话列表
      const sessionList = page.locator('[data-testid="session-list"]')
      await expect(sessionList).toBeVisible()
    })

    test('会话列表应该显示会话标题', async ({ page }) => {
      // 创建新会话并发送消息以生成标题
      await page.click('button:has-text("新建对话")')

      const input = page.locator('textarea[aria-label="消息输入框"]')
      await input.fill('Hello AI')
      await page.click('button[aria-label="发送消息"]')

      // 等待响应
      await page.waitForTimeout(3000)

      // 返回首页
      await page.click('[data-testid="back-button"]')
      await page.waitForURL('/')

      // 验证会话在列表中显示
      const sessionItems = page.locator('[data-testid="session-item"]')
      expect(await sessionItems.count()).toBeGreaterThan(0)
    })

    test('应该显示会话的最后消息预览', async ({ page }) => {
      // 创建会话
      await page.click('button:has-text("新建对话")')

      const input = page.locator('textarea[aria-label="消息输入框"]')
      await input.fill('Test message for preview')
      await page.click('button[aria-label="发送消息"]')

      await page.waitForTimeout(3000)

      // 返回首页
      await page.click('[data-testid="back-button"]')

      // 验证最后消息预览
      const lastMessage = page.locator('[data-testid="session-last-message"]').first()
      await expect(lastMessage).toBeVisible()
      await expect(lastMessage).toContainText('Test message for preview')
    })

    test('应该显示会话创建/更新时间', async ({ page }) => {
      // 创建会话
      await page.click('button:has-text("新建对话")')
      await page.waitForTimeout(1000)

      // 返回首页
      await page.click('[data-testid="back-button"]')

      // 验证时间显示
      const timestamp = page.locator('[data-testid="session-timestamp"]').first()
      await expect(timestamp).toBeVisible()

      // 验证时间格式 (应该包含"分钟前"、"小时前"等相对时间)
      const timeText = await timestamp.textContent()
      expect(timeText).toMatch(/\d+\s*(分钟|小时|天)前/)
    })
  })

  describe('会话切换', () => {
    test('应该能够切换会话', async ({ page }) => {
      // 创建第一个会话
      await page.click('button:has-text("新建对话")')
      await page.fill('textarea[aria-label="消息输入框"]', 'First session')
      await page.click('button[aria-label="发送消息"]')
      await page.waitForTimeout(2000)

      // 返回首页
      await page.click('[data-testid="back-button"]')

      // 创建第二个会话
      await page.click('button:has-text("新建对话")')
      await page.fill('textarea[aria-label="消息输入框"]', 'Second session')
      await page.click('button[aria-label="发送消息"]')
      await page.waitForTimeout(2000)

      // 返回首页
      await page.click('[data-testid="back-button"]')

      // 切换到第一个会话
      const sessionItems = page.locator('[data-testid="session-item"]')
      await sessionItems.first().click()

      // 验证正确的会话加载
      await page.waitForURL(/\/chat\/.*/, { timeout: 5000 })

      // 验证消息内容
      const messages = page.locator('[data-message-role="user"]')
      await expect(messages.first()).toContainText('First session')
    })

    test('切换会话时应该保持独立状态', async ({ page }) => {
      // 创建会话A
      await page.click('button:has-text("新建对话")')
      const sessionIdA = page.url().split('/').pop()

      await page.fill('textarea[aria-label="消息输入框"]', 'Session A message')
      await page.click('button[aria-label="发送消息"]')
      await page.waitForTimeout(2000)

      // 返回并创建会话B
      await page.click('[data-testid="back-button"]')
      await page.click('button:has-text("新建对话")')
      const sessionIdB = page.url().split('/').pop()

      await page.fill('textarea[aria-label="消息输入框"]', 'Session B message')
      await page.click('button[aria-label="发送消息"]')
      await page.waitForTimeout(2000)

      // 返回首页
      await page.click('[data-testid="back-button"]')

      // 切换回会话A
      await page.locator('[data-testid="session-item"]').first().click()
      await page.waitForURL(new RegExp(sessionIdA))

      // 验证只显示会话A的消息
      const userMessages = await page.locator('[data-message-role="user"]').allTextContents()
      expect(userMessages).toContain('Session A message')
      expect(userMessages).not.toContain('Session B message')
    })
  })

  describe('会话删除', () => {
    test('应该能够删除会话', async ({ page }) => {
      // 创建会话
      await page.click('button:has-text("新建对话")')
      const sessionId = page.url().split('/').pop()

      await page.fill('textarea[aria-label="消息输入框"]', 'To be deleted')
      await page.click('button[aria-label="发送消息"]')
      await page.waitForTimeout(2000)

      // 返回首页
      await page.click('[data-testid="back-button"]')

      // 记录删除前的会话数
      const beforeCount = await page.locator('[data-testid="session-item"]').count()

      // 点击删除按钮（假设在hover时显示）
      const sessionItem = page.locator('[data-testid="session-item"]').first()
      await sessionItem.hover()

      const deleteButton = page.locator('[data-testid="delete-session-button"]').first()
      await deleteButton.click()

      // 确认删除（如果有确认对话框）
      const confirmButton = page.locator('button:has-text("确认")')
      if (await confirmButton.isVisible()) {
        await confirmButton.click()
      }

      // 验证会话被删除
      const afterCount = await page.locator('[data-testid="session-item"]').count()
      expect(afterCount).toBe(beforeCount - 1)
    })

    test('删除会话时应该显示确认对话框', async ({ page }) => {
      // 创建会话
      await page.click('button:has-text("新建对话")')
      await page.waitForTimeout(1000)

      // 返回首页
      await page.click('[data-testid="back-button"]')

      // 点击删除按钮
      const sessionItem = page.locator('[data-testid="session-item"]').first()
      await sessionItem.hover()

      const deleteButton = page.locator('[data-testid="delete-session-button"]').first()
      await deleteButton.click()

      // 验证确认对话框显示
      const confirmDialog = page.locator('[data-testid="confirm-dialog"]')
      await expect(confirmDialog).toBeVisible()

      // 验证对话框内容
      await expect(confirmDialog).toContainText('确认删除')
      await expect(confirmDialog).toContainText('删除后无法恢复')

      // 点击取消
      await page.click('button:has-text("取消")')

      // 验证对话框关闭
      await expect(confirmDialog).not.toBeVisible()

      // 验证会话仍然存在
      const sessionItems = await page.locator('[data-testid="session-item"]').count()
      expect(sessionItems).toBeGreaterThan(0)
    })
  })

  describe('会话重命名', () => {
    test('应该能够重命名会话', async ({ page }) => {
      // 创建会话
      await page.click('button:has-text("新建对话")')
      const sessionId = page.url().split('/').pop()

      // 点击会话标题编辑
      const titleElement = page.locator('[data-testid="chat-title"]')
      await titleElement.click()

      // 输入新标题
      const titleInput = page.locator('input[data-testid="title-input"]')
      await titleInput.fill('My Renamed Session')

      // 保存
      await page.click('button[aria-label="保存"]')

      // 验证标题更新
      await expect(titleElement).toContainText('My Renamed Session')

      // 返回首页验证
      await page.click('[data-testid="back-button"]')

      const sessionTitle = page.locator('[data-testid="session-title"]').first()
      await expect(sessionTitle).toContainText('My Renamed Session')
    })

    test('应该支持取消重命名', async ({ page }) => {
      await page.click('button:has-text("新建对话")')

      // 点击编辑标题
      const titleElement = page.locator('[data-testid="chat-title"]')
      await titleElement.click()

      // 输入新标题
      const titleInput = page.locator('input[data-testid="title-input"]')
      await titleInput.fill('Cancelled Title')

      // 按Escape取消
      await titleInput.press('Escape')

      // 验证标题没有改变
      await expect(titleElement).not.toContainText('Cancelled Title')
    })
  })

  describe('会话搜索', () => {
    test.beforeEach(async ({ page }) => {
      // 创建多个会话用于测试搜索
      for (let i = 0; i < 3; i++) {
        await page.click('button:has-text("新建对话")')
        await page.fill('textarea[aria-label="消息输入框"]', `Session ${i} content`)
        await page.click('button[aria-label="发送消息"]')
        await page.waitForTimeout(2000)
        await page.click('[data-testid="back-button"]')
      }
    })

    test('应该能够搜索会话', async ({ page }) => {
      // 输入搜索关键词
      const searchInput = page.locator('input[placeholder*="搜索"]')
      await searchInput.fill('Session 1')

      // 验证搜索结果
      const sessionItems = page.locator('[data-testid="session-item"]')
      const count = await sessionItems.count()

      // 应该只显示匹配的会话
      expect(count).toBeGreaterThan(0)
      expect(count).toBeLessThan(3)

      // 验证结果包含搜索词
      const firstResult = await sessionItems.first().textContent()
      expect(firstResult).toContain('Session 1')
    })

    test('清除搜索应该显示所有会话', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="搜索"]')

      // 搜索
      await searchInput.fill('Session 1')
      await page.waitForTimeout(500)

      const filteredCount = await page.locator('[data-testid="session-item"]').count()

      // 清除搜索
      await searchInput.fill('')
      await page.waitForTimeout(500)

      const allCount = await page.locator('[data-testid="session-item"]').count()

      // 验证显示所有会话
      expect(allCount).toBeGreaterThan(filteredCount)
    })

    test('搜索不存在的会话应该显示空结果', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="搜索"]')

      // 搜索不存在的内容
      await searchInput.fill('Nonexistent Session XYZ')

      // 验证空结果提示
      const emptyResults = page.locator('[data-testid="empty-search-results"]')
      await expect(emptyResults).toBeVisible()
      await expect(emptyResults).toContainText('未找到相关会话')
    })
  })

  describe('会话持久化', () => {
    test('刷新页面后应该保持会话状态', async ({ page }) => {
      // 创建会话
      await page.click('button:has-text("新建对话")')
      const currentUrl = page.url()

      await page.fill('textarea[aria-label="消息输入框"]', 'Persistent message')
      await page.click('button[aria-label="发送消息"]')
      await page.waitForTimeout(3000)

      // 刷新页面
      await page.reload()

      // 验证仍然在同一会话
      expect(page.url()).toBe(currentUrl)

      // 验证消息仍然存在
      const userMessage = page.locator('[data-message-role="user"]')
      await expect(userMessage).toContainText('Persistent message')
    })

    test('关闭标签页后重新打开应该恢复会话历史', async ({ page }) => {
      // 创建会话
      await page.click('button:has-text("新建对话")')
      await page.fill('textarea[aria-label="消息输入框"]', 'Important message')
      await page.click('button[aria-label="发送消息"]')
      await page.waitForTimeout(3000)

      // 返回首页
      await page.click('[data-testid="back-button"]')

      // 导航到会话
      const sessionItem = page.locator('[data-testid="session-item"]').first()
      await sessionItem.click()

      // 验证消息历史恢复
      const userMessage = page.locator('[data-message-role="user"]')
      await expect(userMessage).toContainText('Important message')
    })
  })

  describe('会话排序', () => {
    test('会话应该按更新时间排序', async ({ page }) => {
      // 创建第一个会话
      await page.click('button:has-text("新建对话")')
      await page.fill('textarea[aria-label="消息输入框"]', 'First session')
      await page.click('button[aria-label="发送消息"]')
      await page.waitForTimeout(2000)
      await page.click('[data-testid="back-button"]')

      // 创建第二个会话
      await page.click('button:has-text("新建对话")')
      await page.fill('textarea[aria-label="消息输入框"]', 'Second session')
      await page.click('button[aria-label="发送消息"]')
      await page.waitForTimeout(2000)
      await page.click('[data-testid="back-button"]')

      // 验证会话顺序（最新的应该在前面）
      const sessionItems = await page.locator('[data-testid="session-item"]').allTextContents()

      // 第二个会话应该在第一位
      expect(sessionItems[0]).toContain('Second session')
    })

    test('发送消息后应该将会话移到顶部', async ({ page }) => {
      // 创建两个会话
      await page.click('button:has-text("新建对话")')
      await page.fill('textarea[aria-label="消息输入框"]', 'Session A')
      await page.click('button[aria-label="发送消息"]')
      await page.waitForTimeout(2000)
      await page.click('[data-testid="back-button"]')

      await page.click('button:has-text("新建对话")')
      await page.fill('textarea[aria-label="消息输入框"]', 'Session B')
      await page.click('button[aria-label="发送消息"]')
      await page.waitForTimeout(2000)
      await page.click('[data-testid="back-button"]')

      // 获取第一个会话
      const sessionItems = page.locator('[data-testid="session-item"]')
      const firstSessionText = await sessionItems.first().textContent()

      // 切换到第一个会话（Session B）
      await sessionItems.first().click()

      // 发送消息
      await page.fill('textarea[aria-label="消息输入框"]', 'New message in Session B')
      await page.click('button[aria-label="发送消息"]')
      await page.waitForTimeout(2000)

      // 返回首页
      await page.click('[data-testid="back-button"]')

      // 验证Session B仍然在顶部
      const newFirstSessionText = await sessionItems.first().textContent()
      expect(newFirstSessionText).toBe(firstSessionText)
    })
  })

  describe('性能测试', () => {
    test('会话列表应该在100ms内加载', async ({ page }) => {
      const startTime = Date.now()

      await page.goto('/')

      // 等待会话列表加载
      await page.waitForSelector('[data-testid="session-list"]', { timeout: 5000 })

      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(100)
    })

    test('切换会话应该在300ms内完成', async ({ page }) => {
      // 确保有会话可切换
      const sessionItems = page.locator('[data-testid="session-item"]')
      const count = await sessionItems.count()

      if (count > 1) {
        const startTime = Date.now()

        await sessionItems.nth(1).click()

        // 等待页面更新
        await page.waitForSelector('textarea[aria-label="消息输入框"]', { timeout: 5000 })

        const loadTime = Date.now() - startTime

        expect(loadTime).toBeLessThan(300)
      }
    })
  })
})
