import { useState, type FormEvent } from 'react'
import clsx from 'clsx'
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { CATEGORY_ICON_OPTIONS, getCategoryIcon } from '../../lib/categoryIcon'
import { CATEGORY_COLOR_OPTIONS } from '../../lib/categoryColor'
import type { CategoryKind } from '@shared/types'

export interface CategoryFormValues {
  name: string
  icon: string
  color: string
  kind: CategoryKind
}

interface CategoryFormProps {
  initial?: Partial<CategoryFormValues>
  submitLabel: string
  /** Ao editar, o tipo não muda: uma categoria de despesa não vira de receita. */
  lockKind?: boolean
  onSubmit: (values: CategoryFormValues) => Promise<void>
  onCancel: () => void
}

const KIND_OPTIONS: { kind: CategoryKind; label: string; icon: typeof ArrowUpCircle }[] = [
  { kind: 'despesa', label: 'Despesa', icon: ArrowDownCircle },
  { kind: 'receita', label: 'Receita', icon: ArrowUpCircle }
]

export function CategoryForm({
  initial,
  submitLabel,
  lockKind = false,
  onSubmit,
  onCancel
}: CategoryFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? CATEGORY_ICON_OPTIONS[0])
  const [color, setColor] = useState(initial?.color ?? CATEGORY_COLOR_OPTIONS[0])
  const [kind, setKind] = useState<CategoryKind>(initial?.kind ?? 'despesa')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Informe um nome')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({ name: name.trim(), icon, color, kind })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!lockKind && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Usar em</span>
          <div className="grid grid-cols-2 gap-2">
            {KIND_OPTIONS.map((option) => {
              const Icon = option.icon
              const selected = kind === option.kind
              return (
                <button
                  key={option.kind}
                  type="button"
                  onClick={() => setKind(option.kind)}
                  className={clsx(
                    'flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors',
                    selected
                      ? option.kind === 'receita'
                        ? 'border-entrada/50 bg-entrada/10 text-entrada'
                        : 'border-accent/50 bg-accent-light text-accent'
                      : 'border-line text-muted hover:bg-surface'
                  )}
                >
                  <Icon size={16} strokeWidth={1.75} />
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <Input
        label="Nome"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={kind === 'receita' ? 'Ex.: Freelance' : 'Ex.: Pets'}
        autoFocus
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Ícone</span>
        <div className="grid grid-cols-8 gap-2">
          {CATEGORY_ICON_OPTIONS.map((option) => {
            const Icon = getCategoryIcon(option)
            const selected = option === icon
            return (
              <button
                key={option}
                type="button"
                onClick={() => setIcon(option)}
                className={clsx(
                  'flex h-9 w-9 items-center justify-center rounded-xl border transition-colors',
                  selected
                    ? 'border-accent bg-accent-light text-accent'
                    : 'border-line text-muted hover:bg-surface'
                )}
                aria-label={option}
              >
                <Icon size={16} strokeWidth={1.75} />
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Cor</span>
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORY_COLOR_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setColor(option)}
              className={clsx(
                'h-7 w-7 rounded-full border-2 transition-transform',
                color === option ? 'scale-110 border-text-primary' : 'border-transparent'
              )}
              style={{ backgroundColor: option }}
              aria-label={option}
            />
          ))}
          <label className="flex items-center gap-1.5 text-xs text-muted">
            Personalizada
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-7 w-7 cursor-pointer rounded-lg border border-line bg-transparent p-0"
            />
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-saida">{error}</p>}

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
