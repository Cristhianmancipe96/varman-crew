# NOTA FLUIDEZ 6 — Textos de venta con CTA de cierre (flag BOT_TEXTOS_V2) · 2026-07-11

**Cierra el resto del ítem E2b + mandato del dueño: "bot entrenado para concretar
las ventas". Todos bajo el flag existente `BOT_TEXTOS_V2` (OFF = v5 exacto).**

## Qué cambié (bloque de override en `textos.js`)
- **`comprarIntro`** (intención de compra): "¡De una! 🔥 … te lo aparto de una vez 👇".
- **`refDirectaIntro`** (llegada desde la web/anuncio): "¡Esa está buenísima! 🔥
  Mírala, y si te gusta la apartamos de una 👇".
- **`datosIncompletos`**: "Ya casi 🙌 Regálame en un solo mensaje: *Nombre completo ·
  Dirección · Ciudad · Teléfono* y dejamos tu pedido listo 📦." (una sola pregunta,
  empuje a cerrar).
- **`datosFaltan`** (con `BOT_DATOS_V2`): "Ya casi 🙌 Solo me falta: *{faltan}* …"
  (conserva el placeholder).

Con esto el ítem E2b queda COMPLETO (bienvenida y cierre salieron en la mejora 12;
`pedirTalla`/`tallaAnotada` en la 7).

## Tests (sección 42)
OFF: `comprarIntro` v5. ON: CTA "te lo aparto" · "la apartamos" en ref directa ·
`datosIncompletos` cálido · `datosFaltan` cálido conservando qué falta (con D3).

Resultado: **219 PASS · 0 FAIL** (antes 214; +5).

## Cómo revertir
1. `workflows/respaldo/bot-varman.pre-fluidez-6.json` sobre `workflows/bot-varman.json`.
2. Quitar las 4 líneas `[F6]` del bloque `BOT_TEXTOS_V2` en `textos.js` y la
   sección 42 del test.
3. `node workflows/build-v4-pedidos.js`.

## ⚙️ Entorno
Node portable en `bot_n8n/herramientas/node/node.exe`. Ver `NOTA-MEJORA-1`.
