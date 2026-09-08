import { useEffect, useState } from 'react'
import { ExternalLink, Scale, Database, Repeat } from 'lucide-react'
import { Card, CardTitle } from '../components/ui/Card'

const REPOSITORIO = 'https://github.com/DonattoPieve/Finances'

const BIBLIOTECAS = [
  'Electron',
  'React',
  'TypeScript',
  'Tailwind CSS',
  'Zustand',
  'Radix UI',
  'lucide-react',
  'Recharts',
  'electron-vite',
  'electron-builder',
  'electron-updater',
  'JetBrains Mono'
]

function Linha({
  icon: Icon,
  children
}: {
  icon: typeof ExternalLink
  children: React.ReactNode
}) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-muted">
      <Icon size={15} strokeWidth={1.75} className="mt-1 shrink-0 text-faint" />
      <span>{children}</span>
    </li>
  )
}

export function AboutPage() {
  const [versao, setVersao] = useState('')

  useEffect(() => {
    window.pluto.update.getVersion().then(setVersao)
  }, [])

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-2xl text-bg">
          🪐
        </span>
        <div>
          <h1 className="text-lg font-semibold text-ink">Pluto</h1>
          <p className="text-sm text-muted">
            Versão <span className="num">{versao || '—'}</span>
          </p>
        </div>
      </div>

      <Card className="flex flex-col gap-3">
        <CardTitle>O que é</CardTitle>
        <p className="text-sm leading-relaxed text-muted">
          App de finanças pessoais para registrar o que entra, o que sai e o que ainda vai
          vencer. Feito para uso próprio, e usado todo dia por quem o escreveu.
        </p>
        <ul className="flex flex-col gap-2">
          <Linha icon={Database}>
            Seus dados ficam só nesta máquina, num arquivo SQLite dentro do seu perfil do
            Windows. Não existe servidor nem conta.
          </Linha>
          <Linha icon={Repeat}>
            Atualiza sozinho pelo GitHub Releases — o download só começa quando você manda.
          </Linha>
          <Linha icon={Scale}>Licença MIT.</Linha>
          <Linha icon={ExternalLink}>
            <a
              href={REPOSITORIO}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              {REPOSITORIO.replace('https://', '')}
            </a>
          </Linha>
        </ul>
      </Card>

      <Card className="flex flex-col gap-3">
        <CardTitle>Construído com</CardTitle>
        <div className="flex flex-wrap gap-1.5">
          {BIBLIOTECAS.map((nome) => (
            <span
              key={nome}
              className="rounded-lg border border-line bg-bg px-2 py-1 text-xs text-muted"
            >
              {nome}
            </span>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-faint">
          A identidade visual vem do Athena — tokens de cor, acento bronze e a fonte
          monoespaçada reservada aos números.
        </p>
      </Card>
    </div>
  )
}
