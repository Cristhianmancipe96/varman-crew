# BRIEF Claude Code — Mejoras v5 (bot + app + web) · 7 jul 2026

**Lee antes:** `BRIEF-NUEVA-SESION.md`, `LEEME-BOT.txt`, `briefs/PLAN-PRUEBA-BOT-2026-07-07.md`
(resultados de hoy) y `NOTA-AGENTE-GCP-2026-07-06.md`.

## Estado (no romper esto)
- v4.1 CORRE EN PRODUCCIÓN en la VM de GCP (`https://bot.varmancrew.com`), probado
  completo hoy (8/8 pruebas). La app Meta sigue en modo desarrollo; se prueba
  escribiendo al número de PRUEBA (el bot responde por el 304).
- Fuente de la verdad de workflows: `workflows\` del PC (con `src/` + `build-v4-pedidos.js`).
  Flujo de despliegue: editar local → probar offline → subir a la VM → `bash importar-workflows.sh`
  (SIEMPRE con n8n detenido — lock SQLite). Antes de tocar la VM: `bash backup.sh --completo`.
- RAM de la VM: 1 GB + swap. Nada de cargar imágenes en memoria/base64: fotos SIEMPRE por URL.

## Mejoras pedidas por Cristhian (en orden de prioridad)

### 1. Catálogo con FOTOS en el bot
Hoy el bot lista texto. Queremos que el cliente ELIJA VIENDO:
- Al mostrar una categoría, enviar mensajes de **imagen** (Cloud API `type: image` con
  `link` = URL pública de la foto que ya usa la web) con caption `Ref {ref} · {nombre} · {precio}`.
- Enviar máx **5-6 por tanda** (más = spam y carga); si hay más, botón "Ver más".
- Fallback obligatorio: si una referencia no tiene foto o la URL falla, mandar la línea
  en texto (nunca un mensaje roto). Verificar qué campo de foto existe en
  `tiendas/varman/catalogo` y que las URLs sean https públicas (las de la web sirven).

### 2. Búsqueda por marca ("¿tienen adidas?")
- Agregar dimensión **marca** al flujo: si el cliente menciona una marca, mostrar todas
  las referencias de esa marca (con fotos, punto 1).
- Revisar si el catálogo en Firestore tiene campo `marca`. Si NO: intentar backfill
  automático desde el nombre de la referencia; lo que no se pueda inferir queda `null` y
  se anota en la nota final para que Cristhian lo complete desde la pestaña Tienda
  (si la pestaña no edita ese campo, agregarlo a la app — coordinado con el punto 5).
- Gemini (clasificador existente) debe extraer `marca` como entidad; sin depender de
  ortografía exacta ("adidas", "addidas", "las adidas").

### 3. Pago más fácil (investigado por el PM — NO hay deeplink P2P)
No existe link de pago directo para cuentas personales Nequi/Daviplata (eso llega con
Wompi en Fase 2). Lo mejor disponible HOY:
- Al elegir método de pago, el bot envía: (a) **imagen del QR** del método (escanea y
  paga, sin digitar), (b) un mensaje aparte SOLO con el número/llave (para copiar con
  un toque), (c) el total.
- Los QR los genera Cristhian (Nequi → QR Bre-B personal; Daviplata igual si lo ofrece)
  y se guardan como imágenes subidas a un hosting propio (ej. carpeta `img/pagos/` de la
  web en Cloudflare Pages) — URLs en variables `PAGO_QR_NEQUI`, `PAGO_QR_DAVIPLATA`,
  `PAGO_QR_BREB` del `.env`. Si una variable no existe, el bot se comporta como hoy
  (solo texto) — nunca romper el flujo de pago.
- Dejar instrucción en la nota final: pasos exactos para que Cristhian genere los QR.

### 4. Web → bot con producto prellenado
- En la web, los botones/CTAs de producto deben abrir WhatsApp con texto prellenado:
  `https://wa.me/<NUMERO>?text=Hola! Quiero la Ref {ref} - {nombre}`.
  Mantener `var WHATSAPP_NUMERO` como ÚNICA fuente del número (regla de EL CORTE intacta).
- En el bot: reconocer ese mensaje de entrada (intent "ref directa") y arrancar el
  flujo YA en esa referencia (mostrar foto + precio + pedir talla), sin pasar por el menú.

### 5. App: anular ventas sin dañar el inventario (modo prueba)
- En la app, para ventas TERMINADAS: botón **"Anular venta"** que:
  (a) repone el stock descontado (inventario vuelve a como estaba),
  (b) marca la venta como `anulada` (no borrar el registro) con fecha, quién y motivo
  (opciones: "prueba" / "devolución" / "error"),
  (c) visible solo para socios (mismo criterio de permisos que Caja).
- Actualizar `app\reglas-firestore.txt` si hace falta regla nueva (Cristhian la pega).
- Lo mismo para pedidos del bot en estado final si aplica (cancelado ya existe como
  estado — verificar que cancelar un pedido `verificado`+ reponga stock si el flujo
  actual lo descuenta; si el inventario aún no se descuenta automático, documentarlo
  y no inventar el cruce catálogo↔inventario: sigue vigente `DECISION-CATALOGO-INVENTARIO.md`).

### 5-bis. Asociar catálogo ↔ inventario CON bodegas externas (decisión tomada 7 jul)
Esto ejecuta la **Opción B** de `DECISION-CATALOGO-INVENTARIO.md` (colección de mapeo
PRIVADA `tiendas/varman/mapaCatalogo`) pero con dos cambios pedidos por Cristhian:

1. **La asociación se hace desde la APP, no llenando la tabla a mano:** en la pestaña
   Tienda, cada referencia del catálogo tiene una sección "Inventario" con un selector
   de dos modos:
   - **Bodega propia:** picker múltiple de códigos VRM existentes (una ref puede tener varios).
   - **Bodega externa:** combobox donde puede **escribir un nombre nuevo O elegir uno ya
     existente** (ej. "Bodega Andrés", "Proveedor Centro"). Los nombres nuevos se guardan
     en `tiendas/varman/proveedores` y quedan disponibles para las siguientes referencias
     (escribir una vez, reutilizar siempre). Campo opcional `nota` (ej. contacto del proveedor).
2. **Esquema de `mapaCatalogo/{ref}`:** `{ ref, tipo: "propia"|"externa"|"mixta",
   codigosInv: [...], proveedor: "nombre o null", nota }`. Lectura solo con login
   (regla Firestore como `products` — agregar a `app\reglas-firestore.txt`).

Efectos en el resto del sistema (mínimos, no bloquear):
- En el detalle del pedido (app), mostrar de dónde sale la referencia: códigos VRM o
  badge "🏭 Externa: {proveedor} — verificar disponibilidad".
- El bot NO cambia su flujo de venta todavía (el chequeo de stock automático sigue
  siendo Fase 2); pero si el mapa existe y la ref es externa, el aviso interno de nuevo
  pedido al 320 debe incluir "(ref externa: {proveedor})" para que Cristhian sepa a
  quién pedirla.
- La anulación de ventas (punto 5) solo repone stock de códigos VRM propios; las
  externas no tienen stock que reponer.

### 6. Atribución de pauta (URGENTE antes del 16 jul — lo pide marketing)
- Los webhooks de anuncios click-to-WhatsApp traen objeto `referral` (source_id del
  anuncio). Capturarlo en "Parsear mensaje" y guardarlo como campo `fuente` en el
  pedido (y en la sesión). Si no hay referral → `fuente: "organico"`.
- Es cambio de esquema del pedido: registrarlo en `briefs\CAMBIOS-PEDIDOS.md` y
  mostrarlo en el detalle del pedido en la app (solo lectura).

## Backlog aprobado por Cristhian (7 jul) — TODO entra en este brief, en este orden
7. **Intent "¿cómo va mi pedido?"** → busca el último pedido del cliente (por su wa_id)
   y responde el estado en lenguaje claro.
8. **Anti-spam:** máx N mensajes/minuto por número (proteger cupo Gemini 1500/día);
   al exceder, respuesta amable "dame un momentico 🙏" y pausa.
9. **Resumen diario al 320** (schedule trigger existente): pedidos nuevos, pedidos por
   verificar, errores del día.
10. **Carrito abandonado:** si una sesión eligió referencia/talla pero no llegó a
    comprobante, a las ~3 horas (dentro de la ventana de 24h — gratis) enviar UN solo
    recordatorio. Texto parametrizado:
    `¡Hola {nombre}! 👟 Vi que dejaste tu pedido de la Ref {ref} talla {talla} a medias.
    ¿Te ayudo a terminarlo? El total sería {total}. Si ya no lo quieres, todo bien —
    escríbeme *cancelar* y listo.`
    Regla: máximo 1 recordatorio por sesión, nunca a quien escribió *cancelar*.
11. **Reseña post-entrega:** cuando el pedido pase a `entregado` en la app, el bot envía
    (dentro de ventana activa; si no hay ventana, se anota como pendiente y se envía
    cuando el cliente vuelva a escribir):
    `¡Gracias por tu compra, {nombre}! 🙌 Esperamos que tus {nombre_producto} te encanten.
    ¿Nos regalas una reseña? Nos ayuda un montón 🧡 → {link_facebook_resenas}`
    Link en variable de entorno `LINK_RESENAS_FB`.
12. **Guía de envío:** campo `guia` + `transportadora` en el pedido (editable desde la
    app al pasar a `enviado`); al guardarse, el bot notifica al cliente:
    `📦 ¡Tu pedido va en camino! Transportadora: {transportadora} · Guía: {guia}.`
13. **Aviso de stock:** intent "avísame cuando llegue la talla X de la ref Y" → guardar
    en `tiendas/varman/listaEspera`; visible en la app; el envío del aviso puede ser
    manual por ahora (Cristhian lo dispara desde la app) — documentar cómo.

Los puntos 10-12 implican mensajes INICIADOS por el negocio: verificar que salgan dentro
de la ventana de servicio de 24h (gratis) o documentar la limitación; NO usar plantillas
pagas sin avisar a Cristhian. El punto 11-12 requieren que la app dispare eventos: hacerlo
simple (el bot puede leer cambios de estado con un polling ligero en el schedule trigger,
o la app escribe en una colección `notificacionesPendientes` que el bot procesa — decidir
y documentar; recordar la RAM de 1 GB).

## Reglas que NO se negocian
- Nada de credenciales a git/deploys. `.env` real vive en la VM y en `credenciales\`.
- Esquema del pedido congelado salvo el campo `fuente` (punto 6) — documentar en CAMBIOS-PEDIDOS.
- Import/activación por CLI con n8n APAGADO. Webhooks tardan 30-60s tras arrancar.
- No actualizar n8n. Flags `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` y `NODE_FUNCTION_ALLOW_BUILTIN=crypto` intactas.
- Probar TODO offline contra Firestore real antes de tocar la VM (como el v4).
- La web se toca solo en `web\` (regla un-agente-una-carpeta si se paraleliza); el
  número público NO se cambia hasta EL CORTE.

## Al terminar
- Tests offline en verde + prueba en VM (importar-workflows + verificar-salud 7/7).
- Nota `NOTA-AGENTE-V5-<fecha>.md` con: lo hecho, pasos manuales de Cristhian
  (QRs, campo marca, reglas Firestore), y actualizar `plantilla\03-bot.md` con lecciones.

*Brief generado en Cowork (PM) el 2026-07-07 tras las pruebas 8/8 del bot en producción.*
