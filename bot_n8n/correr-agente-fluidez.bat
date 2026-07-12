@echo off
REM ============================================================
REM  Doble clic para arrancar el AGENTE DE FLUIDEZ del bot.
REM  Lanza loop-fluidez.ps1 (una mejora de fluidez por vuelta).
REM
REM  OJO: NO lo corras al mismo tiempo que correr-loop-mejoras.bat
REM  ni la tarea nocturna (un solo escritor - lo de OneDrive).
REM  Parar: cierra la ventana o Ctrl+C.
REM ============================================================
cd /d "%~dp0"
echo.
echo   Iniciando el agente de FLUIDEZ del bot VarMan...
echo   (Asegurate de que el loop de mejoras NO este corriendo.)
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0loop-fluidez.ps1"
echo.
echo   El agente de fluidez termino. Puedes cerrar esta ventana.
pause
