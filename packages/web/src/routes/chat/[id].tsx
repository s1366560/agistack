/**
 * Chat Route Container Component
 *
 * 容器组件: 连接路由参数、hooks 和展示组件
 * 负责数据获取和状态管理,将数据传递给展示组件
 */

import { onMount, Show } from 'solid-js'
import { useParams, useNavigate } from '@solidjs/router'
import { useChatContext } from '../../contexts/ChatContext'
import { useAppContext } from '../../contexts/AppContext'
import { ChatPage } from '../../components/chat/ChatPage'

/**
 * Chat 路由容器组件
 *
 * 功能:
 * - 从路由参数获取 session ID
 * - 使用 hooks 加载会话数据
 * - 集成深色模式
 * - 处理导航
 * - 传递数据给展示组件
 */
export default function ChatRouteContainer() {
  // 获取路由参数
  const params = useParams()
  const navigate = useNavigate()

  // 获取 context
  const chatContext = useChatContext()
  const appContext = useAppContext()

  // 提取 session ID
  const sessionId = () => params.id as string

  // 组件挂载时加载会话
  onMount(() => {
    const id = sessionId()
    if (id) {
      chatContext.loadSession(id).catch((error) => {
        console.error('Failed to load session:', error)
        // 404 错误会在 useChatSession hook 中处理导航
      })
    }
  })

  // 处理返回导航
  const handleBack = () => {
    navigate(-1)
  }

  // 处理深色模式切换
  const handleDarkModeToggle = () => {
    appContext.toggleDarkMode()
  }

  // 处理设置关闭
  const handleSettingsClose = () => {
    appContext.setSettingsOpen(false)
  }

  // 处理搜索打开
  const handleSearchOpen = () => {
    // TODO: 实现搜索功能
    console.log('Search not yet implemented')
  }

  // 渲染加载状态
  const renderLoading = () => {
    return (
      <div
        data-testid="chat-loading"
        class="flex items-center justify-center h-screen bg-white dark:bg-gray-900"
      >
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
          <p class="mt-4 text-gray-600 dark:text-gray-400">Loading conversation...</p>
        </div>
      </div>
    )
  }

  // 渲染错误状态
  const renderError = () => {
    const error = chatContext.error()
    if (!error) return null

    return (
      <div
        data-testid="chat-error"
        class="flex items-center justify-center h-screen bg-white dark:bg-gray-900"
      >
        <div class="text-center max-w-md px-4">
          <div class="text-red-500 mb-4">
            <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Conversation
          </h2>
          <p class="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => chatContext.retry()}
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // 渲染会话不存在状态
  const renderNotFound = () => {
    return (
      <div
        data-testid="chat-not-found"
        class="flex items-center justify-center h-screen bg-white dark:bg-gray-900"
      >
        <div class="text-center max-w-md px-4">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Conversation Not Found
          </h2>
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            The conversation you're looking for doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => navigate('/sessions')}
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Sessions
          </button>
        </div>
      </div>
    )
  }

  return (
    <Show
      when={chatContext.loading()}
      fallback={renderLoading()}
    >
      <Show
        when={chatContext.error()}
        fallback={
          <Show
            when={chatContext.session()}
            fallback={renderNotFound()}
          >
            <ChatPage
              session={chatContext.session()!}
              messages={chatContext.messages()}
              loading={chatContext.loading()}
              error={chatContext.error() || undefined}
              streaming={chatContext.streaming()}
              streamText={chatContext.streamText()}
              onSendMessage={chatContext.sendMessage}
              onBack={handleBack}
              onRetry={chatContext.retry}
              onSettingsClose={handleSettingsClose}
              onSearchOpen={handleSearchOpen}
              onDarkModeToggle={handleDarkModeToggle}
              darkMode={appContext.darkMode()}
              showSessionMetadata={true}
              enableVirtualization={false}
              placeholder="输入消息... (Ctrl+Enter 发送)"
              settingsOpen={appContext.settingsOpen()}
            />
          </Show>
        }
      >
        {renderError()}
      </Show>
    </Show>
  )
}

// 为了向后兼容,导出 ChatPage 作为命名导出
export { ChatPage } from '../../components/chat/ChatPage'
