#!/usr/bin/env bash
# ==========================================================
# VarMan Crew · Bot WhatsApp — importar workflows por CLI
#
# Automatiza el paso 6 de GUIA-GCP.md respetando la regla del
# proyecto: la CLI de n8n NUNCA se usa con el n8n principal
# corriendo (lock de SQLite). Por eso este script:
#   1. Detiene el contenedor n8n (Caddy sigue arriba, no pasa nada).
#   2. Importa los .json en un contenedor temporal (run --rm).
#   3. Activa el v4 y desactiva el eco.
#   4. Vuelve a arrancar n8n y espera a que esté sano.
#
# Uso (en la VM, dentro de ~/varman-bot):
#   bash importar-workflows.sh                     # importa TODO workflows/ y activa el v4
#   bash importar-workflows.sh --sin-activar       # solo importa, no activa nada
#   bash importar-workflows.sh --activar <ID>      # activa otro workflow (ej. VarmanEcoBot0001)
#
# IDs conocidos (definidos dentro de cada .json):
#   VarmanBotV4Ped01  bot-whatsapp-v4-pedidos.json  <- EL BOT COMPLETO Fase 1
#   VarmanEcoBot0001  bot-whatsapp-eco.json         <- eco de pruebas
#   VarmanBotV3Gem01  bot-whatsapp-v3-gemini.json   <- respaldo intermedio
#   VarmanBotV2Cat01  bot-whatsapp-catalogo.json    <- respaldo catálogo
#
# OJO: todos comparten el path /webhook/whatsapp -> SOLO UNO
# puede estar activo a la vez. Este script deja activo SOLO el
# que se pida (por defecto el v4).
# ==========================================================

set -euo pipefail
cd "$(dirname "$0")"

ID_ACTIVAR="VarmanBotV4Ped01"
if [ "${1:-}" = "--sin-activar" ]; then
  ID_ACTIVAR=""
elif [ "${1:-}" = "--activar" ]; then
  ID_ACTIVAR="${2:?Falta el ID. Ejemplo: bash importar-workflows.sh --activar VarmanEcoBot0001}"
fi

# El contenedor temporal usa el mismo compose: mismo volumen n8n_data,
# mismo .env y la carpeta ./workflows montada en /workflows (solo lectura).
# OJO: el entrypoint de la imagen ya antepone el binario "n8n" — aquí solo
# van los subcomandos (import:workflow, update:workflow...). Un "n8n" de más
# da: Error: Command "n8n" not found (bug encontrado en la prueba local 06-jul).
cli() { docker compose run --rm --no-deps -u node n8n "$@"; }

# --- 0. Comprobaciones ---
if ! docker compose config --services 2>/dev/null | grep -qx n8n; then
  echo "[FALLO] No encuentro el servicio n8n. Corre esto dentro de ~/varman-bot (donde está docker-compose.yml)."
  exit 1
fi
if [ ! -d ./workflows ]; then
  echo "[FALLO] No existe la carpeta ./workflows. Viene dentro de varman-bot-vm.tar.gz (GUIA-GCP.md paso 4)."
  exit 1
fi
CUANTOS=$(ls ./workflows/*.json 2>/dev/null | wc -l)
if [ "$CUANTOS" -eq 0 ]; then
  echo "[FALLO] La carpeta ./workflows no tiene ningún .json."
  exit 1
fi
echo "=== Importar workflows ($CUANTOS archivos) — $(date '+%Y-%m-%d %H:%M') ==="

# --- 1. Detener n8n (regla del lock de SQLite) ---
echo "--- 1/4 Deteniendo n8n (el bot queda fuera de línea ~1-2 min) ---"
docker compose stop n8n

# --- 2. Importar todos los .json de ./workflows ---
echo "--- 2/4 Importando ---"
for F in ./workflows/*.json; do
  NOMBRE=$(basename "$F")
  echo "  importando $NOMBRE ..."
  cli import:workflow --input="/workflows/$NOMBRE"
done

# --- 3. Dejar activo SOLO el pedido ---
echo "--- 3/4 Estados activo/inactivo ---"
if [ -n "$ID_ACTIVAR" ]; then
  # Primero desactivar los conocidos (ignorando los que no existan aún)
  for ID in VarmanBotV4Ped01 VarmanEcoBot0001 VarmanBotV3Gem01 VarmanBotV2Cat01; do
    if [ "$ID" != "$ID_ACTIVAR" ]; then
      cli update:workflow --id="$ID" --active=false >/dev/null 2>&1 || true
    fi
  done
  cli update:workflow --id="$ID_ACTIVAR" --active=true
  echo "  [OK] Activo: $ID_ACTIVAR (los demás quedaron inactivos)"
else
  echo "  [OK] Importado sin activar nada (--sin-activar)"
fi

# --- 4. Arrancar n8n de nuevo y esperar a que esté sano ---
echo "--- 4/4 Arrancando n8n ---"
docker compose start n8n
printf "  esperando a que n8n responda"
SANO=no
for _ in $(seq 1 30); do
  if curl -fsS -m 5 http://127.0.0.1:5678/healthz >/dev/null 2>&1; then SANO=si; break; fi
  printf "."
  sleep 5
done
echo ""
if [ "$SANO" = "si" ]; then
  echo "[OK] n8n responde /healthz."
  echo "RECUERDA: los webhooks tardan ~30-60 segundos MÁS en registrarse."
  echo "Comprueba todo con: bash verificar-salud.sh"
else
  echo "[FALLO] n8n no respondió en 150s. Mira los logs: docker logs varman-n8n --tail 50"
  exit 1
fi
