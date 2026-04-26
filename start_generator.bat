@echo off
setlocal
cd /d "%~dp0"

call "%~dp0bootstrap_runtime.bat"
if errorlevel 1 exit /b 1

"%PYTHON_EXE%" generator_server.py
exit /b 0
