import { Wallet, TrendingUp, TrendingDown, FileText, ArrowUp, ArrowDown } from 'lucide-react'
import { Card } from '../ui/Card'
import { Sparkline } from './Sparkline'
import { formatCurrency } from '../../lib/format'
import { token } from '../../lib/tokens'
import type { DashboardSummary } from '@shared/types'
import clsx from 'clsx'

interface SummaryCardsProps {
  summary: DashboardSummary
}

/* Nomeadas pelo que significam aqui, não pela cor: dinheiro entrando,
   dinheiro saindo, algo que pede atenção, e o saldo — que é o acento. */
type Tone = 'entrada' | 'saida' | 'alerta' | 'saldo'

/** O Recharts pinta com atributo de SVG, que não resolve `var()`. */
const TONE_VAR: Record<Tone, string> = {
  entrada: '--c-entrada',
  saida: '--c-saida',
  alerta: '--c-alerta',
  saldo: '--c-accent'
}

const TONE_BORDER: Record<Tone, string> = {
  entrada: '!border-entrada/40',
  saida: '!border-saida/40',
  alerta: '!border-alerta/40',
  saldo: '!border-accent/40'
}

const TONE_ICON_BG: Record<Tone, string> = {
  entrada: 'bg-entrada/15 text-entrada',
  saida: 'bg-saida/15 text-saida',
  alerta: 'bg-alerta/15 text-alerta',
  saldo: 'bg-accent/15 text-accent'
}

function TrendLine({ pct }: { pct: number | null }) {
  if (pct === null) return <p className="mt-2 text-xs text-faint">&nbsp;</p>
  const isUp = pct >= 0
  const Icon = isUp ? ArrowUp : ArrowDown
  return (
    <p className={clsx('mt-2 flex items-center gap-1 text-xs', isUp ? 'text-entrada' : 'text-saida')}>
      <Icon size={12} strokeWidth={2.25} />
      <span className="num">
        {isUp ? '+' : ''}
        {pct}%
      </span>
      <span className="text-muted">vs. mês anterior</span>
    </p>
  )
}

interface StatCardProps {
  title: string
  value: string
  valueClassName?: string
  icon: typeof Wallet
  tone: Tone
  trendPct: number | null
  series: number[]
  footnote?: string
}

function StatCard({ title, value, valueClassName, icon: Icon, tone, trendPct, series, footnote }: StatCardProps) {
  return (
    <Card className={clsx('border', TONE_BORDER[tone])}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">{title}</span>
        <span className={clsx('flex h-8 w-8 items-center justify-center rounded-full', TONE_ICON_BG[tone])}>
          <Icon size={16} strokeWidth={2} />
        </span>
      </div>
      <p className={clsx('num text-xl font-semibold', valueClassName ?? 'text-ink')}>{value}</p>
      {footnote ? (
        <p className="mt-2 text-xs text-muted">{footnote}</p>
      ) : (
        <TrendLine pct={trendPct} />
      )}
      <div className="-mx-1 mt-2">
        <Sparkline data={series} color={token(TONE_VAR[tone])} />
      </div>
    </Card>
  )
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard
        title="Saldo atual"
        value={formatCurrency(summary.balance)}
        valueClassName={summary.balance < 0 ? 'text-saida' : 'text-ink'}
        icon={Wallet}
        tone="saldo"
        trendPct={summary.balanceTrendPct}
        series={summary.balanceSeries}
      />
      <StatCard
        title="Receitas"
        value={`+ ${formatCurrency(summary.income)}`}
        valueClassName="text-entrada"
        icon={TrendingUp}
        tone="entrada"
        trendPct={summary.incomeTrendPct}
        series={summary.incomeSeries}
      />
      <StatCard
        title="Despesas"
        value={`- ${formatCurrency(summary.expenses)}`}
        valueClassName="text-saida"
        icon={TrendingDown}
        tone="saida"
        trendPct={summary.expensesTrendPct}
        series={summary.expensesSeries}
      />
      <StatCard
        title="Contas pendentes"
        value={formatCurrency(summary.pendingTotal)}
        icon={FileText}
        tone="alerta"
        trendPct={null}
        footnote={`${summary.pendingCount} ${summary.pendingCount === 1 ? 'conta' : 'contas'}`}
        series={summary.pendingSeries}
      />
    </div>
  )
}
