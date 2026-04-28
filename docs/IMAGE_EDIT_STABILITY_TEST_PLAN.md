# IMAGE EDIT STABILITY TEST PLAN

## 目标
优先保证“别改坏、别漂移、别乱动”，再追求更漂亮。

## 编辑模式

1. `teacher_overlay`：默认模式，只画红线。
2. `local_inpaint`：只修 activeIssueId，且仅允许 mask 区域变化。
3. `global_guided_edit`：先全局红线总览，确认后再全局真实修图。

## 强约束

- `bbox` 仅用于定位展示。
- `editRegion` 用于裁剪。
- `mask` 用于允许模型修改像素。
- `protectedRegions`（脸/文字/色卡/背景留白）默认不可改。
- `mask` 覆盖面积 > 20% 时禁止局部真实修图。

## QA 规则

生成后必须执行 `EditQualityCheck`：
- identityPreserved
- posePreserved
- outfitPreserved
- stylePreserved
- editRegionRespected
- protectedRegionsRespected
- issueImproved
- overEdited
- artifactFound
- score / failureReasons / retryPrompt

若 `score < 80`：标记为 `needs_retry`，不可展示为最终成功。

## 固定测试集

- 头像线稿
- 半身平涂
- 全身角色立绘
- 带色卡参考图
- 带文字说明图
- 二分练习图
- 手部结构图
- 构图问题图
