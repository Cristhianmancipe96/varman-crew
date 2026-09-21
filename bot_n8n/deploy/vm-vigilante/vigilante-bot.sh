#!/usr/bin/env bash
# ==========================================================
# VarMan Crew · VIGILANTE del bot (corre cada 5 min por cron de root)
#
# Por qué existe (10-sep-2026): el bot se "paraba" hasta que el dueño entraba a n8n y
# cancelaba ejecuciones zombis (en "running" por horas). Las zombis ocupan los cupos del
# runner de código (5) y las demás quedan esperando -> timeouts -> Meta recibe 502 y el
# cliente no recibe respuesta. Nadie reiniciaba n8n solo: el healthcheck de Docker no
# reinicia nada y /healthz responde 200 aunque el webhook esté colgado.
#
# Qué hace, en orden, cada 5 minutos:
#   1. Si el contenedor no está corriendo -> docker compose up -d.
#   2. Si lleva menos de 10 min arrancado -> no juzga (recién arrancado tarda hasta 8 min).
#   3. Handshake del webhook con token FALSO (la única prueba válida; no gasta Gemini):
#        "token invalido" = vivo · "Cannot GET" = workflow sin publicar (avisa, NO reinicia)
#        · timeout/otra cosa = fallo.
#   4. Cuenta ejecuciones zombis (running/new con más de 20 min) leyendo la base en SOLO
#      LECTURA con python (sin docker, sin red).
#   5. Reinicia n8n SOLO si: el webhook falló 2 chequeos seguidos (>=10 min muerto), o hay
#      >=2 zombis en 2 chequeos seguidos y no hay conversación en curso (o llevan >30 min).
#      Frenos: 20 min entre reinicios, máximo 4 reinicios por día.
#   Todo queda en /var/log/varman-vigilante.log.
#
# Apagarlo: comentar su línea en `sudo crontab -e`. Ver: tail -50 /var/log/varman-vigilante.log
# ==========================================================
set -uo pipefail
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin HOME=/root
D=/home/varmansneakersandclothes/varman-bot
DB=/var/lib/docker/volumes/varman-bot_n8n_data/_data/database.sqlite
LOG=/var/log/varman-vigilante.log
EST=/var/lib/varman-vigilante
mkdir -p "$EST"
exec 9>/var/lock/varman-vigilante.lock
flock -n 9 || exit 0            # si el chequeo anterior sigue corriendo, este no arranca

log(){ echo "$(date '+%F %T') $*" >> "$LOG"; }
leer(){ cat "$EST/$1" 2>/dev/null || echo "${2:-0}"; }
guardar(){ echo "$2" > "$EST/$1"; }

# --- 1. ¿está el contenedor? ---
if ! docker ps --format '{{.Names}}' | grep -qx varman-n8n; then
  log "ALERTA: varman-n8n no está corriendo -> docker compose up -d n8n"
  (cd "$D" && docker compose up -d n8n) >> "$LOG" 2>&1
  guardar fallos 0; guardar zseg 0
  exit 0
fi

# --- 2. ¿recién arrancado? ---
arranque=$(docker inspect varman-n8n --format '{{.State.StartedAt}}')
edad=$(( $(date +%s) - $(date -d "$arranque" +%s) ))
if [ "$edad" -lt 600 ]; then log "arrancando (${edad}s desde el start); no juzgo todavía"; exit 0; fi

# --- 3. handshake con token falso ---
t0=$(date +%s)
R=$(curl -s --max-time 90 "http://127.0.0.1:5678/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=NO_ES&hub.challenge=VIGILANTE" 2>/dev/null || echo "TIMEOUT")
dt=$(( $(date +%s) - t0 ))
case "$R" in
  *"token invalido"*) estado=ok ;;
  *"Cannot GET"*)     estado=inactivo ;;
  *)                  estado=fallo ;;
esac

# --- 4. zombis y conversaciones en curso (solo lectura) ---
SALIDA=$(python3 - "$DB" 2>/dev/null <<'PY'
import sqlite3, sys
try:
    c = sqlite3.connect("file:" + sys.argv[1] + "?mode=ro", uri=True, timeout=3)
    z = c.execute("select count(*) from execution_entity where status in ('running','new') and startedAt < datetime('now','-20 minutes')").fetchone()[0]
    r = c.execute("select count(*) from execution_entity where startedAt >= datetime('now','-3 minutes')").fetchone()[0]
    print(z, r)
except Exception:
    print(-1, -1)
PY
)
[ -n "$SALIDA" ] || SALIDA="-1 -1"
Z=${SALIDA%% *}; RECIENTES=${SALIDA##* }

# --- 5. decidir ---
fallos=$(leer fallos); zseg=$(leer zseg)
if [ "$estado" = ok ]; then fallos=0; else fallos=$((fallos+1)); fi
if [ "$Z" -ge 2 ]; then zseg=$((zseg+1)); else zseg=0; fi
guardar fallos "$fallos"; guardar zseg "$zseg"

if [ "$estado" = inactivo ]; then
  log "ALERTA: el workflow está SIN PUBLICAR (Cannot GET). Un reinicio no lo arregla: hay que publicarlo (ver PASOS-V12.2)."
  exit 0
fi

motivo=""
if [ "$fallos" -ge 2 ]; then
  motivo="webhook sin responder en $fallos chequeos seguidos (último: $estado en ${dt}s)"
elif [ "$zseg" -ge 2 ]; then
  if [ "$RECIENTES" -gt 0 ] && [ "$zseg" -lt 6 ]; then
    log "AVISO: $Z zombis pero hay $RECIENTES ejecución(es) en los últimos 3 min; espero (zseg=$zseg)"
    exit 0
  fi
  motivo="$Z ejecuciones zombis (>20 min en running) en $zseg chequeos seguidos"
fi

if [ -z "$motivo" ]; then
  extra=""; [ "$dt" -ge 30 ] && extra=" LENTO"
  log "OK ${dt}s zombis=$Z recientes=$RECIENTES fallos=$fallos$extra"
  exit 0
fi

# frenos
ahora=$(date +%s); ultimo=$(leer ultimo_reinicio); hoy=$(date +%F)
[ "$(leer dia_reinicios x)" = "$hoy" ] || { guardar dia_reinicios "$hoy"; guardar n_reinicios 0; }
n=$(leer n_reinicios)
if [ $((ahora - ultimo)) -lt 1200 ]; then log "QUIERO REINICIAR ($motivo) pero el último reinicio fue hace $(( (ahora-ultimo)/60 )) min; espero"; exit 0; fi
if [ "$n" -ge 4 ]; then log "QUIERO REINICIAR ($motivo) pero ya van $n reinicios hoy; NO reinicio más. Revisar a mano."; exit 0; fi

log "REINICIO n8n: $motivo"
(cd "$D" && docker compose restart n8n) >> "$LOG" 2>&1
guardar ultimo_reinicio "$ahora"; guardar n_reinicios $((n+1)); guardar fallos 0; guardar zseg 0
log "reinicio pedido (#$((n+1)) de hoy). Tarda hasta 8 min en volver; el próximo juicio será pasados 10 min."

# recorte del log para que no crezca sin fin
if [ "$(wc -l < "$LOG")" -gt 6000 ]; then tail -n 4000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"; fi
