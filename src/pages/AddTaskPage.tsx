import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTasks } from '../context/TaskContext'

export function AddTaskPage() {
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const { addTask } = useTasks()
  const navigate = useNavigate()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = title.trim()
    if (!trimmed) {
      setError('请输入一句简短的待办。')
      return
    }

    addTask({ title: trimmed })
    navigate('/', { replace: true })
  }

  return (
    <main className="screen add-screen">
      <header className="topbar">
        <Link className="back-link" to="/">
          返回
        </Link>
      </header>

      <section className="composer-card">
        <p className="eyebrow">New</p>
        <h1>只记一句话。</h1>
        <p className="hero-copy">不要在这里写细节。先把事情抓住，再去详情页补充。</p>

        <form className="composer-form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="task-title">
            待办标题
          </label>
          <input
            autoComplete="off"
            autoFocus
            className="title-input"
            id="task-title"
            maxLength={60}
            onChange={(event) => {
              setTitle(event.target.value)
              if (error) {
                setError('')
              }
            }}
            placeholder="例如：给客户回电话"
            value={title}
          />
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button" type="submit">
            保存
          </button>
        </form>
      </section>
    </main>
  )
}
