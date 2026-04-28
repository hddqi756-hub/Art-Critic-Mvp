import { useState } from 'react'
import { Arrow, Layer, Line, Rect, Stage, Text } from 'react-konva'
import { createEditRequest, estimateEditCost, type EditMode } from './lib/imageEdit'
import { postKnowledgeCardGenerate, postPracticeGenerate } from './services/teacherApi'
import type { Annotation, CritiqueIssue, EditQualityCheck, GeneratedAsset, GlobalDemo, LocalDemo, RectPercent, ReviewTask, Severity } from './types'
import { buildGlobalEditPrompt, calcRectCoverage, getActiveIssue, getLocalDemoForIssue, overlap, setActiveIssue, upsertLocalDemo } from './workflow/teacherWorkflow'

const stageWidth = 860
const stageHeight = 560
const severityColor: Record<Severity, string> = { 高: '#b91c1c', 中: '#b45309', 低: '#0369a1' }

const mockIssues: CritiqueIssue[] = [
  {
    id: 'issue-1', title: '抬起左手的前臂透视偏短', dimension: '造型与结构', subDimension: '人体比例', severity: '高', bodyPart: '左手与前臂', category: '人体结构', misconception: '只看手掌大小', student_friendly_reason: '左前臂长度偏短。', art_principle: '前臂缩短也要遵守透视比例。', visual_symptom: '肘到腕过短。', fix_steps: ['先标肩肘腕', '延长前臂轮廓', '统一腕部方向'], bbox: { x: 58, y: 28, width: 20, height: 28 }, editRegion: { x: 50, y: 21, width: 30, height: 42 }, annotations: [{ id: 'ann-1', issueId: 'issue-1', type: 'box', color: 'red', rect: { x: 58, y: 28, width: 20, height: 28 } }], cropPrompt: '前臂延长红线', practice: '肩肘腕速写', knowledgeCardPlan: { title: '前臂透视', keyConcept: '比例', commonMistake: '忽略肘腕距离', observationMethod: '先看三点长度', miniExercise: '20组快写' }, practicePlan: { title: '前臂专项', focus: '结构', steps: ['标点', '连线', '上轮廓'] }, imageEditPrompt: '只修前臂比例。',
  },
  {
    id: 'issue-2', title: '头发和皮肤明度过近', dimension: '明暗与光影', subDimension: '明度分组', severity: '中', bodyPart: '脸部与头发', category: '二分', misconception: '只改色相', student_friendly_reason: '脸部焦点不突出。', art_principle: '焦点区要拉开明度组。', visual_symptom: '灰度下脸和发粘连。', fix_steps: ['灰度检查', '提亮脸部', '压低头发暗面'], bbox: { x: 28, y: 10, width: 28, height: 30 }, editRegion: { x: 22, y: 8, width: 36, height: 34 }, annotations: [{ id: 'ann-2', issueId: 'issue-2', type: 'line', color: 'green', points: [220, 120, 340, 140] }], cropPrompt: '明度分组示意', practice: '3套明度方案', knowledgeCardPlan: { title: '明度分组', keyConcept: '黑白关系', commonMistake: '不拉开明度', observationMethod: '转灰度观察', miniExercise: '3套方案' }, practicePlan: { title: '明度专项', focus: '二分', steps: ['转灰度', '分组', '回彩色'] }, imageEditPrompt: '只修脸发明度。',
  },
  {
    id: 'issue-3', title: '主体重心偏右', dimension: '构图与画面设计', subDimension: '视觉重心', severity: '低', bodyPart: '整体画面', category: '构图', misconception: '忽略中轴', student_friendly_reason: '画面重心偏移。', art_principle: '留白要平衡。', visual_symptom: '中轴偏右。', fix_steps: ['画中轴', '微调主体', '补左侧呼应'], bbox: { x: 14, y: 14, width: 68, height: 72 }, editRegion: { x: 8, y: 8, width: 80, height: 84 }, annotations: [{ id: 'ann-3', issueId: 'issue-3', type: 'line', color: 'blue', points: [430, 20, 430, 540] }], cropPrompt: '构图中轴线', practice: '6张构图稿', knowledgeCardPlan: { title: '重心线', keyConcept: '视觉稳定', commonMistake: '越画越偏', observationMethod: '看中轴和负形', miniExercise: '6张缩略图' }, practicePlan: { title: '构图专项', focus: '构图', steps: ['先中轴', '排体积', '补细节'] }, imageEditPrompt: '只修重心。',
  },
]

const makeAsset = (type: GeneratedAsset['type'], title: string): GeneratedAsset => ({ id: `${type}-${Date.now()}`, type, title, url: 'mock://asset', createdAt: new Date().toISOString(), downloadable: true })

const buildQa = (score: number, reasons: string[] = []): EditQualityCheck => ({
  identityPreserved: score >= 80,
  posePreserved: score >= 80,
  outfitPreserved: score >= 80,
  stylePreserved: score >= 80,
  editRegionRespected: score >= 80,
  protectedRegionsRespected: score >= 80,
  issueImproved: score >= 70,
  overEdited: score < 80,
  artifactFound: score < 75,
  score,
  failureReasons: reasons,
  retryPrompt: '缩小mask并加强“保持角色与画风不变”约束后重试。',
})

const makeTask = (imageUrl: string): ReviewTask => ({
  id: `task-${Date.now()}`,
  status: 'waiting_selection',
  imageUrl,
  artworkStage: '二分',
  styleTarget: '平涂',
  subjectType: '角色',
  studentGoal: '稳定局部修改',
  priorityStrategy: '不同子类优先',
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

const toPxRect = (rect: RectPercent) => ({ x: (rect.x / 100) * stageWidth, y: (rect.y / 100) * stageHeight, width: (rect.width / 100) * stageWidth, height: (rect.height / 100) * stageHeight })

function App() {
  const [task, setTask] = useState<ReviewTask | null>(null)
  const [editMode, setEditMode] = useState<EditMode>('mask_precise')
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium')
  const [tab, setTab] = useState<'local' | 'global'>('local')

  const activeIssue = task ? getActiveIssue(task) : undefined
  const currentDemo = task && activeIssue ? getLocalDemoForIssue(task, activeIssue.id) : undefined
  const recurringHint = task && activeIssue && task.studentMemory.recurringIssues.includes(activeIssue.subDimension) ? '老师记得你上次也遇到过这个问题。' : ''
  const request = task && activeIssue ? createEditRequest(task.imageUrl, activeIssue, { editMode, quality, teacherMode: 'local_inpaint' }) : null

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setTask(makeTask(URL.createObjectURL(file)))
  }

  const onSelectIssue = (issueId: string) => {
    if (!task) return
    setTask({ ...task, activeIssueId: setActiveIssue(task.activeIssueId ?? null, issueId), updatedAt: new Date().toISOString() })
  }

  const generateOverlay = () => {
    if (!task || !activeIssue) return
    const demo: LocalDemo = { id: `ov-${activeIssue.id}-${task.localDemos.length + 1}`, issueId: activeIssue.id, mode: 'teacher_overlay', status: 'ready', beforeCropLabel: '原局部', afterLabel: '老师红线示范', explanation: '默认模式：只做老师批注，不调用真实图片编辑模型。', imageApiCalled: false, prompt: activeIssue.cropPrompt, mask: { id: `mask-${activeIssue.id}`, issueId: activeIssue.id, rect: activeIssue.editRegion, coveragePercent: calcRectCoverage(activeIssue.editRegion) } }
    setTask({ ...task, localDemos: upsertLocalDemo(task.localDemos, demo), studentMemory: { ...task.studentMemory, generatedAssets: [...task.studentMemory.generatedAssets, makeAsset('local_overlay', `${activeIssue.title}_红线`)] }, updatedAt: new Date().toISOString() })
  }

  const generateLocalInpaint = () => {
    if (!task || !activeIssue) return
    const coverage = calcRectCoverage(activeIssue.editRegion)
    if (coverage > 20) {
      alert('mask 超过作品面积 20%，请缩小选区后再尝试局部真实修图。')
      return
    }

    const protectedRegions = task.artworkBounds
    const protectedTouched = overlap(activeIssue.editRegion, protectedRegions.faceRegion) || overlap(activeIssue.editRegion, protectedRegions.textRegion) || overlap(activeIssue.editRegion, protectedRegions.colorCardRegion)
    const qa = protectedTouched ? buildQa(72, ['触达了保护区域，存在过度修改风险']) : buildQa(88)

    const demo: LocalDemo = {
      id: `inpaint-${activeIssue.id}-${task.localDemos.length + 1}`,
      issueId: activeIssue.id,
      mode: 'local_inpaint',
      status: qa.score < 80 ? 'needs_retry' : 'ready',
      beforeCropLabel: '原局部',
      afterLabel: qa.score < 80 ? '局部真实修图（需重试）' : '局部真实修图',
      explanation: qa.score < 80 ? '本次真实修图过度修改了原图，已标记为需要重试。' : '通过 QA，可作为局部修图参考。',
      imageApiCalled: true,
      prompt: activeIssue.imageEditPrompt,
      mask: { id: `mask-${activeIssue.id}`, issueId: activeIssue.id, rect: activeIssue.editRegion, coveragePercent: coverage },
      qa,
    }

    setTask({ ...task, localDemos: upsertLocalDemo(task.localDemos, demo), studentMemory: { ...task.studentMemory, generatedAssets: [...task.studentMemory.generatedAssets, makeAsset('real_edit', `${activeIssue.title}_局部真实修图`)] }, updatedAt: new Date().toISOString() })
  }

  const generateGlobalInpaint = () => {
    if (!task) return
    const qa = buildQa(76, ['全局修图改变了风格细节，建议先使用全局红线总览再重试'])
    const demo: GlobalDemo = {
      id: `global-${task.studentMemory.generatedAssets.length + 1}`,
      problemIds: task.problems.map((p) => p.id),
      mode: 'global_guided_edit',
      status: qa.score < 80 ? 'needs_retry' : 'ready',
      explanation: qa.score < 80 ? '全局真实修图 QA 未通过，已标记需要重试。' : '全局真实修图通过 QA。',
      prompt: buildGlobalEditPrompt(task.problems),
      imageApiCalled: true,
      globalOverlayUrl: 'mock://global-overlay',
      editedFullUrl: 'mock://global-edit',
      qa,
    }
    setTask({ ...task, globalDemo: demo, studentMemory: { ...task.studentMemory, generatedAssets: [...task.studentMemory.generatedAssets, makeAsset('real_edit', '三个问题_全局真实修图')] }, updatedAt: new Date().toISOString() })
    setTab('global')
  }

  const genCard = async () => {
    if (!task || !activeIssue) return
    const card = await postKnowledgeCardGenerate(task, activeIssue.id)
    setTask({ ...task, knowledgeCards: [...task.knowledgeCards.filter((k) => k.issueId !== activeIssue.id), card], updatedAt: new Date().toISOString() })
  }

  const genPractice = async () => {
    if (!task || !activeIssue) return
    const set = await postPracticeGenerate(task, activeIssue.id)
    setTask({ ...task, practiceSets: [...task.practiceSets.filter((p) => p.issueId !== activeIssue.id), set], updatedAt: new Date().toISOString() })
  }

  const stageAnnotations: Annotation[] = activeIssue ? activeIssue.annotations : []
  const activeCard = task && activeIssue ? task.knowledgeCards.find((k) => k.issueId === activeIssue.id) : undefined
  const activePractice = task && activeIssue ? task.practiceSets.find((p) => p.issueId === activeIssue.id) : undefined

  return (
    <main className="studioPage">
      <header className="topBar"><div><h1>AI 老师画室工作台（稳定性优先）</h1><p>默认模式：老师红线示范。真实修图请谨慎使用。</p></div></header>
      <section className="upload"><label htmlFor="file">上传作品</label><input id="file" type="file" accept="image/*" onChange={onUpload} /></section>
      {task ? (
        <>
          <section className="mainLayout">
            <section className="leftCanvas">
              <div className="tabRow"><button className={tab === 'local' ? 'tab activeTab' : 'tab'} onClick={() => setTab('local')}>局部模式</button><button className={tab === 'global' ? 'tab activeTab' : 'tab'} onClick={() => setTab('global')}>全局模式</button></div>
              <Stage width={stageWidth} height={stageHeight}><Layer><Rect x={0} y={0} width={stageWidth} height={stageHeight} fill="#fcfaf7" /></Layer><Layer>{tab === 'local' && stageAnnotations.map((a) => { if (a.type === 'box' && a.rect) { const r = toPxRect(a.rect); return <Rect key={a.id} x={r.x} y={r.y} width={r.width} height={r.height} stroke="red" /> } if (a.type === 'line' && a.points) return <Line key={a.id} points={a.points} stroke="red" />; if (a.type === 'arrow' && a.points) return <Arrow key={a.id} points={a.points} fill="red" stroke="red" />; return null })}{tab === 'global' ? <Text x={16} y={16} text="先看全局红线总览，再决定是否全局真实修图" fill="#334155" /> : null}</Layer></Stage>
              {tab === 'local' ? <p>{currentDemo ? currentDemo.explanation : '请先为这个问题生成红线示范。'}</p> : <p>{task.globalDemo?.explanation ?? '还没有全局示范结果。'}</p>}
              <div className="controls"><button className="primary" onClick={generateOverlay}>看红线示范（默认）</button><button className="primary" onClick={generateLocalInpaint}>生成局部真实修图</button><button className="primary" onClick={generateGlobalInpaint}>生成全局真实修图</button></div>
              <p className="memoryHint">真实修图可能改变画风，建议先看红线示范；QA低于80将自动标记“需要重试”。</p>
              <div className="editPanel"><label>模式<select value={editMode} onChange={(e) => setEditMode(e.target.value as EditMode)}><option value="mask_precise">mask_precise</option><option value="auto_protect">auto_protect</option></select></label><label>质量<select value={quality} onChange={(e) => setQuality(e.target.value as 'low'|'medium'|'high')}><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select></label><p>预算：${estimateEditCost('1024x1024', quality).toFixed(2)}</p>{request ? <pre>{JSON.stringify(request, null, 2)}</pre> : null}</div>
            </section>
            <aside className="rightIssues">
              <h2>3个主问题</h2>
              {task.problems.map((issue) => <button key={issue.id} className={task.activeIssueId===issue.id?'issue active':'issue'} onClick={() => onSelectIssue(issue.id)}><div className="issueTitle">{issue.title}</div><div className="meta"><span style={{color: severityColor[issue.severity]}}>{issue.severity}</span><span>{issue.subDimension}</span></div></button>)}
              {recurringHint ? <p className="memoryHint">{recurringHint}</p> : null}
            </aside>
          </section>
          <section className="drawer"><div className="tabRow"><button className="tab" onClick={genCard}>生成文字知识卡</button><button className="tab" onClick={genPractice}>生成训练图与答案</button></div>{activeCard ? <pre>{JSON.stringify(activeCard, null, 2)}</pre> : null}{activePractice ? <pre>{JSON.stringify(activePractice, null, 2)}</pre> : null}<ul>{task.studentMemory.generatedAssets.map((asset) => <li key={asset.id}>{asset.title}<a href={asset.url} download>下载</a></li>)}</ul></section>
        </>
      ) : null}
    </main>
  )
}

export default App
