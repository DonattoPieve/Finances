import { randomUUID } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import type {
  Category,
  CategoryKind,
  CreateCategoryInput,
  UpdateCategoryInput
} from '../../shared/types'

interface CategoryRow {
  id: string
  name: string
  icon: string
  color: string
  kind: string
  is_default: number
  created_at: string
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    kind: row.kind as CategoryKind,
    isDefault: row.is_default === 1,
    createdAt: row.created_at
  }
}

export class CategoriesRepository {
  constructor(private db: DatabaseSync) {}

  /** Sem `kind`, devolve as duas listas juntas (usado em filtros e no backup). */
  list(kind?: CategoryKind): Category[] {
    const rows = (
      kind
        ? this.db
            .prepare(
              'SELECT * FROM categories WHERE kind = ? ORDER BY is_default DESC, name ASC'
            )
            .all(kind)
        : this.db
            .prepare('SELECT * FROM categories ORDER BY kind DESC, is_default DESC, name ASC')
            .all()
    ) as unknown as CategoryRow[]
    return rows.map(toCategory)
  }

  get(id: string): Category | undefined {
    const row = this.db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as
      | CategoryRow
      | undefined
    return row ? toCategory(row) : undefined
  }

  create(input: CreateCategoryInput): Category {
    const id = randomUUID()
    const createdAt = new Date().toISOString()
    this.db
      .prepare(
        `INSERT INTO categories (id, name, icon, color, kind, is_default, created_at)
         VALUES (@id, @name, @icon, @color, @kind, 0, @createdAt)`
      )
      .run({ id, createdAt, ...input })
    return this.get(id)!
  }

  update(id: string, input: UpdateCategoryInput): Category {
    const current = this.get(id)
    if (!current) throw new Error(`Categoria ${id} não encontrada`)

    this.db
      .prepare('UPDATE categories SET name = @name, icon = @icon, color = @color WHERE id = @id')
      .run({
        id,
        name: input.name ?? current.name,
        icon: input.icon ?? current.icon,
        color: input.color ?? current.color
      })
    return this.get(id)!
  }

  countMovements(id: string): number {
    const row = this.db
      .prepare('SELECT COUNT(*) as count FROM movements WHERE category_id = ? AND deleted_at IS NULL')
      .get(id) as { count: number }
    return row.count
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM categories WHERE id = ?').run(id)
  }
}
