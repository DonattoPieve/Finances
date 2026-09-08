import {
  CATEGORY_KIND_BY_MOVEMENT_TYPE,
  type CreateRecurrenceInput,
  type Recurrence,
  type RecurrenceWithStats,
  type UpdateRecurrenceInput
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

/** Quantos pagamentos passados entram na média de uma conta variável. */
export const MESES_NA_ESTIMATIVA = 3

export class RecurrenceService {
  constructor(
    private recurrences: RecurrencesRepository,
    private movements: MovementsRepository,
    private categories: CategoriesRepository
  ) {}

  private assertValid(
    input: CreateRecurrenceInput | UpdateRecurrenceInput,
    type: Recurrence['type']
  ): void {
    if (input.amount !== undefined && input.amount <= 0) {
      throw new Error('O valor deve ser maior que zero')
    }
    if (input.dayOfMonth !== undefined && (input.dayOfMonth < 1 || input.dayOfMonth > 31)) {
      throw new Error('O dia do mês deve estar entre 1 e 31')
    }
    if (input.dueDay !== undefined && input.dueDay !== null) {
      if (input.dueDay < 1 || input.dueDay > 31) {
        throw new Error('O dia do vencimento deve estar entre 1 e 31')
      }
    }
    if (type === 'conta' && 'type' in input && !input.dueDay) {
      throw new Error('Conta recorrente exige um dia de vencimento')
    }
    // Valor variável só existe com vencimento: é o vencimento que dá o gancho para
    // avisar antes de a conta chegar. Sem ele, "variável" seria só um valor errado.
    if (input.amountKind === 'variavel' && type !== 'conta') {
      throw new Error('Só conta pode ter valor variável')
    }
    if (input.categoryId) {
      const category = this.categories.get(input.categoryId)
      if (!category) throw new Error('Categoria inválida')
      if (category.kind !== CATEGORY_KIND_BY_MOVEMENT_TYPE[type]) {
        throw new Error(`"${category.name}" não é uma categoria de ${type}`)
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
   * O valor que a próxima geração vai usar.
   *
   * Em regra fixa é o próprio valor. Em conta variável é a média dos últimos
   * pagamentos REAIS — cada mês pago melhora a estimativa do mês seguinte. Sem
   * histórico ainda, cai no valor que o usuário deu ao criar a regra.
   */
  valorDoProximoLancamento(recurrence: Recurrence): number {
    if (recurrence.amountKind !== 'variavel') return recurrence.amount

    const pagos = this.movements.getLastPaidAmounts(recurrence.id, MESES_NA_ESTIMATIVA)
    if (pagos.length === 0) return recurrence.amount

    const media = pagos.reduce((soma, valor) => soma + valor, 0) / pagos.length
    return Math.round(media * 100) / 100
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

      const ehConta = recurrence.type === 'conta'
      this.movements.create({
        type: recurrence.type,
        name: recurrence.name,
        // Calculado por mês, e não uma vez só: a estimativa da conta variável
        // muda conforme os meses anteriores vão sendo pagos.
        amount: this.valorDoProximoLancamento(recurrence),
        categoryId: recurrence.categoryId,
        // A conta é lançada no começo do mês e vence no dia da regra. Data de
        // lançamento fixa deixa a geração determinística: não importa se o app
        // foi aberto no dia 2 ou no dia 27.
        day: ehConta ? `${month}-01` : clampDayToMonth(month, recurrence.dayOfMonth),
        dueDate: ehConta ? clampDayToMonth(month, recurrence.dueDay ?? 1) : null,
        amountEstimated: recurrence.amountKind === 'variavel',
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
    this.assertValid(input, input.type)
    const recurrence = this.recurrences.create(input)
    this.materialize(recurrence)
    return recurrence
  }

  /** Alterações valem para os meses que ainda serão gerados; o que já foi lançado não muda. */
  update(id: string, input: UpdateRecurrenceInput): Recurrence {
    const atual = this.recurrences.get(id)
    if (!atual) throw new Error(`Regra ${id} não encontrada`)
    this.assertValid(input, atual.type)
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
        proximoValor: this.valorDoProximoLancamento(recurrence),
        nextMonth: !recurrence.active || ended ? null : upcoming
      }
    })
  }
}
