@echo off
title Procrastinator (Web + FastAPI)
cd /d "%~dp0"
echo ======================================================
echo    Iniciando Procrastinator (FastAPI + Web)
echo ======================================================

start "Procrastinator Backend (FastAPI)" /min cmd /c "python backend/run.py"
echo Backend FastAPI iniciado en http://127.0.0.1:8000
echo Arrancando cliente web...
call npm.cmd run dev
pause
