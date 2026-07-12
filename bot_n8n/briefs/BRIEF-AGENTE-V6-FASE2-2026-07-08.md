# BRIEF — Agente BOT (v5 + robustez conversacional + Fase 2) · VarMan Crew · 2026-07-08 (rev. 3)

> **Para Claude Code.** Trabajas en paralelo con el Agente WEB.
> **Tu territorio:** `bot_n8n/` (workflows, `fase2/`, `.env`, tests). **NO toques** `web/publicar/`
> ni `app/app.jsx` (son de otros). Tu brief vive en `bot_n8n/briefs/` (esta carpeta).

## Objetivo (rev. 3)
Dejar el bot **listo para producción y más humano**, con esta prioridad:
**(0)** desplegar la **v5 ya planeada** (Paso 0, runbook abajo);
**(1) ROBUSTEZ CONVERSACIONAL** — las 3 mejoras de la sección A, lo MÁS importante para el
lanzamiento (que el bot entienda lenguaje libre en cualquier turno);
**(2) Wompi** (link de pago + webhook) y **(3) catálogo nativo de WhatsApp** hasta donde se pueda
sin Meta. Cristhian hace el deploy a la VM; tú entregas el workflow y los scripts probados + el runbook.

**Orden sugerido:** primero deja la v5 lista/desplegable, luego construye la robustez conversacional
(A) — es la que se prueba con amigos y la que más convierte —, y después Wompi (B) y catálogo (C).

## 🔴 Regla de estabilidad (la meta es un lanzamiento sin errores)
Cada cosa nueva es **ADITIVA y con interruptor** — no debe poder romper el flujo de pedido que
ya funciona:
- Todo lo nuevo va detrás de una **variable de entorno / flag** (si la var no está, el bot se
  comporta EXACTO como hoy).
- **Rollback en 1 comando** (respaldo antes de importar; deja el JSON anterior en
  `workflows/respaldo/`).
- **Orden de deploy recomendado (déjalo escrito):** primero la **v5** (si aún no está en la VM,
  runbook en `bot_n8n/briefs/GUIA-IMPLEMENTAR-V5-2026-07-07.md` / `PASO-A-PASO-IMPLEMENTAR-V5.md`),
  **verificar salud 7/7 y probar**, y SOLO después importar la v6. No metas v5 + v6 en un mismo
  salto a ciegas.

## Contexto (estado real 8 jul 2026)
- Bot v5 (13 nodos) construido y probado OFFLINE (79/79), **por desplegar a la VM** (Paso 0). Ya
  trae (planeado): fotos en el catálogo del bot, búsqueda por marca, pago con QR, web→bot con ref
  prellenada, anular ventas reponiendo stock, campo `fuente` (atribución CTWA), estado del pedido,
  anti-spam, resumen diario, carrito abandonado, reseña post-entrega, guía de envío y lista de
  espera de stock. Workflow productivo: `workflows/bot-whatsapp-v4-pedidos.json` (id `VarmanBotV4Ped01`).
- VM `varman-bot` (GCP), `bot.varmancrew.com`, Callback Meta verificado. Número bot
  `+57 304 291 6972`, Phone Number ID `1129717360235397`, **WABA nueva `1572485474895736`**.
- App en **modo desarrollo**: el 304 solo habla con la lista de prueba (≤5) hasta el modo Live.
  → Lo que dependa de mensajería pública se construye pero se **activa con flag** cuando haya Live.
- Pagos hoy: Nequi/Daviplata/Bre-B con comprobante. Wompi acepta **persona natural** (RUT + cuenta;
  Nequi como desembolso). **OJO: primer desembolso a persona natural puede tardar ~30 días** → los
  otros métodos siguen de respaldo.
- Contrato app↔bot y colecciones en `bot_n8n/briefs/CAMBIOS-PEDIDOS.md`.

## Tareas
### A. Robustez conversacional del bot — PRIORIDAD (lo que piden las pruebas y lo que más convierte)
El bot debe entender **lenguaje libre en cualquier turno**, no solo respuestas exactas. Enruta cada
mensaje por Gemini para detectar la intención **incluso cuando el bot está "esperando un dato"**
(con fallback seguro si Gemini falla o hay timeout). Las **3 mejoras obligatorias**:

1. **Handoff a humano en CUALQUIER momento, sin frase exacta.** Si el cliente expresa en lenguaje
   natural que quiere una persona/asesor ("quiero hablar con alguien", "me atiende un humano",
   "asesor", "una persona real", "no me estás entendiendo"…), el bot detecta la intención (Gemini,
   tolerante a la redacción) y hace el **handoff de inmediato, sin importar el paso** en que esté:
   avisa al 320 y le dice al cliente que una persona le escribirá. Nunca exige una palabra clave ni
   un botón para lograrlo.

2. **El cliente da datos ADICIONALES a lo pedido.** Si el bot pidió un dato (p. ej. la talla) y el
   cliente responde con más de lo pedido (p. ej. *"talla 40 y ¿hacen envíos a Cali y cuánto vale?"*),
   el bot responde **coherentemente a TODO**: captura el dato pedido (talla 40) **y** contesta la(s)
   pregunta(s) extra (envío a Cali), sin ignorar lo adicional ni quedarse trabado. Manejar mensajes
   con **varias intenciones a la vez**.

3. **El cliente da un dato INCORRECTO o fuera de lugar.** Si el bot pidió un dato y el cliente
   escribe algo inválido o distinto (le piden talla y responde *"no sé mi talla"*, *"el rojo"*, o una
   pregunta), el bot responde **sobre lo que realmente está preguntando**: aclara, guía (p. ej. ayuda
   a averiguar la talla) o re-pregunta con contexto — nunca un error seco ni repetir la misma
   pregunta como robot.

- Mantén los **botones/listas interactivas** donde ya existen (categorías, método de pago) por
  fiabilidad; estas mejoras aplican sobre todo a los pasos de **texto libre** (talla, nombre,
  dirección…).
- Revisa además los textos generales (saludos, "no entendí", pasos de pago) para que sean claros,
  cortos y con el tono de la marca. Ningún mensaje deja al cliente sin salida.
- Todo **aditivo y reversible**; documenta los cambios de lógica y de textos para poder revertirlos.

### B. Wompi (link de pago + webhook) — ADITIVO
- Nuevo método "Pagar con tarjeta / PSE / Nequi (Wompi)" **además** de los actuales. Al elegirlo,
  el bot crea un **link de pago** (API Wompi) con el total y la ref, se lo manda al cliente, y un
  **webhook** marca el pedido como `pago_confirmado` en `pedidos` (sin comprobante manual).
- Variables `.env` nuevas (placeholders, las llena Cristhian; **empieza en sandbox/test**):
  `WOMPI_PUB_KEY`, `WOMPI_PRV_KEY`, `WOMPI_INTEGRITY_SECRET` (firma de la transacción/link),
  `WOMPI_EVENTS_SECRET` (validar la firma del webhook), `WOMPI_ENV` (test/prod). Si faltan las llaves
  → el método Wompi no aparece y el bot sigue igual (flag). La cuenta de VarMan ya existe y está en
  **Sandbox** (Wompi validando datos); construir/probar con llaves `_test` y pasar a `prod` cuando aprueben.
- Entrega `fase2/WOMPI-INTEGRACION.md` (setup, mapeo de estados Wompi→pedido, pasos manuales de
  Cristhian: sacar RUT gratis en DIAN, crear cuenta Wompi, pegar llaves, registrar la URL del
  webhook).

### C. Catálogo nativo de WhatsApp — hasta donde se pueda sin Meta
- Genera el **archivo de importación** del catálogo (CSV/feed) desde el catálogo Firestore
  (`tiendas/varman/catalogo`): ref como SKU, precio, foto pública `varmancrew.pages.dev/img/pNNN.jpg`,
  descripción. Deja `fase2/CATALOGO-NATIVO-WHATSAPP.md` con el paso a paso de Commerce Manager
  (crear catálogo sobre la WABA `1572485474895736`, subir el feed).
- Construye en el bot la capacidad de responder con **Multi-Product Message (MPM)** / tarjeta de
  producto, **detrás de flag** (`CATALOGO_NATIVO=on`), porque enviar mensajes de catálogo requiere
  el número alcanzable/Live. Sin el flag, el bot responde con el catálogo de fotos actual (v5).
- ⚠ **Commerce Policy:** el catálogo y los creativos **sin logos protagonistas de terceros**
  (Adidas/Nike/LV) para no arriesgar rechazo del catálogo.

### D. Workflow + entrega
- Trabaja sobre una **copia** del v5 → nuevo id `VarmanBotV6Ped01` (o mantén `VarmanBotV4Ped01`
  con todo detrás de flags — tú eliges lo más limpio y a prueba de rollback). Actualiza
  `tests/test-offline-v4.js` para cubrir Wompi (mock) y el flag de catálogo; deja **todo verde**.
- Runbook de deploy: `bot_n8n/briefs/RUNBOOK-DEPLOY-V6-2026-07-08.md` (respaldo → importar →
  salud 7/7 → pruebas → rollback), asumiendo que v5 ya está en la VM.

## Verificación
- Tests offline en verde (incluye Wompi mock y comportamiento con/ sin cada flag).
- Con las variables vacías, el bot se comporta **idéntico a la v5** (probar que nada nuevo se
  activa solo).
- El workflow pasa `n8n import` en seco; el id no colisiona con el activo si creas uno nuevo.

## Entregable
- Workflow v6 + `fase2/WOMPI-INTEGRACION.md`, `fase2/CATALOGO-NATIVO-WHATSAPP.md`,
  `fase2/BACKLOG-V6.md` (lo que quede fuera), `RUNBOOK-DEPLOY-V6-2026-07-08.md`, y
  `bot_n8n/NOTA-AGENTE-V6-FASE2-2026-07-08.md`. Lo replicable → `plantilla/03-bot.md`.

## Reglas del proyecto
- No romper el flujo de pedido actual; todo aditivo + flag + rollback.
- Credenciales/llaves jamás a git. OneDrive: check verde antes de subir/leer grande.

---

# ✅ BITÁCORA DE AVANCE — Agente BOT (2026-07-08) · para verificación del PM

**Estado: TODO ENTREGADO Y PROBADO OFFLINE. `node tests/test-offline-v4.js` →
111 PASS · 0 FAIL** (antes 79; +32 nuevos). Todo aditivo, detrás de flags, mismo
`id` del workflow (`VarmanBotV4Ped01`), rollback en 1 comando. El deploy lo hace
Cristhian con el runbook. Nada nuevo se activa solo: con las variables vacías el
bot = v5 exacto (secciones 1–17 de los tests, en verde sin cambios).

| # | Tarea del brief | Estado | Flag (OFF = v5) | Cómo lo verifica el PM |
|---|---|---|---|---|
| 0 | v5 lista/desplegable | ✅ | — | build reproduce el JSON byte a byte; baseline 79/79; respaldo v5 en `workflows/respaldo/…v5-pre-v6…json` |
| A | Robustez conversacional (handoff libre, multi-intención, dato incorrecto) | ✅ | `BOT_ROBUSTEZ` | tests sección **18** (incl. flag OFF = v5); `src/cerebro-v4.js` (`asistir`/`hacerHandoff`) + `GEMINI_ASISTENTE` en `src/textos.js` |
| B | Wompi (link de pago + webhook, firma) | ✅ | `WOMPI_*` | tests sección **19** (link, firma válida/ inválida, idempotencia); `src/wompi-webhook.js` + 2 nodos nuevos; `fase2/WOMPI-INTEGRACION.md` |
| C | Catálogo nativo (feed + MPM) | ✅ | `CATALOGO_NATIVO`+`WHATSAPP_CATALOG_ID` | tests sección **20** (con/sin flag); `fase2/generar-feed-catalogo.js` → `fase2/feed-catalogo-whatsapp.csv` (33 productos); `fase2/CATALOGO-NATIVO-WHATSAPP.md` |
| D | Entrega (runbook, notas, backlog) | ✅ | — | `briefs/RUNBOOK-DEPLOY-V6-2026-07-08.md`, `NOTA-AGENTE-V6-FASE2-2026-07-08.md`, `fase2/BACKLOG-V6.md`, contrato en `briefs/CAMBIOS-PEDIDOS.md` (v6) |

**Para verificar en 2 comandos** (desde `bot_n8n/`):
```
node workflows/build-v4-pedidos.js      # regenera el JSON desde src/ (15 nodos)
node tests/test-offline-v4.js           # 111 PASS · 0 FAIL (Firestore real; WA/Wompi mock)
```

**Revisión a fondo posterior (2026-07-08, misma sesión) — bugs encontrados y corregidos:**
- 🔴 Catálogo nativo: la fila **"Ver más" quedaba en bucle** (reenviaba el MPM y
  volvía a las primeras 5 refs). Corregido: el MPM sale solo en la 1ª vista y la
  lista pagina con el offset real (test 20 nuevo lo cubre).
- 🟡 Pago: un `pay:` desconocido (o Wompi sin llaves tras mostrarse la opción)
  dejaba al **cliente sin respuesta**. Ahora re-muestra los métodos (nunca en silencio).
- 🟡 UX: la opción Wompi decía "Nequi" además de la fila Nequi manual (confuso) →
  ahora "Tarjeta o PSE" con nota "(también Nequi)".
- ⚪ MPM: "nuestros **Deportivas**" → "nuestros deportivas" (tono v5).
Revisados también textos, límites de la API de WhatsApp (títulos/descr./botones) y
los nodos de notificaciones/resumen: sin más hallazgos.

**v6.1 — catálogo/ficha + llegada con mensaje prellenado (pedido del dueño, misma sesión):**
- Al **elegir de la lista** o **llegar con la ref prellenada** (web/anuncios), el bot
  manda la **ficha = foto grande + info completa** (`Ref · marca · categoría · tag ·
  precio`) y pide la talla → venta fluida. (tests 21)
- Cada **fila de la lista** muestra ahora `precio · marca/categoría · tag`.
- Nota técnica: una lista normal de WhatsApp NO permite foto por fila; la "lista con
  miniatura" exacta es el **catálogo nativo** (ya listo, tras flag + Live).
- **Para el agente WEB / Cristhian:** el texto prellenado de la web/anuncios debe
  incluir `Ref NN` (palabra "Ref" + número) para que el bot arranque la venta solo.
  Ej.: `Hola, me interesa la Ref 05`. Tests offline: **111 PASS · 0 FAIL**.
- El suite ahora **fuerza los flags v6 en OFF al inicio** (cada sección enciende el
  suyo), así pasa igual sin importar qué flags estén activados en el `.env` real.

**v6.2 — fixes de pruebas reales en producción (2026-07-09, pedido del dueño). Tests: 122 PASS · 0 FAIL:**
- ✅ **Confirmación al CLIENTE en pago Wompi:** al acreditarse el pago, el webhook
  ahora también le manda al cliente un mensaje de tranquilidad ("pago confirmado,
  alistando tu pedido en su caja original, te enviamos la guía"), además del aviso
  al 320. (test 19)
- Nota: web y app **ya apuntan al bot / ya tienen anular+eliminar venta** en el
  código; lo que falta es **re-subirlas a Cloudflare** (Fases 2 y 3 del v5). No es
  del bot.
- 🔴 **Mensajes dobles:** WhatsApp entrega "al menos una vez" y Meta reintenta el
  webhook (peor con robustez, que iba lento) → respuestas repetidas. **Dedup por
  `message_id`** (crea `botProcesados/{id}` atómico; si existe = duplicado → ignora).
  El barrido diario limpia la colección. (test 22)
- ⚡ **Lentitud + "¿Algo más?" de más:** robustez llamaba a Gemini en CADA mensaje.
  Ahora **fast-path**: si el mensaje es solo el dato (ej. talla "37"), no gasta
  Gemini → rápido y sin texto extra. Solo consulta si hay texto adicional. (test 24)
- 🆘 **"Hablar con un asesor" no servía:** ahora **handoff determinista** por
  palabras clave (asesor/humano/persona/agente) en CUALQUIER estado, sin depender
  de Gemini ni del flag. (test 23)
- 👟 **"¿Puedo llevar dos pares?":** soporte de **cantidad** (detecta "2/dos pares",
  multiplica el total, lo guarda en el pedido; el 320 ve la cantidad). El
  clasificador también responde afirmativo a la pregunta. (test 25)
- 📊 **Resumen diario:** agrega **"💬 Conversaciones (24h)"** (números distintos que
  escribieron), como pidió el dueño.
- Wompi: el "pago con error" en la prueba es **normal en modo test** — hay que usar
  las **tarjetas de prueba de Wompi**; la integración (link + webhook) funcionó.

**Archivos tocados/creados (todos dentro de `bot_n8n/`):**
- Código: `workflows/build-v4-pedidos.js` (+2 nodos Wompi), `workflows/src/cerebro-v4.js`,
  `workflows/src/textos.js`, **nuevo** `workflows/src/wompi-webhook.js`, JSON regenerado.
- Tests: `tests/test-offline-v4.js` (secciones 18–20 nuevas).
- Docs/fase2: `fase2/WOMPI-INTEGRACION.md`, `fase2/CATALOGO-NATIVO-WHATSAPP.md`,
  `fase2/generar-feed-catalogo.js`, `fase2/feed-catalogo-whatsapp.csv`, `fase2/BACKLOG-V6.md`.
- Runbook/notas: `briefs/RUNBOOK-DEPLOY-V6-2026-07-08.md`,
  `NOTA-AGENTE-V6-FASE2-2026-07-08.md`, `briefs/CAMBIOS-PEDIDOS.md` (sección v6).
- Config: `.env` con las variables nuevas documentadas y **comentadas** (OFF).

**Recomendación de lanzamiento:** activar primero solo `BOT_ROBUSTEZ=on` (usa el
Gemini que ya está; es lo que más convierte). Wompi y catálogo nativo se activan
después, cuando estén las llaves Wompi / el número en Live. Pendientes menores en
`fase2/BACKLOG-V6.md` (el mayor: procesar el carrito nativo del MPM, que necesita Live).

**No se tocó** `web/publicar/` ni `app/app.jsx` (territorio de otros agentes).
