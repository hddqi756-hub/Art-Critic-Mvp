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
import {
  createOfflineGlobalDemo,
  createOfflineKnowledgeCard,
  createOfflineLocalDemo,
  createOfflinePracticeSet,
  createOfflineReviewTask,
} from './lib/offlineDemo'
import type { ReviewTask, Severity } from './types'
import { calcRectCoverage, getActiveIssue, getLocalDemoForIssue, upsertLocalDemo } from './workflow/teacherWorkflow'
import ArtworkCanvas from './components/ArtworkCanvas'

const stageWidth = 860
const stageHeight = 560
const severityColor: Record<Severity, string> = { 高: '#b91c1c', 中: '#b45309', 低: '#0369a1' }

const explainError = (error: unknown) => (error instanceof Error ? error.message : '未知错误')

function App() {
  const [task, setTask] = useState<ReviewTask | null>(null)
  const [tab, setTab] = useState<'local' | 'global'>('local')
  const [drawer, setDrawer] = useState<'knowledge' | 'practice' | 'history'>('knowledge')
  const [debugOpen, setDebugOpen] = useState(true)
  const [editMode, setEditMode] = useState<EditMode>('mask_precise')
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium')
  const [busy, setBusy] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)

  const activeIssue = task ? getActiveIssue(task) : undefined
  const currentDemo = task && activeIssue ? getLocalDemoForIssue(task, activeIssue.id) : undefined
  const offlineMode = Boolean(task?.mockMode || task?.aiMeta.mock)

  const patchTask = (next: ReviewTask) => {
    setTask({ ...next, updatedAt: new Date().toISOString() })
  }

  const runAction = async (label: string, action: () => Promise<void>) => {
    setBusy(label)
    setLastError(null)
    try {
      await action()
    } catch (error) {
      setLastError(`${label}失败：${explainError(error)}`)
    } finally {
      setBusy(null)
    }
  }

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const imageUrl = URL.createObjectURL(file)

    await runAction('分析作品', async () => {
      try {
        const analyzed = await analyzeArtwork(imageUrl)
        const normalizedTask = {
          ...analyzed,
          imageUrl,
          activeIssueId: analyzed.activeIssueId ?? analyzed.problems[0]?.id,
          mockMode: analyzed.mockMode ?? analyzed.aiMeta?.mock ?? false,
        }
        patchTask(normalizedTask)
      } catch (error) {
        patchTask(createOfflineReviewTask(imageUrl, `真实 /api/analyze 不可用：${explainError(error)}`))
      }
    })
  }

  const selectIssue = (issueId: string) => {
    if (!task) return
    patchTask({ ...task, activeIssueId: issueId })
  }

  const runGenerateSelected = async () => {
    if (!task || !activeIssue) return
    await runAction('生成红线示范', async () => {
      const localDemo = offlineMode
        ? createOfflineLocalDemo(task, activeIssue.id)
        : await generateSelectedOverlay(task.id, activeIssue.id)

      patchTask({
        ...task,
        localDemos: upsertLocalDemo(task.localDemos, localDemo),
        selectedProblemIds: Array.from(new Set([...task.selectedProblemIds, activeIssue.id])),
      })
    })
  }

  const runGenerateGlobalOverlay = async () => {
    if (!task) return
    await runAction('生成全局总览', async () => {
      const ids = task.problems.map((p) => p.id)
      const next = offlineMode ? createOfflineGlobalDemo(task, ids) : await generateGlobalOverlay(task.id, ids)
      patchTask({ ...task, globalDemo: next })
      setTab('global')
    })
  }

  const runInpaintLocal = async () => {
    if (!task || !activeIssue) return
    if (calcRectCoverage(activeIssue.editRegion) > 20) {
      setLastError('mask 超过作品面积 20%，请先缩小选区。')
      return
    }

    await runAction('生成局部真实修图', async () => {
      if (offlineMode) {
        setLastError('当前是离线演示模式：只生成红线示范，不调用真实图片编辑 API。')
        return
      }
      const next = await inpaintLocal(task.id, activeIssue.id)
      patchTask({ ...task, localDemos: upsertLocalDemo(task.localDemos, next) })
    })
  }

  const runInpaintGlobal = async () => {
    if (!task) return
    await runAction('生成全局真实修图', async () => {
      if (offlineMode) {
        setLastError('当前是离线演示模式：后端未接通，不能生成真实全局修图。')
        return
      }
      const next = await inpaintGlobal(task.id, task.problems.map((p) => p.id))
      patchTask({ ...task, globalDemo: next })
    })
  }

  const genKnowledgeText = async () => {
    if (!task || !activeIssue) return
    await runAction('生成文字知识卡', async () => {
      const card = offlineMode
        ? createOfflineKnowledgeCard(task, activeIssue.id, 'text')
        : await postKnowledgeCardGenerateText(task.id, activeIssue.id)
      patchTask({ ...task, knowledgeCards: [...task.knowledgeCards.filter((k) => k.issueId !== activeIssue.id || k.mode !== card.mode), card] })
    })
  }

  const genKnowledgeImage = async () => {
    if (!task || !activeIssue) return
    await runAction('生成图解知识卡', async () => {
      const card = offlineMode
        ? createOfflineKnowledgeCard(task, activeIssue.id, 'image')
        : await postKnowledgeCardGenerateImage(task.id, activeIssue.id)
      patchTask({ ...task, knowledgeCards: [...task.knowledgeCards.filter((k) => k.issueId !== activeIssue.id || k.mode !== card.mode), card] })
    })
  }

  const genPractice = async () => {
    if (!task || !activeIssue) return
    await runAction('生成训练图', async () => {
      const next = offlineMode
        ? createOfflinePracticeSet(task, activeIssue.id)
        : { ...(await postPracticeGenerateExercise(task.id, activeIssue.id)), answerImageUrl: (await postPracticeGenerateAnswer(task.id, activeIssue.id)).answerImageUrl }
      patchTask({ ...task, practiceSets: [...task.practiceSets.filter((p) => p.issueId !== activeIssue.id), next] })
    })
  }

  return (
    <main className="studioPage">
      <header className="topBar">
        <div>
          <h1>AI 老师工作台（真实链路优先）</h1>
          <p>先红线示范，再局部修图；后端没跑时自动进入离线演示。</p>
        </div>
        <div className={offlineMode ? 'statusPill warningPill' : 'statusPill'}>
          {task ? (offlineMode ? '离线演示模式' : '真实 API 模式') : '等待上传'}
        </div>
        {busy ? <div className="statusPill busyPill">{busy}中...</div> : null}
      </header>

      <section className="upload">
        <label htmlFor="file">上传作品</label>
        <input id="file" type="file" accept="image/*" onChange={onUpload} />
      </section>

      {lastError ? <section className="errorBox">{lastError}</section> : null}

      {task ? (
        <>
          {offlineMode ? <section className="warningBox">当前没有拿到真实后端结果，系统已用离线演示数据跑通前端流程。接好后端后，这里会自动切回真实 API 模式。</section> : null}

          <section className="mainLayout">
            <section className="leftCanvas">
              <div className="tabRow">
                <button className={tab === 'local' ? 'tab activeTab' : 'tab'} onClick={() => setTab('local')}>局部</button>
                <button className={tab === 'global' ? 'tab activeTab' : 'tab'} onClick={() => setTab('global')}>全局</button>
              </div>

              <ArtworkCanvas
                imageUrl={task.imageUrl}
                width={stageWidth}
                height={stageHeight}
                annotations={tab === 'local' && activeIssue ? activeIssue.annotations : task.problems.flatMap((issue) => issue.annotations)}
              />

              {tab === 'local' ? <p>{currentDemo?.explanation ?? '请先生成该问题的红线示范。'}</p> : <p>{task.globalDemo?.explanation ?? '请先生成全局红线总览。'}</p>}

              <div className="controls">
                <button className="primary" disabled={!activeIssue || Boolean(busy)} onClick={runGenerateSelected}>看红线示范（当前问题）</button>
                <button className="primary" disabled={!activeIssue || Boolean(busy)} onClick={runInpaintLocal}>生成局部真实修图</button>
                <button className="primary" disabled={!task.problems.length || Boolean(busy)} onClick={runGenerateGlobalOverlay}>生成全局问题总览</button>
                <button className="primary" disabled={!task.problems.length || Boolean(busy)} onClick={runInpaintGlobal}>生成全局真实修图</button>
              </div>

              <p className="memoryHint">真实修图可能改变画风，建议先看红线示范。当前质量预算约 ${estimateEditCost('1024x1024', quality).toFixed(2)}。</p>

              <div className="controls">
                <label>editMode
                  <select value={editMode} onChange={(e) => setEditMode(e.target.value as EditMode)}>
                    <option value="mask_precise">mask_precise</option>
                    <option value="auto_protect">auto_protect</option>
                  </select>
                </label>
                <label>quality
                  <select value={quality} onChange={(e) => setQuality(e.target.value as 'low'|'medium'|'high')}>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                </label>
              </div>
            </section>

            <aside className="rightIssues">
              <h2>问题目录</h2>
              {task.problems.length ? task.problems.map((issue) => (
                <button key={issue.id} className={activeIssue?.id === issue.id ? 'issue active' : 'issue'} onClick={() => selectIssue(issue.id)}>
                  <div className="issueTitle">{issue.title}</div>
                  <div className="meta"><span style={{ color: severityColor[issue.severity] }}>{issue.severity}</span><span>{issue.subDimension}</span></div>
                  <p>{issue.student_friendly_reason}</p>
                </button>
              )) : <p>没有问题数据：请检查 /api/analyze 返回结构。</p>}
            </aside>
          </section>

          <section className="drawer">
            <div className="tabRow">
              <button className={drawer==='knowledge'?'tab activeTab':'tab'} onClick={() => setDrawer('knowledge')}>知识卡片</button>
              <button className={drawer==='practice'?'tab activeTab':'tab'} onClick={() => setDrawer('practice')}>训练图</button>
              <button className={drawer==='history'?'tab activeTab':'tab'} onClick={() => setDrawer('history')}>历史痕迹</button>
            </div>

            {drawer === 'knowledge' ? (
              <div>
                <button className="primary" disabled={!activeIssue || Boolean(busy)} onClick={genKnowledgeText}>生成文字卡</button>
                <button className="primary" disabled={!activeIssue || Boolean(busy)} onClick={genKnowledgeImage}>生成图解卡</button>
                <div className="cardGrid">
                  {task.knowledgeCards.map((card) => (
                    <article className="miniCard" key={card.id}>
                      <h3>{card.title}</h3>
                      <p><b>知识点：</b>{card.concept}</p>
                      <p><b>常见误区：</b>{card.misconception}</p>
                      <p><b>观察方法：</b>{card.observe}</p>
                      {card.imageUrl ? <img src={card.imageUrl} alt={card.title} /> : null}
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {drawer === 'practice' ? (
              <div>
                <button className="primary" disabled={!activeIssue || Boolean(busy)} onClick={genPractice}>生成训练图与答案</button>
                <div className="cardGrid">
                  {task.practiceSets.map((practice) => (
                    <article className="miniCard" key={practice.id}>
                      <h3>{practice.title}</h3>
                      <ol>{practice.steps.map((step) => <li key={step}>{step}</li>)}</ol>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {drawer === 'history' ? <ul>{task.studentMemory.generatedAssets.map((a) => <li key={a.id}>{a.title}<a href={a.url} download>下载</a></li>)}</ul> : null}
          </section>

          <section className="debug">
            <button onClick={() => setDebugOpen((v) => !v)}>{debugOpen ? '收起' : '展开'} Debug</button>
            {debugOpen ? <pre>{JSON.stringify({
              taskId: task.id,
              status: task.status,
              mode: offlineMode ? 'offline_demo' : 'real_api',
              aiMeta: task.aiMeta,
              activeIssueId: task.activeIssueId,
              problems: task.problems.length,
              currentLocalDemo: currentDemo,
              globalDemo: task.globalDemo,
              imageApiCalled: currentDemo?.imageApiCalled ?? task.globalDemo?.imageApiCalled ?? false,
              qaScore: currentDemo?.qa?.score ?? task.globalDemo?.qa?.score,
              logs: task.logs,
            }, null, 2)}</pre> : null}
          </section>
        </>
      ) : null}
    </main>
  )
}

export default App
