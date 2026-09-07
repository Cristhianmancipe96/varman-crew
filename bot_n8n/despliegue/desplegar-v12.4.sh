#!/usr/bin/env bash
# ==========================================================
# VarMan · desplegar el bot v12.4 — 7-sep-2026
#   - saludo: un "hola"/"precio" ya no termina en "no lo encontre"
#   - link de Wompi desde el 320 (comando corto, en palabras, varios pares)
#   - SIN promos (v12.3) + MENU de botones bajo las dos fichas candidatas (v12.4)
#  NO toca el .env. Secuencia de los PASOS-V12.0: parar -> importar ->
#  publicar POR COMANDO -> arrancar. Se corre EN la VM como el usuario andre.
# ==========================================================
set -uo pipefail
D=/home/varmansneakersandclothes/varman-bot
NUEVO=/home/andre/bot-varman-v12.4.json
TAM_ESPERADO=641230
PALABRA=BOT_MENU_CANDIDATAS   # solo existe desde la v12.4
ID=VarmanBotV4Ped01
HOY=2026-09-07

echo "=== 0. EL NUEVO LLEGO ENTERO? ==="
T0=$(stat -c%s "$NUEVO")
echo "subido: $T0 bytes (esperado $TAM_ESPERADO)"
[ "$T0" = "$TAM_ESPERADO" ] || { echo "ALTO: el archivo subido no pesa lo esperado (scp cortado?)"; exit 1; }
[ "$(grep -c "$PALABRA" "$NUEVO")" -ge 1 ] || { echo "ALTO: el archivo subido no trae $PALABRA"; exit 1; }
[ "$(grep -c fmtPrecioPromo "$NUEVO")" = "0" ] || { echo "ALTO: el archivo subido TODAVIA trae la promo"; exit 1; }

echo ""
echo "=== 1. PARAR n8n (el import se cuelga con n8n vivo: lock de SQLite) ==="
sudo sh -c "cd $D && docker compose stop n8n"

echo ""
echo "=== 2. RESPALDO DEL QUE CORRE DE VERDAD (exportado de la base, no el archivo) ==="
# El archivo de workflows/ y lo que n8n tiene en la base pueden no coincidir
# (si alguna vez se importo desde otra ruta). El rollback tiene que ser lo
# que corre HOY, asi que se exporta de la base con n8n parado.
BAK=/home/andre/bot-varman-ANTES-DE-v12.4-$HOY.json
if [ -f "$BAK" ]; then
  echo "el respaldo ya existe, no se toca: $BAK"
else
  sudo sh -c "cd $D && docker compose run --rm --no-deps -u node n8n export:workflow --id=$ID --output=/workflows/respaldo/ANTES-DE-v12.4-$HOY.json" 2>&1 | tail -3
  sudo cp "$D/workflows/respaldo/ANTES-DE-v12.4-$HOY.json" "$BAK" 2>/dev/null
fi
ls -l "$BAK" 2>/dev/null || echo "  (no se pudo exportar de la base; queda el respaldo del archivo)"
sudo cp "$D/workflows/bot-varman.json" "/home/andre/bot-varman-ARCHIVO-ANTES-DE-v12.4-$HOY.json"
ls -l "/home/andre/bot-varman-ARCHIVO-ANTES-DE-v12.4-$HOY.json"
# OJO: el import toma TODOS los .json de workflows/ (no de respaldo/): que no
# haya quedado ningun export suelto ahi.
echo "-- .json en workflows/ (debe estar solo bot-varman.json y los 3 viejos de julio):"
sudo sh -c "ls -l $D/workflows/ | grep -i json"

echo ""
echo "=== 3. PONER EL NUEVO EN SU SITIO ==="
sudo cp "$NUEVO" "$D/workflows/bot-varman.json"
sudo chown varmansneakersandclothes:varmansneakersandclothes "$D/workflows/bot-varman.json"

echo ""
echo "=== 4. LA VERIFICACION QUE DE VERDAD IMPORTA ==="
T=$(sudo stat -c%s "$D/workflows/bot-varman.json")
echo "en su sitio: $T bytes (esperado $TAM_ESPERADO)"
if [ "$T" != "$TAM_ESPERADO" ]; then
  echo "ALTO - NO es el archivo nuevo. No se importa nada. Arrancando n8n como estaba."
  sudo sh -c "cd $D && docker compose start n8n"; exit 1
fi
N=$(sudo grep -c "$PALABRA" "$D/workflows/bot-varman.json")
R=$(sudo grep -c '"type": "n8n-nodes-base.scheduleTrigger"' "$D/workflows/bot-varman.json")
echo "palabra nueva ($PALABRA): $N   relojes: $R (debe ser 1: el barrido de las 3:15)"
if [ "$N" -lt 1 ] || [ "$R" != "1" ]; then
  echo "ALTO: contenido raro. Arrancando n8n como estaba."
  sudo sh -c "cd $D && docker compose start n8n"; exit 1
fi
echo "OK - es el nuevo."

echo ""
echo "=== 5. IMPORTAR ==="
sudo sh -c "cd $D && docker compose run --rm --no-deps -u node n8n import:workflow --input=/workflows/bot-varman.json" 2>&1 | tail -5

echo ""
echo "=== 6. PUBLICAR POR COMANDO (el import lo deja inactivo; sin esto el webhook da 404) ==="
sudo sh -c "cd $D && docker compose run --rm --entrypoint n8n n8n publish:workflow --id=$ID" 2>&1 | tail -5

echo ""
echo "=== 7. ESTADO EN LA BASE (n8n parado, solo lectura) ==="
echo "SELECT id, active, length(nodes) AS bytes_nodes, instr(nodes,'BOT_LINK_320')>0 AS tiene_link, instr(nodes,'fmtPrecioPromo')>0 AS tiene_promo_debe_ser_0, updatedAt FROM workflow_entity;" \
  | sudo docker run -i --rm -v varman-bot_n8n_data:/d alpine sh -c 'apk add -q sqlite >/dev/null 2>&1; sqlite3 -readonly /d/database.sqlite'

echo ""
echo "=== 8. ARRANCAR n8n (start basta: el .env no cambio) ==="
sudo sh -c "cd $D && docker compose start n8n"
sudo docker ps --format '{{.Names}}  {{.Status}}'
echo ""
echo "=== LISTO. Ahora: bash /home/andre/verificar-webhook.sh (tarda; la base recupera ~155 s) ==="
