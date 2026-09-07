import type { InputHTMLAttributes } from 'react'
import clsx from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  return (
    <label className="flex flex-col gap-1.5" htmlFor={id}>
      {label && <span className="text-xs font-medium text-muted">{label}</span>}
      <input
        id={id}
        className={clsx(
          'rounded-xl border bg-card px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-faint [color-scheme:dark]',
          'focus:border-accent focus:ring-1 focus:ring-accent',
          error ? 'border-saida' : 'border-line',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-saida">{error}</span>}
    </label>
  )
}
