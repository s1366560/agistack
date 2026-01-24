/**
 * StreamingText 组件
 *
 * 实现打字机效果,逐字显示文本
 */

import { createSignal, onMount, onCleanup, createEffect, Show } from 'solid-js'
import { render } from 'solid-js/web'

interface StreamingTextProps {
  /** 要显示的文本 */
  text: string
  /** 打字速度(毫秒/字符) */
  speed?: number
  /** 是否已完成显示 */
  complete?: boolean
  /** 是否显示光标 */
  showCursor?: boolean
  /** 是否暂停 */
  paused?: boolean
  /** 完成回调 */
  onComplete?: () => void
  /** 是否启用 Markdown */
  enableMarkdown?: boolean
}

export function StreamingText(props: StreamingTextProps) {
  const [displayText, setDisplayText] = createSignal('')
  const [isComplete, setIsComplete] = createSignal(props.complete || false)
  let intervalId: ReturnType<typeof setInterval> | undefined = undefined

  // 开始打字动画
  const startTyping = () => {
    if (intervalId) return

    const targetText = props.text
    const speed = props.speed || 30
    const typingSpeed = speed === 0 ? 0 : speed

    let currentIndex = 0

    // 如果速度为0,立即显示完整文本
    if (typingSpeed === 0) {
      setDisplayText(targetText)
      setIsComplete(true)
      props.onComplete?.()
      return
    }

    intervalId = setInterval(() => {
      // 检查是否暂停
      if (props.paused) {
        return
      }

      if (currentIndex >= targetText.length) {
        // 打字完成
        stopTyping()
        setIsComplete(true)
        props.onComplete?.()
        return
      }

      // 添加下一个字符
      setDisplayText(targetText.slice(0, currentIndex + 1))
      currentIndex++
    }, typingSpeed)
  }

  // 停止打字动画
  const stopTyping = () => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = undefined
    }
  }

  // 组件挂载时开始打字
  onMount(() => {
    if (!props.complete) {
      startTyping()
    } else {
      setDisplayText(props.text)
      setIsComplete(true)
    }
  })

  // 组件卸载时清理定时器
  onCleanup(() => {
    stopTyping()
  })

  // 监听文本变化
  createEffect(() => {
    const text = props.text

    // 如果新文本比当前显示的长,继续打字
    if (text.length > displayText().length) {
      // 停止当前打字并重新开始
      stopTyping()
      if (!props.complete && !isComplete()) {
        startTyping()
      }
    } else if (text.length < displayText().length) {
      // 如果新文本更短,重置显示
      setDisplayText(text)
      stopTyping()
      if (!props.complete) {
        startTyping()
      }
    }
  })

  // 监听 complete 属性变化
  createEffect(() => {
    if (props.complete && !isComplete()) {
      stopTyping()
      setDisplayText(props.text)
      setIsComplete(true)
    }
  })

  // 渲染内容
  const renderContent = () => {
    const content = displayText()

    if (props.enableMarkdown) {
      // 简单的 Markdown 渲染
      return (
        <div
          data-testid="streaming-content"
          innerHTML={renderMarkdown(content)}
        />
      )
    }

    return content
  }

  // 简单的 Markdown 转 HTML
  const renderMarkdown = (text: string) => {
    return text
      // 代码块
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      // 行内代码
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      // 粗体
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // 斜体
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // 换行
      .replace(/\n/g, '<br>')
  }

  return (
    <span
      data-testid="streaming-wrapper"
      class={`inline-block ${isComplete() ? 'complete' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`正在显示: ${displayText()}`}
    >
      <span data-testid="streaming-text" class="whitespace-pre-wrap">
        {renderContent()}
      </span>

      <Show when={props.showCursor && !isComplete()}>
        <span
          data-testid="cursor"
          class="inline-block w-0.5 h-4 bg-current animate-pulse ml-0.5"
        />
      </Show>
    </span>
  )
}
