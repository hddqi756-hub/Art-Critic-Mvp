# AI Art Tutor MVP

当前版本：`v0.6.0`

当前版本：`v1.0.2`

React + TypeScript 前端，Node.js + Express 后端，用于 AI 美术作品批改和示范图生成。

## 当前能力

- `POST /api/analyze`：接收图片上传，创建异步批改任务，并立即返回 `task_id`。
- `GET /api/task/:id`：轮询异步任务状态，状态包括 `pending`、`analyzing`、`generating`、`done`、`failed`。
- `GET /api/knowledge-card?tag=...&style=professional|friendly`：生成绘画知识卡片。
- `GET /api/submission/:id`：旧版 BullMQ submission 查询接口，保留用于兼容。
- `POST /api/submission/:id/retry/:demoId`：旧版示范图任务重试接口，保留用于兼容。
- `server/src/services/aiClient.js`：AI 适配层，支持 `openai` / `openrouter`。
- `server/src/services/taskManager.js`：轻量任务系统，使用 JSON 模拟数据库。
- `server/src/services/logger.js`：日志系统，记录请求参数、AI 返回和错误信息。
- 所有 `/api` 接口统一返回：

```json
{
  "success": true,
  "status": "done",
  "data": {},
  "error": null
}
```

## 环境变量

从 `server/.env.example` 复制一份到 `server/.env`，至少配置：

```bash
PORT=4000
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
OPENAI_ANALYSIS_MODEL=gpt-5.5
OPENAI_IMAGE_MODEL=gpt-image-2
```

切换 OpenRouter：

```bash
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openai/gpt-5.5
OPENROUTER_ANALYSIS_MODEL=openai/gpt-5.5
OPENROUTER_IMAGE_MODEL=openai/gpt-5.5
```

## 安装

```bash
npm install
cd server
npm install
```

## 启动

Windows 可直接双击：

```text
start-dev.bat
```

也可以手动启动：

```bash
npm run dev
```

```bash
cd server
npm run dev
```

如需旧版 BullMQ 图片队列，还需要 Redis 和 worker：

```bash
docker run -d --name redis -p 6379:6379 redis
cd server
npm run worker
```

前端地址：`http://localhost:5173`

API 健康检查：`http://localhost:4000/api/health`

## 验证

```bash
npm run lint
npm run build
cd server
npm run build
```

## 版本日志

版本日志从 `v1.0.1` 开始记录。后续新功能、修复、变更和已知问题统一记录在 `CHANGELOG.md`。
