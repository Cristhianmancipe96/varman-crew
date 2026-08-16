#!/usr/bin/env bash
# Espera a que el webhook conteste de verdad (no 503 de base calentando).
# Sin gastar Gemini: la ruta GET solo corre "Verificar token".
D=/home/varmansneakersandclothes/varman-bot
OK=no
for i in $(seq 1 20); do
  R=$(curl -s --max-time 45 "http://127.0.0.1:5678/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=NO_ES_EL_TOKEN&hub.challenge=X" || echo "TIMEOUT")
  corto=$(echo "$R" | tr -d '\n' | cut -c1-70)
  echo "  intento $i -> $corto"
  case "$R" in
    *"token invalido"*) OK=si; break;;
    *"Cannot GET"*)     echo "  >>> INACTIVO otra vez"; break;;
  esac
  sleep 25
done

echo ""
if [ "$OK" = "si" ]; then
  echo ">>> BOT ARRIBA: el workflow esta ACTIVO y el webhook responde."
  echo ""
  echo "=== prueba con el token BUENO (debe devolver el challenge) ==="
  TOK=$(sudo grep -E '^WEBHOOK_VERIFY_TOKEN=' "$D/.env" | cut -d= -f2-)
  TOK=$(echo "$TOK" | tr -d '"' | tr -d "'" | tr -d '\r')
  R2=$(curl -s --max-time 45 "http://127.0.0.1:5678/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=$TOK&hub.challenge=BUZON_OK_2026")
  if [ "$R2" = "BUZON_OK_2026" ]; then
    echo "  OK — devolvio el challenge. Meta puede verificar y entregar mensajes."
  else
    echo "  respuesta: $(echo "$R2" | cut -c1-90)"
  fi
else
  echo ">>> AUN NO. Ultimas lineas del log:"
  sudo docker logs varman-n8n --tail 15 2>&1 | tail -15
fi

echo ""
echo "=== ESTADO FINAL ==="
sudo docker ps --format '{{.Names}}  {{.Status}}'
sudo docker exec varman-n8n env 2>/dev/null | grep -E "BOT_BUZON|CONCURRENCY" | sort
free -m | head -2
df -h / | tail -1
