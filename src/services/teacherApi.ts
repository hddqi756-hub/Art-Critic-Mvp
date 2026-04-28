import type { KnowledgeCard, PracticeSet, ReviewTask } from '../types'

export const postKnowledgeCardGenerate = async (task: ReviewTask, issueId: string): Promise<KnowledgeCard> => {
  const issue = task.problems.find((item) => item.id === issueId)
  if (!issue) {
    throw new Error('issue not found')
  }

  return {
    id: `kc-${issueId}-${task.knowledgeCards.length + 1}`,
    issueId,
    mode: 'text',
    title: issue.knowledgeCardPlan.title,
    concept: issue.knowledgeCardPlan.keyConcept,
    misconception: issue.knowledgeCardPlan.commonMistake,
    observe: issue.knowledgeCardPlan.observationMethod,
    exercise: issue.knowledgeCardPlan.miniExercise,
  }
}

export const postPracticeGenerate = async (task: ReviewTask, issueId: string): Promise<PracticeSet> => {
  const issue = task.problems.find((item) => item.id === issueId)
  if (!issue) {
    throw new Error('issue not found')
  }

  return {
    id: `ps-${issueId}-${task.practiceSets.length + 1}`,
    issueId,
    title: issue.practicePlan.title,
    steps: issue.practicePlan.steps,
    trainingImageUrl: 'mock://practice-training',
    answerImageUrl: 'mock://practice-answer',
  }
}
