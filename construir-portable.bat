@echo off
rem ════════════════════════════════════════════════════════════════════
rem  Carta Solar — genera el ejecutable portable de Windows (x64)
rem
rem  Requisitos: Windows 10/11 x64 y Node.js 24 LTS (https://nodejs.org).
rem  Uso: doble clic en este archivo, o desde una consola en la raiz del
rem  repositorio:  construir-portable.bat
rem  Resultado:   dist\CartaSolar-<version>-portable.exe
rem ════════════════════════════════════════════════════════════════════
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] No se encontro Node.js. Instale Node.js 24 LTS y vuelva a intentarlo.
  pause & exit /b 1
)
echo Node.js:
node --version

if exist package-lock.json (
  echo Instalando dependencias exactas ^(npm ci^)...
  call npm ci --no-audit --no-fund || goto :fallo
) else (
  echo Sin package-lock.json: usando npm install...
  call npm install --no-audit --no-fund || goto :fallo
)

call node --check src\main.js || goto :fallo

echo Generando el portable...
call npm run dist || goto :fallo

echo.
echo Listo. Ejecutable en la carpeta dist:
dir /b dist\*-portable.exe
start "" "%~dp0dist"
pause
exit /b 0

:fallo
echo.
echo [ERROR] La construccion fallo. Revise los mensajes anteriores.
pause
exit /b 1
