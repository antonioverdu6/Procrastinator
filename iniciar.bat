@echo off
title Procrastinator
cd /d "%~dp0"
echo Iniciando Procrastinator en modo escritorio...
call npm.cmd run electron:dev
pause
