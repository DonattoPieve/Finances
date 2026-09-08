# Publicar uma versão do Pluto

```
npm run lancar
```

É isso. O resto acontece sozinho.

## O que esse comando faz

1. **Confere antes de mexer em qualquer coisa.** Se você não estiver na `main`, se
   houver arquivo não commitado, ou se a tag da próxima versão já existir neste PC, ele
   para e explica. É mais fácil consertar agora do que despublicar um Release depois.
2. **Roda a verificação inteira** — typecheck, 78 asserções de lógica e 16 checagens de
   fiação. Falhou, não lança.
3. **Sobe a versão** com `npm version`, que altera o `package.json` **e** o
   `package-lock.json` (o número mora nos dois) e cria a tag anotada.
4. **Empurra commit e tag juntos.**

Variações:

```
npm run lancar            0.2.0 -> 0.2.1   (correção)
npm run lancar minor      0.2.0 -> 0.3.0   (funcionalidade nova)
npm run lancar major      0.2.0 -> 1.0.0   (quebra de compatibilidade)
npm run lancar -- --seco  faz tudo menos o push
```

## O que acontece depois

A tag `v0.2.1` chegando no GitHub dispara o workflow em `.github/workflows/release.yml`,
que roda numa máquina Windows do próprio GitHub:

- confere que a tag combina com a versão do `package.json`;
- `npm ci`;
- roda a verificação de novo;
- gera o instalador e publica o Release, já com o `latest.yml`.

Acompanhe em <https://github.com/DonattoPieve/Finances/actions>. Leva alguns minutos.

O Release sai **publicado**, não como rascunho. Se quiser escrever o que mudou, edite o
Release depois — o texto aparece dentro do Pluto, em Configurações, na próxima verificação.

Seu PC não constrói nem sobe nada. Antes eram ~115 MB de upload a cada versão.

## Token

**Não precisa mais.** O workflow usa o `GITHUB_TOKEN` que o próprio GitHub fornece.

Se você tinha criado o `GH_TOKEN` na máquina, ele só é usado agora pela saída manual
abaixo. Pode apagar sem medo:

```
setx GH_TOKEN ""
```

## Saída manual

Se o Action estiver fora do ar e você precisar publicar do seu PC:

```
npm run dist:publish
```

Aí sim precisa do `GH_TOKEN` no ambiente — token fine-grained com acesso ao repositório
`Finances` e permissão **Contents: Read and write**, criado em
<https://github.com/settings/personal-access-tokens/new>.

Para só gerar o instalador localmente, sem publicar nada:

```
npm run dist
```

## Como fica para quem usa

1. Abre o Pluto — ele checa em silêncio, sem atrapalhar.
2. Aparece um aviso na barra do topo e o cartão em Configurações mostra a versão nova.
3. Clica em **Baixar atualização**, vê a barra de progresso.
4. Clica em **Reiniciar e instalar** — ou fecha o app, e ela entra sozinha no próximo
   fechamento.

Os dados em `%APPDATA%\Pluto` não são tocados em nenhum momento disso.

## Detalhes que economizam dor de cabeça

- **A versão 0.1.0 nunca vai se atualizar sozinha** — ela foi construída antes do
  updater existir. Da 0.2.0 em diante o ciclo funciona.
- **Nunca edite a versão do `package.json` na mão.** É o que o `lancar` existe para
  evitar: mexer só num dos dois arquivos deixa a tag fora de sincronia, e o Action recusa
  o build.
- **Se a tag ficou parada no PC** (o push disse "Everything up-to-date"), empurre com
  `git push --follow-tags`. O `lancar` já cria commit e tag juntos justamente para isso
  não acontecer.
- **O `latest.yml` é obrigatório** no Release. Ele sobe junto com o `.exe`; é o arquivo
  que o app lê para saber qual é a versão mais nova. Não apague.
- **Se o botão de atualizar der 404**, é esse arquivo que faltou no Release. Aconteceu no
  v0.2.2: o electron-builder sobe o `latest.yml` por último e ele se perdeu. O workflow
  agora confere isso no fim e anexa o arquivo do próprio build se estiver faltando — se
  nem assim aparecer, o Action quebra em vez de publicar uma versão que ninguém consegue
  baixar. O `latest.yml` precisa ser o do mesmo build do `.exe`: o sha512 dentro dele é
  conferido no download, então não adianta gerar um em outra máquina.
- **Release duplicado para a mesma tag** também quebra: o app lê o mais recente, e o
  arquivo pode ter ido para o outro. Se aparecerem dois, apague o que estiver incompleto.
- **O Windows vai dizer "editor desconhecido"** na instalação, porque o app não é
  assinado. Certificado de code signing custa caro por ano e não vale para uso próprio.
- **Repositório público.** O código fica visível; seus lançamentos, não — eles moram em
  `%APPDATA%\Pluto\pluto.db`, que o `.gitignore` bloqueia junto com `.env`, chaves e
  arquivos de backup.
