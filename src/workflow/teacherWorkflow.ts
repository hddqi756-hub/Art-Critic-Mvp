export type RectPercent = {
  x: number
  y: number
  width: number
  height: number
}

export type Annotation = {
  id: string
  type: 'box' | 'arrow' | 'line' | 'paint' | 'text'
  color?: string
  label?: string
  rect?: RectPercent
  points?: number[]
}

export type IssueCategory =
  | '明暗'
  | '色彩'
  | '人体结构'
  | '构图'
  | '透视'
  | '边缘控制'
  | '完成度'

export type CritiqueIssue = {
  id: string
  title: string
  severity: '高' | '中' | '低'
  category: IssueCategory
  bodyPart: string
  student_friendly_reason: string
  art_principle: string
  visual_symptom: string
  fix_steps: string[]
  bbox: RectPercent
  editRegion: RectPercent
  annotations: Annotation[]
  cropPrompt: string
  imageEditPrompt: string
  practice: string
}

export type LocalDemo = {
  id: string
  issueId: string
  beforeCropUrl: string
  teacherOverlayUrl: string
  editedCropUrl?: string
  status: 'teacher_overlay' | 'real_inpaint' | 'failed'
  imageApiCalled: boolean
  explanation: string
}

export type GlobalDemo = {
  id: string
  beforeUrl: string
  globalOverlayUrl: string
  editedFullUrl?: string
  status: 'teacher_overlay' | 'real_inpaint' | 'failed'
  imageApiCalled: boolean
  combinedIssueIds: string[]
  summary: string
  imageEditPrompt: string
}

export type TeacherTask = {
  id: string
  imageUrl: string
  problems: CritiqueIssue[]
  activeIssueId?: string
  localDemos: LocalDemo[]
  globalDemo?: GlobalDemo
}

export function getActiveIssue(task: TeacherTask): CritiqueIssue | undefined {
  const activeIssueId = task.activeIssueId ?? task.problems[0]?.id
  return task.problems.find((issue) => issue.id === activeIssueId)
}

export function getLocalDemoForIssue(
  task: TeacherTask,
  issueId: string | undefined,
): LocalDemo | undefined {
  if (!issueId) return undefined
  return task.localDemos.find((demo) => demo.issueId === issueId)
}

export function upsertLocalDemo(task: TeacherTask, demo: LocalDemo): TeacherTask {
  const nextDemos = task.localDemos.filter((item) => item.issueId !== demo.issueId)
  nextDemos.push(demo)
  return {
    ...task,
    activeIssueId: demo.issueId,
    localDemos: nextDemos,
  }
}

export function setActiveIssue(task: TeacherTask, issueId: string): TeacherTask {
  if (!task.problems.some((issue) => issue.id === issueId)) {
    return task
  }
  return {
    ...task,
    activeIssueId: issueId,
  }
}

export function buildGlobalEditPrompt(task: TeacherTask): string {
  const issueSummary = task.problems
    .slice(0, 3)
    .map((issue, index) => {
      return `${index + 1}. ${issue.title}：${issue.imageEditPrompt || issue.cropPrompt}`
    })
    .join('\n')

  return [
    '请基于原图做一次完整但克制的综合修改。',
    '必须保留：角色身份、发型、服装、姿态、画风、背景留白、原始镜头。',
    '只修正以下 3 个问题，不要额外增加装饰，不要改变人物年龄和体型。',
    issueSummary,
    '输出一张完整改图，并保持原图的二次元插画质感。',
  ].join('\n')
}
