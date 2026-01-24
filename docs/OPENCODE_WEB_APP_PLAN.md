# OpenCode Web 应用开发计划与架构设计

> 基于 vendor/opencode 代码库分析，从零开始构建 Web 应用版本的完整计划

---

## 目录

1. [项目概述](#项目概述)
2. [技术栈选型](#技术栈选型)
3. [架构设计](#架构设计)
4. [数据模型设计](#数据模型设计)
5. [API 设计](#api-设计)
6. [前端架构](#前端架构)
7. [开发路线图](#开发路线图)
8. [关键实现细节](#关键实现细节)
9. [部署策略](#部署策略)
10. [测试策略](#测试策略)

---

## 1. 项目概述

### 1.1 目标

构建一个基于 Web 的 AI 编程助手应用，提供类似 OpenCode 的核心功能：

- **多 AI 提供商支持**：Anthropic、OpenAI、Google、Groq 等
- **多 Agent 系统**：构建、规划、通用 Agent
- **代码操作**：文件读写、编辑、搜索、导航
- **会话管理**：多会话、历史记录、分享
- **LSP 集成**：代码智能提示
- **MCP 支持**：扩展插件系统
- **终端集成**：命令执行
- **实时同步**：WebSocket 支持

### 1.2 核心特性

| 特性 | 描述 | 优先级 |
|------|------|--------|
| 多模型支持 | 支持多家 AI 提供商 | P0 |
| 文件操作 | 读取、编辑、搜索代码 | P0 |
| 会话管理 | 多会话、历史记录 | P0 |
| 权限系统 | 细粒度访问控制 | P1 |
| LSP 集成 | 代码智能 | P1 |
| MCP 支持 | 插件系统 | P2 |
| 终端集成 | 命令执行 | P2 |
| 实时同步 | WebSocket | P1 |

---

## 2. 技术栈选型

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

### 2.2 后端技术栈

#### 运行时
- **Bun 1.3+** - JavaScript 运行时
  - 原因：极速、原生 TypeScript、内置包管理器
  - OpenCode 生产验证

#### Web 框架
- **Hono 4+** - 轻量级 Web 框架
  - 原因：Cloudflare Workers 原生支持
  - 类似 Express API，易于上手

#### AI 集成
- **Vercel AI SDK 5+** - LLM 抽象层
  - 支持多家提供商
  - 流式响应
  - 工具调用

#### 数据库
- **PostgreSQL/MySQL** - 主数据库
- **Drizzle ORM** - 类型安全 ORM
- **Redis** - 缓存和会话

### 2.3 基础设施

#### 部署平台
- **Cloudflare Workers** - 无服务器计算
- **Cloudflare Pages** - 静态托管
- **Cloudflare R2** - 对象存储

#### 基础设施即代码
- **SST** - 部署框架
- **Terraform** - 备选方案

#### 开发工具
- **TypeScript 5.8+** - 类型安全
- **ESLint + Prettier** - 代码质量
- **Playwright** - E2E 测试
- **Vitest** - 单元测试

---

## 3. 架构设计

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                         客户端层                              │
├─────────────────────────────────────────────────────────────┤
│  Web 前端 (SolidJS)          │  桌面应用 (Tauri)              │
│  - 文件管理                  │  - 原生窗口                   │
│  - 会话管理                  │  - 系统托盘                   │
│  - 终端集成                  │  - 本地文件访问               │
│  - 实时同步                  │  - 离线模式                   │
└──────────────┬──────────────────────────────────────────────┘
               │
               │ WebSocket + HTTP
               │
┌──────────────▼──────────────────────────────────────────────┐
│                         API 网关层                           │
├─────────────────────────────────────────────────────────────┤
│  Hono API Server                                              │
│  - 认证中间件                 │  - 限流中间件                │
│  - 路由处理                   │  - 日志中间件                │
└──────────────┬──────────────────────────────────────────────┘
               │
               │
┌──────────────▼──────────────────────────────────────────────┐
│                         服务层                               │
├─────────────────┬─────────────────┬─────────────────────────┤
│  Agent 服务      │  文件服务        │  会话服务                │
│  - LLM 调用      │  - 读写操作      │  - 历史管理              │
│  - 工具执行      │  - 搜索导航      │  - 上下文管理            │
│  - 权限控制      │  - 版本控制      │  - 分享协作              │
├─────────────────┼─────────────────┼─────────────────────────┤
│  LSP 服务        │  MCP 服务        │  终端服务                │
│  - 代码分析      │  - 插件管理      │  - 命令执行              │
│  - 智能提示      │  - 扩展加载      │  - PTY 管理              │
│  - 诊断信息      │  - OAuth 处理    │  - 输出流                │
└─────────────────┴─────────────────┴─────────────────────────┘
               │
               │
┌──────────────▼──────────────────────────────────────────────┐
│                         数据层                               │
├─────────────────┬─────────────────┬─────────────────────────┤
│  PostgreSQL      │  Redis          │  对象存储 (R2/S3)        │
│  - 用户数据      │  - 会话缓存      │  - 文件快照              │
│  - 项目配置      │  - 限流计数      │  - 代码片段              │
│  - 会话历史      │  - 实时状态      │  - 附件文件              │
└─────────────────┴─────────────────┴─────────────────────────┘
               │
               │
┌──────────────▼──────────────────────────────────────────────┐
│                       外部服务集成                            │
├─────────────────┬─────────────────┬─────────────────────────┤
│  AI 提供商       │  Git 托管        │  CI/CD                  │
│  - Anthropic    │  - GitHub        │  - GitHub Actions       │
│  - OpenAI       │  - GitLab        │  - 自动测试              │
│  - Google       │  - Bitbucket     │  - 自动部署              │
│  - Groq         │  - Webhook       │                          │
└─────────────────┴─────────────────┴─────────────────────────┘
```

### 3.2 前端架构

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

### 3.3 后端架构

```
src/
├── server.ts                # Hono 服务器入口
├── routes/                  # API 路由
│   ├── agents.ts           # Agent 端点
│   ├── sessions.ts         # 会话端点
│   ├── files.ts            # 文件端点
│   ├── projects.ts         # 项目端点
│   ├── models.ts           # 模型端点
│   ├── providers.ts        # 提供商端点
│   └── webhooks.ts         # Webhook 处理
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
└── lib/                     # 工具库
    ├── ai.ts               # AI SDK 集成
    ├── crypto.ts           # 加密工具
    └── logger.ts           # 日志工具
```

### 3.4 微服务架构（可选扩展）

随着应用规模增长，可以考虑拆分为微服务：

```
┌─────────────────────────────────────────────────────────┐
│                     API Gateway                          │
│              (Kong / AWS API Gateway)                    │
└────────────────┬────────────────────────────────────────┘
                 │
      ┌──────────┼──────────┬──────────┬──────────┐
      │          │          │          │          │
┌─────▼─────┐ ┌─▼──────┐ ┌─▼──────┐ ┌─▼──────┐ ┌─▼──────┐
│   Agent   │ │ Session│ │  File  │ │  LSP   │ │ Terminal│
│  Service  │ │ Service│ │ Service│ │ Service│ │ Service │
└─────┬─────┘ └─┬──────┘ └─┬──────┘ └─┬──────┘ └─┬──────┘
      │         │          │          │          │
      └─────────┼──────────┼──────────┼──────────┘
                │          │          │
      ┌─────────▼──────────▼──────────▼──────────┐
      │         共享数据层 (PostgreSQL)           │
      │         缓存层 (Redis)                    │
      └──────────────────────────────────────────┘
```

---

## 4. 数据模型设计

### 4.1 核心表结构

```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 工作区表
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 项目表
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  name VARCHAR(255) NOT NULL,
  path TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 会话表
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  agent_type VARCHAR(50) NOT NULL, -- 'build', 'plan', 'general'
  title TEXT,
  messages JSONB DEFAULT '[]',
  context JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 消息表（可选，用于详细存储）
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 模型配置表
CREATE TABLE models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  provider VARCHAR(100) NOT NULL,
  model_name VARCHAR(255) NOT NULL,
  api_endpoint TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- API 密钥表（加密存储）
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  provider VARCHAR(100) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 权限规则表
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  agent_type VARCHAR(50),
  resource_type VARCHAR(100), -- 'file', 'directory', 'command'
  pattern TEXT NOT NULL,
  action VARCHAR(20) NOT NULL, -- 'allow', 'deny', 'ask'
  created_at TIMESTAMP DEFAULT NOW()
);

-- LSP 服务器配置表
CREATE TABLE lsp_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  language VARCHAR(100) NOT NULL,
  command TEXT NOT NULL,
  args JSONB DEFAULT '[]',
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- MCP 插件表
CREATE TABLE mcp_plugins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  name VARCHAR(255) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 文件快照表（用于版本对比）
CREATE TABLE file_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  file_path TEXT NOT NULL,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_sessions_project ON sessions(project_id);
CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_projects_workspace ON projects(workspace_id);
CREATE INDEX idx_permissions_workspace ON permissions(workspace_id);
```

### 4.2 TypeScript 类型定义

```typescript
// types/index.ts

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  id: string;
  userId: string;
  name: string;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  path: string;
  description?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  projectId: string;
  agentType: 'build' | 'plan' | 'general';
  title?: string;
  messages: Message[];
  context: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id?: string;
  sessionId?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
}

export interface Model {
  id: string;
  workspaceId: string;
  provider: string;
  modelName: string;
  apiEndpoint?: string;
  config: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface APIKey {
  id: string;
  workspaceId: string;
  provider: string;
  keyHash: string;
  encryptedKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  workspaceId: string;
  agentType?: string;
  resourceType: string;
  pattern: string;
  action: 'allow' | 'deny' | 'ask';
  createdAt: Date;
}

export interface LSPServer {
  id: string;
  workspaceId: string;
  language: string;
  command: string;
  args: string[];
  config: Record<string, any>;
  createdAt: Date;
}

export interface MCPPlugin {
  id: string;
  workspaceId: string;
  name: string;
  enabled: boolean;
  config: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileSnapshot {
  id: string;
  projectId: string;
  filePath: string;
  content?: string;
  metadata: Record<string, any>;
  createdAt: Date;
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
```

#### 会话管理
```
GET    /api/projects/:id/sessions       # 获取会话列表
POST   /api/projects/:id/sessions       # 创建新会话
GET    /api/sessions/:id                # 获取会话详情
PUT    /api/sessions/:id                # 更新会话
DELETE /api/sessions/:id                # 删除会话
POST   /api/sessions/:id/messages       # 发送消息
GET    /api/sessions/:id/messages       # 获取消息历史
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
POST   /api/projects/:id/files/search   # 搜索文件
POST   /api/projects/:id/files/edit     # 编辑文件
```

#### 模型和提供商
```
GET    /api/models                      # 获取模型列表
POST   /api/models                      # 添加模型
PUT    /api/models/:id                  # 更新模型
DELETE /api/models/:id                  # 删除模型
GET    /api/providers                   # 获取可用提供商
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

### 5.2 WebSocket API

```typescript
// WebSocket 消息协议

type WSMessage =
  | { type: 'hello'; sessionId: string }
  | { type: 'message'; data: Message }
  | { type: 'agent_start'; agentType: string }
  | { type: 'agent_progress'; progress: number }
  | { type: 'agent_complete'; result: any }
  | { type: 'file_change'; filePath: string; content: string }
  | { type: 'terminal_output'; output: string }
  | { type: 'error'; error: string }
  | { type: 'ping' }
  | { type: 'pong' };

// 客户端使用示例
const ws = new WebSocket('wss://api.example.com/sync');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'hello',
    sessionId: 'session-123'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data) as WSMessage;

  switch (message.type) {
    case 'message':
      // 处理新消息
      break;
    case 'agent_progress':
      // 更新进度条
      break;
    case 'file_change':
      // 刷新文件内容
      break;
    // ...
  }
};
```

### 5.3 API 请求/响应示例

#### 创建项目
```typescript
// POST /api/projects
{
  "name": "my-awesome-project",
  "path": "/Users/user/projects/my-awesome-project",
  "description": "An awesome web application"
}

// 201 Created
{
  "id": "proj-123",
  "name": "my-awesome-project",
  "path": "/Users/user/projects/my-awesome-project",
  "description": "An awesome web application",
  "metadata": {},
  "createdAt": "2026-01-24T12:00:00Z",
  "updatedAt": "2026-01-24T12:00:00Z"
}
```

#### 发送消息
```typescript
// POST /api/sessions/sess-123/messages
{
  "content": "帮我创建一个 React 组件",
  "attachments": [
    {
      "type": "file",
      "path": "/path/to/file.ts"
    }
  ]
}

// 200 OK (流式响应)
{
  "id": "msg-456",
  "sessionId": "sess-123",
  "role": "assistant",
  "content": "好的，我来帮你创建...",
  "metadata": {
    "model": "claude-sonnet-4-5",
    "tokensUsed": 1234
  },
  "createdAt": "2026-01-24T12:01:00Z"
}
```

#### 搜索文件
```typescript
// POST /api/projects/proj-123/files/search
{
  "query": "function fetchData",
  "filePattern": "**/*.ts",
  "options": {
    "caseSensitive": false,
    "regex": false
  }
}

// 200 OK
{
  "results": [
    {
      "filePath": "/src/services/api.ts",
      "lineNumber": 42,
      "content": "export async function fetchData() {",
      "matches": [
        {
          "start": 14,
          "end": 26,
          "text": "function fetchData"
        }
      ]
    }
  ],
  "total": 1
}
```

---

## 6. 前端架构

### 6.1 核心页面设计

#### 1. 工作台 (Dashboard)
**路由**: `/` 或 `/projects`

**布局**:
```
┌─────────────────────────────────────────────────┐
│ Logo         搜索框         用户头像              │
├──────────────┬──────────────────────────────────┤
│              │                                  │
│ 项目列表      │     欢迎！开始新项目              │
│              │                                  │
│ 📁 项目 A     │  [创建新项目]                    │
│ 📁 项目 B     │                                  │
│ 📁 项目 C     │  或打开最近项目：                  │
│              │     📁 上次编辑的项目              │
│ [+ 新建项目]  │                                  │
│              │                                  │
└──────────────┴──────────────────────────────────┘
```

#### 2. 项目详情页
**路由**: `/projects/:id`

**布局**:
```
┌─────────────────────────────────────────────────────────────┐
│ [< 返回]  项目名称                    [设置] [分享]           │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│ 会话列表      │  当前会话内容                                 │
│              │                                              │
│ 📝 新建功能   │  用户: 帮我创建一个用户登录组件                 │
│ 🐛 修复 Bug   │                                              │
│ 💡 代码审查   │  Agent: 好的，我来创建...                    │
│              │  [Thinking...]                                │
│ [+ 新建会话]  │                                              │
│              │  [文件: src/components/Login.tsx]             │
│              │  [代码预览]                                   │
│              │                                              │
│              │  [继续对话]                                   │
└──────────────┴──────────────────────────────────────────────┘
```

#### 3. 会话详情页
**路由**: `/projects/:projectId/sessions/:sessionId`

**功能**:
- 消息历史展示
- 流式响应渲染
- 代码语法高亮
- 文件变更查看
- 上下文使用显示
- Agent 切换

### 6.2 关键组件设计

#### PromptInput 组件
```typescript
// components/chat/PromptInput.tsx

import { createSignal } from 'solid-js';
import { IconButton } from '@/components/ui/IconButton';
import { AttachmentButton } from '@/components/ui/AttachmentButton';
import { SendButton } from '@/components/ui/SendButton';

interface Props {
  onSend: (content: string, attachments: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function PromptInput(props: Props) {
  const [content, setContent] = createSignal('');
  const [attachments, setAttachments] = createSignal<File[]>([]);

  const handleSend = () => {
    if (!content().trim() && attachments().length === 0) return;

    props.onSend(content(), attachments());
    setContent('');
    setAttachments([]);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div class="prompt-input-container">
      <div class="attachments-preview">
        <For each={attachments()}>
          {(file) => (
            <div class="attachment-item">
              <span>{file.name}</span>
              <button onClick={() => {
                setAttachments(prev => prev.filter(f => f !== file));
              }}>×</button>
            </div>
          )}
        </For>
      </div>

      <textarea
        value={content()}
        onInput={(e) => setContent(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        placeholder={props.placeholder || "输入你的问题..."}
        disabled={props.disabled}
        rows={content().split('\n').length}
      />

      <div class="prompt-actions">
        <AttachmentButton
          onAttach={(files) => setAttachments(prev => [...prev, ...files])}
        />
        <IconButton
          icon="paperclip"
          onClick={() => {/* 文件上传 */}}
        />
        <SendButton
          onClick={handleSend}
          disabled={props.disabled || (!content().trim() && attachments().length === 0)}
        />
      </div>
    </div>
  );
}
```

#### FileTree 组件
```typescript
// components/editor/FileTree.tsx

import { createSignal, For, Show } from 'solid-js';
import { TreeNode } from '@/types/file';

interface Props {
  rootPath: string;
  onSelect: (path: string) => void;
  selectedPath?: string;
}

export function FileTree(props: Props) {
  const [tree, setTree] = createSignal<TreeNode[]>([]);
  const [expanded, setExpanded] = createSignal<Set<string>>(new Set());

  // 加载文件树
  const loadTree = async () => {
    const response = await fetch(`/api/projects/${props.rootPath}/files`);
    const data = await response.json();
    setTree(data.files);
  };

  const toggleExpand = (path: string) => {
    const prev = expanded();
    const next = new Set(prev);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    setExpanded(next);
  };

  return (
    <div class="file-tree">
      <For each={tree()}>
        {(node) => (
          <TreeNode
            node={node}
            expanded={expanded()}
            onToggle={toggleExpand}
            onSelect={props.onSelect}
            selectedPath={props.selectedPath}
          />
        )}
      </For>
    </div>
  );
}

function TreeNode(props: {
  node: TreeNode;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  selectedPath?: string;
}) {
  const isExpanded = () => props.expanded.has(props.node.path);
  const isSelected = () => props.selectedPath === props.node.path;

  return (
    <div class="tree-node">
      <div
        class={`tree-node-content ${isSelected() ? 'selected' : ''}`}
        onClick={() => {
          if (props.node.type === 'directory') {
            props.onToggle(props.node.path);
          } else {
            props.onSelect(props.node.path);
          }
        }}
      >
        <Show when={props.node.type === 'directory'}>
          <span class="expand-icon">
            {isExpanded() ? '▼' : '▶'}
          </span>
        </Show>
        <span class="node-icon">
          {props.node.type === 'directory' ? '📁' : '📄'}
        </span>
        <span class="node-name">{props.node.name}</span>
      </div>

      <Show when={props.node.type === 'directory' && isExpanded()}>
        <div class="tree-node-children">
          <For each={props.node.children}>
            {(child) => (
              <TreeNode
                node={child}
                expanded={props.expanded}
                onToggle={props.onToggle}
                onSelect={props.onSelect}
                selectedPath={props.selectedPath}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
```

#### MessageList 组件
```typescript
// components/chat/MessageList.tsx

import { For, Show, createEffect } from 'solid-js';
import { Message } from '@/types/session';
import { Markdown } from '@/components/ui/Markdown';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { FileChange } from '@/components/ui/FileChange';

interface Props {
  messages: Message[];
  streaming?: boolean;
}

export function MessageList(props: Props) {
  let messagesEndRef: HTMLDivElement | undefined;

  createEffect(() => {
    // 自动滚动到底部
    messagesEndRef?.scrollIntoView({ behavior: 'smooth' });
  });

  return (
    <div class="message-list">
      <For each={props.messages}>
        {(message) => (
          <div class={`message message-${message.role}`}>
            <Show when={message.role === 'user'}>
              <div class="message-avatar">👤</div>
            </Show>
            <Show when={message.role === 'assistant'}>
              <div class="message-avatar">🤖</div>
            </Show>

            <div class="message-content">
              <div class="message-meta">
                <Show when={message.metadata?.model}>
                  <span class="model-name">{message.metadata.model}</span>
                </Show>
                <Show when={message.createdAt}>
                  <span class="timestamp">
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </span>
                </Show>
              </div>

              <Markdown content={message.content} />

              <Show when={message.metadata?.fileChanges}>
                <div class="file-changes">
                  <For each={message.metadata.fileChanges}>
                    {(change) => (
                      <FileChange
                        filePath={change.path}
                        oldContent={change.oldContent}
                        newContent={change.newContent}
                      />
                    )}
                  </For>
                </div>
              </Show>

              <Show when={message.metadata?.codeBlocks}>
                <div class="code-blocks">
                  <For each={message.metadata.codeBlocks}>
                    {(block) => (
                      <CodeBlock
                        language={block.language}
                        code={block.code}
                        filename={block.filename}
                      />
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </div>
        )}
      </For>

      <Show when={props.streaming}>
        <div class="message message-assistant streaming">
          <div class="message-avatar">🤖</div>
          <div class="message-content">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </Show>

      <div ref={messagesEndRef} />
    </div>
  );
}
```

### 6.3 状态管理

#### AppContext
```typescript
// contexts/AppContext.tsx

import { createContext, useContext } from 'solid-js';
import { createStore, produce } from 'solid-js/store';

interface AppState {
  user?: User;
  workspace?: Workspace;
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
}

const AppContext = createContext<{
  state: AppState;
  actions: {
    setUser: (user: User) => void;
    setWorkspace: (workspace: Workspace) => void;
    toggleTheme: () => void;
    toggleSidebar: () => void;
  };
}>();

export function AppProvider(props: { children: any }) {
  const [state, setState] = createStore<AppState>({
    theme: 'dark',
    sidebarOpen: true,
  });

  const actions = {
    setUser: (user: User) => setState('user', user),
    setWorkspace: (workspace: Workspace) => setState('workspace', workspace),
    toggleTheme: () => setState('theme', state.theme === 'light' ? 'dark' : 'light'),
    toggleSidebar: () => setState('sidebarOpen', !state.sidebarOpen),
  };

  return (
    <AppContext.Provider value={{ state, actions }}>
      {props.children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
```

#### SessionContext
```typescript
// contexts/SessionContext.tsx

import { createContext, useContext } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Session, Message } from '@/types/session';

interface SessionState {
  currentSession?: Session;
  messages: Message[];
  streaming: boolean;
}

const SessionContext = createContext<{
  state: SessionState;
  actions: {
    loadSession: (sessionId: string) => Promise<void>;
    sendMessage: (content: string, attachments?: File[]) => Promise<void>;
    switchAgent: (agentType: 'build' | 'plan' | 'general') => void;
    clearSession: () => void;
  };
}>();

export function SessionProvider(props: { children: any }) {
  const [state, setState] = createStore<SessionState>({
    messages: [],
    streaming: false,
  });

  const actions = {
    loadSession: async (sessionId: string) => {
      const response = await fetch(`/api/sessions/${sessionId}`);
      const session: Session = await response.json();

      setState({
        currentSession: session,
        messages: session.messages,
      });
    },

    sendMessage: async (content: string, attachments: File[] = []) => {
      if (!state.currentSession) return;

      // 添加用户消息
      const userMessage: Message = {
        role: 'user',
        content,
        metadata: { attachments: attachments.map(f => f.name) },
      };
      setState('messages', prev => [...prev, userMessage]);
      setState('streaming', true);

      try {
        const response = await fetch(`/api/sessions/${state.currentSession.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, attachments }),
        });

        // 流式读取响应
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';

        while (true) {
          const { done, value } = await reader!.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                assistantContent += data.content;
                setState('messages', prev => {
                  const last = prev[prev.length - 1];
                  if (last && last.role === 'assistant' && prev.length > 0) {
                    return [
                      ...prev.slice(0, -1),
                      { ...last, content: assistantContent }
                    ];
                  } else {
                    return [
                      ...prev,
                      { role: 'assistant', content: assistantContent }
                    ];
                  }
                });
              }
            }
          }
        }
      } finally {
        setState('streaming', false);
      }
    },

    switchAgent: (agentType: 'build' | 'plan' | 'general') => {
      // 切换 Agent 逻辑
    },

    clearSession: () => {
      setState('messages', []);
      setState('currentSession', undefined);
    },
  };

  return (
    <SessionContext.Provider value={{ state, actions }}>
      {props.children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider');
  return context;
}
```

### 6.4 样式系统

#### Tailwind 配置
```javascript
// tailwind.config.js

export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        dark: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'typing': 'typing 1.4s infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        typing: {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-4px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
};
```

---

## 7. 开发路线图

### 阶段 1：基础架构搭建 (Week 1-2)

**目标**: 建立项目基础，实现核心功能

#### Week 1: 项目初始化
- [ ] 创建 monorepo 结构
- [ ] 配置 Bun + TypeScript
- [ ] 设置 Turbo 构建
- [ ] 配置 TailwindCSS
- [ ] 创建基础路由
- [ ] 数据库 Schema 设计
- [ ] Drizzle ORM 配置

#### Week 2: 核心 API
- [ ] Hono 服务器搭建
- [ ] 用户认证系统
- [ ] 项目 CRUD API
- [ ] 会话 CRUD API
- [ ] 基础中间件 (认证、CORS、日志)
- [ ] 数据库迁移

### 阶段 2：AI 集成 (Week 3-4)

**目标**: 实现多提供商 AI 集成

#### Week 3: AI SDK 集成
- [ ] Vercel AI SDK 配置
- [ ] Anthropic 集成
- [ ] OpenAI 集成
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
- [ ] 布局组件 (Sidebar, Header, Workspace)
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

### 阶段 4：高级特性 (Week 9-12)

**目标**: 实现差异化功能

#### Week 9: LSP 集成
- [ ] LSP 客户端
- [ ] 代码补全
- [ ] 跳转到定义
- [ ] 诊断信息显示

#### Week 10: MCP 支持
- [ ] MCP 插件系统
- [ ] 插件管理界面
- [ ] OAuth 回调处理
- [ ] 示例插件

#### Week 11: 终端集成
- [ ] xterm.js 集成
- [ ] PTY 管理
- [ ] 命令执行 API
- [ ] 输出流处理

#### Week 12: 实时同步
- [ ] WebSocket 服务器
- [ ] 客户端 WebSocket
- [ ] 实时消息推送
- [ ] 文件变更同步

### 阶段 5：测试与优化 (Week 13-14)

**目标**: 保证质量和性能

#### Week 13: 测试
- [ ] 单元测试 (Vitest)
- [ ] 集成测试
- [ ] E2E 测试 (Playwright)
- [ ] 覆盖率 80%+

#### Week 14: 性能优化
- [ ] 代码分割
- [ ] 懒加载
- [ ] 缓存策略
- [ ] 数据库优化
- [ ] CDN 配置

### 阶段 6：部署与文档 (Week 15-16)

**目标**: 上线生产环境

#### Week 15: 部署
- [ ] Cloudflare 配置
- [ ] 数据库迁移
- [ ] 环境变量配置
- [ ] CI/CD 流水线
- [ ] 监控和日志

#### Week 16: 文档和发布
- [ ] API 文档
- [ ] 用户手册
- [ ] 开发者文档
- [ ] 示例项目
- [ ] 发布 v1.0

### 关键里程碑

| 里程碑 | 目标 | 完成标准 |
|--------|------|----------|
| M1: MVP | 基础功能可用 | 可以创建项目、发送消息、AI 响应 |
| M2: Alpha | 核心功能完整 | 文件操作、多 Agent、权限系统 |
| M3: Beta | 高级特性完成 | LSP、MCP、终端、实时同步 |
| M4: RC | 测试完成 | 80% 覆盖率、性能达标 |
| M5: v1.0 | 生产就绪 | 部署上线、文档完善 |

---

## 8. 关键实现细节

### 8.1 流式响应处理

```typescript
// services/ai/stream.ts

import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export async function streamResponse(
  messages: Message[],
  model: string = 'claude-sonnet-4-5'
) {
  const result = await streamText({
    model: anthropic(model),
    messages,
    temperature: 0.7,
    maxTokens: 4096,
  });

  return result.toDataStreamResponse();
}

// API 端点使用
app.post('/api/sessions/:id/messages', async (c) => {
  const { content } = await c.req.json();
  const session = await getSession(c.req.param('id'));

  const response = await streamResponse([
    ...session.messages,
    { role: 'user', content }
  ]);

  return response;
});
```

### 8.2 工具调用实现

```typescript
// tools/index.ts

import { Tool } from 'ai';

export const fileReadTool: Tool = {
  description: '读取文件内容',
  parameters: z.object({
    path: z.string().describe('文件路径'),
  }),
  execute: async ({ path }) => {
    const content = await fs.readFile(path, 'utf-8');
    return { content };
  },
};

export const fileWriteTool: Tool = {
  description: '写入文件内容',
  parameters: z.object({
    path: z.string().describe('文件路径'),
    content: z.string().describe('文件内容'),
  }),
  execute: async ({ path, content }) => {
    await fs.writeFile(path, content, 'utf-8');
    return { success: true };
  },
};

export const fileSearchTool: Tool = {
  description: '搜索文件内容',
  parameters: z.object({
    query: z.string().describe('搜索查询'),
    path: z.string().optional().describe('搜索路径'),
    filePattern: z.string().optional().describe('文件模式'),
  }),
  execute: async ({ query, path = '.', filePattern = '**/*' }) => {
    const results = await searchFiles(query, path, filePattern);
    return { results };
  },
};

// 在 Agent 中使用
const result = await streamText({
  model: anthropic('claude-sonnet-4-5'),
  messages,
  tools: {
    readFile: fileReadTool,
    writeFile: fileWriteTool,
    searchFiles: fileSearchTool,
  },
});
```

### 8.3 权限系统

```typescript
// services/permissions.ts

interface PermissionRule {
  agentType?: string;
  resourceType: 'file' | 'directory' | 'command';
  pattern: string; // glob pattern
  action: 'allow' | 'deny' | 'ask';
}

export class PermissionManager {
  private rules: PermissionRule[] = [];

  addRule(rule: PermissionRule) {
    this.rules.push(rule);
  }

  check(
    agentType: string,
    resourceType: string,
    resourcePath: string
  ): 'allow' | 'deny' | 'ask' {
    // 按优先级排序规则
    const sortedRules = this.rules
      .filter(r => !r.agentType || r.agentType === agentType)
      .filter(r => r.resourceType === resourceType)
      .sort((a, b) => {
        // 具体规则优先于通配符
        const aSpecificity = a.pattern.split('/').length;
        const bSpecificity = b.pattern.split('/').length;
        return bSpecificity - aSpecificity;
      });

    for (const rule of sortedRules) {
      if (this.matchPattern(resourcePath, rule.pattern)) {
        return rule.action;
      }
    }

    // 默认策略：询问
    return 'ask';
  }

  private matchPattern(path: string, pattern: string): boolean {
    // 使用 minimatch 或类似库
    const minimatch = require('minimatch');
    return minimatch(path, pattern);
  }
}

// 使用示例
const pm = new PermissionManager();

// BuildAgent 可以读写 src/
pm.addRule({
  agentType: 'build',
  resourceType: 'file',
  pattern: 'src/**/*',
  action: 'allow',
});

// PlanAgent 只能读取
pm.addRule({
  agentType: 'plan',
  resourceType: 'file',
  pattern: '**/*',
  action: 'ask',
});

pm.addRule({
  agentType: 'plan',
  resourceType: 'file',
  pattern: '**/*.ts',
  action: 'allow', // 只允许读取
});

// 检查权限
const decision = pm.check('build', 'file', 'src/components/App.tsx');
// 返回 'allow'
```

### 8.4 LSP 客户端

```typescript
// services/lsp/client.ts

import { createClient } from 'lsp-client';

export class LSPManager {
  private clients: Map<string, any> = new Map();

  async startServer(language: string, command: string, args: string[]) {
    const client = createClient({
      command,
      args,
      cwd: process.cwd(),
    });

    await client.start();
    this.clients.set(language, client);

    // 等待服务器初始化
    await this.waitForInitialized(client);
  }

  async getCompletions(
    language: string,
    file: string,
    line: number,
    column: number
  ) {
    const client = this.clients.get(language);
    if (!client) return [];

    const result = await client.completion(file, line, column);
    return result.items;
  }

  async getDefinition(
    language: string,
    file: string,
    line: number,
    column: number
  ) {
    const client = this.clients.get(language);
    if (!client) return null;

    const result = await client.definition(file, line, column);
    return result;
  }

  private async waitForInitialized(client: any) {
    return new Promise((resolve) => {
      client.onNotification('window/logMessage', () => {
        // 服务器已初始化
        resolve(true);
      });
    });
  }
}
```

### 8.5 WebSocket 实时同步

```typescript
// services/sync/server.ts

import { WebSocket } from 'bun';

export class SyncServer {
  private clients: Map<string, WebSocket> = new Map();

  handleUpgrade(req: Request) {
    const upgrade = req.headers.get('Upgrade');
    if (upgrade !== 'websocket') return null;

    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) return null;

    const server = Bun.serve<{
      sessionId: string;
    }>({
      fetch: (req, server) => {
        const upgraded = server.upgrade(req);
        if (!upgraded) return new Response('Upgrade failed', { status: 500 });
        return new Response('Upgrade successful');
      },
      websocket: {
        message: (ws, message) => {
          // 处理客户端消息
          const data = JSON.parse(message.toString());

          switch (data.type) {
            case 'ping':
              ws.send(JSON.stringify({ type: 'pong' }));
              break;
            // ...
          }
        },
        open: (ws) => {
          console.log('Client connected');
          this.clients.set(sessionId!, ws);
        },
        close: (ws) => {
          console.log('Client disconnected');
          this.clients.delete(sessionId!);
        },
      },
    });

    return server;
  }

  broadcast(sessionId: string, message: any) {
    const client = this.clients.get(sessionId);
    if (client) {
      client.send(JSON.stringify(message));
    }
  }
}

// 在 API 中使用
const syncServer = new SyncServer();

app.post('/api/sessions/:id/messages', async (c) => {
  const sessionId = c.req.param('id');
  const { content } = await c.req.json();

  // 发送开始事件
  syncServer.broadcast(sessionId, {
    type: 'agent_start',
    agentType: 'build',
  });

  // 调用 AI
  const response = await streamResponse(...);

  // 发送进度更新
  syncServer.broadcast(sessionId, {
    type: 'agent_progress',
    progress: 50,
  });

  // ...
});
```

### 8.6 文件搜索实现

```typescript
// services/files/search.ts

import { glob } from 'glob';
import { readFile } from 'fs/promises';
import * as ignore from 'ignore';

interface SearchResult {
  filePath: string;
  lineNumber: number;
  content: string;
  matches: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export async function searchFiles(
  query: string,
  path: string = '.',
  options: {
    filePattern?: string;
    caseSensitive?: boolean;
    regex?: boolean;
    maxResults?: number;
  } = {}
): Promise<SearchResult[]> {
  const {
    filePattern = '**/*',
    caseSensitive = false,
    regex = false,
    maxResults = 100,
  } = options;

  // 加载 .gitignore
  const ig = ignore();
  try {
    const gitignore = await readFile('.gitignore', 'utf-8');
    ig.add(gitignore);
  } catch {
    // 忽略错误
  }

  // 匹配文件
  const files = await glob(filePattern, {
    cwd: path,
    ignore: ['**/node_modules/**', '**/.git/**'],
  });

  const results: SearchResult[] = [];
  let resultCount = 0;

  for (const file of files) {
    if (resultCount >= maxResults) break;
    if (ig.ignores(file)) continue;

    try {
      const content = await readFile(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const matches = findMatches(line, query, { caseSensitive, regex });

        if (matches.length > 0) {
          results.push({
            filePath: file,
            lineNumber: i + 1,
            content: line,
            matches,
          });
          resultCount++;

          if (resultCount >= maxResults) break;
        }
      }
    } catch {
      // 忽略读取错误
    }
  }

  return results;
}

function findMatches(
  text: string,
  query: string,
  options: { caseSensitive: boolean; regex: boolean }
) {
  const { caseSensitive, regex } = options;
  const matches: Array<{ start: number; end: number; text: string }> = [];

  const searchRegex = regex
    ? new RegExp(query, caseSensitive ? 'g' : 'gi')
    : new RegExp(escapeRegExp(query), caseSensitive ? 'g' : 'gi');

  let match;
  while ((match = searchRegex.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
    });
  }

  return matches;
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

---

## 9. 部署策略

### 9.1 Cloudflare 部署

#### SST 配置
```typescript
// sst.config.ts

export default {
  config(input) {
    return {
      name: 'opencode-web',
      region: 'us-east-1',
      profile: 'default',
      stage: input.stage || 'dev',
    };
  },
  stacks(app) {
    app.stack(function api({ stack }) {
      // API Worker
      const api = new Worker(stack, 'ApiWorker', {
        handler: './src/server.ts',
        bindings: {
          DATABASE: new Database(stack, 'Database', {
            databaseName: 'opencode',
          }),
          BUCKET: new Bucket(stack, 'Bucket'),
        },
        url: true,
      });

      // 站点
      new Site(stack, 'Site', {
        url: api.url,
      });
    });
  },
};
```

#### Worker 脚本
```typescript
// src/server.ts

import { Hono } from 'hono';
import { bearerAuth } from 'hono/bearer-auth';

type Bindings = {
  DATABASE: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// 认证中间件
app.use('*', bearerAuth({ token: (c) => c.env.JWT_SECRET }));

// 路由
app.get('/api/projects', async (c) => {
  const { results } = await c.env.DATABASE.prepare(
    'SELECT * FROM projects'
  ).all();

  return c.json(results);
});

// 文件上传
app.put('/api/files/:path', async (c) => {
  const path = c.req.param('path');
  const content = await c.req.arrayBuffer();

  await c.env.BUCKET.put(path, content);

  return c.json({ success: true });
});

export default app;
```

### 9.2 环境变量

```bash
# .env.production
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://host:6379
JWT_SECRET=your-secret-key
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
R2_BUCKET_NAME=opencode-files
```

### 9.3 CI/CD 流水线

```yaml
# .github/workflows/deploy.yml

name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      - run: bun install
      - run: bun test
      - run: bun run typecheck

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build
      - name: Deploy to Cloudflare
        run: bunx sst deploy --stage production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

---

## 10. 测试策略

### 10.1 单元测试

```typescript
// __tests__/services/permissions.test.ts

import { describe, it, expect } from 'vitest';
import { PermissionManager } from '@/services/permissions';

describe('PermissionManager', () => {
  it('should allow file access when rule matches', () => {
    const pm = new PermissionManager();
    pm.addRule({
      agentType: 'build',
      resourceType: 'file',
      pattern: 'src/**/*',
      action: 'allow',
    });

    const decision = pm.check('build', 'file', 'src/components/App.tsx');
    expect(decision).toBe('allow');
  });

  it('should deny when no rule matches', () => {
    const pm = new PermissionManager();
    const decision = pm.check('build', 'file', 'unknown.txt');
    expect(decision).toBe('ask'); // 默认
  });
});
```

### 10.2 集成测试

```typescript
// __tests__/api/sessions.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { serve } from 'bun';
import { api } from '@/server';

describe('Sessions API', () => {
  let server: any;

  beforeAll(() => {
    server = serve({
      port: 3001,
      fetch: api.fetch,
    });
  });

  afterAll(() => {
    server.stop();
  });

  it('should create a session', async () => {
    const response = await fetch('http://localhost:3001/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: 'proj-123',
        agentType: 'build',
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data.agentType).toBe('build');
  });
});
```

### 10.3 E2E 测试

```typescript
// e2e/project.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Project Management', () => {
  test('should create a new project', async ({ page }) => {
    await page.goto('/');
    await page.click('text=创建新项目');

    await page.fill('input[name="name"]', 'Test Project');
    await page.fill('input[name="path"]', '/tmp/test-project');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/projects/proj-*');
    await expect(page.locator('h1')).toContainText('Test Project');
  });

  test('should send a message to AI', async ({ page }) => {
    await page.goto('/projects/proj-123/sessions/sess-456');

    await page.fill('textarea[placeholder="输入你的问题..."]', 'Hello AI');
    await page.click('button[aria-label="Send"]');

    // 等待 AI 响应
    await expect(page.locator('.message-assistant')).toBeVisible();
    await expect(page.locator('.message-assistant .message-content')).toContainText(
      /Hello/i
    );
  });
});
```

### 10.4 测试覆盖率目标

| 类型 | 目标覆盖率 | 工具 |
|------|-----------|------|
| 单元测试 | 80%+ | Vitest |
| 集成测试 | 70%+ | Vitest |
| E2E 测试 | 关键流程 100% | Playwright |

---

## 附录

### A. 技术对比

| 技术 | OpenCode 选择 | 本方案选择 | 原因 |
|------|---------------|-----------|------|
| 前端框架 | SolidJS | SolidJS | 高性能、细粒度响应 |
| 构建工具 | Vite | Vite | 快速、现代 |
| 后端框架 | Hono | Hono | Cloudflare 原生 |
| 运行时 | Bun | Bun | 极速、TypeScript 原生 |
| AI SDK | Vercel AI SDK | Vercel AI SDK | 多提供商支持 |
| 数据库 | MySQL + Drizzle | PostgreSQL + Drizzle | 更强大的功能 |
| ORM | Drizzle | Drizzle | 类型安全、轻量 |

### B. 参考资源

- [SolidJS 文档](https://www.solidjs.com/)
- [Hono 文档](https://hono.dev/)
- [Vercel AI SDK 文档](https://sdk.vercel.ai/)
- [Drizzle ORM 文档](https://orm.drizzle.team/)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [SST 文档](https://sst.dev/)
- [OpenCode 源码](vendor/opencode/)

### C. 常见问题

**Q: 为什么选择 SolidJS 而不是 React？**
A: SolidJS 具有更细粒度的响应式系统，性能更优，且无需虚拟 DOM。对于需要频繁更新的聊天界面和文件编辑器，SolidJS 能提供更流畅的用户体验。

**Q: 为什么选择 Cloudflare Workers 而不是 Vercel/AWS Lambda？**
A: Cloudflare Workers 提供全球边缘计算网络，延迟更低。同时，它与 Hono 完美集成，开发体验更好。

**Q: 数据库为什么选择 PostgreSQL 而不是 MySQL？**
A: PostgreSQL 提供更强大的 JSON 支持、全文搜索、并发控制等特性，更适合复杂的数据模型和查询需求。

**Q: 如何实现离线功能？**
A: 可以使用 Service Worker + IndexedDB 实现离线缓存。SolidJS 可以配合 PWA 插件实现离线优先的应用。

**Q: 如何保证 AI 响应的安全性？**
A: 通过权限系统控制 Agent 的访问范围，对敏感操作（如文件写入、命令执行）使用 "ask" 策略，需要用户确认。

---

## 总结

本开发计划提供了从零开始构建 OpenCode Web 应用的完整路线图和架构设计。关键要点：

1. **技术栈**: SolidJS + Bun + Hono + Vercel AI SDK + Cloudflare
2. **架构**: 客户端-服务端分离，支持实时同步
3. **开发周期**: 16 周，分为 6 个阶段
4. **核心功能**: 多 AI 提供商、多 Agent、文件操作、会话管理、LSP/MCP、终端集成
5. **部署**: Cloudflare Workers + Pages
6. **测试**: 单元 + 集成 + E2E，80%+ 覆盖率

通过遵循此计划，您可以构建一个功能完善、性能优秀的 AI 编程助手 Web 应用。
