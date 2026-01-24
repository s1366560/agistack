/**
 * MessageList 组件测试
 *
 * 用户故事: As a user, I want to see a scrollable list of messages,
 * so that I can read the conversation history.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from 'solid-js/web'
import { MessageList } from './MessageList'
import type { Message } from '@agistack/shared'

describe('MessageList Component', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  const mockMessages: Message[] = [
    {
      id: '1',
      role: 'user',
      content: 'Hello AI',
      createdAt: new Date('2025-01-24T10:00:00Z')
    },
    {
      id: '2',
      role: 'assistant',
      content: 'Hello! How can I help you?',
      createdAt: new Date('2025-01-24T10:00:01Z')
    },
    {
      id: '3',
      role: 'user',
      content: 'What is the weather today?',
      createdAt: new Date('2025-01-24T10:00:02Z')
    }
  ]

  describe('基本渲染', () => {
    it('应该渲染消息列表容器', () => {
      render(() => <MessageList messages={[]} loading={false} />, container)

      const list = container.querySelector('[data-testid="message-list"]')
      expect(list).toBeDefined()
    })

    it('应该渲染所有消息', () => {
      render(() => <MessageList messages={mockMessages} loading={false} />, container)

      const messages = container.querySelectorAll('[data-testid^="message-"][data-message-id]')
      expect(messages.length).toBe(3)
    })

    it('应该显示空状态提示当没有消息时', () => {
      render(() => <MessageList messages={[]} loading={false} />, container)

      const emptyState = container.querySelector('[data-testid="empty-state"]')
      expect(emptyState).toBeDefined()
      expect(emptyState?.textContent).toContain('暂无消息')
    })
  })

  describe('加载状态', () => {
    it('应该在加载时显示加载指示器', () => {
      render(() => <MessageList messages={[]} loading={true} />, container)

      const loading = container.querySelector('[data-testid="loading-indicator"]')
      expect(loading).toBeDefined()
    })

    it('加载时不应显示空状态', () => {
      render(() => <MessageList messages={[]} loading={true} />, container)

      const emptyState = container.querySelector('[data-testid="empty-state"]')
      expect(emptyState).toBeNull()
    })

    it('加载时仍应显示已有消息', () => {
      render(() => <MessageList messages={mockMessages} loading={true} />, container)

      const messages = container.querySelectorAll('[data-testid^="message-"][data-message-id]')
      expect(messages.length).toBe(3)

      const loading = container.querySelector('[data-testid="loading-indicator"]')
      expect(loading).toBeDefined()
    })
  })

  describe('自动滚动', () => {
    it('应该在新消息添加时自动滚动到底部', async () => {
      render(() => <MessageList messages={mockMessages} loading={false} />, container)

      const list = container.querySelector('[data-testid="message-list"]') as HTMLElement
      if (!list) throw new Error('Message list not found')

      // 等待滚动完成
      await new Promise(resolve => setTimeout(resolve, 100))

      // 检查是否滚动到底部
      const isAtBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 100
      expect(isAtBottom).toBe(true)
    })

    it('应该在用户向上滚动时不强制滚动', async () => {
      render(() => <MessageList messages={mockMessages} loading={false} />, container)

      const list = container.querySelector('[data-testid="message-list"]') as HTMLElement
      if (!list) throw new Error('Message list not found')

      // 模拟用户向上滚动
      list.scrollTop = 0

      // 等待
      await new Promise(resolve => setTimeout(resolve, 100))

      // 应该保持在顶部(不会自动滚动到底部)
      expect(list.scrollTop).toBe(0)
    })
  })

  describe('消息渲染', () => {
    it('应该渲染用户消息', () => {
      render(() => <MessageList messages={mockMessages} loading={false} />, container)

      const userMessages = container.querySelectorAll('[data-message-role="user"]')
      expect(userMessages.length).toBe(2)
    })

    it('应该渲染助手消息', () => {
      render(() => <MessageList messages={mockMessages} loading={false} />, container)

      const assistantMessages = container.querySelectorAll('[data-message-role="assistant"]')
      expect(assistantMessages.length).toBe(1)
    })

    it('应该按时间顺序显示消息', () => {
      render(() => <MessageList messages={mockMessages} loading={false} />, container)

      const messages = container.querySelectorAll('[data-testid^="message-"][data-message-id]')
      const firstMessage = messages[0]
      const lastMessage = messages[2]

      expect(firstMessage?.getAttribute('data-message-id')).toBe('1')
      expect(lastMessage?.getAttribute('data-message-id')).toBe('3')
    })
  })

  describe('错误状态', () => {
    it('应该显示错误消息', () => {
      render(
        () => (
          <MessageList
            messages={[]}
            loading={false}
            error="Failed to load messages"
          />
        ),
        container
      )

      const error = container.querySelector('[data-testid="error-message"]')
      expect(error).toBeDefined()
      expect(error?.textContent).toContain('Failed to load messages')
    })

    it('错误时不应显示空状态', () => {
      render(
        () => (
          <MessageList
            messages={[]}
            loading={false}
            error="An error occurred"
          />
        ),
        container
      )

      const emptyState = container.querySelector('[data-testid="empty-state"]')
      expect(emptyState).toBeNull()
    })
  })

  describe('可访问性', () => {
    it('应该有正确的ARIA角色', () => {
      render(() => <MessageList messages={mockMessages} loading={false} />, container)

      const list = container.querySelector('[data-testid="message-list"]')
      expect(list?.getAttribute('role')).toBe('log')
      expect(list?.getAttribute('aria-live')).toBe('polite')
    })

    it('应该为消息添加ARIA标签', () => {
      render(() => <MessageList messages={mockMessages} loading={false} />, container)

      const messages = container.querySelectorAll('[data-testid^="message-"][data-message-id]')
      messages.forEach((msg, index) => {
        const ariaLabel = msg?.getAttribute('aria-label')
        expect(ariaLabel).toBeTruthy()
        expect(ariaLabel).toContain(
          index % 2 === 0 ? '用户' : '助手'
        )
      })
    })
  })
})
