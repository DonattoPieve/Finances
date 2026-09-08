import fs from 'node:fs'
import path from 'node:path'
import { app, dialog, shell, BrowserWindow } from 'electron'
import type { DatabaseSync } from 'node:sqlite'
import { localIsoDate } from './period'
import type {
  AmountKind,
  BackupFile,
  Category,
  CategoryKind,
  ExportResult,
  ImportResult,
  Movement,
  MovementType,
  Recurrence,
  RecurrenceType
} from '../../shared/types'

const BACKUP_FORMAT = 3
const MOVEMENT_TYPES: MovementType[] = ['receita', 'despesa', 'conta']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Campo "${field}" inválido no arquivo de backup`)
  }
  return value
}

function asNullableString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') {
    throw new Error(`Campo "${field}" inválido no arquivo de backup`)
  }
  return value
}

function asNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Campo "${field}" inválido no arquivo de backup`)
  }
  return value
}

function asNullableNumber(value: unknown, field: string): number | null {
  if (value === null || value === undefined) return null
  return asNumber(value, field)
}

function parseCategory(raw: unknown, index: number): Category {
  if (!isRecord(raw)) throw new Error(`Categoria #${index + 1} inválida no arquivo de backup`)
  // Backups no formato 1 não tinham tipo de categoria: tudo era despesa.
  const kind = raw.kind === 'receita' ? 'receita' : 'despesa'
  return {
    id: asString(raw.id, `categories[${index}].id`),
    name: asString(raw.name, `categories[${index}].name`),
    icon: asString(raw.icon, `categories[${index}].icon`),
    color: asString(raw.color, `categories[${index}].color`),
    kind: kind as CategoryKind,
    isDefault: raw.isDefault === true,
    createdAt: asString(raw.createdAt, `categories[${index}].createdAt`)
  }
}

function parseMovement(raw: unknown, index: number, categoryIds: Set<string>): Movement {
  if (!isRecord(raw)) throw new Error(`Movimentação #${index + 1} inválida no arquivo de backup`)

  const type = raw.type
  if (typeof type !== 'string' || !MOVEMENT_TYPES.includes(type as MovementType)) {
    throw new Error(`Tipo inválido na movimentação #${index + 1}`)
  }

  const categoryId = asString(raw.categoryId, `movements[${index}].categoryId`)
  if (!categoryIds.has(categoryId)) {
    throw new Error(`Movimentação #${index + 1} aponta para uma categoria que não está no backup`)
  }

  const billStatus = asNullableString(raw.billStatus, `movements[${index}].billStatus`)
  if (billStatus !== null && billStatus !== 'pending' && billStatus !== 'paid') {
    throw new Error(`Status de conta inválido na movimentação #${index + 1}`)
  }

  return {
    id: asString(raw.id, `movements[${index}].id`),
    type: type as MovementType,
    name: asString(raw.name, `movements[${index}].name`),
    amount: asNumber(raw.amount, `movements[${index}].amount`),
    categoryId,
    day: asString(raw.day, `movements[${index}].day`),
    dueDate: asNullableString(raw.dueDate, `movements[${index}].dueDate`),
    billStatus,
    paidAmount: asNullableNumber(raw.paidAmount, `movements[${index}].paidAmount`),
    paidAt: asNullableString(raw.paidAt, `movements[${index}].paidAt`),
    deletedAt: asNullableString(raw.deletedAt, `movements[${index}].deletedAt`),
    amountEstimated: raw.amountEstimated === true,
    recurrenceId: asNullableString(raw.recurrenceId, `movements[${index}].recurrenceId`),
    recurrenceMonth: asNullableString(raw.recurrenceMonth, `movements[${index}].recurrenceMonth`),
    createdAt: asString(raw.createdAt, `movements[${index}].createdAt`),
    updatedAt: asString(raw.updatedAt, `movements[${index}].updatedAt`)
  }
}

function parseRecurrence(raw: unknown, index: number, categoryIds: Set<string>): Recurrence {
  if (!isRecord(raw)) throw new Error(`Regra recorrente #${index + 1} inválida no backup`)

  const type = raw.type
  if (type !== 'receita' && type !== 'despesa' && type !== 'conta') {
    throw new Error(`Tipo inválido na regra recorrente #${index + 1}`)
  }

  const categoryId = asString(raw.categoryId, `recurrences[${index}].categoryId`)
  if (!categoryIds.has(categoryId)) {
    throw new Error(`Regra recorrente #${index + 1} aponta para uma categoria fora do backup`)
  }

  const dayOfMonth = asNumber(raw.dayOfMonth, `recurrences[${index}].dayOfMonth`)
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
    throw new Error(`Dia do mês inválido na regra recorrente #${index + 1}`)
  }

  return {
    id: asString(raw.id, `recurrences[${index}].id`),
    type: type as RecurrenceType,
    name: asString(raw.name, `recurrences[${index}].name`),
    amount: asNumber(raw.amount, `recurrences[${index}].amount`),
    // Backups no formato 2 não tinham conta recorrente: tudo era fixo.
    amountKind: (raw.amountKind === 'variavel' ? 'variavel' : 'fixo') as AmountKind,
    categoryId,
    dayOfMonth,
    dueDay: raw.dueDay === undefined || raw.dueDay === null ? null : asNumber(raw.dueDay, `recurrences[${index}].dueDay`),
    startMonth: asString(raw.startMonth, `recurrences[${index}].startMonth`),
    endMonth: asNullableString(raw.endMonth, `recurrences[${index}].endMonth`),
    active: raw.active !== false,
    createdAt: asString(raw.createdAt, `recurrences[${index}].createdAt`),
    updatedAt: asString(raw.updatedAt, `recurrences[${index}].updatedAt`)
  }
}

function parseBackup(content: string): BackupFile {
  let raw: unknown
  try {
    raw = JSON.parse(content)
  } catch {
    throw new Error('O arquivo selecionado não é um JSON válido')
  }

  if (!isRecord(raw) || raw.app !== 'pluto') {
    throw new Error('O arquivo selecionado não é um backup do Pluto')
  }

  if (typeof raw.format !== 'number' || raw.format > BACKUP_FORMAT) {
    throw new Error('Este backup foi gerado por uma versão mais nova do Pluto')
  }

  if (!Array.isArray(raw.categories) || !Array.isArray(raw.movements)) {
    throw new Error('O backup não contém categorias e movimentações')
  }

  const categories = raw.categories.map(parseCategory)
  const categoryIds = new Set(categories.map((category) => category.id))
  const movements = raw.movements.map((movement, index) =>
    parseMovement(movement, index, categoryIds)
  )
  // Backups no formato 1 não tinham recorrência.
  const recurrences = Array.isArray(raw.recurrences)
    ? raw.recurrences.map((recurrence, index) => parseRecurrence(recurrence, index, categoryIds))
    : []

  return {
    app: 'pluto',
    format: BACKUP_FORMAT,
    appVersion: typeof raw.appVersion === 'string' ? raw.appVersion : 'desconhecida',
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : new Date().toISOString(),
    categories,
    movements,
    recurrences
  }
}

export class BackupService {
  constructor(private db: DatabaseSync) {}

  private readAll(): {
    categories: Category[]
    movements: Movement[]
    recurrences: Recurrence[]
  } {
    const categoryRows = this.db
      .prepare('SELECT * FROM categories ORDER BY created_at ASC')
      .all() as Record<string, never>[]
    const movementRows = this.db
      .prepare('SELECT * FROM movements ORDER BY created_at ASC')
      .all() as Record<string, never>[]
    const recurrenceRows = this.db
      .prepare('SELECT * FROM recurrences ORDER BY created_at ASC')
      .all() as Record<string, never>[]

    const categories = categoryRows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      icon: row.icon as string,
      color: row.color as string,
      kind: row.kind as unknown as CategoryKind,
      isDefault: (row.is_default as unknown as number) === 1,
      createdAt: row.created_at as string
    }))

    const movements = movementRows.map((row) => ({
      id: row.id as string,
      type: row.type as unknown as MovementType,
      name: row.name as string,
      amount: row.amount as unknown as number,
      categoryId: row.category_id as string,
      day: row.day as string,
      dueDate: (row.due_date ?? null) as string | null,
      billStatus: (row.bill_status ?? null) as Movement['billStatus'],
      paidAmount: (row.paid_amount ?? null) as number | null,
      paidAt: (row.paid_at ?? null) as string | null,
      deletedAt: (row.deleted_at ?? null) as string | null,
      amountEstimated: (row.amount_estimated as unknown as number) === 1,
      recurrenceId: (row.recurrence_id ?? null) as string | null,
      recurrenceMonth: (row.recurrence_month ?? null) as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string
    }))

    const recurrences = recurrenceRows.map((row) => ({
      id: row.id as string,
      type: row.type as unknown as RecurrenceType,
      name: row.name as string,
      amount: row.amount as unknown as number,
      categoryId: row.category_id as string,
      amountKind: row.amount_kind as unknown as AmountKind,
      dayOfMonth: row.day_of_month as unknown as number,
      dueDay: (row.due_day ?? null) as number | null,
      startMonth: row.start_month as string,
      endMonth: (row.end_month ?? null) as string | null,
      active: (row.active as unknown as number) === 1,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string
    }))

    return { categories, movements, recurrences }
  }

  async export(): Promise<ExportResult> {
    const { categories, movements, recurrences } = this.readAll()
    const today = localIsoDate()

    const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null
    const target = await dialog.showSaveDialog(window, {
      title: 'Exportar dados do Pluto',
      defaultPath: path.join(app.getPath('documents'), `pluto-backup-${today}.json`),
      filters: [{ name: 'Backup do Pluto', extensions: ['json'] }]
    })

    if (target.canceled || !target.filePath) {
      return { canceled: true, categories: 0, movements: 0 }
    }

    const backup: BackupFile = {
      app: 'pluto',
      format: BACKUP_FORMAT,
      appVersion: app.getVersion(),
      exportedAt: new Date().toISOString(),
      categories,
      movements,
      recurrences
    }

    fs.writeFileSync(target.filePath, JSON.stringify(backup, null, 2), 'utf-8')

    return {
      canceled: false,
      filePath: target.filePath,
      categories: categories.length,
      movements: movements.length
    }
  }

  async import(): Promise<ImportResult> {
    const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null
    const selection = await dialog.showOpenDialog(window, {
      title: 'Importar dados do Pluto',
      properties: ['openFile'],
      filters: [{ name: 'Backup do Pluto', extensions: ['json'] }]
    })

    if (selection.canceled || selection.filePaths.length === 0) {
      return { canceled: true, categories: 0, movements: 0 }
    }

    const backup = parseBackup(fs.readFileSync(selection.filePaths[0], 'utf-8'))

    const confirmation = await dialog.showMessageBox(window, {
      type: 'warning',
      buttons: ['Cancelar', 'Substituir tudo'],
      defaultId: 0,
      cancelId: 0,
      title: 'Importar dados',
      message: 'Substituir todos os dados atuais?',
      detail:
        `O backup contém ${backup.categories.length} categoria(s), ${backup.movements.length} movimentação(ões) ` +
        `e ${backup.recurrences.length} regra(s) recorrente(s).\n\n` +
        'Tudo que está no Pluto neste computador será apagado e substituído. Esta ação não pode ser desfeita — exporte seus dados atuais antes, se quiser guardá-los.'
    })

    if (confirmation.response !== 1) {
      return { canceled: true, categories: 0, movements: 0 }
    }

    this.replaceAll(backup)

    return {
      canceled: false,
      categories: backup.categories.length,
      movements: backup.movements.length
    }
  }

  private replaceAll(backup: BackupFile): void {
    const insertCategory = this.db.prepare(
      `INSERT INTO categories (id, name, icon, color, kind, is_default, created_at)
       VALUES (@id, @name, @icon, @color, @kind, @isDefault, @createdAt)`
    )
    const insertRecurrence = this.db.prepare(
      `INSERT INTO recurrences
         (id, type, name, amount, amount_kind, category_id, day_of_month, due_day,
          start_month, end_month, active, created_at, updated_at)
       VALUES
         (@id, @type, @name, @amount, @amountKind, @categoryId, @dayOfMonth, @dueDay,
          @startMonth, @endMonth, @active, @createdAt, @updatedAt)`
    )
    const insertMovement = this.db.prepare(
      `INSERT INTO movements (
         id, type, name, amount, category_id, day, due_date, bill_status,
         paid_amount, paid_at, deleted_at, amount_estimated,
         recurrence_id, recurrence_month, created_at, updated_at
       ) VALUES (
         @id, @type, @name, @amount, @categoryId, @day, @dueDate, @billStatus,
         @paidAmount, @paidAt, @deletedAt, @amountEstimated,
         @recurrenceId, @recurrenceMonth, @createdAt, @updatedAt
       )`
    )

    this.db.exec('BEGIN')
    try {
      this.db.exec('DELETE FROM movements')
      this.db.exec('DELETE FROM recurrences')
      this.db.exec('DELETE FROM categories')

      for (const category of backup.categories) {
        insertCategory.run({
          id: category.id,
          name: category.name,
          icon: category.icon,
          color: category.color,
          kind: category.kind,
          isDefault: category.isDefault ? 1 : 0,
          createdAt: category.createdAt
        })
      }

      for (const recurrence of backup.recurrences) {
        insertRecurrence.run({
          id: recurrence.id,
          type: recurrence.type,
          name: recurrence.name,
          amount: recurrence.amount,
          amountKind: recurrence.amountKind,
          categoryId: recurrence.categoryId,
          dayOfMonth: recurrence.dayOfMonth,
          dueDay: recurrence.dueDay,
          startMonth: recurrence.startMonth,
          endMonth: recurrence.endMonth,
          active: recurrence.active ? 1 : 0,
          createdAt: recurrence.createdAt,
          updatedAt: recurrence.updatedAt
        })
      }

      for (const movement of backup.movements) {
        insertMovement.run({
          id: movement.id,
          type: movement.type,
          name: movement.name,
          amount: movement.amount,
          categoryId: movement.categoryId,
          day: movement.day,
          dueDate: movement.dueDate,
          billStatus: movement.billStatus,
          paidAmount: movement.paidAmount,
          paidAt: movement.paidAt,
          deletedAt: movement.deletedAt,
          amountEstimated: movement.amountEstimated ? 1 : 0,
          recurrenceId: movement.recurrenceId,
          recurrenceMonth: movement.recurrenceMonth,
          createdAt: movement.createdAt,
          updatedAt: movement.updatedAt
        })
      }

      this.db.exec('COMMIT')
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  getDataFolder(): string {
    return app.getPath('userData')
  }

  async openDataFolder(): Promise<void> {
    await shell.openPath(this.getDataFolder())
  }
}
