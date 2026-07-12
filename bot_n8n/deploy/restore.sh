#!/usr/bin/env bash
# ==========================================================
# VarMan Crew · Bot WhatsApp — restaurar un respaldo
#
# Restaura lo que hizo backup.sh:
#   - env.enc            -> lo descifra y lo deja como .env
#   - workflows/*.json   -> los re-importa en n8n (con n8n detenido,
#                           regla del lock de SQLite) y activa el v4
#   - datos-n8n.tar.gz   -> (solo si existe y se pide --con-volumen)
#                           restaura el volumen entero de n8n
#
# Necesita la clave ~/.varman-backup.pass (la misma con la que se
# cifró; si la VM es nueva, cópiala desde el PC:
# bot_n8n\credenciales\clave-backup-vm.txt).
#
# Uso (en la VM, dentro de ~/varman-bot):
#   bash restore.sh                                # usa el respaldo MÁS RECIENTE
#   bash restore.sh ~/backups-bot/respaldo-2026-07-14_0300
#   bash restore.sh --con-volumen                  # además restaura la base entera
#
# El .env actual (si existe) se guarda como .env.antes-de-restaurar
# — nada se pierde.
# ==========================================================

set -euo pipefail
cd "$(dirname "$0")"

DIR_BACKUPS="$HOME/backups-bot"
ARCHIVO_CLAVE="$HOME/.varman-backup.pass"

CON_VOLUMEN=no
ORIGEN=""
for ARG in "$@"; do
  case "$ARG" in
    --con-volumen) CON_VOLUMEN=si ;;
    *) ORIGEN="$ARG" ;;
  esac
done

# --- 0. Elegir el respaldo ---
if [ -z "$ORIGEN" ]; then
  ORIGEN=$(ls -1d "$DIR_BACKUPS"/respaldo-* 2>/dev/null | sort | tail -n 1 || true)
  if [ -z "$ORIGEN" ]; then
    echo "[FALLO] No hay respaldos en $DIR_BACKUPS. Pasa la ruta de uno: bash restore.sh /ruta/al/respaldo"
    exit 1
  fi
fi
if [ ! -d "$ORIGEN" ]; then
  echo "[FALLO] No existe la carpeta de respaldo: $ORIGEN"
  echo "Disponibles:"; ls -1d "$DIR_BACKUPS"/respaldo-* 2>/dev/null || echo "  (ninguno)"
  exit 1
fi
echo "=== Restaurar respaldo: $ORIGEN — $(date '+%Y-%m-%d %H:%M') ==="

# --- 1. Descifrar el .env ---
if [ -f "$ORIGEN/env.enc" ]; then
  if [ ! -f "$ARCHIVO_CLAVE" ]; then
    echo "[FALLO] Falta la clave $ARCHIVO_CLAVE."
    echo "Cópiala desde el PC (bot_n8n\\credenciales\\clave-backup-vm.txt):"
    echo "  súbela con el botón SUBIR ARCHIVO del SSH del navegador y luego:"
    echo "  mv ~/clave-backup-vm.txt $ARCHIVO_CLAVE && chmod 600 $ARCHIVO_CLAVE"
    exit 1
  fi
  if [ -f ./.env ]; then
    cp ./.env ./.env.antes-de-restaurar
    echo "[OK] El .env actual quedó guardado como .env.antes-de-restaurar"
  fi
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
    -in "$ORIGEN/env.enc" -out ./.env -pass file:"$ARCHIVO_CLAVE"
  chmod 600 ./.env
  echo "[OK] .env restaurado (descifrado)"
else
  echo "[AVISO] El respaldo no trae env.enc: dejo el .env actual como está"
fi

# --- 2. (Opcional) restaurar el volumen entero de n8n ---
if [ "$CON_VOLUMEN" = "si" ]; then
  if [ -f "$ORIGEN/datos-n8n.tar.gz" ]; then
    echo "--- Restaurando el volumen completo (n8n se detiene un momento) ---"
    docker compose stop n8n
    docker run --rm -v varman-bot_n8n_data:/datos -v "$ORIGEN":/backup alpine \
      sh -c 'rm -rf /datos/* && tar xzf /backup/datos-n8n.tar.gz -C /datos'
    echo "[OK] Volumen de n8n restaurado desde datos-n8n.tar.gz"
  else
    echo "[AVISO] Pediste --con-volumen pero el respaldo no trae datos-n8n.tar.gz (se hace con backup.sh --completo). Sigo sin él."
  fi
fi

# --- 3. Re-importar los workflows del respaldo ---
N_WF=$(ls "$ORIGEN/workflows"/*.json 2>/dev/null | wc -l)
if [ "$N_WF" -gt 0 ]; then
  echo "--- Re-importando $N_WF workflows (n8n se detiene ~1-2 min) ---"
  docker compose stop n8n
  for F in "$ORIGEN/workflows"/*.json; do
    echo "  importando $(basename "$F") ..."
    docker run --rm -u node \
      --env-file ./.env \
      -v varman-bot_n8n_data:/home/node/.n8n \
      -v "$ORIGEN/workflows":/restaurar:ro \
      docker.n8n.io/n8nio/n8n:2.28.6 \
      import:workflow --input="/restaurar/$(basename "$F")"
  done
  # Dejar activo SOLO el v4 (mismo criterio que importar-workflows.sh)
  # (el entrypoint de la imagen ya antepone "n8n": aquí solo van los subcomandos)
  for ID in VarmanEcoBot0001 VarmanBotV3Gem01 VarmanBotV2Cat01; do
    docker run --rm -u node --env-file ./.env -v varman-bot_n8n_data:/home/node/.n8n \
      docker.n8n.io/n8nio/n8n:2.28.6 update:workflow --id="$ID" --active=false >/dev/null 2>&1 || true
  done
  docker run --rm -u node --env-file ./.env -v varman-bot_n8n_data:/home/node/.n8n \
    docker.n8n.io/n8nio/n8n:2.28.6 update:workflow --id=VarmanBotV4Ped01 --active=true >/dev/null 2>&1 \
    && echo "[OK] Workflow v4 (VarmanBotV4Ped01) activo" \
    || echo "[AVISO] No pude activar VarmanBotV4Ped01 (¿no estaba en el respaldo?). Actívalo en el editor web."
else
  echo "[AVISO] El respaldo no trae workflows: no re-importo nada"
fi

# --- 4. Arrancar todo de nuevo ---
echo "--- Arrancando el bot ---"
docker compose up -d
printf "  esperando a que n8n responda"
SANO=no
for _ in $(seq 1 30); do
  if curl -fsS -m 5 http://127.0.0.1:5678/healthz >/dev/null 2>&1; then SANO=si; break; fi
  printf "."
  sleep 5
done
echo ""
if [ "$SANO" = "si" ]; then
  echo "[OK] n8n responde. Los webhooks tardan ~30-60s más en registrarse."
  echo "Comprueba todo con: bash verificar-salud.sh"
else
  echo "[FALLO] n8n no respondió en 150s. Mira: docker logs varman-n8n --tail 50"
  exit 1
fi
