import { useMemo, useState } from 'react'
import { Arrow, Layer, Line, Rect, Stage, Text } from 'react-konva'
import { createEditRequest, estimateEditCost, type EditMode } from './lib/imageEdit'
import { postKnowledgeCardGenerate, postPracticeGenerate } from './services/teacherApi'
import type {
  Annotation,
  CritiqueIssue,
  GeneratedAsset,
  GlobalDemo,
  LocalDemo,
  RectPercent,
  ReviewTask,
  Severity,
} from './types'
import { buildGlobalEditPrompt, getActiveIssue, getLocalDemoForIssue, setActiveIssue, upsertLocalDemo } from './workflow/teacherWorkflow'

const stageWidth = 860
const stageHeight = 560

const severityColor: Record<Severity, string> = { 高: '#b91c1c', 中: '#b45309', 低: '#0369a1' }

const mockIssues: CritiqueIssue[] = [
  {
    id: 'issue-1',
    title: '抬起左手的前臂透视偏短',
    dimension: '造型与结构',
    subDimension: '人体比例',
    severity: '高',
    bodyPart: '左手与前臂',
    category: '人体结构',
    misconception: '只看手掌大小，没有同时校验肩-肘-腕长度关系。',
    student_friendly_reason: '左前臂长度比上臂短太多，动作会显得断裂。',
    art_principle: '动态人物中，前臂缩短也要遵守透视比例。',
    visual_symptom: '手肘到手腕过短，腕部方向和手掌不一致。',
    fix_steps: ['先标肩肘腕三点', '延长前臂外轮廓 12%-18%', '统一腕与手掌朝向'],
    bbox: { x: 58, y: 28, width: 20, height: 28 },
    editRegion: { x: 50, y: 21, width: 30, height: 42 },
    annotations: [{ id: 'ann-1', issueId: 'issue-1', type: 'box', color: 'red', rect: { x: 58, y: 28, width: 20, height: 28 }, label: '前臂过短' }],
    cropPrompt: '叠加前臂延长红线与腕部方向线。',
    practice: '肩肘腕速写 10 组。',
    knowledgeCardPlan: {
      title: '前臂透视为什么容易画短',
      keyConcept: '肩肘腕比例 + 透视缩短',
      commonMistake: '只纠结手掌大小',
      observationMethod: '先看肘到腕距离再看掌长',
      miniExercise: '三角动势线 20 组',
    },
    practicePlan: { title: '前臂比例专项', focus: '人体比例', steps: ['画肩肘腕点', '连动势线', '覆盖轮廓'] },
    imageEditPrompt: '只修前臂比例，保持角色、人设、构图、姿态、画风不变。',
  },
  {
    id: 'issue-2',
    title: '头发和皮肤明度过近',
    dimension: '明暗与光影',
    subDimension: '明度分组',
    severity: '中',
    bodyPart: '脸部与头发',
    category: '二分',
    misconception: '只换色相，不拉开黑白关系。',
    student_friendly_reason: '脸和头发灰度太像，主角脸部不够突出。',
    art_principle: '焦点区域需要和相邻大形体拉开明度层级。',
    visual_symptom: '转灰度后脸部边缘与头发边缘粘连。',
    fix_steps: ['先做灰度检查', '提高脸部亮面组', '压低头发暗面组'],
    bbox: { x: 28, y: 10, width: 28, height: 30 },
    editRegion: { x: 22, y: 8, width: 36, height: 34 },
    annotations: [{ id: 'ann-2', issueId: 'issue-2', type: 'line', color: 'green', points: [220, 120, 340, 140], label: '拉开明度' }],
    cropPrompt: '叠加脸与头发明度分组示意线。',
    practice: '同头像做 3 套明度分组。',
    knowledgeCardPlan: {
      title: '为什么肤色和头发要拉开明度',
      keyConcept: '明度分组',
      commonMistake: '只改色相不改黑白',
      observationMethod: '灰度观察脸和头发是否可分离',
      miniExercise: '3 套不同明度方案',
    },
    practicePlan: { title: '明度分组专项', focus: '二分', steps: ['转灰度', '标亮暗面', '回到彩色微调'] },
    imageEditPrompt: '只修脸与头发的明度分组，保持角色与构图不变。',
  },
  {
    id: 'issue-3',
    title: '主体重心偏右，留白失衡',
    dimension: '构图与画面设计',
    subDimension: '视觉重心',
    severity: '低',
    bodyPart: '整体画面',
    category: '构图',
    misconception: '关注局部细节，忽略整体重心线。',
    student_friendly_reason: '人物体积挤在右边，画面会有“要倒”的感觉。',
    art_principle: '人物构图需平衡视觉重量和留白节奏。',
    visual_symptom: '中轴线偏右，左侧负形过空。',
    fix_steps: ['画中轴线', '微调肩胯位置', '补左侧轻量呼应'],
    bbox: { x: 14, y: 14, width: 68, height: 72 },
    editRegion: { x: 8, y: 8, width: 80, height: 84 },
    annotations: [{ id: 'ann-3', issueId: 'issue-3', type: 'line', color: 'blue', points: [430, 20, 430, 540] }],
    cropPrompt: '叠加构图中轴线与重心线。',
    practice: '6 张不同留白构图小稿。',
    knowledgeCardPlan: {
      title: '重心线为什么决定画面稳定感',
      keyConcept: '视觉重心',
      commonMistake: '人物越画越偏但不自知',
      observationMethod: '先看中轴再看负形面积',
      miniExercise: '同角色做 6 张构图缩略图',
    },
    practicePlan: { title: '构图稳定性专项', focus: '构图', steps: ['先画中轴', '排主次形体', '再加细节'] },
    imageEditPrompt: '只修构图重心，保持角色造型和画风不变。',
  },
]

const toPxRect = (rect: RectPercent) => ({
  x: (rect.x / 100) * stageWidth,
  y: (rect.y / 100) * stageHeight,
  width: (rect.width / 100) * stageWidth,
  height: (rect.height / 100) * stageHeight,
})

const makeAsset = (type: GeneratedAsset['type'], title: string): GeneratedAsset => ({
  id: `${type}-${Date.now()}`,
  type,
  title,
  url: 'mock://asset-preview',
  createdAt: new Date().toISOString(),
  downloadable: true,
})

const makeInitialTask = (imageUrl: string): ReviewTask => ({
  id: `task-${Date.now()}`,
  status: 'waiting_selection',
  imageUrl,
  artworkStage: '二分',
  styleTarget: '日系赛璐璐',
  subjectType: '角色',
  studentGoal: '提升二分与结构稳定性',
  priorityStrategy: '三问题分属不同子类优先',
  problems: mockIssues,
  selectedProblemIds: [],
  activeIssueId: mockIssues[0].id,
  localDemos: [],
  globalDemo: undefined,
  knowledgeCards: [],
  practiceSets: [],
  studentMemory: {
    recurringIssues: ['明度分组'],
    learnedConcepts: ['肩肘腕结构'],
    generatedAssets: [],
    teacherSummary: '上次你在头颈肩和明度分组上卡住，这次继续优先看结构+二分。',
  },
  aiMeta: {
    provider: 'openai',
    analysisModel: 'gpt-5.5',
    imageModel: 'gpt-image-2',
    editModel: 'gpt-image-2',
    mode: 'mock_fallback',
    imageApiCalled: false,
    mock: true,
    warning: '当前默认是红线示范流程。',
  },
  logs: [{ time: new Date().toISOString(), status: 'analyzing', message: '已完成阶段/风格/目标识别并输出 3 个主问题' }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

function App() {
  const [task, setTask] = useState<ReviewTask | null>(null)
  const [activeCanvasTab, setActiveCanvasTab] = useState<'local' | 'global'>('local')
  const [drawerTab, setDrawerTab] = useState<'knowledge' | 'practice' | 'history'>('knowledge')
  const [showDebug, setShowDebug] = useState(false)
  const [editMode, setEditMode] = useState<EditMode>('auto_protect')
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium')

  const activeIssue = task ? getActiveIssue(task.problems, task.activeIssueId ?? null) : undefined
  const currentLocalDemo = task ? getLocalDemoForIssue(task.localDemos, task.activeIssueId ?? null) : undefined
  const recurringHint = useMemo(() => {
    if (!task || !activeIssue) return null
    return task.studentMemory.recurringIssues.includes(activeIssue.subDimension) ? `老师记得你上次也在「${activeIssue.subDimension}」卡住。` : null
  }, [task, activeIssue])

  const editRequest = task && activeIssue ? createEditRequest(task.imageUrl, activeIssue, { editMode, quality }) : null

  const onUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setTask(makeInitialTask(URL.createObjectURL(file)))
  }

  const onSelectIssue = (issueId: string) => {
    if (!task) return
    setTask({ ...task, activeIssueId: setActiveIssue(task.activeIssueId ?? null, issueId), updatedAt: new Date().toISOString() })
  }

  const generateLocalDemo = () => {
    if (!task || !activeIssue) return
    const localDemo: LocalDemo = {
      id: `local-${activeIssue.id}-${task.localDemos.length + 1}`,
      issueId: activeIssue.id,
      status: 'teacher_overlay',
      beforeCropLabel: '原局部',
      afterLabel: '老师红线示范',
      explanation: `${activeIssue.student_friendly_reason}。${activeIssue.misconception}`,
      imageApiCalled: false,
      prompt: activeIssue.cropPrompt,
    }

    const generatedAssets = [
      ...task.studentMemory.generatedAssets,
      makeAsset('local_overlay', `${activeIssue.title}_局部红线`),
    ]

    setTask({
      ...task,
      status: 'partial_done',
      localDemos: upsertLocalDemo(task.localDemos, localDemo),
      selectedProblemIds: [activeIssue.id],
      studentMemory: {
        ...task.studentMemory,
        generatedAssets,
        recurringIssues: Array.from(new Set([...task.studentMemory.recurringIssues, activeIssue.subDimension])),
      },
      updatedAt: new Date().toISOString(),
    })
  }

  const generateGlobalDemo = () => {
    if (!task) return
    const globalDemo: GlobalDemo = {
      id: `global-${task.id}`,
      problemIds: task.problems.map((item) => item.id),
      explanation: '三个问题综合总览（老师批注，不调用真实修图模型）。',
      prompt: buildGlobalEditPrompt(task.problems),
      globalOverlayUrl: 'mock://global-overlay',
      editedFullUrl: 'mock://global-edit-preview',
      imageApiCalled: false,
      mode: 'teacher_overlay',
    }

    setTask({
      ...task,
      globalDemo,
      studentMemory: {
        ...task.studentMemory,
        generatedAssets: [...task.studentMemory.generatedAssets, makeAsset('global_overlay', '三个问题全局总览')],
      },
      updatedAt: new Date().toISOString(),
    })
    setActiveCanvasTab('global')
  }

  const generateKnowledgeCard = async () => {
    if (!task || !activeIssue) return
    const card = await postKnowledgeCardGenerate(task, activeIssue.id)
    setTask({
      ...task,
      knowledgeCards: [...task.knowledgeCards.filter((item) => item.issueId !== card.issueId), card],
      studentMemory: {
        ...task.studentMemory,
        learnedConcepts: Array.from(new Set([...task.studentMemory.learnedConcepts, card.concept])),
        generatedAssets: [...task.studentMemory.generatedAssets, makeAsset('knowledge_card', `${card.title}_文字卡`)],
      },
      updatedAt: new Date().toISOString(),
    })
  }

  const generatePractice = async () => {
    if (!task || !activeIssue) return
    const set = await postPracticeGenerate(task, activeIssue.id)
    setTask({
      ...task,
      practiceSets: [...task.practiceSets.filter((item) => item.issueId !== set.issueId), set],
      studentMemory: {
        ...task.studentMemory,
        generatedAssets: [
          ...task.studentMemory.generatedAssets,
          makeAsset('practice', `${set.title}_训练图`),
          makeAsset('practice_answer', `${set.title}_参考答案`),
        ],
      },
      updatedAt: new Date().toISOString(),
    })
  }

  const stageAnnotations: Annotation[] = activeIssue ? activeIssue.annotations : []
  const activeKnowledge = task && activeIssue ? task.knowledgeCards.find((item) => item.issueId === activeIssue.id) : undefined
  const activePractice = task && activeIssue ? task.practiceSets.find((item) => item.issueId === activeIssue.id) : undefined

  return (
    <main className="studioPage">
      <header className="topBar">
        <div>
          <h1>AI 老师画室工作台 V3</h1>
          <p>{task ? `${task.artworkStage} / ${task.styleTarget} / 训练目标：${task.studentGoal}` : '上传作品后开始诊断'}</p>
        </div>
        <div className="memoryCapsule">{task?.studentMemory.teacherSummary ?? '老师记忆将显示在这里'}</div>
        <button className="exportBtn">导出本次报告</button>
      </header>

      <section className="upload"><label htmlFor="file">上传作品</label><input id="file" type="file" accept="image/*" onChange={onUpload} /></section>

      {task ? (
        <>
          <section className="mainLayout">
            <section className="leftCanvas">
              <div className="tabRow">
                <button className={activeCanvasTab === 'local' ? 'tab activeTab' : 'tab'} onClick={() => setActiveCanvasTab('local')}>局部红线</button>
                <button className={activeCanvasTab === 'global' ? 'tab activeTab' : 'tab'} onClick={() => setActiveCanvasTab('global')}>全局改图</button>
              </div>
              <Stage width={stageWidth} height={stageHeight}>
                <Layer><Rect x={0} y={0} width={stageWidth} height={stageHeight} fill="#fcfaf7" /></Layer>
                <Layer>
                  {activeCanvasTab === 'local' && stageAnnotations.map((item) => {
                    if (item.type === 'box' && item.rect) {
                      const rect = toPxRect(item.rect)
                      return <Rect key={item.id} x={rect.x} y={rect.y} width={rect.width} height={rect.height} stroke={item.color ?? 'red'} strokeWidth={3} />
                    }
                    if (item.type === 'line' && item.points) return <Line key={item.id} points={item.points} stroke={item.color ?? 'red'} strokeWidth={3} />
                    if (item.type === 'arrow' && item.points) return <Arrow key={item.id} points={item.points} stroke={item.color ?? 'red'} fill={item.color ?? 'red'} strokeWidth={3} />
                    return null
                  })}
                  {activeCanvasTab === 'global' ? <Text x={20} y={20} text="全局总览：原图 vs 全局红线 / 全局修图" fill="#334155" /> : null}
                </Layer>
              </Stage>

              {activeCanvasTab === 'local' ? (
                <>
                  {currentLocalDemo ? <p>{currentLocalDemo.explanation}</p> : <p>请先为这个问题生成红线示范。</p>}
                  <button className="primary" onClick={generateLocalDemo}>看红线示范（仅当前问题）</button>
                </>
              ) : (
                <>
                  <div className="sliderStub"><div>原图</div><div>{task.globalDemo ? 'globalOverlayUrl / editedFullUrl' : '等待生成'}</div></div>
                  <button className="primary" onClick={generateGlobalDemo}>生成三个问题的全局改图总览</button>
                </>
              )}

              <div className="editPanel">
                <h3>真实修图请求预览</h3>
                <div className="controls">
                  <label>模式<select value={editMode} onChange={(e) => setEditMode(e.target.value as EditMode)}><option value="auto_protect">自动保护</option><option value="mask_precise">Mask 精修</option></select></label>
                  <label>质量<select value={quality} onChange={(e) => setQuality(e.target.value as 'low' | 'medium' | 'high')}><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select></label>
                </div>
                <p>预算参考：${estimateEditCost('1024x1024', quality).toFixed(2)}</p>
                {editRequest ? <pre>{JSON.stringify(editRequest, null, 2)}</pre> : null}
              </div>
            </section>

            <aside className="rightIssues">
              <h2>老师挑出的 3 个主问题</h2>
              {task.problems.map((issue) => (
                <button key={issue.id} className={task.activeIssueId === issue.id ? 'issue active' : 'issue'} onClick={() => onSelectIssue(issue.id)}>
                  <div className="issueTitle">{issue.title}</div>
                  <div className="meta"><span style={{ color: severityColor[issue.severity] }}>严重度：{issue.severity}</span><span>{issue.dimension} / {issue.subDimension}</span></div>
                </button>
              ))}
              {recurringHint ? <p className="memoryHint">{recurringHint}</p> : null}
            </aside>
          </section>

          <section className="drawer">
            <div className="tabRow">
              <button className={drawerTab === 'knowledge' ? 'tab activeTab' : 'tab'} onClick={() => setDrawerTab('knowledge')}>知识卡片</button>
              <button className={drawerTab === 'practice' ? 'tab activeTab' : 'tab'} onClick={() => setDrawerTab('practice')}>基础训练</button>
              <button className={drawerTab === 'history' ? 'tab activeTab' : 'tab'} onClick={() => setDrawerTab('history')}>历史痕迹</button>
            </div>
            {drawerTab === 'knowledge' ? (
              <div>
                <button className="primary" onClick={generateKnowledgeCard}>生成文字知识卡</button>
                {activeKnowledge ? <pre>{JSON.stringify(activeKnowledge, null, 2)}</pre> : <p>当前问题还没有知识卡。</p>}
              </div>
            ) : null}
            {drawerTab === 'practice' ? (
              <div>
                <button className="primary" onClick={generatePractice}>生成训练图与参考答案</button>
                {activePractice ? <pre>{JSON.stringify(activePractice, null, 2)}</pre> : <p>当前问题还没有训练集。</p>}
              </div>
            ) : null}
            {drawerTab === 'history' ? (
              <ul>
                {task.studentMemory.generatedAssets.map((asset) => (
                  <li key={asset.id}>{asset.title}（{asset.createdAt.slice(0, 10)}）<a href={asset.url} download>下载</a></li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="debug"><button onClick={() => setShowDebug((prev) => !prev)}>{showDebug ? '收起' : '展开'} Debug</button>{showDebug ? <pre>{JSON.stringify(task, null, 2)}</pre> : null}</section>
        </>
      ) : null}
    </main>
  )
}

export default App
