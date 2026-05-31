@echo off
title GeoTracker - Servidor Local
color 0A
echo.
echo  =========================================
echo   GeoTracker - Iniciando servidor local...
echo  =========================================
echo.

:: Intentar con Python 3
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo  [OK] Python encontrado. Iniciando servidor en http://localhost:8080
    echo  [>>] Abriendo Chrome automaticamente...
    echo.
    start "" "http://localhost:8080/geotracker.html"
    python -m http.server 8080
    goto end
)

:: Intentar con py launcher
py --version >nul 2>&1
if %errorlevel% == 0 (
    echo  [OK] Python encontrado. Iniciando servidor en http://localhost:8080
    start "" "http://localhost:8080/geotracker.html"
    py -m http.server 8080
    goto end
)

:: Intentar con Python 2
python2 --version >nul 2>&1
if %errorlevel% == 0 (
    echo  [OK] Python 2 encontrado. Iniciando servidor...
    start "" "http://localhost:8080/geotracker.html"
    python2 -m SimpleHTTPServer 8080
    goto end
)

:: Sin Python - abrir con Chrome con flag especial
echo  [!] Python no encontrado.
echo  [>>] Abriendo con Chrome (modo permisivo para archivos locales)...
echo.
set CHROME1="%ProgramFiles%\Google\Chrome\Application\chrome.exe"
set CHROME2="%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
set FILE=%~dp0geotracker.html

if exist %CHROME1% (
    %CHROME1% --allow-file-access-from-files --unsafely-treat-insecure-origin-as-secure="file://" "%FILE%"
    goto end
)
if exist %CHROME2% (
    %CHROME2% --allow-file-access-from-files --unsafely-treat-insecure-origin-as-secure="file://" "%FILE%"
    goto end
)

echo  [!] Chrome no encontrado. Abre manualmente geotracker.html con Firefox.
pause

:end
