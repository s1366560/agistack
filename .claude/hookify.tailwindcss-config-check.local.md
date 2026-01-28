---
name: tailwindcss-config-check
enabled: true
event: file
pattern: (postcss\.(config\.(js|ts|cjs|mjs)|rc|tailwind\.(config\.(js|ts|cjs|mjs)|rc))
action: block
conditions:
  - field: file_path
    operator: regex_match
    pattern: (postcss|tailwindcss).*\.(js|ts|cjs|mjs)
  - field: new_text
    operator: contains
    pattern: tailwindcss
---

# ⚠️ **TailwindCSS 配置检查**

您正在修改PostCSS或TailwindCSS配置文件。根据项目历史,这可能引入版本不兼容问题。

## 检查清单:

### 1. **验证TailwindCSS版本**
   查看 `package.json` 中的TailwindCSS版本:
   - v3.x: 使用 `tailwindcss: {}` 格式
   - v4.x: 使用 `@tailwindcss/postcss` 格式

### 2. **PostCSS配置格式**
   **TailwindCSS v3:**
   ```javascript
   module.exports = {
     plugins: {
       tailwindcss: {},
       autoprefixer: {},
     }
   }
   ```

   **TailwindCSS v4:**
   ```javascript
   module.exports = {
     plugins: {
       '@tailwindcss/postcss': {},
       autoprefixer: {},
     }
   }
   ```

### 3. **CSS导入语法**
   **TailwindCSS v3 (globals.css):**
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

   **TailwindCSS v4 (globals.css):**
   ```css
   @import "tailwindcss";
   @theme {
     /* 自定义主题 */
   }
   ```

## 相关提交记录:
- Commit: `d54ef67` - 修复TailwindCSS v4配置
- Commit: `0e14365` - 修复PostCSS插件格式

## 建议:
- 确认配置版本与 package.json 中的版本一致
- 参考官方文档: https://tailwindcss.com/docs/installation/using-postcss
- 如果更新配置,需要同时更新相关CSS文件

**按"继续"以继续,或"取消"以阻止此操作。**
