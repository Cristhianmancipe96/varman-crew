# ESTADO — VarMan Crew   (actualizado 2026-07-18 por Cowork/PM)

> Este es el TABLERO técnico DETALLADO del proyecto (el largo).
> 📌 MEMORIA PRINCIPAL (desde 2026-07-13): se guarda en la BÓVEDA de Obsidian →
> `C:\Users\andre\Claude_obsidian\Claude_obsidian\10-Proyectos\Varman-Crew\ESTADO.md` (leer esa
> primero). Este archivo queda como el detalle largo. Regla dura: la memoria de VarMan se escribe
> SOLO dentro de la bóveda; para escribir fuera de ella, avisar y pedir OK primero.

## En una línea
Tienda de zapatos online (VarMan Crew) con 3 piezas —tienda web, app de inventario y bot de
WhatsApp— EN PRODUCCIÓN. El bot ya tiene TODO lo de la campaña desplegado (venta directa con
foto, atribución de anuncios, anti-ruido) con sus **6 flags ON en la VM**. **No está bloqueado —
solo falta la VERIFICACIÓN E2E en vivo** y montar la pauta (meta 16 jul).

## En vivo ahora
- **Tienda:** https://varmancrew.com (y varmancrew.pages.dev) — en vivo ✅
- **App inventario:** https://varmanapp.pages.dev — en vivo ✅
- **Bot WhatsApp:** VM de Google Cloud (bot.varmancrew.com), +57 304 291 6972 — en producción ✅
- **Datos:** Firebase, proyecto `varman-crew`

## Sesión 2026-07-18 (tarde) — carrito web + auditoría móvil + tope de tallas EU 44
**Código listo en `web\publicar`, PENDIENTE de re-subir a Cloudflare Pages (`varmancrew`).**
Detalle completo en `web\NOTA-CARRITO-2026-07-18.md`. Resumen:
- **Carrito de 2+ productos en un solo pago Wompi.** `_worker.js` `/api/comprar` acepta
  `items:[{ref,talla,cantidad,genero}]` (retrocompatible: 1 producto = byte-idéntico a antes).
  Precio siempre del catálogo real. Topes 8 refs / 10 pares. Pedido con 2+ ítems guarda un
  resumen en los campos de siempre (`ref`, `talla`, `cantidad`) + detalle exacto en `items_json`
  (nuevo, opcional). App (`Pedidos`) ya lo muestra si viene. Tests worker: **20/20 PASS**.
- **Auditoría móvil — 2 bugs reales:** (1) layout se ensanchaba 375→411px en celular (marquesina +
  palabra del hero) → `overflow-x:clip`. (2) el cierre del menú móvil corría con CUALQUIER clic y
  desbloqueaba el scroll del fondo con el modal/carrito abiertos → arreglado.
- **Placas Dama/Caballero:** ahora muestran cuántos modelos hay + barra de estado del filtro
  ("Viendo: Dama — 34 modelos · Ver todo ✕") para no perderse.
- **Envío GRATIS** visible en 3 puntos (modal, formulario, pie del carrito) — pedido del dueño.
- **Tope de tallas EU 44 (no 47):** rango default hombre era CO 35-45 (=EU 37-47, imposible de
  despachar) → corregido a **CO 35-42 (EU 37-44)** en `index.html` Y `_worker.js` (deben ir
  iguales). Dama sin cambios (ya estaba bien). Ref con tallas propias en la app sigue mandando.
  ⚠ El **bot de WhatsApp NO se tocó** (sigue en "35 a 45") — queda desalineado con la web hasta
  que el dueño decida si también hay que ajustarlo.
- Todo verificado con mediciones reales en navegador (viewport móvil 375px): sin desborde,
  bloqueos de scroll correctos, chips de talla terminan en el tope correcto, 6/6 bloques de
  script sin errores de sintaxis.

## Sesión 2026-07-18 — bot v6.9 DESPLEGADO: avisos que sí llegan + 4 funciones (Cowork)
Batería **352 PASS · 0 FAIL**. Subido a la VM y **publicado** (`verificar-salud.sh` 7/7 OK).
Flags YA ON en el `.env`: `BOT_LOG_FALLOS`, `BOT_REF_PAUTA`, `BOT_SI_CATALOGO`, `BOT_FOTO_REFS`.
Guía completa: `bot_n8n\PASOS-V6.9-AVISOS-Y-REF-PAUTA.txt`.
- **LA FALLA GRANDE (reportes al 320 que no llegaban) — causa DOBLE:**
  1. **Ventana de 24h:** fuera de ventana Meta acepta (wamid, n8n verde) pero NO entrega (131047).
  2. **Ejecuciones en cola:** Executions mostraba corridas de las 3:16am (10/13/14/15 jul) en
     "Starting soon/Queued" → esos días el resumen **ni se ejecutó** (cola zombie tras reinicios).
  - Fix 1 `BOT_AVISO_PLANTILLA`: todos los avisos al dueño salen como **plantilla aprobada**
    (helper `msjAvisoDueno()` en `textos.js`, usado por Cerebro + barrido + Wompi; aplana `\n`→" | ").
  - Fix 2 `BOT_LOG_FALLOS`: "Parsear mensaje" emite `statuses: failed` → `botErrores` con código.
  - Plantilla creada en Meta: **`aviso_bt`** · **`es_CO`** (Spanish COL) · Utilidad · **en revisión**.
    ⚠ NO encender `BOT_AVISO_PLANTILLA` hasta que diga "Activa".
- **`BOT_REF_PAUTA`:** "precio" pelado → ficha de la ref elegida en la app (`botConfig/general.refPauta`)
  y sigue el pedido; "quiero más información" → pregunta por esa ref y el "sí" la muestra.
- **`BOT_SI_CATALOGO`:** "Si mil gracias"/"dale" sueltos → catálogo (antes repetía la pregunta).
- **`BOT_FOTO_REFS`:** foto del cliente → el bot aclara que **es un bot y no ve imágenes**, manda las
  fotos de las refs marcadas en la app (`botConfig/general.refsFoto`, máx 9) + **lista desplegable**
  (ids `ref:NN`) y fila "Ninguna de estas" (`foto:asesor` → handoff). La foto se reenvía al 320.
- **Texto de foto (sin flag):** ya no dice "no las tengo" → "un asesor te atiende para terminar tu pedido".
- **App:** pestaña Tienda, tarjeta "🤖 Bot" (desplegable ref de precio + chips refs de foto), escribe
  con `merge`. **Requiere la regla nueva `botConfig`** en `app/reglas-firestore.txt`.
- **Pendiente del dueño:** publicar reglas (botConfig + vendedor), desplegar app y elegir refs,
  encender la plantilla al aprobarse, verificar el resumen del 19 jul.

## Sesión 2026-07-13 — bot DESPLEGADO en producción con todo lo de la campaña (Cowork)
El dueño subió el bot v6.4-2026-07-13 a la VM, encendió los 6 flags (confirmado por `printenv`) y
lo probó en vivo: **"responde súper bien".** Todo aditivo + batería **298/0**. Lo desplegado hoy:
- **Fotos NUEVAS del bot (DESPLEGADO, sin flag):** las fotos que el dueño sube desde la app viven
  en Firestore (`catalogoFotos`, dataURL base64), no en una URL — el bot solo sabía mandar las
  viejas (`pNNN`), por eso la ficha llegaba sin foto. Fix: la web las sirve en `/foto/<fid>.jpg`
  (endpoint nuevo en `web/publicar/_worker.js`, lectura pública; Cloudflare cachea → la VM NO
  carga) y `fotoUrlDe()` del bot arma ese enlace para los ids nuevos. Se subió `web/publicar` a
  Cloudflare + bot a la VM. **Verificar en vivo:** que la foto llegue al pedir "¿Tienes <modelo>?".
- **Doble bienvenida con "?" suelto (DESPLEGADO, flag `BOT_ANTIRUIDO=on`):** un 2º mensaje de solo
  signos/emoji ("Tienes esto" + "?") caía al clasificador → 'saludo' → repetía la bienvenida.
  Con el flag ON, si el mensaje no tiene NINGUNA letra ni número, no se contesta (es ruido/cola).
  OFF = comportamiento de hoy. **Verificar en vivo:** "Tienes estas" + "?" → sin bienvenida repetida.
- **Decisión de números:** orgánico (botón WhatsApp de FB, bios) → **320** (lo atiende el dueño a
  mano); pauta (click-to-WhatsApp) → **304 (el bot)**. El botón orgánico de FB no deja conectar el
  304 (es número de API); se deja el 320 y no se toca.
- **Mensajes prellenados de la campaña (plantilla lista):** cada anuncio va por un modelo puntual;
  el prellenado NOMBRA el modelo (como está en la app) → el bot dispara la venta directa (foto +
  precio + talla). Plantilla + paso a paso del montaje en el Escritorio:
  `CAMPANA-META-PASO-A-PASO.txt` (el dueño solo cambia el nombre del modelo el día de la campaña).
- **6 flags ON en la VM (confirmado):** `BOT_CATALOGO_WEB`, `BOT_FOTO_ASESOR`, `BOT_NOMBRE_MODELO`,
  `BOT_FUENTE_DETALLE`, `BOT_MODELO_ASESOR`, `BOT_ANTIRUIDO`. Lección: `importar-workflows.sh` hace
  `stop/start`, que NO recarga el `.env` → tras tocar flags SIEMPRE `docker compose up -d --force-recreate`.

## Lo ÚNICO que le falta al bot: VERIFICACIÓN en vivo (no está bloqueado)
El bot está completo y en producción. Antes de encender la pauta, confirmar E2E desde otro WhatsApp:
1. Saludo → bienvenida corta (una sola vez).
2. "Tienes estas" + "?" aparte → responde sin repetir la bienvenida (fix anti-ruido).
3. "¿Tienes <modelo exacto>?" → llega la FOTO + precio + pregunta la talla (venta directa).
4. Una COMPRA completa (talla → datos → pago Wompi) de punta a punta.
5. Atribución `fuente`: se prueba el 16 con un clic real en el propio anuncio (no se puede a mano).

## Afinación del bot con AGENTES EN BUCLE (Claude Code)
- **Mejora continua + fluidez:** muchas corridas hechas (mejoras 1-12, fluidez F1-F10, más
  catálogo-web CW1/CW2 — detalle abajo). Batería offline **298/0 verde**, desacoplada del
  catálogo vivo (fixture fijo, mejora T1 — editar el catálogo en la app ya NO rompe los tests).
  Memoria y backlog: `bot_n8n/briefs/BITACORA-MEJORAS.md`.
- **Flags ENCENDIDOS en producción (al 2026-07-13):** los de base (`BOT_ROBUSTEZ`,
  `BOT_FLUIDEZ_RECONDUCE`, `BOT_CLASIF_V2`, `BOT_DISPATCH_V2`) + los 6 de campaña
  (`BOT_CATALOGO_WEB`, `BOT_FOTO_ASESOR`, `BOT_NOMBRE_MODELO`, `BOT_FUENTE_DETALLE`,
  `BOT_MODELO_ASESOR`, `BOT_ANTIRUIDO`). Quedan flags OFF de menor prioridad (fluidez fina) para
  encender de a uno viendo conversaciones reales — ver `BITACORA-MEJORAS.md`.

## Catálogo solo por link de la WEB + seguimiento de venta — DESPLEGADO Y EN PRODUCCIÓN
Decisión del dueño: la VM (1 GB) se saturaba mandando fotos por WhatsApp → el bot **ya NO
manda catálogo con fotos**; en su lugar responde con el link `varmancrew.com/#catalogo` y el
cliente elige/compra en la web. Todo detrás de `BOT_CATALOGO_WEB` (ON en la VM). Excepción
(2026-07-13): al pedir un MODELO puntual sí manda UNA foto de esa ref (venta directa) — 1 sola
foto no satura, y la sirve Cloudflare vía `/foto/<fid>.jpg`, no la VM.
- **v1 (CW1, ya en producción):** en todo punto de catálogo (saludo, cat:/marca:, comprar,
  MPM nativo) va UN mensaje con el link. Seguimiento automático a las ~2h preguntando si pudo
  comprar (con guardas: no interrumpe charla activa, no le llega a quien ya compró por el bot
  ni a quien canceló). Backup del catálogo vivo dejado en
  `bot_n8n/workflows/respaldo/catalogo-firestore-backup-2026-07-11.json`.
- **v2 (CW2, LISTO — falta que el dueño lo suba):** ajuste de tono pedido tras probar en vivo:
  el saludo ("hola") ya NO manda el link en frío — da una bienvenida corta y espera la
  pregunta del cliente; "catálogo" (o sinónimos) sí manda el link, de forma determinista (ni
  siquiera depende de Gemini); preguntar por una marca que SÍ hay dice cuántos modelos tiene +
  el link (mirando el catálogo real, nunca inventa); marca/referencia que NO existe → honesto
  + link + puerta al asesor.
- **Nombre del modelo (flag NUEVO `BOT_NOMBRE_MODELO`, construido, apagado):** los mensajes al
  CLIENTE (pago confirmado, pedido recibido, contra entrega, "¿cómo va mi pedido?") van a
  mostrar la **marca que se registra desde la app** ("tus *Nike*") en vez de "Ref 07"; la ref
  sigue viajando por dentro y en los avisos al 320 (los necesita para alistar). Si una ref no
  tiene marca puesta en la app, cae al texto de hoy (nunca inventa) — **por eso conviene que
  el dueño le ponga marca a todas las refs activas en la app.**
- **Foto de un modelo → asesor (`BOT_FOTO_ASESOR`, ya existía, apagado):** cuando el cliente
  manda una FOTO sin pedido en curso, el bot avisa al 320 reenviando la foto — solo falta
  encenderlo en el `.env`.
- **Estado: DESPLEGADO (2026-07-13).** El dueño ya subió el bot con estos flags ON y lo probó
  en vivo. Guía fija de subida en el Escritorio: `PASOS-SUBIR-CATALOGO-WEB.txt`. Notas:
  `bot_n8n/notas-mejoras/NOTA-CATALOGO-WEB-2026-07-11.md` y `NOTA-CATALOGO-WEB-V2-2026-07-12.md`.

## Compra directa en la WEB por Wompi — LISTO y probado en sandbox (2026-07-11)
El cliente compra en varmancrew.com sin volver al WhatsApp: elige talla y paga con Wompi;
al aprobarse, **el webhook del bot (sin cambios) confirma** y avisa al 320 y al cliente.
Brief `web/briefs/BRIEF-WEB-COMPRA-WOMPI.md`; nota `web/NOTA-WEB-COMPRA-WOMPI-2026-07-11.md`.
- **Qué se construyó** (aditivo, detrás del flag `COMPRA_WOMPI` en `index.html`):
  - `web/publicar/index.html`: botón Comprar → modal con talla (selector CO/EU/US + equivalencia),
    cantidad, datos de envío y prefijo de país; selector de sección Dama/Caballero (placas de
    color) + color de acento por tarjeta; marquesina restyle. "¿Cómo comprar?" oculta.
  - `web/publicar/_worker.js` (NUEVO, Cloudflare Pages): `POST /api/comprar` valida, lee el
    **precio real** del catálogo, crea link Wompi + pedido (`estado: pago_pendiente`, `canal: web`).
  - `app/app.jsx`: mapea `pago_pendiente`/`pago_confirmado` en Pedidos (+ badge), muestra "🌐 web",
    y en la pestaña Tienda añade campos **Género** (dama/caballero) y **Tallas**.
  - Contrato `canal:'web'` documentado en `bot_n8n/briefs/CAMBIOS-PEDIDOS.md`.
- **Tallas:** hombre/unisex EU=CO+2 (US10=EU43=CO41); dama EU=CO+1 (EU35=CO34). En la app las
  tallas se escriben SIEMPRE en talla colombiana.
- **Género en el pedido (2026-07-12):** el pedido web lleva `genero` (dama/caballero). Si la
  ref es unisex, el cliente elige "¿para quién?" en el modal (obligatorio); el aviso del bot al
  320 y al cliente ya lo dicen ("Talla 40 · Dama"). Contrato en `CAMBIOS-PEDIDOS.md`, batería 273/0.
- **Diseño (2026-07-12):** placas Dama/Caballero con animación de turbina al pulsar + el fondo
  de la página se tiñe un poco hacia el color elegido (la marca sigue naranja); acento de color
  por tarjeta. Todo respeta `prefers-reduced-motion`. **Falta que el dueño suba el bot v6.3 nuevo**
  (Escritorio) para que los avisos de Wompi digan el género.
- **Probado E2E en sandbox:** compra → pago aprobado (4242…) → webhook confirmó el pedido solo.
- **Falta SOLO del dueño:** poner en Cloudflare (proyecto varmancrew → Settings → Variables)
  `WOMPI_PRV_KEY` (Secret), `FIREBASE_SA_B64` (Secret), `WOMPI_ENV=test` → **re-subir web\publicar**.
  Rollback en 1 línea: `COMPRA_WOMPI=false`.

## Auditoría de seguridad + calidad — HECHA (2026-07-12), quedan 5 fixes en cola
Auditoría completa en 5 ciclos (código de las 3 piezas, reglas de datos, VM, producción en
vivo, CVEs) + revisión triple con verificación adversarial (12 agentes). Informe:
`seguridad/INFORME-SEGURIDAD-2026-07-12.md`. Lo CRÍTICO ya corregido: reglas de Firestore
endurecidas (lista de correos del equipo, antes cualquier cuenta autenticada leía pedidos),
webhook del bot idempotente ante reintentos tardíos (batería 271/0), XSS residual, repo git
local SIN secretos (verificado archivo por archivo). n8n 2.28.6 = parchado contra los CVEs
2026. **Quedan 5 hallazgos confirmados** (timeout del pago, bfcache, cancelación en vuelo,
mensajes de error, pago-sobre-cancelado del bot) EMPACADOS en
`web/briefs/BRIEF-HARDEN-PAGO-RONDA2.md` para la próxima ronda — ninguno bloquea la venta.

## Marketing — campañas FB/IG/TikTok (actualizado 2026-07-13)
> Estado al 07-13: los flags de campaña (`BOT_FUENTE_DETALLE`, `BOT_MODELO_ASESOR`,
> `BOT_FOTO_ASESOR`, `BOT_NOMBRE_MODELO`) YA están **ON y desplegados** en la VM (lo de abajo con
> "(apagado)" es el detalle histórico de cómo se construyó cada uno). Mensajes prellenados +
> montaje: Escritorio `CAMPANA-META-PASO-A-PASO.txt` y `GUIA-MONTAJE-META-IG.md`.
Plan original (7-8 jul) en `web/marketing/` (8 docs; vista rápida: `PLAN-CAMPANAS-MARKETING.html`).
Plan vigente = **2 MESES con ciclos de prueba** en `web/marketing/plan-2-meses/PLAN-2-MESES.md`.
**Revisión con skill `/ads` (era Andromeda, 12 jul):** el plan quedó validado; deltas aplicados —
(1) público ANCHO (Colombia+18-40+Advantage+ ON, intereses solo como sugerencia, no filtro),
(2) creativo como máquina semanal (estáticos on-feet ganan; 1 creativo nuevo por rotación),
(3) truco "palabra-identidad" en el titular (talla/uso/ciudad; nunca marca de tercero),
(4) video orgánico que despegue → subirlo tal cual como anuncio pago. Runbook de montaje
listo para el día (una sola campaña; IG es UBICACIÓN, no campaña aparte):
`web/marketing/plan-2-meses/GUIA-MONTAJE-META-IG.md`. Estado de prerequisitos (reporte
del dueño, 12 jul):
- TikTok — ✅ ya existe: **@varmansnk** (mismo handle que IG; verificado en los links de la
  web). NO hay que crear @varmancrew como decía el plan.
- Precios — ✅ ya establecidos en la app → ya se puede usar "Desde $XXX.XXX" en anuncios/captions.
- Atribución `fuente` (referral del click-to-WhatsApp):
  - Simple (id del anuncio → pedido) ya existía; **falta probar en vivo** con un anuncio real.
  - **DETALLE del anuncio — ✅ CONSTRUIDO y probado offline (12 jul):** flag NUEVO
    `BOT_FUENTE_DETALLE` (apagado) → guarda en el pedido `fuente_titulo` (título del
    anuncio), `fuente_tipo` (anuncio/publicación) y `fuente_plataforma` (facebook/instagram,
    deducida de la URL). El aviso al 320 anexa "📣 Vino de: <título> (<plataforma>)" y la app
    muestra el badge en el detalle del pedido. Batería 283/0 verde. Va en el build v6.4 del
    Escritorio (`bot-varman-PARA-SUBIR-v6.4-2026-07-12.json`). Detalle:
    `bot_n8n/notas-mejoras/NOTA-FUENTE-DETALLE-2026-07-12.md`.
- **[CV1] "modelo específico" (bug visto en vivo, Jordan Retro 4) — ✅ A y B HECHAS (12 jul).**
  Un solo flag NUEVO: `BOT_MODELO_ASESOR` (apagado). **Se destrabó al confirmar que el dueño
  pone el NOMBRE COMPLETO del modelo en el campo `marca` de la app** (ej. "Jordan retro 4 Cave
  Stone"). Comportamiento con el flag ON:
  - **(A) pinpoint → VENTA DIRECTA en WhatsApp (pedido del dueño):** empareja las palabras del
    cliente contra el nombre completo del catálogo real → si hay 1 match manda la FOTO de esa
    ref y arranca el flujo de compra de siempre (talla → datos → pago), SIN mandarlo a la
    página (reusa `arrancarPedido`; es 1 sola foto, no satura la VM); si hay varios (ej. 6
    "Retro 4") los lista con ref+precio y pide elegir ("Ref NN" → foto + pedido), con el link
    como opción secundaria; solo la marca ("Jordan") → conteo + link como siempre. Nunca
    inventa (solo refs que existen).
  - **(B) fallback:** si insiste por una marca que SÍ tenemos sin poder pinpointear (2ª vez) →
    pasa al asesor (avisa al 320) en vez de repetir.
  Batería 292/0. Va en el build v6.4 del Escritorio. Con el flag OFF, byte-idéntico a hoy.
  Ojo dato: para que el pinpoint acierte, el dueño debe seguir escribiendo el modelo completo
  en `marca` (ya lo hace). Detalle: comentarios `[CV1-A]`/`[CV1]` en `cerebro-v4.js`.
- **Compra web Wompi — ✅ PROBADA EXITOSA por el dueño (12 jul):** variables en Cloudflare
  puestas y compra sandbox completa OK en varmancrew.com. Falta solo el paso a producción
  (llaves `_prod` + `WOMPI_ENV=prod` + webhook prod + compra real chica).
- Audios de tendencia — pendiente (por diseño: se eligen el MISMO día de cada grabación).
- Checklist de creación de campaña Meta — ✅ HECHO: `GUIA-MONTAJE-META-IG.md` (runbook
  pantalla-por-pantalla + Parte A con el camino crítico del dueño en orden). Se ejecuta en
  sesión con el dueño en pantalla (meta: 16 jul). Camino crítico del dueño para arrancar:
  subir bot v6.4 con `BOT_FUENTE_DETALLE=on` (REQUERIDO para atribución) + `BOT_FOTO_ASESOR=on`
  + `BOT_NOMBRE_MODELO=on` (+ `BOT_MODELO_ASESOR=on` recomendado para pauta) · marcar todas las
  refs en la app · probar bot E2E + `fuente` · EL CORTE de números al 304 · método de pago +
  WABA 304 + @varmansnk vinculadas · elegir 3 fotos on-feet.

## Decisión de números (12 jul)
Reparto de canales por número (el dueño lo decidió al ver que el botón orgánico de FB no
deja conectar el número de API del bot):
- **Orgánico (botón WhatsApp de la página de FB, bios) → 320 225 0619** = lo atiende el dueño
  a mano. NO se toca por ahora (desconectarlo dejaría la página sin botón y el 304, al ser
  número de API, no se puede conectar por el flujo de "código de confirmación").
- **Anuncios pagados (click-to-WhatsApp) → 304 291 6972 (el BOT).** El destino al bot se
  elige DENTRO del Administrador de Anuncios; requiere que la WABA del 304 esté vinculada al
  portafolio de negocio (verificar en el punto 3 / montaje de la cuenta publicitaria).
- Implica: la atribución `fuente` y la venta directa del bot aplican a los clientes de PAUTA;
  los orgánicos siguen con atención manual del dueño.

## Pendientes del DUEÑO (solo Cristhian)
> Del bot NO queda despliegue — está en producción con los 6 flags. Solo falta VERIFICAR (abajo).
> El resto son prerequisitos para encender la pauta y pasar el pago a producción.
1. **VERIFICAR el bot E2E en vivo** (lo único que le falta al bot): saludo → bienvenida una sola
   vez · "Tienes estas" + "?" aparte → sin repetir bienvenida · "¿Tienes <modelo exacto>?" → foto
   + precio + talla · una COMPRA completa (talla → datos → pago Wompi).
2. **Marca a TODAS las refs activas en la app** (pestaña Tienda) — el pinpoint del modelo (foto
   directa del anuncio) y el nombre que se le muestra al cliente dependen de que la `marca` esté
   escrita completa. Sin marca, el bot cae al link del catálogo (nunca inventa).
3. **Cuenta publicitaria Meta:** método de pago (Meta cobra en COP) + **WABA del 304 vinculada**
   al portafolio de negocio + **@varmansnk vinculada** a la página. Guía de dueño en el Escritorio:
   `CAMPANA-META-PASO-A-PASO.txt` (mensajes prellenados + montaje pantalla por pantalla).
4. **Elegir las 3 fotos** de los anuncios: on-feet, medias blancas, con marca de agua. SIN logo de
   tercero protagonista y NUNCA tipo LV (riesgo de baneo de la cuenta publicitaria).
5. **Wompi a PRODUCCIÓN:** llaves `_prod` + `WOMPI_ENV=prod` (en la VM del bot Y en Cloudflare
   para la web) + registrar webhook de producción + una compra real chica. (El sandbox ya pasó ✅.)
6. **Seguridad (10 min):** contraseña larga + 2FA en n8n (quien entra al editor ve las llaves) ·
   rate-limit en Cloudflare para `/api/comprar` (Security → WAF, ej. 5 req/min por IP) · corregir
   las llaves Wompi del `.env` LOCAL del bot (prefijo pegado dos veces; los buenos en `credenciales/`).
7. **Reglas de Firestore (endurecidas 2026-07-12):** si un vendedor nuevo tiene cuenta, agregar su
   correo en `esEquipo()` (`app/reglas-firestore.txt`) y pegar TODO en la consola de Firebase.
8. **Marcar género** de cada ref en la app (pestaña Tienda) para que la web filtre Dama/Caballero.
9. *(Opcional/orgánico)* pegar 2-3 chats incómodos reales en
   `bot_n8n/briefs/CONVERSACIONES-INCOMODAS.md` (combustible del agente de fluidez, si se retoma).

## Pendientes del PM / agentes
- **Ejecutar `web/briefs/BRIEF-HARDEN-PAGO-RONDA2.md`** (5 fixes de robustez del pago, con
  líneas exactas y "hecho cuando"; 3 preparativos ya commiteados).
- Acompañar la subida de CW2 + `BOT_FOTO_ASESOR`/`BOT_NOMBRE_MODELO` y la primera prueba en vivo.
- Encender el resto de flags OFF de a uno, viendo conversaciones reales (empezar por los de
  menor riesgo — ver prioridad en `BITACORA-MEJORAS.md`).
- Opcional: `carritoAbandonado` (recordatorio de carrito) todavía dice "Ref NN" aunque
  `BOT_NOMBRE_MODELO` esté ON — se documentó como pendiente, no bloqueante.
- App: mapear los estados de Wompi (`pago_pendiente`, `pago_confirmado`) en Pedidos. ✅ HECHO 2026-07-11.
- Acompañar al dueño con las variables de Cloudflare + primera compra web de prueba en sandbox.

## Decisiones tomadas (para no rediscutir)
- **El bot ya NO manda catálogo con fotos por WhatsApp** (satura la VM de 1 GB) — solo el link
  de la web (`varmancrew.com/#catalogo`); el cliente elige y compra allá. Flag
  `BOT_CATALOGO_WEB`. — 2026-07-11
- **Los mensajes al cliente muestran el nombre del modelo (marca de la app), no "Ref NN"** —
  la ref sigue siendo la clave interna (Firestore, avisos al 320). Flag `BOT_NOMBRE_MODELO`. — 2026-07-12
- **Compra web por Wompi: Opción A** — la web crea el pedido y el **webhook del bot** (sin
  tocarlo) confirma y avisa por WhatsApp. Dama/Caballero lo escoge el cliente en la web
  (color por tarjeta, no toda la página). — 2026-07-11
- **Mejora del bot con agente(s) en bucle**, modo "preparar y probar; el dueño despliega"
  (aditivo + flag + tests en verde). — 2026-07-11
- **Nunca 2 agentes a la vez sobre los mismos archivos** (`cerebro-v4.js`/`textos.js`): un solo
  escritor (OneDrive ya causó pérdidas). — 2026-07-11
- Todo en Cloudflare Pages (+ dominio varmancrew.com); Netlify quedó atrás. — 2026-07
- Wompi aprobado; el pago automático es aditivo y va detrás de flag por llaves. — 2026-07-10
- Contra entrega solo Bogotá. — 2026-07-09
- Bot v6 en VM de Google Cloud con Docker. — 2026-07

- **Repo git LOCAL iniciado en `Proyecto_zapatos`** (2026-07-12): historial de versiones al
  fin; `.gitignore` blindado y verificado sin secretos. Los commits son la bitácora técnica.
  Sin remoto todavía (decisión pendiente: ¿GitHub privado?).

## Bitácora de lecciones (lo nuevo arriba)
- 2026-07-13 — **Las fotos que el dueño sube desde la app viven en Firestore (`catalogoFotos`,
  dataURL base64), NO en una URL.** El bot solo sabía mandar las viejas (`pNNN` estáticas) → la
  ficha del modelo llegaba sin foto. Fix: para mandar una foto por WhatsApp el bot necesita una
  URL PÚBLICA → se sirve desde la web en `/foto/<fid>.jpg` (endpoint en `_worker.js`, lectura
  pública de Firestore; **Cloudflare la entrega, no la VM de 1 GB**). `fotoUrlDe()` arma ese
  enlace para los ids nuevos y mantiene los viejos. Regla: fotos del bot = siempre por URL pública.
- 2026-07-13 — **Un 2º mensaje de SOLO signos/emoji ("Tienes esto" + "?") se clasificaba como
  'saludo' → repetía la bienvenida** (WhatsApp parte el mensaje en dos; el "?" llega solo). Fix
  flag `BOT_ANTIRUIDO`: si el mensaje no tiene NINGUNA letra ni número, es ruido/cola → no se
  contesta. Es la cola de un mensaje ya respondido, no una pregunta nueva.
- 2026-07-12 — **Las 3 llaves Wompi del `.env` local quedaron con el prefijo pegado DOS veces**
  (`prv_test_prv_test_…`) → Wompi responde 401 y confunde el debugging. Fix: al pegar llaves,
  verificar el prefijo una sola vez; los valores canónicos viven en `credenciales/`. (La VM
  quedó bien: el webhook validó firma en la prueba E2E.)
- 2026-07-12 — **Subir el bot a la VM por el navegador es propenso a subir un archivo VIEJO**
  (hay varios `bot-varman.json` regados con el mismo nombre; pasó 2 veces seguidas). Fix
  PERMANENTE: `workflows/build-v4-pedidos.js` ahora deja SOLO en el Escritorio un archivo con
  nombre FECHADO e inconfundible (`bot-varman-PARA-SUBIR-vX.X-YYYY-MM-DD.json`) y borra los
  anteriores en cada build — el más nuevo es SIEMPRE el correcto. Guía fija en el Escritorio:
  `PASOS-SUBIR-CATALOGO-WEB.txt` (sirve para cualquier actualización futura, no solo esta).
- 2026-07-12 — Antes de un cambio grande y "silencioso" (como el catálogo-web), correr una
  **revisión adversarial** (varios agentes buscando regresiones + verificador independiente)
  encontró 5 bugs reales de comportamiento (doble mensaje, seguimiento interrumpiendo charla
  activa, seguimiento a quien ya compró, "cancelar" sin efecto, repetición diaria) que la
  batería de tests no cubría. Vale la pena para cambios que tocan MUCHOS puntos del bot a la vez.
- 2026-07-11 — **Llaves Wompi duplicadas en el `.env` LOCAL del bot** (`prv_test_prv_test_…`,
  igual pub y events-secret) → Wompi da 401. Los valores correctos están en
  `bot_n8n/credenciales/`. La VM está bien (el webhook validó firma en la prueba). Pendiente:
  corregir el `.env` local (hay chip de tarea). Al configurar Cloudflare, usar la llave del
  archivo de credenciales, NO la del `.env`.
- 2026-07-11 — **Cloudflare Pages: las variables solo aplican en el SIGUIENTE deployment.**
  Poner variables ≠ activarlas; hay que re-subir la carpeta. Y para funciones serverless en
  Pages con deploy drag-and-drop, usar `_worker.js` en la raíz (modo avanzado).
- 2026-07-11 — La batería offline corría contra el catálogo REAL de Firestore: **editar
  productos/precios/fotos en la app durante una corrida rompía tests** (deriva de datos, no
  bugs; pasó 3 veces). **RESUELTO (mejora T1):** los tests deterministas ahora corren contra un
  fixture fijo (`tests/catalogo-fixture.json`); el catálogo vivo solo se usa en un smoke aparte.
  Editar el catálogo en la app ya no afecta la batería.
- 2026-07-11 — El PC del dueño **no tenía Node**: hay un Node portable en
  `bot_n8n/herramientas/node/` (está en `.gitignore`); borrar si algún día se instala Node en el sistema.
- 2026-07 — n8n en la e2-micro (1 GB) se satura → fast-path (no llamar al LLM en cada mensaje).
- 2026-07 — `docker compose up -d` no recarga el `.env` si el contenedor existe → `--force-recreate`.
- 2026-07 — WhatsApp entrega "al menos una vez" → **dedup por `message_id`** obligatorio.
- 2026-07 — Gemini gratis puede entrenar con los datos → tier de PAGO con volumen.
- 2026-07 — Modelos Gemini se retiran sin aviso → modelo en variable de entorno + fallback.
- (Detalle completo en `plantilla/LECCIONES-DEPLOY-REAL-2026-07.md`.)

## Punteros (abre solo si la tarea lo pide)
- `LEEME.txt` — mapa maestro (3 piezas, URLs, deploy). · `bot_n8n/LEEME-BOT.txt` — mapa del bot.
- `bot_n8n/briefs/BITACORA-MEJORAS.md` — memoria y backlog de los agentes en bucle.
- `bot_n8n/briefs/BRIEF-CATALOGO-WEB.md` — brief original del catálogo solo por link.
- `bot_n8n/notas-mejoras/NOTA-CATALOGO-WEB-2026-07-11.md` y `...-V2-2026-07-12.md` — qué se
  construyó, cómo revertir, variables nuevas (`BOT_CATALOGO_WEB`, `BOT_NOMBRE_MODELO`).
- `bot_n8n/briefs/BRIEF-AGENTE-LOOP-MEJORA-CONTINUA.md` · `BRIEF-FLUIDEZ-CONVERSACION.md` — los agentes.
- `bot_n8n/LEEME-LOOP-MEJORAS.txt` — cómo correr/programar los agentes.
- `bot_n8n/workflows/src/cerebro-v4.js` · `.../textos.js` · `.../notificaciones.js` ·
  `.../wompi-webhook.js` — código y prompts del bot.
- `bot_n8n/briefs/CAMBIOS-PEDIDOS.md` — contrato del pedido (app ↔ bot; incluye `canal:'web'`).
- Escritorio del dueño: `PASOS-SUBIR-CATALOGO-WEB.txt` — guía fija de cómo subir el bot a la VM
  (sirve para cualquier actualización, no solo esta).
- `web/NOTA-WEB-COMPRA-WOMPI-2026-07-11.md` — compra web: qué desplegar, variables, rollback.
- `web/pruebas-wompi/` — arnés local para probar la compra web en sandbox (NO se sube a Cloudflare).
- `plantilla/` — replicar el sistema en otro negocio.
