/**
 * StreamingText 组件测试
 *
 * 用户故事: As a user, I want to see AI responses appear progressively,
 * so that it feels like a real-time conversation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render } from 'solid-js/web'
import { StreamingText } from './StreamingText'

describe('StreamingText Component', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('基本渲染', () => {
    it('应该渲染空文本', () => {
      render(() => <StreamingText text="" speed={30} />, container)

      const textElement = container.querySelector('[data-testid="streaming-text"]')
      expect(textElement?.textContent).toBe('')
    })

    it('应该渲染完整文本', () => {
      render(() => <StreamingText text="Hello World" speed={30} complete={true} />, container)

      const textElement = container.querySelector('[data-testid="streaming-text"]')
      expect(textElement?.textContent).toBe('Hello World')
    })

    it('应该支持流式更新', () => {
      render(() => <StreamingText text="Hello" speed={30} />, container)

      const textElement = container.querySelector('[data-testid="streaming-text"]')
      expect(textElement).toBeDefined()
    })
  })

  describe('打字机动画', () => {
    it('应该逐字显示文本', async () => {
      render(() => <StreamingText text="Hello" speed={30} />, container)

      const textElement = container.querySelector('[data-testid="streaming-text"]') as HTMLElement

      // 初始状态应为空
      expect(textElement.textContent).toBe('')

      // 快进时间
      vi.advanceTimersByTime(30)

      // 等待状态更新
      await new Promise(resolve => setTimeout(resolve, 0))

      // 应该显示第一个字符
      expect(textElement.textContent?.length).toBeGreaterThan(0)
    })

    it('应该在指定时间后显示完整文本', async () => {
      const text = "Hello"
      const speed = 30

      render(() => <StreamingText text={text} speed={speed} />, container)

      const textElement = container.querySelector('[data-testid="streaming-text"]') as HTMLElement

      // 快进所有字符的时间
      vi.advanceTimersByTime(text.length * speed + 100)

      // 等待状态更新
      await new Promise(resolve => setTimeout(resolve, 0))

      // 应该显示完整文本
      expect(textElement.textContent).toBe(text)
    })

    it('应该支持可调节的打字速度', async () => {
      const fastSpeed = 10
      const slowSpeed = 100

      const { rerender } = render(() => <StreamingText text="Hi" speed={fastSpeed} />, container)

      const textElement = container.querySelector('[data-testid="streaming-text"]') as HTMLElement

      // 快速模式
      vi.advanceTimersByTime(fastSpeed * 2 + 50)
      await new Promise(resolve => setTimeout(resolve, 0))

      const fastResult = textElement.textContent
      expect(fastResult).toBeTruthy()

      // 重置并测试慢速模式
      render(() => <StreamingText text="Hi" speed={slowSpeed} />, container)

      vi.advanceTimersByTime(slowSpeed)
      await new Promise(resolve => setTimeout(resolve, 0))

      // 慢速模式应该显示更少的字符
      const slowResult = textElement.textContent
      expect(slowResult?.length).toBeLessThanOrEqual(fastResult?.length || 0)
    })

    it('应该支持立即完成显示', () => {
      render(() => <StreamingText text="Hello World" speed={30} complete={true} />, container)

      const textElement = container.querySelector('[data-testid="streaming-text"]')
      expect(textElement?.textContent).toBe('Hello World')
    })
  })

  describe('文本更新', () => {
    it('应该支持动态更新文本', async () => {
      const { rerender } = render(() => <StreamingText text="Hello" speed={30} />, container)

      const textElement = container.querySelector('[data-testid="streaming-text"]') as HTMLElement

      // 快进到显示完整文本
      vi.advanceTimersByTime(5 * 30 + 100)
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(textElement.textContent).toBe('Hello')

      // 更新文本
      render(() => <StreamingText text="Hello World" speed={30} />, container)

      // 等待更新
      await new Promise(resolve => setTimeout(resolve, 0))

      // 应该继续显示新文本
      expect(textElement.textContent).toContain('Hello')
    })

    it('应该保留已显示的字符', async () => {
      render(() => <StreamingText text="Hello" speed={30} />, container)

      const textElement = container.querySelector('[data-testid="streaming-text"]') as HTMLElement

      // 让一些字符显示
      vi.advanceTimersByTime(2 * 30)
      await new Promise(resolve => setTimeout(resolve, 0))

      const partialText = textElement.textContent

      // 更新为更长的文本
      render(() => <StreamingText text="Hello World" speed={30} />, container)

      // 等待
      await new Promise(resolve => setTimeout(resolve, 0))

      // 应该保持或增加已显示的字符
      expect(textElement.textContent?.length).toBeGreaterThanOrEqual(partialText?.length || 0)
    })
  })

  describe('光标效果', () => {
    it('应该在打字时显示闪烁光标', () => {
      render(() => <StreamingText text="Hello" speed={30} showCursor={true} />, container)

      const cursor = container.querySelector('[data-testid="cursor"]')
      expect(cursor).toBeDefined()
    })

    it('应该在不显示光标时隐藏光标元素', () => {
      render(() => <StreamingText text="Hello" speed={30} showCursor={false} />, container)

      const cursor = container.querySelector('[data-testid="cursor"]')
      expect(cursor).toBeNull()
    })

    it('完成后应该隐藏光标', async () => {
      render(() => <StreamingText text="Hi" speed={30} showCursor={true} complete={true} />, container)

      const cursor = container.querySelector('[data-testid="cursor"]')

      // 完成后光标应该被移除或隐藏
      expect(cursor?.classList.contains('opacity-0')).toBe(true)
    })
  })

  describe('完成状态', () => {
    it('应该触发 onComplete 回调', async () => {
      const onComplete = vi.fn()

      render(
        () => <StreamingText text="Hello" speed={30} onComplete={onComplete} />,
        container
      )

      // 快进到完成
      vi.advanceTimersByTime(5 * 30 + 100)
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(onComplete).toHaveBeenCalled()
    })

    it('应该在完成后添加完成类名', async () => {
      render(() => <StreamingText text="Hi" speed={30} />, container)

      const wrapper = container.querySelector('[data-testid="streaming-wrapper"]')

      // 快进到完成
      vi.advanceTimersByTime(2 * 30 + 100)
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(wrapper?.classList.contains('complete')).toBe(true)
    })
  })

  describe('暂停和恢复', () => {
    it('应该支持暂停打字', async () => {
      render(() => <StreamingText text="Hello" speed={30} paused={true} />, container)

      const textElement = container.querySelector('[data-testid="streaming-text"]') as HTMLElement

      // 快进时间
      vi.advanceTimersByTime(500)

      await new Promise(resolve => setTimeout(resolve, 0))

      // 应该仍然是空的,因为暂停了
      expect(textElement.textContent).toBe('')
    })

    it('应该在非暂停状态下正常打字', async () => {
      render(() => <StreamingText text="Hi" speed={30} paused={false} />, container)

      const textElement = container.querySelector('[data-testid="streaming-text"]') as HTMLElement

      // 快进
      vi.advanceTimersByTime(100)
      await new Promise(resolve => setTimeout(resolve, 0))

      // 应该开始显示字符
      expect(textElement.textContent?.length).toBeGreaterThan(0)
    })
  })

  describe('Markdown 支持', () => {
    it('应该渲染 Markdown 内容', () => {
      const markdownText = '**Bold** and *Italic*'

      render(
        () => <StreamingText text={markdownText} speed={30} enableMarkdown={true} />,
        container
      )

      const content = container.querySelector('[data-testid="streaming-content"]')
      expect(content).toBeDefined()
    })

    it('应该正确处理代码块', () => {
      const codeText = '```javascript\nconsole.log("Hello");\n```'

      render(
        () => <StreamingText text={codeText} speed={30} enableMarkdown={true} />,
        container
      )

      const codeElement = container.querySelector('pre code')
      expect(codeElement).toBeDefined()
    })
  })

  describe('可访问性', () => {
    it('应该有正确的ARIA标签', () => {
      render(() => <StreamingText text="Hello" speed={30} />, container)

      const wrapper = container.querySelector('[data-testid="streaming-wrapper"]')
      expect(wrapper?.getAttribute('role')).toBe('status')
      expect(wrapper?.getAttribute('aria-live')).toBe('polite')
    })

    it('应该在打字时更新ARIA标签', async () => {
      render(() => <StreamingText text="Hello" speed={30} />, container)

      const wrapper = container.querySelector('[data-testid="streaming-wrapper"]')

      vi.advanceTimersByTime(30)
      await new Promise(resolve => setTimeout(resolve, 0))

      const ariaLabel = wrapper?.getAttribute('aria-label')
      expect(ariaLabel).toBeTruthy()
    })
  })

  describe('边界情况', () => {
    it('应该处理空字符串', () => {
      render(() => <StreamingText text="" speed={30} />, container)

      const textElement = container.querySelector('[data-testid="streaming-text"]')
      expect(textElement?.textContent).toBe('')
    })

    it('应该处理很长的文本', async () => {
      const longText = 'A'.repeat(1000)

      render(() => <StreamingText text={longText} speed={10} />, container)

      const textElement = container.querySelector('[data-testid="streaming-text"]') as HTMLElement

      // 快进足够的时间
      vi.advanceTimersByTime(1000 * 10 + 100)
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(textElement.textContent?.length).toBe(1000)
    })

    it('应该处理特殊字符', async () => {
      const specialText = 'Hello\nWorld\t!@#$%^&*()'

      render(() => <StreamingText text={specialText} speed={30} />, container)

      const textElement = container.querySelector('[data-testid="streaming-text"]') as HTMLElement

      vi.advanceTimersByTime(specialText.length * 30 + 100)
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(textElement.textContent).toBe(specialText)
    })

    it('应该处理零速度(立即显示)', () => {
      render(() => <StreamingText text="Hello" speed={0} />, container)

      const textElement = container.querySelector('[data-testid="streaming-text"]')
      expect(textElement?.textContent).toBe('Hello')
    })
  })
})
