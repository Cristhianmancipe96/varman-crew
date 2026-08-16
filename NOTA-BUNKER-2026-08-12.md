# LOCAL BÚNKER — pestaña nueva en la app (2026-08-12)

Módulo para el local del socio (Andrés): las bodegas le dejan mercancía, él la
vende y al cierre sabe **cuánto le debe a cada bodega** y **cuánto le quedó a él**.

**Es un libro APARTE.** No toca inventario, ventas, caja ni pedidos de VarMan
Crew. Decisión del dueño: el stock de VarMan ya lo descuenta el vendedor en la
pestaña Ventas, así que cruzarlo aquí lo descontaría dos veces. En el Búnker
VARMAN es una bodega más, y el módulo dice cuánto le debe el local.

## Quién la ve
`SOCIOS_BUNKER` en `app/app.jsx`: `andresvargasm91@gmail.com` y
`c.mancipe.96@gmail.com`. El vendedor no la ve **ni la puede leer por API**
(reglas de Firestore). Esconder el botón no protege nada; la protección real
son las reglas.

## Qué hace
- **Resumen** por rango de fechas (Hoy / Semana / Este mes / Mes pasado / Todo
  / fechas a mano): utilidad neta, vendido, costo, pares, cómo entró la plata
  (Efectivo · BC · DV) y la tabla de **lo que le debe a cada bodega**.
- **Ventas**: registro manual (fecha, referencia, talla, bodega, precio de
  compra, precio de venta, medio de pago). Muestra la utilidad antes de
  guardar. Lista agrupada por día con total y utilidad del día.
- **Bodegas**: crear, renombrar, teléfono, nota y **desactivar**. Renombrar NO
  cambia el id → el historial se conserva (así se cambia Francy → Moisés). Una
  bodega con movimientos no se borra: queda inactiva, para no perder la deuda.
- **Estado de cuenta por bodega** con 4 botones: **Documento (carta)**, que es
  la hoja que se le entrega, **Descargar Excel** (CSV), **Copiar resumen**
  (para pegarlo en WhatsApp) y **Registrar pago**.

### El documento que se le entrega a la bodega (revisado 12/08, noche)
Decisión del dueño al verlo impreso: **la bodega NO ve pagos ni saldo
acumulado** — eso es cuenta del local. La hoja trae **solo las ventas de esa
bodega en el rango elegido**: `# · Fecha · Descripción · Talla · Valor`, el
total con el número de pares, y dos líneas de firma (entrega / recibe).
- **Tamaño carta de verdad**: `@page{size:letter}`, márgenes de 14×13 mm, la
  cabecera de la tabla se repite en cada hoja (`table-header-group`) y ninguna
  fila se parte a la mitad. Medido en el navegador a 816 px (carta a 96 dpi):
  la tabla ocupa 703 px, **no se desborda**, y entran **38 ventas por hoja**
  (una entrega normal cabe en una sola).
- **PDF descargable, sin librerías.** El botón de la lista dice **PDF** y baja
  un archivo de verdad (no abre el diálogo de impresión), para mandarlo por
  WhatsApp. Lo arma `descargarPDF()` en `app.jsx`: el documento es texto y
  rayas sobre una hoja carta, así que se escribe el PDF a mano (PDF 1.4,
  Helvetica —una de las 14 fuentes estándar, no hay que incrustar nada—,
  WinAnsi para las tildes y la ñ). **No se metió jsPDF a propósito:** son
  ~350 KB en un bundle que es público y que cada celular descarga. Incluye la
  tabla de anchos reales de Helvetica para alinear los números a la derecha y
  cortar las descripciones largas sin que se monten sobre la columna de al lado.
  El PDF real pesa ~17 KB para 58 ventas en 2 hojas.
- El botón "Imprimir" (hoja HTML) sigue estando dentro de "Ver cuenta", igual
  que el Excel. El CSV no tiene formato y por eso no cabía en una carta — era
  lo que el dueño estaba intentando imprimir.
- **Verificación del PDF** (`revisar-pdf.js`, en el scratchpad de la sesión):
  15 comprobaciones sobre el archivo generado con el código real — que los 8
  offsets del `xref` caigan exactamente en su objeto, que el `/Length` de cada
  stream sea el de verdad, que las páginas declaradas coincidan, que ningún
  texto se salga de los márgenes ni se monte con la columna siguiente, y que no
  aparezca la palabra "pago" ni "saldo". Todo OK. (El primer intento marcó una
  falla que era **del verificador**, no del PDF: leía la tabla `xref` corrida
  una línea. Se vio porque el mensaje decía *cuál* objeto apuntaba *a dónde*.)
- El Excel y el "Copiar resumen" quedaron con el mismo criterio: solo ventas
  del rango y total, sin pagos ni saldo.
- **Pagos** a cada bodega: bajan el saldo; se pueden editar y borrar.
- **Gastos** del local: nómina, arriendo, servicios, caja menor, otro. Restan
  en la utilidad neta del rango.

## Colecciones nuevas en Firestore
`bunkerVentas` · `bunkerProveedores` · `bunkerPagos` · `bunkerGastos`
(bajo `tiendas/varman/`, igual que las demás).

## PASOS PARA PONERLO EN PRODUCCIÓN
1. ✅ **Reglas de Firestore publicadas** por el dueño el 12/08/2026.
2. ✅ **App desplegada** en Cloudflare Pages el 12/08/2026.
   ⚠ **Falta re-desplegar**: la pasada de diseño del 12/08 (abajo) es
   posterior a ese despliegue.
3. ✅ **Histórico cargado**: 714 ventas + 8 bodegas escritas en Firestore el
   12/08/2026 (verificado con conteo: `bunkerVentas` 714, `bunkerProveedores`
   8). Se subieron con el MISMO lector de la app (`bkLeerCSV`) vía la API REST
   de Firestore con un token de `gcloud` (proyecto `varman-crew`), así que los
   documentos son idénticos a los que habría creado el botón Importar — volver
   a importar el CSV desde la app no duplicaría nada, solo los pisaría igual.
   - Bodegas creadas: VARMAN, ROCIO, OTROS, MOISES, ESTEFANY, MACCAN, LUIS, PAOLA.
   - El CSV hay que pasárselo a Andrés solo si quiere re-importar. No se puede
     dejar dentro de `app/` porque esa carpeta es **pública** en internet y
     expondría los costos de compra de las 8 bodegas (misma lección del
     2026-07-21 con `importar-datos.html`). Está en `data/bunker/`, ignorado
     por git.
   - Para la base anterior a julio que está en el PC: en Excel *Guardar como →
     CSV* y subirla por el botón **Importar** (acepta separador `;` `,` o
     tabulación, fechas d/m/aaaa, aaaa-mm-dd o serial de Excel, y montos con
     `$` y puntos).

## Pasada de diseño (12/08/2026, tras verlo el dueño en el celular)
Queja: *"muchas funciones y se ve muy desorganizada"* + *"no veo ningún dato"*.
- **El panel de VarMan Crew ya no se muestra en Búnker.** Ventas de hoy, pares
  en stock y "por agotarse" son de OTRO negocio; encima de las cuentas del
  local solo confundían. (La Caja ya lo ocultaba; ahora Búnker también.)
  Son ~200px recuperados antes del primer dato.
- **Los 6 chips de periodo → una sola barra** que no se desborda y que dice el
  rango de verdad ("Este mes · 1 ago – 12 ago"); los presets y las fechas
  exactas viven en una hoja. Antes el chip "Todo" quedaba cortado en 375px.
- **"Importar" salió del encabezado** al menú (⋯): es una acción de una vez en
  la vida, no algo que compita con el título todos los días.
- **El rango dejó de repetirse** en cada tarjeta ("GASTOS · DEL 01/08 AL
  12/08" → "Gastos del periodo"): ya está en la barra de arriba.
- **Primer arranque honesto:** sin datos ya no se pintan cuatro tarjetas en $0
  (que se leen como "no vendiste nada"); se muestra un solo aviso que explica
  que el histórico no sube solo, con el botón al lado.
- **Aviso de permisos:** si Firestore rechaza la lectura, ahora lo dice y
  explica qué falta, en vez de mostrar ceros (el no-op silencioso otra vez).
- **La barra de pestañas se centra en la activa:** con 7 pestañas el botón
  Búnker quedaba fuera de pantalla. Es un scroll **instantáneo** a propósito:
  `behavior:"smooth"` no corre en pestañas ocultas ni en segundo plano y
  dejaría el botón invisible, que es justo el problema que arregla.
- **Contraste (afecta a TODA la app):** el gris de los textos secundarios era
  `#7E7E85` = 4.03:1 sobre blanco y 3.66:1 sobre el fondo, por debajo del
  mínimo legible (4.5:1). Ahora `#6B6B72` = 5.29:1 y 4.80:1. Se ve casi igual
  y se lee con sol, que es donde se usa la app.

### Tercera pasada: fichas invisibles + tablero de gráficas (12/08, noche)
- **BUG que reportó el dueño:** las cuatro fichas del Resumen (Vendido, Costo,
  Pares, Pagado) eran ilegibles. Causa: se reusó `<MiniStat>`, que está hecho
  para el panel NEGRO (`background: rgba(255,255,255,.07)`, `color:#fff`);
  sobre fondo claro es blanco sobre blanco. Ahora usan `bkStat()`, la versión
  para fondo claro (valor en `#101012` = 18:1, borde visible).
  **Regla: `MiniStat` SOLO va dentro del panel oscuro.**
- **Pestaña "Gráficas"** (quinta del módulo), en el mismo idioma oscuro del
  tablero de Stats para que no parezcan dos apps. Cuatro preguntas, cuatro
  formas:
  1. **Día a día** — barras apiladas: costo (gris) + utilidad (naranja) suman
     exactamente la venta. Apiladas y NO dos líneas superpuestas porque venta y
     utilidad tienen escalas distintas y una gráfica con dos ejes miente. Con
     más de 45 días se agrupa por semana sola. Se **toca una barra** y arriba
     sale ese día (en celular no hay hover).
  2. **A quién le debo más** — barras horizontales ordenadas, con el valor.
  3. **Lo que más se vende** — top 6 por pares, con la utilidad que dejó.
  4. **Cómo entró la plata** — una barra apilada de 3 partes + porcentajes.
- **Colores de las series verificados con el validador de paletas**
  (`#E8571C` efectivo · `#2E86FF` BC · `#B58900` DV, sobre `#16161D`): banda de
  luminosidad, croma, contraste ≥3:1 y separación para daltonismo ΔE 30.6
  protan / 20.8 tritan. **Si hay que cambiarlos, volver a pasar el validador,
  no elegirlos a ojo.** El primer intento (naranja/azul/amarillo brillantes)
  falló la banda de luminosidad: sobre fondo oscuro los tonos van más profundos,
  no más neón.

### Segunda pasada: "está muy claro" (12/08, tarde)
Al quitar el panel negro de VarMan, las vistas Ventas / Bodegas / Gastos
quedaron blanco sobre casi blanco. Arreglado sin irse a modo oscuro:
- **Un ancla oscura por vista**, siempre en el mismo sitio, con el número que
  manda en esa pestaña: Resumen → utilidad neta · Ventas → vendido en el
  periodo · Bodegas → lo que le debe a las bodegas (en naranja si debe) ·
  Gastos → gastos del periodo. Es UN bloque que cambia de contenido, no cuatro
  tarjetas repetidas.
- **Pestaña activa en negro sólido** (antes: blanco sobre casi blanco).
- **Las tarjetas del módulo llevan borde**, no solo sombra: blanco sobre
  `#F4F4F2` con sombra suave se lee como una mancha (`bkCard()`).
- **Las líneas que llevan datos** (bodega · medio · compra, "vendí X · pagué
  Y", totales del día) pasaron de `muted` a `ink2` (11.3:1). Las etiquetas y
  los textos de ayuda se quedan en `muted`.

## Comprobado antes de entregar
Con el CSV real de 714 filas, corriendo el `app.jsx` de verdad fuera del
navegador (`babel` local + `vm`):
- 714 ventas leídas, 0 omitidas, **714 ids únicos**.
- Releer el mismo archivo da **exactamente los mismos ids** (idempotente).
- Totales del histórico: vendido **$90.890.000**, costo **$78.605.000**,
  utilidad **$12.285.000**.
- Deuda por bodega: LUIS 20.305.000 · VARMAN 18.580.000 · OTROS 10.570.000 ·
  ESTEFANY 7.435.000 · MOISES 7.265.000 · PAOLA 6.940.000 · ROCIO 6.510.000 ·
  MACCAN 1.000.000. (Es lo vendido acumulado; los pagos ya hechos hay que
  cargarlos para que el saldo quede en la realidad.)
- `Rocío` y `ROCIO` caen en la MISMA bodega (si no, la deuda se partiría en dos).
- 10 filas del Excel traían el pago partido en dos columnas: se importan como
  medio **"mixto"** guardando el desglose, y el resumen las reparte bien.

## Saldo real por bodega (el arreglo de la deuda inflada)
El Excel del local solo tiene VENTAS, nunca los pagos hechos, así que al cargar
el histórico la app mostraba como deuda **todo lo vendido desde julio**
($78.605.000). Decisión del dueño (12/08): en vez de digitar decenas de pagos
viejos, cada bodega lleva un **saldo real acordado**:

> *"Al 31/07/2026 yo le debía $X"* → todo lo vendido **hasta** esa fecha queda
> cuadrado dentro de ese número, y de ahí en adelante el saldo se mueve solo con
> las ventas y los pagos nuevos.

Es el mismo mecanismo del `ANCLA_CAJA` de la Caja de VarMan. Campos nuevos en
cada documento de `bunkerProveedores`: `saldoInicial` (número) y `saldoFecha`
(`aaaa-mm-dd`). Sin `saldoFecha` no se aplica nada: sin fecha de corte no se
sabría qué ventas quedan dentro del número y cuáles se suman aparte.

- Se pone en **Bodegas → (bodega) → Editar bodega → "Saldo real acordado"**, o
  desde el atajo que aparece en el estado de cuenta de cualquier bodega que
  todavía no lo tenga.
- El formulario **muestra el resultado antes de guardar** ("Quedará debiendo $Y
  en total").
- El documento que se le entrega a la bodega (PDF/Excel) dice explícitamente
  que el saldo incluye ese acuerdo y desde qué fecha.
- **Hay que ponerlo en las 8 bodegas** para que el número global sea real.

Probado en el navegador con los 714 datos reales: con LUIS en $3.000.000 al
31/07, su saldo pasó de $20.305.000 a **$8.840.000** (= 3.000.000 + 5.840.000
vendidos en agosto) y el total bajó a $67.140.000; poniendo VARMAN en
$5.000.000 al 31/07 quedó en $9.275.000 y el total en $57.835.000. Todo cuadra
al peso.

## Pendiente / decisiones abiertas
- **Poner el saldo real de las 8 bodegas** (arriba). Hasta que se haga, el
  "saldo total" muestra todo lo vendido desde el 1 de julio como deuda.
- Los nombres **BC** y **DV** se dejaron tal cual el Excel. Si quieren decir
  otra cosa (banco / Daviplata), es cambiar `BK_MEDIOS` en `app.jsx`.
- El módulo no lleva inventario del local (qué tiene cada bodega en exhibición);
  solo lo que se vende. No se pidió.
