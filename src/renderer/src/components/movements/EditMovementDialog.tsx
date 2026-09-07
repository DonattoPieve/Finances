import { Dialog } from '../ui/Dialog'
import { MovementForm, type MovementFormValues } from './MovementForm'
import { useAppStore } from '../../store/useAppStore'

export function EditMovementDialog() {
  const editingMovement = useAppStore((state) => state.editingMovement)
  const closeEditMovement = useAppStore((state) => state.closeEditMovement)
  const bumpMovementsVersion = useAppStore((state) => state.bumpMovementsVersion)

  async function handleSubmit(values: MovementFormValues): Promise<void> {
    if (!editingMovement) return
    await window.pluto.movements.update(editingMovement.id, values)
    bumpMovementsVersion()
    closeEditMovement()
  }

  return (
    <Dialog
      open={editingMovement !== null}
      onOpenChange={(open) => !open && closeEditMovement()}
      title="Editar movimentação"
    >
      {editingMovement && (
        <MovementForm
          type={editingMovement.type}
          initial={{
            name: editingMovement.name,
            amount: editingMovement.amount,
            categoryId: editingMovement.categoryId,
            day: editingMovement.day,
            dueDate: editingMovement.dueDate
          }}
          submitLabel="Salvar alterações"
          allowRecurrence={false}
          onSubmit={handleSubmit}
          onCancel={closeEditMovement}
        />
      )}
    </Dialog>
  )
}
