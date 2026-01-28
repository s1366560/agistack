# WebSocket 聊天消息协议设计

## 概述

本文档定义了 Agistack WebSocket 聊天功能的消息协议。该协议设计用于替代现有的 SSE 流式传输,实现真正的双向实时通信。

## 设计原则

1. **向后兼容**: 保持与现有 SSE 数据结构相似
2. **类型安全**: 所有消息都有明确的类型字段
3. **错误处理**: 完善的错误处理和恢复机制
4. **扩展性**: 易于添加新功能而不破坏现有代码

## 消息类型

### 客户端发送的消息

#### 1. 聊天消息 (Chat Message)

客户端发送消息到会话,触发 AI 响应。

```typescript
{
  type: 'chat',
  sessionId: string,
  content: string,
  timestamp: string // ISO 8601
}
```

**示例:**
```json
{
  "type": "chat",
  "sessionId": "session_abc123",
  "content": "帮我创建一个用户认证系统",
  "timestamp": "2025-01-24T10:30:00.000Z"
}
```

#### 2. 订阅消息 (Subscribe)

客户端订阅特定会话,接收实时更新。

```typescript
{
  type: 'subscribe',
  sessionId: string
}
```

**示例:**
```json
{
  "type": "subscribe",
  "sessionId": "session_abc123"
}
```

#### 3. 取消订阅消息 (Unsubscribe)

客户端取消订阅会话。

```typescript
{
  type: 'unsubscribe',
  sessionId: string
}
```

**示例:**
```json
{
  "type": "unsubscribe",
  "sessionId": "session_abc123"
}
```

#### 4. 心跳消息 (Ping)

客户端发送心跳保持连接活跃。

```typescript
{
  type: 'ping'
}
```

**示例:**
```json
{
  "type": "ping"
}
```

### 服务器发送的消息

#### 1. 连接确认消息 (Connected)

服务器在客户端成功连接后发送。

```typescript
{
  type: 'connected',
  clientId: string,
  timestamp: string
}
```

**示例:**
```json
{
  "type": "connected",
  "clientId": "client_xyz789",
  "timestamp": "2025-01-24T10:30:00.000Z"
}
```

#### 2. 认证消息 (Authenticated)

服务器在客户端成功认证后发送。

```typescript
{
  type: 'authenticated',
  userId: string,
  timestamp: string
}
```

**示例:**
```json
{
  "type": "authenticated",
  "userId": "user_12345",
  "timestamp": "2025-01-24T10:30:00.000Z"
}
```

#### 3. 流式响应块 (Chunk)

服务器发送 AI 响应的内容块。

```typescript
{
  type: 'chunk',
  sessionId: string,
  content: string,
  done: boolean,
  timestamp: string
}
```

**示例:**
```json
{
  "type": "chunk",
  "sessionId": "session_abc123",
  "content": "我将帮您创建",
  "done": false,
  "timestamp": "2025-01-24T10:30:01.000Z"
}
```

#### 4. 完成消息 (Done)

服务器在 AI 响应完成后发送。

```typescript
{
  type: 'done',
  sessionId: string,
  timestamp: string
}
```

**示例:**
```json
{
  "type": "done",
  "sessionId": "session_abc123",
  "timestamp": "2025-01-24T10:30:05.000Z"
}
```

#### 5. 工具调用消息 (Tool Call)

服务器在 AI 调用工具时发送。

```typescript
{
  type: 'tool_call',
  sessionId: string,
  toolCall: {
    id: string,
    name: string,
    arguments: Record<string, any>
  },
  timestamp: string
}
```

**示例:**
```json
{
  "type": "tool_call",
  "sessionId": "session_abc123",
  "toolCall": {
    "id": "tool_001",
    "name": "read-file",
    "arguments": {
      "path": "/src/auth.ts"
    }
  },
  "timestamp": "2025-01-24T10:30:02.000Z"
}
```

#### 6. 错误消息 (Error)

服务器在发生错误时发送。

```typescript
{
  type: 'error',
  code: string,
  message: string,
  sessionId?: string,
  timestamp: string
}
```

**错误代码:**
- `SESSION_NOT_FOUND`: 会话不存在
- `UNAUTHORIZED`: 未授权
- `RATE_LIMITED`: 请求过于频繁
- `INTERNAL_ERROR`: 服务器内部错误
- `STREAM_INTERRUPTED`: 流式传输中断

**示例:**
```json
{
  "type": "error",
  "code": "SESSION_NOT_FOUND",
  "message": "Session 'session_abc123' not found",
  "sessionId": "session_abc123",
  "timestamp": "2025-01-24T10:30:00.000Z"
}
```

#### 7. 订阅确认 (Subscribed)

服务器确认客户端已订阅会话。

```typescript
{
  type: 'subscribed',
  sessionId: string,
  timestamp: string
}
```

**示例:**
```json
{
  "type": "subscribed",
  "sessionId": "session_abc123",
  "timestamp": "2025-01-24T10:30:00.000Z"
}
```

#### 8. 取消订阅确认 (Unsubscribed)

服务器确认客户端已取消订阅。

```typescript
{
  type: 'unsubscribed',
  sessionId: string,
  timestamp: string
}
```

**示例:**
```json
{
  "type": "unsubscribed",
  "sessionId": "session_abc123",
  "timestamp": "2025-01-24T10:30:00.000Z"
}
```

#### 9. 心跳响应 (Pong)

服务器响应客户端的心跳。

```typescript
{
  type: 'pong',
  timestamp: string
}
```

**示例:**
```json
{
  "type": "pong",
  "timestamp": "2025-01-24T10:30:00.000Z"
}
```

## 消息流程

### 标准聊天流程

```
客户端                                    服务器
  |                                        |
  |------- [1] 连接请求 ------------------>|
  |                                        |
  |<------ [2] connected ------------------|
  |                                        |
  |------- [3] 认证 (token) -------------->|
  |                                        |
  |<------ [4] authenticated -------------|
  |                                        |
  |------- [5] subscribe (session_id) --->|
  |                                        |
  |<------ [6] subscribed -----------------|
  |                                        |
  |------- [7] chat (content) ------------>|
  |                                        |
  |<------ [8] chunk (partial) -----------|
  |<------ [9] chunk (partial) -----------|
  |<------ [10] chunk (partial) ----------|
  |                                        |
  |<------ [11] done ---------------------|
  |                                        |
  |------- [12] ping ---------------------->|
  |                                        |
  |<------ [13] pong ----------------------|
```

### 多用户协作流程

```
客户端A                                   服务器                                    客户端B
  |                                         |                                          |
  |------- [1] subscribe (session_id) ---->|                                          |
  |                                         |                                          |
  |<------ [2] subscribed -----------------|                                          |
  |                                         |------- [3] subscribe (session_id) ---->|
  |                                         |                                          |
  |                                         |<------ [4] subscribed -----------------|
  |                                         |                                          |
  |------- [5] chat (content) ------------>|                                          |
  |                                         |------- [6] broadcast (chat msg) ------>|
  |                                         |                                          |
  |<------ [7] chunk (response) -----------|                                          |
  |<------ [8] done -----------------------|------- [9] broadcast (response) ------>|
  |                                         |                                          |
```

## 错误处理

### 连接错误

```typescript
// 服务器关闭连接
{
  type: 'error',
  code: 'UNAUTHORIZED',
  message: 'Invalid token',
  timestamp: '2025-01-24T10:30:00.000Z'
}

// 连接关闭事件: CloseEvent
{
  code: 4001, // 自定义关闭码
  reason: 'Missing authentication token'
}
```

### 消息错误

```typescript
// 客户端发送无效消息
{
  type: 'chat',
  sessionId: 'invalid_id',
  content: ''
}

// 服务器响应错误
{
  type: 'error',
  code: 'VALIDATION_ERROR',
  message: 'Content cannot be empty',
  sessionId: 'invalid_id',
  timestamp: '2025-01-24T10:30:00.000Z'
}
```

### 流式传输错误

```typescript
// AI 响应中断
{
  type: 'error',
  code: 'STREAM_INTERRUPTED',
  message: 'AI response interrupted',
  sessionId: 'session_abc123',
  timestamp: '2025-01-24T10:30:00.000Z'
}
```

## TypeScript 类型定义

```typescript
/**
 * WebSocket 聊天消息 - 客户端发送
 */
export type ClientMessage =
  | ChatMessage
  | SubscribeMessage
  | UnsubscribeMessage
  | PingMessage;

export interface ChatMessage {
  type: 'chat';
  sessionId: string;
  content: string;
  timestamp: string;
}

export interface SubscribeMessage {
  type: 'subscribe';
  sessionId: string;
}

export interface UnsubscribeMessage {
  type: 'unsubscribe';
  sessionId: string;
}

export interface PingMessage {
  type: 'ping';
}

/**
 * WebSocket 聊天消息 - 服务器发送
 */
export type ServerMessage =
  | ConnectedMessage
  | AuthenticatedMessage
  | ChunkMessage
  | DoneMessage
  | ToolCallMessage
  | ErrorMessage
  | SubscribedMessage
  | UnsubscribedMessage
  | PongMessage;

export interface ConnectedMessage {
  type: 'connected';
  clientId: string;
  timestamp: string;
}

export interface AuthenticatedMessage {
  type: 'authenticated';
  userId: string;
  timestamp: string;
}

export interface ChunkMessage {
  type: 'chunk';
  sessionId: string;
  content: string;
  done: boolean;
  timestamp: string;
}

export interface DoneMessage {
  type: 'done';
  sessionId: string;
  timestamp: string;
}

export interface ToolCallMessage {
  type: 'tool_call';
  sessionId: string;
  toolCall: {
    id: string;
    name: string;
    arguments: Record<string, any>;
  };
  timestamp: string;
}

export interface ErrorMessage {
  type: 'error';
  code: string;
  message: string;
  sessionId?: string;
  timestamp: string;
}

export interface SubscribedMessage {
  type: 'subscribed';
  sessionId: string;
  timestamp: string;
}

export interface UnsubscribedMessage {
  type: 'unsubscribed';
  sessionId: string;
  timestamp: string;
}

export interface PongMessage {
  type: 'pong';
  timestamp: string;
}

/**
 * 错误代码枚举
 */
export enum ErrorCode {
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  STREAM_INTERRUPTED = 'STREAM_INTERRUPTED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}
```

## 安全考虑

1. **认证**: 所有 WebSocket 连接必须提供有效的 JWT token
2. **授权**: 客户端只能订阅其有权限访问的会话
3. **速率限制**: 实施消息速率限制防止滥用
4. **输入验证**: 所有客户端消息必须经过验证
5. **错误信息**: 错误消息不应泄露敏感信息

## 实现注意事项

### 服务器端

1. 使用现有的 `WebSocketServer` 类
2. 添加聊天消息处理器到 `handleMessage` 方法
3. 实现频道订阅系统 (sessionId -> clients 映射)
4. 集成现有的 `AgentOrchestrator` 执行 AI 响应
5. 确保线程安全和并发控制

### 客户端

1. 扩展现有的 `WebSocketClient` 类
2. 添加 `sendChatMessage` 方法
3. 添加 `subscribeToSession` 方法
4. 实现流式响应处理
5. 保留 SSE 作为回退机制

### 性能优化

1. **消息批处理**: 批量发送小块内容减少网络往返
2. **压缩**: 启用 WebSocket 压缩扩展 (permessage-deflate)
3. **心跳优化**: 动态调整心跳间隔基于网络条件
4. **连接池**: 复用连接避免频繁建立/断开

## 测试策略

### 单元测试

- 测试每种消息类型的序列化/反序列化
- 测试消息验证逻辑
- 测试错误处理

### 集成测试

- 测试完整的聊天流程
- 测试多用户订阅和广播
- 测试错误恢复
- 测试回退到 SSE

### E2E 测试

- 测试真实浏览器环境
- 测试网络中断恢复
- 测试高并发场景

## 迁移策略

### 阶段 1: 并行运行

- 保留现有 SSE 实现
- 添加 WebSocket 支持
- 客户端优先尝试 WebSocket,失败时回退到 SSE

### 阶段 2: 逐步迁移

- 新功能使用 WebSocket
- 旧功能保持 SSE
- 收集性能和稳定性数据

### 阶段 3: 完全迁移

- 所有功能使用 WebSocket
- 移除 SSE 代码
- 更新文档和测试

## 参考资源

- [RFC 6455 - WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455)
- [MDN - Writing WebSocket servers](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers)
- [Hono - WebSocket guide](https://hono.dev/getting-started/websocket)
