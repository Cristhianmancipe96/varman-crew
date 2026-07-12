# ============================================================================
#  mejoras-nocturnas.ps1  -  Corrida ACOTADA de mejora continua del bot VarMan
# ----------------------------------------------------------------------------
#  Igual que loop-mejoras.ps1 pero hace un NUMERO FIJO de mejoras y termina.
#  Pensado para la Tarea Programada de Windows (correr solo, de noche).
#  Registrala con:  programar-tarea-nocturna.bat  (doble clic, una vez).
#
#  Uso manual:
#     powershell -ExecutionPolicy Bypass -File .\mejoras-nocturnas.ps1 -Vueltas 3
# ============================================================================
param(
  [int]$Vueltas       = 3,    # cuantas mejoras hace en la corrida y para
  [int]$PausaSegundos = 30    # respiro entre mejoras
)

Set-Location -Path $PSScriptRoot

$brief   = "briefs\BRIEF-AGENTE-LOOP-MEJORA-CONTINUA.md"
$logFile = "mejoras-nocturnas.log"

# Headless desatendido: el agente edita y corre 'node' sin frenarse a pedir
# permiso. Acotado con fuerza por el brief (no deploy, no credenciales, no push).
$modoPermisos = "--dangerously-skip-permissions"

$prompt = @"
Lee y ejecuta el brief $brief al pie de la letra.
Haz UNA sola mejora COMPLETA del bot en esta corrida:
(1) lee la bitacora briefs\BITACORA-MEJORAS.md y el ESTADO para ponerte al dia;
(2) corre 'node tests\test-offline-v4.js' - si ya esta en ROJO, NO agregues
    features: arregla el rojo si es chico o para y registralo;
(3) elige de la cola 'Proximas' la mejora de mayor impacto y menor riesgo que NO
    este en 'Hechas';
(4) escribe PRIMERO el test que hoy falla (usa dialogos del BANCO);
(5) implementa en workflows\src\ - aditivo y detras de un flag apagado por
    defecto (con el flag OFF el bot = hoy);
(6) respalda workflows\bot-varman.json en workflows\respaldo\ y corre
    'node workflows\build-v4-pedidos.js';
(7) corre 'node tests\test-offline-v4.js' y dejalo TODO en verde (viejos + tu
    caso nuevo, con el flag OFF y ON);
(8) si no logras verde, revierte y registra la mejora como descartada;
(9) actualiza briefs\BITACORA-MEJORAS.md (Hechas + Proximas) y deja
    bot_n8n\notas-mejoras\NOTA-MEJORA-<N>.md;
(10) imprime una linea de cierre y TERMINA.
NO despliegues a la VM. NO toques credenciales ni .env. NO hagas git push.
Trabaja en UNA mejora y para.
"@

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Add-Content $logFile "ERROR: comando 'claude' no encontrado."
  Write-Host "ERROR: no encuentro el comando 'claude'." -ForegroundColor Red
  exit 1
}
if (-not (Test-Path $brief)) {
  Add-Content $logFile "ERROR: brief no encontrado: $brief"
  Write-Host "ERROR: no encuentro el brief: $brief" -ForegroundColor Red
  exit 1
}

$inicio = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content $logFile "`n########## Corrida nocturna: $Vueltas mejoras - inicio $inicio ##########"
Write-Host "== Mejoras nocturnas: $Vueltas mejoras ==" -ForegroundColor Green

for ($i = 1; $i -le $Vueltas; $i++) {
  $sello = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Write-Host "==== Mejora $i de $Vueltas  ($sello) ====" -ForegroundColor Cyan
  Add-Content $logFile "==== Mejora $i de $Vueltas  ($sello) ===="

  $promptVuelta = $prompt + "`n(Corrida nocturna, mejora $i - usa este numero para el nombre de la nota si no hay otro.)"
  $argsClaude = @('-p', $promptVuelta) + $modoPermisos.Split(' ')
  & claude @argsClaude 2>&1 | Tee-Object -FilePath $logFile -Append

  if ($LASTEXITCODE -ne 0) {
    Add-Content $logFile "  (exit code $LASTEXITCODE - se detiene la corrida nocturna)"
    Write-Host "Claude devolvio codigo $LASTEXITCODE. Se detiene la corrida." -ForegroundColor Yellow
    break
  }
  if ($i -lt $Vueltas) { Start-Sleep -Seconds $PausaSegundos }
}

$fin = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content $logFile "########## Corrida nocturna terminada: $fin ##########"
Write-Host "Corrida nocturna terminada ($fin)." -ForegroundColor Green
