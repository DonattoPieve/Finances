import {
  CATEGORY_KIND_BY_MOVEMENT_TYPE,
  type CreateMovementInput,
  type Movement,
  type MovementType,
  type UpdateMovementInput
} from '../../shared/types'
import type { MovementsRepository } from '../repositories/movementsRepository'
import type { CategoriesRepository } from '../repositories/categoriesRepository'

const TYPE_LABELS: Record<MovementType, string> = {
  receita: 'receita',
  despesa: 'despesa',
  conta: 'conta'
}

export class MovementService {
  constructor(
    private movements: MovementsRepository,
    private categories: CategoriesRepository
  ) {}

  private assertValid(
    input: CreateMovementInput | UpdateMovementInput,
    type: MovementType
  ): void {
    if (input.amount !== undefined && input.amount <= 0) {
      throw new Error('O valor deve ser maior que zero')
    }

    if (input.categoryId) {
      const category = this.categories.get(input.categoryId)
      if (!category) throw new Error('Categoria inválida')
      // Receita não usa categoria de despesa, e vice-versa.
      if (category.kind !== CATEGORY_KIND_BY_MOVEMENT_TYPE[type]) {
        throw new Error(`"${category.name}" não é uma categoria de ${TYPE_LABELS[type]}`)
      }
    }

    if (type === 'conta' && 'dueDate' in input && !input.dueDate) {
      throw new Error('Contas exigem uma data de vencimento')
    }
  }

  create(input: CreateMovementInput): Movement {
    this.assertValid(input, input.type)
    return this.movements.create(input)
  }

  update(id: string, input: UpdateMovementInput): Movement {
    const current = this.movements.get(id)
    if (!current) throw new Error(`Movimentação ${id} não encontrada`)
    this.assertValid(input, current.type)
    return this.movements.update(id, input)
  }

  payBill(id: string, paidAmount?: number): Movement {
    if (paidAmount !== undefined && paidAmount <= 0) {
      throw new Error('O valor pago deve ser maior que zero')
    }
    return this.movements.payBill(id, paidAmount)
  }

  softDelete(id: string): void {
    this.movements.softDelete(id)
  }
}
