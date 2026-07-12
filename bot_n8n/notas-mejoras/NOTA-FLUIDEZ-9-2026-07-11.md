# NOTA FLUIDEZ 9 — "Puedo llevar 2" sin la palabra pares (flag BOT_FLUIDEZ_RECONDUCE) · 2026-07-11

**Cierra lo último del caso real 3 (era el ítem [D1b] de la cola general). BANCO §8.**

## Qué cambié (interceptor RECONDUCE en `cerebro-v4.js`)
En talla/datos/pago, si el cliente pregunta por llevar N pares SIN la palabra
"pares" ("Puedo llevar 2", "quiero 3") — ambiguo para fijarlo — el bot **confirma
en positivo con gancho de venta**: "¡Claro que sí! 🙌 … si llevas *2 pares* te dejo
un *15% en todo el pedido* 🔥 Escríbeme *"2 pares"* y te lo anoto." (texto
`cantidadPregunta`). No fija nada ni pierde el paso; el seguimiento "2 pares" lo
anota el bloque de cantidad de siempre (nota + total ×2).

Guardas: con "pares/par/unidades" explícito NO intercepta (lo maneja el bloque de
cantidad); con un número de talla 35–45 tampoco ("me llevo la 40" fija la talla).

## Tests (sección 45)
OFF: "Puedo llevar 2" → plantilla de talla (caso 3, hoy). ON: confirma con 15% y
guía "2 pares" sin plantilla · sesión intacta (talla, ref, cantidad 1) · el
seguimiento "2 pares" anota cantidad=2 con total $960.000 · "me llevo la 40" fija
la talla.

Resultado: **232 PASS · 0 FAIL** (antes 227; +5).

## Cómo revertir
1. `workflows/respaldo/bot-varman.pre-fluidez-9.json` sobre `workflows/bot-varman.json`.
2. Quitar el bloque "[F-RECONDUCE] puedo llevar 2" del interceptor,
   `cantidadPregunta` de `textos.js` y la sección 45.
3. `node workflows/build-v4-pedidos.js`.

## ⚙️ Entorno
Node portable en `bot_n8n/herramientas/node/node.exe`. Ver `NOTA-MEJORA-1`.
