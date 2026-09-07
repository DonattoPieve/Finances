import type { DueStatus, Movement, MovementWithDueStatus } from '../../shared/types'
import { localIsoDate } from './period'

export { localIsoDate }

export function classifyDueStatus(dueDate: string, today: string = localIsoDate()): DueStatus {
  if (dueDate < today) return 'overdue'
  if (dueDate === today) return 'due_today'
  return 'upcoming'
}

export function withDueStatus(movement: Movement): MovementWithDueStatus {
  return {
    ...movement,
    dueStatus: movement.dueDate ? classifyDueStatus(movement.dueDate) : null
  }
}

const STATUS_PRIORITY: Record<DueStatus, number> = {
  overdue: 0,
  due_today: 1,
  upcoming: 2
}

export function sortByDuePriority(movements: MovementWithDueStatus[]): MovementWithDueStatus[] {
  return [...movements].sort((a, b) => {
    const priorityDiff = STATUS_PRIORITY[a.dueStatus ?? 'upcoming'] - STATUS_PRIORITY[b.dueStatus ?? 'upcoming']
    if (priorityDiff !== 0) return priorityDiff
    return (a.dueDate ?? '').localeCompare(b.dueDate ?? '')
  })
}
