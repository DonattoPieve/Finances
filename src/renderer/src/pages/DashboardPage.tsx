import { useEffect, useState } from 'react'
import { SummaryCards } from '../components/dashboard/SummaryCards'
import { CategoryDonutChart } from '../components/dashboard/CategoryDonutChart'
import { PendingPreview } from '../components/dashboard/PendingPreview'
import { RecentMovements } from '../components/dashboard/RecentMovements'
import { useAppStore } from '../store/useAppStore'
import type { Category, DashboardSummary } from '@shared/types'

export function DashboardPage() {
  const period = useAppStore((state) => state.period)
  const customRange = useAppStore((state) => state.customRange)
  const movementsVersion = useAppStore((state) => state.movementsVersion)

  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [categoriesById, setCategoriesById] = useState<Map<string, Category>>(new Map())

  const isRangeReady = period !== 'custom' || (customRange?.from && customRange?.to)

  useEffect(() => {
    if (!isRangeReady) return

    let cancelled = false

    async function load(): Promise<void> {
      const [summaryResult, categories] = await Promise.all([
        window.pluto.dashboard.getSummary({
          period,
          from: customRange?.from,
          to: customRange?.to
        }),
        window.pluto.categories.list()
      ])
      if (cancelled) return
      setSummary(summaryResult)
      setCategoriesById(new Map(categories.map((category: Category) => [category.id, category])))
    }

    load()
    return () => {
      cancelled = true
    }
  }, [period, customRange, isRangeReady, movementsVersion])

  if (!summary) {
    return <div className="flex h-full items-center justify-center text-muted">Carregando…</div>
  }

  return (
    <div className="flex flex-col gap-4">
      <SummaryCards summary={summary} />

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-4">
        <CategoryDonutChart data={summary.categoryBreakdown} />
        <PendingPreview
          items={summary.pendingPreview}
          overdueCount={summary.overdueCount}
          dueTodayCount={summary.dueTodayCount}
          upcomingCount={summary.upcomingCount}
          pendingTotal={summary.pendingTotal}
        />
      </div>

      <RecentMovements movements={summary.recentMovements} categoriesById={categoriesById} />
    </div>
  )
}
