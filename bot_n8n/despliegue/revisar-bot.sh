#!/usr/bin/env bash
# Revision ligera del bot tras el import. NO gasta un peso de Gemini y NO
# levanta un segundo proceso n8n (la regla que tumbo el bot el 15-ago).
D=/home/varmansneakersandclothes/varman-bot

echo "=== CONTENEDORES ==="
sudo docker ps --format '{{.Names}}  {{.Status}}'

echo ""
echo "=== SALUD (hasta 6 intentos) ==="
VIVO=no
for i in 1 2 3 4 5 6; do
  C=$(curl -s -o /dev/null -w '%{http_code}' --max-time 40 http://127.0.0.1:5678/healthz || echo 000)
  echo "  intento $i -> $C"
  if [ "$C" = "200" ]; then VIVO=si; break; fi
  sleep 15
done
echo "  n8n vivo: $VIVO"

echo ""
echo "=== VARIABLES DENTRO DEL CONTENEDOR ==="
sudo docker exec varman-n8n env 2>/dev/null | grep -E "BOT_BUZON|CONCURRENCY" | sort || echo "  (ninguna — el contenedor no releyo el .env todavia)"

echo ""
echo "=== MEMORIA Y DISCO ==="
free -m | head -2
df -h / | tail -1

echo ""
echo "=== ULTIMAS LINEAS DEL LOG ==="
sudo docker logs varman-n8n --tail 15 2>&1 | tail -15
