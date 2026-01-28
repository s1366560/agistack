---
name: e2e-test-directory-structure
enabled: true
event: file
pattern: (__tests__/e2e/.*\.spec\.(ts|js|tsx|jsx)|^e2e/.*(example|agent|template|demo)\.spec\.(ts|js|tsx|jsx))
action: block
---

# ⚠️ **E2E测试目录结构检查**

您正在创建E2E测试文件。根据项目约定,E2E测试应该放在项目根目录的`e2e/`目录,而不是`__tests__/e2e/`目录。

## 正确的目录结构:

```
agistack/
├── packages/
│   └── web/
│       └── e2e/              ✅ E2E测试文件在这里
│           ├── chat.spec.ts
│           └── session-management.spec.ts
└── packages/
    └── api/
        └── __tests__/     ⚠️ 单元/集成测试在这里
            └── integration/
```

## 原则:

### 1. **E2E测试位置**
   - ✅ 正确: `packages/web/e2e/chat.spec.ts`
   - ❌ 错误: `packages/web/__tests__/e2e/chat.spec.ts`

### 2. **模板文件命名**
   - ❌ 避免: `example.spec.ts`, `agent.spec.ts`, `template.spec.ts`
   - ✅ 使用: `chat.spec.ts`, `auth.spec.ts`, `projects.spec.ts`

### 3. **文件用途**
   - `__tests__/integration/` - 集成测试
   - `__tests__/unit/` - 单元测试
   - `e2e/` - 端到端测试(在包根目录)

## 相关提交记录:
- Commit: `0e14365` - E2E测试目录结构重组
- 移除冗余测试文件: `agent.spec.ts`, `example.spec.ts`, `fixtures.ts`

## 建议:
- 如果要创建新的E2E测试,直接在 `packages/web/e2e/` 目录创建
- 如果要创建单元或集成测试,使用 `__tests__/` 目录
- 不要创建模板或示例测试文件,应创建实际的测试用例

**按"继续"以继续,或"取消"以阻止此操作。**
