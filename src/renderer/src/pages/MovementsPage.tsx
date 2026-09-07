import { useEffect, useMemo, useState } from 'react'
import { MovementsFilterBar, type ValueFilterMode } from '../components/movements/MovementsFilterBar'
import { MovementsTable } from '../components/movements/MovementsTable'
import { signedMovementValue } from '../components/movements/MovementListRow'
import { formatSignedCurrency } from '../lib/format'
import { useAppStore } from '../store/useAppStore'
import type { Category, Movement, MovementFilters, MovementType } from '@shared/types'

export function MovementsPage() {
  const period = useAppStore((state) => state.period)
  const customRange = useAppStore((state) => state.customRange)
  const movementsVersion = useAppStore((state) => state.movementsVersion)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [type, setType] = useState<MovementType | 'all'>('all')
  const [categoryId, setCategoryId] = useState<string | 'all'>('all')
  const [sort, setSort] = useState<NonNullable<MovementFilters['sort']>>('recent')
  const [valueMode, setValueMode] = useState<ValueFilterMode>('any')
  const [minAmountInput, setMinAmountInput] = useState('')
  const [maxAmountInput, setMaxAmountInput] = useState('')

  const [movements, setMovements] = useState<Movement[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const isRangeReady = period !== 'custom' || (customRange?.from && customRange?.to)

  const minAmount = valueMode === 'min' || valueMode === 'range' ? Number(minAmountInput) || undefined : undefined
  const maxAmount = valueMode === 'max' || valueMode === 'range' ? Number(maxAmountInput) || undefined : undefined

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timeout)
  }, [search])

  useEffect(() => {
    if (!isRangeReady) return

    let cancelled = false

    async function load(): Promise<void> {
      const filters: MovementFilters = {
        search: debouncedSearch || undefined,
        type,
        categoryId,
        sort,
        minAmount,
        maxAmount,
        period: { period, from: customRange?.from, to: customRange?.to }
      }
      const [movementsResult, categoriesResult] = await Promise.all([
        window.pluto.movements.list(filters),
        window.pluto.categories.list()
      ])
      if (cancelled) return
      setMovements(movementsResult)
      setCategories(categoriesResult)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [
    debouncedSearch,
    type,
    categoryId,
    sort,
    minAmount,
    maxAmount,
    period,
    customRange,
    isRangeReady,
    movementsVersion
  ])

  const categoriesById = new Map(categories.map((category) => [category.id, category]))

  const total = useMemo(
    () => movements.reduce((sum, movement) => sum + signedMovementValue(movement), 0),
    [movements]
  )

  function handleClearFilters(): void {
    setSearch('')
    setType('all')
    setCategoryId('all')
    setSort('recent')
    setValueMode('any')
    setMinAmountInput('')
    setMaxAmountInput('')
  }

  return (
    <div className="flex flex-col gap-4">
      <MovementsFilterBar
        search={search}
        onSearchChange={setSearch}
        type={type}
        onTypeChange={setType}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        sort={sort}
        onSortChange={setSort}
        categories={categories}
        valueMode={valueMode}
        onValueModeChange={setValueMode}
        minAmountInput={minAmountInput}
        onMinAmountChange={setMinAmountInput}
        maxAmountInput={maxAmountInput}
        onMaxAmountChange={setMaxAmountInput}
        onClearFilters={handleClearFilters}
      />

      {loading ? (
        <div className="flex h-40 items-center justify-center text-muted">Carregando…</div>
      ) : (
        <>
          <p className="text-xs text-muted">
            {movements.length} movimentaç{movements.length === 1 ? 'ão encontrada' : 'ões encontradas'}
            {movements.length > 0 && (
              <>
                {' '}
                · Total: <span className="font-medium text-ink">{formatSignedCurrency(total)}</span>
              </>
            )}
          </p>
          <MovementsTable movements={movements} categoriesById={categoriesById} search={debouncedSearch} />
        </>
      )}
    </div>
  )
}
