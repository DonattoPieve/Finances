import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  Home,
  Plus,
  ListChecks,
  CalendarClock,
  Repeat,
  Tag,
  Trash2,
  Settings,
  Info,
  ChevronDown,
  ArrowDownCircle,
  ArrowUpCircle,
  FileClock
} from 'lucide-react'
import clsx from 'clsx'
import { useAppStore, type View } from '../../store/useAppStore'
import type { MovementType } from '@shared/types'

const NAV_ITEMS: { view: View; label: string; icon: typeof Home }[] = [
  { view: 'dashboard', label: 'Início', icon: Home },
  { view: 'movements', label: 'Movimentações', icon: ListChecks },
  { view: 'pending', label: 'Pendentes', icon: CalendarClock },
  { view: 'recurrences', label: 'Recorrentes', icon: Repeat },
  { view: 'categories', label: 'Categorias', icon: Tag },
  { view: 'trash', label: 'Lixeira', icon: Trash2 }
]

const FOOTER_ITEMS: { view: View; label: string; icon: typeof Home }[] = [
  { view: 'settings', label: 'Configurações', icon: Settings },
  { view: 'about', label: 'Sobre o Pluto', icon: Info }
]

const NEW_MOVEMENT_OPTIONS: { type: MovementType; label: string; icon: typeof Home }[] = [
  { type: 'receita', label: 'Receita', icon: ArrowUpCircle },
  { type: 'despesa', label: 'Despesa', icon: ArrowDownCircle },
  { type: 'conta', label: 'Conta', icon: FileClock }
]

function NavButton({ view, label, icon: Icon }: { view: View; label: string; icon: typeof Home }) {
  const currentView = useAppStore((state) => state.view)
  const setView = useAppStore((state) => state.setView)
  const isActive = currentView === view

  return (
    <button
      onClick={() => setView(view)}
      className={clsx(
        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
        isActive
          ? 'bg-surface text-ink'
          : 'text-muted hover:bg-surface hover:text-ink'
      )}
    >
      <Icon size={17} strokeWidth={1.75} />
      {label}
    </button>
  )
}

export function Sidebar() {
  const openNewMovement = useAppStore((state) => state.openNewMovement)

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-line bg-bg px-3 py-4">
      <div className="mb-6 flex items-center gap-2 px-1.5">
        <span className="flex h-8 w-8 items-center justify-center text-2xl leading-none">🪐</span>
        <span className="text-base font-bold tracking-wide text-ink">PLUTO</span>
      </div>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="mb-5 flex w-full items-center justify-between gap-2 rounded-xl bg-accent px-3 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-accent-hover">
            <span className="flex items-center gap-2">
              <Plus size={17} strokeWidth={2} />
              Nova movimentação
            </span>
            <ChevronDown size={14} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={6}
            className="z-50 w-52 rounded-xl border border-line bg-card p-1.5 shadow-2xl"
          >
            {NEW_MOVEMENT_OPTIONS.map(({ type, label, icon: Icon }) => (
              <DropdownMenu.Item
                key={type}
                onSelect={() => openNewMovement(type)}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink outline-none hover:bg-surface"
              >
                <Icon size={16} strokeWidth={1.75} />
                {label}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavButton key={item.view} {...item} />
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t border-line pt-3">
        {FOOTER_ITEMS.map((item) => (
          <NavButton key={item.view} {...item} />
        ))}
      </div>

      <p className="mt-6 px-1.5 text-xs leading-relaxed text-faint">
        Melhores decisões hoje, mais liberdade amanhã. 🚀
      </p>
    </aside>
  )
}
