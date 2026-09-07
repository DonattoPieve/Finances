import type { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'

interface DefaultCategory {
  name: string
  icon: string
  color: string
}

const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: 'Alimentação', icon: 'utensils', color: '#8b5cf6' },
  { name: 'Transporte', icon: 'car', color: '#3b82f6' },
  { name: 'Moradia', icon: 'home', color: '#f97316' },
  { name: 'Lazer', icon: 'gamepad-2', color: '#22c55e' },
  { name: 'Saúde', icon: 'heart-pulse', color: '#ef4444' },
  { name: 'Educação', icon: 'graduation-cap', color: '#06b6d4' },
  { name: 'Compras', icon: 'shopping-bag', color: '#eab308' },
  { name: 'Assinaturas', icon: 'repeat', color: '#ec4899' },
  { name: 'Outros', icon: 'ellipsis', color: '#64748b' }
]

export function seedDefaultCategories(db: DatabaseSync): void {
  const countRow = db.prepare("SELECT COUNT(*) as count FROM categories WHERE kind = 'despesa'").get() as {
    count: number
  }

  if (countRow.count === 0) {
    const insert = db.prepare(
      `INSERT INTO categories (id, name, icon, color, kind, is_default, created_at)
       VALUES (@id, @name, @icon, @color, 'despesa', 1, @createdAt)`
    )
    const now = new Date().toISOString()
    db.exec('BEGIN')
    try {
      for (const category of DEFAULT_CATEGORIES) {
        insert.run({ id: randomUUID(), createdAt: now, ...category })
      }
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
    return
  }

  // Atualiza ícone/cor das categorias padrão de despesa para acompanhar a paleta atual,
  // sem tocar nas categorias criadas pelo usuário nem nas de receita (semeadas na migração 1).
  const update = db.prepare(
    `UPDATE categories SET icon = @icon, color = @color
     WHERE name = @name AND is_default = 1 AND kind = 'despesa'`
  )
  db.exec('BEGIN')
  try {
    for (const category of DEFAULT_CATEGORIES) {
      update.run({ ...category })
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
