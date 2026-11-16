@echo off
title DevPace - Anti-Procrastination Project Manager
cd /d "%~dp0"
echo Iniciando DevPace en modo escritorio...
call npm.cmd run electron:dev
pause
