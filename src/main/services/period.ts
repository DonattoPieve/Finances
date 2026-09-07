import type { PeriodRange } from '../../shared/types'

/**
 * Data no fuso do usuário, em yyyy-mm-dd.
 * `toISOString()` devolveria a data em UTC — no Brasil, das 21h em diante isso já é o dia
 * seguinte, e o app trataria como "hoje" um dia que ainda nem começou.
 */
export function localIsoDate(date: Date = new Date()): string {
  const ano = date.getFullYear()
  const mes = String(date.getMonth() + 1).padStart(2, '0')
  const dia = String(date.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function toIsoDate(date: Date): string {
  return localIsoDate(date)
}

function startOfWeek(date: Date): Date {
  const result = new Date(date)
  const day = result.getDay() // 0 = domingo
  const diff = day === 0 ? -6 : 1 - day // volta até segunda-feira
  result.setDate(result.getDate() + diff)
  return result
}

export interface DateRange {
  from: string
  to: string
}

export function resolvePeriodRange(range: PeriodRange, now: Date = new Date()): DateRange {
  switch (range.period) {
    case 'today': {
      const today = toIsoDate(now)
      return { from: today, to: today }
    }
    case 'week': {
      const start = startOfWeek(now)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      return { from: toIsoDate(start), to: toIsoDate(end) }
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return { from: toIsoDate(start), to: toIsoDate(end) }
    }
    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1)
      const end = new Date(now.getFullYear(), 11, 31)
      return { from: toIsoDate(start), to: toIsoDate(end) }
    }
    case 'custom': {
      if (!range.from || !range.to) {
        throw new Error('Período personalizado exige "from" e "to"')
      }
      return { from: range.from, to: range.to }
    }
  }
}

function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  return toIsoDate(date)
}

/** Retorna o período imediatamente anterior, com a mesma duração, usado para calcular tendências. */
export function resolvePreviousPeriodRange(range: PeriodRange, now: Date = new Date()): DateRange {
  if (range.period === 'month') {
    const { from } = resolvePeriodRange(range, now)
    const [year, month] = from.split('-').map(Number)
    const start = new Date(year, month - 2, 1)
    const end = new Date(year, month - 1, 0)
    return { from: toIsoDate(start), to: toIsoDate(end) }
  }

  if (range.period === 'year') {
    const { from } = resolvePeriodRange(range, now)
    const year = Number(from.split('-')[0])
    return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` }
  }

  const { from, to } = resolvePeriodRange(range, now)
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const spanDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1
  return { from: addDays(from, -spanDays), to: addDays(from, -1) }
}
