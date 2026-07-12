@echo off
REM ============================================================
REM  Doble clic para arrancar el bucle de MEJORA CONTINUA del bot.
REM  Lanza loop-mejoras.ps1 (que llama a Claude Code una y otra vez).
REM  Parar: cierra esta ventana o pulsa Ctrl+C.
REM ============================================================
cd /d "%~dp0"
echo.
echo   Iniciando el loop de mejora continua del bot VarMan...
echo   (Ctrl+C para parar. Corre UNA sola instancia a la vez.)
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0loop-mejoras.ps1"
echo.
echo   El loop termino. Puedes cerrar esta ventana.
pause
