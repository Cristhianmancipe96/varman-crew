# NOTA FLUIDEZ 4 — Asistente vendedor v2 (flag BOT_ASISTENTE_V2) · 2026-07-11

**Backlog fluidez: [F4] "comprensión de la pregunta real" + mandato del dueño:
fluidez ante mensajes incoherentes y bot entrenado para CERRAR la venta.**

## Qué cambié
Nuevo prompt **`GEMINI_ASISTENTE_V2`** en `textos.js` = el prompt v1 del asistente
(el que corre a mitad de pedido con `BOT_ROBUSTEZ` on) + tres reglas y few-shot,
manteniendo EXACTA la forma del JSON `{handoff,dato,respuesta}`. `asistir()` en
`cerebro-v4.js` elige v1/v2 según el flag **`BOT_ASISTENTE_V2`** (default **OFF**).

Reglas nuevas del v2:
1. **Vender**: responde PRIMERO lo preguntado (una idea, máx 2 frases) y cierra
   SIEMPRE reencaminando al dato del paso con una mini-CTA ("¿Te los aparto?",
   "¿Seguimos con tu talla?").
2. **Incoherentes** (letras sueltas, "jajaja", stickers, temas ajenos): no regañar
   ni repetir plantilla — una línea amable con otra formulación y volver a pedir
   SOLO el dato del paso. (Complementa el anti-repetición determinista de F3:
   F3 cubre robustez OFF/Gemini caído; esto cubre el camino con IA.)
3. **Ganchos de confianza del BANCO §13** (máx UNO por mensaje, solo cuando
   encaje): envío incluido · video del pedido con tu nombre · contra entrega
   Bogotá · Wompi seguro.
Few-shot (3): incoherente en talla · "muy caro" en pago (10% primera compra +
CTA) · "¿y si no me sirven?" en datos (video con tu nombre + pedir datos).

## Tests (sección 40, Gemini mockeado + inspección del system_instruction)
- OFF: el asistente manda el prompt v1 exacto (sin "REGLAS DE VENTA").
- ON: prompt v2 (reglas + ganchos) · conserva la forma del JSON · un mensaje
  incoherente saca SOLO la respuesta cálida (sin plantilla encima) · no fija
  ningún dato (sigue en talla).

Resultado: **210 PASS · 0 FAIL** (antes 205; +5).

## Cómo revertir
1. `workflows/respaldo/bot-varman.pre-fluidez-4.json` sobre `workflows/bot-varman.json`.
2. Quitar `GEMINI_ASISTENTE_V2` de `textos.js`, `FLAG_ASISTENTE_V2` y el ternario
   de `asistir()` en `cerebro-v4.js`, la sección 40 y el flag del delete-list.
3. `node workflows/build-v4-pedidos.js`.

## ⚙️ Entorno
Node portable en `bot_n8n/herramientas/node/node.exe`. Ver `NOTA-MEJORA-1`.
