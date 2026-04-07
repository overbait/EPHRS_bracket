@echo off
cd /d "%~dp0"
python export_scene.py %*
if errorlevel 1 pause
