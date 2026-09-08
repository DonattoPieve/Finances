import { useEffect, useState, type FormEvent } from 'react'
import { Repeat, Tag } from 'lucide-react'
import clsx from 'clsx'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { CategoryIconBadge } from '../ui/CategoryIconBadge'
import { Button } from '../ui/Button'
import { todayIsoDate } from '../../lib/format'
import { useAppStore } from '../../store/useAppStore'
import {
  CATEGORY_KIND_BY_MOVEMENT_TYPE,
  type AmountKind,
  type Category,
  type MovementType
} from '@shared/types'

export interface MovementFormValues {
  name: string
  amount: number
  categoryId: string
  day: string
  dueDate?: string | null
  /** Só o diálogo de criação usa: transforma o lançamento em uma regra mensal. */
  repeatMonthly: boolean
  amountKind: AmountKind
  endMonth: string | null
}

interface MovementFormInitial {
  name?: string
  amount?: number
  categoryId?: string
  day?: string
  dueDate?: string | null
}

interface MovementFormProps {
  type: MovementType
  initial?: MovementFormInitial
  submitLabel: string
  allowRecurrence?: boolean
  onSubmit: (values: MovementFormValues) => Promise<void>
  onCancel: () => void
}

interface TypeCopy {
  namePlaceholder: string
  amountLabel: string
  dayLabel: string
  emptyCategories: string
  repeatLabel: string
  repeatHint: (day: number) => string
}

const TYPE_COPY: Record<MovementType, TypeCopy> = {
  receita: {
    namePlaceholder: 'Ex.: Salário',
    amountLabel: 'Valor recebido (R$)',
    dayLabel: 'Recebido em',
    emptyCategories: 'Você ainda não tem categorias de receita.',
    repeatLabel: 'Recebo todo mês',
    repeatHint: (day) =>
      `Vamos lançar automaticamente todo dia ${day}, do mês inicial até o mês atual.`
  },
  despesa: {
    namePlaceholder: 'Ex.: Mercado',
    amountLabel: 'Valor gasto (R$)',
    dayLabel: 'Gasto em',
    emptyCategories: 'Você ainda não tem categorias de despesa.',
    repeatLabel: 'Gasto todo mês',
    repeatHint: (day) =>
      `Vamos lançar automaticamente todo dia ${day}, do mês inicial até o mês atual.`
  },
  conta: {
    namePlaceholder: 'Ex.: Conta de luz',
    amountLabel: 'Valor (R$)',
    dayLabel: 'Lançada em',
    emptyCategories: 'Você ainda não tem categorias de despesa.',
    repeatLabel: 'Chega todo mês',
    repeatHint: (day) => `Vamos lançar como pendente todo mês, vencendo dia ${day}.`
  }
}

export function MovementForm({
  type,
  initial,
  submitLabel,
  allowRecurrence = false,
  onSubmit,
  onCancel
}: MovementFormProps) {
  const setView = useAppStore((state) => state.setView)
  const copy = TYPE_COPY[type]
  const categoryKind = CATEGORY_KIND_BY_MOVEMENT_TYPE[type]
  const canRepeat = allowRecurrence

  const [categories, setCategories] = useState<Category[] | null>(null)
  const [name, setName] = useState(initial?.name ?? '')
  const [amount, setAmount] = useState(initial?.amount !== undefined ? String(initial.amount) : '')
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '')
  const [day, setDay] = useState(initial?.day ?? todayIsoDate())
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')
  const [repeatMonthly, setRepeatMonthly] = useState(false)
  const [amountKind, setAmountKind] = useState<AmountKind>('fixo')
  const [endMonth, setEndMonth] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    window.pluto.categories.list(categoryKind).then((result: Category[]) => {
      if (cancelled) return
      setCategories(result)
      setCategoryId((current) => current || result[0]?.id || '')
    })
    return () => {
      cancelled = true
    }
  }, [categoryKind])

  // Em conta, o dia que importa é o do vencimento — é ele que se repete.
  const dayOfMonth =
    type === 'conta' ? Number((dueDate ?? '').slice(8, 10)) || 1 : Number(day.slice(8, 10)) || 1

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    setError(null)

    const parsedAmount = Number(amount)
    if (!name.trim()) {
      setError('Informe um nome')
      return
    }
    if (!parsedAmount || parsedAmount <= 0) {
      setError('O valor deve ser maior que zero')
      return
    }
    if (!categoryId) {
      setError('Selecione uma categoria')
      return
    }
    if (type === 'conta' && !dueDate) {
      setError('Contas exigem uma data de vencimento')
      return
    }
    if (repeatMonthly && endMonth && endMonth < day.slice(0, 7)) {
      setError('O mês final não pode ser antes do mês inicial')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        amount: parsedAmount,
        categoryId,
        day,
        dueDate: type === 'conta' ? dueDate : null,
        repeatMonthly: canRepeat && repeatMonthly,
        amountKind: type === 'conta' && repeatMonthly ? amountKind : 'fixo',
        endMonth: canRepeat && repeatMonthly && endMonth ? endMonth : null
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar')
    } finally {
      setSubmitting(false)
    }
  }

  if (categories !== null && categories.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-card text-muted">
          <Tag size={20} strokeWidth={1.5} />
        </div>
        <p className="text-sm text-muted">{copy.emptyCategories}</p>
        <Button
          variant="primary"
          onClick={() => {
            setView('categories')
            onCancel()
          }}
        >
          Criar categoria
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Nome"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={copy.namePlaceholder}
        autoFocus
      />

      <Input
        label={copy.amountLabel}
        type="number"
        step="0.01"
        min="0.01"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        placeholder="0,00"
      />

      <Select
        label="Categoria"
        value={categoryId}
        onValueChange={setCategoryId}
        placeholder="Selecione"
        options={(categories ?? []).map((category) => ({
          value: category.id,
          label: category.name,
          content: <CategoryIconBadge icon={category.icon} color={category.color} size={22} />
        }))}
      />

      <Input
        label={copy.dayLabel}
        type="date"
        value={day}
        onChange={(event) => setDay(event.target.value)}
      />

      {type === 'conta' && (
        <Input
          label="Vencimento"
          type="date"
          value={dueDate ?? ''}
          onChange={(event) => setDueDate(event.target.value)}
        />
      )}

      {canRepeat && (
        <div
          className={clsx(
            'flex flex-col gap-3 rounded-xl border p-3 transition-colors',
            repeatMonthly ? 'border-accent/40 bg-accent-light' : 'border-line'
          )}
        >
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              checked={repeatMonthly}
              onChange={(event) => setRepeatMonthly(event.target.checked)}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            <Repeat size={15} strokeWidth={1.75} className="text-muted" />
            {copy.repeatLabel}
          </label>

          {repeatMonthly && (
            <>
              <p className="text-xs leading-relaxed text-muted">
                {copy.repeatHint(dayOfMonth)} Meses mais curtos usam o último dia disponível.
              </p>

              {type === 'conta' && (
                <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={amountKind === 'variavel'}
                    onChange={(event) =>
                      setAmountKind(event.target.checked ? 'variavel' : 'fixo')
                    }
                    className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]"
                  />
                  <span>
                    O valor muda todo mês
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                      Água, luz, internet. A conta nasce com uma estimativa a partir do que
                      você já pagou, e o valor de verdade entra quando você marcar como paga.
                    </span>
                  </span>
                </label>
              )}
              <Input
                label="Até (opcional)"
                type="month"
                value={endMonth}
                onChange={(event) => setEndMonth(event.target.value)}
              />
            </>
          )}
        </div>
      )}

      {error && <p className="text-sm text-saida">{error}</p>}

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant={type === 'receita' ? 'success' : 'primary'}
          disabled={submitting || categories === null}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
