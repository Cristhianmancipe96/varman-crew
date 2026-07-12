@echo off
REM ============================================================
REM  Doble clic para QUITAR la tarea nocturna programada.
REM  El bucle manual (correr-loop-mejoras.bat) sigue funcionando aparte.
REM ============================================================
echo.
echo   Quitando la tarea nocturna "VarMan - Mejoras nocturnas del bot"...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Unregister-ScheduledTask -TaskName 'VarMan - Mejoras nocturnas del bot' -Confirm:$false; Write-Host 'Listo: tarea nocturna eliminada.' -ForegroundColor Green } catch { Write-Host 'No habia tarea que quitar (o ya estaba borrada).' -ForegroundColor Yellow }"
echo.
pause
