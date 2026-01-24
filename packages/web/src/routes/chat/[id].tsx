/**
 * 会话详情页
 *
 * 整合所有聊天组件,提供完整的对话界面
 */

import { createSignal, onMount, onCleanup, Show } from 'solid-js'
import { MessageList } from '../../components/chat/MessageList'
import { PromptInput } from '../../components/chat/PromptInput'
import { Message } from '../../components/chat/Message'
import { StreamingText } from '../../components/chat/StreamingText'
import { Button } from '../../components/ui/Button'
import type { Message as MessageType, Session } from '@agistack/shared'

interface ChatPageProps {
  /** 会话数据 */
  session: Session
  /** 消息列表 */
  messages: MessageType[]
  /** 加载状态 */
  loading?: boolean
  /** 错误信息 */
  error?: string
  /** 发送错误 */
  sendError?: string
  /** 是否正在流式传输 */
  streaming?: boolean
  /** 流式文本内容 */
  streamText?: string
  /** 发送消息回调 */
  onSendMessage: (content: string) => void | Promise<void>
  /** 返回回调 */
  onBack?: () => void
  /** 重试回调 */
  onRetry?: () => void
  /** 设置关闭回调 */
  onSettingsClose?: () => void
  /** 搜索打开回调 */
  onSearchOpen?: () => void
  /** 深色模式切换回调 */
  onDarkModeToggle?: () => void
  /** 深色模式状态 */
  darkMode?: boolean
  /** 是否显示会话元数据 */
  showSessionMetadata?: boolean
  /** 是否启用虚拟化 */
  enableVirtualization?: boolean
  /** 输入框占位符 */
  placeholder?: string
  /** 设置是否打开 */
  settingsOpen?: boolean
}

export function ChatPage(props: ChatPageProps) {
  const [inputValue, setInputValue] = createSignal('')
  const [isInputDisabled, setIsInputDisabled] = createSignal(false)
  const [showSendError, setShowSendError] = createSignal(false)

  // 处理发送消息
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || props.loading || props.streaming) {
      return
    }

    setIsInputDisabled(true)
    setShowSendError(false)

    try {
      await props.onSendMessage(content)
      setInputValue('')
    } catch (error) {
      console.error('Failed to send message:', error)
      setShowSendError(true)
      // 3秒后隐藏错误提示
      setTimeout(() => setShowSendError(false), 3000)
    } finally {
      setIsInputDisabled(false)
    }
  }

  // 处理键盘快捷键
  const handleKeyDown = (e: KeyboardEvent) => {
    // Esc键 - 关闭设置
    if (e.key === 'Escape' && props.settingsOpen && props.onSettingsClose) {
      props.onSettingsClose()
    }

    // Ctrl+K - 打开搜索
    if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      props.onSearchOpen?.()
    }
  }

  // 组件挂载时添加键盘事件监听
  onMount(() => {
    document.addEventListener('keydown', handleKeyDown)
  })

  // 组件卸载时移除键盘事件监听
  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown)
  })

  // 渲染头部
  const renderHeader = () => {
    return (
      <header
        data-testid="chat-header"
        class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      >
        <div class="flex items-center gap-3">
          {/* 返回按钮 */}
          <Show when={props.onBack}>
            <Button
              data-testid="back-button"
              onClick={props.onBack}
              variant="secondary"
              size="sm"
              aria-label="返回"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Button>
          </Show>

          {/* 会话标题 */}
          <div>
            <h1
              data-testid="chat-title"
              class="text-lg font-semibold text-gray-900 dark:text-white"
            >
              {props.session.title || 'Untitled Conversation'}
            </h1>
            <Show when={props.showSessionMetadata}>
              <div data-testid="session-metadata" class="text-xs text-gray-500 dark:text-gray-400">
                {`${props.session.agentType} · ${new Date(props.session.updatedAt).toLocaleDateString()}`}
              </div>
            </Show>
          </div>
        </div>

        <div class="flex items-center gap-2">
          {/* 深色模式切换 */}
          <Show when={props.onDarkModeToggle}>
            <button
              data-testid="dark-mode-toggle"
              onClick={props.onDarkModeToggle}
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="切换深色模式"
            >
              <Show
                when={props.darkMode}
                fallback={
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                }
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </Show>
            </button>
          </Show>

          {/* 设置按钮 */}
          <Button
            data-testid="settings-button"
            variant="secondary"
            size="sm"
            aria-label="设置"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </Button>
        </div>
      </header>
    )
  }

  // 渲染错误消息
  const renderError = () => {
    if (!props.error && !showSendError()) return null

    return (
      <div
        data-testid={props.error ? "error-message" : "send-error"}
        class="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>{props.error || props.sendError || 'An error occurred'}</span>
        <Show when={props.onRetry && props.error}>
          <Button
            data-testid="retry-button"
            onClick={props.onRetry}
            variant="secondary"
            size="sm"
            class="ml-2"
          >
            重试
          </Button>
        </Show>
      </div>
    )
  }

  return (
    <div
      data-testid="chat-page"
      role="main"
      aria-label={`聊天: ${props.session.title || 'Untitled Conversation'}`}
      class={`flex flex-col h-screen bg-white dark:bg-gray-900 ${props.darkMode ? 'dark' : ''} ${
        props.enableVirtualization ? 'max-w-full' : 'max-w-7xl mx-auto'
      }`}
    >
      {/* 头部 */}
      {renderHeader()}

      {/* 错误提示 */}
      {renderError()}

      {/* 消息列表区域 */}
      <div class="flex-1 overflow-hidden">
        <Show
          when={props.streaming && props.streamText}
          fallback={
            <MessageList
              messages={props.messages}
              loading={props.loading}
              error={undefined}
              autoScroll={true}
            />
          }
        >
          {/* 流式消息显示 */}
          <div class="h-full flex flex-col">
            <MessageList
              messages={props.messages}
              loading={false}
              error={undefined}
              autoScroll={true}
            />
            <div class="px-4 pb-4">
              <div data-testid={`message-${props.messages.length + 1}`} data-streaming="true">
                <Message
                  message={{
                    id: 'streaming',
                    role: 'assistant',
                    content: '',
                    createdAt: new Date()
                  }}
                  streaming={true}
                  streamText={props.streamText}
                  showCursor={true}
                />
              </div>
            </div>
          </div>
        </Show>
      </div>

      {/* 输入区域 */}
      <div
        data-testid="input-area"
        class="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
      >
        <Show when={showSendError() || props.sendError}>
          <div data-testid="send-error" class="mb-2 text-sm text-red-500">
            {showSendError() ? '发送失败,请重试' : props.sendError}
          </div>
        </Show>

        <PromptInput
          onSubmit={handleSendMessage}
          placeholder={props.placeholder || '输入消息... (Ctrl+Enter 发送)'}
          disabled={props.loading || props.streaming || isInputDisabled()}
          loading={props.streaming || isInputDisabled()}
          maxLength={4000}
        />
      </div>
    </div>
  )
}
