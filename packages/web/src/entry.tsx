/**
 * 应用入口
 */

// 引入全局样式
import './styles/globals.css'

import { render } from 'solid-js/web'
import App from './app'

const root = document.getElementById('root')

if (root) {
  render(() => <App />, root)
} else {
  console.error('Root element not found')
}
