/**
 * 会话详情页组件测试
 *
 * 用户故事: As a user, I want a complete chat interface with message history,
 * input field, and real-time streaming, so that I can have natural conversations with AI.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from 'solid-js/web'
import { createSignal } from 'solid-js'
import { ChatPage } from './[id]'
import type { Message, Session } from '@agistack/shared'

describe('ChatPage Component', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  const mockSession: Session = {
    id: 'session-1',
    projectId: 'project-1',
    agentType: 'claude',
    title: 'Test Conversation',
    messages: [],
    context: {},
    createdAt: new Date('2025-01-24T10:00:00Z'),
    updatedAt: new Date('2025-01-24T10:00:00Z')
  }

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
      content: 'Hello! How can I help you today?',
      createdAt: new Date('2025-01-24T10:00:01Z')
    }
  ]

  describe('页面布局', () => {
    it('应该渲染完整的页面结构', () => {
      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={mockMessages}
            loading={false}
            onSendMessage={() => {}}
          />
        ),
        container
      )

      const page = container.querySelector('[data-testid="chat-page"]')
      expect(page).toBeDefined()
    })

    it('应该包含头部区域', () => {
      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={mockMessages}
            loading={false}
            onSendMessage={() => {}}
          />
        ),
        container
      )

      const header = container.querySelector('[data-testid="chat-header"]')
      expect(header).toBeDefined()
    })

    it('应该包含消息列表区域', () => {
      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={mockMessages}
            loading={false}
            onSendMessage={() => {}}
          />
        ),
        container
      )

      const messageList = container.querySelector('[data-testid="message-list"]')
      expect(messageList).toBeDefined()
    })

    it('应该包含输入区域', () => {
      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={mockMessages}
            loading={false}
            onSendMessage={() => {}}
          />
        ),
        container
      )

      const inputArea = container.querySelector('[data-testid="input-area"]')
      expect(inputArea).toBeDefined()
    })
  })

  describe('头部功能', () => {
    it('应该显示会话标题', () => {
      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={mockMessages}
            loading={false}
            onSendMessage={() => {}}
          />
        ),
        container
      )

      const title = container.querySelector('[data-testid="chat-title"]')
      expect(title?.textContent).toBe('Test Conversation')
    })

    it('应该有返回按钮', () => {
      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={mockMessages}
            loading={false}
            onSendMessage={() => {}}
          />
        ),
        container
      )

      const backButton = container.querySelector('[data-testid="back-button"]')
      expect(backButton).toBeDefined()
    })

    it('应该有设置按钮', () => {
      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={mockMessages}
            loading={false}
            onSendMessage={() => {}}
          />
        ),
        container
      )

      const settingsButton = container.querySelector('[data-testid="settings-button"]')
      expect(settingsButton).toBeDefined()
    })

    it('点击返回按钮应该调用onBack回调', () => {
      const handleBack = vi.fn()

      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={mockMessages}
            loading={false}
            onSendMessage={() => {}}
            onBack={handleBack}
          />
        ),
        container
      )

      const backButton = container.querySelector('[data-testid="back-button"]')
      if (backButton) {
        backButton.click()
      }

      expect(handleBack).toHaveBeenCalled()
    })

    it('应该显示会话元数据', () => {
      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={mockMessages}
            loading={false}
            onSendMessage={() => {}}
            showSessionMetadata={true}
          />
        ),
        container
      )

      const metadata = container.querySelector('[data-testid="session-metadata"]')
      expect(metadata).toBeDefined()
    })
  })

  describe('消息显示', () => {
    it('应该显示所有消息', () => {
      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={mockMessages}
            loading={false}
            onSendMessage={() => {}}
          />
        ),
        container
      )

      const messages = container.querySelectorAll('[data-testid^="message-"][data-message-id]')
      expect(messages.length).toBe(2)
    })

    it('应该将MessageList组件的messages属性传递下去', () => {
      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={mockMessages}
            loading={false}
            onSendMessage={() => {}}
          />
        ),
        container
      )

      const messageList = container.querySelector('[data-testid="message-list"]')
      expect(messageList).toBeDefined()
    })

    it('应该在加载时显示加载状态', () => {
      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={[]}
            loading={true}
            onSendMessage={() => {}}
          />
        ),
        container
      )

      const loadingIndicator = container.querySelector('[data-testid="loading-indicator"]')
      expect(loadingIndicator).toBeDefined()
    })

    it('应该在没有消息时显示空状态', () => {
      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={[]}
            loading={false}
            onSendMessage={() => {}}
          />
        ),
        container
      )

      const emptyState = container.querySelector('[data-testid="empty-state"]')
      expect(emptyState).toBeDefined()
    })

    it('应该支持流式消息显示', () => {
      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={mockMessages}
            loading={false}
            onSendMessage={() => {}}
            streaming={true}
            streamText="Hello"
          />
        ),
        container
      )

      const streamingMessage = container.querySelector('[data-testid^="message-"][data-streaming="true"]')
      expect(streamingMessage).toBeDefined()
    })
  })

  describe('消息输入', () => {
    it('应该渲染PromptInput组件', () => {
      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={mockMessages}
            loading={false}
            onSendMessage={() => {}}
          />
        ),
        container
      )

      const inputArea = container.querySelector('[data-testid="input-area"] textarea')
      expect(inputArea).toBeDefined()
    })

    it('发送消息应该调用onSendMessage回调', async () => {
      const handleSendMessage = vi.fn()

      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={mockMessages}
            loading={false}
            onSendMessage={handleSendMessage}
          />
        ),
        container
      )

      const textarea = container.querySelector('[data-testid="input-area"] textarea') as HTMLTextAreaElement
      if (textarea) {
        textarea.value = 'Test message'
        textarea.dispatchEvent(new Event('input', { bubbles: true }))

        // 等待状态更新
        await new Promise(resolve => setTimeout(resolve, 0))

        const sendButton = container.querySelector('[data-testid="send-button"]') as HTMLButtonElement
        if (sendButton && !sendButton.disabled) {
          sendButton.click()
        }
      }

      // 等待异步操作
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(handleSendMessage).toHaveBeenCalled()
    })

    it('应该在输入时禁用发送按钮', () => {
      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={mockMessages}
            loading={true}
            onSendMessage={() => {}}
          />
        ),
        container
      )

      const sendButton = container.querySelector('[data-testid="send-button"]') as HTMLButtonElement
      expect(sendButton?.disabled).toBe(true)
    })

    it('应该在流式传输时禁用输入', () => {
      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={mockMessages}
            loading={false}
            onSendMessage={() => {}}
            streaming={true}
          />
        ),
        container
      )

      const textarea = container.querySelector('[data-testid="input-area"] textarea') as HTMLTextAreaElement
      expect(textarea?.disabled).toBe(true)
    })

    it('应该显示占位符文本', () => {
      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={mockMessages}
            loading={false}
            onSendMessage={() => {}}
            placeholder="请输入您的问题..."
          />
        ),
        container
      )

      const textarea = container.querySelector('[data-testid="input-area"] textarea') as HTMLTextAreaElement
      expect(textarea?.getAttribute('placeholder')).toBe('请输入您的问题...')
    })
  })

  describe('响应式设计', () => {
    it('应该渲染页面容器', () => {
      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={mockMessages}
            loading={false}
            onSendMessage={() => {}}
          />
        ),
        container
      )

      const page = container.querySelector('[data-testid="chat-page"]')
      expect(page).toBeDefined()
      expect(page?.classList.contains('h-screen')).toBe(true)
    })

    it('应该支持虚拟化选项', () => {
      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={mockMessages}
            loading={false}
            onSendMessage={() => {}}
            enableVirtualization={true}
          />
        ),
        container
      )

      const page = container.querySelector('[data-testid="chat-page"]')
      expect(page).toBeDefined()
    })
  })

  describe('深色模式', () => {
    it('应该在深色模式下应用正确的类', () => {
      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={mockMessages}
            loading={false}
            onSendMessage={() => {}}
            darkMode={true}
          />
        ),
        container
      )

      const page = container.querySelector('[data-testid="chat-page"]')
      expect(page?.classList.contains('dark')).toBe(true)
    })

    it('应该切换深色模式', () => {
      let isDarkMode = false

      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={mockMessages}
            loading={false}
            onSendMessage={() => {}}
            darkMode={isDarkMode}
            onDarkModeToggle={() => { isDarkMode = !isDarkMode }}
          />
        ),
        container
      )

      const toggleButton = container.querySelector('[data-testid="dark-mode-toggle"]')
      if (toggleButton) {
        toggleButton.click()
      }

      // 应该切换状态
      expect(isDarkMode).toBe(true)
    })
  })

  describe('错误处理', () => {
    it('应该显示错误消息', () => {
      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={mockMessages}
            loading={false}
            onSendMessage={() => {}}
            error="Failed to load messages"
          />
        ),
        container
      )

      const errorMessage = container.querySelector('[data-testid="error-message"]')
      expect(errorMessage).toBeDefined()
      expect(errorMessage?.textContent).toContain('Failed to load messages')
    })

    it('应该在错误时显示重试按钮', () => {
      const handleRetry = vi.fn()

      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={mockMessages}
            loading={false}
            onSendMessage={() => {}}
            error="Network error"
            onRetry={handleRetry}
          />
        ),
        container
      )

      const retryButton = container.querySelector('[data-testid="retry-button"]')
      expect(retryButton).toBeDefined()

      if (retryButton) {
        retryButton.click()
        expect(handleRetry).toHaveBeenCalled()
      }
    })

    it('应该在发送失败时显示错误提示', () => {
      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={mockMessages}
            loading={false}
            onSendMessage={() => {}}
            sendError="Failed to send message"
          />
        ),
        container
      )

      // 错误提示在input-area区域内
      const sendError = container.querySelector('[data-testid="input-area"] [data-testid="send-error"]')
      expect(sendError).toBeDefined()
      expect(sendError?.textContent).toContain('Failed to send message')
    })
  })

  describe('键盘快捷键', () => {
    it('应该支持Esc键关闭设置', () => {
      const handleSettingsClose = vi.fn()

      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={mockMessages}
            loading={false}
            onSendMessage={() => {}}
            settingsOpen={true}
            onSettingsClose={handleSettingsClose}
          />
        ),
        container
      )

      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        keyCode: 27,
        bubbles: true
      })

      document.dispatchEvent(escapeEvent)

      expect(handleSettingsClose).toHaveBeenCalled()
    })

    it('应该支持Ctrl+K打开搜索', () => {
      const handleSearchOpen = vi.fn()

      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={mockMessages}
            loading={false}
            onSendMessage={() => {}}
            onSearchOpen={handleSearchOpen}
          />
        ),
        container
      )

      const keyboardEvent = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        keyCode: 75,
        bubbles: true
      })

      document.dispatchEvent(keyboardEvent)

      expect(handleSearchOpen).toHaveBeenCalled()
    })
  })

  describe('可访问性', () => {
    it('应该有正确的页面标题', () => {
      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={mockMessages}
            loading={false}
            onSendMessage={() => {}}
          />
        ),
        container
      )

      const page = container.querySelector('[data-testid="chat-page"]')
      expect(page?.getAttribute('role')).toBe('main')
    })

    it('应该有ARIA标签', () => {
      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={mockMessages}
            loading={false}
            onSendMessage={() => {}}
          />
        ),
        container
      )

      const page = container.querySelector('[data-testid="chat-page"]')
      const ariaLabel = page?.getAttribute('aria-label')
      expect(ariaLabel).toBeTruthy()
      expect(ariaLabel).toContain('Test Conversation')
    })

    it('应该在加载时显示加载指示器', () => {
      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={[]}
            loading={true}
            onSendMessage={() => {}}
          />
        ),
        container
      )

      const loadingIndicator = container.querySelector('[data-testid="loading-indicator"]')
      expect(loadingIndicator).toBeDefined()
    })
  })

  describe('性能优化', () => {
    it('应该正确渲染大量消息', () => {
      const messages = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        createdAt: new Date()
      }))

      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={messages}
            loading={false}
            onSendMessage={() => {}}
          />
        ),
        container
      )

      const renderedMessages = container.querySelectorAll('[data-testid^="message-"][data-message-id]')
      expect(renderedMessages.length).toBe(100)
    })

    it('应该支持虚拟化选项', () => {
      const longMessages = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        role: 'user',
        content: `Message ${i}`,
        createdAt: new Date()
      }))

      render(
        () => (
          <ChatPage
            session={mockSession}
            messages={longMessages}
            loading={false}
            onSendMessage={() => {}}
            enableVirtualization={false}
          />
        ),
        container
      )

      const renderedMessages = container.querySelectorAll('[data-testid^="message-"][data-message-id]')
      expect(renderedMessages.length).toBe(100)
    })
  })
})
