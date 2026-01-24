/**
 * E2E 测试全局设置和 Fixtures
 *
 * 提供测试辅助函数和全局配置
 */

import { test as base } from '@playwright/test'

// 定义测试辅助函数
export const test = base.extend({
  // 自定义页面对象
  page: async ({ page }, use) => {
    // 设置默认超时
    page.setDefaultTimeout(10000)

    // 监听页面错误
    page.on('pageerror', (error) => {
      console.error('Page error:', error)
    })

    // 监听控制台消息
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Console error:', msg.text())
      }
    })

    await use(page)
  },
})

/**
 * 测试辅助函数
 */
export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * 登录用户
   */
  async login(email = 'test@example.com', password = 'password123') {
    await this.page.goto('/login')
    await this.page.fill('input[name="email"]', email)
    await this.page.fill('input[name="password"]', password)
    await this.page.click('button[type="submit"]')
    await this.page.waitForURL('/', { timeout: 5000 })
  }

  /**
   * 创建测试会话
   */
  async createSession() {
    await this.page.click('button:has-text("新建对话")')
    await this.page.waitForURL(/\/chat\/.*/, { timeout: 5000 })
  }

  /**
   * 发送消息
   */
  async sendMessage(message: string) {
    const input = this.page.locator('textarea[aria-label="消息输入框"]')
    const sendButton = this.page.locator('button[aria-label="发送消息"]')

    await input.fill(message)
    await sendButton.click()

    // 等待消息发送
    await this.page.waitForSelector(`[data-message-role="user"]:has-text("${message.slice(0, 20)}")`, {
      timeout: 5000
    })
  }

  /**
   * 等待AI响应
   */
  async waitForResponse() {
    return this.page.waitForSelector('[data-message-role="assistant"]', {
      timeout: 30000
    })
  }

  /**
   * 获取最后一条消息
   */
  async getLastMessage(role: 'user' | 'assistant') {
    const message = this.page.locator(`[data-message-role="${role}"]`).last()
    return await message.textContent()
  }

  /**
   * 等待加载完成
   */
  async waitForLoad() {
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * 截图（用于调试）
   */
  async screenshot(name: string) {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: true
    })
  }
}

/**
 * 测试数据生成器
 */
export class TestDataGenerator {
  /**
   * 生成随机用户邮箱
   */
  static randomEmail() {
    return `test-${Date.now()}@example.com`
  }

  /**
   * 生成随机用户名
   */
  static randomUsername() {
    return `user_${Date.now()}`
  }

  /**
   * 生成随机消息内容
   */
  static randomMessage() {
    const messages = [
      'Hello AI',
      'How are you?',
      'What can you do?',
      'Tell me a joke',
      'Help me with code'
    ]
    return messages[Math.floor(Math.random() * messages.length)]
  }

  /**
   * 生成长文本
   */
  static longText(length: number) {
    return 'A'.repeat(length)
  }

  /**
   * 生成包含特殊字符的文本
   */
  static specialCharsText() {
    return 'Test: < > & " \' \n \t @ # $ % ^ * ( ) _ + - = { } [ ] | \\ : ; " \' < > , . ? /'
  }
}

/**
 * 断言辅助函数
 */
export class Assertions {
  constructor(private page: Page) {}

  /**
   * 验证元素可见
   */
  async isVisible(selector: string) {
    const element = this.page.locator(selector)
    return await element.isVisible()
  }

  /**
   * 验证元素包含文本
   */
  async containsText(selector: string, text: string) {
    const element = this.page.locator(selector)
    return await element.textContent().then(content => content?.includes(text))
  }

  /**
   * 验证URL匹配
   */
  async urlMatches(pattern: RegExp | string) {
    const url = this.page.url()
    if (pattern instanceof RegExp) {
      return pattern.test(url)
    }
    return url.includes(pattern)
  }
}

/**
 * 性能监控
 */
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map()

  /**
   * 记录性能指标
   */
  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name)!.push(value)
  }

  /**
   * 获取平均指标
   */
  getAverageMetric(name: string) {
    const values = this.metrics.get(name)
    if (!values || values.length === 0) {
      return 0
    }
    return values.reduce((a, b) => a + b, 0) / values.length
  }

  /**
   * 验证性能阈值
   */
  verifyThreshold(name: string, threshold: number) {
    const avg = this.getAverageMetric(name)
    return avg <= threshold
  }
}
