# AI Teacher Workflow V2 (硬规则)

## 目标
结果页必须由 `activeIssueId` 驱动，保证“右侧问题目录，左侧只看当前问题”。

## 数据约束

- `localDemos: LocalDemo[]`：每个 demo 必须绑定 `issueId`。
- `globalDemo: GlobalDemo`：三个问题综合总览，和局部示范分离。
- `activeIssueId`：唯一当前问题，不允许多选混显。

## 交互规则

1. 点击问题卡片只做一件事：更新 `activeIssueId`。
2. 局部红线 Tab 只展示 `activeIssueId` 对应数据。
3. 读取当前局部数据：

```ts
const currentDemo = task.localDemos.find((d) => d.issueId === activeIssueId)
```

4. 如果当前问题没有局部示范，左侧显示：`请先为这个问题生成红线示范`。
5. “看红线示范”接口一次只允许一个 `issueId`。
6. 新增全局改图 Tab：读取 `task.globalDemo`。
7. 全局改图按钮文案固定：`生成三个问题的全局改图总览`。
8. 全局改图接口：`POST /api/generate-global-demo`，输入 `task_id + problem_ids[3]`。
9. UI 必须明确区分：
   - 红线示范：老师批注，不调用真实图片编辑模型。
   - 真实修图：调用图片编辑模型。

## Prompt 规则（GPT-Image-2 风格）

- 先声明“保持原图角色、人设、构图、姿态、画风不变”。
- 再列出最小必要修改步骤。
- 避免任何“重绘整图”“风格漂移”的措辞。
