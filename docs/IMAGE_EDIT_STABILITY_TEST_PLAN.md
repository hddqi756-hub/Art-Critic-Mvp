# AI 改画稳定性测试与优化方案

当前截图暴露的问题：图片编辑模型会把“局部问题”扩大成“全图重绘”，导致角色脸、发型、衣服、色彩、明暗关系被整体改掉。结果虽然更精致，但不像老师在学生原图上改，而像重新生成了一张同人图。

本方案用于把 AI 改画从“自由生成”改成“可控编辑”。

## 1. 当前失败现象

### 1.1 身份漂移

原图人物的脸型、五官气质、发色、兔耳形状、服装细节被明显改动。真实批改不应该换角色。

### 1.2 编辑范围失控

用户选中的是“肤色和头发亮度太接近”，但生成结果同时改了裙子、头发、脸、腿、整体渲染、鞋子和色卡区域。

### 1.3 风格漂移

原图是偏平涂练习，模型改成了半厚涂/更写实的渲染。对学习者来说，这会破坏训练目标。

### 1.4 文本污染

画面上方的参考文字被模型保留或误处理，后续图片编辑应先裁掉非作品区，或明确不编辑文字区域。

### 1.5 对比逻辑不清

当前对比滑块展示的是完整改图，但问题卡选中的是局部问题。用户无法判断“这个问题到底怎么被修了”。

## 2. 重新定义三种改图模式

系统不能只用一个“真实修图”按钮。必须拆成三种模式。

### 2.1 老师红线模式 teacher_overlay

用途：稳定、低成本、最像老师批改。

特点：

- 不调用真实图片编辑模型。
- 只在原图上叠加红线、箭头、辅助块、文字标签。
- 适合默认展示。
- 不会破坏原图。

### 2.2 局部修正模式 local_inpaint

用途：只修一个问题。

特点：

- 必须有 `editRegion` 和 `mask`。
- 只裁剪局部图。
- 只允许修改 mask 内区域。
- 输出局部 before / after 对比。
- 不允许改全图。

### 2.3 全局综合模式 global_guided_edit

用途：把 3 个主问题合并到完整图里。

特点：

- 先生成全局红线总览。
- 用户确认后才调用真实全局编辑。
- prompt 必须强调“保留原图角色、姿态、服装、构图、画风”。
- 全局改图失败率最高，必须经过 QA 检查。

## 3. 改图调用前的防错流程

### 3.1 输入图预处理

图片送入图像编辑模型前，需要判断画面中哪些是作品区域，哪些是 UI / 参考文字 / 色卡。

推荐新增：

```ts
type ArtworkBounds = {
  x: number
  y: number
  width: number
  height: number
  confidence: number
  excludedRegions: RectPercent[]
}
```

如果画面包含参考文字、色卡、说明字，默认不纳入 inpaint 区域。需要保留色卡时，把色卡作为参考区，不作为编辑区。

### 3.2 editRegion 与 mask 分离

`editRegion` 是裁剪区域，不等于 mask。mask 是真实允许模型改的区域。

```text
bbox：问题定位给用户看
editRegion：局部裁剪给模型看
mask：允许模型编辑的像素区域
protectedRegions：绝对不允许改的区域，例如脸、文字、色卡、背景
```

### 3.3 生成前检查

调用真实图片编辑模型前，必须检查：

```json
{
  "hasEditRegion": true,
  "hasMask": true,
  "maskTooLarge": false,
  "protectedFace": true,
  "protectedText": true,
  "mode": "local_inpaint",
  "allowedChangeRatio": 0.15
}
```

如果 mask 超过作品面积 20%，禁止局部 inpaint，提示用户缩小选区。

## 4. Prompt 稳定模板

### 4.1 局部编辑 Prompt

```text
You are editing a small selected region of the student's original artwork.
Preserve the original character identity, face, hairstyle, outfit, pose, line art, composition, canvas size, and anime flat-color style.
Only modify the masked area.
Do not repaint the whole character.
Do not change the face identity.
Do not add new decorations.
Do not change the color palette except the minimum needed for the selected issue.
The goal is: [issue.imageEditPrompt]
Keep the result looking like a teacher's correction on the student's own artwork, not a new illustration.
```

### 4.2 明暗问题专用补充

```text
For value/light correction, only separate light side and shadow side inside the selected region.
Keep the same local colors.
Use subtle cel-shading style.
Do not turn the artwork into semi-realistic rendering.
```

### 4.3 色彩问题专用补充

```text
For color correction, preserve the original hue family and only adjust value/saturation hierarchy.
Do not redesign the palette.
Do not recolor the costume or hair outside the mask.
```

### 4.4 全局综合 Prompt

```text
Make a conservative guided correction to the full artwork.
Preserve the original character identity, face, hairstyle, bunny ears, outfit design, pose, composition, canvas size, and flat anime illustration style.
Only address these critique issues:
1. [issue-1]
2. [issue-2]
3. [issue-3]
Do not redesign the character.
Do not make the rendering more realistic.
Do not add background elements.
Do not change the face.
Do not alter text or palette reference areas.
The output should look like the same student's artwork after a teacher-guided correction.
```

## 5. 生成后的 QA 检查

真实修图生成后不能直接展示为最终结果。必须让视觉模型或规则检查一次。

### 5.1 QA 数据结构

```ts
type EditQualityCheck = {
  identityPreserved: boolean
  posePreserved: boolean
  outfitPreserved: boolean
  stylePreserved: boolean
  editRegionRespected: boolean
  protectedRegionsRespected: boolean
  issueImproved: boolean
  overEdited: boolean
  artifactFound: boolean
  score: number
  failureReasons: string[]
  retryPrompt?: string
}
```

### 5.2 自动判定规则

- `identityPreserved = false`：脸、发型、耳朵、服装大幅变化。
- `stylePreserved = false`：平涂变成厚涂/写实。
- `editRegionRespected = false`：mask 外明显被改。
- `overEdited = true`：改动超过任务所需范围。
- `artifactFound = true`：文字污染、肢体畸形、边缘破碎。

如果 QA 分数低于 80，不展示为“最终修图”，而是显示：

```text
本次真实修图过度修改了原图，已标记为需要重试。你可以查看预览，但不建议作为最终参考。
```

## 6. 测试矩阵

每次改动图片编辑逻辑后，必须用固定测试集跑一遍。

### 6.1 测试图类型

1. 头像线稿。
2. 半身平涂。
3. 全身角色立绘。
4. 带色卡参考的练习图。
5. 带文字说明的作业图。
6. 二分练习图。
7. 手部结构问题图。
8. 构图问题图。

### 6.2 测试问题类型

| 问题类型 | 允许修改 | 禁止修改 |
| --- | --- | --- |
| 二分 | 局部亮暗面 | 脸、服装设计、姿态 |
| 色彩 | 局部明度/饱和度 | 换整套配色 |
| 手部结构 | 手指轮廓/骨点 | 改脸、改衣服 |
| 头颈肩 | 颈肩连接 | 改发型、改表情 |
| 构图 | 红线建议/裁切建议 | 直接重画人物 |
| 裙子灰阶 | 裙子明暗层级 | 改人物五官 |

### 6.3 通过标准

- 局部模式下，mask 外变化小于 5%。
- 全局模式下，角色身份保持一致。
- 平涂图不能被改成厚涂。
- 选中一个问题，只展示一个问题的结果。
- 知识卡片和训练图不自动生成。
- 失败结果必须被标记，不允许伪装成成功。

## 7. 前端交互修正

### 7.1 按钮文案

- `看红线示范`：默认按钮，安全。
- `生成局部真实修图`：高成本按钮，需用户确认。
- `生成全局红线总览`：整图批注，不改原图。
- `生成全局真实修图`：风险最高，需提示可能风格漂移。

### 7.2 展示逻辑

当前选中问题只展示当前问题的结果：

```ts
const activeIssue = getActiveIssue(task)
const currentDemo = getLocalDemoForIssue(task, activeIssue?.id)
```

全局改图只在“全局改图”Tab 展示，不要混到单项示范里。

### 7.3 风险提示

真实修图按钮旁边显示：

```text
真实修图可能改变画风，建议先看红线示范。
```

## 8. 推荐开发顺序

1. 暂停默认真实修图，默认只生成红线示范。
2. 加 mask 大小检查和 protectedRegions。
3. 局部 inpaint 改为只裁剪当前问题区域。
4. 加 QA 检查结构，失败时标记为需要重试。
5. 加固定测试集和测试报告。
6. 再开放全局真实修图。

## 9. Codex 修改目标

请按本文档实现：

- `EditMode = teacher_overlay | local_inpaint | global_guided_edit`
- `ArtworkBounds`
- `protectedRegions`
- `EditQualityCheck`
- `POST /api/inpaint-local`：只修当前问题。
- `POST /api/inpaint-global`：全局综合修图。
- `POST /api/edit-quality-check`：生成后 QA。
- 前端真实修图结果必须显示 QA 状态。
- QA 不通过时，不允许显示为最终成功。
