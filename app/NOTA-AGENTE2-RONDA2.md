# NOTA AGENTE 2 — RONDA 2 (2026-07-06)

**Ámbito tocado:** `app\app.jsx`, `app\LEEME-APP.txt`, `plantilla\02-app.md` y esta nota.
No se tocó `bot_n8n\` (solo lectura), ni `web\`, ni `deploy\`, ni `reglas-firestore.txt`
(no hizo falta, ver tarea 3).

## Tarea 1 — Exportar pedidos a Excel ✔

Botón verde "Exportar Excel" en la cabecera de la pestaña Pedidos (mismo `BotonExportar`
de Inventario/Ventas/Caja). Exporta TODOS los pedidos, el más reciente arriba, con las
columnas del brief: **Fecha, Cliente, Teléfono, Referencia, Talla, Total, Método de pago,
Estado** (+ Nota interna, que si no se perdía al exportar). Detalles:

- Fecha en hora local formato `2026-07-06 10:04` (ordena bien en Excel).
- Teléfono con espacios (`57 300 1112233`): 12 dígitos seguidos Excel los muestra
  como "5,73E+11".
- El estado sale con su etiqueta legible; los literales viejos del bot
  (`pagado (por verificar)`) se normalizan igual que en pantalla.
- Archivo: `varman-pedidos-<fecha>.csv` (CSV con BOM y `;`, como los demás).

## Tarea 2 — Enlace opcional catálogo↔inventario (`refInventario`) ✔ SIN activar por defecto

- **Pestaña Tienda**, hoja de edición de cada referencia: selector nuevo
  "Referencia del inventario (opcional)" con las VRM del inventario (únicas, etiquetadas
  `VRM012 — Nike Air Max 90 (Negro)`). Por defecto "Sin enlazar — verificar stock a mano
  (como siempre)". Se guarda como campo `refInventario` en `tiendas/varman/catalogo/{id}`
  (vacío si no se enlaza). Si una VRM enlazada luego se borra del inventario, el selector
  la muestra como "(ya no está en el inventario)" en vez de perderla en silencio.
- **Pestaña Pedidos**: si la referencia del pedido está enlazada, el detalle muestra el
  stock real junto al aviso de siempre:
  - Verde: `📦 Inventario VRM012 · talla 40: 3 pares en stock — confirma igual antes de aprobar.`
  - Rojo si 0 pares en esa talla.
  - Ámbar si esa VRM entró del Excel **sin tallas separadas** (caso real anotado en
    `DECISION-CATALOGO-INVENTARIO.md`): muestra el stock TOTAL con la aclaración
    "(sin tallas separadas en el inventario) — confirma la talla a mano", en vez de un
    "0" engañoso.
  - Sin enlace → texto de siempre ("verifica el stock a mano"). Nada cambia.
- La pestaña Pedidos escucha `catalogo` solo mientras está abierta (docs livianos, las
  fotos van en `catalogoFotos`). El banner de la pestaña ahora explica las dos vías.
- Cristhian enlaza gradualmente desde la app, sin migraciones — la opción no invasiva
  que pedía el brief como respuesta a `bot_n8n\briefs\DECISION-CATALOGO-INVENTARIO.md`.

**Dos avisos honestos para el PM (Cowork):**
1. `catalogo` es de lectura PÚBLICA (la web la lee sin login), así que el código VRM
   enlazado queda técnicamente visible para quien mire la base. Es solo un código interno
   (no expone stock, costos ni nada más); la DECISION lo marcaba como el "contra" de su
   opción A. El brief de ronda 2 pidió explícitamente el campo en el catálogo, así se
   hizo; si algún día molesta, mover el enlace a una colección privada (`mapaCatalogo`,
   opción B) es un cambio contenido en la app.
2. El campo es **una** VRM por referencia (así lo pide el brief). La DECISION contempla
   que una ref del catálogo pueda corresponder a varias VRM; en ese caso se enlaza la
   principal y el resto se sigue verificando a mano.

## Tarea 3 — Reglas / LEEME ✔

- `reglas-firestore.txt` **no cambia**: `refInventario` vive en `catalogo`, que el equipo
  con login ya puede escribir y la web ya puede leer. La pegada pendiente de Cristhian
  sigue siendo exactamente la misma de la ronda 1.
- `LEEME-APP.txt` actualizado con la sección "HECHO (ronda 2)".

## Tarea 4 — Plantilla ✔

`plantilla\02-app.md` creado: qué es genérico, qué está hardcodeado de VarMan (tabla con
líneas/anclas de búsqueda), variables que define un negocio nuevo y montaje de cero en 8
pasos con tiempos. Escrito para ejecutarse sin conocer VarMan.

## Cómo se probó (igual que en ronda 1: sin tocar la nube real)

Banco de pruebas local con un **mock de Firebase** (datos de ejemplo: 3 VRM de inventario,
3 referencias de catálogo —una enlazada, una sin enlazar, una enlazada a VRM sin tallas—
y 4 pedidos en distintos estados). Verificado en navegador, sin errores de consola:

- La app compila (Babel) y renderiza; badge de pedidos cuenta bien los dos literales.
- CSV exportado con columnas, formato de fecha/teléfono y orden correctos.
- Detalle de pedido: stock verde (3 pares), rojo (talla agotada), ámbar (VRM sin tallas),
  y comportamiento intacto sin enlace (aviso + media_id del comprobante).
- Selector de Tienda: lista las VRM con modelo/color, carga el valor guardado, y al
  guardar escribe `refInventario` SIN pisar ningún otro campo del doc.
- El cambio en Tienda se refleja en vivo en el detalle del pedido (tiempo real).
- La foto del comprobante se sigue descargando desde `comprobantes/{idPedido}`.

## Contratos (sin novedad para los otros agentes)

- La app sigue escribiendo SOLO `estado`/`notas`/`actualizado` en `pedidos`.
  `refInventario` se escribe en `catalogo` (colección de la app), tal como lo registra el
  brief de ronda 2 en "Contratos vigentes". El bot no tiene que cambiar nada.

## Pendientes de Cristhian (sin cambios + 1)

1. Pegar `reglas-firestore.txt` en Firebase Console (las mismas de la ronda 1).
2. **Volver a subir `app\` a Cloudflare Pages** para que lo de esta ronda quede en
   producción (pasos en LEEME-APP.txt).
3. Cuando quiera, ir enlazando referencias en la pestaña Tienda (opcional, a su ritmo).

*Agente 2 (Claude Code) — 2026-07-06, ronda 2.*
