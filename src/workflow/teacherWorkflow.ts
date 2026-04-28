import type { CritiqueIssue, LocalDemo, RectPercent, ReviewTask } from '../types'

export const getActiveIssue = (task: ReviewTask) => {
  if (!task.problems.length) return undefined
  return task.problems.find((issue) => issue.id === task.activeIssueId) ?? task.problems[0]
}

export const getLocalDemoForIssue = (task: ReviewTask, issueId?: string) => {
  if (!issueId) return undefined
  return task.localDemos.find((demo) => demo.issueId === issueId)
}

export const upsertLocalDemo = (localDemos: LocalDemo[], nextDemo: LocalDemo) => {
  return [...localDemos.filter((demo) => demo.issueId !== nextDemo.issueId || demo.mode !== nextDemo.mode), nextDemo]
}

export const setActiveIssue = (currentIssueId: string | null, nextIssueId: string) => {
  if (currentIssueId === nextIssueId) return currentIssueId
  return nextIssueId
}

export const buildGlobalEditPrompt = (issues: CritiqueIssue[]) => {
  const joined = issues.map((issue, index) => `${index + 1}. ${issue.title}：${issue.fix_steps.join('；')}`).join('\n')
  return [
    '保持原图角色身份、脸、发型、服装、姿势、线稿、构图、画布比例、平涂风格。',
    '禁止新增装饰，禁止重画整个人物。',
    '在最小必要范围内修改并优先遵守保护区域。',
    '处理以下问题：',
    joined,
  ].join('\n')
}

export const calcRectCoverage = (rect: RectPercent) => (rect.width * rect.height) / 100

export const overlap = (a: RectPercent, b: RectPercent) => {
  const left = Math.max(a.x, b.x)
  const top = Math.max(a.y, b.y)
  const right = Math.min(a.x + a.width, b.x + b.width)
  const bottom = Math.min(a.y + a.height, b.y + b.height)
  return right > left && bottom > top
}
