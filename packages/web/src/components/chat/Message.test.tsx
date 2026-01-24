/**
 * Message 组件测试
 *
 * 用户故事: As a user, I want to see formatted messages with syntax highlighting,
 * so that I can read code and structured content easily.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render } from 'solid-js/web'
import { Message } from './Message'
import type { Message as MessageType } from '@agistack/shared'

describe('Message Component', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  const mockMessage: MessageType = {
    id: '1',
    role: 'user',
    content: 'Hello, how are you?',
    createdAt: new Date('2025-01-24T10:00:00Z')
  }

  const mockAssistantMessage: MessageType = {
    id: '2',
    role: 'assistant',
    content: 'I am doing well, thank you!',
    createdAt: new Date('2025-01-24T10:00:01Z')
  }

  describe('基本渲染', () => {
    it('应该渲染用户消息', () => {
      render(() => <Message message={mockMessage} />, container)

      const messageElement = container.querySelector('[data-testid="message-1"]')
      expect(messageElement).toBeDefined()
    })

    it('应该渲染助手消息', () => {
      render(() => <Message message={mockAssistantMessage} />, container)

      const messageElement = container.querySelector('[data-testid="message-2"]')
      expect(messageElement).toBeDefined()
    })

    it('应该显示消息内容', () => {
      render(() => <Message message={mockMessage} />, container)

      const contentElement = container.querySelector('[data-testid="message-content"]')
      expect(contentElement?.textContent).toBe('Hello, how are you?')
    })

    it('应该显示消息角色', () => {
      render(() => <Message message={mockMessage} />, container)

      const messageElement = container.querySelector('[data-testid="message-1"]')
      expect(messageElement?.getAttribute('data-role')).toBe('user')
    })
  })

  describe('样式和布局', () => {
    it('用户消息应该右对齐', () => {
      render(() => <Message message={mockMessage} />, container)

      const messageElement = container.querySelector('[data-testid="message-1"]')
      expect(messageElement?.classList.contains('justify-end')).toBe(true)
    })

    it('助手消息应该左对齐', () => {
      render(() => <Message message={mockAssistantMessage} />, container)

      const messageElement = container.querySelector('[data-testid="message-2"]')
      expect(messageElement?.classList.contains('justify-start')).toBe(true)
    })

    it('用户消息应该有不同的背景色', () => {
      render(() => <Message message={mockMessage} />, container)

      const bubbleElement = container.querySelector('[data-testid="message-bubble"]')
      expect(bubbleElement?.classList.contains('bg-blue-500')).toBe(true)
    })

    it('助手消息应该有不同的背景色', () => {
      render(() => <Message message={mockAssistantMessage} />, container)

      const bubbleElement = container.querySelector('[data-testid="message-bubble"]')
      expect(bubbleElement?.classList.contains('bg-gray-200')).toBe(true)
    })
  })

  describe('时间戳', () => {
    it('应该显示消息时间', () => {
      render(() => <Message message={mockMessage} />, container)

      const timestampElement = container.querySelector('[data-testid="message-timestamp"]')
      expect(timestampElement).toBeDefined()
    })

    it('应该格式化时间为本地时间', () => {
      render(() => <Message message={mockMessage} />, container)

      const timestampElement = container.querySelector('[data-testid="message-timestamp"]')
      const timeText = timestampElement?.textContent

      // 应该包含时间,不包含日期
      expect(timeText).toMatch(/^\d{2}:\d{2}$/)
    })

    it('时间戳应该有正确的类名', () => {
      render(() => <Message message={mockMessage} />, container)

      const timestampElement = container.querySelector('[data-testid="message-timestamp"]')
      expect(timestampElement?.classList.contains('text-xs')).toBe(true)
      expect(timestampElement?.classList.contains('opacity-70')).toBe(true)
    })

    it('当没有createdAt时不显示时间戳', () => {
      const messageWithoutTime: MessageType = {
        id: '3',
        role: 'user',
        content: 'No time'
      }

      render(() => <Message message={messageWithoutTime} />, container)

      const timestampElement = container.querySelector('[data-testid="message-timestamp"]')
      expect(timestampElement).toBeNull()
    })
  })

  describe('Markdown 渲染', () => {
    it('应该渲染粗体文本', () => {
      const message: MessageType = {
        id: '1',
        role: 'assistant',
        content: 'This is **bold** text',
        createdAt: new Date()
      }

      render(() => <Message message={message} />, container)

      const strongElement = container.querySelector('strong')
      expect(strongElement).toBeDefined()
      expect(strongElement?.textContent).toBe('bold')
    })

    it('应该渲染斜体文本', () => {
      const message: MessageType = {
        id: '1',
        role: 'assistant',
        content: 'This is *italic* text',
        createdAt: new Date()
      }

      render(() => <Message message={message} />, container)

      const emElement = container.querySelector('em')
      expect(emElement).toBeDefined()
      expect(emElement?.textContent).toBe('italic')
    })

    it('应该渲染代码块', () => {
      const message: MessageType = {
        id: '1',
        role: 'assistant',
        content: '```javascript\nconst x = 1;\n```',
        createdAt: new Date()
      }

      render(() => <Message message={message} />, container)

      const codeBlock = container.querySelector('pre code')
      expect(codeBlock).toBeDefined()
      expect(codeBlock?.textContent).toContain('const x = 1;')
    })

    it('应该渲染行内代码', () => {
      const message: MessageType = {
        id: '1',
        role: 'assistant',
        content: 'Use `console.log()` for debugging',
        createdAt: new Date()
      }

      render(() => <Message message={message} />, container)

      const inlineCode = container.querySelector('code')
      expect(inlineCode).toBeDefined()
      expect(inlineCode?.textContent).toBe('console.log()')
    })

    it('应该渲染链接', () => {
      const message: MessageType = {
        id: '1',
        role: 'assistant',
        content: 'Visit [Example](https://example.com)',
        createdAt: new Date()
      }

      render(() => <Message message={message} />, container)

      const linkElement = container.querySelector('a')
      expect(linkElement).toBeDefined()
      expect(linkElement?.getAttribute('href')).toBe('https://example.com')
      expect(linkElement?.textContent).toBe('Example')
    })

    it('应该渲染列表', () => {
      const message: MessageType = {
        id: '1',
        role: 'assistant',
        content: '- Item 1\n- Item 2\n- Item 3',
        createdAt: new Date()
      }

      render(() => <Message message={message} />, container)

      const listElement = container.querySelector('ul')
      expect(listElement).toBeDefined()

      const listItems = container.querySelectorAll('li')
      expect(listItems.length).toBe(3)
    })

    it('应该处理换行符', () => {
      const message: MessageType = {
        id: '1',
        role: 'assistant',
        content: 'Line 1\nLine 2\nLine 3',
        createdAt: new Date()
      }

      render(() => <Message message={message} />, container)

      const contentElement = container.querySelector('[data-testid="message-content"]')
      expect(contentElement?.innerHTML).toContain('<br')
    })
  })

  describe('代码高亮', () => {
    it('应该为JavaScript代码块添加高亮', () => {
      const message: MessageType = {
        id: '1',
        role: 'assistant',
        content: '```javascript\nconst greeting = "Hello";\nconsole.log(greeting);\n```',
        createdAt: new Date()
      }

      render(() => <Message message={message} syntaxHighlight={true} />, container)

      const codeElement = container.querySelector('pre code')
      expect(codeElement).toBeDefined()
      expect(codeElement?.classList.contains('language-javascript')).toBe(true)
    })

    it('应该为Python代码块添加高亮', () => {
      const message: MessageType = {
        id: '1',
        role: 'assistant',
        content: '```python\nprint("Hello, World!")\n```',
        createdAt: new Date()
      }

      render(() => <Message message={message} syntaxHighlight={true} />, container)

      const codeElement = container.querySelector('pre code')
      expect(codeElement?.classList.contains('language-python')).toBe(true)
    })

    it('当syntaxHighlight为false时不添加高亮类', () => {
      const message: MessageType = {
        id: '1',
        role: 'assistant',
        content: '```javascript\nconst x = 1;\n```',
        createdAt: new Date()
      }

      render(() => <Message message={message} syntaxHighlight={false} />, container)

      const codeElement = container.querySelector('pre code')
      expect(codeElement).toBeDefined()
      expect(codeElement?.classList.contains('language-javascript')).toBe(false)
    })
  })

  describe('流式文本', () => {
    it('应该支持流式文本显示', () => {
      render(
        () => (
          <Message
            message={mockAssistantMessage}
            streaming={true}
            streamText="I am"
          />
        ),
        container
      )

      const contentElement = container.querySelector('[data-testid="message-content"]')
      expect(contentElement?.textContent).toBe('I am')
    })

    it('应该在流式模式下显示光标', () => {
      render(
        () => (
          <Message
            message={mockAssistantMessage}
            streaming={true}
            streamText="Hello"
            showCursor={true}
          />
        ),
        container
      )

      const cursor = container.querySelector('[data-testid="streaming-cursor"]')
      expect(cursor).toBeDefined()
    })

    it('应该在非流式模式下不显示光标', () => {
      render(() => <Message message={mockAssistantMessage} streaming={false} />, container)

      const cursor = container.querySelector('[data-testid="streaming-cursor"]')
      expect(cursor).toBeNull()
    })
  })

  describe('元数据', () => {
    it('应该显示模型信息', () => {
      const messageWithMetadata: MessageType = {
        id: '1',
        role: 'assistant',
        content: 'Response',
        createdAt: new Date(),
        metadata: {
          model: 'gpt-4'
        }
      }

      render(() => <Message message={messageWithMetadata} showMetadata={true} />, container)

      const metadataElement = container.querySelector('[data-testid="message-metadata"]')
      expect(metadataElement).toBeDefined()
      expect(metadataElement?.textContent).toContain('gpt-4')
    })

    it('应该在showMetadata为false时不显示元数据', () => {
      const messageWithMetadata: MessageType = {
        id: '1',
        role: 'assistant',
        content: 'Response',
        createdAt: new Date(),
        metadata: {
          model: 'gpt-4'
        }
      }

      render(() => <Message message={messageWithMetadata} showMetadata={false} />, container)

      const metadataElement = container.querySelector('[data-testid="message-metadata"]')
      expect(metadataElement).toBeNull()
    })

    it('应该显示token使用情况', () => {
      const messageWithTokens: MessageType = {
        id: '1',
        role: 'assistant',
        content: 'Response',
        createdAt: new Date(),
        metadata: {
          tokensUsed: 150
        }
      }

      render(() => <Message message={messageWithTokens} showMetadata={true} />, container)

      const metadataElement = container.querySelector('[data-testid="message-metadata"]')
      expect(metadataElement?.textContent).toContain('150')
    })
  })

  describe('可访问性', () => {
    it('应该有正确的ARIA角色', () => {
      render(() => <Message message={mockMessage} />, container)

      const messageElement = container.querySelector('[data-testid="message-1"]')
      expect(messageElement?.getAttribute('role')).toBe('article')
    })

    it('应该有ARIA标签', () => {
      render(() => <Message message={mockMessage} />, container)

      const messageElement = container.querySelector('[data-testid="message-1"]')
      const ariaLabel = messageElement?.getAttribute('aria-label')
      expect(ariaLabel).toBeTruthy()
      expect(ariaLabel).toContain('用户')
    })

    it('助手消息应该有不同的ARIA标签', () => {
      render(() => <Message message={mockAssistantMessage} />, container)

      const messageElement = container.querySelector('[data-testid="message-2"]')
      const ariaLabel = messageElement?.getAttribute('aria-label')
      expect(ariaLabel).toContain('助手')
    })
  })

  describe('边界情况', () => {
    it('应该处理空内容', () => {
      const emptyMessage: MessageType = {
        id: '1',
        role: 'user',
        content: '',
        createdAt: new Date()
      }

      render(() => <Message message={emptyMessage} />, container)

      const contentElement = container.querySelector('[data-testid="message-content"]')
      expect(contentElement?.textContent).toBe('')
    })

    it('应该处理非常长的内容', () => {
      const longContent = 'A'.repeat(10000)
      const longMessage: MessageType = {
        id: '1',
        role: 'assistant',
        content: longContent,
        createdAt: new Date()
      }

      render(() => <Message message={longMessage} />, container)

      const contentElement = container.querySelector('[data-testid="message-content"]')
      expect(contentElement?.textContent?.length).toBe(10000)
    })

    it('应该处理特殊字符', () => {
      const specialMessage: MessageType = {
        id: '1',
        role: 'user',
        content: 'Special chars: < > & " \'',
        createdAt: new Date()
      }

      render(() => <Message message={specialMessage} />, container)

      const contentElement = container.querySelector('[data-testid="message-content"]')
      expect(contentElement?.textContent).toContain('Special chars:')
    })
  })
})
