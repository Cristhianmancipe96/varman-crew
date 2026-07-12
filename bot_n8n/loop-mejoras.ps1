# ============================================================================
#  loop-mejoras.ps1  -  Bucle infinito de MEJORA CONTINUA del bot VarMan
# ----------------------------------------------------------------------------
#  Llama a Claude Code una y otra vez. En cada vuelta el agente hace UNA mejora
#  completa del bot (elige -> test -> implementa -> build -> tests verdes ->
#  bitacora) y termina; este script lo vuelve a lanzar para la siguiente.
#
#  El brief que gobierna cada vuelta:
#     briefs\BRIEF-AGENTE-LOOP-MEJORA-CONTINUA.md
#  La memoria entre vueltas (que el agente lee y escribe):
#     briefs\BITACORA-MEJORAS.md
#
#  REQUISITOS
#   - Claude Code instalado y en el PATH (comando: claude).  Prueba:  claude --version
#   - Node instalado (para el build y los tests).            Prueba:  node --version
#   - Corre este script DENTRO de la carpeta bot_n8n (aqui vive).
#
#  USO
#   - Doble clic en  correr-loop-mejoras.bat   (mas facil), o
#   - En PowerShell:  powershell -ExecutionPolicy Bypass -File .\loop-mejoras.ps1
#
#  PARAR:  Ctrl + C   (termina la vuelta actual y no lanza otra)
#
#  IMPORTANTE (OneDrive): corre UNA sola instancia a la vez. Dos agentes
#  editando los mismos archivos en OneDrive ya causo perdidas de trabajo.
# ============================================================================

# --- Ir a la carpeta del bot (donde viven briefs\, workflows\ y tests\) ---
Set-Location -Path $PSScriptRoot

# --- Ajustes (puedes cambiarlos) ---
$brief          = "briefs\BRIEF-AGENTE-LOOP-MEJORA-CONTINUA.md"
$logFile        = "loop-mejoras.log"
$pausaSegundos  = 60      # respiro entre vueltas (baja el gasto de cupo/tokens)
$maxVueltas     = 0       # 0 = infinito; pon un numero para un tope de vueltas

# Modo de permisos de Claude Code en headless:
#   Para un bucle DESATENDIDO real se necesita que el agente pueda editar
#   archivos y correr 'node' sin frenarse a pedir permiso en cada paso. Eso lo
#   da --dangerously-skip-permissions. Es aceptable AQUI porque el brief acota
#   al agente con fuerza: NO despliega, NO toca credenciales/.env, NO hace git
#   push, todo es aditivo+flag y corre en TU maquina sobre este proyecto.
#   Si prefieres mas control (te frena a confirmar acciones), cambia por:
#       $modoPermisos = "--permission-mode acceptEdits"
#   (con acceptEdits puede que se detenga pidiendo permiso para correr 'node').
$modoPermisos   = "--dangerously-skip-permissions"

# --- Instruccion que recibe el agente en cada vuelta ---
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
Trabaja en UNA mejora y para; este script te vuelve a llamar para la siguiente.
"@

# --- Verificaciones rapidas antes de arrancar ---
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: no encuentro el comando 'claude'. Instala Claude Code o agregalo al PATH." -ForegroundColor Red
  Write-Host "Prueba:  claude --version" -ForegroundColor Red
  exit 1
}
if (-not (Test-Path $brief)) {
  Write-Host "ERROR: no encuentro el brief: $brief" -ForegroundColor Red
  Write-Host "Corre este script DENTRO de la carpeta bot_n8n." -ForegroundColor Red
  exit 1
}

Write-Host "== Loop de mejora continua VarMan ==" -ForegroundColor Green
Write-Host "Carpeta:  $PSScriptRoot"
Write-Host "Brief:    $brief"
Write-Host "Permisos: $modoPermisos"
Write-Host "Pausa:    $pausaSegundos s entre vueltas   (Ctrl+C para parar)"
Write-Host ""

$vuelta = 0
while ($true) {
  $vuelta++
  $sello = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Write-Host "==== Vuelta $vuelta  ($sello) ====" -ForegroundColor Cyan
  Add-Content $logFile "`n==== Vuelta $vuelta  ($sello) ===="

  # --- llamada a Claude Code en modo headless (-p = print/headless) ---
  $promptVuelta = $prompt + "`n(Vuelta $vuelta - usa este numero para el nombre de la nota si no hay otro.)"
  $argsClaude = @('-p', $promptVuelta) + $modoPermisos.Split(' ')
  & claude @argsClaude 2>&1 | Tee-Object -FilePath $logFile -Append

  if ($LASTEXITCODE -ne 0) {
    Write-Host "Claude devolvio codigo $LASTEXITCODE. Se reintenta tras la pausa." -ForegroundColor Yellow
    Add-Content $logFile "  (exit code $LASTEXITCODE)"
  }

  if ($maxVueltas -gt 0 -and $vuelta -ge $maxVueltas) {
    Write-Host "Alcanzado el tope de $maxVueltas vueltas. Fin." -ForegroundColor Green
    break
  }

  Write-Host "Pausa de $pausaSegundos s antes de la siguiente vuelta (Ctrl+C para parar)..." -ForegroundColor DarkGray
  Start-Sleep -Seconds $pausaSegundos
}
