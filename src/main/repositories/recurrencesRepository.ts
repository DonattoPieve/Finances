import { randomUUID } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import type {
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
  category_id: string
  day_of_month: number
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
    categoryId: row.category_id,
    dayOfMonth: row.day_of_month,
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
           (id, type, name, amount, category_id, day_of_month, start_month, end_month,
            active, created_at, updated_at)
         VALUES
           (@id, @type, @name, @amount, @categoryId, @dayOfMonth, @startMonth, @endMonth,
            1, @createdAt, @updatedAt)`
      )
      .run({
        id,
        type: input.type,
        name: input.name,
        amount: input.amount,
        categoryId: input.categoryId,
        dayOfMonth: input.dayOfMonth,
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
           category_id = @categoryId,
           day_of_month = @dayOfMonth,
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
        categoryId: input.categoryId ?? current.categoryId,
        dayOfMonth: input.dayOfMonth ?? current.dayOfMonth,
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
