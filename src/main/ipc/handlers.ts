import { app, ipcMain } from 'electron'
import { getDb } from '../db'
import { MovementsRepository } from '../repositories/movementsRepository'
import { CategoriesRepository } from '../repositories/categoriesRepository'
import { DashboardService } from '../services/dashboardService'
import { MovementService } from '../services/movementService'
import { TrashService } from '../services/trashService'
import { BackupService } from '../services/backupService'
import { RecurrencesRepository } from '../repositories/recurrencesRepository'
import { RecurrenceService } from '../services/recurrenceService'
import { UpdateService } from '../services/updateService'
import { withDueStatus, sortByDuePriority } from '../services/dueStatusService'
import type {
  CategoryKind,
  CreateCategoryInput,
  CreateMovementInput,
  CreateRecurrenceInput,
  MovementFilters,
  PeriodRange,
  UpdateCategoryInput,
  UpdateMovementInput,
  UpdateRecurrenceInput
} from '../../shared/types'

export function registerIpcHandlers(): void {
  const db = getDb()
  const movementsRepository = new MovementsRepository(db)
  const categoriesRepository = new CategoriesRepository(db)
  const dashboardService = new DashboardService(movementsRepository, categoriesRepository)
  const movementService = new MovementService(movementsRepository, categoriesRepository)
  const trashService = new TrashService(movementsRepository)
  const backupService = new BackupService(db)
  const recurrencesRepository = new RecurrencesRepository(db)
  const recurrenceService = new RecurrenceService(
    recurrencesRepository,
    movementsRepository,
    categoriesRepository
  )

  // Roda a limpeza automática da lixeira (30 dias) uma vez a cada inicialização.
  trashService.purgeExpired()

  // Lança as movimentações recorrentes dos meses que passaram desde a última abertura.
  recurrenceService.materializeAll()

  // Olha se saiu versão nova, em silêncio. Quem decide baixar é o usuário.
  const updateService = new UpdateService()
  updateService.checkOnStartup()

  ipcMain.handle('dashboard:getSummary', (_event, period: PeriodRange) =>
    dashboardService.getSummary(period)
  )

  ipcMain.handle('movements:list', (_event, filters: MovementFilters) =>
    movementsRepository.list(filters)
  )
  ipcMain.handle('movements:get', (_event, id: string) => movementsRepository.get(id))
  ipcMain.handle('movements:create', (_event, input: CreateMovementInput) =>
    movementService.create(input)
  )
  ipcMain.handle('movements:update', (_event, id: string, input: UpdateMovementInput) =>
    movementService.update(id, input)
  )
  ipcMain.handle('movements:softDelete', (_event, id: string) => movementService.softDelete(id))
  ipcMain.handle('movements:payBill', (_event, id: string, paidAmount?: number) =>
    movementService.payBill(id, paidAmount)
  )

  ipcMain.handle('categories:list', (_event, kind?: CategoryKind) =>
    categoriesRepository.list(kind)
  )
  ipcMain.handle('categories:create', (_event, input: CreateCategoryInput) =>
    categoriesRepository.create(input)
  )
  ipcMain.handle('categories:update', (_event, id: string, input: UpdateCategoryInput) =>
    categoriesRepository.update(id, input)
  )
  ipcMain.handle('categories:countMovements', (_event, id: string) =>
    categoriesRepository.countMovements(id)
  )
  ipcMain.handle('categories:delete', (_event, id: string) => {
    const inUse = categoriesRepository.countMovements(id)
    if (inUse > 0) {
      throw new Error(`Categoria em uso por ${inUse} movimentação(ões)`)
    }
    categoriesRepository.delete(id)
  })

  ipcMain.handle('recurrences:list', () => recurrenceService.list())
  ipcMain.handle('recurrences:create', (_event, input: CreateRecurrenceInput) =>
    recurrenceService.create(input)
  )
  ipcMain.handle('recurrences:update', (_event, id: string, input: UpdateRecurrenceInput) =>
    recurrenceService.update(id, input)
  )
  ipcMain.handle('recurrences:setActive', (_event, id: string, active: boolean) =>
    recurrenceService.setActive(id, active)
  )
  ipcMain.handle('recurrences:delete', (_event, id: string) => recurrenceService.delete(id))

  ipcMain.handle('pending:list', () =>
    sortByDuePriority(movementsRepository.listPendingBills().map(withDueStatus))
  )

  ipcMain.handle('backup:export', () => backupService.export())
  ipcMain.handle('backup:import', () => backupService.import())
  ipcMain.handle('backup:getDataFolder', () => backupService.getDataFolder())
  ipcMain.handle('backup:openDataFolder', () => backupService.openDataFolder())

  ipcMain.handle('update:getStatus', () => updateService.getStatus())
  ipcMain.handle('update:check', () => updateService.check())
  ipcMain.handle('update:download', () => updateService.download())
  ipcMain.handle('update:install', () => updateService.installNow())
  ipcMain.handle('update:getVersion', () => app.getVersion())

  ipcMain.handle('trash:list', () => trashService.list())
  ipcMain.handle('trash:restore', (_event, id: string) => trashService.restore(id))
  ipcMain.handle('trash:permanentlyDelete', (_event, id: string) =>
    trashService.permanentlyDelete(id)
  )
}
