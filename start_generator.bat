@echo off
cd /d "%~dp0"
for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort 8765 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique) 2>$null"`) do (
    powershell -NoProfile -Command "Stop-Process -Id %%P -Force -ErrorAction SilentlyContinue"
)
start "" cmd /c python generator_server.py
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8765"
