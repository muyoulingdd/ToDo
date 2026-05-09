import { type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTasks } from '../context/TaskContext'

export function DetailPage() {
  const { taskId } = useParams()
  const { getTask, updateTask } = useTasks()
  const navigate = useNavigate()
  const task = taskId ? getTask(taskId) : undefined

  if (!task) {
    return (
      <main className="screen detail-screen">
        <header className="topbar">
          <button className="ghost-button" onClick={() => navigate('/')} type="button">
            完成编辑
          </button>
        </header>
        <section className="detail-card missing-card">
          <h1>这项待办不存在。</h1>
        </section>
      </main>
    )
  }

  const currentTask = task

  function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
    updateTask(currentTask.id, { title: event.target.value })
  }

  function handleProgressNoteChange(event: ChangeEvent<HTMLTextAreaElement>) {
    updateTask(currentTask.id, { progressNote: event.target.value })
  }

  return (
    <main className="screen detail-screen">
      <header className="topbar">
        <div />
        <button className="ghost-button" onClick={() => navigate('/')} type="button">
          完成编辑
        </button>
      </header>

      <section className="detail-card">
        <p className="eyebrow">Detail</p>
        <input className="detail-title" onChange={handleTitleChange} value={currentTask.title} />

        <div className="progress-block">
          <div className="section-head">
            <h2>最新进展</h2>
          </div>
          <textarea
            className="details-input"
            onChange={handleProgressNoteChange}
            placeholder="例如：已经和客户确认需求，等对方回邮件。"
            value={currentTask.progressNote}
          />
        </div>
      </section>
    </main>
  )
}
