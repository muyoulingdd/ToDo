import { Link, useNavigate, useParams } from 'react-router-dom'
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

  return (
    <main className="screen detail-screen">
      <header className="topbar">
        <button className="back-link" onClick={() => navigate('/')} type="button">
          返回
        </button>
        <div />
      </header>

      <section className="detail-card">
        <p className="eyebrow">Detail</p>
        <input
          className="detail-title"
          onChange={(event) => updateTask(currentTask.id, { title: event.target.value })}
          value={currentTask.title}
        />

        <div className="progress-block">
          <div className="section-head">
            <h2>进度概览</h2>
          </div>
          {currentTask.progressEntries.length === 0 ? (
            <div className="empty-state detail-empty-state">
              <p>还没有记录进度。</p>
              <span>进入二级页面后可以一条一条新增。</span>
            </div>
          ) : (
            <div className="progress-preview-list">
              {currentTask.progressEntries
                .slice()
                .reverse()
                .map((entry) => (
                  <Link
                    className="progress-entry progress-entry-link"
                    key={entry.id}
                    to={`/task/${currentTask.id}/progress/${entry.id}`}
                  >
                    <p>{entry.content}</p>
                  </Link>
                ))}
            </div>
          )}
        </div>
      </section>

      <button
        className="ghost-button progress-edit-button progress-edit-button-floating"
        onClick={() => navigate(`/task/${currentTask.id}/progress`)}
        type="button"
      >
        编辑进度
      </button>
    </main>
  )
}
