import { useState } from 'react'
import { Arrow, Layer, Line, Rect, Stage, Text } from 'react-konva'
import { createEditRequest, estimateEditCost, type EditMode } from './lib/imageEdit'
import type { Annotation, CritiqueIssue, GlobalDemo, LocalDemo, RectPercent, ReviewTask, Severity } from './types'
import {
  buildGlobalEditPrompt,
  getActiveIssue,
  getLocalDemoForIssue,
  setActiveIssue,
  upsertLocalDemo,
} from './workflow/teacherWorkflow'

const stageWidth = 860
const stageHeight = 560

const learningStatusText: Record<ReviewTask['status'], string> = {
  uploaded: '已上传作品，准备进入老师诊断',
  analyzing: '正在找主要问题（仅保留最关键 3 项）',
  marked: '已完成定位和红线批注方案',
  waiting_selection: '请先选择一个问题看局部示范',
  generating_local_demo: '正在生成局部红线示范（非真实修图）',
  partial_done: '局部红线示范完成，可选择是否做真实修图',
  done: '流程完成（如需真实修图可继续触发）',
  failed: '处理失败，请重新上传或重试',
}

const severityColor: Record<Severity, string> = { 高: '#b91c1c', 中: '#b45309', 低: '#0369a1' }

const mockIssues: CritiqueIssue[] = [
  {
    id: 'issue-1',
    title: '抬起左手的前臂透视偏短',
    severity: '高',
    bodyPart: '左手与前臂',
    category: '人体结构',
    student_friendly_reason: '左前臂长度比上臂短太多，像“突然断掉一截”，会让动作看起来僵。',
    art_principle: '人体动态中，上臂与前臂需要遵守可读的比例与透视缩短逻辑。',
    visual_symptom: '手肘到手腕距离过短，手掌方向与前臂轴线不一致。',
    fix_steps: ['先画肩-肘-腕三点动线', '把前臂外轮廓延长 12%-18%', '统一手掌朝向与腕部转折'],
    bbox: { x: 58, y: 28, width: 20, height: 28 },
    editRegion: { x: 50, y: 21, width: 30, height: 42 },
    annotations: [
      { id: 'ann-1', issueId: 'issue-1', type: 'box', color: 'red', rect: { x: 58, y: 28, width: 20, height: 28 }, label: '前臂过短' },
      { id: 'ann-2', issueId: 'issue-1', type: 'arrow', color: 'red', points: [640, 190, 700, 160] },
    ],
    cropPrompt: '在原图该区域叠加老师红线：延长前臂轮廓，统一腕部与手掌方向。',
    practice: '练习“肩肘腕三点速写”10 组，每组 30 秒，只画结构线。',
  },
  {
    id: 'issue-2',
    title: '头颈肩连接断层',
    severity: '中',
    bodyPart: '头部与肩颈',
    category: '结构连接',
    student_friendly_reason: '头看起来像“悬空放上去”，脖子没有承重感。',
    art_principle: '颈部是头与胸廓的结构桥梁，需要体现斜方肌与锁骨走向。',
    visual_symptom: '下颌到底部胸腔之间缺少过渡体块，锁骨倾角不一致。',
    fix_steps: ['先补出颈部圆柱体', '加出左右斜方肌到肩峰', '对齐锁骨角度后再修轮廓'],
    bbox: { x: 34, y: 12, width: 26, height: 24 },
    editRegion: { x: 28, y: 8, width: 34, height: 30 },
    annotations: [{ id: 'ann-4', issueId: 'issue-2', type: 'box', color: 'red', rect: { x: 34, y: 12, width: 26, height: 24 }, label: '连接断层' }],
    cropPrompt: '在颈肩区域叠加辅助结构线，补齐头颈肩连接体块。',
    practice: '临摹 5 张头像，额外加画颈部圆柱和锁骨线。',
  },
  {
    id: 'issue-3',
    title: '主体重心偏右，构图不稳',
    severity: '低',
    bodyPart: '整体构图',
    category: '构图',
    student_friendly_reason: '人物主要体积都挤在右边，左侧留白过大，画面容易“倒”。',
    art_principle: '单人构图要平衡视觉重量，可通过负形和辅助重心线校正。',
    visual_symptom: '人物中轴线偏离画幅中心，左侧空白缺少呼应元素。',
    fix_steps: ['拉一条画幅中线', '把肩线与骨盆线向左微移', '在左侧补轻量级形体呼应'],
    bbox: { x: 18, y: 16, width: 66, height: 70 },
    editRegion: { x: 8, y: 8, width: 80, height: 84 },
    annotations: [{ id: 'ann-7', issueId: 'issue-3', type: 'line', color: 'blue', points: [430, 20, 430, 540], label: '画幅中线' }],
    cropPrompt: '叠加构图中线和视觉重心线，示意主体微移方向。',
    practice: '做 6 张“同一人物不同留白”小构图，比较稳定感。',
  },
]

const toPxRect = (rect: RectPercent) => ({
  x: (rect.x / 100) * stageWidth,
  y: (rect.y / 100) * stageHeight,
  width: (rect.width / 100) * stageWidth,
  height: (rect.height / 100) * stageHeight,
})

const makeInitialTask = (imageUrl: string): ReviewTask => ({
  id: `task-${Date.now()}`,
  status: 'waiting_selection',
  imageUrl,
  problems: mockIssues,
  selectedProblemIds: [],
  activeIssueId: mockIssues[0].id,
  localDemos: [],
  globalDemo: undefined,
  aiMeta: {
    provider: 'openai',
    analysisModel: 'gpt-5.5',
    imageModel: 'gpt-image-2',
    editModel: 'gpt-image-2',
    mode: 'mock_fallback',
    imageApiCalled: false,
    mock: true,
    warning: '当前为红线示范，未调用真实修图模型。',
  },
  logs: [{ time: new Date().toISOString(), status: 'analyzing', message: '已提炼 3 个主问题并生成标注计划' }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

function App() {
  const [task, setTask] = useState<ReviewTask | null>(null)
  const [showDebug, setShowDebug] = useState(true)
  const [activeTab, setActiveTab] = useState<'local' | 'global'>('local')
  const [editMode, setEditMode] = useState<EditMode>('auto_protect')
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium')
  const [size, setSize] = useState<'1024x1024' | '1024x1536' | '1536x1024'>('1024x1024')

  const activeIssue = task ? getActiveIssue(task.problems, task.activeIssueId ?? null) : undefined
  const currentLocalDemo = task ? getLocalDemoForIssue(task.localDemos, task.activeIssueId ?? null) : undefined
  const editRequest = task && activeIssue ? createEditRequest(task.imageUrl, activeIssue, { editMode, quality, size }) : null

  const onUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setTask(makeInitialTask(URL.createObjectURL(file)))
  }

  const onSelectIssue = (issueId: string) => {
    if (!task) return
    setTask({ ...task, activeIssueId: setActiveIssue(task.activeIssueId ?? null, issueId), updatedAt: new Date().toISOString() })
  }

  const generateLocalDemo = async () => {
    if (!task || !activeIssue) return
    const demo: LocalDemo = {
      id: `local-${activeIssue.id}-${task.localDemos.length + 1}`,
      issueId: activeIssue.id,
      status: 'teacher_overlay',
      beforeCropLabel: '原局部',
      afterLabel: '老师红线示范',
      explanation: `${activeIssue.student_friendly_reason}。按步骤修改：${activeIssue.fix_steps.join('；')}。`,
      imageApiCalled: false,
      prompt: activeIssue.cropPrompt,
    }

    setTask({
      ...task,
      status: 'partial_done',
      selectedProblemIds: [activeIssue.id],
      localDemos: upsertLocalDemo(task.localDemos, demo),
      logs: [...task.logs, { time: new Date().toISOString(), status: 'generating_local_demo', message: `已为 ${activeIssue.title} 生成单项红线示范` }],
      updatedAt: new Date().toISOString(),
    })
  }

  const generateGlobalDemo = async () => {
    if (!task) return
    const problemIds = task.problems.map((item) => item.id)
    const globalDemo: GlobalDemo = {
      id: `global-${task.id}`,
      problemIds,
      explanation: '三个问题的全局改图总览（老师批注层，不调用真实修图模型）。',
      prompt: buildGlobalEditPrompt(task.problems),
      globalOverlayUrl: 'mock://global-overlay',
      editedFullUrl: 'mock://global-edit-preview',
      imageApiCalled: false,
      mode: 'teacher_overlay',
    }
    setTask({
      ...task,
      globalDemo,
      status: 'partial_done',
      logs: [...task.logs, { time: new Date().toISOString(), status: 'marked', message: '已生成三个问题的全局改图总览' }],
      updatedAt: new Date().toISOString(),
    })
    setActiveTab('global')
  }

  const stageAnnotations: Annotation[] = activeIssue ? activeIssue.annotations : []

  return (
    <main className="page">
      <h1>AI 绘画老师工作台（V2）</h1>
      <section className="upload"><label htmlFor="file">上传作品</label><input id="file" type="file" accept="image/*" onChange={onUpload} /></section>
      {task ? (
        <>
          <section className="status">学习进度：{learningStatusText[task.status]}</section>
          <section className="workspace">
            <div className="canvasWrap">
              <div className="tabRow">
                <button className={activeTab === 'local' ? 'tab activeTab' : 'tab'} onClick={() => setActiveTab('local')}>局部红线</button>
                <button className={activeTab === 'global' ? 'tab activeTab' : 'tab'} onClick={() => setActiveTab('global')}>全局改图</button>
              </div>
              <Stage width={stageWidth} height={stageHeight}>
                <Layer><Rect x={0} y={0} width={stageWidth} height={stageHeight} fill="#f8fafc" /></Layer>
                <Layer>
                  {activeTab === 'local' && stageAnnotations.map((item) => {
                    if (item.type === 'box' && item.rect) {
                      const rect = toPxRect(item.rect)
                      return <Rect key={item.id} x={rect.x} y={rect.y} width={rect.width} height={rect.height} stroke={item.color ?? 'red'} strokeWidth={3} />
                    }
                    if (item.type === 'line' && item.points) return <Line key={item.id} points={item.points} stroke={item.color ?? 'red'} strokeWidth={3} />
                    if (item.type === 'arrow' && item.points) return <Arrow key={item.id} points={item.points} stroke={item.color ?? 'red'} fill={item.color ?? 'red'} strokeWidth={3} />
                    return null
                  })}
                  {activeTab === 'global' ? <Text x={16} y={16} text="全局改图模式：展示三个问题综合总览" fill="#334155" /> : null}
                </Layer>
              </Stage>

              {activeTab === 'local' ? (
                <div>
                  {currentLocalDemo ? <p>{currentLocalDemo.explanation}</p> : <p>请先为这个问题生成红线示范。</p>}
                  <button className="primary" onClick={generateLocalDemo}>看红线示范（仅当前问题）</button>
                </div>
              ) : (
                <div>
                  {task.globalDemo ? <p>{task.globalDemo.explanation}</p> : <p>还没有全局总览，请先生成。</p>}
                  <div className="sliderStub"><div>原图</div><div>{task.globalDemo ? 'globalOverlay / editedFull' : '等待生成'}</div></div>
                  <button className="primary" onClick={generateGlobalDemo}>生成三个问题的全局改图总览</button>
                </div>
              )}
            </div>

            <aside className="side">
              <h2>问题目录（点击只切换当前问题）</h2>
              {task.problems.map((issue) => (
                <button key={issue.id} className={task.activeIssueId === issue.id ? 'issue active' : 'issue'} onClick={() => onSelectIssue(issue.id)}>
                  <div className="issueTitle">{issue.title}</div>
                  <div className="meta"><span style={{ color: severityColor[issue.severity] }}>严重度：{issue.severity}</span><span>{issue.category}</span></div>
                </button>
              ))}
              <p className="warning">红线示范：不调用真实图片编辑模型。真实修图：调用图片编辑模型。</p>
            </aside>
          </section>

          {activeIssue ? <section className="teaching"><h2>教学区</h2><p>{activeIssue.visual_symptom}</p><ol>{activeIssue.fix_steps.map((s) => <li key={s}>{s}</li>)}</ol><p>{activeIssue.practice}</p></section> : null}

          <section className="editPanel">
            <h2>真实修图请求（GPT-Image-2风格）</h2>
            <div className="controls">
              <label>编辑模式<select value={editMode} onChange={(e) => setEditMode(e.target.value as EditMode)}><option value="auto_protect">自动保护其余区域</option><option value="mask_precise">Mask 精修</option></select></label>
              <label>质量<select value={quality} onChange={(e) => setQuality(e.target.value as 'low' | 'medium' | 'high')}><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select></label>
              <label>尺寸<select value={size} onChange={(e) => setSize(e.target.value as '1024x1024' | '1024x1536' | '1536x1024')}><option value="1024x1024">1024x1024</option><option value="1024x1536">1024x1536</option><option value="1536x1024">1536x1024</option></select></label>
            </div>
            <p>预估单次成本：${estimateEditCost(size, quality).toFixed(2)}</p>
            {editRequest ? <pre>{JSON.stringify(editRequest, null, 2)}</pre> : null}
          </section>

          <section className="debug"><h2>Debug 面板 <button onClick={() => setShowDebug((p) => !p)}>{showDebug ? '收起' : '展开'}</button></h2>{showDebug ? <pre>{JSON.stringify(task, null, 2)}</pre> : null}</section>
        </>
      ) : <section className="empty">请先上传作品。</section>}
    </main>
  )
}

export default App
