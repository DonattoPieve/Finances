import { Search, X } from 'lucide-react'
import { Select } from '../ui/Select'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import type { Category, MovementFilters, MovementType } from '@shared/types'

export type ValueFilterMode = 'any' | 'max' | 'min' | 'range'

const TYPE_OPTIONS: { value: MovementType | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'receita', label: 'Receita' },
  { value: 'despesa', label: 'Despesa' },
  { value: 'conta', label: 'Conta' }
]

const SORT_OPTIONS: { value: NonNullable<MovementFilters['sort']>; label: string }[] = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'oldest', label: 'Mais antigas' },
  { value: 'amount_desc', label: 'Maior valor' },
  { value: 'amount_asc', label: 'Menor valor' },
  { value: 'name_asc', label: 'Nome (A-Z)' },
  { value: 'name_desc', label: 'Nome (Z-A)' }
]

const VALUE_MODE_OPTIONS: { value: ValueFilterMode; label: string }[] = [
  { value: 'any', label: 'Qualquer valor' },
  { value: 'max', label: 'Até R$' },
  { value: 'min', label: 'Acima de R$' },
  { value: 'range', label: 'Entre R$' }
]

interface MovementsFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  type: MovementType | 'all'
  onTypeChange: (value: MovementType | 'all') => void
  categoryId: string | 'all'
  onCategoryChange: (value: string | 'all') => void
  sort: NonNullable<MovementFilters['sort']>
  onSortChange: (value: NonNullable<MovementFilters['sort']>) => void
  categories: Category[]
  valueMode: ValueFilterMode
  onValueModeChange: (value: ValueFilterMode) => void
  minAmountInput: string
  onMinAmountChange: (value: string) => void
  maxAmountInput: string
  onMaxAmountChange: (value: string) => void
  onClearFilters: () => void
}

export function MovementsFilterBar({
  search,
  onSearchChange,
  type,
  onTypeChange,
  categoryId,
  onCategoryChange,
  sort,
  onSortChange,
  categories,
  valueMode,
  onValueModeChange,
  minAmountInput,
  onMinAmountChange,
  maxAmountInput,
  onMaxAmountChange,
  onClearFilters
}: MovementsFilterBarProps) {
  const categoryOptions = [
    { value: 'all', label: 'Todas as categorias' },
    ...categories.map((category) => ({ value: category.id, label: category.name }))
  ]

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-1 min-w-[220px] flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Buscar</span>
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Nome ou categoria..."
            className="w-full rounded-xl border border-line bg-card py-2 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-faint focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
      </label>

      <Select
        label="Tipo"
        value={type}
        onValueChange={(value) => onTypeChange(value as MovementType | 'all')}
        options={TYPE_OPTIONS}
        className="w-40"
      />

      <Select
        label="Categoria"
        value={categoryId}
        onValueChange={onCategoryChange}
        options={categoryOptions}
        className="w-48"
      />

      <Select
        label="Valor"
        value={valueMode}
        onValueChange={(value) => onValueModeChange(value as ValueFilterMode)}
        options={VALUE_MODE_OPTIONS}
        className="w-36"
      />

      {(valueMode === 'max' || valueMode === 'range') && (
        <Input
          label={valueMode === 'range' ? 'De' : undefined}
          type="number"
          step="0.01"
          min="0"
          value={valueMode === 'range' ? minAmountInput : maxAmountInput}
          onChange={(event) =>
            valueMode === 'range' ? onMinAmountChange(event.target.value) : onMaxAmountChange(event.target.value)
          }
          placeholder="0,00"
          className="w-28"
        />
      )}

      {valueMode === 'min' && (
        <Input
          type="number"
          step="0.01"
          min="0"
          value={minAmountInput}
          onChange={(event) => onMinAmountChange(event.target.value)}
          placeholder="0,00"
          className="w-28"
        />
      )}

      {valueMode === 'range' && (
        <Input
          label="Até"
          type="number"
          step="0.01"
          min="0"
          value={maxAmountInput}
          onChange={(event) => onMaxAmountChange(event.target.value)}
          placeholder="0,00"
          className="w-28"
        />
      )}

      <Select
        label="Ordenar por"
        value={sort}
        onValueChange={(value) => onSortChange(value as NonNullable<MovementFilters['sort']>)}
        options={SORT_OPTIONS}
        className="w-44"
      />

      <Button variant="ghost" onClick={onClearFilters} className="gap-1.5">
        <X size={14} />
        Limpar filtros
      </Button>
    </div>
  )
}
