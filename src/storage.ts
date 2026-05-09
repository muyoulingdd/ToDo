import type { TaskProgressEntry, TodoTask } from './types'

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
      TodoTask & {
        details?: string
        progress?: number
        progressNote?: string
        progressEntries?: TaskProgressEntry[]
      }
    >

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.map((task) => {
      const legacyProgressNote = task.progressNote ?? task.details ?? ''
      const progressEntries = Array.isArray(task.progressEntries)
        ? task.progressEntries.filter((entry) => entry && typeof entry.content === 'string')
        : legacyProgressNote.trim()
          ? [
              {
                id: crypto.randomUUID(),
                content: legacyProgressNote.trim(),
                createdAt: task.updatedAt ?? task.createdAt ?? new Date().toISOString(),
              },
            ]
          : []

      return {
        id: task.id,
        title: task.title ?? '',
        progressNote: progressEntries.at(-1)?.content ?? legacyProgressNote,
        progressEntries,
        completed: Boolean(task.completed),
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      }
    })
  } catch {
    return []
  }
}

export function saveTasks(tasks: TodoTask[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}
