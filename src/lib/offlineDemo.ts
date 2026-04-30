import type {
  Annotation,
  CritiqueIssue,
  GlobalDemo,
  KnowledgeCard,
  LocalDemo,
  PracticeSet,
  RectPercent,
  ReviewTask,
} from '../types'

const now = () => new Date().toISOString()

const rect = (x: number, y: number, width: number, height: number): RectPercent => ({ x, y, width, height })

const box = (id: string, issueId: string, label: string, target: RectPercent): Annotation => ({
  id,
  issueId,
  type: 'box',
  color: '#ef4444',
  label,
  rect: target,
})

const issueFactory = (
  id: string,
  title: string,
  subDimension: CritiqueIssue['subDimension'],
  severity: CritiqueIssue['severity'],
  bodyPart: string,
  bbox: RectPercent,
  editRegion: RectPercent,
  fixSteps: string[],
): CritiqueIssue => ({
  id,
  title,
  dimension: id === 'issue-color' ? '色彩' : id === 'issue-light' ? '明暗与光影' : '造型与结构',
  subDimension,
  severity,
  bodyPart,
  category: '离线演示问题',
  misconception: '当前没有拿到真实后端分析结果，先用标准教学问题演示完整工作流。',
  student_friendly_reason: '这是一条可演示的占位批改：你可以先检查前端交互、红框定位、知识卡、训练图和真实修图按钮状态。',
  art_principle: '先定位大问题，再做局部修改；红线示范优先，真实重绘最后触发。',
  visual_symptom: title,
  fix_steps: fixSteps,
  bbox,
  editRegion,
  annotations: [box(`${id}-box`, id, title, bbox)],
  cropPrompt: `围绕「${title}」裁剪局部，保留原画风格。`,
  practice: `针对「${title}」做 10 分钟小练习。`,
  knowledgeCardPlan: {
    title: `${title}：观察卡`,
    keyConcept: subDimension,
    commonMistake: '只看局部细节，没有先统一大关系。',
    observationMethod: '缩小画布，先看大轮廓、大黑白和大色块。',
    miniExercise: '用 3 个红框标出最影响画面的区域，再只改一个。',
  },
  practicePlan: {
    title: `${title}专项练习`,
    focus: subDimension,
    steps: fixSteps,
  },
  imageEditPrompt: `保持原图风格，只在选区内修正：${fixSteps.join('；')}`,
})

export const createOfflineReviewTask = (imageUrl: string, reason: string): ReviewTask => {
  const createdAt = now()
  const problems: CritiqueIssue[] = [
    issueFactory(
      'issue-structure',
      '主要形体重心不够稳定',
      '人体/大形/重心',
      '高',
      '主体大形',
      rect(18, 16, 34, 54),
      rect(16, 14, 38, 58),
      ['先用一条中线确定身体朝向', '检查头胸胯三块是否连贯', '只微调轮廓，不大面积重画'],
    ),
    issueFactory(
      'issue-light',
      '二分关系还不够清楚',
      '光源/明暗分组',
      '中',
      '脸部与上半身',
      rect(44, 18, 28, 34),
      rect(42, 16, 32, 38),
      ['先确定唯一主光源', '把亮部和暗部分成两个大组', '减少碎阴影，保留核心投影'],
    ),
    issueFactory(
      'issue-color',
      '色彩层级缺少主次',
      '色相/饱和度/冷暖',
      '中',
      '整体配色',
      rect(20, 58, 58, 28),
      rect(18, 56, 62, 32),
      ['选一个主色，不要平均用力', '暗部降低饱和度并统一冷暖', '高饱和色只放在视觉焦点附近'],
    ),
  ]

  return {
    id: `offline-${Date.now()}`,
    status: 'waiting_selection',
    imageUrl,
    artworkStage: '草稿',
    styleTarget: '平涂',
    subjectType: '角色',
    studentGoal: '离线演示：先验证完整批改工作流',
    priorityStrategy: 'backend_unavailable_offline_demo',
    problems,
    selectedProblemIds: [],
    activeIssueId: problems[0]?.id,
    localDemos: [],
    artworkBounds: {
      faceRegion: rect(38, 12, 24, 24),
      textRegion: rect(0, 0, 0, 0),
      colorCardRegion: rect(78, 10, 14, 28),
      backgroundWhitespaceRegion: rect(5, 5, 18, 18),
    },
    knowledgeCards: [],
    practiceSets: [],
    studentMemory: {
      recurringIssues: ['大形优先', '二分清晰度', '色彩主次'],
      learnedConcepts: [],
      generatedAssets: [],
      teacherSummary: '后端不可用时进入离线演示模式，用于验证前端流程和交互。',
    },
    aiMeta: {
      provider: 'offline-demo',
      analysisModel: 'offline-rule-pack',
      imageModel: 'not-called',
      editModel: 'not-called',
      mode: 'mock_fallback',
      imageApiCalled: false,
      mock: true,
      warning: reason,
    },
    logs: [{ time: createdAt, status: 'offline_demo', message: reason }],
    createdAt,
    updatedAt: createdAt,
    mockMode: true,
  }
}

export const createOfflineLocalDemo = (task: ReviewTask, issueId: string): LocalDemo => {
  const issue = task.problems.find((item) => item.id === issueId) ?? task.problems[0]
  return {
    id: `offline-local-${issue.id}-${Date.now()}`,
    issueId: issue.id,
    mode: 'teacher_overlay',
    status: 'ready',
    beforeCropLabel: '原图局部',
    afterLabel: '红线示范（离线）',
    explanation: `离线红线示范：${issue.title}。建议：${issue.fix_steps.join('；')}。`,
    teacherOverlayUrl: task.imageUrl,
    imageApiCalled: false,
    prompt: issue.imageEditPrompt,
    mask: { id: `mask-${issue.id}`, issueId: issue.id, rect: issue.editRegion, coveragePercent: (issue.editRegion.width * issue.editRegion.height) / 100 },
  }
}

export const createOfflineGlobalDemo = (task: ReviewTask, problemIds: string[]): GlobalDemo => ({
  id: `offline-global-${Date.now()}`,
  problemIds,
  mode: 'teacher_overlay',
  status: 'ready',
  globalOverlayUrl: task.imageUrl,
  originalFullUrl: task.imageUrl,
  explanation: '离线全局总览：先按高严重度处理结构，再处理二分，最后统一色彩主次。',
  prompt: task.problems.filter((issue) => problemIds.includes(issue.id)).map((issue, index) => `${index + 1}. ${issue.title}`).join('\n'),
  imageApiCalled: false,
})

export const createOfflineKnowledgeCard = (task: ReviewTask, issueId: string, mode: KnowledgeCard['mode']): KnowledgeCard => {
  const issue = task.problems.find((item) => item.id === issueId) ?? task.problems[0]
  return {
    id: `offline-card-${issue.id}-${mode}`,
    issueId: issue.id,
    mode,
    title: issue.knowledgeCardPlan.title,
    concept: issue.knowledgeCardPlan.keyConcept,
    misconception: issue.knowledgeCardPlan.commonMistake,
    observe: issue.knowledgeCardPlan.observationMethod,
    exercise: issue.knowledgeCardPlan.miniExercise,
    imageUrl: mode === 'image' ? task.imageUrl : undefined,
  }
}

export const createOfflinePracticeSet = (task: ReviewTask, issueId: string): PracticeSet => {
  const issue = task.problems.find((item) => item.id === issueId) ?? task.problems[0]
  return {
    id: `offline-practice-${issue.id}`,
    issueId: issue.id,
    title: issue.practicePlan.title,
    steps: issue.practicePlan.steps,
    trainingImageUrl: task.imageUrl,
    answerImageUrl: task.imageUrl,
  }
}
