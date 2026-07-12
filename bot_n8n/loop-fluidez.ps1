# ============================================================================
#  loop-fluidez.ps1  -  Agente DEDICADO a la FLUIDEZ de la conversacion
# ----------------------------------------------------------------------------
#  Igual que loop-mejoras.ps1, pero cada vuelta hace UNA mejora de FLUIDEZ
#  (menos burbujas, no repetir mensajes, entender mejor, transiciones humanas)
#  siguiendo briefs\BRIEF-FLUIDEZ-CONVERSACION.md y para.
#
#  ####################  IMPORTANTE  ####################
#  UN SOLO ESCRITOR. NO corras este script al mismo tiempo que
#  loop-mejoras.ps1 ni que la tarea nocturna: tocan los mismos archivos y
#  OneDrive + edicion paralela ya borro trabajo. Para el loop de mejoras
#  ANTES de arrancar este. Al terminar la fluidez, retomas aquel.
#  #####################################################
#
#  USO:   doble clic en  correr-agente-fluidez.bat   (o)
#         powershell -ExecutionPolicy Bypass -File .\loop-fluidez.ps1
#  PARAR: Ctrl + C
# ============================================================================

Set-Location -Path $PSScriptRoot

$brief          = "briefs\BRIEF-FLUIDEZ-CONVERSACION.md"
$logFile        = "loop-fluidez.log"
$pausaSegundos  = 60
$maxVueltas     = 0       # 0 = infinito; pon un numero para un tope
$modoPermisos   = "--dangerously-skip-permissions"   # ver nota en loop-mejoras.ps1

# Aviso anti-colision (no puede detectar el otro proceso, pero te recuerda):
Write-Host ""
Write-Host "  RECORDATORIO: no dejes corriendo loop-mejoras.ps1 ni la tarea" -ForegroundColor Yellow
Write-Host "  nocturna al mismo tiempo que este agente de fluidez." -ForegroundColor Yellow
Write-Host ""

$prompt = @"
Lee y ejecuta el brief $brief al pie de la letra.
Haz UNA sola mejora COMPLETA de FLUIDEZ del bot en esta corrida:
(1) lee briefs\BITACORA-MEJORAS.md (memoria compartida) y
    briefs\CONVERSACIONES-INCOMODAS.md (chats reales = tu fuente #1);
(2) corre 'node tests\test-offline-v4.js'. Si ya esta en ROJO, NO agregues
    features: arregla el rojo si es chico o para y registralo;
(3) elige de la cola 'Tier F' (fluidez) la mejora de mayor impacto en los chats
    reales que NO este en 'Hechas';
(4) escribe PRIMERO el test que hoy falla (usa un caso real incomodo);
(5) implementa en workflows\src\ , aditivo y detras de un flag apagado por
    defecto (con el flag OFF el bot = hoy);
(6) respalda workflows\bot-varman.json en workflows\respaldo\ y corre
    'node workflows\build-v4-pedidos.js';
(7) corre 'node tests\test-offline-v4.js' y dejalo TODO en verde (viejos + tu
    caso nuevo, flag OFF y ON);
(8) si no logras verde, revierte y registra la mejora como descartada;
(9) actualiza briefs\BITACORA-MEJORAS.md (fila con prefijo F en 'Hechas') y deja
    bot_n8n\notas-mejoras\NOTA-FLUIDEZ-<N>.md;
(10) imprime una linea de cierre y TERMINA.
NO despliegues a la VM. NO toques credenciales ni .env. NO hagas git push.
Trabaja en UNA mejora de fluidez y para.
"@

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: no encuentro el comando 'claude'." -ForegroundColor Red; exit 1
}
if (-not (Test-Path $brief)) {
  Write-Host "ERROR: no encuentro el brief: $brief (corre esto dentro de bot_n8n)." -ForegroundColor Red; exit 1
}

Write-Host "== Agente de fluidez ==" -ForegroundColor Green
Write-Host "Brief:  $brief   |   Pausa: $pausaSegundos s   |   Ctrl+C para parar"
Write-Host ""

$vuelta = 0
while ($true) {
  $vuelta++
  $sello = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Write-Host "==== Fluidez, vuelta $vuelta  ($sello) ====" -ForegroundColor Cyan
  Add-Content $logFile "`n==== Fluidez, vuelta $vuelta  ($sello) ===="

  $promptVuelta = $prompt + "`n(Vuelta $vuelta - usa este numero para el nombre de la nota si no hay otro.)"
  $argsClaude = @('-p', $promptVuelta) + $modoPermisos.Split(' ')
  & claude @argsClaude 2>&1 | Tee-Object -FilePath $logFile -Append

  if ($LASTEXITCODE -ne 0) {
    Write-Host "Claude devolvio codigo $LASTEXITCODE. Se reintenta tras la pausa." -ForegroundColor Yellow
  }
  if ($maxVueltas -gt 0 -and $vuelta -ge $maxVueltas) {
    Write-Host "Tope de $maxVueltas vueltas. Fin." -ForegroundColor Green; break
  }
  Write-Host "Pausa de $pausaSegundos s (Ctrl+C para parar)..." -ForegroundColor DarkGray
  Start-Sleep -Seconds $pausaSegundos
}
