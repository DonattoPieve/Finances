/**
 * Checagem estática da fiação entre os três processos.
 * Pega o tipo de erro que o TypeScript não vê: nome de canal IPC digitado errado,
 * chamada do renderer para algo que o preload não expõe, tela sem rota.
 */
import fs from 'node:fs'
import path from 'node:path'

const raiz = path.resolve(import.meta.dirname, '..')
/**
 * Lê normalizando o fim de linha.
 *
 * O runner do GitHub faz checkout com CRLF (é o padrão do git no Windows), e os
 * regexes daqui procuram `\n` literal — um `\n\n` vira `\r\n\r\n` e não casa.
 * Isso quebrou o Action com um TypeError enquanto passava na máquina local, que
 * tem o checkout em LF. Normalizar na leitura resolve para todas as checagens
 * de uma vez; o `.gitattributes` cuida do outro lado do problema.
 */
const ler = (p) => fs.readFileSync(path.join(raiz, p), 'utf-8').replace(/\r\n/g, '\n')

let ok = 0
const falhas = []
function t(nome, fn) {
  try {
    fn()
    ok++
    console.log(`  \x1b[32mok\x1b[0m     ${nome}`)
  } catch (e) {
    falhas.push(`${nome}\n      ${e.message}`)
    console.log(`  \x1b[31mFALHOU\x1b[0m ${nome}\n         ${e.message.split('\n')[0]}`)
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

function arquivosDoRenderer(dir = 'src/renderer/src', acc = []) {
  for (const item of fs.readdirSync(path.join(raiz, dir), { withFileTypes: true })) {
    const rel = `${dir}/${item.name}`
    if (item.isDirectory()) arquivosDoRenderer(rel, acc)
    else if (/\.tsx?$/.test(item.name)) acc.push(rel)
  }
  return acc
}

console.log('\n\x1b[1mFiação IPC\x1b[0m')

const handlers = ler('src/main/ipc/handlers.ts')
const preload = ler('src/preload/api.ts')

const canaisMain = [...handlers.matchAll(/ipcMain\.handle\(\s*'([^']+)'/g)].map((m) => m[1]).sort()
const canaisPreload = [...preload.matchAll(/ipcRenderer\.invoke\(\s*'([^']+)'/g)].map((m) => m[1]).sort()

t(`${canaisMain.length} canais registrados no main`, () => assert(canaisMain.length > 0, 'nenhum canal encontrado'))

t('todo canal do preload existe no main', () => {
  const orfaos = canaisPreload.filter((c) => !canaisMain.includes(c))
  assert(orfaos.length === 0, `o preload chama canais que ninguém atende: ${orfaos.join(', ')}`)
})

t('todo canal do main é usado pelo preload', () => {
  const mortos = canaisMain.filter((c) => !canaisPreload.includes(c))
  assert(mortos.length === 0, `canais registrados e nunca chamados: ${mortos.join(', ')}`)
})

t('todo evento escutado no preload é enviado pelo main', () => {
  const escutados = [...preload.matchAll(/ipcRenderer\.on\(\s*'([^']+)'/g)].map((m) => m[1])
  const enviados = [...ler('src/main/services/updateService.ts').matchAll(/webContents\.send\(\s*'([^']+)'/g)].map((m) => m[1])
  const orfaos = escutados.filter((c) => !enviados.includes(c))
  assert(orfaos.length === 0, `o preload escuta eventos que ninguém emite: ${orfaos.join(', ')}`)
})

console.log('\n\x1b[1mChamadas do renderer\x1b[0m')

const chamadas = new Map()
for (const arquivo of arquivosDoRenderer()) {
  const conteudo = ler(arquivo)
  for (const m of conteudo.matchAll(/window\.pluto\.(\w+)\.(\w+)\s*\(/g)) {
    const chave = `${m[1]}.${m[2]}`
    if (!chamadas.has(chave)) chamadas.set(chave, arquivo)
  }
}

t(`${chamadas.size} chamadas distintas a window.pluto`, () => assert(chamadas.size > 0, 'nenhuma chamada encontrada'))

t('toda chamada do renderer existe no preload', () => {
  const quebradas = []
  for (const [chave, arquivo] of chamadas) {
    const [ns, fn] = chave.split('.')
    const bloco = preload.match(new RegExp(`\\n  ${ns}:\\s*\\{([\\s\\S]*?)\\n  \\}`))
    if (!bloco) {
      quebradas.push(`${chave} (namespace "${ns}" não existe no preload) em ${arquivo}`)
      continue
    }
    if (!new RegExp(`\\b${fn}\\s*:`).test(bloco[1])) {
      quebradas.push(`${chave} não existe em ${arquivo}`)
    }
  }
  assert(quebradas.length === 0, quebradas.join('; '))
})

console.log('\n\x1b[1mTelas\x1b[0m')

const store = ler('src/renderer/src/store/useAppStore.ts')
const trecho = store.match(/export type View =([\s\S]*?)\n\s*\n/)
if (!trecho) {
  falhas.push('não achei o union `export type View` em useAppStore.ts')
  console.log('  \x1b[31mFALHOU\x1b[0m não achei o union `export type View` em useAppStore.ts')
}
const views = trecho ? [...trecho[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : []

t(`${views.length} telas declaradas em View`, () => assert(views.length >= 7, `só achei ${views.length}`))

t('toda tela tem rota no AppShell', () => {
  const shell = ler('src/renderer/src/components/layout/AppShell.tsx')
  const sem = views.filter((v) => !shell.includes(`view === '${v}'`))
  assert(sem.length === 0, `telas sem rota, ficariam em branco: ${sem.join(', ')}`)
})

t('toda tela tem título na TopBar', () => {
  const topbar = ler('src/renderer/src/components/layout/TopBar.tsx')
  const sem = views.filter((v) => !new RegExp(`\\b${v}:\\s*\\{`).test(topbar))
  assert(sem.length === 0, `telas sem título: ${sem.join(', ')}`)
})

t('toda tela é alcançável pela barra lateral', () => {
  const sidebar = ler('src/renderer/src/components/layout/Sidebar.tsx')
  const sem = views.filter((v) => !sidebar.includes(`view: '${v}'`))
  assert(sem.length === 0, `telas sem link, inalcançáveis pelo usuário: ${sem.join(', ')}`)
})

console.log('\n\x1b[1mÍcones e cores\x1b[0m')

const iconLib = ler('src/renderer/src/lib/categoryIcon.ts')
const iconesDisponiveis = [...iconLib.matchAll(/^\s{2}'?([\w-]+)'?:\s*\w+,?$/gm)].map((m) => m[1])

t('ícones semeados existem no mapa do renderer', () => {
  const usados = [
    ...ler('src/main/db/seed.ts').matchAll(/icon:\s*'([^']+)'/g),
    ...ler('src/main/db/migrations.ts').matchAll(/icon:\s*'([^']+)'/g)
  ].map((m) => m[1])
  const faltando = [...new Set(usados)].filter((i) => !iconesDisponiveis.includes(i))
  assert(faltando.length === 0, `apareceriam como ícone genérico: ${faltando.join(', ')}`)
})

t('variantes de Button usadas existem no componente', () => {
  const btn = ler('src/renderer/src/components/ui/Button.tsx')
  const declaradas = [...btn.matchAll(/'(primary|secondary|ghost|danger|success)'/g)].map((m) => m[1])
  const usadas = new Set()
  for (const arquivo of arquivosDoRenderer()) {
    for (const m of ler(arquivo).matchAll(/variant=(?:"|{')([a-z]+)(?:"|'})/g)) usadas.add(m[1])
  }
  const faltando = [...usadas].filter((v) => !declaradas.includes(v))
  assert(faltando.length === 0, `variantes inexistentes: ${faltando.join(', ')}`)
})

console.log('\n\x1b[1mTema\x1b[0m')

const css = ler('src/renderer/src/index.css')
const tokensDeclarados = [...css.matchAll(/--color-([\w-]+):/g)].map((m) => m[1])
const fontesDoRenderer = arquivosDoRenderer().map((a) => ({ nome: a, texto: ler(a) }))

t(`${tokensDeclarados.length} cores declaradas no @theme`, () =>
  assert(tokensDeclarados.length >= 8, `só achei ${tokensDeclarados.length}`)
)

t('nenhuma classe do tema antigo sobrou', () => {
  const antigas = ['text-text-primary', 'text-text-secondary', 'text-text-muted', 'border-border', 'bg-surface-hover', 'text-caution', 'bg-caution', 'text-success', 'text-danger', 'text-warning', 'text-white']
  const achadas = []
  for (const { nome, texto } of fontesDoRenderer) {
    for (const classe of antigas) {
      if (texto.includes(classe)) achadas.push(`${classe} em ${nome}`)
    }
  }
  assert(achadas.length === 0, achadas.join('; '))
})

t('toda cor declarada é usada em algum componente', () => {
  const mortas = tokensDeclarados.filter(
    (nome) => !fontesDoRenderer.some(({ texto }) => new RegExp(`-${nome}\\b`).test(texto))
  )
  assert(mortas.length === 0, `cores declaradas e nunca usadas: ${mortas.join(', ')}`)
})

t('componente não tem cor em hex — só token', () => {
  // categoryColor.ts é a paleta que o usuário escolhe para as categorias dele,
  // e a cor do rótulo do donut fica sobre essa paleta: os dois são exceção.
  const excecoes = ['lib/categoryColor.ts']
  const achadas = []
  for (const { nome, texto } of fontesDoRenderer) {
    if (excecoes.some((e) => nome.endsWith(e))) continue
    for (const m of texto.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) achadas.push(`${m[0]} em ${nome}`)
  }
  assert(achadas.length === 0, achadas.join('; '))
})

console.log(
  `\n${ok} passaram, ${falhas.length} falharam` +
    (falhas.length ? '\n\n' + falhas.map((f) => '  - ' + f).join('\n') : '')
)
if (falhas.length) process.exitCode = 1
