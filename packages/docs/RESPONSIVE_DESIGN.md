# 响应式设计文档

## 概述

本项目采用 TailwindCSS 实现完整的响应式设计,支持从超小屏手机到超大屏桌面的所有设备。

## 断点系统

### 自定义断点

```javascript
screens: {
  'xs': '475px',   // 超小屏手机 (iPhone SE, etc.)
  'sm': '640px',   // 小屏手机
  'md': '768px',   // 平板 (iPad, etc.)
  'lg': '1024px',  // 桌面
  'xl': '1280px',  // 大屏桌面
  '2xl': '1536px', // 超大屏
}
```

### 使用示例

```tsx
<!-- 响应式间距 -->
<div class="p-2 sm:p-4 md:p-6 lg:p-8">
  内容
</div>

<!-- 响应式字体 -->
<h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
  标题
</h1>

<!-- 响应式布局 -->
<div class="
  grid
  grid-cols-1
  sm:grid-cols-2
  md:grid-cols-3
  lg:grid-cols-4
">
  卡片
</div>
```

## 聊天组件响应式设计

### Message 组件

**移动端 (< 640px):**
- 消息气泡: `max-w-[85%]`
- 字体大小: `text-sm`
- 内边距: `p-3`

**平板 (640px - 1024px):**
- 消息气泡: `max-w-[75%]`
- 字体大小: `text-base`
- 内边距: `p-4`

**桌面端 (> 1024px):**
- 消息气泡: `max-w-[70%]`
- 字体大小: `text-base`
- 内边距: `p-4`

```tsx
<Message
  message={message}
  class="max-w-[85%] sm:max-w-[75%] lg:max-w-[70%]"
/>
```

### MessageList 组件

**移动端:**
- 全宽布局: `w-full`
- 内边距: `p-2`
- 无最大宽度限制

**桌面端:**
- 限制最大宽度: `max-w-4xl`
- 内边距: `p-4`
- 居中显示: `mx-auto`

```tsx
<MessageList
  messages={messages}
  class="w-full sm:max-w-3xl md:max-w-4xl mx-auto p-2 sm:p-4"
/>
```

### PromptInput 组件

**移动端:**
- 全宽输入: `w-full`
- 发送按钮: `p-3` (更大的触摸目标)
- 字符计数: `hidden` (节省空间)

**桌面端:**
- 限制最大宽度: `max-w-4xl`
- 发送按钮: `p-2`
- 字符计数: 显示

```tsx
<PromptInput
  onSend={handleSend}
  class="w-full max-w-4xl"
/>
```

## 暗色模式

### 启用暗色模式

使用 `darkMode: 'class'` 策略,通过在 `html` 元素上添加 `dark` 类来启用:

```javascript
// 启用
document.documentElement.classList.add('dark')

// 禁用
document.documentElement.classList.remove('dark')
```

### 暗色模式样式

```tsx
<div class="
  bg-white dark:bg-gray-900
  text-gray-900 dark:text-gray-100
  border-gray-200 dark:border-gray-700
">
  内容
</div>
```

### 颜色系统

**亮色模式:**
- 背景: `bg-white`
- 表面: `bg-gray-50`
- 边框: `border-gray-200`
- 文本: `text-gray-900`

**暗色模式:**
- 背景: `bg-dark-bg` (#111827)
- 表面: `bg-dark-surface` (#1f2937)
- 边框: `border-dark-border` (#374151)
- 文本: `text-dark-text` (#f9fafb)

## 动画和过渡

### 内置动画

```tsx
<!-- 淡入 -->
<div class="animate-fade-in">内容</div>

<!-- 滑入 -->
<div class="animate-slide-in">内容</div>

<!-- 慢速脉冲 -->
<div class="animate-pulse-slow">加载中...</div>

<!-- 微妙弹跳 -->
<div class="animate-bounce-subtle">提示</div>
```

### 过渡效果

```tsx
<button class="
  transition-all duration-200
  hover:scale-105 active:scale-95
">
  按钮
</button>
```

## 无障碍功能

### ARIA 标签

```tsx
<button
  aria-label="发送消息"
  aria-describedby="send-help"
>
  发送
</button>
<span id="send-help" class="sr-only">
  按 Enter 发送消息
</span>
```

### 键盘导航

```tsx
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick()
    }
  }}
>
  可聚焦元素
</div>
```

### 焦点样式

```css
*:focus-visible {
  @apply outline-none ring-2 ring-primary-500 ring-offset-2;
}
```

## 性能优化

### 减少动画(用户偏好)

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 图片优化

```tsx
<img
  src="image.jpg"
  loading="lazy"
  class="w-full h-auto"
  alt="描述"
/>
```

## 自定义工具类

### 响应式容器

```tsx
<div class="container-responsive">
  <!-- 自动添加水平内边距和最大宽度 -->
  内容
</div>
```

### 响应式文本

```tsx
<h2 class="text-responsive">响应式文本大小</h2>
```

### 响应式间距

```tsx
<div class="p-responsive gap-responsive">
  <!-- 内边距和间距自动适应屏幕 -->
  内容
</div>
```

### 玻璃态效果

```tsx
<div class="glass">
  <!-- 半透明背景 + 背景模糊 -->
  内容
</div>
```

## 最佳实践

1. **移动优先**: 从移动端开始设计,逐步增强到桌面端
2. **触摸友好**: 移动端按钮至少 44x44px
3. **性能优先**: 避免大图片和复杂动画
4. **可访问性**: 确保键盘导航和屏幕阅读器支持
5. **测试**: 在真实设备上测试所有断点

## 调试响应式设计

### Chrome DevTools

1. 打开 DevTools (F12)
2. 点击设备工具栏图标 (Ctrl+Shift+M)
3. 选择设备预设或自定义尺寸

### 响应式测试清单

- [ ] iPhone SE (375x667)
- [ ] iPhone 12 Pro (390x844)
- [ ] iPad (768x1024)
- [ ] iPad Pro (1024x1366)
- [ ] 桌面 (1920x1080)
- [ ] 4K 显示器 (2560x1440)
