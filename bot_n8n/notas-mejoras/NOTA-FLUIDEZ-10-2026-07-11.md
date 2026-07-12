# NOTA FLUIDEZ 10 — Nota de voz / video / sticker → pedir texto (flag BOT_FLUIDEZ_RECONDUCE) · 2026-07-11

**Mandato del dueño: fluidez ante lo que el flujo no entiende. Los clientes de
WhatsApp mandan notas de voz TODO el tiempo y hoy el bot responde el catálogo o
la plantilla del paso como si nada (se siente ignorado).**

## Qué cambié (`cerebro-v4.js`)
Interceptor temprano (antes del dispatch, después de cargar la sesión): si
`parsed.tipo` es `audio`/`voice`/`video`/`sticker` y el flag está ON, el bot
responde UNA burbuja humana — "Por aquí te leo mejor 🙌 ¿Me lo escribes en un
mensajito de texto? Así te ayudo de una 😊" (`mediaNoSoportado`) — y **la sesión
no se toca** (el cliente sigue en su paso).

- Los `document` NO se interceptan: un PDF en el paso comprobante debe seguir su
  flujo de hoy.
- La imagen (`tipo: image`) tampoco: comprobante y foto→asesor (mejora 9) intactos.

## Tests (sección 46)
OFF: nota de voz sin sesión → catálogo (hoy). ON: nota de voz → "te leo mejor"
(1 burbuja, sin catálogo) · sticker a mitad de pedido → pide texto y la sesión
sigue en talla.

Resultado: **235 PASS · 0 FAIL** (antes 232; +3).

## Cómo revertir
1. `workflows/respaldo/bot-varman.pre-fluidez-10.json` sobre `workflows/bot-varman.json`.
2. Quitar el bloque `[F-MEDIA]` del cerebro, `mediaNoSoportado` de `textos.js` y
   la sección 46.
3. `node workflows/build-v4-pedidos.js`.

## ⚙️ Entorno
Node portable en `bot_n8n/herramientas/node/node.exe`. Ver `NOTA-MEJORA-1`.
