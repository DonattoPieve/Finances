/**
 * Lança uma versão: confere, sobe o número, cria a tag e empurra.
 *
 *   npm run lancar            -> 0.2.0 vira 0.2.1
 *   npm run lancar minor      -> 0.3.0
 *   npm run lancar major      -> 1.0.0
 *   npm run lancar -- --seco  -> faz tudo menos o push
 *
 * POR QUE ISTO EXISTE. Publicar era editar o `package.json` na mão e rodar o
 * build no próprio PC. Dois problemas:
 *
 *   - a versão mora em DOIS arquivos (`package.json` e o `package-lock.json`,
 *     na raiz e em `packages[""]`). Editar só o primeiro deixa os dois fora de
 *     sincronia, e o Action recusa o build se a tag não bater. O `npm version`
 *     mexe nos dois de uma vez;
 *   - `git push --follow-tags` só leva tag alcançável pelos commits DAQUELE
 *     push. Commit já enviado + tag criada depois = "Everything up-to-date" e a
 *     tag fica parada no PC. Aqui o commit da versão e a tag nascem juntos,
 *     então o push sempre leva os dois.
 *
 * O que ele NÃO faz: decidir por você. Árvore suja, branch errada ou verificação
 * vermelha param o lançamento antes de mexer em qualquer coisa — é mais fácil
 * consertar agora do que despublicar um Release depois.
 *
 * Portado do `lancar.mjs` do Athena-App, com as mesmas travas.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const SECO = args.includes('--seco')
const tipo = args.find((a) => ['patch', 'minor', 'major'].includes(a)) ?? 'patch'

/**
 * Rodar `npm` daqui de dentro, sem `.cmd` e sem shell.
 *
 * No Windows o `npm` é um `npm.cmd`, e um `.cmd` não roda sozinho. As duas
 * saídas óbvias falham: com `shell: true` o Node avisa (DEP0190), porque os
 * argumentos são concatenados em vez de escapados; e `spawnSync("npm.cmd")`
 * sem shell dá EINVAL desde a correção da CVE-2024-27980.
 *
 * A terceira saída é a boa: quando este script roda por `npm run lancar`, a
 * variável `npm_execpath` aponta para o `npm-cli.js` — um .js comum, que o Node
 * executa direto. O `?? null` cobre a chamada por `node scripts/lancar.mjs`,
 * onde essa variável não existe e o shell vira a única opção.
 */
const NPM_CLI = process.env.npm_execpath ?? null

function rodar(cmd, argv, { silencioso = false } = {}) {
  const r = spawnSync(cmd, argv, {
    stdio: silencioso ? 'pipe' : 'inherit',
    encoding: 'utf8'
  })
  if (r.error) throw r.error
  if (r.status !== 0) {
    if (silencioso && r.stderr) process.stderr.write(r.stderr)
    throw new Error(`falhou: ${cmd} ${argv.join(' ')}`)
  }
  return (r.stdout ?? '').trim()
}

function npm(argv) {
  if (NPM_CLI) return rodar(process.execPath, [NPM_CLI, ...argv])
  const r = spawnSync('npm', argv, { stdio: 'inherit', shell: true, encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`falhou: npm ${argv.join(' ')}`)
  return ''
}

function parar(mensagem) {
  console.error(`\n  x ${mensagem}\n`)
  process.exit(1)
}

const versaoAtual = JSON.parse(readFileSync('package.json', 'utf8')).version
console.log(`\nlançar ${tipo} — versão atual ${versaoAtual}\n`)

/* ---------- guardas ---------- */

let branch
try {
  branch = rodar('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { silencioso: true })
} catch {
  // Sem isto, o erro cru do git virava um stack trace que não diz nada.
  parar('esta pasta não é um repositório git. O lançamento sai de um repo com remoto.')
}
if (branch !== 'main') parar(`você está na branch "${branch}". O release sai da main.`)

const sujo = rodar('git', ['status', '--porcelain'], { silencioso: true })
if (sujo) {
  parar(
    'há mudança não commitada. Commite (ou guarde) antes:\n\n' +
      sujo
        .split('\n')
        .map((l) => `      ${l}`)
        .join('\n')
  )
}

// A tag nasce do `npm version`, que falha se ela já existir — mas a mensagem
// dele não diz o que fazer, e a essa altura o package.json já foi alterado.
const [maior, menor, remendo] = versaoAtual.split('.').map(Number)
const proxima =
  tipo === 'major'
    ? `${maior + 1}.0.0`
    : tipo === 'minor'
      ? `${maior}.${menor + 1}.0`
      : `${maior}.${menor}.${remendo + 1}`

const tags = rodar('git', ['tag', '--list', `v${proxima}`], { silencioso: true })
if (tags) parar(`a tag v${proxima} já existe neste PC. Apague-a ou escolha outro tipo.`)

/* ---------- verificação ---------- */

console.log('→ verificação (é aqui que o release para, não no GitHub)\n')
npm(['run', 'verificar'])

/* ---------- versão, tag e push ---------- */

console.log(`\n→ ${versaoAtual} vira ${proxima}\n`)
// `-m` vira a mensagem do commit E da tag anotada.
npm(['version', tipo, '-m', '%s'])

if (SECO) {
  console.log(`\n  ok v${proxima} commitada e tagueada. Falta empurrar:\n`)
  console.log('      git push --follow-tags\n')
  process.exit(0)
}

console.log('\n→ empurrando commit + tag\n')
rodar('git', ['push', '--follow-tags'])

console.log(`\n  ok v${proxima} no ar. O Action builda e publica o instalador.`)
console.log('    Acompanhe em: https://github.com/DonattoPieve/Finances/actions\n')
