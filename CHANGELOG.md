# 版本日志

本文件用于记录项目中所有值得追踪的功能、修复、变更和已知问题。

记录建议：

- `新增`：新功能、新页面、新接口、新脚本。
- `变更`：行为、界面、接口、模型或开发流程调整。
- `修复`：Bug 修复。
- `移除`：删除的功能、文件或依赖。
- `已知问题`：当前还没处理、后续需要跟进的限制。

## [0.1.0] - 2026-04-28

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
