# OpenCode Web 应用开发计划与架构设计（本地部署版）

> 基于 vendor/opencode 代码库分析，从零开始构建可本地部署的 Web 应用版本

---

## 目录

1. [项目概述](#项目概述)
2. [技术栈选型（本地部署版）](#技术栈选型本地部署版)
3. [架构设计（本地部署）](#架构设计本地部署)
4. [数据模型设计](#数据模型设计)
5. [API 设计](#api-设计)
6. [前端架构](#前端架构)
7. [本地部署方案](#本地部署方案)
8. [开发路线图](#开发路线图)
9. [关键实现细节](#关键实现细节)
10. [测试策略](#测试策略)

---

## 1. 项目概述

### 1.1 目标

构建一个**完全可本地部署**的基于 Web 的 AI 编程助手应用，提供类似 OpenCode 的核心功能：

- **多 AI 提供商支持**：Anthropic、OpenAI、Google、Groq 等
- **多 Agent 系统**：构建、规划、通用 Agent
- **代码操作**：文件读写、编辑、搜索、导航
- **会话管理**：多会话、历史记录、分享
- **LSP 集成**：代码智能提示
- **MCP 支持**：扩展插件系统
- **终端集成**：命令执行
- **实时同步**：WebSocket 支持

### 1.2 本地部署特性

✅ **无云依赖**：所有组件可在本地运行
✅ **自包含**：单一可执行文件或 Docker 镜像
✅ **数据隐私**：所有数据存储在本地
✅ **离线可用**：支持离线模式（本地 LLM）
✅ **易于部署**：一行命令启动

### 1.3 核心特性

| 特性 | 描述 | 优先级 |
|------|------|--------|
| 多模型支持 | 支持多家 AI 提供商 | P0 |
| 文件操作 | 读取、编辑、搜索代码 | P0 |
| 会话管理 | 多会话、历史记录 | P0 |
| 本地存储 | SQLite/PostgreSQL 本地数据库 | P0 |
| WebSocket 通信 | 实时消息推送 | P0 |
| 权限系统 | 细粒度访问控制 | P1 |
| LSP 集成 | 代码智能 | P1 |
| 终端集成 | 命令执行 | P2 |
| MCP 支持 | 插件系统 | P2 |

---

## 2. 技术栈选型（本地部署版）

### 2.1 前端技术栈

#### 核心框架
- **SolidJS 1.9+** - 响应式 UI 框架
  - 原因：高性能、细粒度响应式、类似 React 语法
  - OpenCode 已验证，生产可用

- **Vite 7+** - 构建工具
  - 快速热更新
  - 优秀的开发体验

#### UI 组件
- **TailwindCSS 4+** - 样式框架
- **@kobalte/core** - 无障碍 UI 原语
- **自定义组件库** - 复用 OpenCode 设计

#### 状态管理
- **SolidJS Context** - 全局状态
- **CreateSignal** - 局部状态
- **SolidStore** - 复杂状态管理

#### 路由
- **@solidjs/router** - 文件路由
- **@solidjs/start** - SSR 框架

### 2.2 后端技术栈（本地部署）

#### 运行时
- **Bun 1.3+** - JavaScript 运行时
  - 原因：极速、原生 TypeScript、内置包管理器
  - 可打包为单一可执行文件

#### Web 框架
- **Hono 4+** - 轻量级 Web 框架
  - 支持 Bun 原生运行
  - 类似 Express API，易于上手
  - 内置 WebSocket 支持

#### HTTP 服务器
- **Bun.serve** - 内置 HTTP 服务器
  - 无需 Nginx/Apache
  - 极高性能
  - 自动 HTTPS（可选）

#### AI 集成
- **Vercel AI SDK 5+** - LLM 抽象层
  - 支持多家提供商
  - 流式响应
  - 工具调用
- **Ollama SDK** - 本地 LLM 支持
  - 支持 Llama、Mistral 等本地模型

#### 数据库
- **SQLite 3**（默认）- 轻量级本地数据库
  - 零配置
  - 单文件存储
  - 适合个人/小团队
- **PostgreSQL 15+**（可选）- 生产级数据库
  - 适合大型部署
  - 更强大的并发能力
  - 可使用 Docker 部署

#### ORM
- **Drizzle ORM** - 类型安全 ORM
  - 支持 SQLite 和 PostgreSQL
  - 零迁移文件
  - 优秀的 TypeScript 支持

#### 缓存
- **Redis 7+**（可选）- 内存缓存
  - 用于会话存储
  - 用于限流计数
  - 可使用 Docker 部署
- **内存缓存**（默认）- 简单场景

#### 文件存储
- **本地文件系统** - 默认选项
  - 项目文件直接访问
  - 上传文件存储在本地
  - 无需对象存储

#### WebSocket
- **Bun WebSocket** - 内置支持
  - 实时消息推送
  - 文件变更通知
  - 终端输出流

#### 终端
- **node-pty** - PTY 伪终端
  - 完整终端模拟
  - 支持 Shell 命令
  - 跨平台支持

### 2.3 开发工具

#### 语言和工具
- **TypeScript 5.8+** - 类型安全
- **ESLint + Prettier** - 代码质量
- **Bun Test** - 单元测试
- **Playwright** - E2E 测试

#### 打包和分发
- **Bun build** - 打包为单一可执行
- **Docker** - 容器化部署
- **Electron/Tauri**（可选）- 桌面应用

---

## 3. 架构设计（本地部署）

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                         客户端层                              │
├─────────────────────────────────────────────────────────────┤
│  Web 前端 (SolidJS + Vite)                                   │
│  - 文件管理                  │  - 会话管理                    │
│  - 实时同步                  │  - 设置管理                    │
│  - 终端集成                  │  - 代码编辑                    │
└──────────────┬──────────────────────────────────────────────┘
               │
               │ HTTP + WebSocket
               │
┌──────────────▼──────────────────────────────────────────────┐
│                    应用服务器 (Bun + Hono)                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │              HTTP/WebSocket 服务器                    │    │
│  │  - RESTful API 路由                                   │    │
│  │  - WebSocket 连接管理                                │    │
│  │  - 静态文件服务                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌───────────┬───────────┬───────────┬─────────────────┐    │
│  │ 中间件层   │           │           │                 │    │
│  │ - 认证     │ - CORS    │ - 日志    │ - 错误处理      │    │
│  │ - 限流     │ - 验证    │ - 压缩    │ - 安全头        │    │
│  └───────────┴───────────┴───────────┴─────────────────┘    │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│                         服务层                               │
├─────────────────┬─────────────────┬─────────────────────────┤
│  Agent 服务      │  文件服务        │  会话服务                │
│  - LLM 调用      │  - 读写操作      │  - 历史管理              │
│  - 工具执行      │  - 搜索导航      │  - 上下文管理            │
│  - 权限控制      │  - Git 操作      │  - 导入导出              │
├─────────────────┼─────────────────┼─────────────────────────┤
│  LSP 服务        │  MCP 服务        │  终端服务                │
│  - 代码分析      │  - 插件管理      │  - PTY 管理              │
│  - 智能提示      │  - 扩展加载      │  - 命令执行              │
│  - 诊断信息      │  - RPC 调用      │  - 输出流                │
├─────────────────┴─────────────────┴─────────────────────────┤
│  AI 提供商适配器                                               │
│  - Anthropic  - OpenAI  - Google  - Groq  - Ollama           │
└─────────────────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│                         数据层                               │
├─────────────────┬─────────────────┬─────────────────────────┤
│  SQLite/PG       │  文件系统        │  Redis (可选)           │
│  - 用户数据      │  - 项目文件      │  - 会话缓存              │
│  - 会话历史      │  - 上传文件      │  - 限流计数              │
│  - 配置数据      │  - LSP 日志      │  - 实时状态              │
└─────────────────┴─────────────────┴─────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│                       本地服务集成                            │
├─────────────────┬─────────────────┬─────────────────────────┤
│  Git 托推        │  本地 LLM        │  LSP 服务器              │
│  - 本地仓库      │  - Ollama       │  - TypeScript            │
│  - 命令执行      │  - LM Studio    │  - Python                │
│  - 状态查询      │  - LocalAI      │  - Go                    │
└─────────────────┴─────────────────┴─────────────────────────┘
```

### 3.2 单进程架构（推荐）

**适用场景**：个人使用、小团队、快速部署

```
┌─────────────────────────────────────────────────────────┐
│              单一可执行文件 (opencode-server)             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────┐     │
│  │         Bun HTTP/WebSocket Server              │     │
│  │         监听端口: 3000 (HTTP)                   │     │
│  │                 3001 (WebSocket)               │     │
│  └────────────────────────────────────────────────┘     │
│                       │                                  │
│  ┌────────────────────────────────────────────────┐     │
│  │         API 路由 (Hono)                         │     │
│  │  - /api/projects                               │     │
│  │  - /api/sessions                               │     │
│  │  - /api/files                                  │     │
│  │  - /ws (WebSocket)                             │     │
│  └────────────────────────────────────────────────┘     │
│                       │                                  │
│  ┌────────────────────────────────────────────────┐     │
│  │         业务逻辑层                              │     │
│  │  - AgentService                                │     │
│  │  - FileService                                 │     │
│  │  - SessionService                              │     │
│  │  - LSPService                                  │     │
│  │  - TerminalService                             │     │
│  └────────────────────────────────────────────────┘     │
│                       │                                  │
│  ┌────────────────────────────────────────────────┐     │
│  │         数据访问层                              │     │
│  │  - SQLite (./data/opencode.db)                 │     │
│  │  - 文件系统 (./projects/)                      │     │
│  │  - 内存缓存                                     │     │
│  └────────────────────────────────────────────────┘     │
│                                                          │
└─────────────────────────────────────────────────────────┘

启动命令：
  $ opencode-server start

访问地址：
  http://localhost:3000
```

### 3.3 Docker Compose 架构（可选）

**适用场景**：团队协作、生产部署、需要更多功能

```yaml
# docker-compose.yml
version: '3.8'

services:
  # 应用服务器
  app:
    build: .
    ports:
      - "3000:3000"
      - "3001:3001"
    volumes:
      - ./data:/app/data
      - ./projects:/app/projects
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - DATABASE_URL=postgresql://opencode:password@db:5432/opencode
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  # PostgreSQL 数据库
  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=opencode
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=opencode
    ports:
      - "5432:5432"

  # Redis 缓存
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # Ollama 本地 LLM（可选）
  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama
    ports:
      - "11434:11434"

volumes:
  postgres_data:
  ollama_data:
```

### 3.4 前端架构

```
src/
├── main.tsx                 # 应用入口
├── App.tsx                  # 根组件
├── routes/                  # 路由页面
│   ├── index.tsx           # 首页/工作台
│   ├── project/
│   │   ├── [id]/
│   │   │   ├── index.tsx    # 项目概览
│   │   │   ├── session/
│   │   │   │   ├── [id].tsx # 会话详情
│   │   │   │   └── index.tsx # 会话列表
│   │   │   └── settings.tsx # 项目设置
│   │   └── index.tsx        # 项目列表
│   └── settings/
│       ├── index.tsx        # 全局设置
│       ├── agents.tsx       # Agent 配置
│       ├── models.tsx       # 模型配置
│       └── permissions.tsx  # 权限配置
├── components/              # 共享组件
│   ├── layout/
│   │   ├── Sidebar.tsx      # 侧边栏
│   │   ├── Header.tsx       # 顶部栏
│   │   └── Workspace.tsx    # 工作区
│   ├── editor/
│   │   ├── FileTree.tsx     # 文件树
│   │   ├── CodeEditor.tsx   # 代码编辑器
│   │   └── DiffViewer.tsx   # Diff 查看
│   ├── chat/
│   │   ├── MessageList.tsx  # 消息列表
│   │   ├── PromptInput.tsx  # 输入框
│   │   └── Attachment.tsx   # 附件上传
│   ├── terminal/
│   │   └── Terminal.tsx     # 终端组件
│   └── settings/
│       ├── AgentSettings.tsx
│       ├── ModelSettings.tsx
│       └── PermissionSettings.tsx
├── contexts/                # Context Providers
│   ├── AppContext.tsx       # 全局状态
│   ├── ProjectContext.tsx   # 项目状态
│   ├── SessionContext.tsx   # 会话状态
│   └── SyncContext.tsx      # 实时同步
├── services/                # 业务逻辑
│   ├── api/
│   │   ├── client.ts        # API 客户端
│   │   ├── agents.ts        # Agent API
│   │   ├── sessions.ts      # 会话 API
│   │   └── files.ts         # 文件 API
│   ├── sync/
│   │   └── websocket.ts     # WebSocket 客户端
│   └── store/
│       ├── agentStore.ts    # Agent 状态
│       ├── sessionStore.ts  # 会话状态
│       └── fileStore.ts     # 文件状态
├── lib/                     # 工具库
│   ├── ai/
│   │   ├── providers.ts     # AI 提供商
│   │   └── stream.ts        # 流式响应
│   ├── editor/
│   │   ├── lsp.ts           # LSP 客户端
│   │   └── monaco.ts        # Monaco 集成
│   └── utils/
│       ├── diff.ts          # Diff 计算
│       ├── search.ts        # 搜索功能
│       └── format.ts        # 代码格式化
└── types/                   # 类型定义
    ├── agent.ts
    ├── session.ts
    ├── file.ts
    └── config.ts
```

### 3.5 后端架构

```
src/
├── server.ts                # 服务器入口
├── routes/                  # API 路由
│   ├── agents.ts           # Agent 端点
│   ├── sessions.ts         # 会话端点
│   ├── files.ts            # 文件端点
│   ├── projects.ts         # 项目端点
│   ├── models.ts           # 模型端点
│   ├── providers.ts        # 提供商端点
│   └── index.ts            # 路由聚合
├── services/                # 业务服务
│   ├── AgentService.ts     # Agent 逻辑
│   ├── SessionService.ts   # 会话管理
│   ├── FileService.ts      # 文件操作
│   ├── LSPService.ts       # LSP 集成
│   ├── MCPService.ts       # MCP 插件
│   └── TerminalService.ts  # 终端管理
├── agents/                  # Agent 实现
│   ├── BaseAgent.ts        # 基类
│   ├── BuildAgent.ts       # 构建 Agent
│   ├── PlanAgent.ts        # 规划 Agent
│   └── GeneralAgent.ts     # 通用 Agent
├── tools/                   # 工具实现
│   ├── file-operations.ts  # 文件操作
│   ├── code-search.ts      # 代码搜索
│   ├── terminal.ts         # 终端命令
│   ├── git.ts              # Git 操作
│   └── lsp.ts              # LSP 查询
├── providers/               # AI 提供商
│   ├── anthropic.ts
│   ├── openai.ts
│   ├── google.ts
│   ├── groq.ts
│   ├── ollama.ts           # 本地 LLM
│   └── index.ts
├── middleware/              # 中间件
│   ├── auth.ts             # 认证
│   ├── cors.ts             # CORS
│   ├── rate-limit.ts       # 限流
│   └── logging.ts          # 日志
├── db/                      # 数据库
│   ├── schema.ts           # Drizzle schema
│   ├── migrations/         # 迁移文件
│   └── seed.ts             # 种子数据
├── websocket/               # WebSocket
│   ├── handler.ts          # WS 处理器
│   ├── events.ts           # 事件定义
│   └── broadcast.ts        # 广播逻辑
└── lib/                     # 工具库
    ├── ai.ts               # AI SDK 集成
    ├── crypto.ts           # 加密工具
    └── logger.ts           # 日志工具
```

---

## 4. 数据模型设计

### 4.1 SQLite Schema（默认）

```sql
-- 用户表
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  settings TEXT DEFAULT '{}', -- JSON
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 项目表
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  description TEXT,
  metadata TEXT DEFAULT '{}', -- JSON
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 会话表
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  agent_type TEXT NOT NULL, -- 'build', 'plan', 'general'
  title TEXT,
  messages TEXT DEFAULT '[]', -- JSON array
  context TEXT DEFAULT '{}', -- JSON
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 模型配置表
CREATE TABLE models (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  api_endpoint TEXT,
  config TEXT DEFAULT '{}', -- JSON
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- API 密钥表（加密存储）
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  provider TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 权限规则表
CREATE TABLE permissions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  agent_type TEXT,
  resource_type TEXT NOT NULL, -- 'file', 'directory', 'command'
  pattern TEXT NOT NULL,
  action TEXT NOT NULL, -- 'allow', 'deny', 'ask'
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- LSP 服务器配置表
CREATE TABLE lsp_servers (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  language TEXT NOT NULL,
  command TEXT NOT NULL,
  args TEXT DEFAULT '[]', -- JSON array
  config TEXT DEFAULT '{}', -- JSON
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- MCP 插件表
CREATE TABLE mcp_plugins (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  name TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  config TEXT DEFAULT '{}', -- JSON
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 索引
CREATE INDEX idx_sessions_project ON sessions(project_id);
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_permissions_user ON permissions(user_id);
CREATE INDEX idx_models_user ON models(user_id);
```

### 4.2 Drizzle Schema 定义

```typescript
// src/db/schema.ts

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  settings: text('settings').default('{}'),
  createdAt: integer('created_at').default(sql`strftime('%s', 'now')`),
  updatedAt: integer('updated_at').default(sql`strftime('%s', 'now')`),
});

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  name: text('name').notNull(),
  path: text('path').notNull(),
  description: text('description'),
  metadata: text('metadata').default('{}'),
  createdAt: integer('created_at').default(sql`strftime('%s', 'now')`),
  updatedAt: integer('updated_at').default(sql`strftime('%s', 'now')`),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id),
  agentType: text('agent_type').notNull(),
  title: text('title'),
  messages: text('messages').default('[]'),
  context: text('context').default('{}'),
  createdAt: integer('created_at').default(sql`strftime('%s', 'now')`),
  updatedAt: integer('updated_at').default(sql`strftime('%s', 'now')`),
});

export const models = sqliteTable('models', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  provider: text('provider').notNull(),
  modelName: text('model_name').notNull(),
  apiEndpoint: text('api_endpoint'),
  config: text('config').default('{}'),
  createdAt: integer('created_at').default(sql`strftime('%s', 'now')`),
  updatedAt: integer('updated_at').default(sql`strftime('%s', 'now')`),
});

export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  provider: text('provider').notNull(),
  keyHash: text('key_hash').notNull(),
  encryptedKey: text('encrypted_key').notNull(),
  createdAt: integer('created_at').default(sql`strftime('%s', 'now')`),
  updatedAt: integer('updated_at').default(sql`strftime('%s', 'now')`),
});

export const permissions = sqliteTable('permissions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  agentType: text('agent_type'),
  resourceType: text('resource_type').notNull(),
  pattern: text('pattern').notNull(),
  action: text('action').notNull(),
  createdAt: integer('created_at').default(sql`strftime('%s', 'now')`),
});

export const lspServers = sqliteTable('lsp_servers', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  language: text('language').notNull(),
  command: text('command').notNull(),
  args: text('args').default('[]'),
  config: text('config').default('{}'),
  createdAt: integer('created_at').default(sql`strftime('%s', 'now')`),
});

export const mcpPlugins = sqliteTable('mcp_plugins', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  name: text('name').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  config: text('config').default('{}'),
  createdAt: integer('created_at').default(sql`strftime('%s', 'now')`),
  updatedAt: integer('updated_at').default(sql`strftime('%s', 'now')`),
});
```

### 4.3 数据库初始化

```typescript
// src/db/index.ts

import Database from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from './schema';

let db: ReturnType<typeof drizzle>;

export function initDatabase(path: string = './data/opencode.db') {
  // 确保数据目录存在
  import { mkdirSync } from 'fs';
  mkdirSync('./data', { recursive: true });

  // 创建 SQLite 连接
  const sqlite = new Database(path);
  db = drizzle(sqlite, { schema });

  // 运行迁移
  migrate();

  return db;
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

async function migrate() {
  // 创建表
  const sqlite = new Database('./data/opencode.db');

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      avatar_url TEXT,
      settings TEXT DEFAULT '{}',
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      description TEXT,
      metadata TEXT DEFAULT '{}',
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    -- ... 其他表
  `);

  sqlite.close();
}
```

---

## 5. API 设计

### 5.1 RESTful API 端点

#### 项目管理
```
GET    /api/projects                    # 获取项目列表
POST   /api/projects                    # 创建新项目
GET    /api/projects/:id                # 获取项目详情
PUT    /api/projects/:id                # 更新项目
DELETE /api/projects/:id                # 删除项目
POST   /api/projects/:id/open           # 在编辑器中打开
```

#### 会话管理
```
GET    /api/projects/:id/sessions       # 获取会话列表
POST   /api/projects/:id/sessions       # 创建新会话
GET    /api/sessions/:id                # 获取会话详情
PUT    /api/sessions/:id                # 更新会话
DELETE /api/sessions/:id                # 删除会话
POST   /api/sessions/:id/messages       # 发送消息（流式）
GET    /api/sessions/:id/messages       # 获取消息历史
POST   /api/sessions/:id/export         # 导出会话
```

#### Agent 操作
```
POST   /api/agents/:type/execute        # 执行 Agent 任务
GET    /api/agents/:type/capabilities   # 获取 Agent 能力
POST   /api/agents/:type/switch         # 切换 Agent
```

#### 文件操作
```
GET    /api/projects/:id/files          # 列出文件
POST   /api/projects/:id/files/read     # 读取文件
POST   /api/projects/:id/files/write    # 写入文件
POST   /api/projects/:id/files/search   # 搜索文件内容
POST   /api/projects/:id/files/edit     # 编辑文件（diff 应用）
GET    /api/projects/:id/files/tree     # 获取文件树
```

#### 模型和提供商
```
GET    /api/models                      # 获取模型列表
POST   /api/models                      # 添加模型
PUT    /api/models/:id                  # 更新模型
DELETE /api/models/:id                  # 删除模型
GET    /api/providers                   # 获取可用提供商
POST   /api/providers/test              # 测试提供商连接
```

#### LSP 和 MCP
```
GET    /api/lsp/servers                 # 获取 LSP 服务器列表
POST   /api/lsp/servers                 # 添加 LSP 服务器
GET    /api/lsp/:language/completion    # 代码补全
GET    /api/lsp/:language/definition    # 跳转到定义
GET    /api/mcp/plugins                 # 获取 MCP 插件列表
POST   /api/mcp/plugins/:name/execute   # 执行 MCP 插件
```

#### 终端操作
```
POST   /api/terminal/sessions           # 创建终端会话
POST   /api/terminal/:id/execute        # 执行命令
GET    /api/terminal/:id/output         # 获取输出
DELETE /api/terminal/:id                # 关闭终端
```

#### 系统设置
```
GET    /api/settings                    # 获取设置
PUT    /api/settings                    # 更新设置
GET    /api/status                      # 系统状态
```

### 5.2 WebSocket API

```typescript
// WebSocket 消息协议

type WSMessage =
  | { type: 'hello'; token: string }
  | { type: 'sub'; channel: string; sessionId?: string }
  | { type: 'unsub'; channel: string }
  | { type: 'message'; data: Message }
  | { type: 'agent_start'; agentType: string; sessionId: string }
  | { type: 'agent_progress'; progress: number; sessionId: string }
  | { type: 'agent_complete'; result: any; sessionId: string }
  | { type: 'file_change'; projectId: string; filePath: string; content?: string }
  | { type: 'terminal_output'; sessionId: string; output: string }
  | { type: 'error'; error: string }
  | { type: 'ping' }
  | { type: 'pong' };

// 客户端使用示例
const ws = new WebSocket('ws://localhost:3001/ws');

ws.onopen = () => {
  // 认证
  ws.send(JSON.stringify({
    type: 'hello',
    token: localStorage.getItem('authToken')
  }));

  // 订阅会话消息
  ws.send(JSON.stringify({
    type: 'sub',
    channel: 'session:abc-123',
    sessionId: 'abc-123'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data) as WSMessage;

  switch (message.type) {
    case 'message':
      // 处理新消息
      updateMessages(message.data);
      break;
    case 'agent_progress':
      // 更新进度条
      updateProgress(message.progress);
      break;
    case 'file_change':
      // 刷新文件内容
      refreshFile(message.filePath, message.content);
      break;
    case 'terminal_output':
      // 更新终端输出
      appendTerminalOutput(message.output);
      break;
    case 'error':
      // 显示错误
      showError(message.error);
      break;
  }
};
```

### 5.3 服务器实现示例

```typescript
// src/server.ts

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from 'bun';
import { apiRoutes } from './routes';
import { createWebSocketServer } from './websocket';

const app = new Hono();

// 中间件
app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));

// API 路由
app.route('/api', apiRoutes);

// 静态文件服务（生产环境）
app.use('*', async (c) => {
  // 返回 index.html
  return c.html(Bun.file('./dist/index.html'));
});

// 启动服务器
const port = parseInt(process.env.PORT || '3000');

const server = serve({
  port,
  fetch: app.fetch,
  websocket: {
    message: (ws, message) => {
      // WebSocket 消息处理
      createWebSocketServer().handleMessage(ws, message);
    },
    open: (ws) => {
      createWebSocketServer().handleOpen(ws);
    },
    close: (ws) => {
      createWebSocketServer().handleClose(ws);
    },
  },
});

console.log(`🚀 Server running on http://localhost:${port}`);
console.log(`📡 WebSocket on ws://localhost:${port}/ws`);
```

---

## 6. 前端架构

（与云版本相同，参见前文第 6 节）

---

## 7. 本地部署方案

### 7.1 单一可执行文件部署

#### 打包脚本
```typescript
// scripts/bundle.ts

import { build } from 'bun';

async function bundle() {
  // 打包后端
  await build({
    entrypoints: ['./src/server.ts'],
    outdir: './dist',
    target: 'bun',
    format: 'esm',
    splitting: false,
    singleFile: true, // 单文件
    bundling: true,
  });

  // 复制静态文件
  await Bun.write('./dist/index.html', Bun.file('./frontend/dist/index.html'));

  console.log('✅ Bundle created: ./dist/server.bundle.js');
}

bundle();
```

#### 启动脚本
```typescript
// bin/opencode-server

#!/usr/bin/env bun

const server = import('./dist/server.bundle.js');

server.then((mod) => {
  mod.default();
});
```

#### 使用方式
```bash
# 构建
$ bun run build

# 启动服务器
$ ./bin/opencode-server start

# 指定端口
$ PORT=8080 ./bin/opencode-server start

# 指定数据目录
$ DATA_DIR=/opt/opencode ./bin/opencode-server start
```

### 7.2 Docker 部署

#### Dockerfile
```dockerfile
# Dockerfile

FROM oven/bun:1.3-alpine

WORKDIR /app

# 安装依赖
COPY package.json bun.lockb ./
RUN bun install --production

# 复制源代码
COPY . .

# 复制前端构建产物
COPY --from=frontend /app/dist ./dist

# 创建数据目录
RUN mkdir -p /app/data /app/projects

# 暴露端口
EXPOSE 3000 3001

# 环境变量
ENV DATABASE_URL=/app/data/opencode.db
ENV PORT=3000

# 启动命令
CMD ["bun", "run", "src/server.ts"]

# 前端构建阶段
FROM oven/bun:1.3-alpine AS frontend
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install
COPY frontend/src ./frontend/src
COPY frontend/tsconfig.json ./frontend/
RUN cd frontend && bun run build
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  opencode:
    build: .
    container_name: opencode-server
    ports:
      - "3000:3000"
      - "3001:3001"
    volumes:
      - ./data:/app/data
      - ./projects:/app/projects
    environment:
      - DATABASE_URL=/app/data/opencode.db
      - PORT=3000
      - NODE_ENV=production
    restart: unless-stopped

  # 可选：Ollama 本地 LLM
  ollama:
    image: ollama/ollama:latest
    container_name: opencode-ollama
    volumes:
      - ./ollama:/root/.ollama
    ports:
      - "11434:11434"
    restart: unless-stopped

  # 可选：PostgreSQL（替代 SQLite）
  postgres:
    image: postgres:15-alpine
    container_name: opencode-db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=opencode
      - POSTGRES_PASSWORD=opencode
      - POSTGRES_DB=opencode
    ports:
      - "5432:5432"
    restart: unless-stopped

volumes:
  postgres_data:
```

#### 使用方式
```bash
# 启动所有服务
$ docker-compose up -d

# 查看日志
$ docker-compose logs -f

# 停止服务
$ docker-compose down

# 重启服务
$ docker-compose restart
```

### 7.3 系统服务配置（Systemd）

#### opencode.service
```ini
# /etc/systemd/system/opencode.service

[Unit]
Description=OpenCode AI Server
After=network.target

[Service]
Type=simple
User=opencode
WorkingDirectory=/opt/opencode
ExecStart=/usr/bin/bun run /opt/opencode/src/server.ts
Restart=on-failure
RestartSec=10

Environment="PORT=3000"
Environment="DATA_DIR=/var/lib/opencode"
Environment="DATABASE_URL=/var/lib/opencode/opencode.db"

[Install]
WantedBy=multi-user.target
```

#### 使用方式
```bash
# 安装服务
$ sudo cp opencode.service /etc/systemd/system/
$ sudo systemctl daemon-reload
$ sudo systemctl enable opencode

# 启动服务
$ sudo systemctl start opencode

# 查看状态
$ sudo systemctl status opencode

# 查看日志
$ sudo journalctl -u opencode -f
```

### 7.4 Nginx 反向代理（可选）

#### nginx.conf
```nginx
server {
    listen 80;
    server_name opencode.local;

    # HTTP
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 8. 开发路线图

### 阶段 1：基础架构搭建 (Week 1-2)

**目标**: 建立本地可运行的项目基础

#### Week 1: 项目初始化
- [ ] 创建项目结构
- [ ] 配置 Bun + TypeScript
- [ ] 配置 TailwindCSS
- [ ] 配置 Vite（前端）
- [ ] 设计 SQLite Schema
- [ ] 配置 Drizzle ORM
- [ ] 创建基础路由

#### Week 2: 核心 API
- [ ] Hono 服务器搭建
- [ ] Bun.serve 配置
- [ ] 项目 CRUD API
- [ ] 会话 CRUD API
- [ ] 数据库初始化脚本
- [ ] 基础中间件（CORS、日志）

### 阶段 2：AI 集成 (Week 3-4)

**目标**: 实现多提供商 AI 集成

#### Week 3: AI SDK 集成
- [ ] Vercel AI SDK 配置
- [ ] Anthropic 集成
- [ ] OpenAI 集成
- [ ] Ollama 本地 LLM 集成
- [ ] 流式响应处理
- [ ] 工具调用框架

#### Week 4: Agent 系统
- [ ] BaseAgent 抽象类
- [ ] BuildAgent 实现
- [ ] PlanAgent 实现
- [ ] Agent 切换机制
- [ ] 权限系统基础

### 阶段 3：前端开发 (Week 5-8)

**目标**: 实现 Web 应用界面

#### Week 5: 基础 UI
- [ ] 布局组件
- [ ] 项目列表页
- [ ] 项目详情页
- [ ] 会话列表页
- [ ] 响应式设计

#### Week 6: 核心交互
- [ ] PromptInput 组件
- [ ] MessageList 组件
- [ ] 流式消息渲染
- [ ] Markdown 渲染
- [ ] 代码高亮

#### Week 7: 文件操作
- [ ] FileTree 组件
- [ ] CodeEditor 集成
- [ ] 文件读写 API
- [ ] 文件搜索功能
- [ ] Diff 查看

#### Week 8: 高级功能
- [ ] 设置页面
- [ ] Agent 配置界面
- [ ] 模型选择界面
- [ ] 权限配置界面
- [ ] 主题切换

### 阶段 4：本地集成 (Week 9-10)

**目标**: 实现本地功能特性

#### Week 9: LSP 和 MCP
- [ ] LSP 客户端
- [ ] 代码补全
- [ ] MCP 插件系统
- [ ] 插件管理界面

#### Week 10: 终端和实时
- [ ] xterm.js 集成
- [ ] PTY 管理
- [ ] 命令执行
- [ ] WebSocket 服务器
- [ ] 实时消息推送

### 阶段 5：打包和部署 (Week 11-12)

**目标**: 本地部署能力

#### Week 11: 打包
- [ ] Bun 单文件打包
- [ ] Docker 镜像构建
- [ ] 安装脚本
- [ ] 配置文件模板

#### Week 12: 测试和文档
- [ ] 单元测试
- [ ] 集成测试
- [ ] E2E 测试
- [ ] 部署文档
- [ ] 用户手册

### 阶段 6：优化和发布 (Week 13-14)

**目标**: 生产就绪

#### Week 13: 性能优化
- [ ] 代码分割
- [ ] 懒加载
- [ ] 数据库优化
- [ ] 内存优化

#### Week 14: 发布
- [ ] 版本发布
- [ ] CI/CD 配置
- [ ] Release Notes
- [ ] 示例项目

### 关键里程碑

| 里程碑 | 目标 | 完成标准 |
|--------|------|----------|
| M1: 本地 MVP | 本地可运行 | 可以在本地启动，基本功能可用 |
| M2: 核心 API | API 完整 | 所有核心 API 端点实现 |
| M3: 前端 Alpha | 基础 UI | 项目和会话管理可用 |
| M4: Beta | 功能完整 | 所有计划功能实现 |
| M5: v1.0 | 可部署 | 可打包为单文件或 Docker |

---

## 9. 关键实现细节

### 9.1 本地文件系统访问

```typescript
// src/services/FileService.ts

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

export class FileService {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = resolve(projectRoot);
  }

  async readFile(filePath: string): Promise<string> {
    const fullPath = this.resolvePath(filePath);
    return readFileSync(fullPath, 'utf-8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const fullPath = this.resolvePath(filePath);
    writeFileSync(fullPath, content, 'utf-8');
  }

  async listFiles(dir: string = '.'): Promise<FileNode[]> {
    const fullPath = this.resolvePath(dir);
    const entries = readdirSync(fullPath, { withFileTypes: true });

    return entries.map(entry => ({
      name: entry.name,
      path: join(dir, entry.name),
      type: entry.isDirectory() ? 'directory' : 'file',
    }));
  }

  private resolvePath(filePath: string): string {
    const fullPath = resolve(this.projectRoot, filePath);

    // 安全检查：防止路径遍历攻击
    if (!fullPath.startsWith(this.projectRoot)) {
      throw new Error('Access denied: path traversal attempt');
    }

    return fullPath;
  }
}
```

### 9.2 Ollama 本地 LLM 集成

```typescript
// src/providers/ollama.ts

import { createOpenAI } from '@ai-sdk/openai';

export function createOllamaProvider(baseURL: string = 'http://localhost:11434') {
  const ollama = createOpenAI({
    baseURL: `${baseURL}/v1`,
    apiKey: 'ollama', // Ollama 不需要真实 API key
  });

  return {
    chat: (model: string, messages: any[]) => {
      return ollama.chat(model, messages);
    },
    stream: (model: string, messages: any[]) => {
      return ollama.streamText(model, messages);
    },
    listModels: async () => {
      const response = await fetch(`${baseURL}/api/tags`);
      const data = await response.json();
      return data.models;
    },
  };
}

// 使用
const ollama = createOllamaProvider();
const models = await ollama.listModels();
console.log('Available models:', models);
```

### 9.3 WebSocket 实时通信

```typescript
// src/websocket/handler.ts

interface WSClient {
  ws: any; // Bun WebSocket
  userId?: string;
  subscriptions: Set<string>;
}

export class WebSocketServer {
  private clients: Map<any, WSClient> = new Map();

  handleOpen(ws: any) {
    console.log('WebSocket client connected');
    this.clients.set(ws, {
      ws,
      subscriptions: new Set(),
    });
  }

  handleClose(ws: any) {
    console.log('WebSocket client disconnected');
    this.clients.delete(ws);
  }

  handleMessage(ws: any, message: string | Buffer) {
    const client = this.clients.get(ws);
    if (!client) return;

    const data = JSON.parse(message.toString());

    switch (data.type) {
      case 'hello':
        // 认证
        client.userId = data.userId;
        break;

      case 'sub':
        // 订阅频道
        client.subscriptions.add(data.channel);
        break;

      case 'unsub':
        // 取消订阅
        client.subscriptions.delete(data.channel);
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
    }
  }

  broadcast(channel: string, message: any) {
    for (const [ws, client] of this.clients) {
      if (client.subscriptions.has(channel)) {
        ws.send(JSON.stringify(message));
      }
    }
  }
}
```

### 9.4 终端 PTY 集成

```typescript
// src/services/TerminalService.ts

import { spawn } from 'node-pty';

export class TerminalService {
  private terminals: Map<string, any> = new Map();

  createSession(cwd: string): string {
    const sessionId = crypto.randomUUID();

    const pty = spawn('bash', [], {
      name: 'xterm-color',
      cwd,
      env: process.env,
    });

    pty.onData((data: string) => {
      // 通过 WebSocket 发送输出
      wsServer.broadcast(`terminal:${sessionId}`, {
        type: 'terminal_output',
        sessionId,
        output: data,
      });
    });

    this.terminals.set(sessionId, pty);
    return sessionId;
  }

  execute(sessionId: string, command: string) {
    const pty = this.terminals.get(sessionId);
    if (pty) {
      pty.write(command + '\n');
    }
  }

  close(sessionId: string) {
    const pty = this.terminals.get(sessionId);
    if (pty) {
      pty.kill();
      this.terminals.delete(sessionId);
    }
  }
}
```

### 9.5 本地 Git 集成

```typescript
// src/tools/git.ts

import { execSync } from 'child_process';
import { join } from 'path';

export class GitService {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  async getStatus(): Promise<GitStatus> {
    const output = execSync('git status --porcelain', {
      cwd: this.projectPath,
      encoding: 'utf-8',
    });

    // 解析输出
    const files = output.split('\n').filter(Boolean).map(line => ({
      status: line.slice(0, 2),
      path: line.slice(3),
    }));

    return {
      branch: this.getCurrentBranch(),
      files,
    };
  }

  async commit(message: string): Promise<string> {
    const output = execSync(`git commit -m ${JSON.stringify(message)}`, {
      cwd: this.projectPath,
      encoding: 'utf-8',
    });
    return output;
  }

  private getCurrentBranch(): string {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: this.projectPath,
      encoding: 'utf-8',
    }).trim();
  }
}
```

### 9.6 数据库迁移

```typescript
// src/db/migrate.ts

import Database from 'bun:sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from './schema';

export async function runMigrations(dbPath: string) {
  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite, { schema });

  // 运行迁移
  await migrate(db, { migrationsFolder: './drizzle' });

  console.log('✅ Migrations completed');
  sqlite.close();
}
```

---

## 10. 测试策略

### 10.1 单元测试

```typescript
// __tests__/services/FileService.test.ts

import { describe, it, expect, beforeEach } from 'bun:test';
import { FileService } from '@/services/FileService';
import { tmpdir } from 'os';
import { mkdirSync, writeFileSync } from 'fs';

describe('FileService', () => {
  let service: FileService;
  let tempDir: string;

  beforeEach(() => {
    tempDir = `${tmpdir()}/test-${Date.now()}`;
    mkdirSync(tempDir, { recursive: true });
    service = new FileService(tempDir);
  });

  it('should read file content', async () => {
    const testFile = `${tempDir}/test.txt`;
    writeFileSync(testFile, 'Hello, World!');

    const content = await service.readFile('test.txt');
    expect(content).toBe('Hello, World!');
  });

  it('should write file content', async () => {
    await service.writeFile('new.txt', 'New content');

    const content = await service.readFile('new.txt');
    expect(content).toBe('New content');
  });

  it('should prevent path traversal', async () => {
    await expect(service.readFile('../../../etc/passwd'))
      .toThrow('Access denied');
  });
});
```

### 10.2 集成测试

```typescript
// __tests__/api/projects.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { serve } from 'bun';
import { api } from '@/routes';

describe('Projects API', () => {
  let server: any;
  const port = 3002;

  beforeAll(() => {
    server = serve({
      port,
      fetch: api.fetch,
    });
  });

  afterAll(() => {
    server.stop();
  });

  it('should create a project', async () => {
    const response = await fetch(`http://localhost:${port}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Project',
        path: '/tmp/test-project',
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data.name).toBe('Test Project');
  });

  it('should list projects', async () => {
    const response = await fetch(`http://localhost:${port}/api/projects`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data.projects)).toBe(true);
  });
});
```

### 10.3 E2E 测试

```typescript
// e2e/project.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Project Management', () => {
  test('should create a new project', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('text=创建新项目');

    await page.fill('input[name="name"]', 'Test Project');
    await page.fill('input[name="path"]', '/tmp/test-project');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/projects\/.+$/);
    await expect(page.locator('h1')).toContainText('Test Project');
  });

  test('should send a message to AI', async ({ page }) => {
    await page.goto('http://localhost:3000/projects/test/sessions/new');

    await page.fill('textarea', 'Hello AI');
    await page.click('button[aria-label="Send"]');

    // 等待 AI 响应
    await expect(page.locator('.message-assistant')).toBeVisible();
    await expect(page.locator('.message-assistant')).toContainText(/Hello/i);
  });
});
```

### 10.4 性能测试

```typescript
// __tests__/performance/load.test.ts

import { describe, it, expect } from 'bun:test';

describe('Load Tests', () => {
  it('should handle 100 concurrent requests', async () => {
    const requests = Array.from({ length: 100 }, (_, i) =>
      fetch('http://localhost:3000/api/projects')
    );

    const start = Date.now();
    const responses = await Promise.all(requests);
    const duration = Date.now() - start;

    expect(responses.every(r => r.ok)).toBe(true);
    expect(duration).toBeLessThan(5000); // 5秒内完成
  });
});
```

---

## 附录

### A. 技术对比（本地部署版）

| 技术 | 云版本 | 本地版本 | 原因 |
|------|--------|---------|------|
| 数据库 | MySQL | SQLite | 零配置、单文件 |
| 文件存储 | R2/S3 | 本地文件系统 | 直接访问 |
| 缓存 | Redis | 内存/Redis | 简化部署 |
| HTTP 服务器 | Cloudflare Workers | Bun.serve | 本地运行 |
| WebSocket | Durable Objects | Bun WebSocket | 内置支持 |
| AI 提供商 | 全部 | 全部 + Ollama | 本地 LLM 选项 |
| 部署方式 | SST + Cloudflare | Docker / 单文件 | 本地控制 |

### B. 环境变量

```bash
# .env.example

# 服务器配置
PORT=3000
HOST=localhost

# 数据库
DATABASE_URL=./data/opencode.db
# 或使用 PostgreSQL:
# DATABASE_URL=postgresql://user:pass@localhost:5432/opencode

# Redis（可选）
REDIS_URL=redis://localhost:6379

# AI 提供商 API Keys
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
GROQ_API_KEY=gsk_...

# Ollama（本地 LLM）
OLLAMA_BASE_URL=http://localhost:11434

# 安全
JWT_SECRET=your-secret-key-change-this
ENCRYPTION_KEY=your-encryption-key

# 日志
LOG_LEVEL=info
LOG_FILE=./data/opencode.log

# 文件存储
DATA_DIR=./data
PROJECTS_DIR=./projects

# LSP
LSP_SERVERS_DIR=./data/lsp

# 限制
MAX_FILE_SIZE=10485760  # 10MB
MAX_UPLOAD_SIZE=52428800  # 50MB
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60000  # 1分钟
```

### C. 目录结构

```
opencode-web/
├── bin/                     # 可执行文件
│   └── opencode-server
├── data/                    # 数据目录
│   ├── opencode.db         # SQLite 数据库
│   ├── opencode.log        # 日志文件
│   └── lsp/                # LSP 服务器
├── projects/                # 项目目录
│   └── user-projects/
├── dist/                    # 构建产物
│   ├── server.bundle.js    # 后端 bundle
│   └── assets/             # 前端资源
├── drizzle/                 # 数据库迁移
├── scripts/                 # 脚本
│   ├── build.ts
│   ├── bundle.ts
│   └── migrate.ts
├── src/                     # 源代码
│   ├── server.ts
│   ├── routes/
│   ├── services/
│   ├── agents/
│   ├── tools/
│   ├── providers/
│   ├── middleware/
│   ├── db/
│   └── websocket/
├── frontend/                # 前端代码
│   ├── src/
│   ├── public/
│   └── package.json
├── tests/                   # 测试
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── package.json
├── bun.lockb
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

### D. 常见问题

**Q: SQLite 够用吗？什么时候需要 PostgreSQL？**
A: SQLite 适合个人和小团队使用（< 100 用户），当并发量大或需要更强大的数据库功能时，可以切换到 PostgreSQL。

**Q: 如何支持离线模式？**
A: 使用 Ollama 运行本地 LLM（如 Llama 3），所有数据都在本地，完全离线可用。

**Q: 如何备份数据？**
A: 定期复制 `./data` 目录，或者使用 SQLite 的 `.backup` 命令。

**Q: 如何升级？**
A: 停止服务器 → 备份数据 → 替换可执行文件 → 运行迁移 → 重启服务器。

**Q: 能否与现有 Git 仓库集成？**
A: 可以，项目直接指向本地 Git 仓库路径即可。

---

## 总结

本开发计划提供了从零开始构建**本地部署版** OpenCode Web 应用的完整方案：

### 关键特性

1. **零云依赖**：所有组件可在本地运行
2. **灵活部署**：单文件、Docker、系统服务多种方式
3. **数据隐私**：所有数据存储在本地
4. **易于使用**：一行命令启动
5. **功能完整**：保留所有核心功能
6. **本地 LLM**：支持 Ollama 等本地模型

### 技术栈

- **前端**：SolidJS + Vite + TailwindCSS
- **后端**：Bun + Hono + Drizzle
- **数据库**：SQLite（默认）/ PostgreSQL（可选）
- **AI**：Vercel AI SDK + Ollama
- **部署**：Docker / 单文件可执行

### 开发周期

14-16 周，分为 6 个阶段：
1. 基础架构（2 周）
2. AI 集成（2 周）
3. 前端开发（4 周）
4. 本地集成（2 周）
5. 打包部署（2 周）
6. 优化发布（2-4 周）

通过遵循此计划，您可以构建一个完全自主可控、易于部署的 AI 编程助手。
