# NOTA FLUIDEZ 5 — Acuse datos→pago con la ciudad (flag BOT_FLUIDEZ_ACUSE) · 2026-07-11

**Backlog fluidez: [F2] "acuse + transición humana antes de pedir el siguiente dato".**
(talla→datos ya acusa con `tallaAnotada`; la transición seca era datos→pago.)

## Qué cambié
Con **`BOT_FLUIDEZ_ACUSE`** (default **OFF** = genérico de hoy): al avanzar de
datos a pago, si se reconoce la ciudad en los datos de envío, el bloque de pago
la menciona — "¡Listo! 🙌 Envío a *Cali* anotado 📦 … (envío incluido 🚚)" — en
vez del "Tu pedido va quedando listo" genérico. Se siente leído, no plantilla, y
recuerda el gancho de venta "envío incluido" (BANCO §13).

- `ciudadTitulo()`: busca la ciudad en `CIUDADES_CO` por **palabra completa**
  (no substring: "localidad" contiene "cali") y la muestra bonita (mapa
  `CIUDAD_BONITA` con tildes: Bogotá, Medellín, …; el resto capitalizado).
- `botonesPago()` ganó un 4º parámetro opcional `bodyTexto` (mismo patrón que
  `listaElegir`); solo el avance datos→pago lo usa — los re-asks y el fallback
  de Wompi siguen con el body de hoy.
- Ciudad no reconocida → body genérico (nunca inventa).

## Tests (sección 41)
- OFF: body genérico sin "Envío a".
- ON: Cali acusada + "envío incluido" + pregunta de pago · Bogotá con tilde y
  contra entrega presente en la lista · ciudad desconocida → genérico.

Resultado: **214 PASS · 0 FAIL** (antes 210; +4).

## Cómo revertir
1. `workflows/respaldo/bot-varman.pre-fluidez-5.json` sobre `workflows/bot-varman.json`.
2. Quitar `FLAG_FLUIDEZ_ACUSE`, `ciudadTitulo`/`CIUDAD_BONITA`, el parámetro
   `bodyTexto` de `botonesPago` y el bloque `[F-ACUSE]` del avance datos→pago;
   `pagoBodyAcuse` de `textos.js`; sección 41 + flag del delete-list.
3. `node workflows/build-v4-pedidos.js`.

## ⚙️ Entorno
Node portable en `bot_n8n/herramientas/node/node.exe`. Ver `NOTA-MEJORA-1`.
