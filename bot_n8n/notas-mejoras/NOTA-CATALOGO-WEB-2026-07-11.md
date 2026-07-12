# NOTA — Catálogo → link de la WEB + seguimiento de compra a las ~2h · 2026-07-11

> Brief origen: `briefs/BRIEF-CATALOGO-WEB.md` (+ pedido extra del dueño: backup del
> catálogo y seguimiento de venta a las ~2 horas).
> **NO desplegado** — preparado y probado; Cristhian revisa y sube a la VM.

## Qué cambió

### 1. Flag `BOT_CATALOGO_WEB` (APAGADO por defecto)
Con el flag **ON**, el bot **NO envía catálogo por WhatsApp** (las fotos saturan la VM
de 1 GB). En **todos** los puntos donde hoy van fotos/listas de catálogo responde **UN
solo mensaje** con el link de la web y el cliente elige y compra allá:

> ¡Con gusto! 👟 Mira todo el catálogo con fotos y precios aquí y elige el tuyo:
> https://varmancrew.com/#catalogo
> Cualquier cosa, aquí estoy 😊

Puntos cubiertos (todos pasan por `tandaCatalogo()` o `listaCategorias()`, que con el
flag ON devuelven solo el mensaje del link — marcador `[CATALOGO-WEB]` en el código):
- `mostrarTanda()` / `tandaCatalogo()` (fotos por categoría o marca, y "Ver más").
- Ramas `cat:` y `marca:` del dispatch (incluido el catálogo nativo MPM: con el flag
  ON el MPM tampoco sale, aunque `CATALOGO_NATIVO` esté encendido).
- Intents `saludo` / `ver_catalogo` / `buscar_marca` / `comprar` (en `comprar` se
  suprime la respuesta de Gemini para que sea UN solo mensaje, según el brief) y el
  fallback del dispatch. En `pregunta_precio` (solo con `BOT_DISPATCH_V2` on) también
  va **una sola burbuja**: la respuesta de precio + el link (`catalogoWebLinkCorto`).
- Caminos de fluidez que muestran catálogo ("otro modelo", marca a mitad de pedido).

**El flujo de PEDIDO no cambia**: `ref:NN` de listas viejas, "Hola! Quiero la Ref 05"
de la web (`mRef`), ficha, talla → datos → pago → comprobante siguen idénticos. El
handler de ref directa se queda (el brief lo pide), pero ya no es el camino principal:
la compra pasa en la web.

Con el flag **OFF (default)** el bot queda **EXACTO como hoy** (fotos + lista) — 235
checks previos en verde sin tocar.

### 2. Seguimiento de compra a las ~2 horas (mismo flag)
Pedido del dueño: si el cliente recibió el link y no compró, intentar cerrar la venta.
- Al mandar el link, el Cerebro anota `linkCatalogoAt` (+ `nombrePerfil`) en la sesión
  con `fsMerge` (bloque `[CATALOGO-WEB]` al final de `cerebro-v4.js`; mejor esfuerzo,
  nunca rompe el flujo).
- El **trigger horario** (`notificaciones.js`, sección 3 nueva) manda **UNA sola vez**,
  entre 2 y 24 h después (en la práctica 2–3 h por ser horario), la pregunta:
  > ¡Hola {nombre}! 👟 ¿Pudiste hacer tu compra en la web? Si algo se te complicó o te
  > quedó alguna duda, escríbeme por aquí y con gusto te ayudo… + el link.
- Guardas anti-spam (patrón del carrito abandonado, endurecidas tras una revisión
  adversarial multi-agente del cambio):
  - Se marca `seguimientoLink=true` ANTES de encolar (máx 1 por sesión).
  - Con pedido en curso NO se manda (eso lo cubre el carrito abandonado).
  - **Conversación viva**: si el cliente escribió hace <1h (`botRate/{wa}.updatedAt`,
    que se refresca con cada mensaje entrante), se APLAZA sin marcar — el siguiente
    run lo reintenta dentro de la ventana (no interrumpe una charla en curso).
  - **Ya compró por el bot**: si el cliente tiene un pedido creado en las últimas 24h
    (últimos 30 pedidos, una consulta por corrida y solo si hay candidatos), no se le
    pregunta "¿pudiste comprar?".
  - **Rechazo explícito**: "cancelar" tras recibir el link borra la sesión de
    solo-link (rama de cancelar extendida en el Cerebro, respuesta
    `catalogoWebCancelado` sin hablar de "pedido") → apaga el seguimiento.
  - Al dueño no · ventana de 24h respetada (`linkCatalogoAt` es la hora del último
    mensaje del cliente).
  El bot **no puede saber** si compró en la web, por eso **pregunta** (no asume) — y
  de paso reabre la conversación para vender.
- Si el cliente arranca un pedido después del link, `guardarSes` pisa la sesión
  completa y `linkCatalogoAt` desaparece → tampoco hay seguimiento (correcto).
- **Limitación conocida (documentada, no corregida)**: la marca `seguimientoLink`
  vive en la sesión y la sesión muere a las 24h. Un visitante que pide el catálogo
  un día distinto (>24h después) puede recibir OTRO seguimiento ese día — es decir,
  la cadencia real es "máx 1 por día y solo tras pedir el catálogo", no "1 por
  cliente para siempre". Se consideró aceptable (cada seguimiento nace de una visita
  iniciada por el cliente y quien ya compró queda cubierto por la guarda de pedidos);
  si molesta, la marca tendría que persistir fuera de `botSesiones`.

### 3. "Eliminar el catálogo" + backup (pedido del dueño)
- **Backup dejado**: `workflows/respaldo/catalogo-firestore-backup-2026-07-11.json`
  (snapshot completo del catálogo vivo de Firestore, 43 documentos, formato REST) y el
  JSON del bot pre-cambio (`respaldo/bot-varman.pre-catalogo-web.json`).
- El catálogo **NO se borró físicamente** (ni el código ni la colección de Firestore):
  1. el brief exige que con el flag OFF el bot quede EXACTO como hoy (red de
     seguridad/rollback) — borrar el código lo rompería;
  2. el flujo de pedido **necesita** los datos del catálogo aunque el flag esté ON
     (buscar la ref, el precio, la ficha cuando el cliente escribe "Quiero la Ref 05");
  3. la web muy probablemente se alimenta de la misma colección.
  Con el flag ON el catálogo **desaparece de WhatsApp por completo**, que es el efecto
  buscado. Si algún día se quiere borrar el código de tandas/listas, este backup y los
  respaldos permiten reconstruirlo.

## Archivos tocados
- `workflows/src/textos.js` — `catalogoWebUrl`, `catalogoWebLink`,
  `catalogoWebLinkCorto`, `catalogoWebCancelado`, `seguimientoCompraWeb`.
- `workflows/src/cerebro-v4.js` — flag + `msjCatalogoWeb()` + early-return en
  `tandaCatalogo()`/`listaCategorias()` + guarda en rama `cat:` nativa, en intent
  `comprar` y en `pregunta_precio` + rama "cancelar" extendida a sesiones de
  solo-link + bloque final que anota `linkCatalogoAt`.
- `workflows/src/notificaciones.js` — sección 3: seguimiento de compra web (con
  guardas de conversación viva y comprador reciente).
- `tests/test-offline-v4.js` — sección 47 (21 checks) + `BOT_CATALOGO_WEB` en la lista
  de flags forzados OFF del arnés.
- Regenerado `workflows/bot-varman.json` con `node workflows/build-v4-pedidos.js`.

## Tests
`node tests/test-offline-v4.js` → **256 PASS · 0 FAIL** (235 previos + 21 nuevos).
Casos nuevos: OFF = catálogo de hoy (regresión) · ON: `hola`, `cat:deportivas`,
"quiero ver zapatos", `buscar_marca`, `comprar`, `pregunta_precio` → 1 solo mensaje
con el link, sin `image` ni lista · ON: "Quiero la Ref 05" arranca el pedido normal ·
"cancelar" tras el link borra la sesión · seguimiento: se aplaza si el cliente
escribió hace <1h, manda a las 3h con nombre y link, no se repite, no se manda con
pedido en curso ni a quien compró por el bot hace <24h, y con el flag OFF el trigger
no manda nada.

## Revisión adversarial
Tras la implementación se corrió una revisión multi-agente (3 lentes: regresión con
flag OFF, cobertura del brief con flag ON, y el seguimiento de 2h; cada hallazgo
verificado por un agente refutador independiente). La lente de regresión OFF no
encontró nada. Los 5 hallazgos confirmados de las otras lentes se corrigieron (los 4
de arriba: pregunta_precio en una burbuja, conversación viva, comprador reciente,
cancelar) o se documentaron (la limitación de "máx 1 por día" de arriba).

## Variable nueva (documentada, NO puesta en la VM)
```
# Catálogo solo por link de la web (el bot deja de mandar fotos/listas de catálogo
# y a las ~2h pregunta si pudo comprar). Apagado por defecto = bot como hoy.
# BOT_CATALOGO_WEB=on
```

## Cómo revertir
1. Si el flag no se ha encendido en la VM, no hay nada que revertir (OFF = hoy).
2. Rollback total: restaurar `workflows/respaldo/bot-varman.pre-catalogo-web.json`
   sobre `workflows/bot-varman.json` y reimportar (o revertir los 4 archivos de src/
   y tests y regenerar con el build).
