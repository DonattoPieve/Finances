import { randomUUID } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import type {
  CreateMovementInput,
  Movement,
  MovementFilters,
  UpdateMovementInput
} from '../../shared/types'
import { resolvePeriodRange } from '../services/period'

interface MovementRow {
  id: string
  type: string
  name: string
  amount: number
  category_id: string
  day: string
  due_date: string | null
  bill_status: string | null
  paid_amount: number | null
  paid_at: string | null
  deleted_at: string | null
  amount_estimated: number
  recurrence_id: string | null
  recurrence_month: string | null
  created_at: string
  updated_at: string
}

function toMovement(row: MovementRow): Movement {
  return {
    id: row.id,
    type: row.type as Movement['type'],
    name: row.name,
    amount: row.amount,
    categoryId: row.category_id,
    day: row.day,
    dueDate: row.due_date,
    billStatus: row.bill_status as Movement['billStatus'],
    paidAmount: row.paid_amount,
    paidAt: row.paid_at,
    deletedAt: row.deleted_at,
    amountEstimated: row.amount_estimated === 1,
    recurrenceId: row.recurrence_id,
    recurrenceMonth: row.recurrence_month,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

const SORT_CLAUSES: Record<NonNullable<MovementFilters['sort']>, string> = {
  recent: 'day DESC, created_at DESC',
  oldest: 'day ASC, created_at ASC',
  amount_desc: 'amount DESC',
  amount_asc: 'amount ASC',
  name_asc: 'name COLLATE NOCASE ASC',
  name_desc: 'name COLLATE NOCASE DESC'
}

export class MovementsRepository {
  constructor(private db: DatabaseSync) {}

  private mapRow = toMovement

  list(filters: MovementFilters = {}): Movement[] {
    const clauses: string[] = []
    const params: Record<string, string | number> = {}

    clauses.push(filters.includeDeleted ? 'deleted_at IS NOT NULL' : 'deleted_at IS NULL')

    if (filters.type && filters.type !== 'all') {
      clauses.push('type = @type')
      params.type = filters.type
    }

    if (filters.categoryId && filters.categoryId !== 'all') {
      clauses.push('category_id = @categoryId')
      params.categoryId = filters.categoryId
    }

    if (filters.search) {
      clauses.push(
        `(name LIKE @search OR category_id IN (SELECT id FROM categories WHERE name LIKE @search))`
      )
      params.search = `%${filters.search}%`
    }

    if (filters.period) {
      const { from, to } = resolvePeriodRange(filters.period)
      clauses.push('day BETWEEN @from AND @to')
      params.from = from
      params.to = to
    }

    if (filters.minAmount !== undefined) {
      clauses.push('amount >= @minAmount')
      params.minAmount = filters.minAmount
    }

    if (filters.maxAmount !== undefined) {
      clauses.push('amount <= @maxAmount')
      params.maxAmount = filters.maxAmount
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const orderBy = SORT_CLAUSES[filters.sort ?? 'recent']

    const rows = this.db
      .prepare(`SELECT * FROM movements ${where} ORDER BY ${orderBy}`)
      .all(params) as unknown as MovementRow[]

    return rows.map(this.mapRow)
  }

  listRecent(limit: number): Movement[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM movements WHERE deleted_at IS NULL ORDER BY day DESC, created_at DESC LIMIT ?`
      )
      .all(limit) as unknown as MovementRow[]
    return rows.map(this.mapRow)
  }

  listPendingBills(): Movement[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM movements
         WHERE deleted_at IS NULL AND type = 'conta' AND bill_status = 'pending'
         ORDER BY due_date ASC`
      )
      .all() as unknown as MovementRow[]
    return rows.map(this.mapRow)
  }

  listPaidForPeriod(from: string, to: string): Movement[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM movements
         WHERE deleted_at IS NULL
           AND (
             type = 'despesa'
             OR (type = 'conta' AND bill_status = 'paid')
           )
           AND day BETWEEN ? AND ?`
      )
      .all(from, to) as unknown as MovementRow[]
    return rows.map(this.mapRow)
  }

  getBalance(): number {
    const row = this.db
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN type = 'receita' THEN amount END), 0)
           - COALESCE(SUM(CASE WHEN type = 'despesa' THEN amount END), 0)
           - COALESCE(SUM(CASE WHEN type = 'conta' AND bill_status = 'paid'
                          THEN COALESCE(paid_amount, amount) END), 0) AS balance
         FROM movements
         WHERE deleted_at IS NULL`
      )
      .get() as { balance: number }
    return row.balance
  }

  getIncomeTotal(from: string, to: string): number {
    const row = this.db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM movements
         WHERE deleted_at IS NULL AND type = 'receita' AND day BETWEEN ? AND ?`
      )
      .get(from, to) as { total: number }
    return row.total
  }

  getExpensesTotal(from: string, to: string): number {
    const row = this.db
      .prepare(
        `SELECT COALESCE(SUM(
           CASE
             WHEN type = 'despesa' THEN amount
             WHEN type = 'conta' AND bill_status = 'paid' THEN COALESCE(paid_amount, amount)
             ELSE 0
           END
         ), 0) AS total
         FROM movements
         WHERE deleted_at IS NULL AND day BETWEEN ? AND ?`
      )
      .get(from, to) as { total: number }
    return row.total
  }

  getBalanceAsOf(date: string): number {
    const row = this.db
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN type = 'receita' THEN amount END), 0)
           - COALESCE(SUM(CASE WHEN type = 'despesa' THEN amount END), 0)
           - COALESCE(SUM(CASE WHEN type = 'conta' AND bill_status = 'paid'
                          THEN COALESCE(paid_amount, amount) END), 0) AS balance
         FROM movements
         WHERE deleted_at IS NULL AND day <= ?`
      )
      .get(date) as { balance: number }
    return row.balance
  }

  listDailyNet(from: string, to: string): { day: string; income: number; expenses: number }[] {
    const rows = this.db
      .prepare(
        `SELECT day,
           COALESCE(SUM(CASE WHEN type = 'receita' THEN amount ELSE 0 END), 0) AS income,
           COALESCE(SUM(
             CASE
               WHEN type = 'despesa' THEN amount
               WHEN type = 'conta' AND bill_status = 'paid' THEN COALESCE(paid_amount, amount)
               ELSE 0
             END
           ), 0) AS expenses
         FROM movements
         WHERE deleted_at IS NULL AND day BETWEEN ? AND ?
         GROUP BY day
         ORDER BY day ASC`
      )
      .all(from, to) as { day: string; income: number; expenses: number }[]
    return rows
  }

  getPendingSummary(): { total: number; count: number } {
    const row = this.db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM movements
         WHERE deleted_at IS NULL AND type = 'conta' AND bill_status = 'pending'`
      )
      .get() as { total: number; count: number }
    return row
  }

  get(id: string): Movement | undefined {
    const row = this.db.prepare('SELECT * FROM movements WHERE id = ?').get(id) as
      | MovementRow
      | undefined
    return row ? this.mapRow(row) : undefined
  }

  create(input: CreateMovementInput): Movement {
    const id = randomUUID()
    const now = new Date().toISOString()

    this.db
      .prepare(
        `INSERT INTO movements
           (id, type, name, amount, category_id, day, due_date, bill_status,
            paid_amount, paid_at, deleted_at, amount_estimated,
            recurrence_id, recurrence_month, created_at, updated_at)
         VALUES
           (@id, @type, @name, @amount, @categoryId, @day, @dueDate, @billStatus,
            NULL, NULL, NULL, @amountEstimated,
            @recurrenceId, @recurrenceMonth, @createdAt, @updatedAt)`
      )
      .run({
        id,
        type: input.type,
        name: input.name,
        amount: input.amount,
        categoryId: input.categoryId,
        day: input.day,
        dueDate: input.type === 'conta' ? input.dueDate ?? null : null,
        billStatus: input.type === 'conta' ? 'pending' : null,
        amountEstimated: input.amountEstimated ? 1 : 0,
        recurrenceId: input.recurrenceId ?? null,
        recurrenceMonth: input.recurrenceMonth ?? null,
        createdAt: now,
        updatedAt: now
      })

    return this.get(id)!
  }

  update(id: string, input: UpdateMovementInput): Movement {
    const current = this.get(id)
    if (!current) throw new Error(`Movimentação ${id} não encontrada`)

    this.db
      .prepare(
        `UPDATE movements SET
           name = @name,
           amount = @amount,
           category_id = @categoryId,
           day = @day,
           due_date = @dueDate,
           updated_at = @updatedAt
         WHERE id = @id`
      )
      .run({
        id,
        name: input.name ?? current.name,
        amount: input.amount ?? current.amount,
        categoryId: input.categoryId ?? current.categoryId,
        day: input.day ?? current.day,
        dueDate: current.type === 'conta' ? input.dueDate ?? current.dueDate : null,
        updatedAt: new Date().toISOString()
      })

    return this.get(id)!
  }

  payBill(id: string, paidAmount?: number): Movement {
    const current = this.get(id)
    if (!current) throw new Error(`Movimentação ${id} não encontrada`)
    if (current.type !== 'conta') throw new Error('Somente contas podem ser pagas')

    const now = new Date().toISOString()
    this.db
      .prepare(
        `UPDATE movements SET
           bill_status = 'paid',
           paid_amount = @paidAmount,
           paid_at = @paidAt,
           updated_at = @updatedAt
         WHERE id = @id`
      )
      .run({
        id,
        paidAmount: paidAmount ?? null,
        paidAt: now,
        updatedAt: now
      })

    return this.get(id)!
  }

  softDelete(id: string): void {
    this.db
      .prepare('UPDATE movements SET deleted_at = @deletedAt, updated_at = @deletedAt WHERE id = @id')
      .run({ id, deletedAt: new Date().toISOString() })
  }

  restore(id: string): void {
    this.db
      .prepare('UPDATE movements SET deleted_at = NULL, updated_at = @updatedAt WHERE id = @id')
      .run({ id, updatedAt: new Date().toISOString() })
  }

  permanentlyDelete(id: string): void {
    this.db.prepare('DELETE FROM movements WHERE id = ?').run(id)
  }

  /** Existe uma movimentação dessa regra nesse mês? Conta inclusive as que estão na lixeira,
   *  para não recriar o que o usuário apagou de propósito. */
  hasRecurrenceMonth(recurrenceId: string, month: string): boolean {
    const row = this.db
      .prepare(
        'SELECT COUNT(*) as count FROM movements WHERE recurrence_id = ? AND recurrence_month = ?'
      )
      .get(recurrenceId, month) as { count: number }
    return row.count > 0
  }

  /**
   * Os últimos valores realmente pagos dessa regra, do mais recente para o mais
   * antigo. É a matéria-prima da estimativa de conta variável: `paid_amount` é o
   * que saiu de fato, e só ele — valor previsto que nunca foi pago não ensina nada.
   */
  getLastPaidAmounts(recurrenceId: string, limit: number): number[] {
    const rows = this.db
      .prepare(
        `SELECT COALESCE(paid_amount, amount) AS valor
         FROM movements
         WHERE recurrence_id = ? AND bill_status = 'paid' AND deleted_at IS NULL
         ORDER BY recurrence_month DESC
         LIMIT ?`
      )
      .all(recurrenceId, limit) as unknown as { valor: number }[]
    return rows.map((r) => r.valor)
  }

  getRecurrenceStats(recurrenceId: string): { count: number; lastMonth: string | null } {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) as count, MAX(recurrence_month) as lastMonth
         FROM movements WHERE recurrence_id = ?`
      )
      .get(recurrenceId) as { count: number; lastMonth: string | null }
    return { count: row.count, lastMonth: row.lastMonth ?? null }
  }

  detachRecurrence(recurrenceId: string): void {
    this.db
      .prepare(
        'UPDATE movements SET recurrence_id = NULL, recurrence_month = NULL WHERE recurrence_id = ?'
      )
      .run(recurrenceId)
  }

  purgeExpiredTrash(olderThan: Date): number {
    const cutoff = olderThan.toISOString()
    const result = this.db
      .prepare('DELETE FROM movements WHERE deleted_at IS NOT NULL AND deleted_at <= ?')
      .run(cutoff)
    return Number(result.changes)
  }
}
