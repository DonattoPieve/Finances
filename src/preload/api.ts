import { ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import type {
  CategoryKind,
  CreateCategoryInput,
  CreateMovementInput,
  CreateRecurrenceInput,
  MovementFilters,
  PeriodRange,
  UpdateCategoryInput,
  UpdateMovementInput,
  UpdateRecurrenceInput,
  UpdateStatus
} from '../shared/types'

export const api = {
  dashboard: {
    getSummary: (period: PeriodRange) => ipcRenderer.invoke('dashboard:getSummary', period)
  },
  movements: {
    list: (filters?: MovementFilters) => ipcRenderer.invoke('movements:list', filters),
    get: (id: string) => ipcRenderer.invoke('movements:get', id),
    create: (input: CreateMovementInput) => ipcRenderer.invoke('movements:create', input),
    update: (id: string, input: UpdateMovementInput) =>
      ipcRenderer.invoke('movements:update', id, input),
    softDelete: (id: string) => ipcRenderer.invoke('movements:softDelete', id),
    payBill: (id: string, paidAmount?: number) =>
      ipcRenderer.invoke('movements:payBill', id, paidAmount)
  },
  categories: {
    list: (kind?: CategoryKind) => ipcRenderer.invoke('categories:list', kind),
    create: (input: CreateCategoryInput) => ipcRenderer.invoke('categories:create', input),
    update: (id: string, input: UpdateCategoryInput) =>
      ipcRenderer.invoke('categories:update', id, input),
    delete: (id: string) => ipcRenderer.invoke('categories:delete', id),
    countMovements: (id: string) => ipcRenderer.invoke('categories:countMovements', id)
  },
  trash: {
    list: () => ipcRenderer.invoke('trash:list'),
    restore: (id: string) => ipcRenderer.invoke('trash:restore', id),
    permanentlyDelete: (id: string) => ipcRenderer.invoke('trash:permanentlyDelete', id)
  },
  pending: {
    list: () => ipcRenderer.invoke('pending:list')
  },
  update: {
    getVersion: () => ipcRenderer.invoke('update:getVersion'),
    getStatus: () => ipcRenderer.invoke('update:getStatus'),
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    install: () => ipcRenderer.invoke('update:install'),
    /** O main empurra cada mudança de estado; devolve a função que cancela a escuta. */
    onStatus: (callback: (status: UpdateStatus) => void) => {
      const ouvinte = (_event: IpcRendererEvent, status: UpdateStatus): void => callback(status)
      ipcRenderer.on('update:status', ouvinte)
      return () => {
        ipcRenderer.removeListener('update:status', ouvinte)
      }
    }
  },
  recurrences: {
    list: () => ipcRenderer.invoke('recurrences:list'),
    create: (input: CreateRecurrenceInput) => ipcRenderer.invoke('recurrences:create', input),
    update: (id: string, input: UpdateRecurrenceInput) =>
      ipcRenderer.invoke('recurrences:update', id, input),
    setActive: (id: string, active: boolean) =>
      ipcRenderer.invoke('recurrences:setActive', id, active),
    delete: (id: string) => ipcRenderer.invoke('recurrences:delete', id)
  },
  backup: {
    export: () => ipcRenderer.invoke('backup:export'),
    import: () => ipcRenderer.invoke('backup:import'),
    getDataFolder: () => ipcRenderer.invoke('backup:getDataFolder'),
    openDataFolder: () => ipcRenderer.invoke('backup:openDataFolder')
  }
}

export type PlutoApi = typeof api
