import type { LucideIcon } from 'lucide-react'

interface PlaceholderPageProps {
  icon: LucideIcon
  title: string
  description: string
  phase: string
}

export function PlaceholderPage({ icon: Icon, title, description, phase }: PlaceholderPageProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-card text-muted">
        <Icon size={24} strokeWidth={1.5} />
      </div>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="max-w-sm text-sm text-muted">{description}</p>
      <span className="mt-1 rounded-full border border-line bg-card px-3 py-1 text-xs text-faint">
        {phase}
      </span>
    </div>
  )
}
