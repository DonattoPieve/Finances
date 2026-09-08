import { useEffect, useState } from 'react'
import { ArrowDownToLine, RotateCcw } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { UpdateStatus } from '@shared/types'

/**
 * Aviso de atualização na barra do topo.
 *
 * Fica invisível na maior parte do tempo, de propósito: só aparece quando há
 * o que fazer. O controle completo — buscar, ver as notas, acompanhar o
 * download — mora em Configurações; aqui é só o atalho para não obrigar
 * ninguém a entrar lá para descobrir que saiu versão nova.
 */
export function UpdateBadge() {
  const setView = useAppStore((state) => state.setView)
  const [status, setStatus] = useState<UpdateStatus>({ estado: 'ocioso' })

  useEffect(() => {
    window.pluto.update.getStatus().then(setStatus)
    return window.pluto.update.onStatus(setStatus)
  }, [])

  if (status.estado === 'disponivel') {
    return (
      <button
        onClick={() => setView('settings')}
        className="flex items-center gap-2 rounded-xl border border-accent/40 bg-accent-light px-3 py-1.5 text-sm text-accent transition-colors hover:border-accent"
        title={`Versão ${status.versao} disponível`}
      >
        <ArrowDownToLine size={15} strokeWidth={1.75} />
        Atualização disponível
      </button>
    )
  }

  if (status.estado === 'baixando') {
    return (
      <button
        onClick={() => setView('settings')}
        className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-1.5 text-sm text-muted"
      >
        <ArrowDownToLine size={15} strokeWidth={1.75} className="animate-pulse" />
        Baixando <span className="num">{status.percentual}%</span>
      </button>
    )
  }

  if (status.estado === 'pronta') {
    return (
      <button
        onClick={() => window.pluto.update.install()}
        className="flex items-center gap-2 rounded-xl border border-accent bg-accent px-3 py-1.5 text-sm font-medium text-bg transition-colors hover:bg-accent-hover"
        title={`Versão ${status.versao} pronta para instalar`}
      >
        <RotateCcw size={15} strokeWidth={1.75} />
        Reiniciar e instalar
      </button>
    )
  }

  return null
}
