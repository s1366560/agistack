/**
 * StreamingText 组件测试
 *
 * 用户故事: As a user, I want to see AI responses appear progressively,
 * so that it feels like a real-time conversation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render } from 'solid-js/web'
import { StreamingText } from './StreamingText'

describe('StreamingText Component', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  describe('基本渲染', () => {
    it('应该渲染空文本', () => {
      render(() => <StreamingText text="" speed={30} />, container)

      const textElement = container.querySelector('[data-testid="streaming-text"]')
      expect(textElement?.textContent).toBe('')
    })

    it('应该在完成状态下渲染完整文本', () => {
      render(() => <StreamingText text="Hello World" speed={30} complete={true} />, container)

      const textElement = container.querySelector('[data-testid="streaming-text"]')
      expect(textElement?.textContent).toBe('Hello World')
    })

    it('应该渲染组件结构', () => {
      render(() => <StreamingText text="Hello" speed={30} />, container)

      const wrapper = container.querySelector('[data-testid="streaming-wrapper"]')
      const textElement = container.querySelector('[data-testid="streaming-text"]')

      expect(wrapper).toBeDefined()
      expect(textElement).toBeDefined()
    })
  })

  describe('零速度(立即显示)', () => {
    it('应该立即显示完整文本', () => {
      render(() => <StreamingText text="Hello" speed={0} complete={true} />, container)

      const textElement = container.querySelector('[data-testid="streaming-text"]')
      expect(textElement?.textContent).toBe('Hello')
    })
  })

  describe('完成状态', () => {
    it('应该在完成状态下添加complete类', () => {
      render(() => <StreamingText text="Hi" speed={30} complete={true} />, container)

      const wrapper = container.querySelector('[data-testid="streaming-wrapper"]')
      expect(wrapper?.classList.contains('complete')).toBe(true)
    })

    it('应该在未完成状态下不添加complete类', () => {
      render(() => <StreamingText text="Hi" speed={30} complete={false} />, container)

      const wrapper = container.querySelector('[data-testid="streaming-wrapper"]')
      expect(wrapper?.classList.contains('complete')).toBe(false)
    })
  })

  describe('光标效果', () => {
    it('应该在showCursor为true时显示光标', () => {
      render(() => <StreamingText text="Hello" speed={30} showCursor={true} complete={false} />, container)

      const cursor = container.querySelector('[data-testid="cursor"]')
      expect(cursor).toBeDefined()
    })

    it('应该在showCursor为false时不显示光标', () => {
      render(() => <StreamingText text="Hello" speed={30} showCursor={false} />, container)

      const cursor = container.querySelector('[data-testid="cursor"]')
      expect(cursor).toBeNull()
    })

    it('应该在完成状态下隐藏光标', () => {
      render(() => <StreamingText text="Hello" speed={30} showCursor={true} complete={true} />, container)

      const cursor = container.querySelector('[data-testid="cursor"]')
      expect(cursor).toBeNull()
    })
  })

  describe('Markdown 支持', () => {
    it('应该在启用Markdown时渲染内容', () => {
      const markdownText = 'Hello **World**'

      render(
        () => <StreamingText text={markdownText} speed={0} enableMarkdown={true} complete={true} />,
        container
      )

      const content = container.querySelector('[data-testid="streaming-content"]')
      expect(content).toBeDefined()
    })

    it('应该在启用Markdown时渲染代码块', () => {
      const codeText = '```javascript\nconsole.log("Hello");\n```'

      render(
        () => <StreamingText text={codeText} speed={0} enableMarkdown={true} complete={true} />,
        container
      )

      const codeElement = container.querySelector('pre code')
      expect(codeElement).toBeDefined()
      expect(codeElement?.textContent).toContain('console.log("Hello")')
    })

    it('应该渲染粗体文本', () => {
      const boldText = '**Bold** text'

      render(
        () => <StreamingText text={boldText} speed={0} enableMarkdown={true} complete={true} />,
        container
      )

      const strongElement = container.querySelector('strong')
      expect(strongElement).toBeDefined()
      expect(strongElement?.textContent).toBe('Bold')
    })

    it('应该渲染斜体文本', () => {
      const italicText = '*Italic* text'

      render(
        () => <StreamingText text={italicText} speed={0} enableMarkdown={true} complete={true} />,
        container
      )

      const emElement = container.querySelector('em')
      expect(emElement).toBeDefined()
      expect(emElement?.textContent).toBe('Italic')
    })

    it('应该渲染行内代码', () => {
      const inlineCodeText = 'Use `console.log()`'

      render(
        () => <StreamingText text={inlineCodeText} speed={0} enableMarkdown={true} complete={true} />,
        container
      )

      const codeElement = container.querySelector('code.inline-code')
      expect(codeElement).toBeDefined()
      expect(codeElement?.textContent).toBe('console.log()')
    })
  })

  describe('可访问性', () => {
    it('应该有正确的ARIA角色', () => {
      render(() => <StreamingText text="Hello" speed={30} />, container)

      const wrapper = container.querySelector('[data-testid="streaming-wrapper"]')
      expect(wrapper?.getAttribute('role')).toBe('status')
      expect(wrapper?.getAttribute('aria-live')).toBe('polite')
    })

    it('应该有ARIA标签', () => {
      render(() => <StreamingText text="Hello" speed={0} complete={true} />, container)

      const wrapper = container.querySelector('[data-testid="streaming-wrapper"]')
      const ariaLabel = wrapper?.getAttribute('aria-label')
      expect(ariaLabel).toBeTruthy()
      expect(ariaLabel).toContain('Hello')
    })
  })

  describe('边界情况', () => {
    it('应该处理空字符串', () => {
      render(() => <StreamingText text="" speed={30} complete={true} />, container)

      const textElement = container.querySelector('[data-testid="streaming-text"]')
      expect(textElement?.textContent).toBe('')
    })

    it('应该处理特殊字符', () => {
      const specialText = 'Hello\nWorld\t!@#$%'

      render(() => <StreamingText text={specialText} speed={0} complete={true} />, container)

      const textElement = container.querySelector('[data-testid="streaming-text"]')
      expect(textElement?.textContent).toBe(specialText)
    })

    it('应该处理很长的文本', () => {
      const longText = 'A'.repeat(1000)

      render(() => <StreamingText text={longText} speed={0} complete={true} />, container)

      const textElement = container.querySelector('[data-testid="streaming-text"]')
      expect(textElement?.textContent?.length).toBe(1000)
    })

    it('应该处理换行符', () => {
      const textWithNewlines = 'Line 1\nLine 2\nLine 3'

      render(() => <StreamingText text={textWithNewlines} speed={0} complete={true} />, container)

      const textElement = container.querySelector('[data-testid="streaming-text"]')
      expect(textElement?.textContent).toBe(textWithNewlines)
    })
  })
})
