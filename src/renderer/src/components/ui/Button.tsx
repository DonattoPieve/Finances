import type { ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

/*
 * Mesmo desenho do Athena: o botão comum é o card com borda, e o hover
 * acende a borda e o texto no acento em vez de trocar o fundo. Cheio é
 * exceção — primário e o destrutivo do modal, onde o contorno se perderia
 * ao lado do Cancelar. Em fundo de acento o texto é `text-bg`, não branco:
 * o bronze é claro demais para carregar branco por cima.
 */
const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-accent border border-accent text-bg font-medium hover:bg-accent-hover',
  secondary:
    'bg-card border border-line text-ink hover:border-accent/50 hover:text-accent',
  ghost: 'bg-transparent text-muted hover:bg-surface hover:text-ink',
  danger: 'bg-saida border border-saida text-bg font-medium hover:bg-saida/85',
  success: 'bg-entrada border border-entrada text-bg font-medium hover:bg-entrada/85'
}

export function Button({ variant = 'secondary', className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    />
  )
}
