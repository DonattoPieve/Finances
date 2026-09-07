import type { HTMLAttributes } from 'react'
import clsx from 'clsx'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-line bg-card p-5 shadow-[var(--shadow-card)]',
        className
      )}
      {...props}
    />
  )
}

/** Rótulo de seção. Mesmo peso e tamanho do `.label` do Athena. */
export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={clsx('text-[11.5px] font-semibold text-muted', className)}
      {...props}
    />
  )
}
