import type { CritiqueIssue } from '../types'

export type EditMode = 'auto_protect' | 'mask_precise'

export type ImageEditRequest = {
  model: string
  image: string
  prompt: string
  size: '1024x1024' | '1024x1536' | '1536x1024'
  quality: 'low' | 'medium' | 'high'
  editMode: EditMode
  maskUrl?: string
}

const pricingTable: Record<ImageEditRequest['size'], Record<ImageEditRequest['quality'], number>> = {
  '1024x1024': { low: 0.01, medium: 0.06, high: 0.22 },
  '1024x1536': { low: 0.01, medium: 0.05, high: 0.17 },
  '1536x1024': { low: 0.01, medium: 0.05, high: 0.17 },
}

export const estimateEditCost = (size: ImageEditRequest['size'], quality: ImageEditRequest['quality']) => {
  return pricingTable[size][quality]
}

export const buildTeacherEditInstruction = (issue: CritiqueIssue) => {
  return [
    `只修改与「${issue.title}」相关的区域，保持角色身份、线稿风格和原始构图不变。`,
    `视觉症状：${issue.visual_symptom}`,
    `按照以下步骤调整：${issue.fix_steps.join('；')}。`,
    `绘画原理：${issue.art_principle}`,
    '输出为教学用途的可读修改结果，避免新增无关元素。',
  ].join('\n')
}

export const createEditRequest = (
  imageUrl: string,
  issue: CritiqueIssue,
  options?: Partial<Pick<ImageEditRequest, 'quality' | 'size' | 'editMode' | 'maskUrl'>>,
): ImageEditRequest => ({
  model: 'gpt-image-2',
  image: imageUrl,
  prompt: buildTeacherEditInstruction(issue),
  quality: options?.quality ?? 'medium',
  size: options?.size ?? '1024x1024',
  editMode: options?.editMode ?? 'auto_protect',
  maskUrl: options?.maskUrl,
})
