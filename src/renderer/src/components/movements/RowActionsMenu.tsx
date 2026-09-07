import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { Movement } from '@shared/types'

interface RowActionsMenuProps {
  movement: Movement
}

export function RowActionsMenu({ movement }: RowActionsMenuProps) {
  const openEditMovement = useAppStore((state) => state.openEditMovement)
  const openDeleteMovement = useAppStore((state) => state.openDeleteMovement)

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink"
          aria-label="Ações"
        >
          <MoreVertical size={16} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 w-40 rounded-xl border border-line bg-card p-1.5 shadow-2xl"
        >
          <DropdownMenu.Item
            onSelect={() => openEditMovement(movement)}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink outline-none hover:bg-surface"
          >
            <Pencil size={14} strokeWidth={1.75} />
            Editar
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => openDeleteMovement(movement)}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-saida outline-none hover:bg-saida/10"
          >
            <Trash2 size={14} strokeWidth={1.75} />
            Excluir
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
