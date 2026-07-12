# Nota del agente — Mejoras v5 (bot + app + web) · 2026-07-07

**Brief ejecutado:** `briefs\BRIEF-V5-MEJORAS-2026-07-07.md` — COMPLETO, incluida
la **actualización de mitad de sesión**: sección 5-bis (mapa catálogo↔inventario
con bodegas externas) y el backlog ampliado 10-13 (carrito abandonado, reseña
post-entrega, guía de envío, lista de espera de stock).
**Regla respetada:** la VM de producción NO se tocó — el bot v4.1 sigue corriendo
(verificado hoy desde este PC: challenge de Meta responde 200 con token bueno y 403
con token malo). Todo lo nuevo quedó probado OFFLINE contra Firestore real
(**79/79 PASS** en `tests\test-offline-v4.js`) y espera el paso a la VM con el
runbook de abajo. Nada de credenciales fue a git; el número público no se cambió.

---

## 1. Lo hecho (las 6 mejoras + el backlog completo)

### Mejora 1 — Catálogo con FOTOS en el bot ✅
- Al elegir una categoría, el bot manda una **tanda de máx 5 mensajes de imagen**
  (Cloud API `type: image` con `link`) con caption `Ref {ref} · {detalle} · {precio}`
  y cierra con una **lista interactiva** para elegir la referencia + fila **"Ver más ➡️"**
  (paginación sin estado: `cat:deportivas:5`, `:10`…).
- **De dónde salen las URLs:** los ids de foto del catálogo (`p005`…) son los mismos
  archivos `img/pNNN.jpg` de la web en Cloudflare Pages → URL pública
  `https://varmancrew.pages.dev/img/p005.jpg` (verifiqué que responden 200 image/jpeg).
  Nada de base64 ni imágenes en memoria (RAM 1 GB intacta).
- **Fallback obligatorio cumplido:** las refs cuya foto no es un archivo público
  (ids `f...` = fotos subidas después desde la app) salen como **línea de texto** y
  SIEMPRE aparecen en la lista para elegir — nunca un mensaje roto. Si Meta no
  pudiera bajar una imagen, el error queda en `botErrores` y la lista sigue llegando.
- **Ojo:** el catálogo NO tiene campo `nombre` — el caption usa la **marca** si está
  registrada y si no la categoría (ej. `Ref 01 · Adidas · $259.900`).

### Mejora 2 — Búsqueda por marca ✅
- Gemini ahora extrae la entidad `marca` (intent `buscar_marca`), tolerante a
  ortografía. Probado con Gemini REAL: `"tienen addidas?"` → adidas,
  `"las adidas q valen"` → adidas, `"quiero unos nike talla 40"` → nike.
- El bot filtra por el campo **`marca`** del catálogo y muestra las refs con fotos
  (mismo formato de tanda + "Ver más"). Si ninguna ref tiene esa marca, respuesta
  honesta + catálogo normal.
- **Backfill:** el catálogo NO tenía campo `marca` ni `nombre` del cual inferir.
  Siguiendo la regla del proyecto (NO adivinar marcas mirando fotos), solo se
  infirió lo que el propio Cristhian ya enlazó: la **ref 01** tiene
  `refInventario: VRM071` cuyo modelo es "ADIDAS EQT…" → quedó `marca: "Adidas"`
  (escrito con updateMask, sin tocar nada más). **Las otras 32 refs quedaron sin
  marca** → las llena Cristhian desde la app (paso manual 3).
- La pestaña **Tienda de la app ahora tiene el campo "Marca"** (con sugerencias:
  Adidas, Nike, Jordan, New Balance…) y el guardado lo conserva.

### Mejora 3 — Pago más fácil (QR + dato copiable) ✅
- Al elegir método de pago, si existe la variable `PAGO_QR_<METODO>` en el `.env`,
  el bot manda **3 mensajes**: (a) la **imagen del QR**, (b) un mensaje aparte con
  **SOLO el número/llave** (para copiar con un toque), (c) el **total** + pedir
  comprobante. Si la variable no existe o está vacía → **el texto único de siempre**
  (probado: el flujo de pago nunca se rompe).
- Variables nuevas (comentadas, listas para llenar) en `bot_n8n\.env` y en
  `credenciales\.env.produccion-gcp`: `PAGO_QR_NEQUI`, `PAGO_QR_DAVIPLATA`,
  `PAGO_QR_BREB`. Instrucciones para generar los QR: paso manual 2.

### Mejora 4 — Web → bot con producto prellenado ✅
- **Web** (`web\publicar\index.html`): los botones "Pedir" ahora abren
  `wa.me/<WHATSAPP_NUMERO>?text=Hola! Quiero la Ref {ref} ($precio COP) 👟`.
  `var WHATSAPP_NUMERO` sigue siendo la ÚNICA fuente del número (regla de EL CORTE
  intacta). Probado en navegador: clic en "Pedir" de la ref 01 arma exactamente ese enlace.
- **Bot**: intent "ref directa" (regex, sin gastar Gemini) reconoce ese texto — y
  también el formato viejo "Me interesa la referencia #03…" por si quedan enlaces
  compartidos — y arranca el pedido YA en esa referencia: **foto + precio + pedir
  talla**, sin pasar por el menú.

### Mejora 5 — App: anular ventas sin dañar el inventario ✅
- En la pestaña Ventas, al tocar una venta, los **socios** (mismo criterio que la
  Caja) ven el botón **"⛔ Anular venta"**: (a) repone el stock descontado,
  (b) NO borra el registro — lo marca `anulada` con `anulada_fecha`, `anulada_por`
  (correo del socio) y `anulada_motivo` (prueba / devolución / error).
- La venta anulada queda en el historial (gris, tachada, distintivo "ANULADA · motivo")
  pero **no suma en nada**: ventas del día, tarjeta "ventas de hoy", Stats ni Caja.
  El export de ventas ganó la columna "Estado".
- Borrar una venta YA anulada **no devuelve el stock otra vez** (evita inflar el
  inventario). Todo el flujo fue probado en navegador con datos de ejemplo:
  registrar venta (stock 3→2) → anular (stock 2→3, totales $0) → eliminar del
  historial (stock sigue 3). Sin errores de consola.
- `app\reglas-firestore.txt` actualizado: regla nueva en `sales` — cualquier
  escritura que toque campos `anulada*` exige ser socio (paso manual 4).
- **Pedidos del bot:** verifiqué el código completo — **ni el bot ni la app
  descuentan stock por un pedido** (Fase 1 no cruza catálogo↔inventario,
  `DECISION-CATALOGO-INVENTARIO.md` sigue vigente). Por eso **cancelar un pedido
  `verificado`+ no necesita reponer nada** (no se había descontado). El día que el
  equipo registre la venta en la pestaña Ventas al despachar un pedido, la anulación
  de ESA venta es la que repone el stock.

### Mejora 6 — Atribución de pauta (URGENTE 16 jul) ✅
- "Parsear mensaje" captura el objeto `referral` de los webhooks click-to-WhatsApp →
  campo **`fuente`** = `ctwa:<source_id>` (o `organico` si no hay). Como el referral
  SOLO llega en el primer mensaje, el bot lo conserva en la **sesión** aunque el
  cliente navegue, hasta que el pedido se crea (probado end-to-end offline).
- Documentado en `briefs\CAMBIOS-PEDIDOS.md` (único cambio de esquema, autorizado).
- La app lo muestra en el **detalle del pedido** (solo lectura: "📣 Vino de un
  anuncio · id …" / "🌱 Cliente orgánico") y lo exporta en el CSV de pedidos
  (columna "Fuente" — para que marketing mida qué anuncio vende).
- Pedidos viejos no tienen el campo → la app no muestra nada (no inventa "orgánico").

### Mejora 5-bis — Asociar catálogo ↔ inventario CON bodegas externas ✅
- **Ejecuta la Opción B** de `DECISION-CATALOGO-INVENTARIO.md` con los cambios
  pedidos: la asociación se hace **desde la app** (pestaña Tienda), no llenando
  tablas. Cada referencia tiene ahora la sección **"Inventario"**:
  - **Bodega propia:** picker múltiple de códigos VRM (chips con el modelo, se
    quitan con ✕; una ref puede tener varios códigos).
  - **Bodega externa:** combobox de proveedores — escribe un nombre nuevo o
    elige uno ya usado (se guardan en `tiendas/varman/proveedores` y quedan
    para las siguientes refs) + campo `nota` opcional (contacto, condiciones).
  - El tipo (`propia`/`externa`/`mixta`) se deriva solo de lo que se llene y la
    UI lo explica antes de guardar. Vacío = sin asociar (como siempre).
- **Esquema:** `tiendas/varman/mapaCatalogo/{ref}` = `{ ref, tipo, codigosInv,
  proveedor, nota }` (colección PRIVADA, regla con login). **Compatibilidad:**
  `catalogo.refInventario` se sigue escribiendo con el primer código propio, y
  si una ref tiene el enlace viejo pero no mapa, se usa como respaldo.
- **Detalle del pedido:** muestra el origen — stock real **sumando TODOS los
  códigos VRM** asociados y/o el badge "🏭 Externa: {proveedor} — verificar
  disponibilidad" (con la nota si la hay).
- **Bot:** el flujo de venta NO cambió; pero al crear un pedido lee el mapa y,
  si la ref es externa (o mixta), el aviso al 320 agrega la línea
  "🏭 Ref EXTERNA — proveedor: {proveedor}…" para saber a quién pedirla.
- **Anulación de ventas:** solo repone stock de códigos propios por diseño (la
  anulación devuelve el stock del `productoId` de la venta, que siempre es
  bodega propia; una venta libre/externa no descuenta nada → nada que reponer).

### Backlog ampliado 10-13 ✅

**10. Carrito abandonado:** trigger HORARIO nuevo en n8n (nodo "Recordatorios y
avisos (cada hora)"): sesiones que eligieron referencia pero no llegaron al
comprobante, con **3-24h** sin actividad → **UN** recordatorio (texto del brief,
con variante sin talla) y se marca `recordatorio: true` en la sesión (updateMask,
sin tocar el resto). Quien escribe *cancelar* borra su sesión → jamás le llega.
La ventana de 24h está garantizada: `updatedAt` es la hora del último mensaje
del cliente. El dueño está excluido (sesiones de prueba del 320).

**11. Reseña post-entrega + 12. Guía de envío — decisión de arquitectura:** la
app **NO habla con Meta**; deja un doc en **`tiendas/varman/
notificacionesPendientes`** (contrato completo en `briefs\CAMBIOS-PEDIDOS.md`) y
el BOT lo envía: el trigger horario si la ventana de 24h está abierta (se estima
con `botRate/{wa}.updatedAt` = último mensaje entrante; por eso el barrido ahora
conserva esos docs 25h en vez de 1h), o **apenas el cliente vuelva a escribir**
(el Cerebro revisa pendientes en cada mensaje y entrega primero la notificación).
Se eligió esto sobre un polling de pedidos porque la app conoce el momento exacto
de la transición y el bot no tiene que diffear estados (RAM 1 GB).
- **Reseña:** al pasar un pedido a `entregado`, la app encola tipo `resena` con
  descriptor del producto (usa la marca si está: "Adidas de la Ref 01"). El link
  sale de **`LINK_RESENAS_FB`** del `.env` — **sin la variable NO se envía nada**
  (queda `omitida_sin_link`, nunca rompe). Variable comentada lista en ambos .env.
- **Guía:** en el detalle del pedido (desde `verificado`) hay campos
  Transportadora + Guía y el botón **"📦 Guardar guía y avisar al cliente"**
  (el nombre lo dice explícito: guardar = avisar). Escribe `guia`/`transportadora`
  en el pedido (lado app del contrato, documentado) y encola tipo `guia`.
- **Ventana de 24h verificada, sin plantillas pagas:** si la ventana está
  cerrada, el aviso espera (pendiente) y sale cuando el cliente escriba —
  limitación de Meta documentada, tal como pidió el brief.

**13. Lista de espera de stock:** intent `aviso_stock` (Gemini extrae `ref` y
`talla`, probado real: "avisame cuando llegue la talla 40 de la ref 05" →
ref=05 talla=40) → doc en `tiendas/varman/listaEspera` + confirmación al
cliente. Con ref inexistente o sin ref, pide precisar ("escríbeme *avísame de
la ref 05 talla 40*"). **Guarda importante:** los mensajes con "avísame/cuando
llegue" NO disparan el atajo de compra por ref directa. En la app (pestaña
Pedidos) aparece la sección **"🔔 Lista de espera (N)"**: cliente, ref/talla,
fecha, botón 💬 (abre el chat) y **"✓ Ya avisé"** (marca `avisado`). El aviso es
MANUAL por ahora: Cristhian toca 💬, escribe él mismo y marca ✓ — documentado.

### Backlog aprobado — los 3 puntos (7-9) ✅
7. **"¿Cómo va mi pedido?"**: intent `estado_pedido` (Gemini) → busca el último
   pedido del cliente (filtro en JS, sin índices compuestos) y responde el estado
   con explicación en palabras del cliente ("estamos verificando tu pago…").
8. **Anti-spam**: máx **8 mensajes/minuto** por número (ajustable con
   `BOT_MSGS_POR_MIN` en el `.env`), contador mínimo en `tiendas/varman/botRate`.
   Al pasarse: UN aviso amable y luego silencio hasta el minuto siguiente. El dueño
   está exento. Protege el cupo gratis de Gemini (1500/día).
9. **Resumen diario al 320**: sale con el schedule trigger existente (3:15am, junto
   al barrido de sesiones): pedidos nuevos de las últimas 24h (con ref/talla/total/
   estado) + errores del bot + sesiones limpiadas. Si no hay `OWNER_WHATSAPP`, no
   manda nada. El barrido ahora también borra los contadores anti-spam viejos.

---

## 2. Cómo se probó (sin tocar la VM)

- `node tests\test-offline-v4.js` → **79 PASS · 0 FAIL** (Firestore REAL, WhatsApp
  mockeado; Gemini real en el saludo, mockeado en los tests de lógica; limpia sus
  documentos). Cubre: compra completa con fotos, "Ver más", ref directa (formato
  nuevo y viejo), marca con y sin refs, QR presente/ausente, fuente ctwa hasta el
  pedido, "cómo va mi pedido", anti-spam, resumen diario, admin, pausa, sesiones
  caducadas, fallo de descarga del comprobante, **ref externa en el aviso al 320,
  carrito abandonado (con no-repetición), guía y reseña con/sin ventana y con/sin
  link, entrega por el Cerebro al volver a escribir, y lista de espera (incluida
  la guarda de "avísame" vs compra directa)**.
- Gemini REAL clasificó bien el prompt nuevo: marcas con ortografía mala, estado
  de pedido y `aviso_stock` con ref/talla extraídas. (Ojo: el nivel gratis limita
  a ~20 req/min — hoy los tests lo rozaron; el fallback del bot cubre los 429.)
- La **app** compila con su propio Babel y fue probada en navegador (modo local
  sin Firebase): anular/eliminar con stock verificados clic a clic; las pestañas
  Pedidos y Tienda renderizan con las secciones nuevas sin errores de consola
  (lo que depende de Firebase — mapa, proveedores, lista de espera — quedó
  detrás de guards `fbReady()` y se prueba en producción tras el deploy).
- La **web** probada en navegador: el clic en "Pedir" arma el wa.me nuevo.
- Los archivos generados: `workflows\bot-whatsapp-v4-pedidos.json` regenerado
  (~104 KB, **13 nodos** — se sumaron el trigger horario y su nodo de avisos;
  **mismo id `VarmanBotV4Ped01`** — los scripts de la VM activan por id).
  Respaldos: `workflows\respaldo\bot-whatsapp-v4-pedidos.v4.1-pre-v5.2026-07-07.json`
  y `credenciales\varman-bot-vm.tar.gz.pre-v5`. El `varman-bot-vm.tar.gz` quedó
  reconstruido con los workflows v5 (por si algún día toca reinstalar la VM desde cero).

---

## 3. PASO A LA VM (Cristhian, ~10 min, copy-paste — cuando quieras)

La VM se opera desde el navegador (este PC no tiene gcloud ni llave SSH). En
**console.cloud.google.com** (cuenta varmansneakersandclothes) → Compute Engine →
varman-bot → **SSH**:

1. **Subir el workflow nuevo:** en la ventana SSH, botón ⚙/⋮ → *Subir archivo* →
   elegir `bot_n8n\workflows\bot-whatsapp-v4-pedidos.json` del PC (queda en el home).
2. **Respaldo ANTES de tocar nada** (regla de oro):
   ```bash
   cd ~/varman-bot
   bash backup.sh --completo
   ```
3. **Reemplazar el workflow e importar** (el script detiene n8n solo — lock SQLite):
   ```bash
   cp ~/bot-whatsapp-v4-pedidos.json ~/varman-bot/workflows/bot-whatsapp-v4-pedidos.json
   bash importar-workflows.sh
   ```
   (Importa todo `workflows/` y deja activo SOLO `VarmanBotV4Ped01`, ya en v5.)
4. **Salud** (esperar ~1 min a que registren los webhooks):
   ```bash
   bash verificar-salud.sh
   ```
   Debe dar 0 fallos (7/7).
5. **Prueba funcional** desde el WhatsApp del 320 escribiendo al número de PRUEBA
   (como el 7 jul — el bot responde por el 304):
   - `hola` → menú de categorías (igual que antes).
   - Tocar "Deportivas" → deben llegar **5 fotos** + la lista "Elige tu referencia"
     con "Ver más ➡️".
   - `Hola! Quiero la Ref 05` → foto + precio + pide talla directo.
   - `como va mi pedido` → responde el estado del último pedido.
   - `avisame cuando llegue la talla 40 de la ref 05` → confirma la anotación
     (y aparece en la app, pestaña Pedidos → "🔔 Lista de espera").
   - Desde el 320: `pedidos` / `pausar` / `activar` siguen igual.
   - (Con la app ya re-subida) marcar un pedido de prueba como `entregado` y
     guardar una guía → el bot debe mandar los avisos al chat del cliente de
     prueba (la reseña solo si ya pusiste `LINK_RESENAS_FB` en el `.env` de la VM).
   - Carrito abandonado: elegir ref y talla, NO mandar comprobante → el
     recordatorio llega solo entre 3 y 4 horas después (una única vez).
6. **Si algo sale mal:** `bash restore.sh` con el respaldo del paso 2, o volver a
   importar `workflows\respaldo\bot-whatsapp-v4-pedidos.v4.1-pre-v5.2026-07-07.json`
   (subiéndolo igual que en el paso 1). El rollback es 1 comando.

---

## 4. Pasos manuales de Cristhian (además del paso a la VM)

**(1) Subir la app y la web actualizadas a Cloudflare Pages (5 min):**
- App: dash.cloudflare.com → Workers & Pages → **varmanapp** → Create deployment →
  arrastrar la carpeta `app\` completa (trae anular ventas, campo Marca, fuente).
- Web: proyecto **varmancrew** → Create deployment → arrastrar `web\publicar\`
  (trae el wa.me nuevo de los botones "Pedir").
- El orden no importa, pero **la web y el bot v5 conviene subirlos el mismo día**
  para que el texto nuevo del botón coincida con el intent (el bot v5 entiende
  también el texto viejo, así que no se rompe nada si pasan horas entre uno y otro).

**(2) Generar los QR de pago (cuando puedas — el bot funciona sin ellos):**
1. En la app **Nequi**: perfil → *Mi código QR* (o "Cobrar con QR Bre-B") →
   guardar/exportar la imagen del QR. En **Daviplata**: igual si tu versión lo
   ofrece (si no, se deja solo Nequi — no pasa nada).
2. Pasar las imágenes al PC y guardarlas como:
   `web\publicar\img\pagos\qr-nequi.jpg` (y `qr-daviplata.jpg`, `qr-breb.jpg` si hay).
   Volver a subir `web\publicar\` a Cloudflare Pages (mismo paso 1).
3. Verificar en el navegador que `https://varmancrew.pages.dev/img/pagos/qr-nequi.jpg` abre.
4. En la VM (SSH): `nano ~/varman-bot/.env` → quitar el `#` y llenar:
   `PAGO_QR_NEQUI=https://varmancrew.pages.dev/img/pagos/qr-nequi.jpg` → guardar →
   `cd ~/varman-bot && docker compose up -d` (recrea n8n con la variable nueva).
5. Probar: pedir algo y elegir Nequi → debe llegar el QR + el número solo + el total.

**(3) Llenar la marca de las 32 referencias (app → pestaña Tienda, ~10 min):**
- Abrir cada referencia → campo nuevo **"Marca (opcional)"** → escribirla (salen
  sugerencias) → Guardar y publicar. La **ref 01 ya quedó con "Adidas"** (se infirió
  del inventario VRM071 que tú mismo enlazaste; ninguna otra se adivinó — regla del
  proyecto). Sin marca, esa ref simplemente no aparece cuando pregunten por marca.
- No hace falta hacerlas todas de una: el bot usa las que ya tengan marca.

**(4) Pegar las reglas de Firestore actualizadas (2 min):**
- `app\reglas-firestore.txt` cambió (anular ventas = solo socios, y las 4
  colecciones nuevas del 5-bis/backlog: `mapaCatalogo`, `proveedores`,
  `listaEspera`, `notificacionesPendientes`). Consola de Firebase → Firestore →
  Reglas → borrar todo → pegar el bloque completo → Publicar.
  (Es la MISMA pegada pendiente de antes, ahora con todo lo nuevo en una sola.)
  ⚠ Sin esta pegada, la sección Inventario de la Tienda, la lista de espera y
  los avisos de guía/reseña dan permission-denied en la app.

**(5) `LINK_RESENAS_FB` para la reseña post-entrega (2 min, cuando quieras):**
- Conseguir el link público de reseñas de la página de Facebook (en la página:
  pestaña Reseñas → copiar URL; suele ser facebook.com/<página>/reviews).
- En la VM (SSH): `nano ~/varman-bot/.env` → quitar el `#` y llenar
  `LINK_RESENAS_FB=...` → `cd ~/varman-bot && docker compose up -d`.
- Sin la variable, el bot simplemente NO pide reseñas (nada se rompe).

**(6) Asociar las referencias a su bodega (app → Tienda, poco a poco):**
- Abrir cada referencia → sección **"Inventario"**: agregar sus códigos VRM
  (puede tener varios) y/o escribir el proveedor si es de bodega externa (el
  nombre queda guardado y se reutiliza en las siguientes). Con eso: la pestaña
  Pedidos muestra stock real o el aviso "🏭 Externa: …", y el bot te dice en
  cada pedido nuevo de dónde pedirla. Vacío = todo sigue como hoy.

**(7) Lista de espera — cómo avisar (manual por ahora):**
- Pestaña Pedidos → "🔔 Lista de espera" → tocar 💬 (abre el chat del cliente),
  escribirle tú mismo que ya llegó, y tocar **"✓ Ya avisé"**. El envío
  automático queda para una fase posterior.

---

## 5. Decisiones y notas para la próxima sesión

- **El catálogo no tiene campo `nombre`** — el brief pedía caption "Ref·nombre·precio";
  quedó "Ref · marca-o-categoría · precio". Si algún día se agrega `nombre` al
  catálogo (app + web), el caption está en `textos.js` (`fotoCaption`).
- **app→bot = colección `notificacionesPendientes`** (no polling de pedidos):
  la app conoce el momento exacto de cada transición y el bot no diffea estados.
  Si algún día se necesita otro tipo de aviso, es agregar un `tipo` nuevo al
  contrato (CAMBIOS-PEDIDOS.md) y un caso en `mensajeDeNotificacion` (textos.js).
- **Ventana de 24h = `botRate/{wa}.updatedAt`** (se escribe con cada mensaje
  entrante por el anti-spam; el barrido lo conserva 25h). Si algún día se apaga
  el anti-spam, hay que darle otra fuente a la ventana antes.
- **`refInventario` (ronda 2) sigue vivo por compatibilidad**: la app lo escribe
  con el primer código propio del mapa; los lectores viejos no se rompen. La
  fuente de la verdad nueva es `mapaCatalogo`.
- El generador `web\generar-web.ps1` está OBSOLETO (rutas `web-tienda\` que ya no
  existen y no genera el catálogo dinámico) — la web viva es `web\publicar\index.html`
  y se edita directo. No lo toqué.
- `plantilla\03-bot.md` actualizado con las lecciones v5 (trampas nuevas: fotos por
  URL, contrato web↔bot, referral solo en el 1er mensaje, updateMask, nodo barrido →
  Enviar, `.set()` de la app pisa campos nuevos).
- El nombre del workflow cambió a "…Fase 1 v5 (fotos+marca+QR+fuente)" pero el **id
  es el mismo** (`VarmanBotV4Ped01`): scripts de la VM y RUNBOOK-CORTE siguen válidos.
- Sigue pendiente de Meta: la verificación del negocio → Publicar → E2E real →
  EL CORTE (~14 jul). Nada de eso cambió con la v5.

*Generado por el agente V5 el 2026-07-07. Bot v4.1 EN PRODUCCIÓN intacto; v5 lista
para subir con el runbook de la sección 3.*
