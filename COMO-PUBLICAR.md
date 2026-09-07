# Publicar uma versão do Pluto

O app checa o GitHub Releases toda vez que abre. Para uma versão nova chegar até ele,
você faz três coisas: sobe o número, roda `npm run release`, e publica o rascunho.

## Uma vez só, antes da primeira publicação

**1. Criar o repositório.** Em <https://github.com/new>: nome `finances`, **público**, sem
README nem .gitignore (o projeto já tem os dois). O nome e o dono precisam bater com o
que está no `electron-builder.yml`:

```yaml
publish:
  provider: github
  owner: DonattoPieve
  repo: finances
```

**2. Mandar o código.** Na pasta do projeto:

```
git remote add origin https://github.com/DonattoPieve/finances.git
git push -u origin main
```

**3. Criar o token que sobe os arquivos.** GitHub → Settings → Developer settings →
Personal access tokens → **Fine-grained tokens** → Generate new token. Dê acesso só ao
repositório `finances`, e em Permissions marque **Contents: Read and write**. Copie o token
(ele só aparece uma vez).

**4. Guardar o token na máquina**, para o electron-builder achar sozinho:

```
setx GH_TOKEN "cole_o_token_aqui"
```

Feche e reabra o terminal depois disso. O token fica na sua máquina — nunca no
repositório, nunca dentro do `.exe`.

## A cada versão

**1. Suba o número** em `package.json`. É ele que o app compara:

```json
"version": "0.3.0"
```

Correção pequena mexe no terceiro número, funcionalidade nova no segundo.

**2. Rode:**

```
npm run release
```

Isso roda a bateria de verificação, compila, empacota e sobe para o GitHub. Se a
verificação falhar, nada é publicado — de propósito.

**3. Publique o rascunho.** O electron-builder cria o release como **draft**, e um draft é
invisível para o app. Vá em <https://github.com/DonattoPieve/finances/releases>, escreva o
que mudou (esse texto aparece dentro do Pluto, na tela de Configurações) e clique em
**Publish release**.

Pronto. Na próxima vez que você abrir o Pluto em qualquer máquina, ele avisa.

## Como fica para quem usa

1. Abre o Pluto — ele checa em silêncio, sem atrapalhar.
2. Configurações mostra "Versão X disponível" com as suas notas.
3. Clica em **Baixar atualização**, vê a barra de progresso.
4. Clica em **Reiniciar e instalar** — ou simplesmente fecha o app, e ela entra sozinha
   no próximo fechamento.

Os dados em `%APPDATA%\Pluto` não são tocados em nenhum momento disso.

## Detalhes que economizam dor de cabeça

- **A versão 0.1.0 que você já instalou não tem o updater dentro dela.** Ela nunca vai se
  atualizar sozinha. O pulo de 0.1.0 para 0.2.0 é na mão: `npm run release`, publique, e
  rode o `Pluto-0.2.0-setup.exe` por cima. Da 0.2.0 em diante o botão funciona.
- **Nunca reaproveite um número de versão.** Se você publicou 0.3.0 e achou um erro, a
  correção é 0.3.1, não uma segunda 0.3.0.
- **O `latest.yml` é obrigatório.** Ele sobe junto com o `.exe`; é o arquivo que o app lê
  para saber qual é a versão mais nova. Não apague do release.
- **O Windows vai dizer "editor desconhecido"** na instalação, porque o app não é
  assinado. Certificado de code signing custa caro por ano e não vale para uso próprio.
- **Repositório público.** O código fica visível; seus lançamentos, não — eles moram em
  `%APPDATA%\Pluto\pluto.db`, que o `.gitignore` bloqueia junto com `.env`, chaves e
  arquivos de backup.
