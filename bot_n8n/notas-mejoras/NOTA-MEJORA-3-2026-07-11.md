# NOTA MEJORA 3 — Dispatch sin dead-ends (flag BOT_DISPATCH_V2) · 2026-07-11

## Qué cambié
El dispatch del clasificador (bloque "sin pedido en curso") ahora da un **camino
útil explícito** a los intents `pregunta_precio`, `saludo` y `ver_catalogo`, en vez
de dejarlos caer al `else` genérico. Detrás del flag `BOT_DISPATCH_V2`.

- `workflows/src/textos.js`: nuevos `precioInfo` (rango de precios + envío incluido)
  y `precioCatalogo` (CTA al catálogo).
- `workflows/src/cerebro-v4.js`:
  - nuevo flag `FLAG_DISPATCH_V2` (lee `BOT_DISPATCH_V2`).
  - ramas nuevas antes del `else`, guardadas por el flag:
    - `pregunta_precio`: manda la respuesta de Gemini **o** `TEXTOS.precioInfo` si
      Gemini no dio texto, y luego el catálogo. Antes, un `pregunta_precio` sin
      respuesta de Gemini caía al catálogo genérico **sin mencionar precios**.
    - `saludo` / `ver_catalogo`: bienvenida + categorías (camino explícito).
  - el `else` sigue siendo el **fallback seguro** (intent desconocido o Gemini →
    `null`): catálogo + saludo cálido, nunca un "no entendí" seco.

Con el flag **OFF**, esos intents caen al `else` **igual que hoy** (bot = hoy).

## Por qué
Tras A1, un fallo de Gemini ya degrada a catálogo (no hay "no entendí" seco). Lo que
faltaba era que una **pregunta de precio** tuviera respuesta propia: hoy, si el
clasificador dice `pregunta_precio` pero no genera texto, el cliente ve el catálogo
genérico sin ninguna referencia al precio. Con el flag ON, siempre recibe el rango de
precios (con envío incluido) + el catálogo. Los caminos de `saludo`/`ver_catalogo`
se hacen explícitos para que ningún intent listado dependa del catch-all.

## Flag nueva
**`BOT_DISPATCH_V2`** — default **OFF**.
- OFF (hoy): `pregunta_precio`/`saludo`/`ver_catalogo` → `else` (catálogo). Idéntico.
- ON: caminos explícitos; `pregunta_precio` responde el rango de precios.
Patrón igual que los demás flags (`on|1|true|si|sí`).

## Variable de entorno (documentar, NO tocar .env)
Para activar en la VM: `BOT_DISPATCH_V2=on`. Sin la variable, el bot = hoy.

## Tests
`tests/test-offline-v4.js` sección **30** (nueva, Gemini mockeado):
- flag **OFF**: `pregunta_precio` sin texto NO menciona precios (cae al catálogo). = hoy.
- flag **ON**: `pregunta_precio` responde el rango ($235.000–$480.000) **y** muestra
  el catálogo. (Este caso **fallaba** hoy — el rojo que lo demuestra.)
- flag **ON**: `saludo` sigue mostrando el catálogo (no dead-end).

Resultado: **145 PASS · 0 FAIL** (antes 141; +4 checks de la sección 30).

## Cómo revertir
1. Restaurar el JSON: copiar `workflows/respaldo/bot-varman.pre-mejora-3.json` sobre
   `workflows/bot-varman.json`.
2. Descartar los cambios de `workflows/src/textos.js` (quitar `precioInfo`/
   `precioCatalogo`), `workflows/src/cerebro-v4.js` (quitar `FLAG_DISPATCH_V2` y las
   ramas guardadas) y de `tests/test-offline-v4.js` (sección 30 + delete-list).
3. `node workflows/build-v4-pedidos.js` para regenerar.

El respaldo `pre-mejora-3.json` es el estado exacto de antes de esta mejora (incluye
A1 + B1).

## ⚙️ Entorno
Node portable en `bot_n8n/herramientas/node/node.exe` (no está en PATH). Ver
`notas-mejoras/NOTA-MEJORA-1-2026-07-11.md`.
