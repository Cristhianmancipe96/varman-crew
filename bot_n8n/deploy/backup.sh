#!/usr/bin/env bash
# ==========================================================
# VarMan Crew · Bot WhatsApp — respaldo diario
#
# Qué respalda (en ~/backups-bot/respaldo-FECHA/):
#   - workflows/*.json  -> exportados del n8n VIVO (la fuente de
#                          verdad por si se editó algo en el editor web)
#   - env.enc           -> el .env CIFRADO con AES-256 (los secretos
#                          nunca quedan en claro dentro del respaldo)
#   - datos-n8n.tar.gz  -> (solo con --completo) el volumen entero de
#                          n8n: base SQLite + clave de cifrado interna
#
# La clave del cifrado vive en ~/.varman-backup.pass
# (se genera sola la primera vez). SIN ESA CLAVE EL .env DEL
# RESPALDO NO SE PUEDE RECUPERAR: guárdala también en el PC, en
# bot_n8n\credenciales\clave-backup-vm.txt
#
# Uso (en la VM, dentro de ~/varman-bot):
#   bash backup.sh                    # respaldo normal
#   bash backup.sh --completo         # además, el volumen entero de n8n
#   bash backup.sh --instalar-cron    # respaldo AHORA + cron diario 3:00 am
#
# Guarda los últimos 14 respaldos; los más viejos se borran solos.
#
# Nota técnica: la exportación usa la CLI dentro del contenedor que ya
# corre (docker compose exec). Exportar SOLO LEE la base — la regla de
# "CLI con n8n apagado" aplica a import/activar, que sí ESCRIBEN.
# Así el respaldo nocturno no tumba el bot ni un segundo.
# ==========================================================

set -euo pipefail
cd "$(dirname "$0")"

DIR_BACKUPS="$HOME/backups-bot"
ARCHIVO_CLAVE="$HOME/.varman-backup.pass"
CONSERVAR=14

MODO_COMPLETO=no
INSTALAR_CRON=no
for ARG in "$@"; do
  case "$ARG" in
    --completo)      MODO_COMPLETO=si ;;
    --instalar-cron) INSTALAR_CRON=si ;;
    *) echo "[FALLO] Opción desconocida: $ARG (válidas: --completo, --instalar-cron)"; exit 1 ;;
  esac
done

echo "=== Respaldo del bot VarMan — $(date '+%Y-%m-%d %H:%M') ==="

# --- 0. Clave de cifrado (se crea sola la primera vez) ---
if [ ! -f "$ARCHIVO_CLAVE" ]; then
  ( umask 177; openssl rand -base64 32 > "$ARCHIVO_CLAVE" )
  echo ""
  echo "##################################################################"
  echo "#  SE GENERÓ LA CLAVE DE CIFRADO DE LOS RESPALDOS (primera vez). #"
  echo "#  Cópiala AHORA al PC, en:                                      #"
  echo "#    bot_n8n\\credenciales\\clave-backup-vm.txt                   #"
  echo "#  Sin ella, el .env de los respaldos NO se puede recuperar      #"
  echo "#  si esta VM se pierde. La clave es:                            #"
  echo "##################################################################"
  cat "$ARCHIVO_CLAVE"
  echo "##################################################################"
  echo ""
fi

# --- 1. Carpeta del respaldo de hoy ---
DESTINO="$DIR_BACKUPS/respaldo-$(date '+%Y-%m-%d_%H%M')"
mkdir -p "$DESTINO/workflows"

# --- 2. Exportar los workflows del n8n vivo ---
if docker inspect -f '{{.State.Status}}' varman-n8n 2>/dev/null | grep -qx running; then
  docker compose exec -T -u node n8n sh -c 'rm -rf /tmp/wf-backup && mkdir -p /tmp/wf-backup && n8n export:workflow --backup --output=/tmp/wf-backup/' >/dev/null
  docker cp -q varman-n8n:/tmp/wf-backup/. "$DESTINO/workflows/"
  docker compose exec -T -u node n8n rm -rf /tmp/wf-backup
  N_WF=$(ls "$DESTINO/workflows"/*.json 2>/dev/null | wc -l)
  echo "[OK] $N_WF workflows exportados del n8n vivo"
else
  # n8n apagado: al menos copiar los .json fuente de la carpeta
  if [ -d ./workflows ]; then
    cp ./workflows/*.json "$DESTINO/workflows/" 2>/dev/null || true
    echo "[AVISO] n8n no está corriendo: copié los .json de ./workflows en su lugar"
  else
    echo "[AVISO] n8n apagado y sin carpeta ./workflows: respaldo SIN workflows"
  fi
fi

# --- 3. Cifrar el .env ---
if [ -f ./.env ]; then
  openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt \
    -in ./.env -out "$DESTINO/env.enc" -pass file:"$ARCHIVO_CLAVE"
  echo "[OK] .env cifrado -> env.enc (AES-256)"
else
  echo "[AVISO] No hay .env en esta carpeta: respaldo sin secretos"
fi

# --- 4. (Opcional) volumen entero de n8n ---
if [ "$MODO_COMPLETO" = "si" ]; then
  docker run --rm -v varman-bot_n8n_data:/datos -v "$DESTINO":/backup alpine \
    tar czf /backup/datos-n8n.tar.gz -C /datos . >/dev/null
  echo "[OK] Volumen completo de n8n -> datos-n8n.tar.gz"
fi

# --- 5. Rotación: conservar solo los últimos $CONSERVAR ---
VIEJOS=$(ls -1d "$DIR_BACKUPS"/respaldo-* 2>/dev/null | sort | head -n -"$CONSERVAR" || true)
if [ -n "$VIEJOS" ]; then
  echo "$VIEJOS" | while read -r V; do rm -rf "$V"; done
  echo "[OK] Rotación: borrados $(echo "$VIEJOS" | wc -l) respaldos viejos (conservo $CONSERVAR)"
fi

echo "[OK] Respaldo listo en: $DESTINO ($(du -sh "$DESTINO" | cut -f1))"

# --- 6. (Opcional) instalar el cron diario ---
if [ "$INSTALAR_CRON" = "si" ]; then
  LINEA="0 3 * * * cd $HOME/varman-bot && bash backup.sh >> $HOME/backups-bot/backup.log 2>&1"
  if crontab -l 2>/dev/null | grep -qF "backup.sh"; then
    echo "[OK] El cron del respaldo ya estaba instalado"
  else
    ( crontab -l 2>/dev/null; echo "$LINEA" ) | crontab -
    echo "[OK] Cron instalado: respaldo diario a las 3:00 am (hora Colombia)"
  fi
  echo "     Ver el registro: tail $HOME/backups-bot/backup.log"
fi

echo ""
echo "Para bajar un respaldo al PC: en el SSH del navegador de GCP,"
echo "menú DESCARGAR ARCHIVO. Como es una carpeta, primero empácala:"
echo "  tar czf ~/respaldo-para-bajar.tar.gz -C $DIR_BACKUPS $(basename "$DESTINO")"
