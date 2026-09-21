#!/usr/bin/env bash
# ==========================================================
# VarMan Crew · COMPACTAR la base SQLite de n8n (domingos 2:30, cron de root)
#
# Por qué (10-sep-2026): la base pesaba 3.048 MB y 2.671 MB eran páginas vacías (freelist):
# la poda automática borra ejecuciones pero SQLite nunca devuelve el espacio. Una base de
# 3 GB en una VM de 1 GB de RAM y disco lento compite por la memoria con el runner de
# código, que termina en swap y tarda demasiado en despertar ("took too long to
# acknowledge", "Offer expired", "Task request timed out").
#
# Qué hace: mide el porcentaje libre; si es menor a 30 % NO hace nada (cero corte).
# Si toca (o FORZAR=1): para n8n -> VACUUM INTO un archivo nuevo (la base vieja no se
# toca) -> integrity_check del nuevo -> intercambio (la vieja queda de respaldo 7 días)
# -> arranca n8n -> espera healthz y el handshake. Misma receta que vacuum-into.sh del
# 9-ago, pero con python3 del host (sin red, sin alpine).
# Corte esperado: 5-12 min, de madrugada. Uso a mano: sudo FORZAR=1 bash compactar-base.sh
# ==========================================================
set -uo pipefail
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin HOME=/root
D=/home/varmansneakersandclothes/varman-bot
DATA=/var/lib/docker/volumes/varman-bot_n8n_data/_data
DB="$DATA/database.sqlite"; NUEVA="$DATA/database-nueva.sqlite"
FORZAR="${FORZAR:-0}"
echo "=================== $(date '+%F %T') compactar-base (FORZAR=$FORZAR) ==================="

# respaldos viejos de corridas anteriores: fuera a los 7 días
find "$DATA" -maxdepth 1 -name 'database-antes-*.sqlite' -mtime +7 -print -delete 2>/dev/null

MEDIDA=$(python3 - "$DB" <<'PY'
import sqlite3, sys
c = sqlite3.connect("file:" + sys.argv[1] + "?mode=ro", uri=True, timeout=5)
ps = c.execute("pragma page_size").fetchone()[0]
pc = c.execute("pragma page_count").fetchone()[0]
fl = c.execute("pragma freelist_count").fetchone()[0]
print(ps*pc//1048576, (100*fl//pc) if pc else 0)
PY
)
MB=${MEDIDA%% *}; PCT=${MEDIDA##* }
echo "base: ${MB} MB, ${PCT}% libre (freelist)"
if [ "$FORZAR" != "1" ] && [ "$PCT" -lt 30 ]; then echo "sana: no hace falta compactar. Fin."; exit 0; fi

LIBRE_MB=$(df -m / | awk 'NR==2{print $4}')
if [ "$LIBRE_MB" -lt $((MB + 1024)) ]; then echo "ALTO: solo hay ${LIBRE_MB} MB libres en disco. No compacto."; exit 1; fi

cd "$D" || { echo "ALTO: no existe $D"; exit 1; }
echo "--- parando n8n"; docker compose stop n8n
rm -f "$NUEVA"
echo "--- VACUUM INTO (puede tardar varios minutos)"
python3 - "$DB" "$NUEVA" <<'PY'
import sqlite3, sys
db, nueva = sys.argv[1], sys.argv[2]
c = sqlite3.connect(db, timeout=30); c.isolation_level = None
c.execute("PRAGMA wal_checkpoint(TRUNCATE)")
c.execute("VACUUM INTO ?", (nueva,)); c.close()
n = sqlite3.connect(nueva)
r = n.execute("PRAGMA integrity_check").fetchone()[0]
act = n.execute("select count(*) from workflow_entity where active=1").fetchone()[0]
ex = n.execute("select count(*) from execution_entity").fetchone()[0]
print("integrity_check=%s workflows_activos=%d ejecuciones=%d" % (r, act, ex))
sys.exit(0 if r == "ok" and act >= 1 else 1)
PY
RC=$?
if [ $RC -ne 0 ] || [ ! -s "$NUEVA" ]; then
  echo "FALLO en VACUUM INTO (rc=$RC): arranco n8n con la base vieja tal cual"
  rm -f "$NUEVA"; docker compose up -d n8n; exit 1
fi
echo "--- intercambio"
HOY=$(date +%F)
chown --reference="$DB" "$NUEVA"; chmod --reference="$DB" "$NUEVA"
mv "$DB" "$DATA/database-antes-$HOY.sqlite"
rm -f "$DB-wal" "$DB-shm"
mv "$NUEVA" "$DB"
ls -lh "$DATA"/database*.sqlite; df -h / | tail -1
echo "--- arrancando n8n"; docker compose up -d n8n
T0=$(date +%s); SALUD=NO
for i in $(seq 1 90); do
  [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:5678/healthz)" = "200" ] && { SALUD=SI; break; }
  sleep 10
done
echo "healthz=$SALUD en $(( $(date +%s) - T0 ))s"
WEB=NO
for i in $(seq 1 60); do
  R=$(curl -s --max-time 15 "http://127.0.0.1:5678/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=NO_ES&hub.challenge=COMPACTAR" || true)
  case "$R" in *"token invalido"*) WEB=SI; break;; esac
  sleep 10
done
echo "webhook activo=$WEB en $(( $(date +%s) - T0 ))s desde el arranque"
docker ps --format '{{.Names}} {{.Status}}'
if [ "$FORZAR" = "1" ]; then
  # la corrida forzada de una sola vez se quita del crontab; la semanal queda
  crontab -l 2>/dev/null | grep -v 'FORZAR=1 bash /home/andre/compactar-base.sh' | crontab -
  echo "línea de una sola vez retirada del crontab"
fi
echo "=================== fin $(date '+%F %T') ==================="
