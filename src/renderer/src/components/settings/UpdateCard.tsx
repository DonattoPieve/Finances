import { useEffect, useState } from 'react'
import { Download, RefreshCw, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react'
import { Card, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import type { UpdateStatus } from '@shared/types'

export function UpdateCard() {
  const [versao, setVersao] = useState('')
  const [status, setStatus] = useState<UpdateStatus>({ estado: 'ocioso' })

  useEffect(() => {
    window.pluto.update.getVersion().then(setVersao)
    window.pluto.update.getStatus().then(setStatus)
    // O main empurra cada mudança: verificando → disponível → baixando → pronta.
    return window.pluto.update.onStatus(setStatus)
  }, [])

  const ocupado = status.estado === 'verificando' || status.estado === 'baixando'

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <CardTitle>Atualizações</CardTitle>
        <p className="mt-2 text-sm text-muted">
          O Pluto olha se saiu versão nova toda vez que abre. Baixar e instalar é decisão sua —
          seus dados nunca são tocados por uma atualização.
        </p>
      </div>

      <p className="text-xs text-faint">
        Versão instalada: <span className="num text-muted">{versao || '—'}</span>
      </p>

      {status.estado === 'indisponivel' && (
        <p className="rounded-xl border border-line bg-bg px-3 py-2.5 text-xs leading-relaxed text-faint">
          {status.motivo}
        </p>
      )}

      {status.estado === 'atualizado' && (
        <p className="flex items-center gap-2 rounded-xl border border-entrada/30 bg-entrada/10 px-3 py-2.5 text-xs text-entrada">
          <CheckCircle2 size={15} strokeWidth={1.75} />
          Você está na versão mais recente.
        </p>
      )}

      {status.estado === 'disponivel' && (
        <div className="flex flex-col gap-3 rounded-xl border border-accent/40 bg-accent-light px-3 py-3">
          <p className="text-sm text-ink">
            Versão <span className="num font-semibold">{status.versao}</span> disponível.
          </p>
          {status.notas && (
            <p className="max-h-32 overflow-y-auto whitespace-pre-line text-xs leading-relaxed text-muted">
              {status.notas.replace(/<[^>]+>/g, '')}
            </p>
          )}
          <div>
            <Button variant="primary" onClick={() => window.pluto.update.download()}>
              <Download size={16} strokeWidth={1.75} />
              Baixar atualização
            </Button>
          </div>
        </div>
      )}

      {status.estado === 'baixando' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Baixando…</span>
            <span className="num">{status.percentual}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${status.percentual}%` }}
            />
          </div>
        </div>
      )}

      {status.estado === 'pronta' && (
        <div className="flex flex-col gap-3 rounded-xl border border-accent/40 bg-accent-light px-3 py-3">
          <p className="text-sm text-ink">
            Versão <span className="num font-semibold">{status.versao}</span> baixada. Ela entra no
            lugar da atual quando você fechar o Pluto — ou agora, se preferir.
          </p>
          <div>
            <Button variant="primary" onClick={() => window.pluto.update.install()}>
              <RotateCcw size={16} strokeWidth={1.75} />
              Reiniciar e instalar
            </Button>
          </div>
        </div>
      )}

      {status.estado === 'erro' && (
        <p className="flex items-start gap-2 rounded-xl border border-saida/30 bg-saida/10 px-3 py-2.5 text-xs leading-relaxed text-saida">
          <AlertCircle size={15} strokeWidth={1.75} className="mt-px shrink-0" />
          <span className="break-all">{status.mensagem}</span>
        </p>
      )}

      <div>
        <Button onClick={() => window.pluto.update.check()} disabled={ocupado}>
          <RefreshCw
            size={16}
            strokeWidth={1.75}
            className={status.estado === 'verificando' ? 'animate-spin' : undefined}
          />
          Buscar atualizações
        </Button>
      </div>
    </Card>
  )
}
