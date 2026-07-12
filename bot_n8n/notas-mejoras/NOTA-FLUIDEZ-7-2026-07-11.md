# NOTA FLUIDEZ 7 — Arranque del pedido en UNA burbuja (flag BOT_FLUIDEZ_CATALOGO) · 2026-07-11

**Backlog fluidez: [F5] "un turno = una pregunta" — aplicado al camino más
caliente: TODA compra pasa por el arranque del pedido.**

## Qué cambié (`arrancarPedido` en `cerebro-v4.js`)
Con **`BOT_FLUIDEZ_CATALOGO`** ON (mismo flag de la tanda compacta, F2): elegir
una referencia (lista, web o cambio de ref) manda **UNA sola burbuja** — la foto
con caption = intro (si hay) + ficha + `pedirTallaCorta` ("¿Qué *talla* calzas?
(de la *35 a la 45*) 👟"). Antes eran 3 burbujas (intro + ficha + pedirTalla).
- Si la ref no tiene foto pública: un solo TEXTO con lo mismo.
- Si la talla ya venía en el mensaje ("quiero la Ref 05 en talla 42"): ficha sin
  pregunta + confirmación "anotada" aparte (2 burbujas, va directo a datos).
- `cantidadNota` (2+ pares) sigue aparte, solo cuando aplica.
Con OFF: las 3 burbujas de hoy, idénticas.

También se actualizó el check de la sección 38 que asumía la forma anterior del
arranque con el flag ON.

## Hallazgo de la minería (mandato "mira a fondo")
`tiendas/varman/botErrores` está **vacío** (0 docs): no hay errores de producción
acumulados desde el último barrido — nada que minar hoy; buena señal de salud.
Se re-mina en una vuelta futura cuando haya tráfico.

## Tests (sección 43)
- OFF: elegir ref = 2 burbujas (hoy).
- ON: 1 burbuja con talla en el caption y sesión en `talla` · ref directa web =
  1 burbuja con intro+ficha+talla · talla en el mensaje = ficha sin pregunta +
  anotada (2 burbujas, a `datos`).

Resultado: **223 PASS · 0 FAIL** (antes 219; +4).

## Cómo revertir
1. `workflows/respaldo/bot-varman.pre-fluidez-7.json` sobre `workflows/bot-varman.json`.
2. Quitar el bloque `[F-UNTURNO]` de `arrancarPedido`, `pedirTallaCorta` de
   `textos.js`, la sección 43 y restaurar el check original de la sección 38.
3. `node workflows/build-v4-pedidos.js`.

## ⚙️ Entorno
Node portable en `bot_n8n/herramientas/node/node.exe`. Ver `NOTA-MEJORA-1`.
