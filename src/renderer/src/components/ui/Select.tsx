import type { ReactNode } from 'react'
import * as RadixSelect from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

export interface SelectOption {
  value: string
  label: string
  content?: ReactNode
}

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  label?: string
  className?: string
}

export function Select({ value, onValueChange, options, placeholder, label, className }: SelectProps) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-xs font-medium text-muted">{label}</span>}
      {/*
        O Radix chega a emitir `onValueChange('')` enquanto registra os itens, o que
        apagava a categoria que o formulário tinha acabado de escolher sozinho — o
        campo parecia preenchido e o envio reclamava "Selecione uma categoria".
        Nenhuma lista daqui tem opção vazia, então string vazia nunca é escolha do
        usuário: ignorar é seguro e deixa o estado do React ser o dono do valor.
      */}
      <RadixSelect.Root
        value={value}
        onValueChange={(escolhido) => {
          if (escolhido) onValueChange(escolhido)
        }}
      >
        <RadixSelect.Trigger
          className={clsx(
            'flex items-center justify-between gap-2 rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink outline-none transition-colors hover:bg-surface data-[placeholder]:text-faint focus:border-accent focus:ring-1 focus:ring-accent',
            className
          )}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown size={14} className="text-muted" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={6}
            className="z-50 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-line bg-card p-1.5 shadow-2xl"
          >
            <RadixSelect.Viewport>
              {options.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm text-ink outline-none data-[highlighted]:bg-surface"
                >
                  <span className="flex items-center gap-2">
                    {option.content}
                    <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                  </span>
                  <RadixSelect.ItemIndicator>
                    <Check size={14} className="text-accent" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </label>
  )
}
