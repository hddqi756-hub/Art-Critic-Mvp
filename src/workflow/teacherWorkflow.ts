import type { CritiqueIssue, LocalDemo } from '../types'


export const getActiveIssue = (issues: CritiqueIssue[], activeIssueId: string | null) => {
  if (!issues.length) return undefined
  if (!activeIssueId) return issues[0]
  return issues.find((issue) => issue.id === activeIssueId) ?? issues[0]
}

export const getLocalDemoForIssue = (localDemos: LocalDemo[], issueId: string | null) => {
  if (!issueId) return undefined
  return localDemos.find((demo) => demo.issueId === issueId)
}

export const upsertLocalDemo = (localDemos: LocalDemo[], nextDemo: LocalDemo) => {
  return [...localDemos.filter((demo) => demo.issueId !== nextDemo.issueId), nextDemo]
}

export const setActiveIssue = (currentIssueId: string | null, nextIssueId: string) => {
  if (currentIssueId === nextIssueId) return currentIssueId
  return nextIssueId
}

export const buildGlobalEditPrompt = (issues: CritiqueIssue[]) => {
  const joined = issues
    .map((issue, index) => `${index + 1}. ${issue.title}：${issue.fix_steps.join('；')}`)
    .join('\n')

  return [
    '你是AI绘画老师，请在原图上进行最小必要修改。',
    '必须保留：角色身份、人设、构图、姿态、画风、线条习惯。',
    '禁止新增无关物体或改变镜头角度。',
    '只处理以下三个问题：',
    joined,
  ].join('\n')
}
