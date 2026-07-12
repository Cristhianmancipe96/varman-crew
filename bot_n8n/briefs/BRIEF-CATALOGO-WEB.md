# BRIEF — Bot: solo el link (quitar catálogo de WhatsApp) + seguimiento a 2h · VarMan Crew · 2026-07-11

> **Para Claude Code.** UN agente. **Territorio:** el bot (`workflows/src/cerebro-v4.js`,
> `workflows/src/textos.js`, y triggers de n8n para el seguimiento). **UN SOLO ESCRITOR** en el
> bot. Lee primero: `briefs/BRIEF-AGENTE-LOOP-MEJORA-CONTINUA.md` (reglas §3),
> `briefs/BITACORA-MEJORAS.md`, `LEEME-BOT.txt`.
>
> **Modo:** *preparar y probar; el dueño despliega.* `node tests/test-offline-v4.js` en verde.

## Qué quiere el dueño
La VM (1 GB) se satura mandando fotos y hoy el catálogo ni llega. Decisión:
1. **El bot ya NO envía el catálogo por WhatsApp.** Cuando pidan el catálogo, responde con **un
   mensaje corto + el link** `https://varmancrew.com/#catalogo`. El cliente escoge y **compra en
   la web** (Wompi; ver `web/briefs/BRIEF-WEB-COMPRA-WOMPI.md`). No vuelve al bot para comprar.
2. **Quitar del bot el catálogo actual** (envío de fotos/tandas/lista), pero **dejar un respaldo**
   por si se quiere volver a usar en el futuro.
3. **Seguimiento a ~2 horas:** si el cliente pidió el catálogo/recibió el link y **NO compró**,
   el bot le escribe **una vez** preguntando si pudo comprar y ofreciéndole ayuda (para recuperar
   la venta).

## Tarea 1 — Solo el link (quitar el catálogo)
- En los puntos donde hoy se muestra el catálogo (`mostrarTanda`/`tandaCatalogo` ~L324/~L639;
  rama `cat:` ~L758; rama `marca:` ~L785; intents `ver_catalogo`/`buscar_marca`/`comprar`/`saludo`
  y `listaCategorias`), responder con **un solo mensaje**: texto cálido (máx 2 frases, sin
  mexicanismos) + el link. **Sin** mensajes `image` **ni** lista interactiva de catálogo.
- **Respaldo obligatorio:** antes de quitar, **copia el código del catálogo** (funciones
  `tandaCatalogo`, `listaElegir`, `fotoUrlDe`, textos de catálogo, etc.) a un archivo de
  respaldo (p. ej. `workflows/src/_respaldo-catalogo.md` o `.js`) y guarda el JSON pre-cambio en
  `workflows/respaldo/bot-varman.pre-catalogo-web.json`. Así se puede restaurar.
- El texto nuevo vive en `textos.js` (p. ej. `catalogoWebLink`).
- Como esto **reemplaza** el catálogo (no es un experimento), el link puede ser el comportamiento
  **por defecto**. Si dejas el flag `BOT_CATALOGO_WEB`, que su **default sea ON**; la
  reversibilidad real es el **respaldo** de arriba.
- No romper: flujo de pedido, handoff, dedup por `message_id`. `mRef` ("Quiero la Ref NN") puede
  quedarse (no estorba).

## Tarea 2 — Seguimiento a ~2 horas (recuperar la venta)
- Cuando el cliente **recibe el link** (o interactúa y no compra), registra un "seguimiento
  pendiente" (marca en la sesión o en una colección tipo `tiendas/varman/seguimientos` con la
  hora y el `wa_id`).
- Un **trigger programado de n8n** (ya existe uno de recordatorios/`notificaciones.js` +
  `limpiar-sesiones.js` — reúsalo) revisa cada cierto tiempo los seguimientos que ya cumplieron
  **~2 horas** y, **si NO hay un pedido de ese cliente** en `tiendas/varman/pedidos` (creado por
  la web vía Wompi) en ese lapso, le manda **un solo** mensaje cálido: "¿Pudiste completar tu
  compra? Si necesitas ayuda o tienes dudas, aquí estoy 👟".
- **Reglas:** una sola vez por cliente (dedup), respeta el **anti-spam** y la **ventana de 24 h**
  de WhatsApp (a las 2 h estás dentro; no enviar si ya pasaron >24 h del último mensaje del
  cliente). Si compró, **no molestar**. Tono cálido, sin insistir. Detrás de flag
  `BOT_SEGUIMIENTO_2H` (para poder apagarlo).

## Casos de prueba (`tests/test-offline-v4.js`)
- Catálogo → la respuesta **contiene** `varmancrew.com/#catalogo`, **sin** `image` ni lista.
- Seguimiento: cliente sin pedido tras 2 h (mock del tiempo/estado) → se encola/envía **un**
  mensaje; cliente **con** pedido → **no** se envía. Dedup: no se manda dos veces.
- El respaldo del catálogo existe (archivo creado).

## Reglas de oro (heredadas)
Editar `src/` + `node workflows/build-v4-pedidos.js` · nunca el JSON a mano · batería en verde
con casos nuevos · no tocar credenciales/VM/git · registrar en `briefs/BITACORA-MEJORAS.md` +
`notas-mejoras/NOTA-CATALOGO-WEB-2026-07-11.md` (incluye cómo restaurar el catálogo desde el
respaldo).

## Hecho cuando
Build OK · batería verde · catálogo del bot = solo el link (con respaldo guardado) · seguimiento
a 2 h funciona (una vez, respeta anti-spam/24 h, no molesta si compró) · bitácora + nota · línea
de cierre.
