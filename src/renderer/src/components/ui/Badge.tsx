import type { HTMLAttributes } from 'react'
import clsx from 'clsx'

type Tone = 'neutral' | 'success' | 'danger' | 'warning' | 'caution'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-surface text-muted',
  success: 'bg-entrada/10 text-entrada',
  danger: 'bg-saida/10 text-saida',
  warning: 'bg-alerta/10 text-alerta',
  caution: 'bg-muted/10 text-muted'
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        TONE_CLASSES[tone],
        className
      )}
      {...props}
    />
  )
}
