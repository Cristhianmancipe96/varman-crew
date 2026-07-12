#!/usr/bin/env bash
# ==========================================================
# VarMan Crew · Bot WhatsApp — chequeo de salud (n8n + Caddy)
#
# Uso (en la VM, dentro de ~/varman-bot):
#   bash verificar-salud.sh
#
# Revisa, en orden:
#   1. Que Docker este corriendo
#   2. Que los contenedores n8n y caddy esten arriba
#   3. Que n8n responda /healthz dentro de la VM
#   4. Que el bot responda por HTTPS desde INTERNET (certificado OK)
#   5. Que el webhook responda el reto de Meta con el token BUENO (200)
#   6. Que el webhook RECHACE un token MALO (403)
# ==========================================================

set -u
cd "$(dirname "$0")"

OK=0
FALLOS=0
AVISOS=0

ok()    { printf '  \033[32m[OK]\033[0m %s\n' "$1"; OK=$((OK+1)); }
fallo() { printf '  \033[31m[FALLO]\033[0m %s\n' "$1"; FALLOS=$((FALLOS+1)); }
aviso() { printf '  \033[33m[AVISO]\033[0m %s\n' "$1"; AVISOS=$((AVISOS+1)); }

echo "=== Chequeo de salud del bot VarMan ($(date '+%Y-%m-%d %H:%M')) ==="

# Cargar variables del .env (WEBHOOK_URL y WEBHOOK_VERIFY_TOKEN)
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env 2>/dev/null || true
  set +a
else
  aviso "No encontre el archivo .env en esta carpeta (algunos chequeos se saltan)"
fi

# 1) Docker corriendo
if docker info >/dev/null 2>&1; then
  ok "Docker esta corriendo"
else
  fallo "Docker NO responde. Prueba: sudo systemctl start docker"
  echo "Sin Docker no se puede seguir. Saliendo."
  exit 1
fi

# 2) Contenedores arriba
for CONT in varman-n8n varman-caddy; do
  ESTADO=$(docker inspect -f '{{.State.Status}}' "$CONT" 2>/dev/null || echo "no-existe")
  if [ "$ESTADO" = "running" ]; then
    ok "Contenedor $CONT esta corriendo"
  else
    fallo "Contenedor $CONT esta '$ESTADO'. Prueba: docker compose up -d"
  fi
done

# 3) n8n /healthz local (dentro de la VM)
if curl -fsS -m 10 http://127.0.0.1:5678/healthz >/dev/null 2>&1; then
  ok "n8n responde /healthz en la VM (puerto 5678)"
else
  fallo "n8n NO responde en http://127.0.0.1:5678/healthz. Mira: docker logs varman-n8n --tail 50"
fi

# 4) URL publica por HTTPS (DNS + certificado Let's Encrypt + Caddy + n8n)
if [ -n "${WEBHOOK_URL:-}" ]; then
  BASE="${WEBHOOK_URL%/}"
  if curl -fsS -m 20 "$BASE/healthz" >/dev/null 2>&1; then
    ok "El bot responde desde internet con HTTPS valido: $BASE/healthz"
  else
    fallo "La URL publica NO responde: $BASE/healthz"
    echo "         Pistas: ¿el registro A 'bot' apunta a la IP fija y esta en DNS ONLY (nube gris)?"
    echo "         ¿Puertos 80/443 abiertos en GCP? (bash gcp-configurar-red.sh en Cloud Shell)"
    echo "         Certificado: docker logs varman-caddy --tail 50"
  fi
else
  aviso "WEBHOOK_URL no esta en el .env: me salto el chequeo de la URL publica"
fi

# 5) Reto de verificacion del webhook con el token BUENO (igual que Meta)
if [ -n "${WEBHOOK_URL:-}" ] && [ -n "${WEBHOOK_VERIFY_TOKEN:-}" ]; then
  BASE="${WEBHOOK_URL%/}"
  RETO="ping-salud-$$"
  RESPUESTA=$(curl -fsS -m 20 "$BASE/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=$WEBHOOK_VERIFY_TOKEN&hub.challenge=$RETO" 2>/dev/null || echo "__ERROR__")
  if [ "$RESPUESTA" = "$RETO" ]; then
    ok "El webhook devolvio el reto de Meta correctamente (workflow activo)"
  elif [ "$RESPUESTA" = "__ERROR__" ]; then
    aviso "El webhook /webhook/whatsapp no respondio. Si aun no importaste/activaste el workflow en n8n, es normal. Si ya esta activo, espera ~1 min tras arrancar n8n y reintenta."
  else
    fallo "El webhook respondio algo distinto al reto (¿verify token diferente entre .env y el workflow?)"
  fi

  # 6) El mismo reto con un token MALO debe dar 403 (seguridad)
  CODIGO=$(curl -s -o /dev/null -w '%{http_code}' -m 20 "$BASE/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=token-equivocado&hub.challenge=$RETO" 2>/dev/null || echo "000")
  if [ "$CODIGO" = "403" ]; then
    ok "El webhook rechaza un token malo con 403 (como debe ser)"
  elif [ "$CODIGO" = "000" ]; then
    aviso "No pude probar el token malo (sin respuesta). Reintenta en 1 min."
  else
    fallo "Con token malo respondio HTTP $CODIGO en vez de 403. Revisa el nodo 'Verificar token' del workflow."
  fi
else
  aviso "Faltan WEBHOOK_URL o WEBHOOK_VERIFY_TOKEN en el .env: me salto los chequeos del webhook"
fi

echo "=================================================="
echo "Resultado: $OK bien · $AVISOS avisos · $FALLOS fallos"
if [ "$FALLOS" -eq 0 ]; then
  echo "Todo lo importante esta BIEN."
  exit 0
else
  echo "Hay fallos: revisa las lineas [FALLO] de arriba."
  exit 1
fi
