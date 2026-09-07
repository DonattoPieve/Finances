import { create } from 'zustand'
import type { Movement, MovementType, Period } from '@shared/types'

export type View =
  | 'dashboard'
  | 'movements'
  | 'pending'
  | 'recurrences'
  | 'categories'
  | 'trash'
  | 'settings'
  | 'about'

interface NewMovementState {
  isOpen: boolean
  type: MovementType
}

interface AppState {
  view: View
  setView: (view: View) => void

  period: Period
  setPeriod: (period: Period) => void

  customRange: { from: string; to: string } | null
  setCustomRange: (range: { from: string; to: string }) => void

  newMovement: NewMovementState
  openNewMovement: (type: MovementType) => void
  closeNewMovement: () => void

  editingMovement: Movement | null
  openEditMovement: (movement: Movement) => void
  closeEditMovement: () => void

  deletingMovement: Movement | null
  openDeleteMovement: (movement: Movement) => void
  closeDeleteMovement: () => void

  payingMovement: Movement | null
  openPayMovement: (movement: Movement) => void
  closePayMovement: () => void

  movementsVersion: number
  bumpMovementsVersion: () => void
}

export const useAppStore = create<AppState>((set) => ({
  view: 'dashboard',
  setView: (view) => set({ view }),

  period: 'month',
  setPeriod: (period) => set({ period }),

  customRange: null,
  setCustomRange: (range) => set({ customRange: range }),

  newMovement: { isOpen: false, type: 'despesa' },
  openNewMovement: (type) => set({ newMovement: { isOpen: true, type } }),
  closeNewMovement: () => set((state) => ({ newMovement: { ...state.newMovement, isOpen: false } })),

  editingMovement: null,
  openEditMovement: (movement) => set({ editingMovement: movement }),
  closeEditMovement: () => set({ editingMovement: null }),

  deletingMovement: null,
  openDeleteMovement: (movement) => set({ deletingMovement: movement }),
  closeDeleteMovement: () => set({ deletingMovement: null }),

  payingMovement: null,
  openPayMovement: (movement) => set({ payingMovement: movement }),
  closePayMovement: () => set({ payingMovement: null }),

  movementsVersion: 0,
  bumpMovementsVersion: () => set((state) => ({ movementsVersion: state.movementsVersion + 1 }))
}))
