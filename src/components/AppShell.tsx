import { Outlet } from 'react-router-dom'
import { TaskProvider } from '../context/TaskContext'

export function AppShell() {
  return (
    <TaskProvider>
      <div className="app-shell">
        <Outlet />
      </div>
    </TaskProvider>
  )
}
