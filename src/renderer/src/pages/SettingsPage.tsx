import { useEffect, useState } from 'react'
import { Download, Upload, FolderOpen, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Card, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { UpdateCard } from '../components/settings/UpdateCard'
import { useAppStore } from '../store/useAppStore'
import type { ExportResult, ImportResult } from '@shared/types'

type Feedback = { kind: 'success' | 'error'; message: string } | null

function readableError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  // O Electron prefixa erros de IPC; mantém apenas a mensagem original.
  const match = raw.match(/Error:\s*(.*)$/)
  return (match ? match[1] : raw).trim() || 'Não foi possível concluir a operação'
}

export function SettingsPage() {
  const bumpMovementsVersion = useAppStore((state) => state.bumpMovementsVersion)
  const [dataFolder, setDataFolder] = useState<string>('')
  const [busy, setBusy] = useState<'export' | 'import' | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)

  useEffect(() => {
    window.pluto.backup.getDataFolder().then(setDataFolder)
  }, [])

  async function handleExport(): Promise<void> {
    setBusy('export')
    setFeedback(null)
    try {
      const result: ExportResult = await window.pluto.backup.export()
      if (!result.canceled) {
        setFeedback({
          kind: 'success',
          message: `${result.movements} movimentação(ões) e ${result.categories} categoria(s) salvas em ${result.filePath}`
        })
      }
    } catch (error) {
      setFeedback({ kind: 'error', message: readableError(error) })
    } finally {
      setBusy(null)
    }
  }

  async function handleImport(): Promise<void> {
    setBusy('import')
    setFeedback(null)
    try {
      const result: ImportResult = await window.pluto.backup.import()
      if (!result.canceled) {
        bumpMovementsVersion()
        setFeedback({
          kind: 'success',
          message: `Backup restaurado: ${result.movements} movimentação(ões) e ${result.categories} categoria(s)`
        })
      }
    } catch (error) {
      setFeedback({ kind: 'error', message: readableError(error) })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold text-ink">Configurações</h1>
        <p className="mt-1 text-sm text-muted">
          Seus dados ficam apenas neste computador. Use o backup para guardá-los ou levá-los para
          outra máquina.
        </p>
      </div>

      <UpdateCard />

      <Card className="flex flex-col gap-4">
        <div>
          <CardTitle>Backup e dados</CardTitle>
          <p className="mt-2 text-sm text-muted">
            A exportação gera um arquivo <code className="text-ink">.json</code> com todas
            as categorias e movimentações, incluindo a lixeira. A importação substitui tudo o que
            existe aqui pelo conteúdo do arquivo.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Button variant="primary" onClick={handleExport} disabled={busy !== null}>
            {busy === 'export' ? (
              <Loader2 size={16} strokeWidth={1.75} className="animate-spin" />
            ) : (
              <Download size={16} strokeWidth={1.75} />
            )}
            Exportar dados
          </Button>
          <Button onClick={handleImport} disabled={busy !== null}>
            {busy === 'import' ? (
              <Loader2 size={16} strokeWidth={1.75} className="animate-spin" />
            ) : (
              <Upload size={16} strokeWidth={1.75} />
            )}
            Importar backup
          </Button>
        </div>

        {feedback && (
          <div
            className={
              feedback.kind === 'success'
                ? 'flex items-start gap-2 rounded-xl border border-entrada/30 bg-entrada/10 px-3 py-2.5 text-xs leading-relaxed text-entrada'
                : 'flex items-start gap-2 rounded-xl border border-saida/30 bg-saida/10 px-3 py-2.5 text-xs leading-relaxed text-saida'
            }
          >
            {feedback.kind === 'success' ? (
              <CheckCircle2 size={15} strokeWidth={1.75} className="mt-px shrink-0" />
            ) : (
              <AlertCircle size={15} strokeWidth={1.75} className="mt-px shrink-0" />
            )}
            <span className="break-all">{feedback.message}</span>
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <div>
          <CardTitle>Pasta dos dados</CardTitle>
          <p className="mt-2 text-sm text-muted">
            O banco <code className="text-ink">pluto.db</code> fica aqui. Copiar esse
            arquivo com o Pluto fechado também funciona como backup manual.
          </p>
        </div>
        <p className="break-all rounded-xl border border-line bg-bg px-3 py-2.5 text-xs text-faint">
          {dataFolder || 'Carregando…'}
        </p>
        <div>
          <Button onClick={() => window.pluto.backup.openDataFolder()}>
            <FolderOpen size={16} strokeWidth={1.75} />
            Abrir pasta
          </Button>
        </div>
      </Card>
    </div>
  )
}
