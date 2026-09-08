import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import type { Category } from '../../shared/types'

export const CATEGORIAS: Category[] = [
  { id: 'r1', name: 'Salário', icon: 'wallet', color: '#22c55e', kind: 'receita', isDefault: true, createdAt: 'x' },
  { id: 'r2', name: 'Freelance', icon: 'briefcase', color: '#14b8a6', kind: 'receita', isDefault: false, createdAt: 'x' },
  { id: 'd1', name: 'Alimentação', icon: 'utensils', color: '#8b5cf6', kind: 'despesa', isDefault: true, createdAt: 'x' },
  { id: 'd2', name: 'Moradia', icon: 'home', color: '#f97316', kind: 'despesa', isDefault: true, createdAt: 'x' }
]

/**
 * Um `window.pluto` de mentira, com o mesmo formato do preload.
 * Cada teste sobrescreve o que precisar.
 */
export function prepararApi(): void {
  const porTipo = (kind?: string) =>
    Promise.resolve(kind ? CATEGORIAS.filter((c) => c.kind === kind) : CATEGORIAS)

  // @ts-expect-error — só os pedaços usados pelos componentes sob teste
  window.pluto = {
    categories: {
      list: vi.fn(porTipo),
      countMovements: vi.fn(() => Promise.resolve(0))
    },
    movements: { create: vi.fn(() => Promise.resolve({})) },
    recurrences: { create: vi.fn(() => Promise.resolve({})) },
    update: {
      getVersion: vi.fn(() => Promise.resolve('9.9.9')),
      getStatus: vi.fn(() => Promise.resolve({ estado: 'ocioso' })),
      onStatus: vi.fn(() => () => {})
    }
  }
}

prepararApi()

afterEach(() => {
  cleanup()
  prepararApi()
})
