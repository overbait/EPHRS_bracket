@echo off
setlocal
cd /d "%~dp0"

call "%~dp0bootstrap_runtime.bat"
if errorlevel 1 exit /b 1

if defined BROWSER_WARNING (
    echo Note: the generator will open normally, but PNG/PDF export needs Microsoft Edge or Google Chrome installed.
)

powershell -NoProfile -Command ^
    "$tcpCmd = Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue; if ($tcpCmd) { Get-NetTCPConnection -LocalPort 8765 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }; Start-Process -FilePath '%PYTHON_EXE%' -ArgumentList 'generator_server.py' -WorkingDirectory '%~dp0'"

timeout /t 2 /nobreak >nul
powershell -NoProfile -Command "Start-Process 'http://127.0.0.1:8765'"
exit /b 0
