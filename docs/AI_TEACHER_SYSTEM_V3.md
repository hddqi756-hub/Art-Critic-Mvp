# AI 绘画老师系统 V3：分类、知识卡片、训练、记忆与图生图逻辑

本方案用于把当前 MVP 从“单次图片批改工具”升级为“有记忆、有课程感、有审美工作台的 AI 绘画老师”。

## 1. 可行性判断

整体可行，但必须拆成节点，不要让一个 AI prompt 同时承担诊断、讲课、出练习、生成答案、修图和记忆总结。

推荐分成 7 个节点：

1. `classifyArtwork`：判断作品阶段、风格、题材、训练目标。
2. `diagnoseIssues`：只挑 3 个主问题，但分类体系要更完整。
3. `generateKnowledgeCards`：针对每个问题生成知识卡片，默认生成文本卡，图片卡可延迟生成。
4. `generateLocalDemo`：针对单个问题生成局部红线示范。
5. `generateGlobalDemo`：把 3 个问题汇总到完整图上，形成总览改图。
6. `generatePracticeSet`：用户点击后才生成训练图和参考答案。
7. `updateStudentMemory`：批改完成后把小画家的误区、已生成图片、练习记录写入老师记忆。

## 2. 更完整的问题分类体系

原来只有“色彩 / 构图 / 结构”太窄，会导致 AI 老师重复说同类问题。新的分类使用三层结构：

```text
大类 dimension -> 子类 subDimension -> 教学标签 teachingTags
```

### 2.1 造型与结构

- 人体比例
- 骨点关系
- 体块连接
- 头颈肩
- 手部结构
- 脚踝与鞋
- 透视缩短
- 重心与站姿
- 动势线
- 剪影识别

### 2.2 线条与轮廓

- 线稿粗细
- 外轮廓节奏
- 内部结构线
- 线条闭合
- 线条轻重
- 边缘虚实
- 轮廓设计

### 2.3 明暗与光影

- 二分
- 亮暗面组织
- 投影逻辑
- 核心阴影
- 闭塞阴影
- 反光控制
- 光源方向
- 焦点明暗

### 2.4 色彩

- 色相统一
- 饱和度层级
- 冷暖关系
- 固有色与光色
- 肤色控制
- 配色主次
- 色彩焦点
- 色卡设计

### 2.5 构图与画面设计

- 视觉中心
- 留白
- 主次关系
- 三角构图
- 画面节奏
- 负形
- 镜头距离
- 背景辅助

### 2.6 角色设计与美宣感

- 人设识别度
- 服装层次
- 装饰主次
- 材质区分
- 发型设计
- 表情与情绪
- 商业完成度
- 风格统一

### 2.7 上色完成度

- 层次缺失
- 边缘脏乱
- 灰度关系
- 局部精度
- 材质渲染
- 画面噪点
- 笔触控制
- 收边

### 2.8 AI 图像编辑专项

- 人设漂移
- 局部重绘过度
- 风格不一致
- 手部畸变
- 面部漂移
- 服装细节误改
- 背景误生成
- 色彩污染

## 3. AI 老师诊断逻辑升级

AI 老师不能直接“挑错”。应先判断学生正在练什么，再决定怎么批改。

### 3.1 批改前置判断

每张图先输出：

```json
{
  "artwork_stage": "草稿 / 线稿 / 平涂 / 二分 / 半成品 / 完成图",
  "style_target": "日系赛璐璐 / 平涂 / 半厚涂 / 厚涂 / 游戏美宣 / Q版 / 写实",
  "subject_type": "头像 / 半身 / 全身 / 多人 / 场景 / 角色设定",
  "student_goal": "用户输入的训练目标，若无则 AI 推断",
  "priority_strategy": "本次为什么优先挑这 3 个问题"
}
```

### 3.2 主问题选择规则

每次只保留 3 个主问题，但分类来源要广。选择顺序：

1. 最影响画面第一眼的问题。
2. 最影响用户当前训练目标的问题。
3. 最能形成下一步练习的问题。

禁止三个问题都属于同一个子类，除非用户明确要求只练一个类别。

### 3.3 问题输出结构

每个问题必须包含：

```json
{
  "id": "issue-1",
  "title": "问题标题",
  "dimension": "明暗与光影",
  "subDimension": "二分",
  "severity": "高 / 中 / 低",
  "bodyPart": "头发 / 皮肤 / 手 / 衣服 / 全图",
  "student_friendly_reason": "白话解释",
  "art_principle": "绘画原理",
  "misconception": "学生可能没想明白的误区",
  "visual_symptom": "画面上怎么看出来",
  "fix_steps": ["第一步", "第二步", "第三步"],
  "bbox": "定位框",
  "editRegion": "真实裁剪/编辑区域",
  "annotations": "红线批注数据",
  "knowledgeCardPlan": "知识卡片计划",
  "practicePlan": "训练计划",
  "imageEditPrompt": "局部图生图提示词"
}
```

## 4. 知识卡片生成节点

知识卡片不是泛泛科普，而是针对当前问题的“课后补充”。默认不需要调用图片模型，先生成结构化文字卡。用户点击“生成图解卡”时，再生成图像版知识卡。

### 4.1 KnowledgeCard 数据结构

```ts
type KnowledgeCard = {
  id: string
  issueId: string
  title: string
  concept: string
  whyItMatters: string
  commonMistake: string
  howToObserve: string
  miniExamplePrompt: string
  diagramUrl?: string
  status: 'text_ready' | 'image_ready' | 'failed'
}
```

### 4.2 卡片类型

- 二分卡：亮暗面分组、投影、闭塞阴影。
- 配色卡：主色、辅助色、强调色、冷暖层级。
- 手部结构卡：掌骨、指节、手腕连接。
- 头颈肩卡：头球体、脖子柱体、肩带关系。
- 构图卡：视觉中心、留白、负形。
- 线条卡：外轮廓、内结构线、粗细节奏。
- 材质卡：布料、皮肤、金属、头发的明暗差异。

## 5. 基础训练节点

训练图默认不生成，避免浪费图片 API。每个问题显示“生成训练”按钮，点击后生成训练图和参考答案。

### 5.1 PracticeSet 数据结构

```ts
type PracticeSet = {
  id: string
  issueId: string
  title: string
  objective: string
  prompt: string
  exerciseImageUrl?: string
  answerImageUrl?: string
  steps: string[]
  difficulty: '入门' | '进阶' | '挑战'
  status: 'planned' | 'exercise_ready' | 'answer_ready' | 'failed'
}
```

### 5.2 训练类型

- 二分练习：纯线稿 + 参考二分答案。
- 配色练习：灰度图 / 线稿 + 色卡参考答案。
- 手部练习：手势线稿 + 骨点参考答案。
- 头颈肩练习：头像结构线稿 + 体块答案。
- 构图练习：缩略图练习 + 优化构图答案。
- 线条练习：粗细节奏模板 + 改线答案。

## 6. 老师记忆模块

记忆不是简单历史列表，而是“老师对小画家的长期观察”。历史记录占 UI 小区域，但会影响下次批改。

### 6.1 记忆分层

1. `ArtworkHistory`：每次上传、批改、生成的图。
2. `IssueMemory`：反复出现的问题，例如“头颈肩连接弱”。
3. `ConceptMemory`：用户已经学过的知识点。
4. `PracticeMemory`：用户生成过哪些训练、是否上传过练习结果。
5. `TeacherSummary`：老师给学生的长期画像。

### 6.2 StudentMemory 数据结构

```ts
type StudentMemory = {
  studentId: string
  updatedAt: string
  stylePreferences: string[]
  recurringIssues: {
    dimension: string
    subDimension: string
    count: number
    lastSeenTaskId: string
    teacherNote: string
  }[]
  learnedConcepts: {
    concept: string
    issueId: string
    taskId: string
    confidence: '未掌握' | '练习中' | '基本掌握'
  }[]
  generatedAssets: {
    taskId: string
    type: 'local_demo' | 'global_demo' | 'knowledge_card' | 'practice' | 'answer'
    url: string
    title: string
    createdAt: string
  }[]
  teacherSummary: string
}
```

### 6.3 记忆如何参与二次批改

当用户再次上传图片时，AI 老师先读最近 5 次历史，形成一句内部判断：

```text
这个小画家最近反复出现：二分不敢拉开、肤色和头发明度过近、头颈肩连接弱。
这次如果再次出现同类问题，要直接指出“这是你上次也遇到的误区”，并给更进阶的解释。
```

输出时不要让历史喧宾夺主，只在问题卡或教学区里显示一条轻提示：

```text
老师记得：你上次也在头发与皮肤明度分组上卡住，这次我们重点看亮暗层级怎么拉开。
```

## 7. 图片预览、下载与历史痕迹

所有生成资产都必须进入 `generatedAssets`，前端提供：

- 预览大图。
- 下载当前图。
- 下载本次批改包。
- 历史缩略图时间线。
- 点击历史记录可恢复 task。

推荐下载文件名：

```text
任务名_问题标题_类型_日期.png
```

例如：

```text
兔耳角色_角色明暗分组_局部红线_2026-04-28.png
```

## 8. 前端美学设计方向

当前 UI 太像工程后台。建议改成“老师画室工作台”：

### 8.1 页面布局

```text
顶部：作品名 / 当前阶段 / 老师记忆小胶囊 / 导出按钮
左侧：大画布工作区，支持缩放、拖拽、红线层、对比滑块
右侧：3 个问题卡片 + 当前问题操作
底部：教学抽屉，含知识卡片、训练、历史痕迹
```

### 8.2 视觉风格

- 背景：暖白 / 淡粉灰，避免纯白刺眼。
- 卡片：轻投影 + 大圆角 + 细边框。
- 重点色：玫红用于问题，青绿用于完成，琥珀用于提示。
- 图片区：像画板一样，增加纸张感和留白。
- 问题卡：不要大段文字堆叠，使用“问题 / 为什么 / 怎么改”折叠结构。
- 历史记忆：小时间线，不占大面积。

### 8.3 推荐 Tab

- 定位批注
- 单项示范
- 全局改图
- 知识卡片
- 基础训练
- 历史痕迹

## 9. 图生图与原图编辑的底层逻辑优化

减少出错的关键不是换模型，而是降低每次编辑的自由度。

### 9.1 局部编辑流程

1. 先由 AI 输出 `editRegion`。
2. 后端裁剪局部图。
3. 自动生成 mask，但允许用户手动画 mask 修正。
4. 先生成红线 overlay。
5. 用户确认后才进入真实 inpaint。
6. inpaint prompt 必须包含“保留周围线条和颜色，不改变角色设定”。
7. 生成后做二次检查：是否改错角色、是否风格漂移、是否超出 mask。

### 9.2 全局改图流程

全局改图不是直接大重绘，而是两段式：

1. 全局红线总览：完整图上叠加 3 个问题的批注。
2. 全局真实修图：只在确认后调用图像编辑模型。

全局真实修图 prompt 必须包含：

```text
Keep the original character identity, outfit, hairstyle, pose, composition, canvas size and anime illustration style. Only make minimal corrective edits for the listed critique issues. Do not redesign the character. Do not add new background elements. Do not change the face identity.
```

### 9.3 防错检查

生成后必须做一次视觉 QA：

```json
{
  "identity_preserved": true,
  "style_preserved": true,
  "mask_respected": true,
  "fix_visible": true,
  "new_artifacts": [],
  "should_retry": false,
  "retry_prompt": "如果需要重试，这里写更严格的 prompt"
}
```

如果 QA 失败，不要直接展示为最终结果，要标记为“需要重试”。

## 10. 推荐开发顺序

### 第一阶段：逻辑升级

- 加完整分类体系。
- 改诊断 prompt。
- 加 knowledgeCardPlan 和 practicePlan。
- 加 activeIssueId、localDemos、globalDemo。

### 第二阶段：前端体验

- 重新设计为画室工作台。
- 加预览弹窗和下载按钮。
- 加历史痕迹小时间线。
- 知识卡片和训练节点放到底部抽屉。

### 第三阶段：真实图片编辑

- 局部 inpaint。
- 全局 inpaint。
- 生成后视觉 QA。
- 失败重试与 prompt 自动收紧。

### 第四阶段：老师记忆

- 存储历史任务。
- 统计 recurringIssues。
- 二次批改时读取历史。
- 输出个性化提醒。

## 11. 核心原则

- AI 老师先教，再修。
- 每个问题独立闭环。
- 知识卡片讲原理。
- 基础训练练技能。
- 历史记忆追踪成长。
- 图生图永远保守编辑，避免重绘失控。
