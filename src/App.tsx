import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { AppShell } from './components/AppShell'
import { AddTaskPage } from './pages/AddTaskPage'
import { DetailPage } from './pages/DetailPage'
import { HomePage } from './pages/HomePage'
import { ProgressEntryPage } from './pages/ProgressEntryPage'
import { ProgressPage } from './pages/ProgressPage'

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="add" element={<AddTaskPage />} />
        <Route path="task/:taskId" element={<DetailPage />} />
        <Route path="task/:taskId/progress" element={<ProgressPage />} />
        <Route path="task/:taskId/progress/:entryId" element={<ProgressEntryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
