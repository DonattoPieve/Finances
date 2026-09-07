import { useEffect, useState } from 'react'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { useAppStore } from '../../store/useAppStore'

export function PayBillDialog() {
  const payingMovement = useAppStore((state) => state.payingMovement)
  const closePayMovement = useAppStore((state) => state.closePayMovement)
  const bumpMovementsVersion = useAppStore((state) => state.bumpMovementsVersion)
  const [paidAmount, setPaidAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (payingMovement) {
      setPaidAmount(String(payingMovement.amount))
      setError(null)
    }
  }, [payingMovement])

  async function handleConfirm(): Promise<void> {
    if (!payingMovement) return
    const parsed = Number(paidAmount)
    if (!parsed || parsed <= 0) {
      setError('O valor pago deve ser maior que zero')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await window.pluto.movements.payBill(payingMovement.id, parsed)
      bumpMovementsVersion()
      closePayMovement()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível marcar como paga')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={payingMovement !== null}
      onOpenChange={(open) => !open && closePayMovement()}
      title="Marcar como paga"
      description={payingMovement ? `Confirmar pagamento de "${payingMovement.name}".` : undefined}
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Valor pago (R$)"
          type="number"
          step="0.01"
          min="0.01"
          value={paidAmount}
          onChange={(event) => setPaidAmount(event.target.value)}
        />
        {error && <p className="text-sm text-saida">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={closePayMovement}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={submitting}>
            Confirmar pagamento
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
