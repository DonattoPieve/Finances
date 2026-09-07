import { useEffect, useState, type FormEvent } from 'react'
import { Repeat, Pause, Play, Trash2, Pencil } from 'lucide-react'
import clsx from 'clsx'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { CategoryIconBadge } from '../components/ui/CategoryIconBadge'
import { formatCurrency, formatMonthBR } from '../lib/format'
import { useAppStore } from '../store/useAppStore'
import type { Category, RecurrenceWithStats } from '@shared/types'

interface EditFormProps {
  recurrence: RecurrenceWithStats
  onSaved: () => Promise<void>
  onCancel: () => void
}

function RecurrenceEditForm({ recurrence, onSaved, onCancel }: EditFormProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState(recurrence.name)
  const [amount, setAmount] = useState(String(recurrence.amount))
  const [categoryId, setCategoryId] = useState(recurrence.categoryId)
  const [dayOfMonth, setDayOfMonth] = useState(String(recurrence.dayOfMonth))
  const [endMonth, setEndMonth] = useState(recurrence.endMonth ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    window.pluto.categories.list(recurrence.type).then(setCategories)
  }, [recurrence.type])

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await window.pluto.recurrences.update(recurrence.id, {
        name: name.trim(),
        amount: Number(amount),
        categoryId,
        dayOfMonth: Number(dayOfMonth),
        endMonth: endMonth || null
      })
      await onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="rounded-xl border border-line bg-bg px-3 py-2.5 text-xs leading-relaxed text-muted">
        As mudanças valem para os próximos meses. O que já foi lançado continua como está — para
        corrigir um mês específico, edite a movimentação dele.
      </p>

      <Input label="Nome" value={name} onChange={(event) => setName(event.target.value)} />

      <Input
        label="Valor (R$)"
        type="number"
        step="0.01"
        min="0.01"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
      />

      <Select
        label="Categoria"
        value={categoryId}
        onValueChange={setCategoryId}
        placeholder="Selecione"
        options={categories.map((category) => ({
          value: category.id,
          label: category.name,
          content: <CategoryIconBadge icon={category.icon} color={category.color} size={22} />
        }))}
      />

      <Input
        label="Dia do mês"
        type="number"
        min="1"
        max="31"
        value={dayOfMonth}
        onChange={(event) => setDayOfMonth(event.target.value)}
      />

      <Input
        label="Até (opcional)"
        type="month"
        value={endMonth}
        onChange={(event) => setEndMonth(event.target.value)}
      />

      {error && <p className="text-sm text-saida">{error}</p>}

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          Salvar
        </Button>
      </div>
    </form>
  )
}

export function RecurrencesPage() {
  const openNewMovement = useAppStore((state) => state.openNewMovement)
  const bumpMovementsVersion = useAppStore((state) => state.bumpMovementsVersion)

  const [recurrences, setRecurrences] = useState<RecurrenceWithStats[]>([])
  const [categoriesById, setCategoriesById] = useState<Map<string, Category>>(new Map())
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<RecurrenceWithStats | null>(null)
  const [deleting, setDeleting] = useState<RecurrenceWithStats | null>(null)

  async function reload(): Promise<void> {
    const [rules, categories] = await Promise.all([
      window.pluto.recurrences.list() as Promise<RecurrenceWithStats[]>,
      window.pluto.categories.list() as Promise<Category[]>
    ])
    setRecurrences(rules)
    setCategoriesById(new Map(categories.map((category) => [category.id, category])))
    setLoading(false)
  }

  useEffect(() => {
    reload()
  }, [])

  async function toggleActive(recurrence: RecurrenceWithStats): Promise<void> {
    await window.pluto.recurrences.setActive(recurrence.id, !recurrence.active)
    bumpMovementsVersion()
    await reload()
  }

  async function handleDelete(): Promise<void> {
    if (!deleting) return
    await window.pluto.recurrences.delete(deleting.id)
    setDeleting(null)
    bumpMovementsVersion()
    await reload()
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted">Carregando…</div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-ink">Recorrentes</h1>
        <p className="mt-1 text-sm text-muted">
          Regras que lançam sozinhas todo mês. O Pluto gera do mês inicial até o mês atual — nunca
          para a frente, então o saldo só conta dinheiro que já entrou ou saiu.
        </p>
      </div>

      {recurrences.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-bg text-muted">
            <Repeat size={22} strokeWidth={1.5} />
          </div>
          <p className="text-sm text-muted">Nenhuma regra recorrente ainda.</p>
          <p className="max-w-md text-xs leading-relaxed text-faint">
            Para criar uma, abra <strong className="text-muted">Nova movimentação</strong>,
            escolha Receita ou Despesa e marque a opção de repetir todo mês.
          </p>
          <Button variant="success" onClick={() => openNewMovement('receita')}>
            Nova receita
          </Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {recurrences.map((recurrence) => {
            const category = categoriesById.get(recurrence.categoryId)
            const isIncome = recurrence.type === 'receita'

            return (
              <Card
                key={recurrence.id}
                className={clsx('flex items-center gap-4', !recurrence.active && 'opacity-60')}
              >
                {category && (
                  <CategoryIconBadge icon={category.icon} color={category.color} size={40} />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-ink">
                      {recurrence.name}
                    </p>
                    {!recurrence.active && (
                      <span className="rounded-full border border-line bg-bg px-2 py-0.5 text-[10px] uppercase tracking-wide text-faint">
                        Pausada
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    Todo dia {recurrence.dayOfMonth} · {category?.name ?? 'Sem categoria'} · desde{' '}
                    {formatMonthBR(recurrence.startMonth)}
                    {recurrence.endMonth ? ` até ${formatMonthBR(recurrence.endMonth)}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-faint">
                    {recurrence.generatedCount} lançamento
                    {recurrence.generatedCount === 1 ? '' : 's'}
                    {recurrence.lastGeneratedMonth
                      ? ` · último em ${formatMonthBR(recurrence.lastGeneratedMonth)}`
                      : ''}
                    {recurrence.nextMonth
                      ? ` · próximo em ${formatMonthBR(recurrence.nextMonth)}`
                      : ' · não gera mais'}
                  </p>
                </div>

                <p
                  className={clsx(
                    'num shrink-0 text-sm font-medium',
                    isIncome ? 'text-entrada' : 'text-saida'
                  )}
                >
                  {isIncome ? '+ ' : '- '}
                  {formatCurrency(recurrence.amount)}
                </p>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => setEditing(recurrence)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink"
                    aria-label="Editar regra"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => toggleActive(recurrence)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink"
                    aria-label={recurrence.active ? 'Pausar regra' : 'Retomar regra'}
                  >
                    {recurrence.active ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button
                    onClick={() => setDeleting(recurrence)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-saida/10 hover:text-saida"
                    aria-label="Excluir regra"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Editar regra"
      >
        {editing && (
          <RecurrenceEditForm
            recurrence={editing}
            onSaved={async () => {
              setEditing(null)
              bumpMovementsVersion()
              await reload()
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Dialog>

      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Excluir regra"
        description={deleting ? `Excluir a regra "${deleting.name}"?` : undefined}
      >
        <p className="mb-4 text-sm text-muted">
          Os {deleting?.generatedCount ?? 0} lançamentos já feitos continuam nas suas movimentações —
          só a regra deixa de existir, e nada novo é gerado. Para parar sem excluir, use pausar.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleting(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Excluir regra
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
