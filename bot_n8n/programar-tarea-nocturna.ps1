# ============================================================================
#  programar-tarea-nocturna.ps1
#  Registra una TAREA PROGRAMADA de Windows que corre 'mejoras-nocturnas.ps1'
#  todas las noches (por defecto 02:00, 3 mejoras). Corre como TU usuario,
#  cuando la sesion esta iniciada. No necesita contrasena.
#
#  Uso normal:  doble clic en  programar-tarea-nocturna.bat
#  Uso avanzado (cambiar hora o cantidad):
#     powershell -ExecutionPolicy Bypass -File .\programar-tarea-nocturna.ps1 -Hora 03:30 -Vueltas 5
# ============================================================================
param(
  [string]$Hora    = "02:00",   # hora local (America/Bogota) del arranque diario
  [int]   $Vueltas = 3          # cuantas mejoras hace cada noche
)
$ErrorActionPreference = "Stop"

$carpeta = $PSScriptRoot
$script  = Join-Path $carpeta "mejoras-nocturnas.ps1"
$nombre  = "VarMan - Mejoras nocturnas del bot"

if (-not (Test-Path $script)) {
  Write-Host "No encuentro $script - corre esto DENTRO de la carpeta bot_n8n." -ForegroundColor Red
  exit 1
}

$accion = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`" -Vueltas $Vueltas" `
  -WorkingDirectory $carpeta

$trigger = New-ScheduledTaskTrigger -Daily -At $Hora

# StartWhenAvailable: si el PC estaba apagado/dormido a esa hora, corre al
# volver. WakeToRun: intenta despertar el PC si esta suspendido (no si esta
# totalmente apagado). Limite de 3h por si algo se cuelga.
$ajustes = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun `
  -ExecutionTimeLimit (New-TimeSpan -Hours 3) -MultipleInstances IgnoreNew

$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" `
  -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $nombre -Action $accion -Trigger $trigger `
  -Settings $ajustes -Principal $principal -Force | Out-Null

Write-Host ""
Write-Host "Tarea creada: '$nombre'" -ForegroundColor Green
Write-Host "   -> Todas las noches a las $Hora, hace $Vueltas mejoras y para."
Write-Host "   -> Corre cuando tu sesion de Windows esta iniciada (el PC debe estar encendido o suspendido, no apagado del todo)."
Write-Host ""
Write-Host "Ver / editar en:  Programador de tareas de Windows (Task Scheduler) -> Biblioteca."
Write-Host "Quitarla:         doble clic en  quitar-tarea-nocturna.bat"
Write-Host ""
Write-Host "NOTA: si Windows pide permisos de administrador para crear la tarea," -ForegroundColor DarkYellow
Write-Host "      cierra, y abre este .bat con clic derecho -> 'Ejecutar como administrador'." -ForegroundColor DarkYellow
