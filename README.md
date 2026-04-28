# AI Art Tutor MVP

React + TypeScript frontend with an Express + BullMQ backend for AI artwork critique.

## What is included

- `POST /api/analyze`: uploads one image, calls OpenAI vision analysis, returns structured JSON.
- `GET /api/submission/:id`: polls analysis and demo-image generation status.
- `POST /api/submission/:id/retry/:demoId`: retries a failed demo-image job.
- `GET /api/knowledge-card?tag=...&style=professional|friendly`: creates bilingual-style teaching cards and illustration prompts.
- BullMQ worker for global and local demo images with transparent bbox masks.
- Local file storage under `server/uploads/`, including a lightweight JSON submission store for dev.

## Setup

Create `server/.env` from `server/.env.example` and set:

```bash
OPENAI_API_KEY=your_openai_api_key
OPENAI_ANALYSIS_MODEL=gpt-5.5
OPENAI_IMAGE_MODEL=gpt-image-2
```

Install dependencies:

```bash
npm install
cd server
npm install
```

Start Redis:

```bash
docker run -d --name redis -p 6379:6379 redis
```

Run the app in three terminals:

```bash
npm run dev
```

```bash
cd server
npm run dev
```

```bash
cd server
npm run worker
```

Frontend: `http://localhost:5173`

API health check: `http://localhost:4000/api/health`

## Verification

```bash
npm run lint
npm run build
cd server
npm run build
```

## 版本日志

后续新功能、修复、变更和已知问题统一记录在 `CHANGELOG.md`。
