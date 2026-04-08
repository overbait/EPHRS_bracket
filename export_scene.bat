@echo off
setlocal
cd /d "%~dp0"

call "%~dp0bootstrap_runtime.bat"
if errorlevel 1 exit /b 1

if defined BROWSER_WARNING (
    echo PNG/PDF export needs Microsoft Edge or Google Chrome installed.
    pause
    exit /b 1
)

"%PYTHON_EXE%" export_scene.py %*
if errorlevel 1 pause
exit /b %errorlevel%
