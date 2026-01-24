/**
 * Message 组件
 *
 * 显示单个消息气泡,支持 Markdown 和代码高亮
 */

import { Show } from 'solid-js'
import type { Message as MessageType } from '@agistack/shared'

interface MessageProps {
  /** 消息数据 */
  message: MessageType
  /** 是否启用语法高亮 */
  syntaxHighlight?: boolean
  /** 是否正在流式传输 */
  streaming?: boolean
  /** 流式文本内容 */
  streamText?: string
  /** 是否显示光标 */
  showCursor?: boolean
  /** 是否显示元数据 */
  showMetadata?: boolean
}

export function Message(props: MessageProps) {
  // 简单的 Markdown 转换为 HTML
  const renderMarkdown = (text: string) => {
    const shouldHighlight = props.syntaxHighlight !== false

    return text
      // 代码块
      .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        const language = lang || 'text'
        const langClass = shouldHighlight ? `language-${language}` : ''
        return `<pre><code class="${langClass}">${escapeHtml(code.trim())}</code></pre>`
      })
      // 行内代码
      .replace(/`([^`]+)`/g, '<code class="inline-code bg-gray-100 dark:bg-gray-700 px-1 rounded">$1</code>')
      // 粗体
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // 斜体
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // 链接
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">$1</a>')
      // 无序列表
      .replace(/^\- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul class="list-disc list-inside">$1</ul>')
      // 换行
      .replace(/\n/g, '<br>')
  }

  // HTML 转义
  const escapeHtml = (text: string) => {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  // 获取要显示的内容
  const getContent = () => {
    if (props.streaming && props.streamText !== undefined) {
      return props.streamText
    }
    return props.message.content
  }

  // 格式化时间戳
  const formatTimestamp = (date?: Date) => {
    if (!date) return ''
    return new Date(date).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 用户消息样式
  const isUserMessage = () => props.message.role === 'user'

  return (
    <div
      data-testid={`message-${props.message.id}`}
      data-role={props.message.role}
      role="article"
      aria-label={`${isUserMessage() ? '用户' : '助手'}消息: ${props.message.content.slice(0, 50)}`}
      class={`flex mb-4 ${isUserMessage() ? 'justify-end' : 'justify-start'}`}
    >
      <div
        data-testid="message-bubble"
        class={`max-w-[70%] rounded-lg p-3 ${
          isUserMessage()
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
        }`}
      >
        {/* 消息内容 */}
        <div
          data-testid="message-content"
          class="text-sm whitespace-pre-wrap break-words prose dark:prose-invert max-w-none"
          innerHTML={renderMarkdown(getContent())}
        />

        {/* 流式光标 */}
        <Show when={props.streaming && props.showCursor}>
          <span
            data-testid="streaming-cursor"
            class="inline-block w-0.5 h-4 bg-current animate-pulse ml-0.5"
          />
        </Show>

        {/* 时间戳 */}
        <Show when={props.message.createdAt}>
          <div
            data-testid="message-timestamp"
            class="text-xs opacity-70 mt-1"
          >
            {formatTimestamp(props.message.createdAt)}
          </div>
        </Show>

        {/* 元数据 */}
        <Show when={props.showMetadata && props.message.metadata}>
          <div
            data-testid="message-metadata"
            class="text-xs opacity-60 mt-1 flex items-center gap-2"
          >
            <Show when={props.message.metadata?.model}>
              <span>Model: {props.message.metadata.model}</span>
            </Show>
            <Show when={props.message.metadata?.tokensUsed}>
              <span>Tokens: {props.message.metadata.tokensUsed}</span>
            </Show>
            <Show when={props.message.metadata?.duration}>
              <span>Duration: {props.message.metadata.duration}ms</span>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  )
}
