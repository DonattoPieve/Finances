import { randomUUID } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import type {
  AmountKind,
  CreateRecurrenceInput,
  Recurrence,
  RecurrenceType,
  UpdateRecurrenceInput
} from '../../shared/types'

interface RecurrenceRow {
  id: string
  type: string
  name: string
  amount: number
  amount_kind: string
  category_id: string
  day_of_month: number
  due_day: number | null
  start_month: string
  end_month: string | null
  active: number
  created_at: string
  updated_at: string
}

function toRecurrence(row: RecurrenceRow): Recurrence {
  return {
    id: row.id,
    type: row.type as RecurrenceType,
    name: row.name,
    amount: row.amount,
    amountKind: row.amount_kind as AmountKind,
    categoryId: row.category_id,
    dayOfMonth: row.day_of_month,
    dueDay: row.due_day,
    startMonth: row.start_month,
    endMonth: row.end_month,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export class RecurrencesRepository {
  constructor(private db: DatabaseSync) {}

  list(): Recurrence[] {
    const rows = this.db
      .prepare('SELECT * FROM recurrences ORDER BY active DESC, day_of_month ASC, name ASC')
      .all() as unknown as RecurrenceRow[]
    return rows.map(toRecurrence)
  }

  listActive(): Recurrence[] {
    const rows = this.db
      .prepare('SELECT * FROM recurrences WHERE active = 1 ORDER BY start_month ASC')
      .all() as unknown as RecurrenceRow[]
    return rows.map(toRecurrence)
  }

  get(id: string): Recurrence | undefined {
    const row = this.db.prepare('SELECT * FROM recurrences WHERE id = ?').get(id) as
      | RecurrenceRow
      | undefined
    return row ? toRecurrence(row) : undefined
  }

  create(input: CreateRecurrenceInput): Recurrence {
    const id = randomUUID()
    const now = new Date().toISOString()

    this.db
      .prepare(
        `INSERT INTO recurrences
           (id, type, name, amount, amount_kind, category_id, day_of_month, due_day,
            start_month, end_month, active, created_at, updated_at)
         VALUES
           (@id, @type, @name, @amount, @amountKind, @categoryId, @dayOfMonth, @dueDay,
            @startMonth, @endMonth, 1, @createdAt, @updatedAt)`
      )
      .run({
        id,
        type: input.type,
        name: input.name,
        amount: input.amount,
        amountKind: input.amountKind ?? 'fixo',
        categoryId: input.categoryId,
        dayOfMonth: input.dayOfMonth,
        dueDay: input.dueDay ?? null,
        startMonth: input.startMonth,
        endMonth: input.endMonth ?? null,
        createdAt: now,
        updatedAt: now
      })

    return this.get(id)!
  }

  update(id: string, input: UpdateRecurrenceInput): Recurrence {
    const current = this.get(id)
    if (!current) throw new Error(`Regra ${id} não encontrada`)

    this.db
      .prepare(
        `UPDATE recurrences SET
           name = @name,
           amount = @amount,
           amount_kind = @amountKind,
           category_id = @categoryId,
           day_of_month = @dayOfMonth,
           due_day = @dueDay,
           start_month = @startMonth,
           end_month = @endMonth,
           active = @active,
           updated_at = @updatedAt
         WHERE id = @id`
      )
      .run({
        id,
        name: input.name ?? current.name,
        amount: input.amount ?? current.amount,
        amountKind: input.amountKind ?? current.amountKind,
        categoryId: input.categoryId ?? current.categoryId,
        dayOfMonth: input.dayOfMonth ?? current.dayOfMonth,
        dueDay: input.dueDay !== undefined ? input.dueDay : current.dueDay,
        startMonth: input.startMonth ?? current.startMonth,
        endMonth: input.endMonth !== undefined ? input.endMonth : current.endMonth,
        active: (input.active ?? current.active) ? 1 : 0,
        updatedAt: new Date().toISOString()
      })

    return this.get(id)!
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM recurrences WHERE id = ?').run(id)
  }
}
