import { Repeat } from 'lucide-react'
import { CategoryIconBadge } from '../ui/CategoryIconBadge'
import { MovementTypeIndicator } from './MovementTypeIndicator'
import { RowActionsMenu } from './RowActionsMenu'
import { Button } from '../ui/Button'
import { formatDateBR, formatDateShortBR, formatSignedCurrency } from '../../lib/format'
import { useAppStore } from '../../store/useAppStore'
import type { Category, Movement } from '@shared/types'

interface MovementListRowProps {
  movement: Movement
  category: Category | undefined
}

export function signedMovementValue(movement: Movement): number {
  if (movement.type === 'receita') return movement.amount
  if (movement.type === 'despesa') return -movement.amount
  return movement.billStatus === 'paid' ? -(movement.paidAmount ?? movement.amount) : 0
}

export function MovementListRow({ movement, category }: MovementListRowProps) {
  const openPayMovement = useAppStore((state) => state.openPayMovement)
  const value = signedMovementValue(movement)
  const isPendingBill = movement.type === 'conta' && movement.billStatus === 'pending'

  return (
    <tr className="border-t border-line first:border-t-0">
      <td className="num py-3 pr-4 text-faint">{formatDateBR(movement.day)}</td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-3">
          {category && <CategoryIconBadge icon={category.icon} color={category.color} />}
          <div>
            <p className="flex items-center gap-1.5 text-ink">
              {movement.name}
              {movement.recurrenceId && (
                <Repeat
                  size={12}
                  strokeWidth={2}
                  className="text-faint"
                  aria-label="Lançamento recorrente"
                />
              )}
            </p>
            {movement.type === 'conta' && movement.dueDate && (
              <p className="text-xs text-faint">
                Vencimento {formatDateShortBR(movement.dueDate)} ·{' '}
                {movement.billStatus === 'paid' ? 'Paga' : 'Pendente'}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="py-3 pr-4 text-muted">
        {category ? (
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color }} />
            {category.name}
          </span>
        ) : (
          '—'
        )}
      </td>
      <td className="py-3 pr-4">
        <MovementTypeIndicator type={movement.type} />
      </td>
      <td
        className={`num py-3 pr-4 text-right font-medium ${
          value > 0 ? 'text-entrada' : value < 0 ? 'text-saida' : 'text-faint'
        }`}
      >
        {value === 0 ? '—' : formatSignedCurrency(value)}
      </td>
      <td className="py-3">
        <div className="flex items-center justify-end gap-2">
          {isPendingBill && (
            <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => openPayMovement(movement)}>
              Pagar
            </Button>
          )}
          <RowActionsMenu movement={movement} />
        </div>
      </td>
    </tr>
  )
}
