@echo off
title Procrastinator (Web)
cd /d "%~dp0"
echo Iniciando Procrastinator en el navegador...
call npm.cmd run dev
pause
