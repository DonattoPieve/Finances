import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateStatus } from '../../shared/types'

/**
 * Atualização automática pelo GitHub Releases.
 *
 * O download NÃO começa sozinho (`autoDownload = false`): a decisão de baixar
 * ~115 MB é do usuário, não do app. O que roda sozinho é só a verificação, uma
 * vez por abertura, e em silêncio — se não houver nada novo, ninguém é avisado.
 *
 * Fora do app empacotado o electron-updater não tem `app-update.yml` para ler e
 * quebraria; por isso o estado `indisponivel` no `npm run dev`.
 */
export class UpdateService {
  private status: UpdateStatus = { estado: 'ocioso' }

  constructor() {
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true
    // O log do updater sai no console do processo principal, não numa janela.
    autoUpdater.logger = null

    autoUpdater.on('checking-for-update', () => this.publicar({ estado: 'verificando' }))

    autoUpdater.on('update-available', (info) =>
      this.publicar({
        estado: 'disponivel',
        versao: info.version,
        notas: typeof info.releaseNotes === 'string' ? info.releaseNotes : null
      })
    )

    autoUpdater.on('update-not-available', () =>
      this.publicar({ estado: 'atualizado', versao: app.getVersion() })
    )

    autoUpdater.on('download-progress', (progresso) =>
      this.publicar({ estado: 'baixando', percentual: Math.round(progresso.percent) })
    )

    autoUpdater.on('update-downloaded', (info) =>
      this.publicar({ estado: 'pronta', versao: info.version })
    )

    autoUpdater.on('error', (erro) =>
      this.publicar({
        estado: 'erro',
        mensagem: erro instanceof Error ? erro.message : String(erro)
      })
    )
  }

  private publicar(status: UpdateStatus): void {
    this.status = status
    for (const janela of BrowserWindow.getAllWindows()) {
      janela.webContents.send('update:status', status)
    }
  }

  getStatus(): UpdateStatus {
    if (!app.isPackaged) {
      return {
        estado: 'indisponivel',
        motivo: 'Atualização automática só funciona no app instalado, não no npm run dev.'
      }
    }
    return this.status
  }

  async check(): Promise<UpdateStatus> {
    if (!app.isPackaged) return this.getStatus()
    try {
      await autoUpdater.checkForUpdates()
    } catch (erro) {
      this.publicar({
        estado: 'erro',
        mensagem: erro instanceof Error ? erro.message : String(erro)
      })
    }
    return this.status
  }

  /** Verificação silenciosa da abertura: erro aqui não vira aviso na tela. */
  async checkOnStartup(): Promise<void> {
    if (!app.isPackaged) return
    try {
      await autoUpdater.checkForUpdates()
    } catch {
      this.status = { estado: 'ocioso' }
    }
  }

  async download(): Promise<void> {
    if (!app.isPackaged) return
    await autoUpdater.downloadUpdate()
  }

  /** Fecha o app e instala. Sem isso, a nova versão entra só no próximo fechamento. */
  installNow(): void {
    if (!app.isPackaged) return
    autoUpdater.quitAndInstall()
  }
}
