/**
 * 全局样式配置
 *
 * TailwindCSS 主题扩展和自定义样式
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // 支持手动切换暗色模式
  theme: {
    extend: {
      // 颜色系统扩展
      colors: {
        // 品牌颜色
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // 消息气泡颜色
        message: {
          user: '#3b82f6', // 蓝色
          assistant: '#f3f4f6', // 灰色
          system: '#fef3c7', // 黄色
        },
        // 暗色模式颜色
        dark: {
          bg: '#111827',
          surface: '#1f2937',
          border: '#374151',
          text: '#f9fafb',
          textSecondary: '#d1d5db',
        },
      },

      // 断点扩展
      screens: {
        'xs': '475px', // 超小屏手机
        'sm': '640px', // 小屏手机
        'md': '768px', // 平板
        'lg': '1024px', // 桌面
        'xl': '1280px', // 大屏桌面
        '2xl': '1536px', // 超大屏
      },

      // 间距扩展
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },

      // 字体扩展
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'Fira Code',
          'Monaco',
          'Courier New',
          'monospace',
        ],
      },

      // 字体大小扩展
      fontSize: {
        'xxs': ['0.625rem', { lineHeight: '0.75rem' }],
      },

      // 阴影扩展
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'glow': '0 0 20px rgba(59, 130, 246, 0.5)',
      },

      // 动画扩展
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounceSubtle 1s infinite',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(-2%)' },
          '50%': { transform: 'translateY(0)' },
        },
      },

      // 过渡扩展
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },

      // Z-index 层级
      zIndex: {
        'dropdown': 1000,
        'sticky': 1020,
        'fixed': 1030,
        'modal-backdrop': 1040,
        'modal': 1050,
        'popover': 1060,
        'tooltip': 1070,
      },
    },
  },
  plugins: [
    // 如果需要其他插件可以在这里添加
    // require('@tailwindcss/forms'),
    // require('@tailwindcss/typography'),
  ],
}
