# ==========================================================
# Carga las variables de .env y arranca n8n en localhost:5678.
# Si existe tunnel-url.txt, usa esa URL publica como WEBHOOK_URL
# (para que los webhooks que genera n8n apunten a internet).
# IMPORTANTE: abrir primero start-tunnel.ps1, luego este.
# ==========================================================
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1) Cargar .env -> variables de entorno
Get-Content (Join-Path $here ".env") | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
        $idx = $line.IndexOf("=")
        $k = $line.Substring(0, $idx).Trim()
        $v = $line.Substring($idx + 1).Trim()
        Set-Item -Path "env:$k" -Value $v
    }
}

# 2) Si hay URL de tunel guardada, usarla como WEBHOOK_URL
$tunFile = Join-Path $here "tunnel-url.txt"
if (Test-Path $tunFile) {
    $env:WEBHOOK_URL = (Get-Content $tunFile -Raw).Trim()
    Write-Host "WEBHOOK_URL = $($env:WEBHOOK_URL)" -ForegroundColor Green
} else {
    Write-Host "AVISO: no hay tunnel-url.txt. Abre primero start-tunnel.ps1." -ForegroundColor Yellow
}

# 3) Refrescar PATH (incluida la carpeta de pnpm, donde vive n8n) y arrancar
$env:PNPM_HOME = "C:\Users\cmanc\AppData\Local\pnpm"
$env:Path = $env:PNPM_HOME + ";" + [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
Write-Host "Arrancando n8n en http://localhost:5678 ..." -ForegroundColor Cyan
n8n
