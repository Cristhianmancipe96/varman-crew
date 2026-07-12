#!/usr/bin/env bash
# ==========================================================
# VarMan Crew · Bot WhatsApp — red de la VM en Google Cloud
#
# QUÉ HACE (una sola vez, es seguro repetirlo):
#   1. Convierte la IP efímera de la VM varman-bot en IP ESTÁTICA
#      (gratis mientras esté asignada a la VM encendida).
#   2. Abre el firewall para TCP 80 y 443 (Caddy / Let's Encrypt).
#   3. Muestra la IP que hay que poner en el registro A de Cloudflare.
#
# DÓNDE SE CORRE: en CLOUD SHELL (el botón ">_" arriba a la derecha
# en console.cloud.google.com, con la cuenta varmansneakersandclothes).
# NO se corre dentro de la VM ni en el PC.
#
# Uso: pegar el archivo entero en Cloud Shell, o subirlo y:
#   bash gcp-configurar-red.sh
# ==========================================================

set -euo pipefail

PROYECTO=varman-crew
VM=varman-bot
ZONA=us-central1-a
REGION=us-central1
NOMBRE_IP=varman-bot-ip
REGLA_FW=varman-bot-permitir-web
ETIQUETA=varman-bot-web

echo "=== Red GCP del bot VarMan ($(date '+%Y-%m-%d %H:%M')) ==="
gcloud config set project "$PROYECTO" >/dev/null

# --- 1. IP estática (promover la efímera actual) ---
echo ""
echo "--- 1/3 IP estática ---"
if gcloud compute addresses describe "$NOMBRE_IP" --region="$REGION" >/dev/null 2>&1; then
  echo "[OK] La IP estática '$NOMBRE_IP' ya existía, no toco nada"
else
  IP_ACTUAL=$(gcloud compute instances describe "$VM" --zone="$ZONA" \
    --format='get(networkInterfaces[0].accessConfigs[0].natIP)')
  if [ -z "$IP_ACTUAL" ]; then
    echo "[FALLO] La VM $VM no tiene IP externa. ¿Está encendida? Enciéndela y reintenta."
    exit 1
  fi
  gcloud compute addresses create "$NOMBRE_IP" --region="$REGION" --addresses="$IP_ACTUAL"
  echo "[OK] IP $IP_ACTUAL promovida a estática con el nombre '$NOMBRE_IP'"
fi
IP_FIJA=$(gcloud compute addresses describe "$NOMBRE_IP" --region="$REGION" --format='get(address)')

# --- 2. Firewall: permitir 80 y 443 hacia la VM ---
echo ""
echo "--- 2/3 Firewall (TCP 80 y 443) ---"
if gcloud compute firewall-rules describe "$REGLA_FW" >/dev/null 2>&1; then
  echo "[OK] La regla '$REGLA_FW' ya existía"
else
  gcloud compute firewall-rules create "$REGLA_FW" \
    --direction=INGRESS --action=ALLOW --rules=tcp:80,tcp:443 \
    --source-ranges=0.0.0.0/0 --target-tags="$ETIQUETA" \
    --description="VarMan bot: HTTP para el reto de Let's Encrypt y HTTPS del webhook"
  echo "[OK] Regla '$REGLA_FW' creada (solo aplica a VMs con la etiqueta $ETIQUETA)"
fi
ETIQUETAS_VM=$(gcloud compute instances describe "$VM" --zone="$ZONA" --format='get(tags.items)')
if echo "$ETIQUETAS_VM" | grep -qw "$ETIQUETA"; then
  echo "[OK] La VM ya tiene la etiqueta $ETIQUETA"
else
  gcloud compute instances add-tags "$VM" --zone="$ZONA" --tags="$ETIQUETA"
  echo "[OK] Etiqueta $ETIQUETA agregada a la VM"
fi

# --- 3. Resultado ---
echo ""
echo "=================================================="
echo "LISTO. La IP FIJA del bot es:"
echo ""
echo "    $IP_FIJA"
echo ""
echo "ANÓTALA. Con esa IP, Cristhian crea en Cloudflare (con Cowork):"
echo "  Registro A · nombre: bot · IPv4: $IP_FIJA · Proxy: DNS ONLY (nube GRIS)"
echo "  (La nube GRIS es clave: si queda naranja, Caddy no puede sacar el certificado.)"
echo "Después sigue GUIA-GCP.md paso 3 (instalar la VM)."
echo "=================================================="
