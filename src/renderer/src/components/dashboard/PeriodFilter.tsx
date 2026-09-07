import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, Calendar } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { Period } from '@shared/types'

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoje',
  week: 'Esta semana',
  month: 'Este mês',
  year: 'Este ano',
  custom: 'Personalizado'
}

export function PeriodFilter() {
  const period = useAppStore((state) => state.period)
  const setPeriod = useAppStore((state) => state.setPeriod)
  const customRange = useAppStore((state) => state.customRange)
  const setCustomRange = useAppStore((state) => state.setCustomRange)

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-1.5 text-sm text-ink hover:bg-surface">
            <Calendar size={14} strokeWidth={1.75} className="text-muted" />
            {PERIOD_LABELS[period]}
            <ChevronDown size={14} className="text-muted" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            className="z-50 w-44 rounded-xl border border-line bg-card p-1.5 shadow-2xl"
          >
            {(Object.keys(PERIOD_LABELS) as Period[]).map((value) => (
              <DropdownMenu.Item
                key={value}
                onSelect={() => setPeriod(value)}
                className="cursor-pointer rounded-lg px-2.5 py-2 text-sm text-ink outline-none hover:bg-surface"
              >
                {PERIOD_LABELS[value]}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {period === 'custom' && (
        <div className="flex items-center gap-1.5 rounded-xl border border-line bg-card px-2 py-1">
          <input
            type="date"
            value={customRange?.from ?? ''}
            onChange={(event) =>
              setCustomRange({ from: event.target.value, to: customRange?.to ?? event.target.value })
            }
            className="bg-transparent text-xs text-ink outline-none [color-scheme:dark]"
          />
          <span className="text-faint">–</span>
          <input
            type="date"
            value={customRange?.to ?? ''}
            onChange={(event) =>
              setCustomRange({ from: customRange?.from ?? event.target.value, to: event.target.value })
            }
            className="bg-transparent text-xs text-ink outline-none [color-scheme:dark]"
          />
        </div>
      )}
    </div>
  )
}
