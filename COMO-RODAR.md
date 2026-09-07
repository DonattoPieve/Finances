# Pluto — como rodar no PC

## Rodar agora, sem instalar
Abra `dist\Pluto-win-x64\` e execute **Pluto.exe**.
E so isso — a pasta inteira e o app. Pode mover para onde quiser (ex.: `C:\Apps\Pluto`)
e criar um atalho do `Pluto.exe` na area de trabalho.

## Gerar o instalador
De um duplo clique em **gerar-instalador.bat** na raiz do projeto.
Ele roda `npm install` e `npm run dist` e, no fim, abre a pasta `dist` com:

- `Pluto-0.1.0-setup.exe` — instalador (cria atalhos no menu iniciar e na area de trabalho)
- `Pluto-0.1.0-portable.exe` — versao portatil em um arquivo so

## Onde ficam os dados
`%APPDATA%\Pluto\pluto.db`

A mesma pasta e usada pelo `npm run dev` e pelo app instalado, entao os dados sao os mesmos.

Para levar os dados para outro computador: **Configuracoes -> Exportar dados** aqui,
copiar o `.json` para o outro PC e usar **Configuracoes -> Importar backup** la.
