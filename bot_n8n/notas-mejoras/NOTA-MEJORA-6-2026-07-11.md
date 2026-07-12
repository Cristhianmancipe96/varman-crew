# NOTA MEJORA 6 — Validación de datos de envío (flag BOT_DATOS_V2) · 2026-07-11

## Qué cambié
El paso **datos** ahora puede validar de forma determinista que el cliente mandó
**nombre + dirección + ciudad + teléfono**, y si falta algo lo dice claro. Detrás
del flag `BOT_DATOS_V2`.

- `workflows/src/cerebro-v4.js`:
  - nuevo flag `FLAG_DATOS_V2` (lee `BOT_DATOS_V2`).
  - nuevo `validarEnvio(t)` → `{ok, faltan:[...]}`:
    - **teléfono**: 7–10 dígitos (celular colombiano 10, fijo 7).
    - **dirección**: palabra clave (calle/carrera/cra/cll/av/diagonal/…), un `#`, o
      "cl/kr/cra 10", etc.
    - **ciudad**: contra una lista de ciudades colombianas (`CIUDADES_CO`).
    - **nombre**: al menos dos palabras alfabéticas seguidas.
  - en el paso datos: con el flag ON, `pareceEnvio = validarEnvio(texto).ok`; también
    avanza si **Gemini confirma** (extrae un `dato` con teléfono). Si no, manda
    `TEXTOS.datosFaltan` **listando qué falta** en vez del genérico.
- `workflows/src/textos.js`: nuevo `datosFaltan` ("…me falta: *{faltan}*…").

Con el flag **OFF**, se usa el criterio v5 (15+ chars, con robustez además un
dígito) y el mensaje genérico `datosIncompletos` — **igual que hoy**.

## Por qué
La validación v5 (15+ chars + dígito) es muy laxa: "Juan Pérez, 3001234567" (sin
dirección ni ciudad) pasaba a pago y el pedido quedaba sin dirección real. Y cuando
rechazaba, el mensaje no decía qué faltaba. D3 lo hace robusto y guía al cliente.
Como es más **estricto** (riesgo de rechazar un dato válido con formato raro), va
detrás de flag OFF y con la salida de Gemini como confirmación alterna.

## Flag nueva
**`BOT_DATOS_V2`** — default **OFF**.
- OFF (hoy): criterio v5 + mensaje genérico.
- ON: `validarEnvio` (nombre+dirección+ciudad+teléfono) o Gemini confirma; mensaje
  que dice qué falta.

## Variable de entorno (documentar, NO tocar .env)
Para activar en la VM: `BOT_DATOS_V2=on`.

## Tests
`tests/test-offline-v4.js` sección **33**:
- flag OFF: "Juan Pérez, 3001234567" avanza a pago (v5 laxo). = hoy.
- flag ON: ese mismo texto NO avanza (sigue en datos) y **dice qué falta** (dirección,
  ciudad). (Fallaba hoy — el rojo.)
- flag ON: "Juan Pérez, Calle 10 #20-30, Medellín, 3001234567" SÍ avanza a pago.

Resultado: **153 PASS · 0 FAIL** (antes 149; +4 checks).

## Cómo revertir
1. Copiar `workflows/respaldo/bot-varman.pre-mejora-6.json` sobre `workflows/bot-varman.json`.
2. En `workflows/src/cerebro-v4.js` quitar `FLAG_DATOS_V2`, `CIUDADES_CO`/`validarEnvio`,
   `geminiConfirma` y volver el paso datos al `pareceEnvio` v5. Quitar `datosFaltan` de
   `textos.js` y la sección 33 + delete-list de `tests/test-offline-v4.js`.
3. `node workflows/build-v4-pedidos.js`.

El respaldo `pre-mejora-6.json` es el estado exacto de antes de esta mejora (incluye
A1 + B1 + B3 + C2 + B2).

## Idea futura
`CIUDADES_CO` es una lista fija; si un cliente escribe una ciudad no listada con el
flag ON, "ciudad" saldría como faltante. Ampliar la lista o, mejor, dejar que Gemini
(robustez) confirme la ciudad. Considerar cargar la lista desde config si crece.

## ⚙️ Entorno
Node portable en `bot_n8n/herramientas/node/node.exe` (no está en PATH). Ver
`notas-mejoras/NOTA-MEJORA-1-2026-07-11.md`.
