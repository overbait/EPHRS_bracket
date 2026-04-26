@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "PROJECT_ROOT=%~dp0"
set "PYTHON_EXE="

call :discover_python

if not defined PYTHON_EXE (
    call :install_python
)

if not defined PYTHON_EXE (
    echo Python 3.9+ was not found and could not be installed automatically.
    echo.
    echo Please install Python once and then run this script again.
    echo Suggested command: winget install --id Python.Python.3.13 -e --scope user
    pause
    exit /b 1
)

endlocal & (
    set "PYTHON_EXE=%PYTHON_EXE%"
)
exit /b 0

:discover_python
for %%P in (
    "%PROJECT_ROOT%python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
    "%ProgramFiles%\Python313\python.exe"
    "%ProgramFiles%\Python312\python.exe"
    "%ProgramFiles%\Python311\python.exe"
    "%ProgramFiles%\Python310\python.exe"
) do (
    if not defined PYTHON_EXE call :try_python "%%~fP"
)

if not defined PYTHON_EXE (
    for /f "usebackq delims=" %%P in (`py -3 -c "import sys; print(sys.executable)" 2^>nul`) do (
        if not defined PYTHON_EXE call :try_python "%%P"
    )
)

if not defined PYTHON_EXE (
    for /f "usebackq delims=" %%P in (`python -c "import sys; print(sys.executable)" 2^>nul`) do (
        if not defined PYTHON_EXE call :try_python "%%P"
    )
)
exit /b 0

:try_python
if not exist "%~1" exit /b 1
"%~1" -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 9) else 1)" >nul 2>nul
if errorlevel 1 exit /b 1
set "PYTHON_EXE=%~1"
exit /b 0

:install_python
where.exe winget >nul 2>nul || exit /b 1
echo Python 3.9+ was not found. Trying to install it automatically...
winget install --id Python.Python.3.13 -e --scope user --accept-package-agreements --accept-source-agreements
if errorlevel 1 exit /b 1
call :discover_python
exit /b 0
