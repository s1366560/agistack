# AI 配置指南

## 概述

AgiStack 使用环境变量来配置 AI 提供商和模型。所有配置都在 `.env` 文件中管理。

## 配置步骤

### 1. 复制环境变量模板

```bash
cp .env.example .env
```

### 2. 配置 AI 提供商

在 `.env` 文件中设置以下变量：

```bash
# 选择 AI 提供商: anthropic, openai, google
AI_PROVIDER=anthropic

# 设置对应的 API Key
ANTHROPIC_API_KEY=sk-ant-your-key-here
# 或
OPENAI_API_KEY=sk-openai-your-key-here
# 或
GOOGLE_API_KEY=your-google-key-here
```

### 3. 选择模型（可选）

如果不指定，系统将使用提供商的默认模型：

```bash
# Anthropic (默认: claude-3-5-sonnet-20241022)
AI_MODEL=claude-3-5-sonnet-20241022

# OpenAI (默认: gpt-4o)
AI_MODEL=gpt-4o-mini

# Google (默认: gemini-2.0-flash-exp)
AI_MODEL=gemini-1.5-pro
```

### 4. 配置自定义 Base URL（可选）

如果需要使用代理服务器或自定义端点：

```bash
# 使用代理服务器
AI_BASE_URL=https://your-proxy.com

# 使用自定义 OpenAI 兼容端点
AI_BASE_URL=https://your-custom-endpoint.com/v1
```

**注意**: 如果不设置 `AI_BASE_URL`，系统将使用提供商的默认端点：
- Anthropic: `https://api.anthropic.com`
- OpenAI: `https://api.openai.com/v1`
- Google: `https://generativelanguage.googleapis.com`

## 可用模型

### Anthropic Claude

| 模型 | 说明 | 适用场景 |
|-----|------|---------|
| `claude-3-5-sonnet-20241022` | 最强大的模型 | 复杂任务、代码生成 |
| `claude-3-5-haiku-20241022` | 快速响应模型 | 简单查询、快速响应 |

### OpenAI GPT

| 模型 | 说明 | 适用场景 |
|-----|------|---------|
| `gpt-4o` | 最新的 GPT-4 模型 | 通用任务 |
| `gpt-4o-mini` | 快速轻量级模型 | 快速响应 |
| `gpt-4-turbo` | 之前的旗舰模型 | 兼容性需求 |

### Google Gemini

| 模型 | 说明 | 适用场景 |
|-----|------|---------|
| `gemini-2.0-flash-exp` | 实验性快速模型 | 快速响应 |
| `gemini-1.5-pro` | 稳定版本 | 通用任务 |

## 生成参数（可选）

### Temperature（温度）

控制响应的随机性：
- `0.0` - 完全确定性，适合代码生成
- `0.5` - 平衡，适合规划任务
- `0.7` - 更有创意，适合一般对话
- `1.0` - 高度创造性

```bash
AI_TEMPERATURE=0.7
```

### Max Tokens（最大令牌数）

限制响应长度：
- `2048` - 短响应
- `4096` - 标准响应（默认）
- `8192` - 长响应，适合代码生成
- `16384` - 超长响应

```bash
AI_MAX_TOKENS=4096
```

## Agent 类型特定的配置

系统会根据 Agent 类型自动调整参数：

### Build Agent
- **Temperature**: `0.3`（低随机性）
- **Max Tokens**: `8192`（更多代码）
- **适用**: 代码生成、重构、调试

### Plan Agent
- **Temperature**: `0.5`（中等）
- **Max Tokens**: `4096`（标准）
- **适用**: 项目规划、架构设计

### General Agent
- **Temperature**: `0.7`（高创造性）
- **Max Tokens**: `4096`（标准）
- **适用**: 一般对话、解释说明

## 切换提供商

### 从 Anthropic 切换到 OpenAI

```bash
# .env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-openai-your-key-here
AI_MODEL=gpt-4o
```

### 从 OpenAI 切换到 Google

```bash
# .env
AI_PROVIDER=google
GOOGLE_API_KEY=your-google-key-here
AI_MODEL=gemini-2.0-flash-exp
```

## 故障排除

### API Key 未找到错误

```
Error: AI API key for provider 'anthropic' not configured.
Please set ANTHROPIC_API_KEY in your .env file.
```

**解决方法**: 确保在 `.env` 文件中设置了对应提供商的 API Key。

### 模型不可用错误

```
Error: Model 'claude-3-5-sonnet-20241022' not found for provider 'anthropic'
```

**解决方法**: 检查模型名称是否正确，或使用提供商的默认模型。

### 连接超时

```
Error: Request timeout after 60000ms
```

**解决方法**: 增加 `AI_TIMEOUT` 值或检查网络连接。

## 配置示例

### 开发环境（使用默认端点）

```bash
# .env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-dev-key
AI_MODEL=claude-3-5-sonnet-20241022
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=4096
AI_BASE_URL=  # 留空使用默认
```

### 生产环境（使用代理）

```bash
# .env.production
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-prod-key
AI_MODEL=claude-3-5-sonnet-20241022
AI_TEMPERATURE=0.5
AI_MAX_TOKENS=8192
AI_MAX_RETRIES=5
AI_TIMEOUT=120000
AI_BASE_URL=https://your-proxy-server.com
```

### 使用自定义 OpenAI 兼容端点

```bash
# .env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-custom-key
AI_MODEL=gpt-4o
AI_BASE_URL=https://api.your-custom-endpoint.com/v1
```

### 测试环境（使用更便宜的模型）

```bash
# .env.test
AI_PROVIDER=openai
OPENAI_API_KEY=sk-test-key
AI_MODEL=gpt-4o-mini
AI_TEMPERATURE=0.3
AI_MAX_TOKENS=2048
```

## 高级配置

### 使用代理服务器

如果您的网络需要通过代理访问 AI API：

```bash
# .env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-key
AI_BASE_URL=http://localhost:8080/proxy/anthropic
```

### 使用 Azure OpenAI

```bash
# .env
AI_PROVIDER=openai
OPENAI_API_KEY=your-azure-key
AI_MODEL=gpt-4o
AI_BASE_URL=https://your-resource.openai.azure.com/openai/deployments/your-deployment
```

### 使用国内中转服务

```bash
# .env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-key
AI_BASE_URL=https://your-gateway.com/v1
```

## 默认端点

如果 `AI_BASE_URL` 未设置，系统将使用以下默认端点：

| 提供商 | 默认 Base URL |
|-----|--------------|
| Anthropic | `https://api.anthropic.com` |
| OpenAI | `https://api.openai.com/v1` |
| Google | `https://generativelanguage.googleapis.com` |

## 相关文件

- 配置代码: `packages/api/src/config/ai.config.ts`
- 环境变量模板: `.env.example`
- AI Provider: `packages/api/src/services/ai/`
- Agent 实现: `packages/api/src/services/agents/`
