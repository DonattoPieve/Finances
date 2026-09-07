import { useState } from 'react'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { useAppStore } from '../../store/useAppStore'

export function DeleteMovementDialog() {
  const deletingMovement = useAppStore((state) => state.deletingMovement)
  const closeDeleteMovement = useAppStore((state) => state.closeDeleteMovement)
  const bumpMovementsVersion = useAppStore((state) => state.bumpMovementsVersion)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleConfirm(): Promise<void> {
    if (!deletingMovement) return
    setSubmitting(true)
    setError(null)
    try {
      await window.pluto.movements.softDelete(deletingMovement.id)
      bumpMovementsVersion()
      closeDeleteMovement()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível excluir')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={deletingMovement !== null}
      onOpenChange={(open) => !open && closeDeleteMovement()}
      title="Excluir movimentação"
      description={
        deletingMovement
          ? `Excluir "${deletingMovement.name}"? Vai para a lixeira e pode ser restaurada em até 30 dias.`
          : undefined
      }
    >
      {error && <p className="mb-3 text-sm text-saida">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={closeDeleteMovement}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={handleConfirm} disabled={submitting}>
          Excluir
        </Button>
      </div>
    </Dialog>
  )
}
