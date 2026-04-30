import type { GlobalDemo, KnowledgeCard, LocalDemo, PracticeSet, ReviewTask } from '../types'

type ApiEnvelope<T> = {
  success?: boolean
  status?: string
  data?: T | { task?: T }
  error?: { message?: string } | string | null
}

const readJsonSafely = async (response: Response) => {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text) as ApiEnvelope<unknown>
  } catch {
    throw new Error(`接口返回的不是 JSON：${text.slice(0, 160)}`)
  }
}

const unwrapData = <T>(json: ApiEnvelope<T>) => {
  const data = json.data
  if (data && typeof data === 'object' && 'task' in data) {
    return (data as { task: T }).task
  }
  return (data ?? json) as T
}

const callApi = async <T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<T> => {
  const response = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await readJsonSafely(response)
  if (!response.ok || json.success === false) {
    const message = typeof json.error === 'string' ? json.error : json.error?.message
    throw new Error(message ?? `${path} failed: ${response.status}`)
  }
  return unwrapData<T>(json as ApiEnvelope<T>)
}

export const analyzeArtwork = (fileUrl: string) => callApi<ReviewTask>('/api/analyze', 'POST', { image_url: fileUrl })

export const generateSelectedOverlay = (taskId: string, problemId: string) =>
  callApi<LocalDemo>('/api/generate-selected', 'POST', { task_id: taskId, problem_id: problemId })

export const generateGlobalOverlay = (taskId: string, problemIds: string[]) =>
  callApi<GlobalDemo>('/api/generate-global-overlay', 'POST', { task_id: taskId, problem_ids: problemIds })

export const inpaintLocal = (taskId: string, problemId: string) =>
  callApi<LocalDemo>('/api/inpaint-local', 'POST', { task_id: taskId, problem_id: problemId })

export const inpaintGlobal = (taskId: string, problemIds: string[]) =>
  callApi<GlobalDemo>('/api/inpaint-global', 'POST', { task_id: taskId, problem_ids: problemIds })

export const postKnowledgeCardGenerateText = (taskId: string, issueId: string) =>
  callApi<KnowledgeCard>('/api/knowledge-card/generate-text', 'POST', { task_id: taskId, issue_id: issueId })

export const postKnowledgeCardGenerateImage = (taskId: string, issueId: string) =>
  callApi<KnowledgeCard>('/api/knowledge-card/generate-image', 'POST', { task_id: taskId, issue_id: issueId })

export const postPracticeGenerateExercise = (taskId: string, issueId: string) =>
  callApi<PracticeSet>('/api/practice/generate-exercise', 'POST', { task_id: taskId, issue_id: issueId })

export const postPracticeGenerateAnswer = (taskId: string, issueId: string) =>
  callApi<PracticeSet>('/api/practice/generate-answer', 'POST', { task_id: taskId, issue_id: issueId })
