# NOTA MEJORA 9 — [E1] Foto/insistencia de un modelo que no tenemos → asesor (flag BOT_FOTO_ASESOR) · 2026-07-11

## Qué cambié
Dos caminos nuevos en el bloque "sin pedido en curso" de `workflows/src/cerebro-v4.js`,
detrás del flag **`BOT_FOTO_ASESOR`** (default **OFF**), origen `BRIEF-GEMINI-3`:

1. **Foto de un modelo sin pedido en curso** → hoy la foto cae al catálogo genérico.
   Con el flag ON: se le dice al cliente con honestidad que esas puntuales no las
   tenemos y que **un asesor confirma** (BANCO §3), y se avisa al 320 con nombre +
   número + **la foto reenviada por su `media_id`** (constructor nuevo `msjImagenId`:
   la Graph API acepta `image: {id}` — no se descarga nada a memoria; RAM 1 GB en la VM).
2. **Insistencia tras `marcaSinResultados`** → hoy el bot repite el catálogo en bucle.
   Con el flag ON: al responder "de esa marca no tengo" se guarda `marcaNoDisp` en la
   sesión (con `fsMerge`, igual que la `fuente`). Si el siguiente mensaje es una
   insistencia clara (regex `MARCA_INSISTE`: "sí o sí", "como sea", "insisto",
   "consíguemelas"…) **o vuelve a pedir la misma marca**, se pasa el dato al asesor
   (aviso al 320 con la marca y el último mensaje) en vez de repetir el catálogo.
   Determinista, sin gastar Gemini. Tras pasar al asesor, `marcaNoDisp` se limpia.

Textos nuevos en `workflows/src/textos.js`: `fotoAsesorCliente`, `fotoAsesorAvisoDueno`,
`fotoAsesorFotoCaption`, `marcaAsesorCliente`, `marcaAsesorAvisoDueno`.

Con el flag **OFF** todo se comporta EXACTO como hoy (la foto cae al catálogo; la
insistencia va al clasificador normal). La foto del **comprobante** (pedido en curso,
estado `comprobante`) NO pasa por este camino: ese flujo sigue intacto (test 35c).

## Por qué
BANCO §14.6/§14.8: cuando el cliente busca un modelo exacto que no está (foto o
marca), hoy el bot da vueltas en el catálogo y la venta se enfría. Pasarlo al asesor
con contexto (y con la foto) convierte ese dead-end en una venta posible por el 320.

## Flag nueva
**`BOT_FOTO_ASESOR`** — default **OFF**. Para activar en la VM: `BOT_FOTO_ASESOR=on`.
- OFF (hoy): foto sin pedido → catálogo; insistencia → clasificador normal.
- ON: foto → asesor (con reenvío al 320); insistencia tras marca sin resultados → asesor.

## Tests (sección 35, deterministas)
- 35a flag OFF: foto sin pedido → catálogo de hoy, sin aviso al 320. (= hoy)
- 35b flag ON: foto → "un asesor confirma" + aviso al 320 + foto reenviada con
  `image.id` (sin `link`, sin descarga).
- 35c flag ON: la foto del COMPROBANTE sigue cerrando el pedido (no se desvía).
- 35d flag ON: marca sin refs → mismo aviso honesto + la sesión recuerda `marcaNoDisp`;
  "las quiero SÍ o SÍ" → asesor + aviso al 320 con la marca + se limpia la pendiente.
- 35e flag ON: repetir la MISMA marca sin refs → asesor (no repite catálogo).
- 35f flag OFF: la misma insistencia sigue el flujo de hoy (sin aviso al 320).

Resultado: **168 PASS · 0 FAIL** (antes 156; +12 checks).

## Mantenimiento del arnés en esta misma corrida (deriva del catálogo, 3ª vez)
El baseline arrancó verde, pero a MITAD de la corrida Cristhian subió 5 refs nuevas
de deportivas (35–39) con foto de app (`f…`, sin foto pública) y con `orden` que las
pone de primeras → la 1ª tanda quedó con **0 imágenes** y el arnés crasheó en la
sección 2 (`imgs[0].image.link`). Parche (solo tests, sin tocar `src/`):
- Helper `ofertasDe(r)` = imágenes + líneas de fallback "• *Ref NN*": lo estable es
  la **oferta de 5 refs por tanda**, no cuántas van como imagen. Usado en secciones
  2, 7 y 20.
- Helper `refConFotoPublica()` (+ soporte `arrayValue` en el `unwrap` del arnés) para
  los asserts que sí o sí necesitan una foto real (URL 200, ficha con foto): si la
  tanda no trajo imágenes, toma cualquier ref del catálogo con foto `pNNN`.
Esto REFUERZA la urgencia de **[T1] tests contra catálogo fixture** (queda de 1ª en
la cola): el parche aguanta la deriva, pero el fixture es la solución de fondo.

## Dato para Cristhian (tarea 3 del brief: refs sin marca)
Verificado hoy contra el catálogo vivo: **38 refs activas, 0 sin `marca`** — ya está
todo poblado desde la app, el match por marca cubre el catálogo completo. Nada que hacer.

## Cómo revertir
1. Copiar `workflows/respaldo/bot-varman.pre-mejora-9.json` sobre `workflows/bot-varman.json`.
2. Quitar de `cerebro-v4.js`: `msjImagenId`, `MARCA_INSISTE`, `FLAG_FOTO_ASESOR`, los
   dos bloques `[E1]` del else "sin pedido en curso" y la rama `[E1]` de `buscar_marca`.
   Quitar de `textos.js` el bloque `[E1]`. Quitar la sección 35 + `BOT_FOTO_ASESOR` del
   delete-list del test (los helpers `ofertasDe`/`refConFotoPublica` pueden quedarse:
   son del arnés, no del flag).
3. `node workflows/build-v4-pedidos.js`.

## ⚙️ Entorno
Node portable en `bot_n8n/herramientas/node/node.exe` (no está en PATH). Ver
`notas-mejoras/NOTA-MEJORA-1-2026-07-11.md`.
