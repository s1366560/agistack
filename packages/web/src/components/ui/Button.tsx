/**
 * Button 组件
 *
 * 可重用的按钮组件
 */

import { children, Show, splitProps } from 'solid-js'

interface ButtonProps {
  /** 按钮内容 */
  children: any
  /** 点击事件 */
  onClick?: () => void
  /** 禁用状态 */
  disabled?: boolean
  /** ARIA 标签 */
  ariaLabel?: string
  /** 按钮变体 */
  variant?: 'primary' | 'secondary' | 'danger'
  /** 按钮大小 */
  size?: 'sm' | 'md' | 'lg'
  /** 按钮类型 */
  type?: 'button' | 'submit' | 'reset'
  /** 额外的CSS类 */
  class?: string
}

export function Button(props: ButtonProps) {
  const [local, others] = splitProps(props, [
    'children',
    'onClick',
    'disabled',
    'ariaLabel',
    'variant',
    'size',
    'type',
    'class'
  ])

  const variantClasses = () => {
    switch (local.variant) {
      case 'primary':
        return 'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-500'
      case 'secondary':
        return 'bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white'
      case 'danger':
        return 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500'
      default:
        return 'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-500'
    }
  }

  const sizeClasses = () => {
    switch (local.size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm'
      case 'md':
        return 'px-4 py-2 text-base'
      case 'lg':
        return 'px-6 py-3 text-lg'
      default:
        return 'px-4 py-2 text-base'
    }
  }

  return (
    <button
      type={local.type || 'button'}
      onClick={local.onClick}
      disabled={local.disabled}
      aria-label={local.ariaLabel}
      class={`rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${variantClasses()} ${sizeClasses()} ${local.class || ''}`}
      {...others}
    >
      {local.children}
    </button>
  )
}
