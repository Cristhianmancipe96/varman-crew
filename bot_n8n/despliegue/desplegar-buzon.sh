#!/usr/bin/env bash
# ==========================================================
# VarMan · desplegar el buzon (v11.1) — 16-ago-2026
#  Sube el workflow nuevo con BOT_BUZON APAGADO: comportamiento
#  identico al de hoy. Encenderlo es un segundo paso aparte.
# ==========================================================
set -euo pipefail
D=/home/varmansneakersandclothes/varman-bot
NUEVO=/home/andre/bot-varman-v11.1.json
TAM_ESPERADO=1155878

echo "=== 1. RESPALDO DEL QUE CORRE HOY (fuera de workflows/) ==="
# NO se pisa si ya existe: al repetir el script, el que esta en su sitio ya es
# el nuevo y sobrescribir el respaldo destruiria la unica copia del viejo.
BAK=/home/andre/bot-varman-ANTES-BUZON-2026-08-16.json.bak
if [ -f "$BAK" ]; then
  echo "el respaldo ya existe, no se toca:"
else
  sudo cp "$D/workflows/bot-varman.json" "$BAK"
fi
ls -l "$BAK"

echo ""
echo "=== 2. MOVER EL NUEVO A SU SITIO ==="
sudo cp "$NUEVO" "$D/workflows/bot-varman.json"
sudo chown varmansneakersandclothes:varmansneakersandclothes "$D/workflows/bot-varman.json"

echo ""
echo "=== 3. LA VERIFICACION QUE DE VERDAD IMPORTA ==="
T=$(sudo stat -c%s "$D/workflows/bot-varman.json")
echo "en su sitio: $T bytes  (esperado: $TAM_ESPERADO)"
if [ "$T" != "$TAM_ESPERADO" ]; then
  echo "ALTO — NO es el archivo nuevo. No se importa nada."
  exit 1
fi
echo "OK — es el nuevo."

echo ""
echo "=== 4. .json EN workflows/ (el import los toma TODOS) ==="
# el comodin lo expande el shell de 'andre', que NO puede leer esa carpeta:
# hay que expandirlo DENTRO del sudo.
sudo sh -c "ls -l $D/workflows/ | grep -i json"

echo ""
echo "=== 5. .env: respaldo + variables nuevas ==="
sudo cp "$D/.env" "$D/.env.bak-antes-buzon-2026-08-16"
# OJO: el redirect '>' lo ejecuta MI shell, no sudo. Si el archivo destino es de
# root (lo dejo el mantenimiento de anoche) da "permission denied" aunque el
# comando lleve sudo. Por eso el redirect va DENTRO del sudo sh -c.
TMPENV=/tmp/env.nuevo.$$
sudo sh -c "grep -v -E '^(BOT_BUZON|BOT_BUZON_SEGUNDOS|N8N_CONCURRENCY_PRODUCTION_LIMIT)=' '$D/.env' > $TMPENV"
sudo tee -a "$TMPENV" > /dev/null <<'EOF'

# --- buzon de mensajes (16-ago-2026) ---
# OFF de entrada: el nodo devuelve los items tal cual y el bot se comporta
# EXACTAMENTE como antes. Encender solo despues de verificar que todo va bien.
BOT_BUZON=off
BOT_BUZON_SEGUNDOS=45
# el freno de RAM que el ESTADO daba por puesto desde el 21-jul y nunca quedo
N8N_CONCURRENCY_PRODUCTION_LIMIT=3
EOF
sudo cp "$TMPENV" "$D/.env"
sudo chown varmansneakersandclothes:varmansneakersandclothes "$D/.env"
sudo rm -f "$TMPENV"
echo "variables escritas en el .env:"
sudo grep -E "^(BOT_BUZON|BOT_BUZON_SEGUNDOS|N8N_CONCURRENCY_PRODUCTION_LIMIT)=" "$D/.env"

echo ""
echo "=== 6. IMPORTAR (para n8n, importa aparte, reactiva) ==="
# el 'cd' tambien tiene que ir DENTRO del sudo: el usuario andre no puede
# entrar a esa carpeta (es del usuario varmansneakersandclothes).
sudo sh -c "cd $D && bash importar-workflows.sh"

echo ""
echo "=== 7. RECREAR EL CONTENEDOR (docker restart NO relee el .env) ==="
sudo sh -c "cd $D && docker compose up -d"

echo ""
echo "=== 8. VERIFICACION DENTRO DEL CONTENEDOR ==="
sleep 45
sudo docker exec varman-n8n env | grep -E "BOT_BUZON|CONCURRENCY" | sort || echo "  (no aparecen — revisar)"

echo ""
echo "=== 9. EL BOT ESTA VIVO? ==="
for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  C=$(curl -s -o /dev/null -w "%{http_code}" --max-time 40 http://127.0.0.1:5678/healthz || echo 000)
  echo "  intento $i -> $C"
  if [ "$C" = "200" ]; then echo "  BOT VIVO"; break; fi
  sleep 15
done

echo ""
echo "=== 10. DISCO Y MEMORIA ==="
df -h / | tail -1
free -m | head -2
echo ""
echo "=== LISTO. BOT_BUZON queda en off: comportamiento identico al de antes. ==="
