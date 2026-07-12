@echo off
chcp 65001 >nul
title VarMan Crew - servidor local
cd /d "%~dp0"

echo ============================================
echo   VarMan Crew - Inventario (modo local)
echo ============================================
echo.
echo Iniciando servidor local en http://localhost:8000
echo.
echo  - NO cierres esta ventana mientras uses la app.
echo  - Para apagar la app: cierra esta ventana.
echo.

start "" "http://localhost:8000/index.html"

py servidor.py
