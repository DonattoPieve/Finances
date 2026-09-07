import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { PieChart as PieChartIcon, ArrowRight } from 'lucide-react'
import { Card, CardTitle } from '../ui/Card'
import { formatCurrency } from '../../lib/format'
import { useAppStore } from '../../store/useAppStore'
import type { CategoryBreakdownItem } from '@shared/types'

interface CategoryDonutChartProps {
  data: CategoryBreakdownItem[]
}

interface PercentLabelProps {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percentage: number
}

function renderPercentLabel({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: PercentLabelProps) {
  const radius = innerRadius + (outerRadius - innerRadius) / 2
  const radians = (-midAngle * Math.PI) / 180
  const x = cx + radius * Math.cos(radians)
  const y = cy + radius * Math.sin(radians)

  if (percentage < 5) return null

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      className="fill-white text-[11px] font-semibold"
      style={{ fontFamily: 'JetBrains Mono, monospace' }}
    >
      {percentage.toFixed(0)}%
    </text>
  )
}

export function CategoryDonutChart({ data }: CategoryDonutChartProps) {
  const setView = useAppStore((state) => state.setView)
  const total = data.reduce((sum, item) => sum + item.total, 0)

  return (
    <Card>
      <CardTitle className="mb-4">Gastos por categoria</CardTitle>

      {data.length === 0 ? (
        <div className="flex h-56 flex-col items-center justify-center gap-2 text-center">
          <PieChartIcon size={28} className="text-faint" strokeWidth={1.5} />
          <p className="text-sm text-muted">
            Nenhum gasto efetivado neste período ainda.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-6">
            <div className="relative h-48 w-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="total"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="none"
                    label={(props) =>
                      renderPercentLabel({
                        cx: props.cx ?? 0,
                        cy: props.cy ?? 0,
                        midAngle: props.midAngle ?? 0,
                        innerRadius: props.innerRadius ?? 0,
                        outerRadius: props.outerRadius ?? 0,
                        percentage: props.percent ? props.percent * 100 : 0
                      })
                    }
                    labelLine={false}
                  >
                    {data.map((item) => (
                      <Cell key={item.categoryId} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value) || 0)}
                    contentStyle={{
                      background: 'var(--c-card)',
                      border: '1px solid var(--c-border)',
                      color: 'var(--c-text)',
                      borderRadius: 12,
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 12
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-muted">Total</span>
                <span className="num text-sm font-semibold text-ink">{formatCurrency(total)}</span>
              </div>
            </div>

            <ul className="min-w-0 flex-1 space-y-2.5">
              {data.map((item) => (
                <li key={item.categoryId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2 text-ink">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="num flex shrink-0 items-center gap-3">
                    <span className="text-muted">{formatCurrency(item.total)}</span>
                    <span className="w-9 text-right text-faint">{item.percentage.toFixed(0)}%</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => setView('categories')}
            className="mt-4 inline-flex items-center gap-1.5 self-start rounded-xl border border-line px-3 py-2 text-xs text-muted hover:bg-surface hover:text-ink"
          >
            Ver todas as categorias
            <ArrowRight size={13} strokeWidth={2} />
          </button>
        </>
      )}
    </Card>
  )
}
