export type MovementType = 'receita' | 'despesa' | 'conta'

export type BillStatus = 'pending' | 'paid'

export type DueStatus = 'overdue' | 'due_today' | 'upcoming'

/** Categorias de receita e de despesa são listas separadas: uma não aparece na outra. */
export type CategoryKind = 'receita' | 'despesa'

/** O tipo de categoria que cada tipo de movimentação usa. */
export const CATEGORY_KIND_BY_MOVEMENT_TYPE: Record<MovementType, CategoryKind> = {
  receita: 'receita',
  despesa: 'despesa',
  conta: 'despesa'
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  kind: CategoryKind
  isDefault: boolean
  createdAt: string
}

export interface Movement {
  id: string
  type: MovementType
  name: string
  amount: number
  categoryId: string
  day: string // yyyy-mm-dd, data de cadastro
  dueDate: string | null // apenas type='conta'
  billStatus: BillStatus | null // apenas type='conta'
  paidAmount: number | null
  paidAt: string | null
  deletedAt: string | null
  /** Preenchido quando a movimentação foi gerada por uma regra recorrente. */
  recurrenceId: string | null
  /** Mês (yyyy-mm) que a regra recorrente gerou; junto com recurrenceId é único. */
  recurrenceMonth: string | null
  createdAt: string
  updatedAt: string
}

export interface MovementWithDueStatus extends Movement {
  dueStatus: DueStatus | null
}

export type Period = 'today' | 'week' | 'month' | 'year' | 'custom'

export interface PeriodRange {
  period: Period
  from?: string // yyyy-mm-dd, obrigatório quando period='custom'
  to?: string // yyyy-mm-dd, obrigatório quando period='custom'
}

export interface CategoryBreakdownItem {
  categoryId: string
  name: string
  icon: string
  color: string
  total: number
  percentage: number
}

export interface DashboardSummary {
  balance: number
  balanceTrendPct: number | null
  balanceSeries: number[]
  income: number
  incomeTrendPct: number | null
  incomeSeries: number[]
  expenses: number
  expensesTrendPct: number | null
  expensesSeries: number[]
  pendingTotal: number
  pendingCount: number
  pendingSeries: number[]
  overdueCount: number
  dueTodayCount: number
  upcomingCount: number
  categoryBreakdown: CategoryBreakdownItem[]
  pendingPreview: MovementWithDueStatus[]
  recentMovements: Movement[]
}

export interface CreateMovementInput {
  type: MovementType
  name: string
  amount: number
  categoryId: string
  day: string
  dueDate?: string | null
  recurrenceId?: string | null
  recurrenceMonth?: string | null
}

export type UpdateMovementInput = Partial<CreateMovementInput>

export interface PayBillInput {
  paidAmount?: number
}

export interface MovementFilters {
  search?: string
  type?: MovementType | 'all'
  categoryId?: string | 'all'
  period?: PeriodRange
  minAmount?: number
  maxAmount?: number
  sort?: 'recent' | 'oldest' | 'amount_desc' | 'amount_asc' | 'name_asc' | 'name_desc'
  includeDeleted?: boolean
}

export interface CreateCategoryInput {
  name: string
  icon: string
  color: string
  kind: CategoryKind
}

/** O tipo (receita/despesa) de uma categoria não muda depois de criada. */
export type UpdateCategoryInput = Partial<Omit<CreateCategoryInput, 'kind'>>

export interface TrashedMovement extends Movement {
  daysRemaining: number
}

export interface BackupFile {
  app: 'pluto'
  format: number
  appVersion: string
  exportedAt: string
  categories: Category[]
  movements: Movement[]
  recurrences: Recurrence[]
}

export interface ExportResult {
  canceled: boolean
  filePath?: string
  categories: number
  movements: number
}

export interface ImportResult {
  canceled: boolean
  categories: number
  movements: number
}

/** Contas ainda não têm recorrência — o vencimento por mês precisa de desenho próprio. */
export type RecurrenceType = 'receita' | 'despesa'

export interface Recurrence {
  id: string
  type: RecurrenceType
  name: string
  amount: number
  categoryId: string
  /** 1 a 31. Meses mais curtos usam o último dia disponível. */
  dayOfMonth: number
  startMonth: string // yyyy-mm
  endMonth: string | null // yyyy-mm; null = sem data para terminar
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface RecurrenceWithStats extends Recurrence {
  generatedCount: number
  lastGeneratedMonth: string | null
  /** Próximo mês que ainda será gerado, ou null se a regra está pausada/encerrada. */
  nextMonth: string | null
}

export interface CreateRecurrenceInput {
  type: RecurrenceType
  name: string
  amount: number
  categoryId: string
  dayOfMonth: number
  startMonth: string
  endMonth?: string | null
}

export type UpdateRecurrenceInput = Partial<Omit<CreateRecurrenceInput, 'type'>> & {
  active?: boolean
}

/** Estados da atualização automática, empurrados do main para a tela. */
export type UpdateStatus =
  | { estado: 'ocioso' }
  | { estado: 'indisponivel'; motivo: string }
  | { estado: 'verificando' }
  | { estado: 'atualizado'; versao: string }
  | { estado: 'disponivel'; versao: string; notas: string | null }
  | { estado: 'baixando'; percentual: number }
  | { estado: 'pronta'; versao: string }
  | { estado: 'erro'; mensagem: string }
