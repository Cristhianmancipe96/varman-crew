# NOTA FLUIDEZ 1 — Cambio de modelo a MITAD de pedido (flag BOT_FLUIDEZ_RECONDUCE) · 2026-07-11

**Backlog fluidez: [F3] "nunca 'no entendí' seco / reconducir" — anclado en los
casos REALES 1 y 3 de `CONVERSACIONES-INCOMODAS.md`.**

## El problema (chats reales)
- **Caso 3:** en pleno paso talla, "Hola! Quiero la Ref 06" y "quiero otro modelo"
  recibieron **la misma plantilla de talla inválida 4 veces seguidas**. El cliente
  terminó cancelando.
- **Caso 1:** en el paso pago, "Quiero otro modelo" → el bot re-envió el bloque de
  pago completo. El dueño pidió: responder con calidez y **volver a mandar el catálogo**.

## Qué cambié (`workflows/src/cerebro-v4.js` + `textos.js`)
Bloque interceptor ANTES del dispatch de estados, solo con **texto libre** (`!sel`),
solo en **talla/datos/pago** (en `comprobante` no: pudo ya haber pagado), flag
**`BOT_FLUIDEZ_RECONDUCE`** (default **OFF** = hoy exacto):

1. **Ref directa a mitad de pedido** ("quiero la Ref 06", mismo regex del camino
   web con su guarda de "avísame cuando llegue") → `arrancarPedido(nuevaRef)` con
   texto `cambioRefIntro` ("¡Claro que sí! 😊 Cambiamos tu pedido a esta 👇"):
   ficha con foto + pide talla; la sesión vieja se pisa. Si la ref NO existe en el
   catálogo, no intercepta (sigue el paso normal).
2. **"Otro modelo / otra referencia / otro estilo / otro color / cambiar de modelo /
   ver el catálogo"** (`PIDE_OTRO_MODELO` — sin "otro par": eso suele ser CANTIDAD)
   → cierra la sesión + catálogo con `cambioModeloIntro` ("¡Claro que sí! 😊 Mira el
   catálogo…"). Elegir de la lista arranca el pedido nuevo, como siempre.

Las selecciones interactivas (`pay:`, `cat:`, `ref:`) NO pasan por el interceptor.

## Hallazgo extra documentado en test
Con el criterio v5 de datos (15+ chars), **"mejor quiero otro modelo" en el paso
datos hoy se toma como dirección y avanza a pago**. Con el flag ON queda
interceptado antes. (También lo mitiga `BOT_DATOS_V2` de la mejora 6.)

## Tests (sección 37, deterministas — los casos reales pasaron SIN IA)
- OFF (2): ref directa en talla → plantilla repetida (caso 3, hoy) · "otro modelo"
  en datos → pasa a pago (bug de hoy).
- ON (6): ref 06 a mitad de talla → pedido cambia a la 06 con ficha+talla · "otro
  modelo" en datos → sesión cerrada + catálogo cálido · "ver el catálogo" en pago →
  catálogo sin re-enviar el bloque de pago (caso 1) · ref inexistente no secuestra ·
  botones `pay:` intactos.

Resultado: **192 PASS · 0 FAIL** (antes 184; +8).

## Cobertura de los casos reales
- Caso 3 (ref/otro modelo en talla): **cubierto** con este flag. Lo de "Puedo llevar
  2" quedó anotado en la cola general como [D1b] (ambiguo con talla: confirmar).
- Caso 1 ("otro modelo" en pago): **cubierto** (además `BOT_ROBUSTEZ` ya evitaba
  re-enviar la plantilla cuando Gemini responde).
- Caso 2 (foto ignorada): ya cubierto por la mejora 9 (`BOT_FOTO_ASESOR`).

## Cómo revertir
1. `workflows/respaldo/bot-varman.pre-fluidez-1.json` sobre `workflows/bot-varman.json`.
2. Quitar de `cerebro-v4.js`: `FLAG_FLUIDEZ_RECONDUCE`, `PIDE_OTRO_MODELO` y el
   bloque `[F-RECONDUCE]`; de `textos.js`: `cambioRefIntro`/`cambioModeloIntro`;
   del test: sección 37 + `BOT_FLUIDEZ_RECONDUCE` del delete-list.
3. `node workflows/build-v4-pedidos.js`.

## ⚙️ Entorno
Node portable en `bot_n8n/herramientas/node/node.exe`. Ver `NOTA-MEJORA-1`.
