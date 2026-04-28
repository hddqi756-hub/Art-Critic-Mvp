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

export type ArtworkStage = '草稿' | '线稿' | '平涂' | '二分' | '半成品' | '完成图'
export type StyleTarget = '日系赛璐璐' | '平涂' | '半厚涂' | '厚涂' | '游戏美宣' | 'Q版' | '写实'
export type SubjectType = '角色' | '场景' | '静物' | '综合'

export type GeneratedAsset = {
  id: string
  type: 'local_overlay' | 'global_overlay' | 'real_edit' | 'knowledge_card' | 'practice' | 'practice_answer' | 'report'
  title: string
  url: string
  createdAt: string
  downloadable: boolean
}

export type KnowledgeCardPlan = {
  title: string
  keyConcept: string
  commonMistake: string
  observationMethod: string
  miniExercise: string
}

export type PracticePlan = {
  title: string
  focus: string
  steps: string[]
}

export type CritiqueIssue = {
  id: string
  title: string
  dimension: '造型与结构' | '线条与轮廓' | '明暗与光影' | '色彩' | '构图与画面设计' | '角色设计与美宣感' | '上色完成度' | 'AI图像编辑专项'
  subDimension: string
  severity: Severity
  bodyPart: string
  category: string
  misconception: string
  student_friendly_reason: string
  art_principle: string
  visual_symptom: string
  fix_steps: string[]
  bbox: RectPercent
  editRegion: RectPercent
  annotations: Annotation[]
  cropPrompt: string
  practice: string
  knowledgeCardPlan: KnowledgeCardPlan
  practicePlan: PracticePlan
  imageEditPrompt: string
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

export type GlobalDemo = {
  id: string
  problemIds: string[]
  globalOverlayUrl?: string
  editedFullUrl?: string
  explanation: string
  prompt: string
  imageApiCalled: boolean
  mode: 'teacher_overlay' | 'real_edit'
}

export type KnowledgeCard = {
  id: string
  issueId: string
  mode: 'text' | 'image'
  title: string
  concept: string
  misconception: string
  observe: string
  exercise: string
  imageUrl?: string
}

export type PracticeSet = {
  id: string
  issueId: string
  title: string
  steps: string[]
  trainingImageUrl?: string
  answerImageUrl?: string
}

export type StudentMemory = {
  recurringIssues: string[]
  learnedConcepts: string[]
  generatedAssets: GeneratedAsset[]
  teacherSummary: string
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
  artworkStage: ArtworkStage
  styleTarget: StyleTarget
  subjectType: SubjectType
  studentGoal: string
  priorityStrategy: string
  problems: CritiqueIssue[]
  selectedProblemIds: string[]
  activeIssueId?: string
  localDemos: LocalDemo[]
  globalDemo?: GlobalDemo
  knowledgeCards: KnowledgeCard[]
  practiceSets: PracticeSet[]
  studentMemory: StudentMemory
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
