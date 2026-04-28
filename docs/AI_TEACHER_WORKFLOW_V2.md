# AI 绘画老师工作流 V2

本版本目标：修复“多个问题粘在一起”“局部示范不独立”“缺少全局改图总览”“AI 老师逻辑不像真实图片编辑模型”的问题。

## 1. 交互原则

### 每个问题必须独立

右侧 3 个问题卡片只能代表 3 个独立诊断单元。用户点击哪个问题，左侧只展示该问题对应的局部对比，不允许把多个问题的裁剪、红线、文字混在同一个展示区。

正确结构：

```text
activeIssueId = issue-1
左侧展示：issue-1 的 beforeCrop + issue-1 的 overlay / after
教学区展示：issue-1 的 why / fix / practice

activeIssueId = issue-2
左侧展示：issue-2 的 beforeCrop + issue-2 的 overlay / after
教学区展示：issue-2 的 why / fix / practice
```

### 局部修正与全局修正分离

局部红线示范用于解释单个问题。全局改图用于把 3 个问题整合到一张完整图里。

界面 Tab 调整为：

1. 定位批注：完整原图 + 3 个问题的位置标注。
2. 单项示范：当前选中问题的局部 before / after 对比滑块。
3. 全局改图：原图 vs 综合修改图对比滑块。
4. 练习任务：当前选中问题的练习。

### 不再用整图缩略图冒充局部示范

单项示范必须读取当前问题自己的 `localDemo`：

```ts
const currentDemo = task.localDemos.find(demo => demo.issueId === activeIssueId)
```

如果没有对应 demo，显示“请先生成该问题的红线示范”。

## 2. 数据结构

### Issue

```ts
type CritiqueIssue = {
  id: string
  title: string
  severity: '高' | '中' | '低'
  category: '明暗' | '色彩' | '人体结构' | '构图' | '透视' | '边缘控制' | '完成度'
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
```

### LocalDemo

```ts
type LocalDemo = {
  id: string
  issueId: string
  beforeCropUrl: string
  teacherOverlayUrl: string
  editedCropUrl?: string
  status: 'teacher_overlay' | 'real_inpaint' | 'failed'
  imageApiCalled: boolean
  explanation: string
}
```

### GlobalDemo

```ts
type GlobalDemo = {
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
```

## 3. 后端接口调整

### POST /api/generate-selected

只生成当前选中问题的局部红线示范。输入必须是单个 `problem_id`，不要一次混合多个问题。

```json
{
  "task_id": "xxx",
  "problem_id": "issue-1"
}
```

返回时只追加或替换该问题自己的 `localDemo`。

### POST /api/generate-global-demo

生成 3 个问题的全局红线总览。

```json
{
  "task_id": "xxx",
  "problem_ids": ["issue-1", "issue-2", "issue-3"]
}
```

返回 `globalDemo`，用于“全局改图”Tab 的完整图对比滑块。

### POST /api/inpaint-local

用户确认后才调用真实图片编辑模型，输入单个问题。

### POST /api/inpaint-global

用户确认后才调用真实图片编辑模型，输入全部主问题，生成完整改图。

## 4. AI 老师 Prompt 逻辑

AI 老师不再只说“颜色太平”“明暗不足”。必须按 gpt-image 类图片编辑逻辑输出：

1. 保留原画角色、人设、服装、发型、构图，不重新设计。
2. 明确指出要编辑的区域，而不是泛泛描述。
3. 每个问题给出局部编辑方案。
4. 全局改图 prompt 汇总 3 个问题，但仍要强调保留原图风格。
5. 对色彩/明暗问题必须说明“亮面、暗面、投影、边缘、焦点”的变化。
6. 对结构问题必须说明“骨点、体块、透视、轮廓线”的变化。

### 单项问题输出模板

```text
你是一位资深商业插画老师。请只针对当前问题生成局部修改方案。
不要改角色设定，不要换姿势，不要重画成新图。
目标：在 editRegion 内做最小必要修改。
输出：红线批注方案 + 图片编辑 prompt。
```

### 全局改图输出模板

```text
请基于原图做一次完整但克制的综合修改。
必须保留：角色身份、发型、服装、姿态、画风、背景留白。
只修正以下 3 个问题：...
不要额外增加装饰，不要改变镜头，不要改变人物年龄和体型。
输出一张完整改图，并保持原图的二次元插画质感。
```

## 5. 前端状态规则

- 点击问题卡片：只改变 `activeIssueId`，不自动勾选其它问题。
- 点击“看红线示范”：只请求当前问题的 local demo。
- 点击“生成全局总览”：请求 global demo。
- “真实修图”按钮必须放在局部示范或全局示范之后，不要默认触发。
- 每个对比滑块必须绑定自己的数据源：
  - 单项示范：`currentLocalDemo.beforeCropUrl` vs `currentLocalDemo.teacherOverlayUrl / editedCropUrl`
  - 全局改图：`task.imageUrl` vs `task.globalDemo.globalOverlayUrl / editedFullUrl`

## 6. 验收标准

1. 3 个问题互相独立，点击任一问题不会展示其它问题的图。
2. 每个问题都能单独生成局部红线示范。
3. 有一个全局改图 Tab，能展示综合 3 个问题的完整图对比滑块。
4. UI 明确区分“红线示范”和“真实修图”。
5. AI 文案必须像老师，而不是像模型自动描述。
6. Debug 面板能看到 `activeIssueId`、`localDemos`、`globalDemo`、`imageApiCalled`。
