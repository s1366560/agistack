/**
 * MessageList 组件
 *
 * 显示对话消息列表,支持自动滚动和加载状态
 */

import { For, Show, createEffect, onMount } from 'solid-js'
import type { Message } from '@agistack/shared'

interface MessageListProps {
  /** 消息数组 */
  messages: Message[]
  /** 加载状态 */
  loading?: boolean
  /** 错误信息 */
  error?: string
  /** 自动滚动到底部 */
  autoScroll?: boolean
  /** 虚拟滚动阈值(消息数超过此值启用虚拟滚动) */
  virtualScrollThreshold?: number
}

export function MessageList(props: MessageListProps) {
  let listRef: HTMLDivElement | undefined = undefined
  let isUserScrolled = false

  // 自动滚动到底部
  const scrollToBottom = () => {
    if (!listRef) return

    // 检查用户是否手动向上滚动
    const isNearBottom =
      listRef.scrollHeight - listRef.scrollTop - listRef.clientHeight < 100

    if (isNearBottom || !isUserScrolled) {
      listRef.scrollTop = listRef.scrollHeight
    }
  }

  // 监听滚动事件,检测用户手动滚动
  const handleScroll = () => {
    if (!listRef) return

    const isNearBottom =
      listRef.scrollHeight - listRef.scrollTop - listRef.clientHeight < 100

    isUserScrolled = !isNearBottom
  }

  // 消息变化时滚动
  createEffect(() => {
    props.messages
    scrollToBottom()
  })

  // 组件挂载后滚动到底部
  onMount(() => {
    scrollToBottom()
  })

  // 渲染单个消息
  const renderMessage = (message: Message) => {
    return (
      <div
        data-testid={`message-${message.id}`}
        data-message-id={message.id}
        data-message-role={message.role}
        aria-label={`${message.role === 'user' ? '用户' : '助手'}消息: ${message.content.slice(0, 50)}`}
        class={`flex mb-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
      >
        <div
          class={`max-w-[70%] rounded-lg p-3 ${
            message.role === 'user'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
          }`}
        >
          <div class="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </div>

          <Show when={message.createdAt}>
            <div class="text-xs opacity-70 mt-1">
              {new Date(message.createdAt!).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </Show>
        </div>
      </div>
    )
  }

  // 渲染消息内容
  const renderContent = () => {
    // 显示错误状态
    if (props.error) {
      return (
        <div
          data-testid="error-message"
          class="flex items-center justify-center h-full text-red-500"
        >
          <div class="text-center">
            <svg
              class="w-12 h-12 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p>{props.error}</p>
          </div>
        </div>
      )
    }

    // 显示加载状态
    if (props.loading && props.messages.length === 0) {
      return (
        <div
          data-testid="loading-indicator"
          class="flex items-center justify-center h-full"
        >
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )
    }

    // 显示空状态
    if (props.messages.length === 0) {
      return (
        <div
          data-testid="empty-state"
          class="flex items-center justify-center h-full text-gray-400"
        >
          <div class="text-center">
            <svg
              class="w-16 h-16 mx-auto mb-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p class="text-lg">暂无消息</p>
            <p class="text-sm mt-2">开始对话吧!</p>
          </div>
        </div>
      )
    }

    // 渲染消息列表
    return (
      <For each={props.messages}>
        {(message) => renderMessage(message)}
      </For>
    )
  }

  return (
    <div
      ref={listRef}
      data-testid="message-list"
      role="log"
      aria-live="polite"
      onScroll={handleScroll}
      class="flex-1 overflow-y-auto px-4 py-6 space-y-4 scroll-smooth"
    >
      {renderContent()}

      {/* 底部加载指示器 */}
      <Show when={props.loading && props.messages.length > 0}>
        <div data-testid="loading-indicator" class="flex justify-center py-2">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      </Show>
    </div>
  )
}
