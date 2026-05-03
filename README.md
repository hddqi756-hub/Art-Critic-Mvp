# AI Art Tutor MVP

当前版本：`v0.6.0`

React + TypeScript 前端，Node.js + Express 后端，用于 AI 美术作品批改、局部示范、知识卡和作业卡生成。

## 当前能力

- Mock-first MVP 后端：没有真实 AI Key 也能完成上传、批改、局部/全局生成入口、知识卡和作业卡流程。
- 真实 AI 模式：配置 API Key 后，分析、图像编辑和图像生成可逐步切到真实调用。
- 离线演示模式：前端可保留本地降级展示，不阻塞主流程。
- API 契约见 `docs/API_CONTRACT.md`，所有 `/api` 接口统一返回 envelope。

主要接口：

- `POST /api/analyze`
- `POST /api/generate-selected`
- `POST /api/generate-global`
- `POST /api/generate-global-overlay`
- `POST /api/inpaint-local`
- `POST /api/inpaint-global`
- `POST /api/knowledge-card/generate-text`
- `POST /api/knowledge-card/generate-image`
- `POST /api/practice/generate-exercise`
- `POST /api/practice/generate-answer`

Deprecated 兼容接口仍保留：`GET /api/task/:id`、`GET /api/knowledge-card`、`GET /api/submission/:id`、`POST /api/submission/:id/retry/:demoId`。

## 安装

```bash
npm install
npm install --prefix server
```

## 启动

```bash
npm run dev:all
```

前端地址：`http://localhost:5173`

API 健康检查：`http://localhost:4000/api/health`

Vite 开发服务器会把 `/api`、`/uploads`、`/assets` 代理到 `http://localhost:4000`。如需改代理目标：

```bash
VITE_API_PROXY_TARGET=http://localhost:4000
```

可选本地 redraw 服务：

```bash
npm run dev:all-redraw
```

如果 `ai_redraw/` 不存在，脚本会给出清晰错误提示；普通开发请使用 `npm run dev:all`。

## 环境变量

从 `server/.env.example` 复制一份到 `server/.env`：

```bash
PORT=4000
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
OPENAI_ANALYSIS_MODEL=gpt-5.5
OPENAI_IMAGE_MODEL=gpt-image-2
```

不配置 API Key 时，系统走 Mock API / 降级路径。

## 验证

```bash
npm run smoke
npm run check
```

`npm run check` 会执行：

- `npm run smoke`
- `npm run check:web`
- `npm run check:server`

## 版本日志

见 `CHANGELOG.md` 和 `docs/更新日志.md`。
