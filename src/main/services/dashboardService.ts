import type { DashboardSummary, PeriodRange } from '../../shared/types'
import type { MovementsRepository } from '../repositories/movementsRepository'
import type { CategoriesRepository } from '../repositories/categoriesRepository'
import { localIsoDate, resolvePeriodRange, resolvePreviousPeriodRange } from './period'
import { buildCategoryBreakdown } from './categoryBreakdownService'
import { withDueStatus, sortByDuePriority } from './dueStatusService'

const RECENT_MOVEMENTS_LIMIT = 5
const PENDING_PREVIEW_LIMIT = 5
const MAX_SERIES_POINTS = 24

function trendPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : 100
  return Math.round(((current - previous) / Math.abs(previous)) * 100)
}

function enumerateDays(from: string, to: string): string[] {
  const days: string[] = []
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  // As duas pontas precisam ser construídas do mesmo jeito: misturar `new Date(iso)`,
  // que lê em UTC, com data local fazia o laço parar um dia antes do fim do período.
  const cursor = new Date(fy, fm - 1, fd)
  const end = new Date(ty, tm - 1, td)
  while (cursor <= end) {
    days.push(localIsoDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

/** Reduz a série para caber no gráfico preservando o primeiro e o último ponto. */
function downsample(values: number[], maxPoints: number): number[] {
  if (values.length <= maxPoints) return values
  const lastIndex = values.length - 1
  return Array.from(
    { length: maxPoints },
    (_, i) => values[Math.round((i * lastIndex) / (maxPoints - 1))]
  )
}

export class DashboardService {
  constructor(
    private movements: MovementsRepository,
    private categories: CategoriesRepository
  ) {}

  private buildCumulativeSeries(
    from: string,
    to: string,
    startingBalance: number
  ): { balanceSeries: number[]; incomeSeries: number[]; expensesSeries: number[] } {
    const dailyNet = new Map(this.movements.listDailyNet(from, to).map((row) => [row.day, row]))
    const days = enumerateDays(from, to)

    let cumIncome = 0
    let cumExpenses = 0
    const balanceSeries: number[] = []
    const incomeSeries: number[] = []
    const expensesSeries: number[] = []

    for (const day of days) {
      const net = dailyNet.get(day)
      cumIncome += net?.income ?? 0
      cumExpenses += net?.expenses ?? 0
      incomeSeries.push(cumIncome)
      expensesSeries.push(cumExpenses)
      balanceSeries.push(startingBalance + cumIncome - cumExpenses)
    }

    return {
      balanceSeries: downsample(balanceSeries, MAX_SERIES_POINTS),
      incomeSeries: downsample(incomeSeries, MAX_SERIES_POINTS),
      expensesSeries: downsample(expensesSeries, MAX_SERIES_POINTS)
    }
  }

  private buildPendingSeries(pendingBills: { amount: number }[]): number[] {
    let running = 0
    const series = pendingBills.map((bill) => (running += bill.amount))
    return downsample(series, MAX_SERIES_POINTS)
  }

  getSummary(period: PeriodRange): DashboardSummary {
    const { from, to } = resolvePeriodRange(period)
    const previousRange = resolvePreviousPeriodRange(period)

    const balance = this.movements.getBalance()
    const previousBalance = this.movements.getBalanceAsOf(previousRange.to)

    const income = this.movements.getIncomeTotal(from, to)
    const previousIncome = this.movements.getIncomeTotal(previousRange.from, previousRange.to)

    const expenses = this.movements.getExpensesTotal(from, to)
    const previousExpenses = this.movements.getExpensesTotal(previousRange.from, previousRange.to)

    const paidMovements = this.movements.listPaidForPeriod(from, to)

    const { total: pendingTotal, count: pendingCount } = this.movements.getPendingSummary()

    const pendingBills = sortByDuePriority(this.movements.listPendingBills().map(withDueStatus))
    const overdueCount = pendingBills.filter((m) => m.dueStatus === 'overdue').length
    const dueTodayCount = pendingBills.filter((m) => m.dueStatus === 'due_today').length
    const upcomingCount = pendingBills.filter((m) => m.dueStatus === 'upcoming').length

    const categories = this.categories.list()
    const categoryBreakdown = buildCategoryBreakdown(paidMovements, categories)

    const recentMovements = this.movements.listRecent(RECENT_MOVEMENTS_LIMIT)
    const pendingPreview = pendingBills.slice(0, PENDING_PREVIEW_LIMIT)

    const startingBalance = this.movements.getBalanceAsOf(previousRange.to)
    const { balanceSeries, incomeSeries, expensesSeries } = this.buildCumulativeSeries(
      from,
      to,
      startingBalance
    )
    const pendingSeries = this.buildPendingSeries(pendingBills)

    return {
      balance,
      balanceTrendPct: trendPct(balance, previousBalance),
      balanceSeries,
      income,
      incomeTrendPct: trendPct(income, previousIncome),
      incomeSeries,
      expenses,
      expensesTrendPct: trendPct(expenses, previousExpenses),
      expensesSeries,
      pendingTotal,
      pendingCount,
      pendingSeries,
      overdueCount,
      dueTodayCount,
      upcomingCount,
      categoryBreakdown,
      pendingPreview,
      recentMovements
    }
  }
}
