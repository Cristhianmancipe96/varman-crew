#!/usr/bin/env bash
# Recrea el contenedor para que RELEA el .env. 'docker restart' no sirve:
# no vuelve a leer el env_file (lección del 15-ago). El arranque en frío de
# esta VM tarda ~155 s en recuperar la base, asi que la espera va holgada.
D=/home/varmansneakersandclothes/varman-bot

echo "=== ANTES: variables dentro del contenedor ==="
sudo docker exec varman-n8n env 2>/dev/null | grep -E "BOT_BUZON|CONCURRENCY" | sort || echo "  (ninguna)"

echo ""
echo "=== RECREANDO (docker compose up -d) ==="
sudo sh -c "cd $D && docker compose up -d"

echo ""
echo "=== ESPERANDO (hasta 5 min; la base tarda ~155 s) ==="
VIVO=no
for i in $(seq 1 15); do
  C=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 http://127.0.0.1:5678/healthz || echo 000)
  echo "  intento $i -> $C"
  if [ "$C" = "200" ]; then VIVO=si; break; fi
  sleep 20
done
echo "  n8n vivo: $VIVO"

echo ""
echo "=== DESPUES: variables dentro del contenedor ==="
sudo docker exec varman-n8n env 2>/dev/null | grep -E "BOT_BUZON|CONCURRENCY" | sort || echo "  (NINGUNA — algo fallo)"

echo ""
echo "=== EL WORKFLOW ESTA ACTIVO? (handshake de Meta, no gasta Gemini) ==="
# Si responde el challenge, el webhook esta registrado y el workflow activo.
# Un 404 rapido significa inactivo. No dispara ninguna llamada al modelo.
TOK=$(sudo grep -E "^WEBHOOK_VERIFY_TOKEN=" "$D/.env" | cut -d= -f2- | tr -d '"'"'"'')
R=$(curl -s --max-time 25 "http://127.0.0.1:5678/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=$TOK&hub.challenge=PRUEBA_BUZON_OK")
if [ "$R" = "PRUEBA_BUZON_OK" ]; then
  echo "  OK - el workflow esta ACTIVO y el webhook responde"
else
  echo "  respuesta inesperada: ${R:0:120}"
fi

echo ""
echo "=== MEMORIA Y DISCO ==="
free -m | head -2
df -h / | tail -1
