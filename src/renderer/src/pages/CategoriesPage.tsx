import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { CategoryIconBadge } from '../components/ui/CategoryIconBadge'
import { CategoryForm, type CategoryFormValues } from '../components/categories/CategoryForm'
import type { Category, CategoryKind } from '@shared/types'

type FormState = { mode: 'create'; kind: CategoryKind } | { mode: 'edit'; category: Category } | null

const SECTIONS: { kind: CategoryKind; title: string; hint: string; icon: typeof ArrowUpCircle }[] = [
  {
    kind: 'despesa',
    title: 'Despesas',
    hint: 'Usadas em despesas e contas.',
    icon: ArrowDownCircle
  },
  {
    kind: 'receita',
    title: 'Receitas',
    hint: 'Usadas no dinheiro que entra.',
    icon: ArrowUpCircle
  }
]

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [usageById, setUsageById] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const [formState, setFormState] = useState<FormState>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function reload(): Promise<void> {
    const result: Category[] = await window.pluto.categories.list()
    setCategories(result)
    const counts = await Promise.all(
      result.map((category) => window.pluto.categories.countMovements(category.id))
    )
    setUsageById(Object.fromEntries(result.map((category, i) => [category.id, counts[i]])))
    setLoading(false)
  }

  useEffect(() => {
    reload()
  }, [])

  async function handleCreate(values: CategoryFormValues): Promise<void> {
    await window.pluto.categories.create(values)
    setFormState(null)
    await reload()
  }

  async function handleUpdate(values: CategoryFormValues): Promise<void> {
    if (formState?.mode !== 'edit') return
    await window.pluto.categories.update(formState.category.id, {
      name: values.name,
      icon: values.icon,
      color: values.color
    })
    setFormState(null)
    await reload()
  }

  async function handleDelete(): Promise<void> {
    if (!deletingCategory) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await window.pluto.categories.delete(deletingCategory.id)
      setDeletingCategory(null)
      await reload()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Não foi possível excluir')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted">Carregando…</div>
    )
  }

  const editingCategory = formState?.mode === 'edit' ? formState.category : null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">Categorias</h1>
        <p className="mt-1 text-sm text-muted">
          Receita e despesa têm listas separadas — ao lançar uma receita, só aparecem as categorias
          de receita.
        </p>
      </div>

      {SECTIONS.map((section) => {
        const sectionCategories = categories.filter((category) => category.kind === section.kind)
        const Icon = section.icon

        return (
          <section key={section.kind} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon
                  size={16}
                  strokeWidth={1.75}
                  className={section.kind === 'receita' ? 'text-entrada' : 'text-muted'}
                />
                <h2 className="text-sm font-medium text-ink">{section.title}</h2>
                <span className="text-xs text-faint">{section.hint}</span>
              </div>
              <Button
                variant={section.kind === 'receita' ? 'success' : 'primary'}
                className="px-3 py-1.5 text-xs"
                onClick={() => setFormState({ mode: 'create', kind: section.kind })}
              >
                <Plus size={14} /> Nova
              </Button>
            </div>

            {sectionCategories.length === 0 ? (
              <Card className="py-8 text-center text-sm text-muted">
                Nenhuma categoria de {section.kind} ainda.
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sectionCategories.map((category) => {
                  const usage = usageById[category.id] ?? 0
                  return (
                    <Card key={category.id} className="flex items-center gap-3">
                      <CategoryIconBadge icon={category.icon} color={category.color} size={38} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">
                          {category.name}
                        </p>
                        <p className="text-xs text-faint">
                          {usage} movimentaç{usage === 1 ? 'ão' : 'ões'}
                          {category.isDefault ? ' · Padrão' : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => setFormState({ mode: 'edit', category })}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink"
                          aria-label="Editar categoria"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingCategory(category)
                            setDeleteError(null)
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-saida/10 hover:text-saida"
                          aria-label="Excluir categoria"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}

      <Dialog
        open={formState !== null}
        onOpenChange={(open) => !open && setFormState(null)}
        title={
          editingCategory
            ? 'Editar categoria'
            : formState?.mode === 'create' && formState.kind === 'receita'
              ? 'Nova categoria de receita'
              : 'Nova categoria de despesa'
        }
      >
        <CategoryForm
          initial={
            editingCategory ??
            (formState?.mode === 'create' ? { kind: formState.kind } : undefined)
          }
          submitLabel={editingCategory ? 'Salvar' : 'Criar'}
          lockKind={editingCategory !== null}
          onSubmit={editingCategory ? handleUpdate : handleCreate}
          onCancel={() => setFormState(null)}
        />
      </Dialog>

      <Dialog
        open={deletingCategory !== null}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
        title="Excluir categoria"
        description={deletingCategory ? `Excluir "${deletingCategory.name}"?` : undefined}
      >
        {deleteError && <p className="mb-3 text-sm text-saida">{deleteError}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeletingCategory(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            Excluir
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
