/** Substitui o módulo `electron` nos testes, para exercitar o backupService sem abrir o app. */
import os from 'node:os'
import path from 'node:path'

export const stubState = {
  backupPath: path.join(os.tmpdir(), 'pluto-backup-teste.json'),
  saveCanceled: false,
  openCanceled: false,
  confirmResponse: 1
}

export const app = {
  getPath: () => os.tmpdir(),
  getVersion: () => '0.0.0-teste'
}

export const dialog = {
  showSaveDialog: async () => ({
    canceled: stubState.saveCanceled,
    filePath: stubState.backupPath
  }),
  showOpenDialog: async () => ({
    canceled: stubState.openCanceled,
    filePaths: [stubState.backupPath]
  }),
  showMessageBox: async () => ({ response: stubState.confirmResponse })
}

export const shell = { openPath: async () => '' }

export const BrowserWindow = {
  getFocusedWindow: () => null,
  getAllWindows: () => [] as unknown[]
}

export default { app, dialog, shell, BrowserWindow }
