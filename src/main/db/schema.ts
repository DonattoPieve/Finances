export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS movements (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('receita','despesa','conta')),
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id),
  day TEXT NOT NULL,
  due_date TEXT,
  bill_status TEXT CHECK(bill_status IN ('pending','paid')),
  paid_amount REAL,
  paid_at TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_movements_deleted_at ON movements(deleted_at);
CREATE INDEX IF NOT EXISTS idx_movements_type ON movements(type);
CREATE INDEX IF NOT EXISTS idx_movements_day ON movements(day);
CREATE INDEX IF NOT EXISTS idx_movements_due_date ON movements(due_date);
CREATE INDEX IF NOT EXISTS idx_movements_category_id ON movements(category_id);
`
