# Agistack Runbook

运营手册 - 部署、监控和故障排除

## 目录

- [部署流程](#部署流程)
- [监控和告警](#监控和告警)
- [常见问题](#常见问题)
- [回滚流程](#回滚流程)
- [性能优化](#性能优化)
- [备份策略](#备份策略)

---

## 部署流程

### 生产环境部署

#### 1. 部署前检查

- [ ] 所有测试通过 (`npm run test:all`)
- [ ] 类型检查通过 (`bun run typecheck`)
- [ ] 构建成功 (`bun run build`)
- [ ] 环境变量已配置
- [ ] 数据库备份已创建
- [ ] 新功能已在 staging 环境验证

#### 2. 准备部署

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 检查版本
git log -1 --oneline

# 3. 安装依赖
pnpm install

# 4. 运行测试
bun run test:all
```

#### 3. 数据库迁移

```bash
# 1. 备份数据库
docker exec agistack-postgres pg_dump -U agistack agistack > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. 生成迁移文件
cd packages/api
bun run db:generate

# 3. 审查迁移文件
cat drizzle/[timestamp]-[name].sql

# 4. 运行迁移
bun run db:migrate

# 5. 验证迁移
bun run db:studio
```

#### 4. 构建和部署

```bash
# 1. 构建所有包
bun run build

# 2. 停止旧服务
docker-compose down

# 3. 启动新服务
docker-compose up -d

# 4. 检查服务状态
docker-compose ps
docker-compose logs -f
```

#### 5. 部署后验证

```bash
# 1. 健康检查
curl http://localhost:3001/api/health

# 2. 检查日志
docker-compose logs api | tail -100
docker-compose logs web | tail -100

# 3. 测试关键功能
# - 用户登录
# - 创建会话
# - 发送消息

# 4. 监控错误
docker-compose logs api | grep -i error
```

### 零停机部署

使用滚动更新策略:

```bash
# 1. 启动新容器
docker-compose up -d --no-deps --build api web

# 2. 等待新容器就绪
sleep 30

# 3. 停止旧容器
docker-compose up -d --remove-orphans

# 4. 验证
docker-compose ps
```

---

## 监控和告警

### 关键指标

#### 应用指标

| 指标 | 阈值 | 说明 |
|------|------|------|
| **响应时间** | < 500ms (p95) | API 请求响应时间 |
| **错误率** | < 1% | 5xx 错误率 |
| **吞吐量** | > 100 req/s | 每秒请求数 |
| **内存使用** | < 80% | 容器内存使用率 |
| **CPU 使用** | < 70% | 容器 CPU 使用率 |

#### 数据库指标

| 指标 | 阈值 | 说明 |
|------|------|------|
| **连接数** | < 80% | 最大连接数的 80% |
| **查询时间** | < 100ms (p95) | 慢查询阈值 |
| **死锁** | 0 | 不应有死锁 |
| **磁盘使用** | < 85% | 数据库磁盘使用率 |

#### 系统指标

| 指标 | 阈值 | 说明 |
|------|------|------|
| **磁盘空间** | < 85% | 服务器磁盘使用率 |
| **网络流量** | < 1 Gbps | 网络带宽使用 |
| **负载平均** | < CPU 核心数 * 2 | 系统负载 |

### 监控工具

#### 1. 应用日志

```bash
# 实时查看 API 日志
docker-compose logs -f api

# 查看错误日志
docker-compose logs api | grep ERROR

# 查看最近 1000 行日志
docker-compose logs api | tail -1000
```

#### 2. 数据库监控

```bash
# 使用 Drizzle Studio
cd packages/api
bun run db:studio

# 或使用 pgAdmin
open http://localhost:5051
```

#### 3. 容器监控

```bash
# 容器资源使用
docker stats

# 容器健康状态
docker-compose ps

# 容器详细信息
docker inspect agistack-api-1
```

#### 4. 性能监控

使用 **Vercel Analytics** 或类似工具:

- 页面加载时间
- API 响应时间
- 错误追踪
- 用户行为分析

### 告警设置

#### 告警渠道

1. **Email**: 关键告警
2. **Slack**: 警告和通知
3. **SMS**: 紧急告警

#### 告警规则

| 级别 | 条件 | 通知 |
|------|------|------|
| **Critical** | 服务宕机、错误率 > 5% | Email + SMS + Slack |
| **Warning** | 响应时间 > 1s、错误率 > 1% | Slack |
| **Info** | 部署完成、性能报告 | Email |

---

## 常见问题

### 应用问题

#### 问题: API 无法启动

**症状**:
```
Error: Cannot connect to database
```

**诊断**:
```bash
# 1. 检查数据库连接
docker exec agistack-postgres pg_isready -U agistack

# 2. 检查网络
docker network ls
docker network inspect agistack_default

# 3. 检查环境变量
docker-compose config | grep DATABASE_URL
```

**解决方案**:
```bash
# 1. 重启数据库
docker-compose restart postgres

# 2. 等待数据库就绪
sleep 10

# 3. 重启 API
docker-compose restart api

# 4. 检查日志
docker-compose logs api
```

#### 问题: 响应时间过长

**症状**: API 请求超过 5 秒

**诊断**:
```bash
# 1. 检查数据库查询
docker-compose logs api | grep "slow query"

# 2. 检查内存/CPU
docker stats

# 3. 检查连接数
docker exec agistack-postgres psql -U agistack -c "SELECT count(*) FROM pg_stat_activity;"
```

**解决方案**:
```bash
# 1. 重启应用
docker-compose restart api

# 2. 清理缓存
# (如果有 Redis)
docker-compose exec redis redis-cli FLUSHALL

# 3. 扩容资源
# 更新 docker-compose.yml 中的资源限制
```

#### 问题: 内存泄漏

**症状**: 内存使用持续增长

**诊断**:
```bash
# 1. 监控内存使用
docker stats --no-stream

# 2. 检查 Node.js 堆内存
docker exec agistack-api-1 node --inspect

# 3. 生成堆快照
# 使用 Chrome DevTools
```

**解决方案**:
```bash
# 1. 重启容器
docker-compose restart api

# 2. 定期重启 (临时方案)
# 添加到 crontab:
# 0 3 * * * docker-compose restart api

# 3. 修复内存泄漏 (长期方案)
# 使用 heapdump 和 memwatch 分析
```

### 数据库问题

#### 问题: 连接池耗尽

**症状**:
```
Error: sorry, too many clients already
```

**诊断**:
```bash
# 检查当前连接数
docker exec agistack-postgres psql -U agistack -c "
  SELECT count(*), state
  FROM pg_stat_activity
  GROUP BY state;
"
```

**解决方案**:
```bash
# 1. 杀死空闲连接
docker exec agistack-postgres psql -U agistack -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state = 'idle'
  AND state_change < now() - interval '5 minutes';
"

# 2. 增加最大连接数
# 编辑 postgresql.conf:
# max_connections = 200

# 3. 优化应用连接池
# 减少连接池大小或增加超时时间
```

#### 问题: 查询慢

**诊断**:
```bash
# 1. 启用慢查询日志
docker exec agistack-postgres psql -U agistack -c "
  ALTER SYSTEM SET log_min_duration_statement = 1000;
  SELECT pg_reload_conf();
"

# 2. 查看慢查询
docker-compose logs postgres | grep "duration:"
```

**解决方案**:
```bash
# 1. 分析查询计划
docker exec agistack-postgres psql -U agistack -c "
  EXPLAIN ANALYZE <your-query>;
"

# 2. 添加索引
# 根据查询计划添加必要的索引

# 3. 优化查询
# 使用 JOIN 代替子查询
# 避免 SELECT *
```

### 网络问题

#### 问题: CORS 错误

**症状**: 浏览器控制台显示 CORS 错误

**诊断**:
```bash
# 检查 CORS 配置
docker-compose logs api | grep CORS
```

**解决方案**:
```bash
# 1. 更新 .env 文件
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com

# 2. 重启 API
docker-compose restart api
```

#### 问题: WebSocket 断开

**诊断**:
```bash
# 1. 检查 WebSocket 连接
# 在浏览器开发者工具中:
# - Network tab -> WS column

# 2. 检查服务器日志
docker-compose logs api | grep -i websocket
```

**解决方案**:
```bash
# 1. 增加心跳间隔
# 在客户端和服务器端配置

# 2. 实现自动重连
# 使用指数退避算法

# 3. 检查负载均衡器配置
# 确保 WebSocket 支持
```

---

## 回滚流程

### 触发回滚的条件

- [ ] 关键功能无法使用
- [ ] 错误率 > 5%
- [ ] 性能严重下降
- [ ] 数据损坏

### 快速回滚

```bash
# 1. 立即回滚到上一个版本
git revert HEAD

# 2. 重新构建和部署
bun run build
docker-compose up -d --force-recreate

# 3. 验证
curl http://localhost:3001/api/health
```

### 数据库回滚

```bash
# 1. 回滚迁移
cd packages/api
bun run db:rollback

# 2. 验证数据完整性
bun run db:studio

# 3. 如果需要,恢复备份
docker exec -i agistack-postgres psql -U agistack < backup_20250124_120000.sql
```

### 回滚后检查

- [ ] 服务恢复正常
- [ ] 错误率降低
- [ ] 数据完整性
- [ ] 通知相关人员

---

## 性能优化

### 应用层优化

#### 1. 启用缓存

```typescript
// 使用 Redis 缓存
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function getCachedData(key: string) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const data = await fetchDataFromDB();
  await redis.setex(key, 3600, JSON.stringify(data));
  return data;
}
```

#### 2. 数据库查询优化

```typescript
// ❌ 慢: N+1 查询
const sessions = await db.select().from(sessions);
for (const session of sessions) {
  session.messages = await db.select().from(messages).where(eq(messages.sessionId, session.id));
}

// ✅ 快: 使用 JOIN
const sessions = await db
  .select()
  .from(sessions)
  .leftJoin(messages, eq(sessions.id, messages.sessionId));
```

#### 3. 代码分割

```typescript
// 懒加载组件
import { lazy } from 'solid-js';

const ChatInterface = lazy(() => import('./components/ChatInterface'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <ChatInterface />
    </Suspense>
  );
}
```

### 数据库优化

#### 1. 添加索引

```sql
-- 创建索引
CREATE INDEX idx_sessions_project_id ON sessions(project_id);
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- 查看索引使用情况
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan;
```

#### 2. 清理数据

```bash
# 定期清理旧数据
docker exec agistack-postgres psql -U agistack -c "
  DELETE FROM messages
  WHERE created_at < now() - interval '90 days';
"

# VACUUM 回收空间
docker exec agistack-postgres psql -U agistack -c "VACUUM ANALYZE;"
```

#### 3. 连接池优化

```typescript
// 配置连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,              // 最大连接数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 系统优化

#### 1. 增加资源

```yaml
# docker-compose.yml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

#### 2. 负载均衡

```nginx
# nginx.conf
upstream api_backend {
    server api1:3001;
    server api2:3001;
    server api3:3001;
}

server {
    location /api/ {
        proxy_pass http://api_backend;
    }
}
```

---

## 备份策略

### 数据库备份

#### 自动备份脚本

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
RETENTION_DAYS=30

# 创建备份
docker exec agistack-postgres pg_dump -U agistack agistack | gzip > \
  $BACKUP_DIR/backup_$DATE.sql.gz

# 删除旧备份
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# 上传到 S3 (可选)
# aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://backups/agistack/
```

#### 定时任务

```bash
# 添加到 crontab
crontab -e

# 每天凌晨 2 点备份
0 2 * * * /path/to/backup.sh
```

### 文件备份

```bash
# 备份上传的文件
rsync -avz /data/uploads/ /backups/uploads/

# 备份配置文件
tar -czf /backups/config_$(date +%Y%m%d).tar.gz .env docker-compose.yml
```

### 恢复流程

```bash
# 1. 停止应用
docker-compose stop api web

# 2. 恢复数据库
gunzip -c backup_20250124_020000.sql.gz | \
  docker exec -i agistack-postgres psql -U agistack

# 3. 恢复文件
rsync -avz /backups/uploads/ /data/uploads/

# 4. 启动应用
docker-compose start api web

# 5. 验证
curl http://localhost:3001/api/health
```

---

## 应急响应

### 事故响应流程

1. **检测** (1 分钟)
   - 监控告警
   - 用户报告

2. **确认** (5 分钟)
   - 验证问题
   - 评估影响范围

3. **响应** (10 分钟)
   - 执行应急方案
   - 通知相关人员

4. **恢复** (30 分钟)
   - 修复问题
   - 恢复服务

5. **复盘** (1 天)
   - 分析根本原因
   - 改进流程

### 联系信息

| 角色 | 姓名 | 联系方式 |
|------|------|----------|
| **技术负责人** | - | - |
| **运维负责人** | - | - |
| **产品负责人** | - | - |

### 应急联系人

- **24/7 热线**: -
- **Slack 频道**: #incidents
- **Email**: incidents@agistack.com

---

**文档版本**: 1.0
**最后更新**: 2026-01-24
**维护者**: DevOps Team
