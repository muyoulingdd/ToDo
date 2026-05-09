import { useNavigate, useParams } from 'react-router-dom'
import { useTasks } from '../context/TaskContext'

export function ProgressEntryPage() {
  const { taskId, entryId } = useParams()
  const { getTask } = useTasks()
  const navigate = useNavigate()
  const task = taskId ? getTask(taskId) : undefined
  const entry = task?.progressEntries.find((item) => item.id === entryId)

  if (!task || !entry) {
    return (
      <main className="screen detail-screen">
        <header className="topbar">
          <button className="back-link" onClick={() => navigate(taskId ? `/task/${taskId}` : '/')} type="button">
            返回
          </button>
        </header>
        <section className="detail-card missing-card">
          <h1>这条进度不存在。</h1>
        </section>
      </main>
    )
  }

  return (
    <main className="screen detail-screen">
      <header className="topbar">
        <button className="back-link" onClick={() => navigate(`/task/${task.id}`)} type="button">
          返回详情
        </button>
        <div />
      </header>

      <section className="detail-card progress-entry-detail-card">
        <p className="eyebrow">Progress</p>
        <h1 className="progress-page-title">{task.title}</h1>
        <div className="progress-block">
          <div className="section-head">
            <h2>进度详情</h2>
          </div>
          <article className="progress-entry progress-entry-detail">
            <p>{entry.content}</p>
          </article>
        </div>
      </section>
    </main>
  )
}
