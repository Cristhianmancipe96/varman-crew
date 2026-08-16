#!/usr/bin/env bash
# ¿Esta el workflow ACTIVO? Se distingue sin conocer el token y sin gastar
# Gemini: la ruta GET solo ejecuta "Verificar token" -> "Responder a Meta".
#   "token invalido"  => ACTIVO (corrio el codigo)
#   "Cannot GET"      => INACTIVO (no hay webhook registrado)
# Limites LARGOS: esta VM tarda ~155 s en recuperar la base tras un arranque.
# Nunca usar 'n8n list:workflow': levanta un segundo n8n y tumba la VM.

echo "=== 0. ESTADO DEL CONTENEDOR ==="
sudo docker ps --format '{{.Names}}  {{.Status}}'

echo ""
echo "=== 1. ESPERAR A QUE n8n RESPONDA (hasta 6 min) ==="
VIVO=no
for i in $(seq 1 12); do
  C=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 http://127.0.0.1:5678/healthz || echo 000)
  echo "  intento $i -> $C"
  if [ "$C" = "200" ]; then VIVO=si; break; fi
  sleep 25
done
if [ "$VIVO" != "si" ]; then
  echo "  n8n NO responde. Ultimas lineas del log:"
  sudo docker logs varman-n8n --tail 20 2>&1 | tail -20
  exit 1
fi

echo ""
echo "=== 2. HANDSHAKE CON TOKEN FALSO (90 s de margen) ==="
R=$(curl -s --max-time 90 "http://127.0.0.1:5678/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=ESTO_NO_ES_EL_TOKEN&hub.challenge=X" || echo "SIN_RESPUESTA")
echo "respuesta: ${R:0:200}"
echo ""
case "$R" in
  *"token invalido"*) echo ">>> WORKFLOW ACTIVO — el bot SI recibe mensajes";;
  *"Cannot GET"*)     echo ">>> WORKFLOW INACTIVO — el bot NO recibe mensajes";;
  *)                  echo ">>> respuesta rara, mirar arriba";;
esac

echo ""
echo "=== 3. LOG: activacion y webhooks ==="
sudo docker logs varman-n8n 2>&1 | grep -iE "webhook|activ|Editor|version" | tail -15 || echo "  (nada)"
