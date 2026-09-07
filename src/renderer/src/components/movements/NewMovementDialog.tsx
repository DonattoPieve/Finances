import { Dialog } from '../ui/Dialog'
import { MovementForm, type MovementFormValues } from './MovementForm'
import { useAppStore } from '../../store/useAppStore'
import type { MovementType, RecurrenceType } from '@shared/types'

const TYPE_LABELS: Record<MovementType, string> = {
  receita: 'Receita',
  despesa: 'Despesa',
  conta: 'Conta'
}

const SUBMIT_LABELS: Record<MovementType, string> = {
  receita: 'Adicionar receita',
  despesa: 'Registrar despesa',
  conta: 'Criar conta'
}

export function NewMovementDialog() {
  const { isOpen, type } = useAppStore((state) => state.newMovement)
  const closeNewMovement = useAppStore((state) => state.closeNewMovement)
  const bumpMovementsVersion = useAppStore((state) => state.bumpMovementsVersion)

  async function handleSubmit(values: MovementFormValues): Promise<void> {
    if (values.repeatMonthly && type !== 'conta') {
      await window.pluto.recurrences.create({
        type: type as RecurrenceType,
        name: values.name,
        amount: values.amount,
        categoryId: values.categoryId,
        dayOfMonth: Number(values.day.slice(8, 10)),
        startMonth: values.day.slice(0, 7),
        endMonth: values.endMonth
      })
    } else {
      await window.pluto.movements.create({
        type,
        name: values.name,
        amount: values.amount,
        categoryId: values.categoryId,
        day: values.day,
        dueDate: values.dueDate
      })
    }

    bumpMovementsVersion()
    closeNewMovement()
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && closeNewMovement()}
      title={`Nova ${TYPE_LABELS[type]}`}
    >
      <MovementForm
        type={type}
        submitLabel={SUBMIT_LABELS[type]}
        allowRecurrence
        onSubmit={handleSubmit}
        onCancel={closeNewMovement}
      />
    </Dialog>
  )
}
