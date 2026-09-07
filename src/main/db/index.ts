import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { app } from 'electron'
import { SCHEMA_SQL } from './schema'
import { runMigrations } from './migrations'
import { seedDefaultCategories } from './seed'

let db: DatabaseSync | null = null

export function getDb(): DatabaseSync {
  if (db) return db

  const dbPath = path.join(app.getPath('userData'), 'pluto.db')
  db = new DatabaseSync(dbPath)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')
  db.exec(SCHEMA_SQL)
  runMigrations(db)
  seedDefaultCategories(db)

  return db
}
