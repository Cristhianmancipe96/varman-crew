#!/usr/bin/env bash
# Activar el workflow con el comando NUEVO, viendo TODA la salida.
# n8n parado (lock de SQLite) y en contenedor temporal.
set -uo pipefail
D=/home/varmansneakersandclothes/varman-bot
ID=VarmanBotV4Ped01

echo "=== 1. PARANDO n8n ==="
sudo sh -c "cd $D && docker compose stop n8n"

echo ""
echo "=== 2. QUE COMANDOS TIENE ESTA VERSION DE n8n ==="
sudo sh -c "cd $D && docker compose run --rm --entrypoint n8n n8n --help" 2>&1 | grep -iE "publish|update|workflow|activate" | head -12

echo ""
echo "=== 3. publish:workflow (SALIDA COMPLETA) ==="
sudo sh -c "cd $D && docker compose run --rm --entrypoint n8n n8n publish:workflow --id=$ID" 2>&1
echo "  ---> codigo de salida: $?"

echo ""
echo "=== 4. ESTADO REAL EN LA BASE (lectura directa, n8n parado) ==="
sudo docker run --rm -v varman-bot_n8n_data:/d alpine sh -c \
  "apk add -q sqlite; sqlite3 /d/database.sqlite \"SELECT id, active, name FROM workflow_entity;\"" 2>&1

echo ""
echo "=== 5. ARRANCANDO n8n ==="
sudo sh -c "cd $D && docker compose up -d"
