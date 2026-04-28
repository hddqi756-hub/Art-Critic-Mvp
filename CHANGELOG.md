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

## [v1.0.8] - 2026-04-28

### 新增

- 新增 `src/lib/imageEdit.ts`，封装 GPT-Image-2 教学修图请求结构、提示词构造和预算估算能力。
- 新增“真实修图调用准备”面板，支持选择编辑模式（自动保护 / Mask 精修）、质量、尺寸，并实时展示请求 JSON。
- 新增“生成修图结果（占位）”入口，用于串联“红线示范 -> 用户确认 -> 真实修图调用”的闭环。

### 变更

- 调整 `src/App.tsx`，将 issue 数据直接映射为可执行的 edit prompt，确保诊断结果可落到 image edit 请求。
- 增强页面样式，补充修图参数区与表单控件布局。

## [v1.0.7] - 2026-04-28

### 新增

- 新增最小可运行的 Vite + React 前端工作台：上传作品后只输出 3 个主问题，并进入“AI 绘画老师”学习流程。
- 新增 `src/App.tsx` 工作流页面，包含学习状态文案、问题列表、局部红线示范触发、教学区和局部对比区。
- 新增 `react-konva` 标注渲染：支持 box、line、arrow、text 四类 annotation 的可视化展示。
- 新增 Debug 面板：显示完整 task JSON 以及 provider/model/mock/imageApiCalled 等调试字段。
- 新增全中文界面文案，明确提示“当前为红线示范，未调用真实修图模型”。

### 变更

- `src/types.ts` 的 `Annotation` 数据结构新增 `issueId`，用于问题与标注的一对多关联。
- 前后对比区默认围绕 `editRegion` 展示局部流程，不再以整图缩略图表达局部修正。

### 修复

- 补齐 `src/main.tsx` 和页面样式文件，修复 `npm run build` 因缺少入口而失败的问题。

## [v1.0.4] - 2026-04-28

### 新增

- 新增局部示范真实裁剪链路：`generate-selected` 会根据选中问题的编辑区域生成 `beforeCropUrl`、`maskUrl`、`fullPreviewUrl` 和 mock `afterCropUrl`。
- 新增 `editRegion` / `maskSuggestion`，将视觉定位用的 `bbox` 与真正用于局部编辑的区域分离。
- 新增 mask 预览图和局部裁剪图，前端不再用整张图缩小显示来冒充局部对比。
- 结果页重构为“老师批改工作台”：顶部状态栏、左侧画布工作区、右侧问题操作区、底部教学区。
- 画布工作区新增四个 Tab：原图诊断、局部修正、前后对比、练习任务。
- 问题卡片新增严重程度、影响部位、白话解释、专业术语、查看位置和“只修这个问题”操作。
- 前后对比支持真实图片滑块；如果没有生成修改图，会明确提示先生成局部示范。

### 变更

- 任务状态扩展为更贴近产品流程的 `uploaded / analyzing / marked / waiting_selection / generating_local_demo / partial_done / done / failed`。
- 前端任务恢复和轮询改为使用 `/api/task/:id`，同时保留 `/result/:taskId` 和 `localStorage` 恢复机制。
- `generate-selected` 返回结构补充 `task_id` 和 `localDemos`，每个 local demo 包含局部图、mask、预览图、提示词和解释。
- Mock 局部示范会明确标记为 `status: "mock"`，并在 UI 中提示“尚未接入真实图片编辑模型”。

### 已知问题

- `afterCropUrl` 当前仍是 mock 视觉示意图，不是真实 inpaint 结果。
- 尚未接入 OpenAI image edit、OpenRouter 图片编辑模型、ComfyUI 或本地 inpaint workflow。
- mask 目前由矩形 `editRegion` 自动生成，后续需要支持用户手动画笔 mask。

## [v1.0.3] - 2026-04-28

### 新增

- 新增用户参与式批改流程：上传作品后只做问题分析和图上标注，不再自动生成或重绘图片。
- 新增结构化 `problems` 数据，包含 `id`、`title`、`description`、`bbox` 和 `suggestion`，用于驱动问题选择和局部示范。
- 新增 `POST /api/generate-selected` 接口，支持前端提交 `task_id` 和 `selected_problem_ids` 后再生成局部修改示范。
- 新增结果页问题选择 UI：支持勾选问题、点击问题高亮对应红框区域，并由用户主动触发“生成修改示范”。
- 新增三种结果查看模式：原图标注、局部对比、修改前后。
- 新增任务恢复能力：前端使用 `localStorage` 保存最近一次 `task_id`，并将结果页地址同步为 `/result/:taskId`，刷新页面后可恢复任务。
- 新增 `localDemos` 和 `selectedProblemIds` 任务字段，用于记录用户选择的问题和已生成的局部示范结果。

### 变更

- `/api/analyze` 从“分析后自动生成示范图”改为“只分析问题并等待用户选择”，避免 AI 一键全图重绘导致风格、人设和用户参与感丢失。
- Mock AI 流程调整为 `pending -> analyzing -> marking -> done`，局部示范生成单独通过 `generate-selected` 进入 `generating_local_demo`。
- 结果页从“批改完成展示页”调整为“问题诊断 + 用户选择 + 局部示范工作流”。
- 知识卡片不再在结果页自动调用真实 AI，先改为展示知识点标签，避免 mock 流程中出现隐式模型调用。
- 局部示范当前以 mock overlay / prompt 方式返回，接口和数据结构已为后续 inpaint 接入预留。

### 移除

- 移除上传后自动全局重绘的主流程。
- 移除结果页自动展示全局示范图作为默认产物的交互假设。

### 已知问题

- `generate-selected` 当前仍是 mock 局部示范，尚未接入真实 inpaint / 图片编辑模型。
- 局部对比目前以 bbox 标注和文字示范为主，尚未裁剪真实局部图块或生成局部前后图像。
- 二次批改入口已有 UI 位置，但尚未实现“原图 vs 修改版”的对比分析接口。

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
# v1.0.5 - 2026-04-28

## v1.0.6 - 2026-04-28

### 新增

- 升级 AI 老师系统提示词：加入“第一眼画作定位 -> 分维度诊断 -> 隐性错误检查 -> 优点与下一步”的完整教师分析流程。
- 分析结果新增 `strengths`、`style`、`can_demo`、`next_step_suggestion` 字段，用于正向反馈和下一步练习引导。
- OpenAI Responses 调用启用 JSON 输出格式，并接入 `web_search` 工具；Chat Completions 调用启用 `response_format: { type: "json_object" }`。
- 前端新增优点与下一步提示条，避免结果页只挑错。

### 变更

- 后端兼容新旧分析字段：`professional_explanation / beginner_explanation / knowledge_tag / suggestion / local_fixes.related_issue_id` 会映射进现有红线示范流程。
- 系统仍只选取最重要的 3 个问题进入教学和红线示范，避免问题列表过载。

## 新增

- 新增“AI 绘画老师”数据结构：每次分析只保留 3 个主问题，每个问题包含白话原因、绘画知识点、视觉症状、3 步内修改步骤、bbox、editRegion、annotations、cropPrompt 和 practice。
- 新增基于原图的局部红线示范：`POST /api/generate-selected` 现在生成真实局部裁剪图和老师红线 overlay，不再默认调用图片编辑模型。
- 新增 annotation 渲染能力，支持 box、arrow、line、paint、text 数据，前端用 `react-konva` / SVG 进行定位展示。
- 新增 Debug 面板，展示当前 task JSON、AI provider、analysis model、image model、edit model、图片 API 是否真实调用、是否 mock。

## 变更

- 批改流程调整为：上传作品 -> 找 3 个主问题 -> 定位批注 -> 局部红线示范 -> 用户确认后再进入真实修图。
- 前端结果页全部中文化，状态栏改为学习流程文案，不再展示偏工程化的接口状态。
- 前后对比改为局部 crop 对比滑块，默认展示“原局部 vs 老师红线示范”，不再用整图缩略图冒充局部细节。
- `/api/analyze` prompt 改为老师批改 schema，明确要求 bbox 只用于定位，editRegion 用于裁剪/编辑。
- `/api/generate-selected` 明确标记 `imageApiCalled: false`，UI 展示“当前为红线示范，未调用真实修图模型”。

## 已知问题

- 真实 inpaint 仍保留为二段动作，需要用户进入“真实修图”手动画 mask 后才会调用图片编辑模型。
- 红线 overlay 目前由后端按 annotation 数据绘制，后续可继续增强为可拖拽、可编辑的教师批注层。
