@echo off
setlocal EnableExtensions
cd /d "%~dp0"

python -m PyInstaller ^
    --noconfirm ^
    --clean ^
    --onefile ^
    --windowed ^
    --name EPHRS_Bracket ^
    --add-data "index.html;." ^
    --add-data "script.js;." ^
    --add-data "style.css;." ^
    --add-data "vendor;vendor" ^
    --add-data "Media;Media" ^
    --add-data "countryflags;countryflags" ^
    generator_server.py

if errorlevel 1 (
    echo Build failed.
    pause
    exit /b 1
)

echo Build complete: dist\EPHRS_Bracket.exe
exit /b 0
