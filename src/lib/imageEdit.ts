import type { CritiqueIssue, TeacherEditMode } from '../types'

export type EditMode = 'auto_protect' | 'mask_precise'

export type ImageEditRequest = {
  model: string
  image: string
  prompt: string
  size: '1024x1024' | '1024x1536' | '1536x1024'
  quality: 'low' | 'medium' | 'high'
  editMode: EditMode
  teacherMode: TeacherEditMode
  maskUrl?: string
}

const pricingTable: Record<ImageEditRequest['size'], Record<ImageEditRequest['quality'], number>> = {
  '1024x1024': { low: 0.01, medium: 0.06, high: 0.22 },
  '1024x1536': { low: 0.01, medium: 0.05, high: 0.17 },
  '1536x1024': { low: 0.01, medium: 0.05, high: 0.17 },
}

export const estimateEditCost = (size: ImageEditRequest['size'], quality: ImageEditRequest['quality']) => pricingTable[size][quality]

export const buildTeacherEditInstruction = (issue: CritiqueIssue) => [
  '保留原图角色身份、脸、发型、服装、姿势、线稿、构图、画布比例、平涂风格。',
  '只修改 mask 内区域，不要重画整个人物，不要改变脸，不要新增装饰。',
  '不要把平涂改成厚涂。',
  `本次问题：${issue.title}`,
  `视觉症状：${issue.visual_symptom}`,
  `修改步骤：${issue.fix_steps.join('；')}`,
].join('\n')

export const createEditRequest = (
  imageUrl: string,
  issue: CritiqueIssue,
  options?: Partial<Pick<ImageEditRequest, 'quality' | 'size' | 'editMode' | 'maskUrl' | 'teacherMode'>>,
): ImageEditRequest => ({
  model: 'gpt-image-2',
  image: imageUrl,
  prompt: buildTeacherEditInstruction(issue),
  quality: options?.quality ?? 'medium',
  size: options?.size ?? '1024x1024',
  editMode: options?.editMode ?? 'auto_protect',
  teacherMode: options?.teacherMode ?? 'local_inpaint',
  maskUrl: options?.maskUrl,
})
