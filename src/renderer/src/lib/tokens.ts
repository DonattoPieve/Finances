/**
 * Lê um token do CSS em tempo de execução.
 *
 * Existe por causa do Recharts: atributo de apresentação em SVG (`stroke`,
 * `fill`) não resolve `var(--c-*)`, então o gráfico precisa do valor já
 * calculado. Fora daí, componente usa a classe do Tailwind — nunca hex.
 */
export function token(nome: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(nome).trim()
}

export const CORES_DE_ESTADO = {
  entrada: () => token('--c-entrada'),
  saida: () => token('--c-saida'),
  alerta: () => token('--c-alerta'),
  accent: () => token('--c-accent')
}
