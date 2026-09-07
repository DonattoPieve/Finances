import { useEffect, useState } from 'react'
import { Trash2, RotateCcw, X } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { CategoryIconBadge } from '../components/ui/CategoryIconBadge'
import { formatCurrency, formatDateBR } from '../lib/format'
import { useAppStore } from '../store/useAppStore'
import type { Category, TrashedMovement } from '@shared/types'

function displayAmount(movement: TrashedMovement): number {
  if (movement.type === 'conta' && movement.billStatus === 'paid') {
    return movement.paidAmount ?? movement.amount
  }
  return movement.amount
}

export function TrashPage() {
  const bumpMovementsVersion = useAppStore((state) => state.bumpMovementsVersion)

  const [items, setItems] = useState<TrashedMovement[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingItem, setDeletingItem] = useState<TrashedMovement | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function reload(): Promise<void> {
    const [trash, categoriesResult] = await Promise.all([
      window.pluto.trash.list(),
      window.pluto.categories.list()
    ])
    setItems(trash)
    setCategories(categoriesResult)
    setLoading(false)
  }

  useEffect(() => {
    reload()
  }, [])

  const categoriesById = new Map(categories.map((category) => [category.id, category]))

  async function handleRestore(id: string): Promise<void> {
    await window.pluto.trash.restore(id)
    bumpMovementsVersion()
    await reload()
  }

  async function handlePermanentDelete(): Promise<void> {
    if (!deletingItem) return
    setDeleting(true)
    try {
      await window.pluto.trash.permanentlyDelete(deletingItem.id)
      setDeletingItem(null)
      await reload()
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="flex h-40 items-center justify-center text-muted">Carregando…</div>
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-ink">Lixeira</h1>

      {items.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <Trash2 size={28} className="text-faint" strokeWidth={1.5} />
          <p className="text-sm text-muted">A lixeira está vazia.</p>
        </Card>
      ) : (
        <Card className="divide-y divide-border p-0">
          {items.map((item) => {
            const category = categoriesById.get(item.categoryId)
            return (
              <div key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                {category && <CategoryIconBadge icon={category.icon} color={category.color} />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{item.name}</p>
                  <p className="truncate text-xs text-faint">
                    {category?.name ?? '—'} · Excluída em {formatDateBR((item.deletedAt as string).slice(0, 10))}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-faint">
                  {item.daysRemaining === 0
                    ? 'Expira hoje'
                    : `Expira em ${item.daysRemaining} ${item.daysRemaining === 1 ? 'dia' : 'dias'}`}
                </span>
                <span className="shrink-0 text-sm font-medium text-ink">
                  {formatCurrency(displayAmount(item))}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => handleRestore(item.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink"
                    aria-label="Restaurar"
                    title="Restaurar"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <button
                    onClick={() => setDeletingItem(item)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-saida/10 hover:text-saida"
                    aria-label="Excluir definitivamente"
                    title="Excluir definitivamente"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </Card>
      )}

      <Dialog
        open={deletingItem !== null}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="Excluir definitivamente?"
        description="Essa ação não pode ser desfeita."
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeletingItem(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handlePermanentDelete} disabled={deleting}>
            Excluir definitivamente
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
