import { randomUUID } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'

/**
 * Migrações versionadas do banco.
 *
 * `schema.ts` cria apenas o schema base (o que existia antes deste mecanismo).
 * Tudo que veio depois entra aqui, como um passo numerado, e vale tanto para
 * bancos novos quanto para bancos já em uso — a versão aplicada fica em
 * `PRAGMA user_version`.
 *
 * Regras: nunca edite uma migração já publicada, sempre acrescente a próxima.
 */
interface Migration {
  version: number
  name: string
  up: (db: DatabaseSync) => void
}

const INCOME_DEFAULT_CATEGORIES = [
  { name: 'Salário', icon: 'wallet', color: '#22c55e' },
  { name: 'Outros', icon: 'ellipsis', color: '#14b8a6' }
]

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'categorias separadas por tipo (receita/despesa)',
    up(db) {
      db.exec(`ALTER TABLE categories ADD COLUMN kind TEXT NOT NULL DEFAULT 'despesa'`)
      db.exec(`UPDATE categories SET kind = 'despesa' WHERE kind IS NULL OR kind = ''`)
      db.exec(`CREATE INDEX IF NOT EXISTS idx_categories_kind ON categories(kind)`)

      const now = new Date().toISOString()
      const insert = db.prepare(
        `INSERT INTO categories (id, name, icon, color, kind, is_default, created_at)
         VALUES (@id, @name, @icon, @color, 'receita', 1, @createdAt)`
      )
      for (const category of INCOME_DEFAULT_CATEGORIES) {
        insert.run({ id: randomUUID(), createdAt: now, ...category })
      }
    }
  },
  {
    version: 2,
    name: 'receitas e despesas recorrentes',
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS recurrences (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL CHECK(type IN ('receita','despesa')),
          name TEXT NOT NULL,
          amount REAL NOT NULL,
          category_id TEXT NOT NULL REFERENCES categories(id),
          day_of_month INTEGER NOT NULL,
          start_month TEXT NOT NULL,
          end_month TEXT,
          active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)
      db.exec(`ALTER TABLE movements ADD COLUMN recurrence_id TEXT`)
      db.exec(`ALTER TABLE movements ADD COLUMN recurrence_month TEXT`)
      // Garante no máximo uma movimentação por regra por mês.
      db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_movements_recurrence_month
          ON movements(recurrence_id, recurrence_month)
          WHERE recurrence_id IS NOT NULL
      `)
      db.exec(`CREATE INDEX IF NOT EXISTS idx_recurrences_active ON recurrences(active)`)
    }
  }
,
  {
    version: 3,
    name: 'contas recorrentes, com valor fixo ou variável',
    up(db) {
      // A coluna `type` tinha CHECK(type IN ('receita','despesa')) e o SQLite não
      // altera CHECK: a tabela precisa ser refeita. Nada aponta para `recurrences`
      // por chave estrangeira, então dropar e recriar é seguro.
      db.exec(`
        CREATE TABLE recurrences_novo (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL CHECK(type IN ('receita','despesa','conta')),
          name TEXT NOT NULL,
          amount REAL NOT NULL,
          -- 'fixo': o valor se repete igual todo mês (aluguel, assinatura).
          -- 'variavel': só se sabe quando a conta chega (água, luz, internet).
          --             a coluna amount vira a semente da estimativa.
          amount_kind TEXT NOT NULL DEFAULT 'fixo' CHECK(amount_kind IN ('fixo','variavel')),
          category_id TEXT NOT NULL REFERENCES categories(id),
          day_of_month INTEGER NOT NULL,
          -- Só para type='conta': o dia do vencimento dentro do mês.
          due_day INTEGER,
          start_month TEXT NOT NULL,
          end_month TEXT,
          active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)
      db.exec(`
        INSERT INTO recurrences_novo
          (id, type, name, amount, amount_kind, category_id, day_of_month, due_day,
           start_month, end_month, active, created_at, updated_at)
        SELECT id, type, name, amount, 'fixo', category_id, day_of_month, NULL,
               start_month, end_month, active, created_at, updated_at
        FROM recurrences
      `)
      db.exec('DROP TABLE recurrences')
      db.exec('ALTER TABLE recurrences_novo RENAME TO recurrences')
      db.exec('CREATE INDEX IF NOT EXISTS idx_recurrences_active ON recurrences(active)')

      // Marca a movimentação cujo valor ainda é chute, para a tela não apresentar
      // estimativa como se fosse fato.
      db.exec('ALTER TABLE movements ADD COLUMN amount_estimated INTEGER NOT NULL DEFAULT 0')
    }
  }
]

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version

export function runMigrations(db: DatabaseSync): void {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number }
  const currentVersion = row.user_version ?? 0

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) continue

    db.exec('BEGIN')
    try {
      migration.up(db)
      db.exec(`PRAGMA user_version = ${migration.version}`)
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      const reason = error instanceof Error ? error.message : String(error)
      throw new Error(`Falha na migração ${migration.version} (${migration.name}): ${reason}`)
    }
  }
}
