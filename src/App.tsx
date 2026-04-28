import { useState } from 'react'
import { estimateEditCost, type EditMode } from './lib/imageEdit'
import {
  analyzeArtwork,
  generateGlobalOverlay,
  generateSelectedOverlay,
  inpaintGlobal,
  inpaintLocal,
  postKnowledgeCardGenerateImage,
  postKnowledgeCardGenerateText,
  postPracticeGenerateAnswer,
  postPracticeGenerateExercise,
} from './services/teacherApi'
import type { CritiqueIssue, ReviewTask, Severity } from './types'
import { calcRectCoverage, getActiveIssue, getLocalDemoForIssue, setActiveIssue } from './workflow/teacherWorkflow'
import ArtworkCanvas from './components/ArtworkCanvas'

const stageWidth = 860
const stageHeight = 560
const severityColor: Record<Severity, string> = { 高: '#b91c1c', 中: '#b45309', 低: '#0369a1' }

const fallbackIssues: CritiqueIssue[] = []

const makeFallbackTask = (imageUrl: string): ReviewTask => ({
  id: `fallback-${Date.now()}`,
  status: 'failed',
  imageUrl,
  artworkStage: '草稿',
  styleTarget: '平涂',
  subjectType: '角色',
  studentGoal: '请先修复后端接口',
  priorityStrategy: 'fallback',
  problems: fallbackIssues,
  selectedProblemIds: [],
  localDemos: [],
  artworkBounds: {
    faceRegion: { x: 0, y: 0, width: 0, height: 0 },
    textRegion: { x: 0, y: 0, width: 0, height: 0 },
    colorCardRegion: { x: 0, y: 0, width: 0, height: 0 },
    backgroundWhitespaceRegion: { x: 0, y: 0, width: 0, height: 0 },
  },
  knowledgeCards: [],
  practiceSets: [],
  studentMemory: { recurringIssues: [], learnedConcepts: [], generatedAssets: [], teacherSummary: '当前为 fallback 任务。' },
  aiMeta: { provider: 'unknown', analysisModel: 'unknown', imageModel: 'unknown', editModel: 'unknown', mode: 'mock_fallback', imageApiCalled: false, mock: true },
  logs: [{ time: new Date().toISOString(), status: 'failed', message: 'analyze 接口不可用，进入 fallback。' }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  mockMode: true,
})

function App() {
  const [task, setTask] = useState<ReviewTask | null>(null)
  const [tab, setTab] = useState<'local' | 'global'>('local')
  const [drawer, setDrawer] = useState<'knowledge' | 'practice' | 'history'>('knowledge')
  const [debugOpen, setDebugOpen] = useState(true)
  const [editMode, setEditMode] = useState<EditMode>('mask_precise')
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium')

  const activeIssue = task ? getActiveIssue(task) : undefined
  const currentDemo = task && activeIssue ? getLocalDemoForIssue(task, activeIssue.id) : undefined

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const imageUrl = URL.createObjectURL(file)
    try {
      const analyzed = await analyzeArtwork(imageUrl)
      setTask({ ...analyzed, imageUrl, mockMode: false })
    } catch {
      setTask(makeFallbackTask(imageUrl))
    }
  }

  const selectIssue = (issueId: string) => {
    if (!task) return
    setTask({ ...task, activeIssueId: setActiveIssue(task.activeIssueId ?? null, issueId), updatedAt: new Date().toISOString() })
  }

  const runGenerateSelected = async () => {
    if (!task || !activeIssue) return
    const localDemo = await generateSelectedOverlay(task.id, activeIssue.id)
    setTask({
      ...task,
      localDemos: [...task.localDemos.filter((d) => d.issueId !== activeIssue.id), localDemo],
      updatedAt: new Date().toISOString(),
    })
  }

  const runGenerateGlobalOverlay = async () => {
    if (!task) return
    const next = await generateGlobalOverlay(task.id, task.problems.map((p) => p.id))
    setTask({ ...task, globalDemo: next, updatedAt: new Date().toISOString() })
    setTab('global')
  }

  const runInpaintLocal = async () => {
    if (!task || !activeIssue) return
    if (calcRectCoverage(activeIssue.editRegion) > 20) {
      alert('mask 超过作品面积 20%，请先缩小选区。')
      return
    }
    const next = await inpaintLocal(task.id, activeIssue.id)
    setTask({ ...task, localDemos: [...task.localDemos.filter((d) => d.issueId !== activeIssue.id), next], updatedAt: new Date().toISOString() })
  }

  const runInpaintGlobal = async () => {
    if (!task) return
    const next = await inpaintGlobal(task.id, task.problems.map((p) => p.id))
    setTask({ ...task, globalDemo: next, updatedAt: new Date().toISOString() })
  }

  const genKnowledgeText = async () => {
    if (!task || !activeIssue) return
    const card = await postKnowledgeCardGenerateText(task.id, activeIssue.id)
    setTask({ ...task, knowledgeCards: [...task.knowledgeCards.filter((k) => k.issueId !== activeIssue.id), card], updatedAt: new Date().toISOString() })
  }

  const genKnowledgeImage = async () => {
    if (!task || !activeIssue) return
    const card = await postKnowledgeCardGenerateImage(task.id, activeIssue.id)
    setTask({ ...task, knowledgeCards: [...task.knowledgeCards.filter((k) => k.issueId !== activeIssue.id), card], updatedAt: new Date().toISOString() })
  }

  const genPractice = async () => {
    if (!task || !activeIssue) return
    const ex = await postPracticeGenerateExercise(task.id, activeIssue.id)
    const ans = await postPracticeGenerateAnswer(task.id, activeIssue.id)
    setTask({ ...task, practiceSets: [...task.practiceSets.filter((p) => p.issueId !== activeIssue.id), { ...ex, answerImageUrl: ans.answerImageUrl }], updatedAt: new Date().toISOString() })
  }

  return (
    <main className="studioPage">
      <header className="topBar"><div><h1>AI 老师工作台（真实链路优先）</h1><p>默认仅红线示范，真实修图需手动触发。</p></div></header>
      <section className="upload"><label htmlFor="file">上传作品</label><input id="file" type="file" accept="image/*" onChange={onUpload} /></section>

      {task ? (
        <>
          <section className="mainLayout">
            <section className="leftCanvas">
              <div className="tabRow"><button className={tab === 'local' ? 'tab activeTab' : 'tab'} onClick={() => setTab('local')}>局部</button><button className={tab === 'global' ? 'tab activeTab' : 'tab'} onClick={() => setTab('global')}>全局</button></div>
              <ArtworkCanvas imageUrl={task.imageUrl} width={stageWidth} height={stageHeight} annotations={tab === 'local' && activeIssue ? activeIssue.annotations : []} />
              {tab === 'local' ? <p>{currentDemo?.explanation ?? '请先生成该问题的红线示范。'}</p> : <p>{task.globalDemo?.explanation ?? '请先生成全局红线总览。'}</p>}
              <div className="controls"><button className="primary" onClick={runGenerateSelected}>看红线示范（仅当前问题）</button><button className="primary" onClick={runInpaintLocal}>生成局部真实修图</button><button className="primary" onClick={runGenerateGlobalOverlay}>生成三个问题的全局改图总览</button><button className="primary" onClick={runInpaintGlobal}>生成全局真实修图</button></div>
              <p className="memoryHint">真实修图可能改变画风，建议先看红线示范。预算约 ${estimateEditCost('1024x1024', quality).toFixed(2)}。</p>
              <div className="controls"><label>editMode<select value={editMode} onChange={(e) => setEditMode(e.target.value as EditMode)}><option value="mask_precise">mask_precise</option><option value="auto_protect">auto_protect</option></select></label><label>quality<select value={quality} onChange={(e) => setQuality(e.target.value as 'low'|'medium'|'high')}><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select></label></div>
            </section>
            <aside className="rightIssues">
              <h2>问题目录</h2>
              {task.problems.map((issue) => <button key={issue.id} className={task.activeIssueId === issue.id ? 'issue active' : 'issue'} onClick={() => selectIssue(issue.id)}><div className="issueTitle">{issue.title}</div><div className="meta"><span style={{ color: severityColor[issue.severity] }}>{issue.severity}</span><span>{issue.subDimension}</span></div></button>)}
            </aside>
          </section>

          <section className="drawer">
            <div className="tabRow"><button className={drawer==='knowledge'?'tab activeTab':'tab'} onClick={() => setDrawer('knowledge')}>知识卡片</button><button className={drawer==='practice'?'tab activeTab':'tab'} onClick={() => setDrawer('practice')}>训练图</button><button className={drawer==='history'?'tab activeTab':'tab'} onClick={() => setDrawer('history')}>历史痕迹</button></div>
            {drawer === 'knowledge' ? <div><button className="primary" onClick={genKnowledgeText}>生成文字卡</button><button className="primary" onClick={genKnowledgeImage}>生成图解卡</button></div> : null}
            {drawer === 'practice' ? <button className="primary" onClick={genPractice}>生成训练图与答案</button> : null}
            {drawer === 'history' ? <ul>{task.studentMemory.generatedAssets.map((a) => <li key={a.id}>{a.title}<a href={a.url} download>下载</a></li>)}</ul> : null}
          </section>

          <section className="debug"><button onClick={() => setDebugOpen((v) => !v)}>{debugOpen ? '收起' : '展开'} Debug</button>{debugOpen ? <pre>{JSON.stringify({
            mock: task.mockMode ?? task.aiMeta.mock,
            activeIssueId: task.activeIssueId,
            currentLocalDemo: currentDemo,
            globalDemo: task.globalDemo,
            imageApiCalled: currentDemo?.imageApiCalled ?? task.globalDemo?.imageApiCalled ?? false,
            qaScore: currentDemo?.qa?.score ?? task.globalDemo?.qa?.score,
            generatedUrls: {
              local: currentDemo?.editedCropUrl,
              overlay: currentDemo?.teacherOverlayUrl,
              global: task.globalDemo?.editedFullUrl,
            },
          }, null, 2)}</pre> : null}</section>
        </>
      ) : null}
    </main>
  )
}

export default App
