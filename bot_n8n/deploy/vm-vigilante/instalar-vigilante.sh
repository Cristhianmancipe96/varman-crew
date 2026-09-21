#!/usr/bin/env bash
# Instala (idempotente): swappiness=10, vigilante cada 5 min, compactación semanal y una
# compactación forzada UNA vez el 11-sep-2026 a las 2:30. Correr como root.
set -uo pipefail
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin HOME=/root
cd /home/andre || exit 1
chown andre:andre vigilante-bot.sh compactar-base.sh; chmod 755 vigilante-bot.sh compactar-base.sh
bash -n vigilante-bot.sh && bash -n compactar-base.sh && echo "[OK] sintaxis de los dos scripts"

echo "--- swappiness (antes: $(cat /proc/sys/vm/swappiness))"
cat > /etc/sysctl.d/99-varman-swap.conf <<'C'
# VarMan 2026-09-10: la VM tiene 1 GB; con 60 el kernel mandaba a swap al runner de código
# de n8n (69 MB en swap) para cachear una base de 3 GB, y el runner tardaba demasiado en
# despertar. Con 10 prefiere soltar caché de disco antes que procesos. Quitar = borrar este archivo.
vm.swappiness = 10
C
sysctl -q -p /etc/sysctl.d/99-varman-swap.conf; echo "swappiness ahora: $(cat /proc/sys/vm/swappiness)"

echo "--- crontab de root"
TMP=$(mktemp); crontab -l 2>/dev/null > "$TMP" || true
grep -q 'vigilante-bot.sh' "$TMP" || cat >> "$TMP" <<'C'

# ===== VarMan · vigilante y compactación (puestos el 10-sep-2026 por el PM) =====
# Vigila el webhook cada 5 min y reinicia n8n solo si está colgado o lleno de zombis. Log: /var/log/varman-vigilante.log
*/5 * * * * bash /home/andre/vigilante-bot.sh
# Compacta la base los domingos 2:30 SOLO si tiene >30% de aire (si no, no corta nada). Log: /home/andre/compactar.log
30 2 * * 0 bash /home/andre/compactar-base.sh >> /home/andre/compactar.log 2>&1
# UNA sola vez: 11-sep-2026 2:30, compactación forzada (3 GB -> ~0,4 GB). Se borra sola al terminar.
30 2 11 9 * FORZAR=1 bash /home/andre/compactar-base.sh >> /home/andre/compactar.log 2>&1
C
crontab "$TMP"; rm -f "$TMP"
crontab -l | grep -v '^#' | grep -v '^$'

echo "--- primera corrida del vigilante (ahora mismo)"
bash /home/andre/vigilante-bot.sh; tail -5 /var/log/varman-vigilante.log
echo "--- medición de la base (sin FORZAR: solo mide, no para nada)"
python3 - <<'PY'
import sqlite3
c = sqlite3.connect("file:/var/lib/docker/volumes/varman-bot_n8n_data/_data/database.sqlite?mode=ro", uri=True, timeout=5)
ps = c.execute("pragma page_size").fetchone()[0]; pc = c.execute("pragma page_count").fetchone()[0]; fl = c.execute("pragma freelist_count").fetchone()[0]
print("base %d MB, %d%% libre -> la corrida del 11-sep si va a compactar" % (ps*pc//1048576, 100*fl//pc))
PY
echo "--- ¿la compactación del 16-ago corrió? (log)"; grep -E "INICIO|VACUUM|antes|despues|BOT VIVO|rror" /home/andre/mantenimiento-2026-08-16.log 2>/dev/null | head -12 || echo "(sin log)"
echo "[OK] instalado"
