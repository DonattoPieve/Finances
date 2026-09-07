import { AlertTriangle, Clock } from 'lucide-react'
import { todayIsoDate } from './format'
import type { DueStatus } from '@shared/types'

export const DUE_STATUS_META: Record<
  DueStatus,
  { label: string; tone: 'danger' | 'warning' | 'caution'; icon: typeof AlertTriangle }
> = {
  overdue: { label: 'Vencida', tone: 'danger', icon: AlertTriangle },
  due_today: { label: 'Vence hoje', tone: 'warning', icon: Clock },
  upcoming: { label: 'A vencer', tone: 'caution', icon: Clock }
}

function daysBetween(isoDate: string, today: string): number {
  const [ay, am, ad] = isoDate.split('-').map(Number)
  const [by, bm, bd] = today.split('-').map(Number)
  const a = Date.UTC(ay, am - 1, ad)
  const b = Date.UTC(by, bm - 1, bd)
  return Math.round((a - b) / 86_400_000)
}

export function formatRelativeDueText(dueDate: string, today: string = todayIsoDate()): string {
  const diff = daysBetween(dueDate, today)
  if (diff === 0) return 'vence hoje'
  if (diff < 0) return `${Math.abs(diff)} ${Math.abs(diff) === 1 ? 'dia' : 'dias'} atrasado`
  return `em ${diff} ${diff === 1 ? 'dia' : 'dias'}`
}
