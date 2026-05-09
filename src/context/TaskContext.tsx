import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { loadTasks, saveTasks } from '../storage'
import type { TodoTask } from '../types'

type TaskDraft = {
  title: string
}

type TaskPatch = Partial<Pick<TodoTask, 'title' | 'progressNote' | 'completed'>>

type TaskContextValue = {
  tasks: TodoTask[]
  addTask: (draft: TaskDraft) => TodoTask
  updateTask: (taskId: string, patch: TaskPatch) => void
  toggleTask: (taskId: string) => void
  deleteTask: (taskId: string) => void
  getTask: (taskId: string) => TodoTask | undefined
}

const TaskContext = createContext<TaskContextValue | null>(null)

function sortTasks(tasks: TodoTask[]) {
  return [...tasks].sort((left, right) => {
    if (left.completed !== right.completed) {
      return left.completed ? 1 : -1
    }

    return right.updatedAt.localeCompare(left.updatedAt)
  })
}

export function TaskProvider({ children }: PropsWithChildren) {
  const [tasks, setTasks] = useState<TodoTask[]>(() => sortTasks(loadTasks()))

  useEffect(() => {
    saveTasks(tasks)
  }, [tasks])

  const value = useMemo<TaskContextValue>(
    () => ({
      tasks,
      addTask: ({ title }) => {
        const timestamp = new Date().toISOString()
        const task: TodoTask = {
          id: crypto.randomUUID(),
          title: title.trim(),
          progressNote: '',
          completed: false,
          createdAt: timestamp,
          updatedAt: timestamp,
        }

        setTasks((current) => sortTasks([task, ...current]))
        return task
      },
      updateTask: (taskId, patch) => {
        setTasks((current) =>
          sortTasks(
            current.map((task) => {
              if (task.id !== taskId) {
                return task
              }

              const completed =
                typeof patch.completed === 'boolean'
                  ? patch.completed
                  : task.completed

              return {
                ...task,
                ...patch,
                completed,
                updatedAt: new Date().toISOString(),
              }
            }),
          ),
        )
      },
      toggleTask: (taskId) => {
        setTasks((current) =>
          sortTasks(
            current.map((task) => {
              if (task.id !== taskId) {
                return task
              }

              const completed = !task.completed
              return {
                ...task,
                completed,
                updatedAt: new Date().toISOString(),
              }
            }),
          ),
        )
      },
      deleteTask: (taskId) => {
        setTasks((current) => current.filter((task) => task.id !== taskId))
      },
      getTask: (taskId) => tasks.find((task) => task.id === taskId),
    }),
    [tasks],
  )

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>
}

export function useTasks() {
  const context = useContext(TaskContext)

  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider')
  }

  return context
}
