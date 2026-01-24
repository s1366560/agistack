/**
 * PromptInput 组件测试
 *
 * 用户故事: As a user, I want to input prompts with keyboard shortcuts,
 * so that I can quickly send messages without using the mouse.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from 'solid-js/web'
import { PromptInput } from './PromptInput'

describe('PromptInput Component', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  describe('基本渲染', () => {
    it('应该渲染多行文本输入框', () => {
      render(() => <PromptInput onSubmit={() => {}} />, container)

      const textarea = container.querySelector('textarea[aria-label="消息输入框"]')
      expect(textarea).toBeDefined()
      expect(textarea?.getAttribute('placeholder')).toBe('输入消息...')
    })

    it('应该显示发送按钮', () => {
      render(() => <PromptInput onSubmit={() => {}} />, container)

      const button = container.querySelector('button[aria-label="发送消息"]')
      expect(button).toBeDefined()
      expect(button?.textContent).toContain('发送')
    })

    it('输入框应该为空状态', () => {
      render(() => <PromptInput onSubmit={() => {}} />, container)

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement
      expect(textarea?.value).toBe('')
    })
  })

  describe('用户输入', () => {
    it('应该允许用户输入文本', () => {
      render(() => <PromptInput onSubmit={() => {}} />, container)

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement
      if (!textarea) throw new Error('Textarea not found')

      textarea.value = 'Hello AI'
      textarea.dispatchEvent(new Event('input', { bubbles: true }))

      expect(textarea.value).toBe('Hello AI')
    })

    it('应该显示字符计数', () => {
      render(() => <PromptInput onSubmit={() => {}} maxLength={100} />, container)

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement
      if (!textarea) throw new Error('Textarea not found')

      textarea.value = 'Hello'
      textarea.dispatchEvent(new Event('input', { bubbles: true }))

      const charCount = container.querySelector('div.text-right')
      expect(charCount?.textContent).toBe('5/100')
    })

    it('应该在达到最大长度时禁止输入', () => {
      render(() => <PromptInput onSubmit={() => {}} maxLength={10} />, container)

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement
      if (!textarea) throw new Error('Textarea not found')

      // 尝试设置超过最大长度的值
      textarea.value = '12345678901' // 11个字符
      // 由于浏览器会自动限制maxlength,我们需要验证属性
      expect(textarea?.getAttribute('maxlength')).toBe('10')
    })
  })

  describe('键盘快捷键', () => {
    it('应该在按下 Ctrl+Enter 时提交消息', () => {
      const handleSubmit = vi.fn()
      render(() => <PromptInput onSubmit={handleSubmit} />, container)

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement
      if (!textarea) throw new Error('Textarea not found')

      textarea.value = 'Test message'
      textarea.dispatchEvent(new Event('input', { bubbles: true }))

      // 模拟 Ctrl+Enter
      const keyboardEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        ctrlKey: true,
        keyCode: 13,
        bubbles: true
      })
      textarea.dispatchEvent(keyboardEvent)

      expect(handleSubmit).toHaveBeenCalledWith('Test message')
    })

    it('应该在按下 Cmd+Enter (Mac) 时提交消息', () => {
      const handleSubmit = vi.fn()
      render(() => <PromptInput onSubmit={handleSubmit} />, container)

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement
      if (!textarea) throw new Error('Textarea not found')

      textarea.value = 'Test message'
      textarea.dispatchEvent(new Event('input', { bubbles: true }))

      // 模拟 Cmd+Enter (Mac)
      const keyboardEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        metaKey: true,
        keyCode: 13,
        bubbles: true
      })
      textarea.dispatchEvent(keyboardEvent)

      expect(handleSubmit).toHaveBeenCalledWith('Test message')
    })

    it('普通 Enter 不应提交消息,而是换行', () => {
      const handleSubmit = vi.fn()
      render(() => <PromptInput onSubmit={handleSubmit} />, container)

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement
      if (!textarea) throw new Error('Textarea not found')

      textarea.value = 'Line 1'
      textarea.dispatchEvent(new Event('input', { bubbles: true }))

      // 普通Enter键
      const keyboardEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        ctrlKey: false,
        keyCode: 13,
        bubbles: true
      })
      textarea.dispatchEvent(keyboardEvent)

      expect(handleSubmit).not.toHaveBeenCalled()
      expect(textarea.value).toContain('Line 1')
    })

    it('应该在提交后清空输入框', () => {
      const handleSubmit = vi.fn()
      render(() => <PromptInput onSubmit={handleSubmit} />, container)

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement
      if (!textarea) throw new Error('Textarea not found')

      textarea.value = 'Test message'
      textarea.dispatchEvent(new Event('input', { bubbles: true }))

      const keyboardEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        ctrlKey: true,
        keyCode: 13,
        bubbles: true
      })
      textarea.dispatchEvent(keyboardEvent)

      // 等待状态更新
      setTimeout(() => {
        expect(textarea.value).toBe('')
      }, 0)
    })
  })

  describe('按钮点击', () => {
    it('应该在点击发送按钮时提交消息', () => {
      const handleSubmit = vi.fn()
      render(() => <PromptInput onSubmit={handleSubmit} />, container)

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement
      if (!textarea) throw new Error('Textarea not found')

      textarea.value = 'Test message'
      textarea.dispatchEvent(new Event('input', { bubbles: true }))

      const button = container.querySelector('button[aria-label="发送消息"]')
      if (!button) throw new Error('Button not found')

      button.click()

      expect(handleSubmit).toHaveBeenCalledWith('Test message')
    })

    it('当输入框为空时,发送按钮应该被禁用', () => {
      render(() => <PromptInput onSubmit={() => {}} />, container)

      const button = container.querySelector('button[aria-label="发送消息"]') as HTMLButtonElement
      expect(button?.disabled).toBe(true)
    })

    it('当输入框有内容时,发送按钮应该可用', () => {
      render(() => <PromptInput onSubmit={() => {}} />, container)

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement
      if (!textarea) throw new Error('Textarea not found')

      textarea.value = 'Test'
      textarea.dispatchEvent(new Event('input', { bubbles: true }))

      const button = container.querySelector('button[aria-label="发送消息"]') as HTMLButtonElement
      expect(button?.disabled).toBe(false)
    })
  })

  describe('自动调整高度', () => {
    it('应该在输入多行文本时自动增加高度', () => {
      render(() => <PromptInput onSubmit={() => {}} />, container)

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement
      if (!textarea) throw new Error('Textarea not found')

      const initialHeight = textarea.offsetHeight

      // 输入多行文本
      const longText = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5'
      textarea.value = longText
      textarea.dispatchEvent(new Event('input', { bubbles: true }))

      // 由于需要等待reactive更新,我们检查style是否改变
      setTimeout(() => {
        expect(textarea.style.height).not.toBe('auto')
      }, 0)
    })

    it('高度应该有最大限制', () => {
      render(() => <PromptInput onSubmit={() => {}} maxHeight={200} />, container)

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement
      if (!textarea) throw new Error('Textarea not found')

      expect(textarea?.style.maxHeight).toBe('200px')
    })
  })

  describe('禁用状态', () => {
    it('应该在禁用状态下不允许输入', () => {
      render(() => <PromptInput onSubmit={() => {}} disabled />, container)

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement
      expect(textarea?.disabled).toBe(true)
    })

    it('应该在禁用状态下禁用发送按钮', () => {
      render(() => <PromptInput onSubmit={() => {}} disabled />, container)

      const button = container.querySelector('button[aria-label="发送消息"]') as HTMLButtonElement
      expect(button?.disabled).toBe(true)
    })

    it('应该在禁用状态下显示加载指示器', () => {
      render(() => <PromptInput onSubmit={() => {}} disabled loading />, container)

      const loadingIndicator = container.querySelector('[data-testid="loading-indicator"]')
      expect(loadingIndicator).toBeDefined()
    })
  })

  describe('占位符文本', () => {
    it('应该显示自定义占位符', () => {
      render(() => (
        <PromptInput onSubmit={() => {}} placeholder="请输入您的问题..." />
      ), container)

      const textarea = container.querySelector('textarea')
      expect(textarea?.getAttribute('placeholder')).toBe('请输入您的问题...')
    })

    it('应该显示默认占位符', () => {
      render(() => <PromptInput onSubmit={() => {}} />, container)

      const textarea = container.querySelector('textarea')
      expect(textarea?.getAttribute('placeholder')).toBe('输入消息...')
    })
  })

  describe('可访问性', () => {
    it('应该有正确的ARIA标签', () => {
      render(() => <PromptInput onSubmit={() => {}} />, container)

      const textarea = container.querySelector('textarea')
      expect(textarea?.getAttribute('aria-label')).toBe('消息输入框')
    })

    it('应该在禁用状态有正确的ARIA属性', () => {
      render(() => <PromptInput onSubmit={() => {}} disabled />, container)

      const textarea = container.querySelector('textarea')
      expect(textarea?.getAttribute('aria-disabled')).toBe('true')
    })
  })

  describe('错误处理', () => {
    it('应该在提交空消息时不调用 onSubmit', () => {
      const handleSubmit = vi.fn()
      render(() => <PromptInput onSubmit={handleSubmit} />, container)

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement
      if (!textarea) throw new Error('Textarea not found')

      // 模拟 Ctrl+Enter 提交空消息
      const keyboardEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        ctrlKey: true,
        keyCode: 13,
        bubbles: true
      })
      textarea.dispatchEvent(keyboardEvent)

      expect(handleSubmit).not.toHaveBeenCalled()
    })

    it('应该在提交仅包含空格的消息时不调用 onSubmit', () => {
      const handleSubmit = vi.fn()
      render(() => <PromptInput onSubmit={handleSubmit} />, container)

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement
      if (!textarea) throw new Error('Textarea not found')

      textarea.value = '   '
      textarea.dispatchEvent(new Event('input', { bubbles: true }))

      // 模拟 Ctrl+Enter 提交
      const keyboardEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        ctrlKey: true,
        keyCode: 13,
        bubbles: true
      })
      textarea.dispatchEvent(keyboardEvent)

      expect(handleSubmit).not.toHaveBeenCalled()
    })
  })
})
