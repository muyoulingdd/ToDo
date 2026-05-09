import type { TodoTask } from './types'

const STORAGE_KEY = 'todo.minimal.tasks'

export function loadTasks(): TodoTask[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw) as Array<
      TodoTask & { details?: string; progress?: number; progressNote?: string }
    >

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.map((task) => ({
      id: task.id,
      title: task.title ?? '',
      progressNote: task.progressNote ?? task.details ?? '',
      completed: Boolean(task.completed),
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }))
  } catch {
    return []
  }
}

export function saveTasks(tasks: TodoTask[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}
