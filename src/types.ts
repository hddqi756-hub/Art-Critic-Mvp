export type RectPercent = {
  x: number
  y: number
  width: number
  height: number
}

export type Annotation = {
  id: string
  issueId: string
  type: 'box' | 'arrow' | 'line' | 'paint' | 'text'
  color?: string
  label?: string
  rect?: RectPercent
  points?: number[]
}

export type Severity = '高' | '中' | '低'

export type CritiqueIssue = {
  id: string
  title: string
  severity: Severity
  bodyPart: string
  category: string
  student_friendly_reason: string
  art_principle: string
  visual_symptom: string
  fix_steps: string[]
  bbox: RectPercent
  editRegion: RectPercent
  annotations: Annotation[]
  cropPrompt: string
  practice: string
}

export type LocalDemo = {
  id: string
  issueId: string
  status: 'teacher_overlay' | 'mock' | 'real_inpaint'
  beforeCropLabel: string
  afterLabel: string
  explanation: string
  imageApiCalled: boolean
  prompt: string
}

export type AiMeta = {
  provider: string
  analysisModel: string
  imageModel: string
  editModel: string
  mode: 'real_ai' | 'mock_fallback'
  imageApiCalled: boolean
  mock: boolean
  warning?: string
}

export type TaskLog = {
  time: string
  status: string
  message: string
}

export type ReviewTask = {
  id: string
  status:
    | 'uploaded'
    | 'analyzing'
    | 'marked'
    | 'waiting_selection'
    | 'generating_local_demo'
    | 'partial_done'
    | 'done'
    | 'failed'
  imageUrl: string
  goal?: string
  artworkType?: string
  problems: CritiqueIssue[]
  selectedProblemIds: string[]
  localDemos: LocalDemo[]
  aiMeta: AiMeta
  logs: TaskLog[]
  error?: string
  createdAt: string
  updatedAt: string
}

export type ApiResponse<T> = {
  success: boolean
  status: string
  data: T
  error: { message: string } | null
}
