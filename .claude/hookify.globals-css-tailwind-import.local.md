---
name: globals-css-tailwind-import
enabled: true
event: file
pattern: (.*styles/globals?\.css|.*styles/globals?\.scss|src/globals\.css)
action: block
conditions:
  - field: new_text
    operator: contains
    pattern: (@tailwind|@import.*tailwindcss)
---

# ⚠️ **TailwindCSS样式导入检查**

您正在修改`globals.css`文件,添加或修改TailwindCSS指令。根据项目使用的TailwindCSS v4版本,需要使用正确的语法。

## TailwindCSS v4 正确语法:

```css
@import "tailwindcss";

@theme {
  /* 在这里添加自定义主题变量 */
  --primary-color: #3b82f6;
  /* ... */
}
```

## ❌ 错误的v3语法(不应该再使用):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## 版本兼容性检查:

### 如果使用 TailwindCSS v3:
- CSS: `@tailwind` 指令
- PostCSS: `tailwindcss: {}` 插件
- package.json: `tailwindcss: ^3.x`

### 如果使用 TailwindCSS v4 (当前项目):
- CSS: `@import "tailwindcss";` 语句
- PostCSS: `@tailwindcss/postcss: {}` 插件
- package.json: `tailwindcss: ^4.x`

## 检查清单:

1. **验证package.json版本**
   ```bash
   grep "tailwindcss" package.json
   ```

2. **检查PostCSS配置**
   ```bash
   cat postcss.config.js
   ```

3. **确认globals.css使用正确语法**

## 常见错误:

### 错误1: 使用旧版@tailwind指令
- **问题**: "unknown utility class"构建错误
- **解决**: 改用 `@import "tailwindcss";`

### 错误2: 混合使用v3和v4语法
- **问题**: 样式未生效或冲突
- **解决**: 统一使用v4语法

## 相关提交记录:
- Commit: `d54ef67` - TailwindCSS v4迁移

## 建议:
- 先确认TailwindCSS版本再编写CSS
- 参考官方迁移指南: https://tailwindcss.com/docs/upgrade-guide
- 测试构建以确保样式正确应用

**按"继续"以继续,或"取消"以阻止此操作。**
