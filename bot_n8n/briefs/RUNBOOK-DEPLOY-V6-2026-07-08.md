# RUNBOOK — Desplegar el Bot v6 a la VM · VarMan Crew · 2026-07-08

> Para Cristhian. Asume que la **v5 YA está en la VM** (7/7). El v6 es la v5 +
> mejoras, **todo aditivo y detrás de flags**: si no activas ninguna variable
> nueva, el bot se comporta EXACTO como la v5. Mismo `id` del workflow
> (`VarmanBotV4Ped01`), así que `importar-workflows.sh` funciona igual y el
> rollback es re-importar el respaldo. Tiempo: ~10 min + esperas.

## 0. Qué trae el v6 (todo OFF por defecto)
| Mejora | Se activa con | Sin eso… |
|---|---|---|
| **Robustez conversacional** (handoff libre, multi-intención, dato incorrecto) | `BOT_ROBUSTEZ=on` | flujo de texto v5 idéntico |
| **Wompi** (link de pago + webhook) | `WOMPI_PUB_KEY`+`WOMPI_PRV_KEY`+`WOMPI_EVENTS_SECRET`+`WOMPI_ENV` | no aparece Wompi; pago v5 |
| **Catálogo nativo** (MPM) | `CATALOGO_NATIVO=on`+`WHATSAPP_CATALOG_ID` | catálogo de fotos v5 |

Recomendado para el lanzamiento: **activa solo `BOT_ROBUSTEZ=on`** (usa el mismo
Gemini, no necesita nada externo y es lo que más convierte). Wompi y catálogo
nativo se activan después, cuando estén las llaves / el número en Live.

## 1. Respaldo (obligatorio, 1 comando)
En la terminal SSH de la VM (`varman-bot`), dentro de `~/varman-bot`:
```bash
cd ~/varman-bot
bash backup.sh --completo
```
Espera a que diga que terminó. (El respaldo local del JSON v5 también está en el
PC: `workflows/respaldo/bot-whatsapp-v4-pedidos.v5-pre-v6.2026-07-08.json`.)

## 2. Subir el workflow v6
> **⚠ CAMBIO DE NOMBRE (v6.2):** el archivo del bot ahora se llama
> **`bot-varman.json`** (antes `bot-whatsapp-v4-pedidos.json`). El `id` interno NO
> cambió (`VarmanBotV4Ped01`). Las versiones para rollback se guardan solas en
> `workflows/respaldo/bot-varman-vX.json`.
> **La PRIMERA vez con el nombre nuevo, BORRA el archivo viejo en la VM** (si no,
> quedan dos con el mismo id y el import podría activar el viejo):
> ```bash
> rm -f ~/varman-bot/workflows/bot-whatsapp-v4-pedidos.json
> ```

1. En el PC, regenera el JSON (opcional, ya viene generado):
   `node workflows\build-v4-pedidos.js`
2. En la terminal SSH: botón **⚙/⋮ → Subir archivo** →
   `bot_n8n\workflows\bot-varman.json`.
3. Cópialo y reimporta:
```bash
cp ~/bot-varman.json ~/varman-bot/workflows/bot-varman.json
bash importar-workflows.sh
```
Espera a **[OK] n8n responde**. (El bot queda ~1-2 min fuera de línea, normal.)
Comprueba que en la VM quede SOLO `bot-varman.json` como archivo del bot:
`ls ~/varman-bot/workflows/*.json` (no debe aparecer `bot-whatsapp-v4-pedidos.json`).

## 3. (Opcional) Activar los flags que quieras
`nano ~/varman-bot/.env`, descomenta/edita, guarda **Ctrl+O, Enter, Ctrl+X**, y:
```bash
cd ~/varman-bot && docker compose up -d
```
- Robustez: `BOT_ROBUSTEZ=on`
- Wompi: las 4 `WOMPI_*` (ver `fase2/WOMPI-INTEGRACION.md`) + registrar la URL
  `https://bot.varmancrew.com/webhook/wompi` en el panel Wompi.
- Catálogo nativo: `CATALOGO_NATIVO=on` + `WHATSAPP_CATALOG_ID` (ver
  `fase2/CATALOGO-NATIVO-WHATSAPP.md`).

## 4. Salud 7/7
```bash
bash verificar-salud.sh
```
✅ **Bien si:** `0 fallos` (contenedores arriba, HTTPS válido, webhook 200/403).
> Nota: `verificar-salud.sh` prueba el webhook de WhatsApp (GET/POST `whatsapp`).
> El webhook de Wompi (`/webhook/wompi`) se registra y prueba aparte con el panel
> de Wompi (solo si activaste Wompi).

## 5. Pruebas rápidas (con el número de prueba desde el 320, como en v5)
1. **v5 intacto:** `hola` → categoría → llegan las 5 fotos + lista. Haz un pedido
   completo (talla → datos → Nequi → comprobante) → llega "Pedido recibido" y el
   aviso al 320.
2. **Robustez** (si `BOT_ROBUSTEZ=on`): en el paso de talla escribe
   *"quiero hablar con una persona"* → debe hacer **handoff** (avisa al 320).
   Luego *"talla 40 y ¿hacen envíos a Cali?"* → **captura la 40 y responde lo de
   Cali**. Luego *"no sé mi talla"* → **te ayuda a medirla** (no error seco).
3. **Wompi** (si activo): elige "Tarjeta/PSE/Nequi (Wompi)" → llega el link;
   paga con tarjeta de prueba → el pedido pasa a `pago_confirmado` y llega el
   aviso al 320.
4. **Catálogo nativo** (si activo): `hola` → categoría → tarjetas de producto.

## 6. Rollback (1 comando)
Cada versión deja su respaldo en `workflows/respaldo/bot-varman-vX.json`. Para
volver a una versión anterior, sube ese archivo (o el `...v5-pre-v6...json` para
volver al inicio) y cópialo SOBRE `bot-varman.json`:
```bash
# ejemplo: volver al inicio (v5). Ajusta el nombre del respaldo que quieras.
cp ~/varman-bot/workflows/respaldo/bot-whatsapp-v4-pedidos.v5-pre-v6.2026-07-08.json \
   ~/varman-bot/workflows/bot-varman.json
bash importar-workflows.sh
```
(o `bash restore.sh` con el respaldo del paso 1). Como el `id` no cambió, esto
deja de nuevo la versión elegida activa. Alternativa aún más simple: **apagar los
flags** en el `.env` (`docker compose up -d`) — el v6 se comporta como v5 sin reimportar.

## Verificación técnica (ya hecha por el agente, offline)
`node tests/test-offline-v4.js` → **111 PASS · 0 FAIL** (Firestore real, WhatsApp
y Wompi mockeados). Cubre v5 completo + robustez (con/sin flag) + Wompi (link,
webhook con firma válida/ inválida, idempotencia) + catálogo nativo (con/sin flag).
