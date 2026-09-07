export const resultado = { ok: 0, falhas: [] as string[] }

export function secao(titulo: string): void {
  console.log(`\n\x1b[1m${titulo}\x1b[0m`)
}

export function t(nome: string, fn: () => void | Promise<void>): Promise<void> {
  const registrar = (erro?: unknown): void => {
    if (erro) {
      const msg = erro instanceof Error ? erro.message : String(erro)
      resultado.falhas.push(`${nome}\n      ${msg}`)
      console.log(`  \x1b[31mFALHOU\x1b[0m ${nome}\n         ${msg.split('\n')[0]}`)
    } else {
      resultado.ok++
      console.log(`  \x1b[32mok\x1b[0m     ${nome}`)
    }
  }

  try {
    const r = fn()
    if (r instanceof Promise) return r.then(() => registrar()).catch(registrar)
    registrar()
  } catch (erro) {
    registrar(erro)
  }
  return Promise.resolve()
}

export function fim(): void {
  console.log(
    `\n${resultado.ok} passaram, ${resultado.falhas.length} falharam` +
      (resultado.falhas.length ? '\n\n' + resultado.falhas.map((f) => '  - ' + f).join('\n') : '')
  )
  if (resultado.falhas.length) process.exitCode = 1
}
