export type TaskProgressEntry = {
  id: string
  content: string
  createdAt: string
}

export type TodoTask = {
  id: string
  title: string
  progressNote: string
  progressEntries: TaskProgressEntry[]
  completed: boolean
  createdAt: string
  updatedAt: string
}
