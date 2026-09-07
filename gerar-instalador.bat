@echo off
title Pluto - gerar instalador
cd /d "%~dp0"

echo.
echo  ==========================================
echo   Pluto - gerando o instalador para Windows
echo  ==========================================
echo.

where npm >nul 2>&1
if errorlevel 1 (
  echo  [ERRO] npm nao encontrado no PATH. Instale o Node.js e rode este arquivo de novo.
  echo.
  pause
  exit /b 1
)

echo  [1/2] Instalando dependencias ^(pode demorar alguns minutos^)...
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo  [ERRO] Falhou no npm install.
  echo.
  pause
  exit /b 1
)

echo.
echo  [2/2] Compilando e empacotando...
call npm run dist
if errorlevel 1 (
  echo.
  echo  [ERRO] Falhou no empacotamento.
  echo.
  pause
  exit /b 1
)

echo.
echo  ==========================================
echo   Pronto! Os arquivos estao na pasta dist:
echo     - Pluto-0.1.0-setup.exe      ^(instalador^)
echo     - Pluto-0.1.0-portable.exe   ^(portatil^)
echo  ==========================================
echo.
start "" "%~dp0dist"
pause
