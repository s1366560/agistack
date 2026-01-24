/**
 * 暗色模式切换组件
 *
 * 提供暗色模式开关功能
 */

import { createSignal, onMount, Show } from 'solid-js'

interface DarkModeToggleProps {
  /** 是否显示标签 */
  showLabel?: boolean
  /** 切换回调 */
  onToggle?: (isDark: boolean) => void
}

export function DarkModeToggle(props: DarkModeToggleProps = {}) {
  const [isDark, setIsDark] = createSignal(false)

  // 初始化:从 localStorage 或系统偏好读取
  onMount(() => {
    const stored = localStorage.getItem('darkMode')
    if (stored !== null) {
      const isDarkMode = stored === 'true'
      setIsDark(isDarkMode)
      applyDarkMode(isDarkMode)
    } else {
      // 检测系统偏好
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDark(prefersDark)
      applyDarkMode(prefersDark)
    }
  })

  // 应用暗色模式
  const applyDarkMode = (dark: boolean) => {
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // 切换暗色模式
  const toggleDarkMode = () => {
    const newValue = !isDark()
    setIsDark(newValue)
    applyDarkMode(newValue)
    localStorage.setItem('darkMode', String(newValue))
    props.onToggle?.(newValue)
  }

  return (
    <button
      onClick={toggleDarkMode}
      aria-label={isDark() ? '切换到亮色模式' : '切换到暗色模式'}
      class={`
        inline-flex items-center justify-center
        p-2 rounded-lg
        transition-all duration-200
        hover:bg-gray-100 dark:hover:bg-gray-800
        focus:outline-none focus:ring-2 focus:ring-primary-500
        ${props.showLabel ? 'gap-2 px-3' : ''}
      `}
      data-testid="dark-mode-toggle"
    >
      {/* 太阳图标 (亮色模式) */}
      <Show when={!isDark()}>
        <svg
          class="w-5 h-5 text-yellow-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      </Show>

      {/* 月亮图标 (暗色模式) */}
      <Show when={isDark()}>
        <svg
          class="w-5 h-5 text-primary-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      </Show>

      {/* 标签 */}
      <Show when={props.showLabel}>
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
          {isDark() ? '暗色模式' : '亮色模式'}
        </span>
      </Show>
    </button>
  )
}
