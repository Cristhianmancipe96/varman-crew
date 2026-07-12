# ==========================================================
# Abre un tunel TEMPORAL de Cloudflare hacia n8n (localhost:5678).
# Da una URL publica https://XXXX.trycloudflare.com
# Dejar esta ventana ABIERTA mientras el bot este en uso.
# La URL tambien queda guardada en tunnel-url.txt
# ==========================================================
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$log  = Join-Path $here "tunnel.log"
$urlFile = Join-Path $here "tunnel-url.txt"
Remove-Item $log,$urlFile -ErrorAction SilentlyContinue

# Refrescar PATH (por si la ventana se abrio antes de instalar cloudflared)
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "Abriendo tunel de Cloudflare hacia http://localhost:5678 ..." -ForegroundColor Cyan
cloudflared tunnel --url http://localhost:5678 2>&1 | ForEach-Object {
    $_ | Tee-Object -FilePath $log -Append
    if ($_ -match "https://[a-z0-9-]+\.trycloudflare\.com") {
        $u = $Matches[0]
        Set-Content -Path $urlFile -Value $u -Encoding utf8
        Write-Host ""
        Write-Host "===============================================" -ForegroundColor Green
        Write-Host " URL PUBLICA DEL BOT:  $u" -ForegroundColor Green
        Write-Host "===============================================" -ForegroundColor Green
    }
}
