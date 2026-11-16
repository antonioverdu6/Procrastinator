@echo off
title DevPace Web Mode
cd /d "%~dp0"
echo Iniciando DevPace en modo navegador...
call npm.cmd run dev
pause
