# AI TEACHER SYSTEM V3

## 第一阶段目标

- 分类体系扩展：覆盖造型、线条、明暗、色彩、构图、角色设计、上色完成度、AI图像编辑专项。
- 分析前置判断：`artwork_stage / style_target / subject_type / student_goal / priority_strategy`。
- 每次保留 3 个主问题，优先分布在不同子类。
- 每个问题输出：`dimension/subDimension/misconception/knowledgeCardPlan/practicePlan/imageEditPrompt`。
- 分离节点：局部红线示范、全局总览、知识卡片、训练集、真实修图。
- 引入老师记忆：`recurringIssues/learnedConcepts/generatedAssets/teacherSummary`。

## 接口规划

- `POST /api/knowledge-card/generate`：默认生成文字知识卡。
- `POST /api/practice/generate`：用户点击后才生成训练图和参考答案。
- `POST /api/generate-global-demo`：输入 `task_id + 3 problem_ids` 生成全局总览。

## UI 结构

- 顶部：作品信息、老师记忆胶囊、导出按钮。
- 左侧：画布工作区（局部红线 / 全局改图）。
- 右侧：3 个主问题。
- 底部抽屉：知识卡片、基础训练、历史痕迹。
