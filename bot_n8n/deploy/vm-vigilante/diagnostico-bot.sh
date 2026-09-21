#!/usr/bin/env bash
# Diagnóstico SOLO LECTURA del bot VarMan en la VM. No reinicia nada, no toca el .env.
set -uo pipefail
sec(){ echo; echo "=================== $1 ==================="; }

sec "FECHA / UPTIME / CARGA"
date; uptime; echo "ultimos arranques de la VM:"; last -x reboot 2>/dev/null | head -8

sec "MEMORIA Y SWAP"
free -m
echo "--- vmstat swap (si/so):"; vmstat 1 2 | tail -1

sec "DISCO"
df -h / /var/lib/docker 2>/dev/null

sec "OOM-KILLER / kernel (ultimos 14 dias)"
journalctl -k --since "14 days ago" --no-pager 2>/dev/null | grep -i -E "out of memory|oom|killed process" | tail -20
echo "--- dmesg:"; dmesg 2>/dev/null | grep -i -E "out of memory|oom|killed process" | tail -10

sec "DOCKER: contenedores (estado, salud)"
docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.RunningFor}}\t{{.Image}}'

sec "DOCKER: inspect n8n (reinicios, politica, arranque, OOMKilled, salud)"
docker inspect varman-n8n --format 'RestartCount={{.RestartCount}}  Policy={{.HostConfig.RestartPolicy.Name}}  StartedAt={{.State.StartedAt}}  FinishedAt={{.State.FinishedAt}}  ExitCode={{.State.ExitCode}}  OOMKilled={{.State.OOMKilled}}  Health={{if .State.Health}}{{.State.Health.Status}} fallos={{.State.Health.FailingStreak}}{{end}}'
echo "--- ultimos healthchecks:"
docker inspect varman-n8n --format '{{range .State.Health.Log}}{{.Start}} exit={{.ExitCode}} {{printf "%.80s" .Output}}{{"\n"}}{{end}}' 2>/dev/null | tail -6
echo "--- caddy:"
docker inspect varman-caddy --format 'RestartCount={{.RestartCount}}  Policy={{.HostConfig.RestartPolicy.Name}}  StartedAt={{.State.StartedAt}}  OOMKilled={{.State.OOMKilled}}'

sec "DOCKER: eventos de los ultimos 7 dias (die/start/oom/restart/health)"
docker events --since "$(date -d '7 days ago' +%Y-%m-%dT%H:%M:%S)" --until "$(date +%Y-%m-%dT%H:%M:%S)" --filter type=container --format '{{.Time}} {{.Actor.Attributes.name}} {{.Action}} exit={{.Actor.Attributes.exitCode}}' 2>/dev/null | grep -v -E " exec_(create|start|die)" | grep -E "die|start|oom|restart|kill|health_status: unhealthy" | tail -40

sec "DOCKER: stats instantaneo"
docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}'

sec "N8N: logs (errores / desactivaciones / memoria) ultimos 7 dias"
docker logs --since 168h varman-n8n 2>&1 | grep -i -E "deactivat|could not be activated|activation|error|fatal|heap|memory|ECONNRESET|SQLITE|timeout|shutting down|Graceful|n8n ready|Initializing" | grep -v -i "DeprecationWarning" | tail -60

sec "N8N: ultimas 25 lineas del log"
docker logs --tail 25 varman-n8n 2>&1

sec "N8N: variables de entorno relevantes (sin secretos)"
docker exec varman-n8n printenv 2>/dev/null | grep -E "^(EXECUTIONS_|N8N_CONCURRENCY|N8N_RUNNERS|DB_SQLITE|N8N_DEFAULT_BINARY|NODE_OPTIONS|N8N_PAYLOAD|N8N_LOG|GENERIC_TIMEZONE|WEBHOOK_URL|N8N_HOST|BOT_SILENCIO|BOT_CEREBRO)" | sort

sec "N8N: handshake del webhook (token falso a proposito)"
curl -s -m 20 -o /tmp/hs.txt -w 'HTTP %{http_code} en %{time_total}s\n' "http://127.0.0.1:5678/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=NO_ES&hub.challenge=X"; echo "cuerpo: $(head -c 120 /tmp/hs.txt)"
echo "--- por el dominio publico (Caddy):"
curl -s -m 20 -o /tmp/hs2.txt -w 'HTTP %{http_code} en %{time_total}s\n' "https://bot.varmancrew.com/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=NO_ES&hub.challenge=X"; echo "cuerpo: $(head -c 120 /tmp/hs2.txt)"
echo "--- healthz:"; curl -s -m 10 -w ' HTTP %{http_code}\n' http://127.0.0.1:5678/healthz

sec "N8N: base SQLite (solo lectura): workflows activos, tamano, ejecuciones por dia y estado"
DATA=$(docker inspect varman-n8n --format '{{range .Mounts}}{{if eq .Destination "/home/node/.n8n"}}{{.Source}}{{end}}{{end}}')
echo "datos en: $DATA"; ls -la "$DATA"/database.sqlite* 2>/dev/null; du -sh "$DATA" 2>/dev/null
docker run --rm -v "$DATA":/d:ro alpine sh -c '
  apk add -q sqlite >/dev/null 2>&1 &&
  echo "--- workflows:" &&
  sqlite3 -readonly /d/database.sqlite "SELECT id, name, active, updatedAt FROM workflow_entity;" &&
  echo "--- ejecuciones por dia/estado (14 dias):" &&
  sqlite3 -readonly /d/database.sqlite "SELECT substr(startedAt,1,10) d, status, count(*) FROM execution_entity WHERE startedAt >= date(\"now\",\"-14 days\") GROUP BY d, status ORDER BY d DESC, status;" &&
  echo "--- colgadas (new/running/waiting) sin terminar:" &&
  sqlite3 -readonly /d/database.sqlite "SELECT id, status, mode, startedAt, stoppedAt FROM execution_entity WHERE status IN (\"new\",\"running\",\"waiting\") ORDER BY startedAt DESC LIMIT 15;" &&
  echo "--- ultima ejecucion terminada:" &&
  sqlite3 -readonly /d/database.sqlite "SELECT id, status, startedAt, stoppedAt FROM execution_entity WHERE stoppedAt IS NOT NULL ORDER BY stoppedAt DESC LIMIT 3;" &&
  echo "--- huecos: horas sin ninguna ejecucion en los ultimos 7 dias (>=3h seguidas):" &&
  sqlite3 -readonly /d/database.sqlite "WITH h AS (SELECT DISTINCT substr(startedAt,1,13) hh FROM execution_entity WHERE startedAt >= date(\"now\",\"-7 days\")) SELECT hh FROM h ORDER BY hh;" | awk "{print}" | head -400 > /tmp/horas.txt; wc -l /tmp/horas.txt
'

sec "CRON / TIMERS del sistema"
crontab -l 2>/dev/null; sudo -n crontab -l 2>/dev/null; ls -la /etc/cron.d 2>/dev/null; systemctl list-timers --no-pager 2>/dev/null | head -15
echo "--- unattended-upgrades reinicios:"; grep -i -E "reboot|Restart" /var/log/unattended-upgrades/unattended-upgrades.log 2>/dev/null | tail -5

sec "CADDY: ultimas lineas con error"
docker logs --since 168h varman-caddy 2>&1 | grep -i -E "error|502|503|certificate|tls" | tail -15

echo; echo "=== FIN DIAGNOSTICO ==="
