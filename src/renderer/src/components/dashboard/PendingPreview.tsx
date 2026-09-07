import { CalendarClock, ArrowRight } from 'lucide-react'
import { Card, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { formatCurrency, formatDateBR } from '../../lib/format'
import { DUE_STATUS_META, formatRelativeDueText } from '../../lib/dueStatus'
import { useAppStore } from '../../store/useAppStore'
import type { MovementWithDueStatus } from '@shared/types'
import clsx from 'clsx'

interface PendingPreviewProps {
  items: MovementWithDueStatus[]
  overdueCount: number
  dueTodayCount: number
  upcomingCount: number
  pendingTotal: number
}

const TONE_TEXT: Record<'danger' | 'warning' | 'caution', string> = {
  danger: 'text-saida',
  warning: 'text-alerta',
  caution: 'text-muted'
}

const TONE_PILL: Record<'danger' | 'warning' | 'caution', string> = {
  danger: 'bg-saida/10 text-saida',
  warning: 'bg-alerta/10 text-alerta',
  caution: 'bg-muted/10 text-muted'
}

export function PendingPreview({
  items,
  overdueCount,
  dueTodayCount,
  upcomingCount,
  pendingTotal
}: PendingPreviewProps) {
  const setView = useAppStore((state) => state.setView)
  const openPayMovement = useAppStore((state) => state.openPayMovement)

  return (
    <Card className="flex flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-y-2">
        <CardTitle className="shrink-0 whitespace-nowrap">Contas pendentes</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <span className={clsx('whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium', TONE_PILL.danger)}>
            {overdueCount} vencidas
          </span>
          <span className={clsx('whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium', TONE_PILL.warning)}>
            {dueTodayCount} vence hoje
          </span>
          <span className={clsx('whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium', TONE_PILL.caution)}>
            {upcomingCount} a vencer
          </span>
          <span className="ml-1 whitespace-nowrap text-xs text-muted">
            Total: {formatCurrency(pendingTotal)}
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
          <CalendarClock size={28} className="text-faint" strokeWidth={1.5} />
          <p className="text-sm text-muted">Nenhuma conta pendente.</p>
        </div>
      ) : (
        <ul className="flex-1 space-y-1">
          {items.map((item) => {
            const meta = item.dueStatus ? DUE_STATUS_META[item.dueStatus] : null
            const Icon = meta?.icon ?? CalendarClock
            return (
              <li
                key={item.id}
                className="flex items-center gap-2.5 border-t border-line py-2.5 first:border-t-0 first:pt-0"
              >
                {meta && (
                  <Icon size={17} strokeWidth={2} className={clsx('shrink-0', TONE_TEXT[meta.tone])} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{item.name}</p>
                  {item.dueDate && (
                    <p className="text-xs leading-snug text-faint">
                      Vencimento: {formatDateBR(item.dueDate)} ({formatRelativeDueText(item.dueDate)})
                    </p>
                  )}
                </div>
                <span
                  className={clsx(
                    'shrink-0 text-sm font-medium',
                    meta && (item.dueStatus === 'overdue' || item.dueStatus === 'due_today')
                      ? TONE_TEXT[meta.tone]
                      : 'text-ink'
                  )}
                >
                  {formatCurrency(item.amount)}
                </span>
                <Button
                  variant="secondary"
                  className="shrink-0 px-3 py-1.5 text-xs"
                  onClick={() => openPayMovement(item)}
                >
                  Pagar
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      <button
        onClick={() => setView('pending')}
        className="mt-4 inline-flex items-center gap-1.5 self-start rounded-xl border border-line px-3 py-2 text-xs text-muted hover:bg-surface hover:text-ink"
      >
        Ver todas as pendentes
        <ArrowRight size={13} strokeWidth={2} />
      </button>
    </Card>
  )
}
