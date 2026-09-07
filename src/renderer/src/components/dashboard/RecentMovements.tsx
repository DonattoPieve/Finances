import { ListChecks } from 'lucide-react'
import { Card, CardTitle } from '../ui/Card'
import { MovementListRow } from '../movements/MovementListRow'
import { useAppStore } from '../../store/useAppStore'
import type { Category, Movement } from '@shared/types'

interface RecentMovementsProps {
  movements: Movement[]
  categoriesById: Map<string, Category>
}

export function RecentMovements({ movements, categoriesById }: RecentMovementsProps) {
  const setView = useAppStore((state) => state.setView)

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <CardTitle>Últimas movimentações</CardTitle>
        <button
          onClick={() => setView('movements')}
          className="text-xs font-medium text-accent hover:text-accent-hover"
        >
          Ver todas
        </button>
      </div>

      {movements.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <ListChecks size={28} className="text-faint" strokeWidth={1.5} />
          <p className="text-sm text-muted">Nenhuma movimentação registrada ainda.</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted">
              <th className="pb-3 pr-4 font-medium">Data</th>
              <th className="pb-3 pr-4 font-medium">Descrição</th>
              <th className="pb-3 pr-4 font-medium">Categoria</th>
              <th className="pb-3 pr-4 font-medium">Tipo</th>
              <th className="pb-3 pr-4 font-medium text-right">Valor</th>
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
      )}
    </Card>
  )
}
