import { ListChecks } from 'lucide-react'
import { Card } from '../ui/Card'
import { MovementListRow } from './MovementListRow'
import type { Category, Movement } from '@shared/types'

interface MovementsTableProps {
  movements: Movement[]
  categoriesById: Map<string, Category>
  search?: string
}

export function MovementsTable({ movements, categoriesById, search }: MovementsTableProps) {
  if (movements.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <ListChecks size={28} className="text-faint" strokeWidth={1.5} />
        <p className="text-sm text-muted">
          {search ? '🔎 Nenhuma movimentação encontrada.' : 'Nenhuma movimentação encontrada.'}
        </p>
        {search && (
          <p className="text-xs text-faint">Tente pesquisar por outro nome ou categoria.</p>
        )}
      </Card>
    )
  }

  return (
    <Card>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs font-medium uppercase tracking-wide text-muted">
            <th className="pb-3 pr-4 font-medium">Data</th>
            <th className="pb-3 pr-4 font-medium">Descrição</th>
            <th className="pb-3 pr-4 font-medium">Categoria</th>
            <th className="pb-3 pr-4 font-medium">Tipo</th>
            <th className="pb-3 pr-4 text-right font-medium">Valor</th>
            <th className="pb-3" />
          </tr>
        </thead>
        <tbody>
          {movements.map((movement) => (
            <MovementListRow
              key={movement.id}
              movement={movement}
              category={categoriesById.get(movement.categoryId)}
            />
          ))}
        </tbody>
      </table>
    </Card>
  )
}
