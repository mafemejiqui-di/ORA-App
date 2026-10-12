@echo off
chcp 65001 >nul
title ORA - servidor de desarrollo
cd /d "%~dp0"

rem Si la terminal no encuentra Node, probar la ruta de instalacion habitual.
where node >nul 2>nul
if errorlevel 1 if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"

where node >nul 2>nul
if errorlevel 1 (
  echo No se encontro Node.js.
  echo Instalalo desde https://nodejs.org o con: winget install OpenJS.NodeJS.LTS
  echo Luego vuelve a abrir este archivo.
  echo.
  pause
  exit /b 1
)

rem Primera vez: instalar dependencias.
if not exist node_modules (
  echo Instalando dependencias, solo la primera vez...
  call npm.cmd install
  if errorlevel 1 (
    echo.
    echo Fallo la instalacion de dependencias.
    pause
    exit /b 1
  )
)

rem IP del computador en la red local, para abrir la app desde el celular.
set "LANIP="
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "(Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq 'Up' } | Select-Object -First 1).IPv4Address.IPAddress"`) do set "LANIP=%%i"

echo.
echo ================================================================
echo   ORA - prototipo
echo   En este computador:  http://localhost:5173
if defined LANIP (
  echo   En el celular:       http://%LANIP%:5173
  echo   El celular debe estar conectado a la misma red Wi-Fi.
) else (
  echo   No se detecto la IP de red; el celular no podra conectarse.
)
echo.
echo   Solo para pruebas: cualquier equipo de tu red Wi-Fi puede abrir
echo   esta direccion mientras esta ventana siga abierta.
echo   Si Windows pregunta por el Firewall, permite Node.js en la red.
echo   Para detener el servidor cierra esta ventana o pulsa Ctrl+C.
echo ================================================================
echo.

call npm.cmd run dev -- --host --port 5173 --strictPort --open

echo.
echo El servidor se detuvo. Si fue un error de puerto, cierra otras
echo ventanas del servidor que sigan abiertas y vuelve a intentarlo.
pause
