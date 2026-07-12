# Prueba del numero real +57 304 291 6972 en Meta Cloud API
# Lee el token permanente desde credenciales\ (no hay que pegarlo a mano).
# Uso: clic derecho > Ejecutar con PowerShell, o en una terminal:
#   powershell -ExecutionPolicy Bypass -File .\probar-numero-real.ps1

$ErrorActionPreference = "Stop"
$carpeta = Split-Path -Parent $MyInvocation.MyCommand.Path
$tokenFile = Join-Path $carpeta "credenciales\token bot whatsapp bussiness.txt"
$token = (Get-Content $tokenFile -Raw).Trim()
$phoneId = "1129717360235397"   # Phone Number ID del numero REAL (304 291 6972)
$headers = @{ Authorization = "Bearer $token" }

Write-Host ""
Write-Host "=== 1. Verificando acceso del token al numero real ===" -ForegroundColor Cyan
try {
    $info = Invoke-RestMethod -Uri "https://graph.facebook.com/v20.0/${phoneId}?fields=display_phone_number,verified_name,code_verification_status,quality_rating" -Headers $headers
    Write-Host "OK - El token SI tiene acceso al numero:" -ForegroundColor Green
    $info | Format-List
} catch {
    Write-Host "ERROR en la verificacion de acceso:" -ForegroundColor Red
    $_.ErrorDetails.Message
    Write-Host "Probable causa: el usuario del sistema no quedo asignado a la WABA nueva (1572485474895736)." -ForegroundColor Yellow
    exit 1
}

Write-Host "=== 2. Enviar mensaje de prueba (opcional) ===" -ForegroundColor Cyan
Write-Host "Requisito: haber escrito 'hola' al 304 291 6972 desde ese celular hace menos de 24 horas."
$destino = Read-Host "Tu numero personal con 57 delante (ej: 573001234567), o ENTER para saltar"
if ($destino) {
    $body = @{ messaging_product = "whatsapp"; to = $destino; type = "text";
               text = @{ body = "Prueba: VarMan Crew ya responde desde el numero real." } } | ConvertTo-Json
    try {
        $r = Invoke-RestMethod -Method Post -Uri "https://graph.facebook.com/v20.0/${phoneId}/messages" -Headers $headers -ContentType "application/json" -Body $body
        Write-Host "Enviado. Revisa tu WhatsApp." -ForegroundColor Green
        $r | ConvertTo-Json -Depth 5
    } catch {
        Write-Host "ERROR al enviar:" -ForegroundColor Red
        $_.ErrorDetails.Message
        Write-Host "Si el error menciona modo desarrollo / no permitido (ej. 131030): todo esta bien amarrado, solo falta publicar la app en modo Live tras la verificacion." -ForegroundColor Yellow
    }
}
Write-Host ""
Write-Host "Listo." -ForegroundColor Cyan
