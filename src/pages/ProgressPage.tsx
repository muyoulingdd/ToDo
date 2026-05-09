import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTasks } from '../context/TaskContext'

export function ProgressPage() {
  const { taskId } = useParams()
  const { getTask, addProgressEntry } = useTasks()
  const navigate = useNavigate()
  const task = taskId ? getTask(taskId) : undefined
  const [content, setContent] = useState('')
  const [error, setError] = useState('')

  if (!task) {
    return (
      <main className="screen detail-screen">
        <header className="topbar">
          <button className="back-link" onClick={() => navigate('/')} type="button">
            返回
          </button>
        </header>
        <section className="detail-card missing-card">
          <h1>这项待办不存在。</h1>
        </section>
      </main>
    )
  }

  const currentTask = task

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = content.trim()
    if (!trimmed) {
      setError('请输入一条新的进度。')
      return
    }

    addProgressEntry(currentTask.id, trimmed)
    setContent('')
    setError('')
    navigate(`/task/${currentTask.id}`)
  }

  return (
    <main className="screen detail-screen">
      <header className="topbar">
        <button className="back-link" onClick={() => navigate(`/task/${currentTask.id}`)} type="button">
          返回详情
        </button>
        <div />
      </header>

      <section className="detail-card progress-editor-card">
        <p className="eyebrow">Progress</p>
        <h1 className="progress-page-title">{currentTask.title}</h1>

        <form className="progress-form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="progress-content">
            新进度
          </label>
          <textarea
            className="details-input progress-input"
            id="progress-content"
            onChange={(event) => {
              setContent(event.target.value)
              if (error) {
                setError('')
              }
            }}
            placeholder="例如：已经和客户确认需求，等待回邮。"
            value={content}
          />
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button progress-submit-button" type="submit">
            添加进度
          </button>
        </form>
      </section>
    </main>
  )
}
