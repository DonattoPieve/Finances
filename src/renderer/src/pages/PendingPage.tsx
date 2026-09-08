import { useEffect, useMemo, useState } from 'react'
import { CalendarClock } from 'lucide-react'
import clsx from 'clsx'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { CategoryIconBadge } from '../components/ui/CategoryIconBadge'
import { formatCurrency, formatDateBR, formatEstimatedCurrency } from '../lib/format'
import { DUE_STATUS_META, formatRelativeDueText } from '../lib/dueStatus'
import { useAppStore } from '../store/useAppStore'
import type { Category, DueStatus, MovementWithDueStatus } from '@shared/types'

const GROUPS: { status: DueStatus; title: string }[] = [
  { status: 'overdue', title: 'Vencidas' },
  { status: 'due_today', title: 'Vence hoje' },
  { status: 'upcoming', title: 'A vencer' }
]

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

export function PendingPage() {
  const movementsVersion = useAppStore((state) => state.movementsVersion)
  const openPayMovement = useAppStore((state) => state.openPayMovement)

  const [items, setItems] = useState<MovementWithDueStatus[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load(): Promise<void> {
      const [pending, categoriesResult] = await Promise.all([
        window.pluto.pending.list(),
        window.pluto.categories.list()
      ])
      if (cancelled) return
      setItems(pending)
      setCategories(categoriesResult)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [movementsVersion])

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const total = useMemo(() => items.reduce((sum, item) => sum + item.amount, 0), [items])
  const counts = useMemo(
    () => ({
      overdue: items.filter((item) => item.dueStatus === 'overdue').length,
      due_today: items.filter((item) => item.dueStatus === 'due_today').length,
      upcoming: items.filter((item) => item.dueStatus === 'upcoming').length
    }),
    [items]
  )

  if (loading) {
    return <div className="flex h-40 items-center justify-center text-muted">Carregando…</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-wrap items-center gap-3">
        <span className={clsx('rounded-full px-2.5 py-1 text-xs font-medium', TONE_PILL.danger)}>
          {counts.overdue} vencidas
        </span>
        <span className={clsx('rounded-full px-2.5 py-1 text-xs font-medium', TONE_PILL.warning)}>
          {counts.due_today} vencem hoje
        </span>
        <span className={clsx('rounded-full px-2.5 py-1 text-xs font-medium', TONE_PILL.caution)}>
          {counts.upcoming} a vencer
        </span>
        <span className="ml-auto text-sm text-muted">
          Total pendente: <span className="font-semibold text-ink">{formatCurrency(total)}</span>
        </span>
      </Card>

      {items.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <CalendarClock size={28} className="text-faint" strokeWidth={1.5} />
          <p className="text-sm text-muted">Nenhuma conta pendente.</p>
        </Card>
      ) : (
        GROUPS.map((group) => {
          const groupItems = items.filter((item) => item.dueStatus === group.status)
          if (groupItems.length === 0) return null
          const meta = DUE_STATUS_META[group.status]
          const Icon = meta.icon

          return (
            <div key={group.status} className="flex flex-col gap-3">
              <div className={clsx('flex items-center gap-2 text-xs font-semibold uppercase tracking-wide', TONE_TEXT[meta.tone])}>
                <Icon size={15} strokeWidth={2} />
                {group.title} · {groupItems.length}
              </div>
              <Card className="divide-y divide-border p-0">
                {groupItems.map((item) => {
                  const category = categoriesById.get(item.categoryId)
                  return (
                    <div key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                      {category && <CategoryIconBadge icon={category.icon} color={category.color} />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-ink">{item.name}</p>
                        {category && <p className="truncate text-xs text-faint">{category.name}</p>}
                      </div>
                      {item.dueDate && (
                        <span className={clsx('shrink-0 text-xs', TONE_TEXT[meta.tone])}>
                          Vencimento {formatDateBR(item.dueDate)} ({formatRelativeDueText(item.dueDate)})
                        </span>
                      )}
                      <span className="shrink-0 text-sm font-medium text-ink">
                        {formatEstimatedCurrency(item.amount, item.amountEstimated)}
                      </span>
                      <Button
                        variant="secondary"
                        className="shrink-0 px-3 py-1.5 text-xs"
                        onClick={() => openPayMovement(item)}
                      >
                        Pagar
                      </Button>
                    </div>
                  )
                })}
              </Card>
            </div>
          )
        })
      )}
    </div>
  )
}
