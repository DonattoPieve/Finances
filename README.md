# Pluto

App desktop de finanças pessoais. Registra o que entra, o que sai e o que ainda vai
vencer, e responde a pergunta que interessa: quanto sobrou, e para onde foi.

**Os dados são seus e ficam na sua máquina.** Não há servidor, conta, nem sincronização:
tudo mora num arquivo SQLite dentro do seu perfil do Windows. Levar para outro
computador é exportar um `.json` e importar do outro lado.

Feito em Electron, e usado todo dia pela pessoa que o escreveu — o que costuma ser o
melhor controle de qualidade que um projeto pessoal tem.

## O que ele faz

**Início** — saldo, receitas, despesas e contas pendentes do período, cada um com a
variação contra o período anterior e uma linha do acumulado. Rosca de gastos por
categoria, prévia do que está para vencer e as últimas movimentações. O período é
filtrável: hoje, semana, mês, ano ou um intervalo escolhido.

**Movimentações** — a lista completa, com busca por nome ou categoria, filtro por tipo,
categoria, faixa de valor e período, e seis ordenações.

Cada lançamento é de um de três tipos:

- **Receita** — dinheiro que entrou.
- **Despesa** — dinheiro que saiu.
- **Conta** — algo com vencimento, que nasce pendente e só afeta o saldo quando você
  marca como paga. Aceita valor pago diferente do previsto.

Receita e despesa têm **listas de categoria separadas**. Ao lançar um salário, só
aparecem categorias de receita — e o processo principal recusa o cruzamento, não é só a
interface que esconde.

**Pendentes** — as contas em aberto, ordenadas por urgência: vencidas primeiro, depois as
de hoje, depois as futuras.

**Recorrentes** — regras que lançam sozinhas todo mês, como salário no dia 5 ou aluguel no
dia 10. O Pluto gera do mês inicial **até o mês atual, nunca para a frente**: dinheiro que
ainda não entrou não infla o saldo. Dia 31 vira 30 em junho e 28 em fevereiro. Editar a
regra vale para os próximos meses e não reescreve o que já foi lançado; pausar interrompe
sem apagar o histórico.

**Categorias** — as suas, com ícone e cor, separadas entre despesa e receita.

**Lixeira** — nada some na hora. O que você exclui fica 30 dias, e some sozinho depois.

**Configurações** — atualização do app, exportar e importar backup, e o caminho da pasta
de dados.

## Onde ficam os dados

```
%APPDATA%\Pluto\pluto.db
```

Um arquivo SQLite, em WAL. É o mesmo caminho no `npm run dev` e no app instalado, então
você não perde nada ao alternar entre os dois. Atualizar ou desinstalar o Pluto não
encosta nessa pasta.

Para backup manual, feche o app e copie o arquivo. Para trocar de máquina, use
**Configurações → Exportar dados**: sai um `.json` com categorias, movimentações (lixeira
inclusa) e regras recorrentes, que a importação valida campo a campo antes de gravar.

## Rodar

```cmd
npm install
npm run dev
```

## Gerar o executável

```cmd
npm run dist
```

Sai em `dist/`: um instalador NSIS e uma versão portátil. Quem prefere clicar em vez de
digitar tem o `gerar-instalador.bat` na raiz. As três formas de rodar — dev, pasta
desempacotada e instalado — estão no [COMO-RODAR.md](COMO-RODAR.md).

O instalador precisa ser gerado no Windows: em Linux o electron-builder falha no passo
final por depender do wine.

## Atualização automática

Da versão 0.2.0 em diante o app olha o GitHub Releases ao abrir e avisa em Configurações
quando há versão nova. O download não começa sozinho — quem decide é você. Publicar uma
versão está em [COMO-PUBLICAR.md](COMO-PUBLICAR.md).

## Como está montado

```
src/
  main/        processo principal: banco, repositórios, serviços, IPC
  preload/     a ponte tipada entre os dois mundos
  renderer/    React: páginas, componentes, estado
  shared/      os contratos que os dois lados enxergam
scripts/       a bateria de verificação
```

O renderer não fala com o banco. Ele chama `window.pluto.*`, que atravessa o
contextBridge (com `contextIsolation` ligado e `nodeIntegration` desligado) e cai num
handler do processo principal. Quem manda no dado é o main: as regras de negócio —
categoria que combina com o tipo, conta que exige vencimento, valor maior que zero —
moram lá, não no formulário.

O banco é o `node:sqlite`, módulo nativo do Node. Sem dependência compilada, o que torna o
empacotamento trivial.

### Migrações

O schema tem versão, guardada em `PRAGMA user_version`. `src/main/db/schema.ts` cria
apenas a base; toda mudança posterior é um passo numerado em `migrations.ts`, aplicado em
transação, e vale tanto para um banco novo quanto para um que já está em uso há meses.

A regra: **nunca editar uma migração publicada** — sempre acrescentar a próxima. Alguém já
rodou a anterior com dados reais.

## Verificação

```cmd
npm run verificar
```

Roda o typecheck, 78 asserções de lógica contra um SQLite real e 16 checagens estáticas de
fiação. As de lógica cobrem migração de banco novo e de banco com dados antigos, filtros,
saldo com pagamento parcial, lixeira, vencimentos, recorrência ponta a ponta e o backup de
ida e volta — inclusive arquivo corrompido, de outro app e de formato futuro. As estáticas
pegam o que o TypeScript não vê: canal IPC sem par, chamada para algo que o preload não
expõe, tela sem rota, cor em hex solta num componente.

Foi essa bateria que encontrou os dois defeitos mais chatos que o app já teve: as séries do
dashboard perdiam o último dia do período, e "hoje" era calculado em UTC — o que, a partir
das 21h no Brasil, adiantava o app em um dia.

## Feito com

Electron · React · TypeScript · Tailwind · Zustand · Radix UI · Recharts · SQLite
(`node:sqlite`) · electron-vite · electron-builder

A identidade visual vem do [Athena](https://github.com/DonattoPieve/Athena-App): tokens
`--c-*` como fonte única, acento bronze sobre cinza neutro, interface na fonte do sistema e
monoespaçada só onde o olho compara coluna.

## Licença

MIT — ver [LICENSE](LICENSE).
