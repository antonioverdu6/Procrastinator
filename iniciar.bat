@echo off
title Procrastinator
cd /d "%~dp0"
echo ======================================================
echo    Iniciando Procrastinator (FastAPI + Desktop)
echo ======================================================

start "Procrastinator Backend (FastAPI)" /min cmd /c "python backend/run.py"
echo Backend FastAPI iniciado en http://127.0.0.1:8000
echo Arrancando interfaz...
call npm.cmd run electron:dev
pause
