# ==========================================================
# VarMan Crew · Bot WhatsApp — PRUEBA LOCAL del docker-compose
#
# Prueba en el PC (Docker Desktop) que el docker-compose.yml del
# deploy funciona ANTES de tocar la VM, sin rozar el n8n local:
#   - usa el puerto 5679 (el n8n de producción local usa el 5678)
#   - usa un .env de MENTIRAS generado desde .env.example
#     (JAMÁS toca ni lee el .env real)
#   - no arranca caddy (no hay dominio ni certificado en la prueba)
#
# Qué valida:
#   1. Que la imagen n8n 2.28.6 arranca y pasa el healthcheck.
#   2. Que el flujo de importar-workflows.sh funciona (detener ->
#      importar v4 por CLI -> activar -> arrancar).
#   3. Que el webhook responde el reto de verificación de Meta.
#
# Uso (PowerShell en el PC, con Docker Desktop ABIERTO):
#   cd "C:\Users\cmanc\OneDrive\Escritorio\Proyecto_zapatos\bot_n8n\deploy"
#   powershell -ExecutionPolicy Bypass -File .\probar-local.ps1
#
#   -Mantener  -> deja el entorno corriendo para mirarlo
#                 (editor en http://localhost:5679)
#
# OJO: guardar este archivo SIEMPRE en UTF-8 CON BOM (trampa #1 del
# proyecto: sin BOM, PowerShell 5.1 lo lee como ANSI y los acentos
# mojibake pueden ROMPER el parseo, no solo verse feos).
# ==========================================================

param([switch]$Mantener)

$ErrorActionPreference = "Stop"
$carpetaDeploy = Split-Path -Parent $MyInvocation.MyCommand.Path
$carpetaBot    = Split-Path -Parent $carpetaDeploy
$dirPrueba     = Join-Path $env:TEMP "varman-prueba-local"
$compose       = @("-p", "varman-prueba", "-f", "docker-compose.yml", "-f", "docker-compose.local-test.yml")
$fallos        = 0

function OK($msg)    { Write-Host "  [OK] $msg" -ForegroundColor Green }
function FALLO($msg) { Write-Host "  [FALLO] $msg" -ForegroundColor Red; $script:fallos++ }

Write-Host "=== Prueba local del deploy VarMan ($(Get-Date -Format 'yyyy-MM-dd HH:mm')) ==="

# --- 1. ¿Hay Docker? ---
Write-Host "--- 1/6 Docker ---"
$docker = Get-Command docker -ErrorAction SilentlyContinue
if ($null -eq $docker) {
    FALLO "Docker no está instalado en este PC."
    Write-Host ""
    Write-Host "  Para esta prueba hace falta Docker Desktop (con WSL2):"
    Write-Host "    https://www.docker.com/products/docker-desktop/"
    Write-Host "  OJO: instalarlo pide REINICIAR el PC -> se caen el n8n local y el"
    Write-Host "  túnel temporal (la URL cambia y hay que re-verificar en Meta)."
    Write-Host "  Hacerlo en un momento tranquilo, con los pasos de LEEME-BOT.txt a mano."
    exit 1
}
docker info *> $null
if ($LASTEXITCODE -ne 0) { FALLO "Docker está instalado pero no corriendo. Abre Docker Desktop y reintenta."; exit 1 }
OK "Docker responde: $(docker --version)"

# --- 2. Armar el entorno de prueba (carpeta temporal, .env dummy) ---
Write-Host "--- 2/6 Entorno de prueba en $dirPrueba ---"
if (Test-Path $dirPrueba) { Remove-Item -Recurse -Force $dirPrueba }
New-Item -ItemType Directory -Path $dirPrueba | Out-Null
Copy-Item (Join-Path $carpetaDeploy "docker-compose.yml") $dirPrueba
Copy-Item (Join-Path $carpetaDeploy "docker-compose.local-test.yml") $dirPrueba
Copy-Item (Join-Path $carpetaDeploy "Caddyfile") $dirPrueba
New-Item -ItemType Directory -Path (Join-Path $dirPrueba "workflows") | Out-Null
Copy-Item (Join-Path $carpetaBot "workflows\*.json") (Join-Path $dirPrueba "workflows\")

# .env de mentiras: parte de .env.example y rellena todo con DUMMY
$env_dummy = Get-Content (Join-Path $carpetaDeploy ".env.example") -Encoding UTF8
$env_dummy = $env_dummy -replace '^WEBHOOK_URL=.*', 'WEBHOOK_URL=http://localhost:5679/'
$env_dummy = $env_dummy -replace '<[^>]+>', 'DUMMY'
$env_dummy | Out-File (Join-Path $dirPrueba ".env") -Encoding ascii
OK "Compose + workflows copiados y .env dummy generado (sin ningún secreto real)"

Set-Location $dirPrueba
try {
    # --- 3. Arrancar n8n (solo n8n; caddy queda fuera) ---
    Write-Host "--- 3/6 Arrancando n8n de prueba (la primera vez descarga la imagen, 2-5 min) ---"
    docker compose @compose up -d
    if ($LASTEXITCODE -ne 0) { FALLO "docker compose up falló (mira el error de arriba)"; throw "up" }

    $sano = $false
    foreach ($i in 1..60) {
        Start-Sleep -Seconds 5
        try {
            $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 "http://127.0.0.1:5679/healthz"
            if ($r.StatusCode -eq 200) { $sano = $true; break }
        } catch { }
    }
    if ($sano) { OK "n8n 2.28.6 sano en http://127.0.0.1:5679/healthz (healthcheck del compose OK)" }
    else { FALLO "n8n no respondió /healthz en 5 min. Logs: docker logs varman-n8n-prueba --tail 50"; throw "healthz" }

    # --- 4. Probar el flujo de importar-workflows.sh (CLI con n8n detenido) ---
    Write-Host "--- 4/6 Import por CLI (mismo flujo que importar-workflows.sh) ---"
    docker compose @compose stop n8n
    # (el entrypoint de la imagen ya antepone "n8n": solo van los subcomandos)
    docker compose @compose run --rm --no-deps -u node n8n import:workflow --input=/workflows/bot-whatsapp-v4-pedidos.json
    if ($LASTEXITCODE -ne 0) { FALLO "import:workflow falló"; throw "import" }
    docker compose @compose run --rm --no-deps -u node n8n update:workflow --id=VarmanBotV4Ped01 --active=true
    if ($LASTEXITCODE -ne 0) { FALLO "update:workflow --active=true falló"; throw "activar" }
    docker compose @compose start n8n
    $sano = $false
    foreach ($i in 1..30) {
        Start-Sleep -Seconds 5
        try {
            $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 "http://127.0.0.1:5679/healthz"
            if ($r.StatusCode -eq 200) { $sano = $true; break }
        } catch { }
    }
    if ($sano) { OK "v4 importado y activado por CLI; n8n volvió a arrancar sano" }
    else { FALLO "n8n no volvió a arrancar tras el import"; throw "restart" }

    # --- 5. ¿El workflow quedó registrado? ---
    Write-Host "--- 5/6 Verificando el workflow ---"
    $lista = docker compose @compose exec -T -u node n8n n8n list:workflow
    if ("$lista" -match "VarmanBotV4Ped01") { OK "VarmanBotV4Ped01 aparece en la lista de workflows" }
    else { FALLO "VarmanBotV4Ped01 NO aparece en list:workflow" }

    # --- 6. Reto del webhook (igual que lo hace Meta y verificar-salud.sh) ---
    Write-Host "--- 6/6 Reto de verificación del webhook (espera ~60s a que se registre) ---"
    Start-Sleep -Seconds 60
    $reto = "ping-prueba-$PID"
    try {
        $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 15 "http://127.0.0.1:5679/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=DUMMY&hub.challenge=$reto"
        if ($r.Content -eq $reto) { OK "El webhook devolvió el reto: el v4 responde como lo espera Meta" }
        else { FALLO "El webhook respondió algo distinto al reto: '$($r.Content)'" }
    } catch {
        FALLO "El webhook no respondió: $($_.Exception.Message)"
    }
}
catch { }
finally {
    # docker escribe progreso a stderr; con ErrorActionPreference=Stop eso
    # abortaba la limpieza (NativeCommandError). Aquí ya no es fatal:
    $ErrorActionPreference = "Continue"
    Write-Host ""
    if ($Mantener) {
        Write-Host "Entorno de prueba EN PIE (-Mantener): editor en http://localhost:5679"
        Write-Host "Para limpiarlo luego, desde $dirPrueba :"
        Write-Host "  docker compose -p varman-prueba -f docker-compose.yml -f docker-compose.local-test.yml down -v"
    } else {
        Write-Host "--- Limpiando el entorno de prueba ---"
        docker compose @compose down -v *> $null
        Set-Location $carpetaDeploy
        Remove-Item -Recurse -Force $dirPrueba -ErrorAction SilentlyContinue
        Write-Host "  [OK] Contenedor, volumen y carpeta temporal borrados"
    }
    Write-Host "=================================================="
    if ($fallos -eq 0) {
        Write-Host "RESULTADO: TODO BIEN -- el docker-compose.yml está listo para la VM." -ForegroundColor Green
    } else {
        Write-Host "RESULTADO: $fallos fallo(s) -- revisa las líneas [FALLO] de arriba." -ForegroundColor Red
        exit 1
    }
}
