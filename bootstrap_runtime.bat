@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "PROJECT_ROOT=%~dp0"
set "PYTHON_EXE="
set "BROWSER_WARNING="

call :discover_python

if not defined PYTHON_EXE (
    call :install_python
)

if not defined PYTHON_EXE (
    echo Python 3.9+ was not found and could not be installed automatically.
    echo.
    echo Please install Python once and then run this script again.
    echo Suggested command: winget install --id Python.Python.3.12 -e --scope user
    pause
    exit /b 1
)

call :ensure_venv
if errorlevel 1 exit /b 1

call :ensure_requirements
if errorlevel 1 exit /b 1

call :check_export_browser

endlocal & (
    set "PYTHON_EXE=%PYTHON_EXE%"
    set "BROWSER_WARNING=%BROWSER_WARNING%"
)
exit /b 0

:discover_python
if not defined PYTHON_EXE if exist "%PROJECT_ROOT%.venv\Scripts\python.exe" call :try_python "%PROJECT_ROOT%.venv\Scripts\python.exe"
if not defined PYTHON_EXE if exist "%PROJECT_ROOT%venv\Scripts\python.exe" call :try_python "%PROJECT_ROOT%venv\Scripts\python.exe"
if not defined PYTHON_EXE for /d %%D in ("%LOCALAPPDATA%\Programs\Python\Python*") do if not defined PYTHON_EXE call :try_python "%%~fD\python.exe"
if not defined PYTHON_EXE for /d %%D in ("%ProgramFiles%\Python*") do if not defined PYTHON_EXE call :try_python "%%~fD\python.exe"
if not defined PYTHON_EXE for /d %%D in ("%ProgramFiles(x86)%\Python*") do if not defined PYTHON_EXE call :try_python "%%~fD\python.exe"

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
winget install --id Python.Python.3.12 -e --scope user --accept-package-agreements --accept-source-agreements
if errorlevel 1 exit /b 1
call :discover_python
exit /b 0

:ensure_venv
if not exist "%PROJECT_ROOT%.venv\Scripts\python.exe" (
    echo Creating local Python environment...
    "%PYTHON_EXE%" -m venv "%PROJECT_ROOT%.venv"
    if errorlevel 1 (
        echo Failed to create .venv
        pause
        exit /b 1
    )
)

set "PYTHON_EXE=%PROJECT_ROOT%.venv\Scripts\python.exe"
"%PYTHON_EXE%" -m ensurepip --upgrade >nul 2>nul
exit /b 0

:ensure_requirements
if not exist "%PROJECT_ROOT%requirements.txt" exit /b 0

powershell -NoProfile -Command ^
    "$req = Get-Item '%PROJECT_ROOT%requirements.txt' -ErrorAction Stop; $stamp = Get-Item '%PROJECT_ROOT%.venv\.requirements_installed' -ErrorAction SilentlyContinue; if (-not $stamp -or $stamp.LastWriteTimeUtc -lt $req.LastWriteTimeUtc) { exit 0 } else { exit 1 }"
if errorlevel 1 exit /b 0

echo Installing Python dependencies...
"%PYTHON_EXE%" -m pip install --disable-pip-version-check -r "%PROJECT_ROOT%requirements.txt"
if errorlevel 1 (
    echo Failed to install Python dependencies.
    pause
    exit /b 1
)

type nul > "%PROJECT_ROOT%.venv\.requirements_installed"
exit /b 0

:check_export_browser
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" exit /b 0
if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" exit /b 0
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" exit /b 0
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" exit /b 0
set "BROWSER_WARNING=1"
exit /b 0
