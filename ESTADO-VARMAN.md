# ESTADO — VarMan Crew   (actualizado 2026-07-12 por Cowork/PM)

> Este es el TABLERO del proyecto. Léelo primero para ponerte al día sin releer todos los
> archivos. Vive sincronizado en el Proyecto de Claude y en el disco
> (`...\Proyecto_zapatos\ESTADO-VARMAN.md`).

## En una línea
Tienda de zapatos online (VarMan Crew) con 3 piezas —tienda web, app de inventario y bot de
WhatsApp— ya EN PRODUCCIÓN; en fase de lanzamiento supervisado y afinación del bot.

## En vivo ahora
- **Tienda:** https://varmancrew.com (y varmancrew.pages.dev) — en vivo ✅
- **App inventario:** https://varmanapp.pages.dev — en vivo ✅
- **Bot WhatsApp:** VM de Google Cloud (bot.varmancrew.com), +57 304 291 6972 — en producción ✅
- **Datos:** Firebase, proyecto `varman-crew`

## En curso — afinación del bot con AGENTES EN BUCLE (Claude Code)
- **Mejora continua + fluidez:** muchas corridas hechas (mejoras 1-12, fluidez F1-F10, más
  catálogo-web CW1/CW2 — detalle abajo). Batería offline **270/0 verde**, ya desacoplada del
  catálogo vivo (fixture fijo, mejora T1 — editar el catálogo en la app ya NO rompe los tests).
  Memoria y backlog: `bot_n8n/briefs/BITACORA-MEJORAS.md`.
- **PRIMER DESPLIEGUE YA HECHO (2026-07-11/12):** el dueño subió el bot regenerado a la VM y
  encendió flags reales por primera vez: `BOT_ROBUSTEZ`, `BOT_FLUIDEZ_RECONDUCE`,
  `BOT_CLASIF_V2`, `BOT_DISPATCH_V2`, `BOT_CATALOGO_WEB`. El resto de mejoras siguen con flag
  OFF (comportamiento de hoy) hasta que se decidan encender de a una.

## Catálogo solo por link de la WEB + seguimiento de venta (2026-07-11/12) — EN DESPLIEGUE
Decisión del dueño: la VM (1 GB) se saturaba mandando fotos por WhatsApp → el bot **ya NO
manda catálogo con fotos**; en su lugar responde con el link `varmancrew.com/#catalogo` y el
cliente elige/compra en la web. Todo detrás de `BOT_CATALOGO_WEB` (ya ON en la VM).
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
- **Pendiente del dueño AHORA MISMO:** subir el archivo del bot fechado que deja el build en
  el Escritorio (`bot-varman-PARA-SUBIR-v6.3-<fecha>.json` — se regenera y limpia solo en cada
  build) y agregar al `.env` de la VM: `BOT_FOTO_ASESOR=on` y `BOT_NOMBRE_MODELO=on`, luego
  `docker compose up -d --force-recreate` + reimportar. Guía paso a paso en el Escritorio:
  `PASOS-SUBIR-CATALOGO-WEB.txt`. Notas: `bot_n8n/notas-mejoras/NOTA-CATALOGO-WEB-2026-07-11.md`
  y `NOTA-CATALOGO-WEB-V2-2026-07-12.md`.

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
- **Probado E2E en sandbox:** compra → pago aprobado (4242…) → webhook confirmó el pedido solo.
- **Falta SOLO del dueño:** poner en Cloudflare (proyecto varmancrew → Settings → Variables)
  `WOMPI_PRV_KEY` (Secret), `FIREBASE_SA_B64` (Secret), `WOMPI_ENV=test` → **re-subir web\publicar**.
  Rollback en 1 línea: `COMPRA_WOMPI=false`.

## Pendientes del DUEÑO (solo Cristhian)
1. **Catálogo web v2 + nombre de modelo (URGENTE, ver bloque arriba):** subir el archivo del
   Escritorio (`bot-varman-PARA-SUBIR-...json`), agregar `BOT_FOTO_ASESOR=on` y
   `BOT_NOMBRE_MODELO=on` al `.env`, recargar y reimportar. Probar: hola / catálogo / precio /
   una marca / una foto / una compra completa.
2. **Ponerle marca a TODAS las refs activas en la app** (pestaña Tienda) — con
   `BOT_NOMBRE_MODELO` ON, el bot muestra esa marca al cliente en vez de "Ref NN"; sin marca
   registrada, sigue mostrando la Ref.
3. **Chats reales para fluidez:** pegar 2-3 conversaciones incómodas en
   `bot_n8n/briefs/CONVERSACIONES-INCOMODAS.md` (combustible del agente de fluidez, si se retoma).
4. **Reglas de Firestore:** pegar `app/reglas-firestore.txt` en la consola de Firebase.
5. **Re-subir la app y la web** a Cloudflare (para ver los botones nuevos + la compra web).
6. **Compra web por Wompi:** poner las 3 variables en Cloudflare (proyecto varmancrew) y
   re-subir `web\publicar` (ver bloque "Compra web" abajo). Probar en sandbox (tarjeta 4242…).
7. **Marcar género** de cada referencia en la app (pestaña Tienda) para que la web filtre bien.
8. **Wompi producción:** cuando el sandbox funcione, llaves `_prod` + `WOMPI_ENV=prod` (en la
   VM del bot Y en Cloudflare para la web) + registrar webhook de producción + compra real chica.
9. **Número en Live (Meta):** catálogo/carrito nativo de WhatsApp (ojo: con `BOT_CATALOGO_WEB`
   ON el bot ya no usa el catálogo nativo aunque esté configurado — ver nota CW1).

## Pendientes del PM / agentes
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

## Bitácora de lecciones (lo nuevo arriba)
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
