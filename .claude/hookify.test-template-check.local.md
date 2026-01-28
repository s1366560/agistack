---
name: test-template-check
enabled: true
event: file
pattern: (example\.spec\.(ts|js|tsx|jsx)|agent\.spec\.(ts|js|tsx|jsx)|template\.spec\.(ts|js|tsx|jsx)|demo\.spec\.(ts|js|tsx|jsx))
action: block
---

# ⚠️ **测试模板文件检查**

您正在创建模板或示例测试文件。根据项目约定,应该创建实际的测试用例而不是模板文件。

## 正确的测试文件命名:

### ✅ 推荐的命名方式:
- `chat.spec.ts` - 聊天功能测试
- `auth.spec.ts` - 认证功能测试
- `projects.spec.ts` - 项目管理测试
- `session.spec.ts` - 会话管理测试
- `workspace.spec.ts` - 工作空间测试

### ❌ 避免使用的命名:
- `example.spec.ts` - 示例测试(过于通用)
- `agent.spec.ts` - 代理测试(不够具体)
- `template.spec.ts` - 模板测试(应该用实际功能名)
- `demo.spec.ts` - 演示测试(不是测试用例)
- `test.spec.ts` - 测试的测试(冗余)

## 测试文件组织原则:

### 1. **命名应该描述被测试的功能**
   - 测试用户认证 → `auth.spec.ts`
   - 测试聊天功能 → `chat.spec.ts`
   - 测试项目管理 → `projects.spec.ts`

### 2. **每个测试文件应该有明确的测试范围**
   - 包含相关的测试用例
   - 测试单一功能或模块
   - 使用 `describe` 块组织相关测试

### 3. **避免创建"占位符"测试文件**
   - 不要创建空的或只有示例代码的测试文件
   - 不要创建"待填充"的模板
   - 应该直接编写实际的测试用例

## 测试文件模板:

如果您需要参考测试文件的结构,以下是标准模式:

```typescript
import { test, expect } from '@playwright/test'

test.describe('功能名称测试', () => {
  test.beforeEach(async ({ page }) => {
    // 每个测试前的准备
  })

  test('应该能够完成某个操作', async ({ page }) => {
    // 测试步骤
  })

  test('应该正确处理错误情况', async ({ page }) => {
    // 错误处理测试
  })
})
```

## 相关提交记录:
- Commit: `0e14365` - 移除冗余测试文件 `agent.spec.ts`, `example.spec.ts`, `fixtures.ts`
- Reason: 这些文件没有实际的测试价值,应该直接创建具体的测试用例

## 建议:
- 在创建测试文件前,先确定要测试的具体功能
- 使用描述性的文件名,避免通用名称
- 直接编写实际的测试用例,不要创建模板
- 参考 `e2e/chat.spec.ts` 和 `e2e/session-management.spec.ts` 作为示例

## 检查清单:
- [ ] 文件名描述了被测试的功能
- [ ] 不是示例/模板/演示文件
- [ ] 包含实际的测试用例(不是TODO或占位符)
- [ ] 遵循项目的测试文件结构

**按"继续"以继续,或"取消"以阻止此操作。**
