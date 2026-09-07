import type { Category, CategoryBreakdownItem, Movement } from '../../shared/types'

function effectiveAmount(movement: Movement): number {
  if (movement.type === 'conta') return movement.paidAmount ?? movement.amount
  return movement.amount
}

export function buildCategoryBreakdown(
  paidMovements: Movement[],
  categories: Category[]
): CategoryBreakdownItem[] {
  const categoryById = new Map(categories.map((category) => [category.id, category]))
  const totalsByCategory = new Map<string, number>()

  for (const movement of paidMovements) {
    const current = totalsByCategory.get(movement.categoryId) ?? 0
    totalsByCategory.set(movement.categoryId, current + effectiveAmount(movement))
  }

  const grandTotal = [...totalsByCategory.values()].reduce((sum, value) => sum + value, 0)

  const items: CategoryBreakdownItem[] = [...totalsByCategory.entries()].map(
    ([categoryId, total]) => {
      const category = categoryById.get(categoryId)
      return {
        categoryId,
        name: category?.name ?? 'Sem categoria',
        icon: category?.icon ?? 'ellipsis',
        color: category?.color ?? '#6b7280',
        total,
        percentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0
      }
    }
  )

  return items.sort((a, b) => b.total - a.total)
}
