import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTasks } from '../context/TaskContext'

export function HomePage() {
  const { tasks, toggleTask, deleteTask } = useTasks()
  const [view, setView] = useState<'active' | 'completed'>('active')
  const activeTasks = tasks.filter((task) => !task.completed)
  const completedTasks = tasks.filter((task) => task.completed)
  const visibleTasks = view === 'active' ? activeTasks : completedTasks
  const completedCount = tasks.filter((task) => task.completed).length

  return (
    <main className="screen home-screen">
      <header className="hero-card home-hero">
        <p className="eyebrow">ToDo</p>
        <h1>只留下最重要的下一件事。</h1>
        <p className="hero-copy">
          轻点记录，完成就划掉。复杂信息留到详情页，主页面始终保持干净。
        </p>
      </header>

      <section className="list-panel home-list-panel">
        <div className="section-head">
          <h2>{view === 'active' ? '待办' : '已完成'}</h2>
          <Link className="text-link" to="/add">
            添加
          </Link>
        </div>

        {visibleTasks.length === 0 ? (
          <div className="empty-state">
            <p>{view === 'active' ? '还没有待办。' : '还没有已完成事项。'}</p>
            <span>
              {view === 'active' ? '先写下一句最短的提醒。' : '完成后会安静地收纳到这里。'}
            </span>
          </div>
        ) : (
          <div className="task-list">
            {visibleTasks.map((task) => (
              <article className={`task-row ${task.completed ? 'is-complete' : ''}`} key={task.id}>
                <button
                  aria-label={task.completed ? '标记为未完成' : '标记为已完成'}
                  className="check-button"
                  onClick={() => toggleTask(task.id)}
                  type="button"
                >
                  <span />
                </button>

                <div className="task-card">
                  <button
                    aria-label="删除待办"
                    className="delete-button"
                    onClick={() => deleteTask(task.id)}
                    type="button"
                  >
                    删除
                  </button>

                  <Link className="task-link" to={`/task/${task.id}`}>
                    <div className="task-main">
                      <h3>{task.title}</h3>
                      <p>{task.progressNote.trim() || '暂无进展，点开记录。'}</p>
                    </div>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="home-footer">
        <div className="view-switcher" role="tablist" aria-label="待办视图切换">
          <button
            aria-selected={view === 'active'}
            className={view === 'active' ? 'switch-button is-active' : 'switch-button'}
            onClick={() => setView('active')}
            role="tab"
            type="button"
          >
            待办
          </button>
          <button
            aria-selected={view === 'completed'}
            className={view === 'completed' ? 'switch-button is-active' : 'switch-button'}
            onClick={() => setView('completed')}
            role="tab"
            type="button"
          >
            已完成
          </button>
        </div>
        <p className="home-meta">
          {activeTasks.length} 项待办
          <span aria-hidden="true"> · </span>
          {completedCount} 项完成
        </p>
      </footer>

      <Link aria-label="添加待办" className="fab" to="/add">
        +
      </Link>
    </main>
  )
}
