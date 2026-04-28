# 版本日志

本文件用于记录项目中所有值得追踪的功能、修复、变更和已知问题。

版本规则：

- 从 `v1.0.1` 开始记录。
- 每次新增功能、架构调整、接口变化或重要修复，都新增一个版本段落。
- 新版本写在最上方。

记录分类：

- `新增`：新功能、新页面、新接口、新脚本。
- `变更`：行为、界面、接口、模型或开发流程调整。
- `修复`：Bug 修复。
- `移除`：删除的功能、文件或依赖。
- `已知问题`：当前还没处理、后续需要跟进的限制。

## [v1.0.2] - 2026-04-28

### 新增

- 新增 AI 适配层 `server/src/services/aiClient.js`，支持通过 `AI_PROVIDER=openai|openrouter` 切换服务商。
- 新增 `analyzeImage(imageUrl)` 和 `generateImage(prompt, imageUrl)` 两个统一 AI 方法，返回 `{ success, data, error }`。
- 新增任务系统 `server/src/services/taskManager.js`，使用 JSON 文件模拟数据库。
- 新增任务状态：`pending`、`analyzing`、`generating`、`done`、`failed`。
- 新增 `GET /api/task/:id` 任务轮询接口。
- 新增 `GET /api/tasks` 任务列表接口，便于开发调试。
- 新增日志系统 `server/src/services/logger.js`，记录请求参数、AI 返回和错误信息。
- 新增 `/api` 404 统一响应。
- 新增 `server/src/lib/apiResponse.ts`，用于统一 API 返回结构。

### 变更

- `/api/analyze` 改为异步任务模式：接收图片后立即返回 `task_id`，后台执行分析和生成。
- 批改流程调整为：创建任务 → GPT 分析 → 自动触发图片生成 → 更新任务为完成或失败。
- 前端提交后改为轮询 `/api/task/:id`，并显示“等待 / 分析中 / 生成中 / 完成 / 失败”等状态。
- 所有 API 统一返回 `{ success, status, data, error }` 格式。
- README 更新为中文，并补充 OpenAI / OpenRouter 环境变量说明。
- `.gitignore` 增加运行时文件忽略规则，避免提交 `.env`、日志和上传文件。

### 已知问题

- OpenRouter 的图片生成能力取决于所选模型；当前适配层会优先返回可用于图像生成的 prompt，未必一定返回图片 URL。
- 旧版 BullMQ submission 流程仍保留兼容，但主流程已切换到轻量任务系统。

## [v1.0.1] - 2026-04-28

### 新增

- 创建 AI 美术私教 MVP 初始版本，技术栈包含 React、TypeScript、Tailwind CSS、Express、BullMQ、Redis 和 OpenAI SDK。
- 新增图片上传界面，支持拖拽上传、点击选择、图片预览、提交状态和错误提示。
- 新增 `POST /api/analyze` 接口，用于上传作品图并调用 GPT-5.5 返回结构化批改结果。
- 新增 `GET /api/submission/:id` 接口，用于轮询作业状态。
- 新增 `POST /api/submission/:id/retry/:demoId` 接口，用于重试失败的示范图任务。
- 新增 BullMQ `image-generation` 队列和图像生成 Worker，支持全局重绘和基于 bbox 的局部修改。
- 新增本地上传目录 `server/uploads/`，并用轻量 JSON 文件模拟开发阶段的作业状态存储。
- 新增 `GET /api/knowledge-card?tag=...&style=professional|friendly` 接口，用于生成知识卡片。
- 新增前端批改结果页，包含原图/示范图对比滑块、示范图状态列表、问题摘要和知识卡片。
- 新增后端统一错误处理中间件。
- 新增前端 `useApiStatus` Hook，用于把后端错误映射为用户可读提示。
- 新增 `.env.example` 和 `server/.env.example`，用于配置 OpenAI、Redis 和端口。
- 新增 Windows 一键启动文件：`start-dev.bat` 和 `start-dev.ps1`。
- 新增项目 README，包含安装、启动和验证命令。

### 变更

- 使用 `OPENAI_ANALYSIS_MODEL` 和 `OPENAI_IMAGE_MODEL` 环境变量配置模型名称，避免在源码中硬编码。
- 默认图片生成模型设为 `gpt-image-2`，仍可通过 `.env` 改成锁定版本。
- Vite 开发服务器代理 `/api` 和 `/uploads` 到 Express 后端。

### 已知问题

- Redis 必须运行后，示范图生成任务和重试功能才能正常工作。
- `server/uploads/submissions.json` 只是开发阶段的临时存储，生产环境需要替换为数据库。
- AI 批改和图片生成需要在 `server/.env` 中配置有效的 `OPENAI_API_KEY`。
- Worker 是独立进程，需要和前端、后端服务一起启动。
