/**
 * PromptInput 组件
 *
 * 多行文本输入组件,支持快捷键提交和自动高度调整
 */

import { createSignal, createEffect, onMount, Show } from 'solid-js'
import { Button } from '../ui/Button'

interface PromptInputProps {
  /** 提交回调函数 */
  onSubmit: (value: string) => void
  /** 占位符文本 */
  placeholder?: string
  /** 最大字符数 */
  maxLength?: number
  /** 最大高度(像素) */
  maxHeight?: number
  /** 禁用状态 */
  disabled?: boolean
  /** 加载状态 */
  loading?: boolean
}

export function PromptInput(props: PromptInputProps) {
  const [value, setValue] = createSignal('')
  const [textareaHeight, setTextareaHeight] = createSignal('auto')
  let textareaRef: HTMLTextAreaElement | undefined = undefined

  // 自动调整高度
  const adjustHeight = () => {
    if (!textareaRef) return

    textareaRef.style.height = 'auto'
    const newHeight = Math.min(
      textareaRef.scrollHeight,
      props.maxHeight || 200
    )
    textareaRef.style.height = `${newHeight}px`
    setTextareaHeight(`${newHeight}px`)
  }

  // 处理输入变化
  const handleInput = (e: Event & { currentTarget: HTMLTextAreaElement }) => {
    const newValue = e.currentTarget.value
    setValue(newValue)
    adjustHeight()
  }

  // 处理键盘事件
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl+Enter 或 Cmd+Enter 提交
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // 提交处理
  const handleSubmit = () => {
    const message = value().trim()

    // 空消息不提交
    if (!message || props.disabled || props.loading) {
      return
    }

    props.onSubmit(message)

    // 清空输入框
    setValue('')
    if (textareaRef) {
      textareaRef.value = ''
      adjustHeight()
    }
  }

  // 计算字符数
  const charCount = () => value().length
  const maxLength = () => props.maxLength || 1000

  // 是否禁用发送按钮
  const isButtonDisabled = () => {
    return props.disabled || props.loading || value().trim().length === 0
  }

  // 组件挂载后调整高度
  onMount(() => {
    adjustHeight()
  })

  // 值变化时重新调整高度
  createEffect(() => {
    value()
    adjustHeight()
  })

  return (
    <div class="flex flex-col gap-2">
      <div class="relative">
        <textarea
          ref={textareaRef}
          value={value()}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={props.placeholder || '输入消息...'}
          disabled={props.disabled}
          aria-label="消息输入框"
          aria-disabled={props.disabled ? 'true' : 'false'}
          maxlength={props.maxLength || 1000}
          class="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:cursor-not-allowed dark:disabled:bg-gray-800 transition-all"
          style={{
            'min-height': '44px',
            'max-height': `${props.maxHeight || 200}px`,
            height: textareaHeight(),
            'overflow-y': 'auto'
          }}
        />

        {/* 发送按钮 */}
        <div class="absolute right-2 bottom-2">
          <Button
            onClick={handleSubmit}
            disabled={isButtonDisabled()}
            aria-label="发送消息"
            variant="primary"
            size="sm"
          >
            <Show when={props.loading} fallback={<span>发送</span>}>
              <span data-testid="loading-indicator" class="flex items-center gap-1">
                <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                发送中
              </span>
            </Show>
          </Button>
        </div>
      </div>

      {/* 字符计数 */}
      <Show when={props.maxLength}>
        <div class="text-right text-sm text-gray-500 dark:text-gray-400">
          {charCount()}/{maxLength()}
        </div>
      </Show>
    </div>
  )
}
