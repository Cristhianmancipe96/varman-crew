# NOTA MEJORA 7 — Textos de venta más cálidos (flag BOT_TEXTOS_V2) · 2026-07-11

## Qué cambié
Versión más cálida (tono del BANCO) de 2 textos clave de la venta, detrás del flag
`BOT_TEXTOS_V2`, con un **bloque de override** al final de `workflows/src/textos.js`:

```js
if (BOT_TEXTOS_V2 on) {
  TEXTOS.pedirTalla   = '¡Excelente elección! 🔥 ¿Qué *talla* calzas? … 35 a la 45 … Si la usas nacional o US, dime cuál … Para cambiar de referencia, escribe *cancelar*.';
  TEXTOS.tallaAnotada = '¡Perfecto, *talla {talla}* anotada! ✅ Ya casi 🙌 Regálame en un solo mensaje: *Nombre completo · Dirección · Ciudad · Teléfono de contacto* y alistamos tu pedido 📦.';
}
```

Con el flag **OFF**, `TEXTOS` queda **idéntico a hoy** (el override no corre). El
patrón (override al final de textos.js) permite warmear copy sin duplicar el flujo
ni tocar `cerebro-v4.js`.

## Por qué
El copy es lo que vende. Los textos v5 son correctos pero secos. El BANCO (guion
aprobado con Cristhian, datos reales) tiene un tono más cálido, con CTA claro y la
calidad 1.1 en positivo, **sin mexicanismos**. `pedirTalla` y `tallaAnotada` son de
los mensajes más vistos (cada venta pasa por ellos), así que son el mejor punto de
partida. Detrás de flag para poder comparar/revertir (es venta).

## Flag nueva
**`BOT_TEXTOS_V2`** — default **OFF**.
- OFF (hoy): textos v5.
- ON: `pedirTalla` y `tallaAnotada` en versión cálida del BANCO.

## Variable de entorno (documentar, NO tocar .env)
Para activar en la VM: `BOT_TEXTOS_V2=on`. El override se aplica en todos los nodos
Code (usan `$env`), pero solo cambia estos 2 textos, que solo usa el Cerebro.

## Tests
`tests/test-offline-v4.js` sección **34** (deterministas, sin Gemini):
- flag OFF: `tallaAnotada` es la v5 (sin "Ya casi"). = hoy.
- flag ON: `tallaAnotada` cálido ("Ya casi" + datos). (Fallaba hoy.)
- flag ON: `pedirTalla` cálido ("Excelente elección" + "35 a la 45"). (Fallaba hoy.)

Resultado: **156 PASS · 0 FAIL** (antes 153; +3 checks).

## Próximos textos a warmear (misma técnica, 1-2 por vuelta)
`categoriasBody` (bienvenida, BANCO §1), `comprarIntro`, `datosFaltan`/`datosIncompletos`
(BANCO §9), `pedidoRecibido` (cierre), `refDirectaIntro`. Todos con test de "sale el
mensaje clave" y bajo el mismo flag `BOT_TEXTOS_V2`.

## Cómo revertir
1. Copiar `workflows/respaldo/bot-varman.pre-mejora-7.json` sobre `workflows/bot-varman.json`.
2. Quitar el bloque `if (BOT_TEXTOS_V2…)` de `workflows/src/textos.js` y la sección 34 +
   delete-list de `tests/test-offline-v4.js`.
3. `node workflows/build-v4-pedidos.js`.

El respaldo `pre-mejora-7.json` es el estado exacto de antes de esta mejora (incluye
A1 + B1 + B3 + C2 + B2 + D3).

## ⚙️ Entorno
Node portable en `bot_n8n/herramientas/node/node.exe` (no está en PATH). Ver
`notas-mejoras/NOTA-MEJORA-1-2026-07-11.md`.
