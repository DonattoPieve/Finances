import type { TrashedMovement } from '../../shared/types'
import type { MovementsRepository } from '../repositories/movementsRepository'

export const TRASH_RETENTION_DAYS = 30
const MS_PER_DAY = 24 * 60 * 60 * 1000

export class TrashService {
  constructor(private movements: MovementsRepository) {}

  list(): TrashedMovement[] {
    const now = Date.now()
    return this.movements
      .list({ includeDeleted: true })
      .map((movement) => {
        const deletedAt = new Date(movement.deletedAt as string).getTime()
        const elapsedDays = (now - deletedAt) / MS_PER_DAY
        const daysRemaining = Math.max(0, Math.ceil(TRASH_RETENTION_DAYS - elapsedDays))
        return { ...movement, daysRemaining }
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
  }

  restore(id: string): void {
    this.movements.restore(id)
  }

  permanentlyDelete(id: string): void {
    this.movements.permanentlyDelete(id)
  }

  purgeExpired(): number {
    const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * MS_PER_DAY)
    return this.movements.purgeExpiredTrash(cutoff)
  }
}
