const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
})

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

export function formatSignedCurrency(value: number): string {
  const sign = value > 0 ? '+ ' : value < 0 ? '- ' : ''
  return `${sign}${currencyFormatter.format(Math.abs(value))}`
}

/**
 * Data de hoje no fuso do usuário. Com `toISOString()`, a partir das 21h no Brasil o
 * formulário abriria já preenchido com a data de amanhã.
 */
export function todayIsoDate(date: Date = new Date()): string {
  const ano = date.getFullYear()
  const mes = String(date.getMonth() + 1).padStart(2, '0')
  const dia = String(date.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export function formatDateBR(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

export function formatDateShortBR(isoDate: string): string {
  const [, month, day] = isoDate.split('-')
  return `${day}/${month}`
}

/** yyyy-mm -> mm/aaaa */
export function formatMonthBR(month: string): string {
  const [year, monthNumber] = month.split('-')
  return `${monthNumber}/${year}`
}
