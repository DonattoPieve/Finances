import { Bell, Settings } from 'lucide-react'
import { PeriodFilter } from '../dashboard/PeriodFilter'
import { UpdateBadge } from './UpdateBadge'
import { useAppStore, type View } from '../../store/useAppStore'

const VIEW_TITLES: Record<View, { title: string; subtitle?: string }> = {
  dashboard: {
    title: 'Olá, bem-vindo de volta!',
    subtitle: 'Aqui está um resumo das suas finanças.'
  },
  movements: { title: 'Movimentações' },
  pending: { title: 'Contas pendentes' },
  recurrences: { title: 'Recorrentes' },
  categories: { title: 'Categorias' },
  trash: { title: 'Lixeira' },
  settings: { title: 'Configurações' },
  about: { title: 'Sobre o Pluto' }
}

export function TopBar() {
  const view = useAppStore((state) => state.view)
  const setView = useAppStore((state) => state.setView)
  const { title, subtitle } = VIEW_TITLES[view]

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-line bg-bg px-8 py-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">{title}</h1>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <UpdateBadge />
        <PeriodFilter />
        <button
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-card text-muted hover:bg-surface hover:text-ink"
          aria-label="Notificações"
        >
          <Bell size={16} strokeWidth={1.75} />
        </button>
        <button
          onClick={() => setView('settings')}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-card text-muted hover:bg-surface hover:text-ink"
          aria-label="Configurações"
        >
          <Settings size={16} strokeWidth={1.75} />
        </button>
      </div>
    </header>
  )
}
