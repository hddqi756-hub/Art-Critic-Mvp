import type { GlobalDemo, KnowledgeCard, LocalDemo, PracticeSet, ReviewTask } from '../types'

const callApi = async <T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<T> => {
  const response = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status}`)
  }
  const json = await response.json()
  return (json.data ?? json) as T
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
