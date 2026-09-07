import { Info } from 'lucide-react'

export function AboutPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-bg">
        <Info size={24} strokeWidth={1.5} />
      </div>
      <h2 className="text-lg font-semibold text-ink">Pluto</h2>
      <p className="max-w-sm text-sm text-muted">
        Aplicativo desktop de finanças pessoais. Núcleo financeiro local, sem login, com dados
        guardados apenas no seu computador.
      </p>
      <span className="mt-1 rounded-full border border-line bg-card px-3 py-1 text-xs text-faint">
        v0.1.0 — Fase 1
      </span>
    </div>
  )
}
