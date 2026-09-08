import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { secao, t, fim } from './_harness'
import { stubState } from './stub-electron'
import { SCHEMA_SQL } from '../src/main/db/schema'
import { runMigrations } from '../src/main/db/migrations'
import { seedDefaultCategories } from '../src/main/db/seed'
import { CategoriesRepository } from '../src/main/repositories/categoriesRepository'
import { MovementsRepository } from '../src/main/repositories/movementsRepository'
import { RecurrencesRepository } from '../src/main/repositories/recurrencesRepository'
import { MovementService } from '../src/main/services/movementService'
import { TrashService } from '../src/main/services/trashService'
import { DashboardService } from '../src/main/services/dashboardService'
import { BackupService } from '../src/main/services/backupService'
import { buildCategoryBreakdown } from '../src/main/services/categoryBreakdownService'
import {
  classifyDueStatus,
  localIsoDate,
  sortByDuePriority,
  withDueStatus
} from '../src/main/services/dueStatusService'
import { resolvePeriodRange, resolvePreviousPeriodRange } from '../src/main/services/period'
import {
  RecurrenceService,
  clampDayToMonth,
  monthsBetween,
  currentMonth
} from '../src/main/services/recurrenceService'
import type { MovementWithDueStatus } from '../src/shared/types'
import {
  formatCurrency,
  formatDateBR,
  formatMonthBR,
  formatSignedCurrency,
  todayIsoDate
} from '../src/renderer/src/lib/format'

function novoBanco() {
  const db = new DatabaseSync(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  db.exec(SCHEMA_SQL)
  runMigrations(db)
  seedDefaultCategories(db)
  const categories = new CategoriesRepository(db)
  const movements = new MovementsRepository(db)
  const recurrences = new RecurrencesRepository(db)
  return {
    db,
    categories,
    movements,
    recurrences,
    movementService: new MovementService(movements, categories),
    trashService: new TrashService(movements),
    dashboard: new DashboardService(movements, categories),
    recurrenceService: new RecurrenceService(recurrences, movements, categories),
    backup: new BackupService(db),
    catDespesa: categories.list('despesa')[0],
    catDespesa2: categories.list('despesa')[1],
    catReceita: categories.list('receita')[0]
  }
}

const mesAtual = currentMonth(new Date())
const ultimoDiaDoMes = clampDayToMonth(mesAtual, 31)
const primeiroDiaDoMes = `${mesAtual}-01`

async function main(): Promise<void> {
  secao('Migração e seed')
  {
    const { categories, db } = novoBanco()
    await t('9 categorias de despesa e 2 de receita', () => {
      assert.equal(categories.list('despesa').length, 9)
      assert.equal(categories.list('receita').length, 2)
    })
    await t('user_version chega em 3', () => {
      const v = db.prepare('PRAGMA user_version').get() as { user_version: number }
      assert.equal(v.user_version, 3)
    })
    await t('rodar migração e seed de novo não duplica', () => {
      runMigrations(db)
      seedDefaultCategories(db)
      assert.equal(categories.list().length, 11)
    })
  }
  {
    const db = new DatabaseSync(':memory:')
    db.exec('PRAGMA foreign_keys = ON')
    db.exec(SCHEMA_SQL)
    db.exec(`INSERT INTO categories (id,name,icon,color,is_default,created_at)
             VALUES ('c1','Alimentação','utensils','#8b5cf6',1,'2026-01-01'),
                    ('c2','Pets','paw-print','#ec4899',0,'2026-01-02')`)
    db.exec(`INSERT INTO movements (id,type,name,amount,category_id,day,created_at,updated_at)
             VALUES ('m1','despesa','Ração',120.5,'c2','2026-08-10','x','x'),
                    ('m2','receita','Salário',5000,'c1','2026-08-05','x','x')`)
    runMigrations(db)
    seedDefaultCategories(db)
    const categories = new CategoriesRepository(db)
    const movements = new MovementsRepository(db)
    await t('banco antigo: categorias viram despesa e os dados ficam', () => {
      assert.equal(categories.get('c2')!.kind, 'despesa')
      assert.equal(categories.list('receita').length, 2)
      assert.equal(categories.list('despesa').length, 2)
      assert.equal(movements.list().length, 2)
      assert.equal(movements.getBalance(), 5000 - 120.5)
    })
  }

  secao('Períodos')
  {
    const ref = new Date(2026, 8, 7)
    await t('hoje', () =>
      assert.deepEqual(resolvePeriodRange({ period: 'today' }, ref), {
        from: '2026-09-07',
        to: '2026-09-07'
      })
    )
    await t('semana começa na segunda', () =>
      assert.deepEqual(resolvePeriodRange({ period: 'week' }, ref), {
        from: '2026-09-07',
        to: '2026-09-13'
      })
    )
    await t('domingo volta para a segunda anterior', () =>
      assert.deepEqual(resolvePeriodRange({ period: 'week' }, new Date(2026, 8, 13)), {
        from: '2026-09-07',
        to: '2026-09-13'
      })
    )
    await t('mês', () =>
      assert.deepEqual(resolvePeriodRange({ period: 'month' }, ref), {
        from: '2026-09-01',
        to: '2026-09-30'
      })
    )
    await t('ano', () =>
      assert.deepEqual(resolvePeriodRange({ period: 'year' }, ref), {
        from: '2026-01-01',
        to: '2026-12-31'
      })
    )
    await t('custom sem datas dá erro', () =>
      assert.throws(() => resolvePeriodRange({ period: 'custom' }, ref))
    )
    await t('mês anterior atravessando o ano', () =>
      assert.deepEqual(resolvePreviousPeriodRange({ period: 'month' }, new Date(2026, 0, 15)), {
        from: '2025-12-01',
        to: '2025-12-31'
      })
    )
    await t('ano anterior', () =>
      assert.deepEqual(resolvePreviousPeriodRange({ period: 'year' }, ref), {
        from: '2025-01-01',
        to: '2025-12-31'
      })
    )
    await t('semana anterior', () =>
      assert.deepEqual(resolvePreviousPeriodRange({ period: 'week' }, ref), {
        from: '2026-08-31',
        to: '2026-09-06'
      })
    )
  }

  secao('Movimentações: filtros e ordenação')
  {
    const { movements, catDespesa, catDespesa2, catReceita } = novoBanco()
    movements.create({ type: 'receita', name: 'Salário', amount: 5000, categoryId: catReceita.id, day: '2026-03-05' })
    movements.create({ type: 'despesa', name: 'Mercado', amount: 300, categoryId: catDespesa.id, day: '2026-03-10' })
    movements.create({ type: 'despesa', name: 'Uber', amount: 25.5, categoryId: catDespesa2.id, day: '2026-03-12' })
    movements.create({ type: 'conta', name: 'Luz', amount: 180, categoryId: catDespesa.id, day: '2026-03-01', dueDate: '2026-03-20' })

    await t('filtro por tipo', () => assert.equal(movements.list({ type: 'despesa' }).length, 2))
    await t('filtro por categoria', () => assert.equal(movements.list({ categoryId: catDespesa.id }).length, 2))
    await t('busca pelo nome da movimentação', () => assert.equal(movements.list({ search: 'Uber' }).length, 1))
    await t('busca pelo nome da categoria', () => assert.equal(movements.list({ search: catDespesa2.name }).length, 1))
    await t('filtro por período', () =>
      assert.equal(movements.list({ period: { period: 'custom', from: '2026-03-10', to: '2026-03-12' } }).length, 2)
    )
    await t('faixa de valor', () => {
      assert.equal(movements.list({ minAmount: 200 }).length, 2)
      assert.equal(movements.list({ maxAmount: 200 }).length, 2)
      assert.equal(movements.list({ minAmount: 100, maxAmount: 400 }).length, 2)
    })
    await t('as seis ordenações', () => {
      assert.equal(movements.list({ sort: 'recent' })[0].name, 'Uber')
      assert.equal(movements.list({ sort: 'oldest' })[0].name, 'Luz')
      assert.equal(movements.list({ sort: 'amount_desc' })[0].name, 'Salário')
      assert.equal(movements.list({ sort: 'amount_asc' })[0].name, 'Uber')
      assert.equal(movements.list({ sort: 'name_asc' })[0].name, 'Luz')
      assert.equal(movements.list({ sort: 'name_desc' })[0].name, 'Uber')
    })
    await t('listRecent respeita o limite', () => assert.equal(movements.listRecent(2).length, 2))
  }

  secao('Contas, saldo e lixeira')
  {
    const ctx = novoBanco()
    const { movements, movementService, trashService, catDespesa, catReceita } = ctx
    movements.create({ type: 'receita', name: 'Salário', amount: 1000, categoryId: catReceita.id, day: '2026-03-05' })
    const conta = movements.create({ type: 'conta', name: 'Luz', amount: 200, categoryId: catDespesa.id, day: '2026-03-01', dueDate: '2026-03-20' })

    await t('conta pendente não mexe no saldo', () => assert.equal(movements.getBalance(), 1000))
    await t('resumo de pendentes', () => {
      const resumo = movements.getPendingSummary()
      assert.equal(resumo.total, 200)
      assert.equal(resumo.count, 1)
    })
    await t('pagar parcial usa o valor pago no saldo', () => {
      movementService.payBill(conta.id, 150)
      assert.equal(movements.getBalance(), 850)
      assert.equal(movements.getPendingSummary().count, 0)
    })
    await t('pagar valor negativo é recusado', () => assert.throws(() => movementService.payBill(conta.id, -5)))
    await t('só conta pode ser paga', () => {
      const r = movements.create({ type: 'receita', name: 'x', amount: 10, categoryId: catReceita.id, day: '2026-03-05' })
      assert.throws(() => movementService.payBill(r.id))
    })

    const despesa = movements.create({ type: 'despesa', name: 'Mercado', amount: 100, categoryId: catDespesa.id, day: '2026-03-08' })
    const saldoComDespesa = movements.getBalance()
    await t('excluir tira da lista e do saldo', () => {
      movementService.softDelete(despesa.id)
      assert.equal(movements.list().find((m) => m.id === despesa.id), undefined)
      assert.equal(movements.getBalance(), saldoComDespesa + 100)
    })
    await t('lixeira lista com prazo de 30 dias', () => {
      const lixo = trashService.list()
      assert.equal(lixo.length, 1)
      assert.equal(lixo[0].daysRemaining, 30)
    })
    await t('restaurar volta para a lista e para o saldo', () => {
      trashService.restore(despesa.id)
      assert.equal(trashService.list().length, 0)
      assert.equal(movements.getBalance(), saldoComDespesa)
    })
    await t('excluir de vez some do banco', () => {
      movementService.softDelete(despesa.id)
      trashService.permanentlyDelete(despesa.id)
      assert.equal(trashService.list().length, 0)
      assert.equal(movements.get(despesa.id), undefined)
    })
    await t('expurgo remove o vencido e preserva o recente', () => {
      const antigo = movements.create({ type: 'despesa', name: 'Antigo', amount: 10, categoryId: catDespesa.id, day: '2026-01-01' })
      const recente = movements.create({ type: 'despesa', name: 'Recente', amount: 10, categoryId: catDespesa.id, day: '2026-01-01' })
      movementService.softDelete(antigo.id)
      movementService.softDelete(recente.id)
      ctx.db.prepare('UPDATE movements SET deleted_at = ? WHERE id = ?')
        .run(new Date(Date.now() - 40 * 86400000).toISOString(), antigo.id)
      assert.equal(trashService.purgeExpired(), 1)
      assert.equal(movements.get(antigo.id), undefined)
      assert.notEqual(movements.get(recente.id), undefined)
    })
  }

  secao('Vencimentos')
  {
    await t('classificação de vencimento', () => {
      assert.equal(classifyDueStatus('2026-09-06', '2026-09-07'), 'overdue')
      assert.equal(classifyDueStatus('2026-09-07', '2026-09-07'), 'due_today')
      assert.equal(classifyDueStatus('2026-09-08', '2026-09-07'), 'upcoming')
    })
    await t('a data de hoje é a local, não a de UTC', () => {
      // 23h30 no Brasil ja e o dia seguinte em UTC: usar UTC adiantaria o vencimento em um dia.
      assert.equal(localIsoDate(new Date(2026, 8, 7, 23, 30)), '2026-09-07')
      assert.equal(localIsoDate(new Date(2026, 8, 7, 0, 10)), '2026-09-07')
    })
    await t('ordena vencidas primeiro, depois por data', () => {
      const base = { id: '', type: 'conta', name: '', amount: 0, categoryId: '', day: '', billStatus: 'pending', paidAmount: null, paidAt: null, deletedAt: null, recurrenceId: null, recurrenceMonth: null, createdAt: '', updatedAt: '' }
      const lista = [
        { ...base, dueDate: '2099-01-01', dueStatus: 'upcoming' },
        { ...base, dueDate: '2000-02-01', dueStatus: 'overdue' },
        { ...base, dueDate: '2000-01-01', dueStatus: 'overdue' }
      ] as unknown as MovementWithDueStatus[]
      assert.deepEqual(sortByDuePriority(lista).map((m) => m.dueDate), ['2000-01-01', '2000-02-01', '2099-01-01'])
    })
    await t('movimentação sem vencimento fica sem status', () => {
      const ctx = novoBanco()
      const m = ctx.movements.create({ type: 'despesa', name: 'x', amount: 1, categoryId: ctx.catDespesa.id, day: '2026-01-01' })
      assert.equal(withDueStatus(m).dueStatus, null)
    })
  }

  secao('Rateio por categoria')
  {
    const { movements, categories, catDespesa, catDespesa2, catReceita } = novoBanco()
    movements.create({ type: 'despesa', name: 'a', amount: 75, categoryId: catDespesa.id, day: '2026-03-01' })
    movements.create({ type: 'despesa', name: 'b', amount: 25, categoryId: catDespesa2.id, day: '2026-03-02' })
    movements.create({ type: 'receita', name: 'c', amount: 999, categoryId: catReceita.id, day: '2026-03-03' })
    const itens = buildCategoryBreakdown(movements.listPaidForPeriod('2026-03-01', '2026-03-31'), categories.list())

    await t('receita não entra no rateio', () =>
      assert.equal(itens.find((i) => i.categoryId === catReceita.id), undefined)
    )
    await t('percentuais somam 100 e vêm ordenados', () => {
      assert.equal(Math.round(itens.reduce((s, i) => s + i.percentage, 0)), 100)
      assert.equal(itens[0].total, 75)
      assert.equal(itens[0].percentage, 75)
    })
    await t('sem gastos, rateio vazio', () =>
      assert.deepEqual(buildCategoryBreakdown([], categories.list()), [])
    )
  }

  secao('Dashboard')
  {
    const { movements, dashboard, catDespesa, catReceita } = novoBanco()
    movements.create({ type: 'receita', name: 'Entrada', amount: 1000, categoryId: catReceita.id, day: primeiroDiaDoMes })
    movements.create({ type: 'despesa', name: 'Saída', amount: 250, categoryId: catDespesa.id, day: primeiroDiaDoMes })
    movements.create({ type: 'receita', name: 'Entrada no último dia', amount: 500, categoryId: catReceita.id, day: ultimoDiaDoMes })
    const resumo = dashboard.getSummary({ period: 'month' })

    await t('totais do mês', () => {
      assert.equal(resumo.income, 1500)
      assert.equal(resumo.expenses, 250)
      assert.equal(resumo.balance, 1250)
    })
    await t('último ponto da série de receitas bate com o total', () =>
      assert.equal(resumo.incomeSeries[resumo.incomeSeries.length - 1], resumo.income)
    )
    await t('último ponto da série de despesas bate com o total', () =>
      assert.equal(resumo.expensesSeries[resumo.expensesSeries.length - 1], resumo.expenses)
    )
    await t('último ponto da série de saldo bate com o saldo', () =>
      assert.equal(resumo.balanceSeries[resumo.balanceSeries.length - 1], resumo.balance)
    )
    await t('séries têm entre 1 e 24 pontos', () => {
      assert.ok(resumo.balanceSeries.length > 0)
      assert.ok(resumo.balanceSeries.length <= 24, `veio ${resumo.balanceSeries.length}`)
    })
    await t('recentes limitadas a 5', () => assert.ok(resumo.recentMovements.length <= 5))
    await t('sem dados, tudo zerado e sem quebrar', () => {
      const vazio = novoBanco().dashboard.getSummary({ period: 'month' })
      assert.equal(vazio.balance, 0)
      assert.equal(vazio.income, 0)
      assert.deepEqual(vazio.categoryBreakdown, [])
    })
    await t('conta pendente conta em pendentes, não em despesas', () => {
      const ctx = novoBanco()
      ctx.movements.create({ type: 'conta', name: 'Luz', amount: 90, categoryId: ctx.catDespesa.id, day: primeiroDiaDoMes, dueDate: ultimoDiaDoMes })
      const r = ctx.dashboard.getSummary({ period: 'month' })
      assert.equal(r.expenses, 0)
      assert.equal(r.pendingTotal, 90)
      assert.equal(r.pendingCount, 1)
    })
  }

  secao('Recorrência')
  {
    const { movements, recurrenceService, catReceita, catDespesa } = novoBanco()
    const agora = new Date(2026, 8, 7)
    const regra = recurrenceService.create({
      type: 'receita', name: 'Salário', amount: 5000,
      categoryId: catReceita.id, dayOfMonth: 31, startMonth: '2026-06'
    })
    recurrenceService.materialize(regra, agora)

    await t('clamp de dia do mês', () => {
      assert.equal(clampDayToMonth('2026-02', 31), '2026-02-28')
      assert.equal(clampDayToMonth('2028-02', 31), '2028-02-29')
      assert.equal(clampDayToMonth('2026-06', 31), '2026-06-30')
    })
    await t('meses entre datas', () => {
      assert.deepEqual(monthsBetween('2026-11', '2027-02'), ['2026-11', '2026-12', '2027-01', '2027-02'])
      assert.deepEqual(monthsBetween('2026-05', '2026-04'), [])
    })
    await t('gerou de junho a setembro com os dias certos', () => {
      const dias = movements.list({ sort: 'oldest' }).filter((m) => m.recurrenceId === regra.id).map((m) => m.day)
      assert.deepEqual(dias, ['2026-06-30', '2026-07-31', '2026-08-31', '2026-09-30'])
    })
    await t('não gera mês futuro', () => {
      const futuros = movements.list().filter((m) => m.day > '2026-09-30')
      assert.deepEqual(futuros, [])
    })
    await t('materializar de novo não duplica', () => assert.equal(recurrenceService.materialize(regra, agora), 0))
    await t('mês apagado de propósito não volta', () => {
      const primeiro = movements.list({ sort: 'oldest' }).find((m) => m.recurrenceId === regra.id)!
      movements.softDelete(primeiro.id)
      assert.equal(recurrenceService.materialize(regra, agora), 0)
    })
    await t('pausada não gera; retomada põe em dia', () => {
      recurrenceService.setActive(regra.id, false)
      assert.equal(recurrenceService.materializeAll(new Date(2026, 11, 15)), 0)
      recurrenceService.setActive(regra.id, true)
      assert.equal(recurrenceService.materializeAll(new Date(2026, 11, 15)), 3)
    })
    await t('mês final limita a geração', () => {
      const c = novoBanco()
      const r = c.recurrenceService.create({
        type: 'receita', name: 'Bolsa', amount: 100,
        categoryId: c.catReceita.id, dayOfMonth: 10, startMonth: '2026-01', endMonth: '2026-03'
      })
      c.recurrenceService.materialize(r, new Date(2026, 11, 31))
      assert.equal(c.movements.list().filter((m) => m.recurrenceId === r.id).length, 3)
    })
    await t('dados inválidos são recusados', () => {
      const c = novoBanco()
      const base = { type: 'receita' as const, name: 'x', amount: 10, categoryId: c.catReceita.id, dayOfMonth: 5, startMonth: '2026-01' }
      assert.throws(() => c.recurrenceService.create({ ...base, amount: 0 }), /maior que zero/)
      assert.throws(() => c.recurrenceService.create({ ...base, dayOfMonth: 40 }), /dia do mês/i)
      assert.throws(() => c.recurrenceService.create({ ...base, startMonth: 'abril' }), /inicial/i)
      assert.throws(() => c.recurrenceService.create({ ...base, endMonth: '2025-01' }), /antes/i)
      assert.throws(() => c.recurrenceService.create({ ...base, categoryId: c.catDespesa.id }), /categoria/i)
    })
    await t('editar a regra vale para os próximos, não para os já lançados', () => {
      const c = novoBanco()
      const r = c.recurrenceService.create({ type: 'despesa', name: 'Aluguel', amount: 1000, categoryId: c.catDespesa.id, dayOfMonth: 5, startMonth: '2026-01' })
      c.recurrenceService.materialize(r, new Date(2026, 1, 15))
      c.recurrenceService.update(r.id, { amount: 1200 })
      const valores = c.movements.list({ sort: 'oldest' }).filter((m) => m.recurrenceId === r.id).map((m) => m.amount)
      assert.deepEqual(valores.slice(0, 2), [1000, 1000])
    })
    await t('excluir a regra mantém os lançamentos sem vínculo', () => {
      const total = movements.list().length
      recurrenceService.delete(regra.id)
      assert.equal(movements.list().length, total)
      assert.equal(movements.list().filter((m) => m.recurrenceId !== null).length, 0)
    })
    void catDespesa
  }

  secao('Contas recorrentes')
  {
    const { movements, recurrences, recurrenceService, movementService, catDespesa, catReceita } =
      novoBanco()
    const agora = new Date(2026, 8, 15) // setembro/2026

    const luz = recurrenceService.create({
      type: 'conta',
      name: 'Luz',
      amount: 180,
      amountKind: 'variavel',
      categoryId: catDespesa.id,
      dayOfMonth: 10,
      dueDay: 10,
      startMonth: '2026-07'
    })
    recurrenceService.materialize(luz, agora)

    await t('gera conta pendente por mês, vencendo no dia da regra', () => {
      const geradas = movements.list({ sort: 'oldest' }).filter((m) => m.recurrenceId === luz.id)
      assert.deepEqual(geradas.map((m) => m.dueDate), ['2026-07-10', '2026-08-10', '2026-09-10'])
      assert.equal(geradas.every((m) => m.type === 'conta' && m.billStatus === 'pending'), true)
    })
    await t('a conta é lançada no primeiro dia do mês, não no dia em que o app abriu', () => {
      const geradas = movements.list({ sort: 'oldest' }).filter((m) => m.recurrenceId === luz.id)
      assert.deepEqual(geradas.map((m) => m.day), ['2026-07-01', '2026-08-01', '2026-09-01'])
    })
    await t('valor variável nasce como estimativa, usando a semente', () => {
      const geradas = movements.list().filter((m) => m.recurrenceId === luz.id)
      assert.equal(geradas.every((m) => m.amountEstimated), true)
      assert.equal(geradas.every((m) => m.amount === 180), true)
    })
    await t('conta pendente estimada entra no total de pendentes', () =>
      assert.equal(movements.getPendingSummary().total, 540)
    )
    await t('pagar ensina a estimativa do próximo mês', () => {
      const geradas = movements.list({ sort: 'oldest' }).filter((m) => m.recurrenceId === luz.id)
      movementService.payBill(geradas[0].id, 200)
      movementService.payBill(geradas[1].id, 260)
      // média de 200 e 260 = 230, e não mais a semente de 180
      assert.equal(recurrenceService.valorDoProximoLancamento(recurrences.get(luz.id)!), 230)
    })
    await t('a estimativa arredonda para centavos', () => {
      const geradas = movements.list({ sort: 'oldest' }).filter((m) => m.recurrenceId === luz.id)
      movementService.payBill(geradas[2].id, 100.01)
      // (200 + 260 + 100.01) / 3 = 186.67
      assert.equal(recurrenceService.valorDoProximoLancamento(recurrences.get(luz.id)!), 186.67)
    })
    await t('o mês seguinte já nasce com a estimativa aprendida', () => {
      recurrenceService.materialize(recurrences.get(luz.id)!, new Date(2026, 9, 15))
      const outubro = movements.list().find((m) => m.recurrenceMonth === '2026-10')!
      assert.equal(outubro.amount, 186.67)
      assert.equal(outubro.amountEstimated, true)
    })
    await t('conta de valor fixo não é marcada como estimativa', () => {
      const c = novoBanco()
      const net = c.recurrenceService.create({
        type: 'conta', name: 'Internet', amount: 99.9, amountKind: 'fixo',
        categoryId: c.catDespesa.id, dayOfMonth: 5, dueDay: 5, startMonth: '2026-09'
      })
      c.recurrenceService.materialize(net, agora)
      const gerada = c.movements.list().find((m) => m.recurrenceId === net.id)!
      assert.equal(gerada.amountEstimated, false)
      assert.equal(gerada.amount, 99.9)
    })
    await t('conta recorrente sem dia de vencimento é recusada', () =>
      assert.throws(
        () => recurrenceService.create({
          type: 'conta', name: 'x', amount: 10, categoryId: catDespesa.id,
          dayOfMonth: 5, startMonth: '2026-09'
        }),
        /vencimento/
      )
    )
    await t('valor variável só existe em conta', () =>
      assert.throws(
        () => recurrenceService.create({
          type: 'despesa', name: 'x', amount: 10, amountKind: 'variavel',
          categoryId: catDespesa.id, dayOfMonth: 5, startMonth: '2026-09'
        }),
        /variável/
      )
    )
    await t('conta recorrente exige categoria de despesa', () =>
      assert.throws(
        () => recurrenceService.create({
          type: 'conta', name: 'x', amount: 10, categoryId: catReceita.id,
          dayOfMonth: 5, dueDay: 5, startMonth: '2026-09'
        }),
        /categoria de conta/
      )
    )
  }

  secao('Categorias')
  {
    const { categories, movements, movementService, catDespesa, catReceita } = novoBanco()
    await t('receita com categoria de despesa é recusada', () =>
      assert.throws(() => movementService.create({ type: 'receita', name: 'x', amount: 10, categoryId: catDespesa.id, day: '2026-01-01' }), /categoria de receita/)
    )
    await t('despesa com categoria de receita é recusada', () =>
      assert.throws(() => movementService.create({ type: 'despesa', name: 'x', amount: 10, categoryId: catReceita.id, day: '2026-01-01' }), /categoria de despesa/)
    )
    await t('conta usa categoria de despesa e nasce pendente', () => {
      const c = movementService.create({ type: 'conta', name: 'Luz', amount: 10, categoryId: catDespesa.id, day: '2026-01-01', dueDate: '2026-01-10' })
      assert.equal(c.billStatus, 'pending')
    })
    await t('conta sem vencimento é recusada', () =>
      assert.throws(() => movementService.create({ type: 'conta', name: 'x', amount: 10, categoryId: catDespesa.id, day: '2026-01-01', dueDate: null }), /vencimento/)
    )
    await t('valor zero é recusado', () =>
      assert.throws(() => movementService.create({ type: 'despesa', name: 'x', amount: 0, categoryId: catDespesa.id, day: '2026-01-01' }), /maior que zero/)
    )
    await t('criar categoria respeita o tipo escolhido', () => {
      const nova = categories.create({ name: 'Freelance', icon: 'briefcase', color: '#22c55e', kind: 'receita' })
      assert.equal(nova.kind, 'receita')
      assert.equal(categories.list('receita').length, 3)
    })
    await t('contagem de uso ignora as excluídas', () => {
      const m = movements.create({ type: 'despesa', name: 'x', amount: 1, categoryId: catDespesa.id, day: '2026-01-01' })
      const antes = categories.countMovements(catDespesa.id)
      movementService.softDelete(m.id)
      assert.equal(categories.countMovements(catDespesa.id), antes - 1)
    })
  }

  secao('Backup: exportar e importar')
  {
    const ctx = novoBanco()
    const { movements, recurrenceService, backup, categories, catDespesa, catReceita } = ctx
    movements.create({ type: 'despesa', name: 'Mercado', amount: 300, categoryId: catDespesa.id, day: '2026-03-10' })
    const conta = movements.create({ type: 'conta', name: 'Luz', amount: 180, categoryId: catDespesa.id, day: '2026-03-01', dueDate: '2026-03-20' })
    movements.payBill(conta.id, 175)
    const naLixeira = movements.create({ type: 'despesa', name: 'Apagada', amount: 9, categoryId: catDespesa.id, day: '2026-03-11' })
    movements.softDelete(naLixeira.id)
    recurrenceService.create({ type: 'receita', name: 'Salário', amount: 5000, categoryId: catReceita.id, dayOfMonth: 5, startMonth: '2026-03' })

    const antes = {
      categorias: categories.list().length,
      movimentacoes: movements.list().length,
      lixeira: movements.list({ includeDeleted: true }).length,
      saldo: movements.getBalance(),
      regras: ctx.recurrences.list().length
    }

    const exportado = await backup.export()
    await t('exportou com as contagens certas', () => {
      assert.equal(exportado.canceled, false)
      assert.equal(exportado.categories, antes.categorias)
      assert.ok(fs.existsSync(stubState.backupPath))
    })
    await t('arquivo tem as três coleções e o tipo da categoria', () => {
      const json = JSON.parse(fs.readFileSync(stubState.backupPath, 'utf-8'))
      assert.equal(json.app, 'pluto')
      assert.equal(json.format, 3)
      assert.equal(json.recurrences.length, 1)
      assert.notEqual(json.categories[0].kind, undefined)
    })

    const destino = novoBanco()
    const importado = await destino.backup.import()
    await t('importar em outro banco reproduz tudo', () => {
      assert.equal(importado.canceled, false)
      assert.equal(destino.categories.list().length, antes.categorias)
      assert.equal(destino.movements.list().length, antes.movimentacoes)
      assert.equal(destino.movements.list({ includeDeleted: true }).length, antes.lixeira)
      assert.equal(destino.movements.getBalance(), antes.saldo)
      assert.equal(destino.recurrences.list().length, antes.regras)
    })
    await t('conta paga preserva o valor pago', () => {
      const luz = destino.movements.list().find((m) => m.name === 'Luz')!
      assert.equal(luz.paidAmount, 175)
      assert.equal(luz.billStatus, 'paid')
    })
    await t('vínculo da recorrência sobrevive ao backup', () =>
      assert.notEqual(destino.movements.list().find((m) => m.recurrenceId !== null), undefined)
    )
    await t('backup preserva conta recorrente variável', async () => {
      const origem = novoBanco()
      origem.recurrenceService.create({
        type: 'conta', name: 'Água', amount: 90, amountKind: 'variavel',
        categoryId: origem.catDespesa.id, dayOfMonth: 20, dueDay: 20, startMonth: '2026-09'
      })
      await origem.backup.export()
      const alvo = novoBanco()
      await alvo.backup.import()
      const regra = alvo.recurrences.list()[0]
      assert.equal(regra.type, 'conta')
      assert.equal(regra.amountKind, 'variavel')
      assert.equal(regra.dueDay, 20)
      assert.equal(alvo.movements.list()[0].amountEstimated, true)
    })
    await t('cancelar a confirmação não altera nada', async () => {
      stubState.confirmResponse = 0
      const outro = novoBanco()
      const r = await outro.backup.import()
      assert.equal(r.canceled, true)
      assert.equal(outro.movements.list().length, 0)
      stubState.confirmResponse = 1
    })
    await t('backup no formato antigo ainda importa', async () => {
      const antigo = {
        app: 'pluto', format: 1, appVersion: '0.1.0', exportedAt: '2026-01-01T00:00:00.000Z',
        categories: [{ id: 'c1', name: 'Velha', icon: 'tag', color: '#ffffff', isDefault: false, createdAt: 'x' }],
        movements: [{ id: 'm1', type: 'despesa', name: 'x', amount: 5, categoryId: 'c1', day: '2026-01-01', dueDate: null, billStatus: null, paidAmount: null, paidAt: null, deletedAt: null, createdAt: 'x', updatedAt: 'x' }]
      }
      fs.writeFileSync(stubState.backupPath, JSON.stringify(antigo))
      const d = novoBanco()
      await d.backup.import()
      assert.equal(d.categories.list().length, 1)
      assert.equal(d.categories.list()[0].kind, 'despesa')
      assert.equal(d.movements.list().length, 1)
    })
    await t('arquivo corrompido é recusado sem destruir os dados', async () => {
      fs.writeFileSync(stubState.backupPath, '{ nao sou json')
      const d = novoBanco()
      d.movements.create({ type: 'despesa', name: 'importante', amount: 1, categoryId: d.catDespesa.id, day: '2026-01-01' })
      await assert.rejects(() => d.backup.import(), /JSON/)
      assert.equal(d.movements.list().length, 1)
    })
    await t('arquivo de outro app é recusado', async () => {
      fs.writeFileSync(stubState.backupPath, JSON.stringify({ app: 'outro', format: 1 }))
      await assert.rejects(() => novoBanco().backup.import(), /backup do Pluto/)
    })
    await t('movimentação apontando para categoria inexistente é recusada', async () => {
      fs.writeFileSync(stubState.backupPath, JSON.stringify({
        app: 'pluto', format: 2, categories: [],
        movements: [{ id: 'm1', type: 'despesa', name: 'x', amount: 5, categoryId: 'sumiu', day: '2026-01-01', createdAt: 'x', updatedAt: 'x' }]
      }))
      await assert.rejects(() => novoBanco().backup.import(), /categoria/)
    })
    await t('formato futuro é recusado', async () => {
      fs.writeFileSync(stubState.backupPath, JSON.stringify({ app: 'pluto', format: 99, categories: [], movements: [] }))
      await assert.rejects(() => novoBanco().backup.import(), /versão mais nova/)
    })
  }

  secao('Formatação do renderer')
  {
    await t('data inicial do formulário é a local, não a de UTC', () => {
      assert.equal(todayIsoDate(new Date(2026, 8, 7, 23, 30)), '2026-09-07')
      assert.equal(todayIsoDate(new Date(2026, 0, 1, 0, 5)), '2026-01-01')
    })
    await t('moeda em real', () => {
      assert.ok(formatCurrency(1500).includes('1.500,00'))
      assert.ok(formatSignedCurrency(-42.5).startsWith('- '))
      assert.ok(formatSignedCurrency(42.5).startsWith('+ '))
    })
    await t('datas no formato brasileiro', () => {
      assert.equal(formatDateBR('2026-09-07'), '07/09/2026')
      assert.equal(formatMonthBR('2026-09'), '09/2026')
    })
  }

  fim()
}

main()
