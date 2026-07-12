#!/usr/bin/env bash
# ==========================================================
# VarMan Crew · Bot WhatsApp — instalador de la VM (Google Cloud)
#
# Prepara la VM varman-bot (e2-micro, Ubuntu 24.04) para correr el
# bot: Docker, swap, zona horaria de Bogotá y carpetas.
#
# Uso (dentro de la VM, conectado por el SSH del navegador de GCP):
#   bash instalar-servidor.sh
#
# La e2-micro tiene 1 GB de RAM: el swap de 2 GB se crea SOLO
# (si la VM tuviera 2 GB o más, se salta). Para forzarlo: --swap
#
# Es seguro correrlo dos veces: no repite lo que ya está hecho.
# NO arranca el bot: eso lo hace docker compose up -d (GUIA-GCP.md paso 5).
# ==========================================================

set -euo pipefail

FORZAR_SWAP=no
if [ "${1:-}" = "--swap" ]; then FORZAR_SWAP=si; fi

echo "=== Instalador de la VM VarMan ($(date '+%Y-%m-%d %H:%M')) ==="

# --- 0. Comprobaciones básicas ---
if [ "$(id -u)" -eq 0 ]; then
  echo "[FALLO] No lo corras como root ni con sudo. Entra normal por SSH y usa: bash instalar-servidor.sh"
  exit 1
fi
if ! grep -qi ubuntu /etc/os-release 2>/dev/null; then
  echo "[AVISO] Este script está pensado para Ubuntu. Sigo, pero bajo tu responsabilidad."
fi
echo "[OK] Usuario: $(whoami) · Carpeta del bot será: $HOME/varman-bot"

# --- 1. Actualizar el sistema ---
echo ""
echo "--- 1/5 Actualizando el sistema (puede tardar unos minutos) ---"
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

# --- 2. Zona horaria de Colombia (para logs y cron coherentes) ---
echo ""
echo "--- 2/5 Zona horaria America/Bogota ---"
sudo timedatectl set-timezone America/Bogota
echo "[OK] Hora del servidor: $(date)"

# --- 3. Docker + Docker Compose (instalación oficial) ---
echo ""
echo "--- 3/5 Docker ---"
if command -v docker >/dev/null 2>&1; then
  echo "[OK] Docker ya estaba instalado: $(docker --version)"
else
  curl -fsSL https://get.docker.com | sudo sh
  echo "[OK] Docker instalado: $(docker --version)"
fi
# Permitir usar docker sin sudo (aplica al PRÓXIMO login por ssh)
if id -nG "$USER" | grep -qw docker; then
  echo "[OK] El usuario $USER ya está en el grupo docker"
else
  sudo usermod -aG docker "$USER"
  echo "[OK] Usuario $USER agregado al grupo docker (cierra esta ventana SSH y abre otra para que aplique)"
fi
# Que Docker arranque solo si la VM se reinicia
sudo systemctl enable docker >/dev/null 2>&1 || true

# --- 4. Swap (la e2-micro solo tiene 1 GB de RAM) ---
echo ""
echo "--- 4/5 Memoria swap ---"
RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
if [ -f /swapfile ]; then
  echo "[OK] El swap ya existe, no lo toco"
elif [ "$RAM_MB" -lt 2000 ] || [ "$FORZAR_SWAP" = "si" ]; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  echo "[OK] Swap de 2 GB creado y permanente (RAM detectada: ${RAM_MB} MB)"
else
  echo "[OK] Sin swap (RAM: ${RAM_MB} MB alcanza). Para forzarlo: bash instalar-servidor.sh --swap"
fi

# --- 5. Carpetas del bot ---
echo ""
echo "--- 5/5 Carpetas ---"
mkdir -p "$HOME/varman-bot"
mkdir -p "$HOME/backups-bot"
echo "[OK] $HOME/varman-bot (el bot) y $HOME/backups-bot (respaldos)"

echo ""
echo "=================================================="
echo "LISTO. Próximos pasos (GUIA-GCP.md):"
echo "  1. Cierra esta ventana SSH y abre otra (para el grupo docker)."
echo "  2. Sube varman-bot-vm.tar.gz (botón SUBIR ARCHIVO del SSH del navegador)"
echo "     y descomprime:  tar xzf varman-bot-vm.tar.gz"
echo "  3. cd ~/varman-bot && docker compose up -d"
echo "  4. bash importar-workflows.sh   (importa los workflows y activa el v4.1)"
echo "  5. bash backup.sh --instalar-cron"
echo "  6. bash verificar-salud.sh"
echo "=================================================="
