import { ArrowUp, ArrowDown, FileClock } from 'lucide-react'
import type { MovementType } from '@shared/types'

const TYPE_META: Record<MovementType, { label: string; icon: typeof ArrowUp; className: string }> = {
  receita: { label: 'Receita', icon: ArrowUp, className: 'text-entrada' },
  despesa: { label: 'Despesa', icon: ArrowDown, className: 'text-saida' },
  conta: { label: 'Conta', icon: FileClock, className: 'text-muted' }
}

interface MovementTypeIndicatorProps {
  type: MovementType
}

export function MovementTypeIndicator({ type }: MovementTypeIndicatorProps) {
  const { label, icon: Icon, className } = TYPE_META[type]
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${className}`}>
      <Icon size={14} strokeWidth={2} />
      {label}
    </span>
  )
}
