import type {
  CreateRecurrenceInput,
  Recurrence,
  RecurrenceWithStats,
  UpdateRecurrenceInput
} from '../../shared/types'
import type { RecurrencesRepository } from '../repositories/recurrencesRepository'
import type { MovementsRepository } from '../repositories/movementsRepository'
import type { CategoriesRepository } from '../repositories/categoriesRepository'

/** yyyy-mm do mês corrente. */
export function currentMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function monthOfIsoDate(isoDate: string): string {
  return isoDate.slice(0, 7)
}

/** Dia do mês existente: 31 em fevereiro vira 28 (ou 29). */
export function clampDayToMonth(month: string, dayOfMonth: number): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const lastDay = new Date(year, monthNumber, 0).getDate()
  const day = Math.min(Math.max(dayOfMonth, 1), lastDay)
  return `${month}-${String(day).padStart(2, '0')}`
}

export function nextMonthOf(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(year, monthNumber, 1)
  return currentMonth(date)
}

/** Todos os meses de `from` até `to`, inclusive. Vazio se `from` for depois de `to`. */
export function monthsBetween(from: string, to: string): string[] {
  const months: string[] = []
  let cursor = from
  while (cursor <= to) {
    months.push(cursor)
    cursor = nextMonthOf(cursor)
  }
  return months
}

export class RecurrenceService {
  constructor(
    private recurrences: RecurrencesRepository,
    private movements: MovementsRepository,
    private categories: CategoriesRepository
  ) {}

  private assertValid(input: CreateRecurrenceInput | UpdateRecurrenceInput): void {
    if (input.amount !== undefined && input.amount <= 0) {
      throw new Error('O valor deve ser maior que zero')
    }
    if (input.dayOfMonth !== undefined && (input.dayOfMonth < 1 || input.dayOfMonth > 31)) {
      throw new Error('O dia do mês deve estar entre 1 e 31')
    }
    if (input.categoryId) {
      const category = this.categories.get(input.categoryId)
      if (!category) throw new Error('Categoria inválida')
      if ('type' in input && input.type && category.kind !== input.type) {
        throw new Error(`Essa categoria não é de ${input.type}`)
      }
    }
    if (input.startMonth && !/^\d{4}-\d{2}$/.test(input.startMonth)) {
      throw new Error('Mês inicial inválido')
    }
    if (input.endMonth) {
      if (!/^\d{4}-\d{2}$/.test(input.endMonth)) throw new Error('Mês final inválido')
      if (input.startMonth && input.endMonth < input.startMonth) {
        throw new Error('O mês final não pode ser antes do inicial')
      }
    }
  }

  /**
   * Cria as movimentações que faltam para a regra, do mês inicial até o mês atual.
   * Nunca gera meses no futuro — dinheiro que ainda não entrou não entra no saldo.
   */
  materialize(recurrence: Recurrence, now: Date = new Date()): number {
    if (!recurrence.active) return 0

    const limit = recurrence.endMonth
      ? recurrence.endMonth < currentMonth(now)
        ? recurrence.endMonth
        : currentMonth(now)
      : currentMonth(now)

    let created = 0
    for (const month of monthsBetween(recurrence.startMonth, limit)) {
      if (this.movements.hasRecurrenceMonth(recurrence.id, month)) continue
      this.movements.create({
        type: recurrence.type,
        name: recurrence.name,
        amount: recurrence.amount,
        categoryId: recurrence.categoryId,
        day: clampDayToMonth(month, recurrence.dayOfMonth),
        recurrenceId: recurrence.id,
        recurrenceMonth: month
      })
      created += 1
    }
    return created
  }

  /** Roda na abertura do app: põe em dia tudo que passou desde a última vez. */
  materializeAll(now: Date = new Date()): number {
    return this.recurrences
      .listActive()
      .reduce((total, recurrence) => total + this.materialize(recurrence, now), 0)
  }

  create(input: CreateRecurrenceInput): Recurrence {
    this.assertValid(input)
    const recurrence = this.recurrences.create(input)
    this.materialize(recurrence)
    return recurrence
  }

  /** Alterações valem para os meses que ainda serão gerados; o que já foi lançado não muda. */
  update(id: string, input: UpdateRecurrenceInput): Recurrence {
    this.assertValid(input)
    const recurrence = this.recurrences.update(id, input)
    this.materialize(recurrence)
    return recurrence
  }

  setActive(id: string, active: boolean): Recurrence {
    return this.update(id, { active })
  }

  /** Apaga a regra e solta as movimentações já lançadas, que continuam existindo sozinhas. */
  delete(id: string): void {
    this.movements.detachRecurrence(id)
    this.recurrences.delete(id)
  }

  list(now: Date = new Date()): RecurrenceWithStats[] {
    return this.recurrences.list().map((recurrence) => {
      const stats = this.movements.getRecurrenceStats(recurrence.id)
      const upcoming = stats.lastMonth ? nextMonthOf(stats.lastMonth) : recurrence.startMonth
      const ended = recurrence.endMonth !== null && upcoming > recurrence.endMonth
      return {
        ...recurrence,
        generatedCount: stats.count,
        lastGeneratedMonth: stats.lastMonth,
        nextMonth: !recurrence.active || ended ? null : upcoming
      }
    })
  }
}
