# 03 — BOT de ventas por WhatsApp (n8n + Meta Cloud API + Gemini + Firestore)

**Módulo del `PLAYBOOK-REPLICACION.md`. Capa documentada por el Agente 1 (ronda 2, 2026-07-06).
Actualizado a v5 el 2026-07-07 (fotos, marca, QR, fuente, estado de pedido, anti-spam, resumen).**
Escrito para que otra sesión de Claude monte esta capa para un negocio nuevo sin conocer VarMan.

## Qué es esta capa

Un bot de ventas que atiende el WhatsApp del negocio 24/7: muestra el catálogo con
FOTOS (tandas de máx 5 imágenes por URL pública + lista para elegir + "Ver más"),
entiende búsqueda por marca ("¿tienen adidas?" con ortografía mala incluida), toma
el pedido completo (referencia → talla → datos de envío → método de pago con botones
— con imagen de QR si está configurada — → foto del comprobante), guarda el pedido
en Firestore (donde la app de inventario lo muestra al equipo) CON la atribución de
pauta (campo `fuente` del referral de anuncios click-to-WhatsApp), descarga y
guarda el comprobante, responde "¿cómo va mi pedido?", avisa al dueño por WhatsApp,
le manda un resumen diario y le da comandos admin (`pedidos` / `pausar` / `activar`).
Reconoce el texto prellenado de la web ("Hola! Quiero la Ref 05") y arranca el pedido
en esa referencia sin menú. La IA (Gemini, nivel gratis) SOLO clasifica el lenguaje
libre (saludo/catálogo/marca/precio/comprar/estado/humano/otro); todo lo crítico va
con botones y listas. Si Gemini falla, el bot muestra el catálogo igual (fallback).
Anti-spam: máx N mensajes/minuto por número (protege el cupo gratis de Gemini).

**Stack:** n8n (workflows), WhatsApp Cloud API de Meta (webhook + envío), Firestore
(catálogo, sesiones, pedidos, comprobantes, errores, config), Gemini API (intenciones),
túnel Cloudflare (URL pública hacia n8n). Costo: $0/mes.

**Decisión de diseño heredable:** el código de los nodos Code vive LEGIBLE en
`workflows\src\*.js` y un script (`workflows\build-v4-pedidos.js`) genera el JSON del
workflow. Nunca se edita el JSON a mano. Los TEXTOS del bot (tono de venta) viven en
UN archivo (`workflows\src\textos.js`): cambiar el tono para otro negocio = editar ese
archivo + rebuild. Hay una suite de pruebas offline (WhatsApp mockeado, Firestore real,
Gemini real en el saludo y mockeado en los tests de lógica) que valida el flujo entero
sin Meta: `node tests\test-offline-v4.js` (64 asserts en v5).

## (a) Qué es GENÉRICO (sirve tal cual para otro negocio)

- **Toda la arquitectura del workflow v4** (11 nodos): webhook GET de verificación de
  Meta (challenge + token), webhook POST de mensajes, parseo del payload de Meta
  (texto / lista / botón / imagen), lectura del catálogo de Firestore, el Cerebro
  (nodo Code único con todo el flujo), envío por Graph API con reintento y salida de
  error a log, y el barrido diario 3:15am de sesiones caducadas.
- **La máquina de estados del pedido** en sesiones por cliente
  (`estado: talla → datos → pago → comprobante`), sesiones que caducan a las 24h,
  `cancelar` en cualquier punto, y el doble mecanismo de limpieza (al vuelo + barrido
  diario).
- **El armado de mensajes interactivos de WhatsApp** (listas con máx. 10 filas,
  botones máx. 3, límites de caracteres ya respetados con `.slice()`).
- **Acceso admin a Firestore sin SDK**: JWT firmado con la service account
  (`crypto` builtin, sin `fs` ni npm) → token OAuth → REST de Firestore. Funciona en
  cualquier nodo Code de n8n con `NODE_FUNCTION_ALLOW_BUILTIN=crypto`.
- **Descarga del comprobante** vía Graph API (GET /{media_id} → URL → binario con
  Bearer) con reintento 1x, límite ~900KB base64 (tope de documento de Firestore) y
  degradación elegante: si falla, el pedido se crea igual con el `media_id` y el error
  queda en `botErrores`.
- **Hardening completo**: try/catch global (el cliente nunca queda en silencio),
  log de errores a Firestore, reintentos en llamadas críticas, pausa global de
  mantenimiento, comandos admin.
- **El contrato del pedido con la app** (esquema y estados
  `nuevo`/`pagado_por_verificar` → `verificado`→`enviado`→`entregado`/`cancelado`):
  ver `bot_n8n\briefs\CAMBIOS-PEDIDOS.md` como plantilla de contrato entre capas.
- **La suite offline** (`tests\test-offline-v4.js`): mockea WhatsApp, usa Firestore
  REAL, limpia sus propios documentos. Solo cambian las rutas `tiendas/{negocio}` y
  los asserts de textos si se cambió el tono.
- **Los scripts de arranque** `start-tunnel.ps1` / `start-n8n.ps1` (Windows) y el
  workflow eco (`workflows\bot-whatsapp-eco.json`) para la fase de pruebas del webhook.
- **El runbook del corte** (`briefs\RUNBOOK-CORTE.md`) y la guía de Callback URL
  (`briefs\GUIA-META-CALLBACK.md`): el procedimiento es idéntico para cualquier negocio.

## (b) Qué está HARDCODEADO de VarMan (archivo → dónde)

Números de línea del 2026-07-06; si se movieron, buscar el texto indicado.

**`workflows\src\textos.js` — TODO el archivo es del negocio.** Marca, saludo,
despedida, mensajes de pago, handoff, textos admin y el prompt de Gemini
(`GEMINI_SISTEMA`, que menciona el negocio, el producto, el rango de precios y los
medios de pago). También `telefonoAtencion` (el número humano) — ojo: además de la
variable, el número aparece escrito dentro de `handoffCliente` y `errorTecnico`.

**`workflows\src\cerebro-v4.js`:**

| Qué | Línea | Buscar |
|---|---|---|
| Categorías del catálogo (deportivas/casuales/urbanas) | 20-21 | `CAT_LABEL` / `CAT_ORDER` |
| Proyecto Firebase `varman-crew` | 22 | `const FS_BASE` |
| Config del bot `tiendas/varman/botConfig/general` | 23 | `const CFG_PATH` |
| Zona horaria (fechas de los avisos admin) | 69 | `America/Bogota` |
| Query de pedidos `tiendas/varman:runQuery` | 135 | `runQuery` |
| Log de errores `tiendas/varman/botErrores` | 151 | `botErrores` |
| Sesiones `tiendas/varman/botSesiones/` | 297 | `SES_PATH` |
| Rango de tallas 36-45 (regex de validación) | 335 | `3[6-9]|4[0-5]` — y los textos de talla en textos.js |
| Pedidos `tiendas/varman/pedidos` | 388 | `fsAdd(tok, 'tiendas/varman/pedidos'` |
| Comprobantes `tiendas/varman/comprobantes/` | 393 | `comprobantes/` |
| Métodos de pago (Nequi/Daviplata/Bre-B) | 233 | `const PAGOS` — nombres aquí, números en `.env` |

**`workflows\build-v4-pedidos.js`:**

| Qué | Línea | Buscar |
|---|---|---|
| Id del workflow `VarmanBotV4Ped01` | 14 | `id:` |
| Nombre del workflow | 15 | `name:` |
| URL del catálogo (`varman-crew` + `tiendas/varman/catalogo`) | 71 | `catalogo?pageSize` |
| Zona horaria del workflow (afecta el barrido 3:15am) | 158 | `timezone` |

**Otros:**

- `workflows\src\limpiar-sesiones.js` líneas 9 y 41 (`varman-crew`, `tiendas/varman/botSesiones`).
- `workflows\src\log-error-envio.js` líneas 7 y 59 (`varman-crew`, `tiendas/varman/botErrores`).
- `workflows\bot-whatsapp-eco.json`: id `VarmanEcoBot0001`, nombre y texto del eco.
- `tests\test-offline-v4.js`: rutas `tiendas/varman/*` y asserts que citan textos del bot.
- `.env`: todos los valores (ver tabla de variables abajo).

## (c) Variables que un negocio nuevo tiene que definir (el `.env`)

| Variable | Qué es | De dónde sale |
|---|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | Id del número del bot en Meta | Meta → WhatsApp → Configuración de la API (CAMBIA al registrar la SIM real) |
| `WHATSAPP_WABA_ID` | Id de la cuenta de WhatsApp Business | Misma página |
| `WHATSAPP_TEST_NUMBER` | Número de prueba gratuito | Meta lo da al activar el caso de uso |
| `WHATSAPP_TOKEN` | Token permanente del usuario del sistema | Meta Business → usuarios del sistema. SOLO como header `Authorization: Bearer` |
| `WEBHOOK_VERIFY_TOKEN` | Palabra secreta del webhook (se inventa) | ej. `{negocio}-{hex aleatorio}` |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | IA de intenciones | aistudio.google.com (gratis). Modelo EN VARIABLE (se retiran sin aviso) |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_SA_JSON` / `FIREBASE_SA_B64` | Service account de Firebase (admin) | Firebase → cuentas de servicio → generar clave; el B64 es el JSON en base64 |
| `OWNER_WHATSAPP` | Número del dueño (avisos + comandos admin) | ej. `573202250619` (solo dígitos, con indicativo) |
| `PAGO_NEQUI` / `PAGO_DAVIPLATA` / `PAGO_BREB` | Números/llaves de pago QUE VE EL CLIENTE | El dueño. Si cambian los métodos, tocar también `PAGOS` en cerebro-v4.js y los botones |
| `PAGO_QR_NEQUI` / `PAGO_QR_DAVIPLATA` / `PAGO_QR_BREB` | (v5, opcional) URL https pública de la imagen QR de cada método | El dueño la genera en su app de pagos; se sube como archivo a la web estática. Si falta, el bot manda solo texto (nunca rompe el pago) |
| `CATALOGO_FOTOS_URL_BASE` | (v5, opcional) Base de las URLs públicas de las fotos del catálogo | Por defecto `https://{web}.pages.dev/img/`. Los ids de foto del catálogo deben existir como archivos ahí |
| `BOT_MSGS_POR_MIN` | (v5, opcional) Límite anti-spam por número | Por defecto 8. Los tests lo suben a 999 para no auto-frenarse |
| `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` | Los nodos Code leen `$env` | fijo, obligatorio |
| `NODE_FUNCTION_ALLOW_BUILTIN=crypto` | Los nodos Code usan `crypto` | fijo, obligatorio |
| `N8N_PORT` / `N8N_SECURE_COOKIE` / `GENERIC_TIMEZONE` | Config de n8n | `5678` / `false` / zona horaria del negocio |

Además (fuera del `.env`): categorías del catálogo (en `cerebro-v4.js` — deben coincidir
con el campo `cat` de los documentos del catálogo en Firestore), rango de tallas (o
variantes del producto), todos los textos de `textos.js`, y las rutas
`tiendas/{negocio}/...` (buscar y reemplazar `tiendas/varman` + `varman-crew` en los
4 archivos de `src\`, el build y los tests).

## (d) Montaje desde cero (orden probado, con tiempos)

Prerrequisitos de otras capas: proyecto Firebase con catálogo cargado en
`tiendas/{negocio}/catalogo` (docs con `ref`, `precio`, `cat`, `activo`, `orden`,
opcional `tag`) — lo monta la capa app (módulo 02). Cuentas de Meta con caso de uso
WhatsApp (fase 0 del playbook).

1. **Instalar n8n (30-60 min).** En el PC de desarrollo o directo en Docker (mejor —
   lección 2 del playbook: n8n por pnpm en Windows exigió 2 parches manuales).
   Copiar la carpeta `bot_n8n\` como esqueleto: scripts, workflows, tests, briefs.
2. **Armar el `.env` (20 min).** Tabla de arriba. Los `PAGO_*` pueden decir PENDIENTE
   hasta el corte; el resto es obligatorio desde ya.
3. **Renombrar el espacio (30 min).** Buscar/reemplazar `tiendas/varman` → 
   `tiendas/{negocio}` y `varman-crew` → `{proyecto-firebase}` en `workflows\src\*.js`,
   `workflows\build-v4-pedidos.js`, `workflows\bot-whatsapp-eco.json` y
   `tests\test-offline-v4.js`. Cambiar ids de workflows (`VarmanEcoBot0001`,
   `VarmanBotV4Ped01`) por los del negocio (16 chars alfanuméricos).
4. **Reescribir `workflows\src\textos.js` (30-60 min con el dueño).** Marca, tono,
   textos de pago, teléfono humano, categorías, prompt de Gemini. Ajustar `CAT_LABEL`/
   `CAT_ORDER` y el regex de tallas en `cerebro-v4.js` si el producto cambia.
   `node workflows\build-v4-pedidos.js` para regenerar el JSON.
5. **Túnel + n8n (15 min).** `start-tunnel.ps1` PRIMERO (da la URL pública en
   `tunnel-url.txt`), luego `start-n8n.ps1`. Crear la cuenta dueño de n8n con el
   correo del negocio. En producción: túnel NOMBRADO con dominio propio (módulo 04)
   para que la URL no cambie en cada reinicio.
6. **Webhook con Meta usando el eco (30-60 min).** Importar y activar
   `bot-whatsapp-eco.json` (CLI con n8n apagado, o desde el editor). En Meta:
   Callback URL = `https://{tunel}/webhook/whatsapp` + verify token, y suscribir el
   campo **messages** (procedimiento exacto: `briefs\GUIA-META-CALLBACK.md`).
   OJO: tras arrancar n8n los webhooks tardan 30-60s en registrarse (404 transitorio).
   Probar el eco con el número de prueba de Meta.
7. **Importar el v4 y probar offline (30 min).** `n8n import:workflow` (SIEMPRE con
   n8n apagado — lock de SQLite), dejarlo INACTIVO mientras el eco siga en pruebas
   (comparten el path `/webhook/whatsapp`: solo UNO activo a la vez).
   `node tests\test-offline-v4.js` → debe dar 32/32 (ajustar asserts si se cambió
   el texto de talla/pagos).
8. **E2E con número de prueba (30 min).** Activar v4 (eco inactivo), conversar desde
   un celular real registrado como destinatario de prueba en Meta: catálogo → pedido
   → foto → pedido visible en la app + aviso al dueño.
9. **El corte (1-2 h, día del lanzamiento).** Registrar la SIM real (cambia el
   `WHATSAPP_PHONE_NUMBER_ID`), datos de pago reales, re-import, Callback URL si
   cambió el túnel, E2E real. Checklist completo con rollback:
   `briefs\RUNBOOK-CORTE.md` (genérico, sirve tal cual).

Total estimado: ~1 día de trabajo efectivo + esperas de Meta (verificación del
negocio ~2 días en paralelo, ver fase 4 del playbook).

## Trampas conocidas (no repetir — ya nos pasaron)

- Token de WhatsApp como `?access_token=` en URL → error 190. SOLO header Bearer.
- Import/activate por CLI con n8n prendido → cambios que no se aplican o lock de SQLite.
- Túnel temporal: la URL cambia en CADA reinicio del PC → actualizar Callback URL en
  Meta cada vez (por eso el túnel nombrado es prioridad del módulo 04).
- El JSON importado en n8n es una COPIA: si se regenera el JSON después de importar,
  RE-IMPORTAR (con n8n apagado) o n8n seguirá corriendo la versión vieja.
- Los nodos Code de n8n no tienen `fs` ni módulos npm: solo `crypto` (por eso el
  comprobante va a Firestore en base64 y no a disco).
- Gemini nivel gratis da 429/503 transitorios: el fallback (mostrar catálogo) es
  obligatorio, no opcional.
- El número de prueba de Meta no puede INICIAR conversaciones con números no
  registrados como destinatarios de prueba (error #131030) — es normal, no es bug.
- La app de Meta en modo Desarrollo NO recibe mensajes de números reales ajenos:
  para operar hay que PUBLICAR la app (requiere verificación del negocio).

## Trampas nuevas de la v5 (2026-07-07)

- **Fotos al bot SIEMPRE por URL pública, nunca base64** (la VM tiene 1 GB de RAM y
  los docs de Firestore ya van cargados). Truco que lo hizo gratis: los ids de foto
  del catálogo (`p005`…) son LOS MISMOS nombres de archivo `img/p005.jpg` de la web
  estática en Cloudflare Pages → `link` = base + id + `.jpg`. Las fotos subidas
  DESPUÉS desde la app tienen ids `f...` y solo existen como base64 en Firestore:
  esas refs van por el fallback de texto (regex `/^p\d{1,4}$/` decide).
- **El texto prellenado de la web es un CONTRATO con el bot:** el regex de "ref
  directa" del Cerebro debe reconocer lo que la web arma en el clic de "Pedir"
  (y el formato viejo, por enlaces compartidos). Si se cambia uno, cambiar el otro.
- **El `referral` de los anuncios ctwa SOLO llega en el PRIMER mensaje.** Hay que
  persistirlo en la sesión de una vez (aunque no haya pedido en curso) o se pierde
  mientras el cliente navega el catálogo.
- **PATCH de Firestore REST sin `updateMask` REEMPLAZA el documento entero.** Para
  merges parciales (guardar `fuente` sin pisar la sesión) usar
  `?updateMask.fieldPaths=campo` (helper `fsMerge` del cerebro).
- **Si un nodo Code alimenta "Enviar a WhatsApp", TODO lo que devuelva se envía.**
  El barrido diario devuelve SOLO payloads válidos de mensaje (o `[]`); las
  estadísticas internas no pueden salir por ahí o Graph API da error.
- **La app escribe el catálogo con `.set()` completo:** al agregar un campo nuevo al
  catálogo (ej. `marca`), agregarlo TAMBIÉN al `guardar()` de la pestaña Tienda o
  cada edición desde la app lo borra en silencio.
- **Campos nuevos en documentos viejos:** los pedidos anteriores al campo `fuente`
  no lo tienen — la app debe tratar "sin campo" como "sin dato", no asumir un valor.
- **Anti-spam con contador por minuto** en una colección propia (`botRate`): probarlo
  con el límite bajado por variable de entorno y cuidar el borde de minuto en los
  tests (esperar el minuto nuevo si faltan <25s).
- **App→bot SIN que la app hable con Meta:** la app deja docs en una colección
  `notificacionesPendientes` (tipo + destinatario + datos) y el bot los envía con
  un trigger HORARIO (si la ventana de 24h está abierta) o apenas el cliente
  vuelve a escribir (el Cerebro revisa pendientes en cada mensaje). Mejor que
  hacer polling de estados: la app conoce el momento exacto de la transición.
- **La ventana de 24h se estima con un doc que ya se escribe en cada mensaje
  entrante** (el contador anti-spam `botRate`: su `updatedAt` = último mensaje
  del cliente) — pero entonces el barrido debe conservarlos >24h, no borrarlos
  a la hora. Si dos features comparten un doc, revisar los TTL de ambos.
- **Recordatorios "una sola vez": marcar el doc ANTES de encolar el mensaje**
  (mejor perder un recordatorio que duplicarlo si algo falla a mitad).
- **Los atajos por regex compiten con los intents de Gemini:** "avísame cuando
  llegue la ref 05" contiene "ref 05" y dispararía el atajo de compra directa —
  poner la guarda léxica ("avis|cuando llegue…") ANTES del atajo.
- **Combobox de nombres reutilizables barato:** `<input list>` + `<datalist>` +
  colección de nombres con id-slug; se escribe una vez y queda para las
  siguientes referencias. Sin librerías.

---
*Creado por el Agente 1 (bot) el 2026-07-06. v5 por el agente V5 el 2026-07-07.
Si esta capa cambia, actualizar este módulo.*
