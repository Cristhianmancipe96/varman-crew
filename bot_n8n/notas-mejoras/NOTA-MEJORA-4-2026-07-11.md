# NOTA MEJORA 4 — Pregunta-vs-dato en talla (C2) · 2026-07-11

## Contexto: [C1] ya estaba hecho
Antes de C2 verifiqué [C1] "No repetir la plantilla del paso": **ya está implementado**
en los 4 estados (v6, flag `BOT_ROBUSTEZ`). Cuando Gemini responde una duda a mitad de
flujo, el bot manda SOLO `asist.respuesta`, nunca la plantilla del paso encima:
- talla: `else if (asist.respuesta)` → "Nada de plantilla encima."
- pago: "NO reenviar el bloque de pago encima. Los botones siguen arriba."
- comprobante: "NO reenviar el recordatorio encima."
- datos: solo `asist.respuesta` cuando no avanza.
No hubo código nuevo para C1; lo dejé registrado en la BITÁCORA como verificado.

## Qué cambié (C2)
En el paso **talla**, con `BOT_ROBUSTEZ` ON, hay un fallback crudo: si Gemini queda
**degenerado** (devuelve `dato` y `respuesta` vacíos) pero el texto trae un número
35–45, el código lo tomaba como la talla. Eso fijaba talla por error cuando el número
venía en una **pregunta** ("¿tienen la 35?").

- `workflows/src/cerebro-v4.js`:
  - nuevo helper `esPreguntaTalla(t)` — detecta pregunta por `?`/`¿` o verbos
    ("tienen", "hay", "manejan", "disponible", "les queda", "consiguen", "venden",
    "llega…").
  - el fallback pasa de `else if (sizeM)` a `else if (sizeM && !esPreguntaTalla(texto))`.
    Ahora "¿tienen la 35?" NO fija talla (se queda en el paso, pide el número);
    "uso la 40" SÍ la fija.

## Flag
**Sin flag nuevo.** El cambio vive dentro de la rama `else if (asist)`, que **solo**
corre cuando `asistir()` devolvió algo, y eso exige `BOT_ROBUSTEZ` ON. Con
`BOT_ROBUSTEZ` **OFF** (default), el paso talla usa el camino determinista v5
**sin cambio** → bot = hoy. Es decir, C2 ya viaja detrás del flag existente
`BOT_ROBUSTEZ` (apagado por defecto).

## Variable de entorno
Ninguna nueva.

## Tests
`tests/test-offline-v4.js` sección **31** (Gemini mockeado degenerado):
- "¿tienen la 35?" → NO fija talla (sigue en `talla`). **Fallaba hoy** (fijaba talla 35).
- "uso la 40" → SÍ fija la talla (avanza a `datos`). (control)

Resultado: **147 PASS · 0 FAIL** (antes 145; +2 checks).

## Cómo revertir
1. Copiar `workflows/respaldo/bot-varman.pre-mejora-4.json` sobre `workflows/bot-varman.json`.
2. Descartar en `workflows/src/cerebro-v4.js` el helper `esPreguntaTalla` y volver el
   fallback a `else if (sizeM)`. Quitar la sección 31 de `tests/test-offline-v4.js`.
3. `node workflows/build-v4-pedidos.js`.

El respaldo `pre-mejora-4.json` es el estado exacto de antes de esta mejora (incluye
A1 + B1 + B3).

## ⚙️ Entorno
Node portable en `bot_n8n/herramientas/node/node.exe` (no está en PATH). Ver
`notas-mejoras/NOTA-MEJORA-1-2026-07-11.md`.
