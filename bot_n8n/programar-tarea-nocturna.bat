@echo off
REM ============================================================
REM  Doble clic para PROGRAMAR la tarea nocturna (una sola vez).
REM  Registra en Windows: cada noche a las 02:00, 3 mejoras del bot.
REM  Para cambiar hora/cantidad, edita la ultima linea de abajo
REM  (ej.  -Hora 03:30 -Vueltas 5).
REM ============================================================
cd /d "%~dp0"
echo.
echo   Programando la tarea nocturna de mejoras del bot VarMan...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0programar-tarea-nocturna.ps1"
echo.
pause
