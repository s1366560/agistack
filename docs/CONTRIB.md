# Contributing to Agistack

感谢您对 Agistack 的贡献兴趣!本文档将帮助您开始开发。

## 目录

- [开发环境设置](#开发环境设置)
- [项目结构](#项目结构)
- [开发工作流](#开发工作流)
- [可用脚本](#可用脚本)
- [测试指南](#测试指南)
- [代码规范](#代码规范)
- [提交规范](#提交规范)

---

## 开发环境设置

### 前置要求

- **Node.js**: v18+ (推荐使用 [Bun](https://bun.sh))
- **pnpm**: v8+ (包管理器)
- **Docker**: 用于运行 PostgreSQL 和 Redis
- **Git**: 版本控制

### 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/your-org/agistack.git
   cd agistack
   ```

2. **安装依赖**
   ```bash
   pnpm install
   ```

3. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件,填入必要的配置
   ```

4. **启动数据库服务**
   ```bash
   docker-compose up -d postgres redis pgadmin
   ```

5. **运行数据库迁移**
   ```bash
   cd packages/api
   bun run db:migrate
   bun run db:seed
   ```

6. **启动开发服务器**
   ```bash
   # 启动 API (端口 3001)
   cd packages/api
   bun run dev

   # 启动 Web (端口 3000)
   cd packages/web
   npm run dev
   ```

7. **访问应用**
   - Web 应用: http://localhost:3000
   - API: http://localhost:3001
   - pgAdmin: http://localhost:5051

---

## 项目结构

```
agistack/
├── packages/
│   ├── api/              # 后端 API (Hono + Bun)
│   │   ├── src/
│   │   │   ├── db/       # 数据库 Schema 和迁移
│   │   │   ├── routes/   # API 路由
│   │   │   ├── services/ # 业务逻辑
│   │   │   ├── tools/    # AI 工具系统
│   │   │   └── index.ts  # 入口文件
│   │   └── package.json
│   │
│   ├── web/              # 前端应用 (SolidJS + Vite)
│   │   ├── src/
│   │   │   ├── routes/   # 页面路由
│   │   │   ├── components/ # UI 组件
│   │   │   ├── hooks/    # 自定义 Hooks
│   │   │   ├── contexts/ # Context Providers
│   │   │   ├── services/ # API 客户端
│   │   │   └── entry.tsx # 应用入口
│   │   └── package.json
│   │
│   └── shared/           # 共享类型和工具
│       └── package.json
│
├── docker/               # Docker 配置
│   ├── postgres/
│   ├── redis/
│   └── pgadmin/
│
├── docs/                 # 项目文档
├── docker-compose.yml    # Docker 编排
├── turbo.json           # Turborepo 配置
└── package.json         # 根 package.json
```

---

## 开发工作流

### 1. 创建功能分支

```bash
git checkout -b feat/your-feature-name
# 或
git checkout -b fix/your-bug-fix
```

### 2. 开发功能

遵循 **TDD (测试驱动开发)** 方法:

1. **编写测试** (RED)
   ```bash
   # 创建测试文件
   touch src/features/my-feature.test.ts

   # 运行测试(应该失败)
   npm test -- my-feature
   ```

2. **实现功能** (GREEN)
   ```bash
   # 编写最小代码使测试通过
   # 运行测试(应该通过)
   npm test -- my-feature
   ```

3. **重构代码** (REFACTOR)
   ```bash
   # 改进代码质量
   # 保持测试通过
   npm test -- my-feature
   ```

### 3. 类型检查

```bash
# API 包
cd packages/api
bun run typecheck

# Web 包
cd packages/web
npm run typecheck
```

### 4. 运行所有测试

```bash
# 单元测试
npm test

# 集成测试
npm run test:integration

# E2E 测试
npm run test:e2e

# 所有测试
npm run test:all
```

### 5. 提交代码

使用 **Conventional Commits** 规范:

```bash
git add .
git commit -m "feat: add user authentication"
# 或
git commit -m "fix: resolve session timeout issue"
```

**提交类型**:
- `feat`: 新功能
- `fix`: Bug 修复
- `refactor`: 代码重构
- `docs`: 文档更新
- `test`: 测试相关
- `chore`: 构建/工具更新

### 6. 推送并创建 PR

```bash
git push origin feat/your-feature-name
# 在 GitHub 上创建 Pull Request
```

---

## 可用脚本

### API 包 (`packages/api/`)

| 命令 | 说明 |
|------|------|
| `bun run dev` | 启动开发服务器 (热重载) |
| `bun run build` | 构建生产版本 |
| `bun run start` | 运行生产版本 |
| `bun run typecheck` | TypeScript 类型检查 |
| `bun run test` | 运行所有测试 |
| `bun run test:unit` | 运行单元测试 |
| `bun run test:integration` | 运行集成测试 |
| `bun run test:watch` | 监听模式运行测试 |
| `bun run test:coverage` | 生成测试覆盖率报告 |
| `bun run db:generate` | 生成数据库迁移文件 |
| `bun run db:migrate` | 运行数据库迁移 |
| `bun run db:rollback` | 回滚最后一个迁移 |
| `bun run db:seed` | 填充测试数据 |
| `bun run db:studio` | 打开 Drizzle Studio (数据库 GUI) |

### Web 包 (`packages/web/`)

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 (Vite) |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览生产构建 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run test` | 运行所有测试 |
| `npm run test:unit` | 运行单元测试 |
| `npm run test:integration` | 运行集成测试 |
| `npm run test:watch` | 监听模式运行测试 |
| `npm run test:coverage` | 生成测试覆盖率报告 |
| `npm run test:e2e` | 运行 E2E 测试 (Playwright) |
| `npm run test:e2e:ui` | 运行 E2E 测试 (带 UI) |
| `npm run test:all` | 运行所有测试 |

### 根项目

| 命令 | 说明 |
|------|------|
| `pnpm install` | 安装所有依赖 |
| `bun dev` | 启动所有包的开发服务器 |
| `bun run build` | 构建所有包 |
| `bun run test` | 运行所有包的测试 |
| `bun run typecheck` | 检查所有包的类型 |

---

## 测试指南

### 测试策略

Agistack 遵循 **测试金字塔** 原则:

```
        /\
       /E2E\        10% - 关键用户流程
      /------\
     /  集成  \      30% - API 和数据库
    /----------\
   /    单元    \    60% - 组件和函数
  /--------------\
```

### 测试覆盖率要求

- **最低覆盖率**: 80%
- **推荐覆盖率**: 90%+
- **关键路径**: 100%

### 运行测试

```bash
# 单个包的单元测试
cd packages/api
bun run test:unit

# 监听模式 (开发时使用)
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 运行特定测试文件
npm test -- Message.test.tsx

# 调试测试
npm test -- --inspect-brk
```

### 测试文件组织

```
src/
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx        # 单元测试 (co-located)
├── services/
│   └── api/
│       ├── chat-api.ts
│       └── chat-api.test.ts   # 单元测试 (co-located)
└── __tests__/
    ├── unit/                  # 额外单元测试
    ├── integration/           # 集成测试
    └── e2e/                   # E2E 测试
```

### 编写测试的最佳实践

1. **遵循 AAA 模式** (Arrange-Act-Assert)
   ```typescript
   it('should send message successfully', async () => {
     // Arrange: 准备测试数据
     const mockMessage = { content: 'Hello' };

     // Act: 执行操作
     const result = await sendMessage(mockMessage);

     // Assert: 验证结果
     expect(result.success).toBe(true);
   });
   ```

2. **测试用户可见行为,而非实现细节**
   ```typescript
   // ❌ 错误: 测试内部状态
   expect(component.state.isLoading).toBe(true);

   // ✅ 正确: 测试可见输出
   expect(screen.getByText('Loading...')).toBeInTheDocument();
   ```

3. **使用描述性的测试名称**
   ```typescript
   // ✅ 好: 描述清晰
   it('should display error message when network request fails', () => {});

   // ❌ 差: 含糊不清
   it('should work', () => {});
   ```

4. **保持测试独立**
   - 每个测试应该独立运行
   - 不要依赖测试执行顺序
   - 在 `beforeEach` 中清理状态

---

## 代码规范

### TypeScript

- 使用严格的 TypeScript 配置
- 所有函数必须有参数和返回值类型
- 避免使用 `any`, 使用 `unknown` 代替

### SolidJS

- 使用 `createSignal` 而非 `let` 变量
- 使用 `createMemo` 缓存计算结果
- 组件文件使用 `.tsx` 扩展名

### 命名规范

- **组件**: PascalCase (例: `MessageList.tsx`)
- **函数**: camelCase (例: `sendMessage()`)
- **常量**: UPPER_SNAKE_CASE (例: `API_URL`)
- **文件**: kebab-case (例: `chat-api.ts`)
- **测试**: 同源文件名 + `.test.ts` (例: `chat-api.test.ts`)

### 文件组织

- **小文件优于大文件**: 200-400 行典型,最多 800 行
- **高内聚低耦合**: 按功能组织,而非按类型
- **单一职责**: 每个文件只做一件事

### 代码风格

- 使用 **Prettier** 格式化
- 使用 **ESLint** 检查
- 最大行宽: 100 字符
- 使用 2 空格缩进
- 使用单引号 (JS/TS)

---

## 环境变量

### 必需变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://user:pass@localhost:5433/agistack` |
| `REDIS_URL` | Redis 连接字符串 | `redis://:password@localhost:6380` |
| `JWT_SECRET` | JWT 签名密钥 | `your-super-secret-key` |
| `NODE_ENV` | 运行环境 | `development` / `production` |

### 可选变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `API_PORT` | API 服务器端口 | `3001` |
| `WEB_PORT` | Web 应用端口 | `3000` |
| `LOG_LEVEL` | 日志级别 | `debug` |
| `CORS_ORIGIN` | CORS 允许的源 | `http://localhost:3000` |

### AI Provider API Keys (可选)

| 变量 | Provider |
|------|----------|
| `ANTHROPIC_API_KEY` | Anthropic (Claude) |
| `OPENAI_API_KEY` | OpenAI (GPT) |
| `GOOGLE_API_KEY` | Google (Gemini) |

**注意**: 不要在代码中硬编码 API Keys! 使用 `.env` 文件。

---

## 常见问题

### 问题: 数据库连接失败

**解决方案**:
```bash
# 检查 Docker 容器是否运行
docker ps | grep postgres

# 重启数据库
docker-compose restart postgres

# 检查环境变量
cat .env | grep DATABASE_URL
```

### 问题: 测试超时

**解决方案**:
```bash
# 增加测试超时时间
npm test -- --test-timeout=30000

# 或在配置文件中修改
# vitest.config.ts: testTimeout: 30000
```

### 问题: 端口已被占用

**解决方案**:
```bash
# 查找占用端口的进程
lsof -i :3000
lsof -i :3001

# 杀死进程
kill -9 <PID>

# 或更改端口
# 在 .env 中设置: API_PORT=3002
```

---

## 获取帮助

- **文档**: 查看 `docs/` 目录
- **Issues**: 在 GitHub 上提交 Issue
- **Discussions**: 加入 GitHub Discussions
- **Code Review**: 提交 Pull Request

---

感谢您对 Agistack 的贡献! 🎉
