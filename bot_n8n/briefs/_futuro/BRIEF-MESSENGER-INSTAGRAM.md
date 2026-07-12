# FASE 2 — Extender el bot de VarMan Crew a Messenger e Instagram DMs

**Fecha de investigación:** 5 de julio de 2026
**Fuentes:** documentación oficial de Meta (developers.facebook.com), verificada esta misma fecha. Todas las URLs al final.
**Estado:** informe-plan. NO se tocó nada en Meta ni en n8n. Este documento deja todo listo para ejecutar cuando la app "VarMan Crew" (ID 2168913152950288) esté PUBLICADA.

---

## Resumen ejecutivo (léeme primero)

1. **Sí se puede: un solo cerebro, tres canales.** Messenger e Instagram usan la MISMA "Send API" (heredada de Messenger) y webhooks muy parecidos entre sí. El bot actual de n8n se extiende agregando un webhook nuevo, un "traductor" de entrada y un "formateador" de salida por canal. El nodo de Gemini + catálogo NO cambia.

2. **El requisito que toma tiempo es App Review (revisión de la app por Meta) para Instagram.** Para responder DMs de Instagram de clientes reales se necesita el permiso `instagram_manage_messages` con **acceso avanzado**, que exige: verificación del negocio (ya está en proceso) + una revisión donde Meta pide un **screencast** (video de pantalla) mostrando el bot funcionando. Meta no publica plazos exactos; en la práctica va de unos días a 2-4 semanas. Para Messenger en tu propia página, la documentación nueva dice que **no hace falta App Review** (hay letra chica contradictoria — ver sección 1.4). **Recomendación: preparar la sumisión de App Review el mismo día que se agreguen los casos de uso.**

3. **Cambio reciente de plataforma (¡ojo!):** desde el **27 de abril de 2026** Meta eliminó 3 de las 4 etiquetas que permitían escribirle al cliente después de 24 horas en Messenger (`ACCOUNT_UPDATE`, `POST_PURCHASE_UPDATE`, `CONFIRMED_EVENT_UPDATE`). Sobrevive solo **`HUMAN_AGENT`** (respuesta humana hasta 7 días), que a su vez **requiere aprobación en App Review**. Traducción práctica: en Messenger/Instagram el bot debe resolver la venta **dentro de las 24 horas** siguientes al último mensaje del cliente, igual que la filosofía actual del bot de WhatsApp.

4. **El token actual de WhatsApp NO sirve para los canales nuevos.** El token del usuario de sistema solo tiene permisos `whatsapp_*`. Para Messenger e Instagram se necesita un **Page Access Token** (token de página). La buena noticia: se genera con el mismo usuario de sistema en el mismo Business Manager, y queda permanente (no vence). Procedimiento en la sección 4.

5. **Instagram tiene una condición extra fuera de Meta Developers:** en la app de Instagram del negocio hay que activar el interruptor **"Permitir acceso a mensajes"** (Configuración → Mensajes y respuestas a historias → Controles de mensajes → Herramientas conectadas). Sin eso, no llegan los webhooks de DMs aunque todo lo demás esté bien.

---

## 1. Requisitos por canal

### 1.1 Messenger (página de Facebook)

**Permisos que exige hoy la Messenger Platform** (documentación vigente 2026):

| Permiso | Para qué |
|---|---|
| `pages_messaging` | Enviar y recibir mensajes de la página. **El permiso central.** |
| `pages_manage_metadata` | Suscribir la app a los webhooks de la página. |
| `pages_read_engagement` | Leer datos básicos de la conversación. |
| `pages_show_list` | Listar las páginas y obtener el Page ID. |
| `business_management` | Dependencia obligatoria de `pages_messaging` y `pages_show_list`. |

**Qué necesita la cuenta:** una página de Facebook **publicada** (VarMan ya la tiene) y que quien autorice pueda realizar las tareas MESSAGING/MODERATE en la página. Se opera con un **Page Access Token** (sección 4).

**¿App Review?** La documentación nueva de Meta dice textualmente que App Review "no es necesaria si solo envías y recibes mensajes para tu propia página de Facebook". PERO hay una contradicción documental importante — ver sección 1.4.

### 1.2 Instagram DMs

⚠ **Hoy existen DOS APIs distintas para DMs de Instagram** (esto confunde mucho en internet, incluso los nombres de permisos son casi iguales):

| | **Opción A: vía Facebook Login** (Messenger Platform) | **Opción B: "Instagram API with Instagram Login"** |
|---|---|---|
| Permisos | `instagram_basic` + `instagram_manage_messages` + `pages_manage_metadata` | `instagram_business_basic` + `instagram_business_manage_messages` |
| Requiere página de Facebook vinculada | **Sí** | No |
| Host de la API | `graph.facebook.com` | `graph.instagram.com` |
| Token | **Page Access Token** (el mismo de Messenger) | "Instagram User access token" (otro token aparte, con su propio ciclo de renovación) |
| Encaja con la infraestructura actual | **Sí — misma app, mismo token, mismos webhooks que Messenger** | No — duplicaría tokens y configuración |

**Recomendación para VarMan: Opción A (vía Facebook Login / Messenger Platform).** Razones: la página de Facebook ya existe y está vinculada al Instagram del negocio; el mismo Page Access Token sirve para los dos canales nuevos; y todo queda dentro de la misma app "VarMan Crew" junto a WhatsApp. La Opción B queda documentada por si Meta migrara todo hacia allá en el futuro (la promociona como "la nueva API"), pero hoy la Opción A sigue vigente y es la que usan las plataformas tipo Chatwoot/ManyChat.

**Qué necesita la cuenta de Instagram:**
- Ser cuenta **profesional** (Business o Creator). VarMan ya la tiene.
- Estar **vinculada a la página de Facebook** del negocio.
- Activar en la app de Instagram: **Configuración → Mensajes y respuestas a historias → Controles de mensajes → Herramientas conectadas → "Permitir acceso a mensajes"**. (Paso oficial documentado por Meta; sin esto no llegan webhooks.)

**¿App Review?** Para conversar con clientes reales (gente sin rol en la app): **sí, en la práctica hay que planear App Review con acceso avanzado para `instagram_manage_messages`**. La guía oficial "Apps For Your Own Business" de Instagram Messaging asume que se pasa por App Review incluso siendo tu propia cuenta, y pide: indicar si el uso es "Automated" (bot), "Live Agent" o ambos; el @handle del Instagram; y un **screen recording** demostrando la función. Ver sección 1.4 y el plan de la sección 7.

### 1.3 Verificación del negocio

- La verificación del negocio (la que el usuario inicia el 6 de julio con RUT/cámara de comercio) **es requisito para cualquier permiso con acceso avanzado** — o sea, para Instagram messaging con clientes reales y para la etiqueta `HUMAN_AGENT`. Meta: "Business Verification is required for all apps making requests for Advanced Access".
- También es requisito para publicar la app (ya identificado en fase 1). Es decir: **la misma verificación en curso desbloquea las dos cosas**. No hay que hacer nada adicional.

### 1.4 ⚠ Información contradictoria encontrada (obligatorio decirlo)

La documentación de Meta está a mitad de una migración (URLs viejas `…/docs/messenger-platform/…` conviven con nuevas `…/documentation/business-messaging/…`; varias páginas viejas devolvieron error 500 durante esta investigación). Encontré estas contradicciones literales:

1. El **Overview nuevo** de Messenger Platform dice: App Review **no** es necesaria "si solo envías y recibes mensajes para tu propia página". Pero el **mismo documento** dice que el acceso avanzado (que sí exige App Review) "es necesario para acceder a conversaciones entre tu negocio y personas que **no tienen un rol** en tu app, tu cuenta de Instagram profesional, tu página o tu negocio" — y los clientes de VarMan obviamente no tienen rol en nada.
2. La **doc vieja de App Review** de Messenger dice: "hasta que tu app sea aprobada en App Review, los Page tokens solo permiten interactuar con cuentas que tengan rol de Administrador, Desarrollador o Tester en la app".

**Cómo lo resuelvo en este plan:** asumir el escenario conservador (el que no bloquea el negocio):
- **Messenger:** probar empíricamente el día de activación. Con la app publicada, página propia y Page token: si un Facebook SIN rol en la app recibe respuesta del bot → no hacía falta review (escenario que describe la doc nueva). Si da error de permisos → someter `pages_messaging` a App Review (la sumisión ya estaría preparada).
- **Instagram:** ir directo a App Review con acceso avanzado. Todas las fuentes (oficiales y de terceros) coinciden en que para DMs con público general se necesita.

---

## 2. Webhooks: qué llega y cómo

### 2.1 Qué se suscribe por canal

| Canal | Objeto de webhook | Campos mínimos para el bot | Campos opcionales útiles |
|---|---|---|---|
| WhatsApp (actual) | `whatsapp_business_account` | `messages` | — |
| Messenger | **`page`** | `messages`, **`messaging_postbacks`** | `message_deliveries`, `message_reads`, `message_reactions`, `message_echoes` |
| Instagram | **`instagram`** | `messages`, **`messaging_postbacks`** | `message_reactions`, `messaging_seen`, `messaging_referral` |

- `messages`: cada mensaje entrante del cliente (texto, adjuntos, quick reply tocada, respuestas a historias…).
- `messaging_postbacks`: cuando el cliente toca un **botón** de plantilla (equivale al `interactive.list_reply/button_reply` de WhatsApp). **Imprescindible** para el flujo de catálogo con botones.
- Nota oficial IG: "Your app must be published, regardless of app review status, to receive webhooks" — otra razón por la que fase 2 va después de publicar.
- La **verificación** del webhook es idéntica a la de WhatsApp: GET con `hub.mode=subscribe`, `hub.verify_token` y `hub.challenge`. El nodo "Verificar token" actual sirve tal cual.
- Hay que responder **200 OK en ≤5 segundos** o Meta reintenta la entrega (el flujo actual ya responde `onReceived`, perfecto).

### 2.2 Forma del payload (la diferencia clave con WhatsApp)

**WhatsApp (lo que el bot parsea hoy):** `entry[].changes[].value.messages[]`, el remitente va en `messages[].from` y el nombre en `contacts[].profile.name`.

**Messenger** — objeto `page`, estructura `entry[].messaging[]`:

```json
{
  "object": "page",
  "entry": [{
    "id": "<PAGE_ID>",
    "time": 1458692752478,
    "messaging": [{
      "sender":    { "id": "<PSID>" },
      "recipient": { "id": "<PAGE_ID>" },
      "timestamp": 1458692752478,
      "message": {
        "mid": "mid.1457764197618:41d102a3e1ae206a38",
        "text": "hello, world!"
      }
    }]
  }]
}
```

**Instagram** — objeto `instagram`, misma estructura `entry[].messaging[]`:

```json
{
  "object": "instagram",
  "entry": [{
    "id": "<IG_ID>",
    "time": 1569262486134,
    "messaging": [{
      "sender":    { "id": "<IGSID>" },
      "recipient": { "id": "<IG_ID>" },
      "timestamp": 1569262485349,
      "message": {
        "mid": "<MESSAGE_ID>",
        "text": "<TEXTO>",
        "attachments": [ { "type": "image", "payload": { "url": "<LINK>" } } ]
      }
    }]
  }]
}
```

Diferencias prácticas contra WhatsApp:

| Aspecto | WhatsApp | Messenger / Instagram |
|---|---|---|
| Ruta del mensaje | `entry[].changes[].value.messages[]` | `entry[].messaging[]` |
| ID del cliente | `messages[].from` (número de teléfono, `wa_id`) | `sender.id` — **PSID** (Messenger) o **IGSID** (Instagram). Son IDs "con ámbito": el mismo usuario tiene un ID distinto por página/cuenta. **No es un teléfono.** |
| Nombre del cliente | Viene gratis en `contacts[].profile.name` | **NO viene en el webhook.** Hay que llamar la User Profile API aparte (y en Messenger eso sí exige App Review). Recomendación: prescindir del nombre en fase 2. |
| Adjuntos | `messages[].image.id` etc. (hay que descargar por API) | `message.attachments[].payload.url` — llega la **URL directa** (más fácil para el comprobante de pago). |
| Botón/lista tocada | `messages[].interactive.list_reply.id` | Quick reply tocada → `message.quick_reply.payload` (dentro de `messages`); botón de plantilla → evento aparte `messaging_postbacks` con `postback.payload`. |
| Eco de lo que envía el bot | No (solo statuses) | Puede llegar `message` con `is_echo: true` → **hay que ignorarlos** para no responderse a sí mismo (bucle infinito). |

### 2.3 ¿Mismo endpoint o webhook aparte en n8n?

Los tres productos se configuran por separado en el panel de Meta y cada uno permite su propia Callback URL, así que ambas opciones son válidas. **Recomendación: dejar `/webhook/whatsapp` COMO ESTÁ (no tocar lo que funciona) y crear UN webhook nuevo en n8n, p. ej. `/webhook/meta-social`, compartido por Messenger e Instagram.** Razones:

- Riesgo cero para el canal de WhatsApp ya probado.
- Messenger e Instagram comparten estructura (`entry[].messaging[]`), así que un solo parseador los atiende; el campo `object` del body (`"page"` vs `"instagram"`) dice de qué canal vino.
- La verificación GET es igual; se reutiliza el mismo `WEBHOOK_VERIFY_TOKEN`.

---

## 3. Envío de respuestas (Send API)

### 3.1 Endpoints

**El MISMO endpoint sirve para Messenger y para Instagram (Opción A)**; lo que cambia es el ID del destinatario (PSID vs IGSID):

```
POST https://graph.facebook.com/v25.0/<PAGE_ID>/messages     (también acepta /me/messages)
Authorization: Bearer <PAGE_ACCESS_TOKEN>
Content-Type: application/json
```

> v25.0 es la versión que muestran los ejemplos oficiales a jul-2026; usar la última disponible al implementar. El token puede ir como header `Authorization: Bearer` (recomendado, consistente con el flujo de WhatsApp actual) o como parámetro `access_token`.

**Texto simple — Messenger:**
```bash
curl -X POST "https://graph.facebook.com/v25.0/<PAGE_ID>/messages" \
  -H "Authorization: Bearer <PAGE_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": { "id": "<PSID>" },
    "messaging_type": "RESPONSE",
    "message": { "text": "¡Hola! Bienvenido a VarMan Crew 👟" }
  }'
```

**Texto simple — Instagram (mismo endpoint, destinatario IGSID):**
```bash
curl -X POST "https://graph.facebook.com/v25.0/me/messages" \
  -H "Authorization: Bearer <PAGE_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": { "id": "<IGSID>" },
    "message": { "text": "¡Hola! Bienvenido a VarMan Crew 👟" }
  }'
```
Límite IG: el texto debe ser **menor a 1000 caracteres**. Imágenes: hasta 10 por mensaje.

*(Referencia: la Opción B usaría `POST https://graph.instagram.com/v25.0/<IG_ID>/messages` con token de usuario de Instagram — no se recomienda aquí.)*

### 3.2 Equivalentes de los botones/listas de WhatsApp

WhatsApp tiene `interactive: list` (hasta 10 filas) y `interactive: buttons` (hasta 3). En Messenger/Instagram los equivalentes son:

**a) Quick replies** — hasta **13** "chips" tocables sobre el teclado. Título máx. **20 caracteres**, payload máx. 1000. En Instagram solo tipo texto. Al tocarla, llega un evento `messages` normal con `message.quick_reply.payload` (y el título en `message.text`).

```json
{
  "recipient": { "id": "<PSID_O_IGSID>" },
  "messaging_type": "RESPONSE",
  "message": {
    "text": "¿Qué estilo buscas?",
    "quick_replies": [
      { "content_type": "text", "title": "Deportivas", "payload": "cat:deportivas" },
      { "content_type": "text", "title": "Casuales",   "payload": "cat:casuales" },
      { "content_type": "text", "title": "Urbanas",    "payload": "cat:urbanas" }
    ]
  }
}
```

**b) Generic template (carrusel)** — hasta **10 tarjetas** deslizables, cada una con imagen, título (80 car.), subtítulo (80 car.) y hasta **3 botones** (`postback` o `web_url`; en IG solo esos dos tipos). El toque de un botón `postback` llega por el webhook `messaging_postbacks` con su `payload`. Soportado en Messenger **y** en Instagram (en IG no se ve en la versión web, solo en la app móvil — irrelevante para clientes de celular).

```json
{
  "recipient": { "id": "<PSID_O_IGSID>" },
  "message": {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "generic",
        "elements": [
          {
            "title": "Referencia 305",
            "subtitle": "$310.000 · Envío a todo el país",
            "image_url": "https://varmancrew.pages.dev/img/ref305.jpg",
            "buttons": [
              { "type": "postback", "title": "Lo quiero 👟", "payload": "ref:305" },
              { "type": "web_url",  "title": "Ver en la tienda", "url": "https://varmancrew.pages.dev/producto/305" }
            ]
          }
        ]
      }
    }
  }
}
```

**c) Mapeo directo del flujo actual del bot:**

| Paso del bot (WhatsApp hoy) | WhatsApp | Messenger / Instagram (fase 2) |
|---|---|---|
| Lista de 3 categorías | `interactive list` (filas `cat:*`) | **Quick replies** (3 chips, payload `cat:*`) — mismo formato de payload, el parseo aguas abajo no cambia |
| Lista de modelos con precio | `interactive list` (10 filas `ref:*`, precio en descripción) | **Generic template carrusel** (hasta 10 tarjetas: foto del tenis + "Referencia X" + precio en subtítulo + botón postback `ref:*`). BONUS: en estos canales el cliente VE la foto del producto, cosa que la lista de WhatsApp no muestra |
| Confirmar talla / método de pago | `interactive buttons` (3) | **Quick replies** (chips "Nequi / Daviplata / Bre-B") |

Los IDs internos (`cat:deportivas`, `ref:305`) se conservan idénticos en los 3 canales → el cerebro del bot no distingue de dónde vino el toque.

---

## 4. Tokens

### 4.1 ¿Sirve el token actual? No.

El token del usuario de sistema que usa WhatsApp tiene solo `whatsapp_business_messaging` y `whatsapp_business_management`. Messenger/Instagram exigen un **Page Access Token** con los permisos de la sección 1. Son cosas distintas: el de WhatsApp autentica contra la WABA; el de página autentica contra la página de Facebook (y su Instagram vinculado).

### 4.2 Cómo obtener un Page Access Token permanente (sin programar)

Como ya existe un usuario de sistema en el Business Manager (el mismo del token de WhatsApp), el camino es:

1. **Business Manager → Configuración del negocio → Usuarios → Usuarios del sistema**: al usuario de sistema existente, **asignarle como activo la página de Facebook** de VarMan (con control total/administrar).
2. **Generar un token nuevo** para ese usuario de sistema marcando los permisos: `pages_messaging`, `pages_manage_metadata`, `pages_read_engagement`, `pages_show_list`, `business_management`, `instagram_basic`, `instagram_manage_messages`. (El token viejo de WhatsApp puede seguir existiendo aparte; no se rompe nada.)
3. Con ese token, pedir el token de página:
   ```bash
   curl "https://graph.facebook.com/v25.0/<PAGE_ID>?fields=access_token" \
     -H "Authorization: Bearer <TOKEN_USUARIO_SISTEMA>"
   ```
   Doc oficial: si el token de usuario es de larga duración (los de usuario de sistema lo son), **el Page Access Token resultante NO expira**. Igual que el de WhatsApp: se guarda una vez en el `.env` (`PAGE_TOKEN=...`) y listo.

Atajo alternativo para pruebas rápidas: en el panel de la app, producto Messenger → "Token Generation" genera un Page token al instante (útil el día 1, pero el definitivo debe ser el del usuario de sistema).

**Renovación:** ninguna en operación normal. Solo se regenera si se cambia la clave de la app, se revocan permisos o Meta invalida tokens por seguridad. (La Opción B de Instagram sí obligaría a refrescar token cada 60 días — otra razón para no usarla.)

---

## 5. Ventanas de tiempo, etiquetas y límites

### 5.1 La ventana de 24 horas (igual filosofía que WhatsApp, letra distinta)

- **Se abre** cuando el cliente: envía un mensaje a la página/cuenta IG, toca un botón o quick reply, toca un anuncio "click-to-Messenger", entra por link m.me / ig.me, responde una historia (IG) o reacciona a un mensaje.
- **Dentro de la ventana**: se puede enviar de todo, incluso contenido promocional.
- **Fuera de la ventana**: solo con etiquetas de mensaje u otras herramientas (ver 5.2). Un bot NO puede iniciar conversaciones en frío: en Instagram es imposible por diseño ("solo después de que el usuario escribe puede tu app responder; tienes 24 horas"), y en Messenger requeriría herramientas de pago (Sponsored Messages) o plantillas aparte.
- Para el modelo del bot VarMan (el cliente siempre escribe primero y el bot responde al momento) **la ventana de 24 h no estorba en nada**, igual que hoy en WhatsApp.

### 5.2 Etiquetas de mensaje — CAMBIÓ RECIENTEMENTE ⚠

- **Vigente:** `HUMAN_AGENT` — permite que un **humano** (no el bot) responda hasta **7 días** después del último mensaje del cliente, en Messenger e Instagram. Requiere aprobación específica: la referencia oficial dice que la función Human Agent "requiere completar App Review" y "solo está disponible con verificación del negocio". Para VarMan vale la pena pedirla en la misma sumisión: cubre el caso "cliente escribió de noche y Cristhian responde al otro día... o el fin de semana".
- **Eliminadas (27 de abril de 2026):** `ACCOUNT_UPDATE`, `POST_PURCHASE_UPDATE`, `CONFIRMED_EVENT_UPDATE` — desde esa fecha la API devuelve error (código 100) si se usan; Meta las reemplazó por "Utility Templates" / Marketing Messages API (mensajería de plantillas pagadas estilo WhatsApp). **Nota de honestidad:** la página oficial del changelog devolvió error 500 durante esta investigación; la fecha exacta está corroborada por múltiples fuentes secundarias que citan ese changelog (ManyChat, guías 2026). Verificar el changelog el día de la implementación.
- **Implicación para el diseño:** las notificaciones post-venta ("tu pedido salió") NO se podrán mandar por Messenger/IG pasadas 24 h sin plantillas pagadas. Solución simple: el bot pide el WhatsApp del cliente durante el pedido y las notificaciones de despacho salen por WhatsApp (canal que ya funciona), o el humano responde dentro de los 7 días con `HUMAN_AGENT`.

### 5.3 Modo desarrollo vs app publicada

- **En desarrollo:** los Page tokens solo permiten interactuar con cuentas que tengan **rol en la app** (administrador, desarrollador o tester). O sea: se puede probar el bot completo con las cuentas personales de Cristhian agregadas como testers, pero ningún cliente real recibirá respuesta.
- **Instagram:** hasta 25 testers en desarrollo; los testers necesitan rol en la app Y acceso a la cuenta IG. Además, la doc de webhooks de IG exige **app publicada** para recibir webhooks (los testers de IG se prueban tras publicar, con acceso estándar).
- **Publicada + acceso estándar:** funciona con cuentas propias/con rol; el público general requiere el escenario de la sección 1.4.
- **Publicada + acceso avanzado (tras App Review):** público general sin restricciones.

### 5.4 Límites de volumen (de sobra para VarMan)

- **Messenger:** `llamadas por 24 h = 200 × usuarios que interactuaron`. Con 10 clientes chateando son 2.000 llamadas/día.
- **Instagram Send API:** 100 llamadas/segundo por cuenta (texto); 10/s para audio/video. API de conversaciones: 2/s.
- Respuestas a quien escribe primero: **gratis e ilimitadas** en ambos canales (igual que WhatsApp).

---

## 6. Diseño n8n propuesto: un cerebro, tres canales

### 6.1 Diagrama

```
                 META (app VarMan Crew)
   ┌─────────────┬──────────────────┬─────────────────┐
   │ WhatsApp    │ Messenger        │ Instagram       │
   │ (objeto     │ (objeto "page")  │ (objeto         │
   │  whatsapp_  │                  │  "instagram")   │
   │  business_  │                  │                 │
   │  account)   │                  │                 │
   └──────┬──────┴────────┬─────────┴────────┬────────┘
          │               └────────┬─────────┘
          ▼                        ▼
  /webhook/whatsapp       /webhook/meta-social        ← n8n (2 rutas; la de
  (GET verif + POST)      (GET verif + POST, NUEVO)      WhatsApp NO se toca)
          │                        │
          ▼                        ▼
  [Parsear mensaje]       [Parsear MSN/IG]            ← NUEVO nodo Code:
   (nodo actual)           entry[].messaging[]           descarta is_echo,
          │                object → canal                lee text / quick_reply
          │                        │                     .payload / postback
          └────────┬───────────────┘
                   ▼
        ══ MENSAJE NORMALIZADO ══                     ← formato interno común:
        { canal: "wa"|"msn"|"ig",                       lo único que ve el cerebro
          user_id,            ← wa_id | PSID | IGSID
          texto,              ← texto libre
          inter_id,           ← "cat:*" / "ref:*" (de lista WA,
          message_id }           quick reply o postback)
                   │
                   ▼
        [Leer catálogo (Firestore)]                   ← nodo actual, sin cambios
                   │
                   ▼
        [Decidir respuesta (Gemini)]                  ← MISMO cerebro. Único cambio:
                   │                                     en vez de armar JSON de
                   ▼                                     WhatsApp, devuelve intención
        ══ RESPUESTA ABSTRACTA ══                        abstracta:
        { tipo: "texto"|"menu_categorias"|            { tipo, texto, opciones[],
          "carrusel_modelos"|"aviso_dueno", ... }       productos[] }
                   │
                   ▼
        [Despachador por canal]  (NUEVO nodo Code)
        ┌──────────┼──────────────┐
        ▼          ▼              ▼
   canal=wa    canal=msn      canal=ig
   lista/botones  quick replies + generic template
   interactivas   (payloads cat:*/ref:* idénticos)
        │          │              │
        ▼          ▼              ▼
  [HTTP → graph   [HTTP → graph.facebook.com          ← el envío a MSN e IG es el
   .facebook.com   /v25.0/<PAGE_ID>/messages             MISMO nodo (mismo endpoint
   /v25.0/<PHONE_  con Bearer PAGE_TOKEN]                y token); solo cambia el
   NUMBER_ID>/                                           recipient.id
   messages]
        │
        └── aviso al dueño (handoff): SIEMPRE por WhatsApp al 320,
            sin importar el canal del cliente (reusa el canal ya probado)
```

### 6.2 Claves del diseño

1. **Lo único nuevo son 4 nodos:** webhook GET+POST `meta-social`, "Parsear MSN/IG" y "Despachador por canal". El parseador de WhatsApp, Firestore y Gemini quedan intactos.
2. **Refactor mínimo del cerebro:** hoy "Decidir respuesta (Gemini)" arma directamente el JSON de WhatsApp. En fase 2 se separa en "decidir" (canal-agnóstico) + "formatear" (despachador). Los payloads internos `cat:*` y `ref:*` se conservan tal cual en los 3 canales, así que la lógica de selección no cambia ni una línea.
3. **Filtro anti-eco obligatorio:** en Messenger/IG, si `message.is_echo == true` → terminar sin responder (si no, el bot entra en bucle respondiéndose a sí mismo). En WhatsApp esto no existía; es el error #1 de los novatos en estos canales.
4. **Estado de conversación:** la clave pasa de `wa_id` a `canal + user_id` (el mismo humano tiene IDs distintos por canal y no hay forma soportada de unificarlos — son "scoped IDs" por diseño de privacidad).
5. **Sin nombre del cliente en MSN/IG:** el saludo no debe depender del nombre (en WhatsApp seguirá llegando; en los otros se saluda genérico). Evita pedir el permiso extra de User Profile API.
6. **Handoff:** la notificación a Cristhian sigue saliendo SIEMPRE por WhatsApp (nodo de envío actual), indicando el canal: "🔔 Cliente pide atención humana (Instagram): @usuario…". Para responderle al cliente, Cristhian usa la bandeja de la página/IG (Meta Business Suite) — el humano respondiendo manualmente desde la bandeja nativa no depende de la API ni de sus etiquetas.
7. **Variables de entorno nuevas en `.env`:** `PAGE_ID`, `PAGE_TOKEN` (el resto se reutiliza, incluido `WEBHOOK_VERIFY_TOKEN`).
8. **Testeable offline HOY:** el workflow fase 2 puede construirse y probarse con payloads simulados de `page`/`instagram` (como se hizo con WhatsApp) ANTES de que la app esté publicada. Solo el extremo real (webhook en vivo + envío) espera a la activación.

---

## 7. Plan de activación (el día que la app esté publicada)

**Prerequisitos** (ya encaminados, fase 1): ① app "VarMan Crew" PUBLICADA; ② verificación del negocio APROBADA (necesaria para ambas cosas); ③ bot de WhatsApp estable en producción — no conviene mezclar la activación de fase 2 con la semana del corte del 14 de julio.

| # | Paso | Dónde | Tiempo estimado |
|---|---|---|---|
| 0 | (Cualquier día antes) Construir y probar offline el workflow fase 2 (nodos nuevos, payloads simulados de `page` e `instagram`) | n8n local | 1-2 días de desarrollo, sin riesgo |
| 1 | **Agregar los casos de uso** de Messenger e Instagram a la app. ⚠ IRREVERSIBLE (no se pueden quitar): hacerlo solo con la app ya publicada, como quedó decidido | Panel de la app | 15 min |
| 2 | Producto Messenger: conectar la página de VarMan, y en Webhooks del objeto `page` poner Callback URL (`https://<tunel>/webhook/meta-social`) + verify token + suscribir `messages` y `messaging_postbacks` | Panel de la app | 30-60 min |
| 3 | Instagram: confirmar vínculo página↔IG; **activar "Permitir acceso a mensajes"** en la app de Instagram (Herramientas conectadas); suscribir webhooks del objeto `instagram` (`messages`, `messaging_postbacks`) | App de Instagram + panel | 30 min |
| 4 | Tokens: asignar la página al usuario de sistema → token nuevo con permisos de páginas+IG → derivar Page Access Token permanente → guardarlo en `.env` (`PAGE_ID`, `PAGE_TOKEN`) | Business Manager | 30-60 min |
| 5 | Agregar las cuentas personales (FB e IG de Cristhian) como **testers** de la app; activar el workflow fase 2 en n8n; probar de punta a punta por Messenger y por DM de IG con esas cuentas | Panel + n8n + celular | 1-2 h |
| 6 | **Prueba empírica de acceso** (sección 1.4): pedirle a alguien SIN rol en la app que escriba por Messenger. ¿Responde el bot? → Messenger listo sin review. ¿Error de permisos? → incluirlo en el paso 7 | Celular de un tercero | 15 min |
| 7 | **App Review — acceso avanzado**: solicitar `instagram_manage_messages` (+ `pages_messaging` si el paso 6 falló, + `business_management`, + función **Human Agent**). Preparar: descripción del caso de uso ("bot de atención y ventas de nuestra propia marca"), @handle de IG, y **screencast** mostrando: cliente escribe DM → bot responde catálogo → botones → handoff humano. Las capturas estáticas ya no son aceptadas; debe ser video del recorrido completo | Panel → App Review | Preparación: 2-4 h. **Espera de Meta: sin plazo oficial; típicamente días a 2-4 semanas.** Si rechazan (común a la primera por screencast incompleto), se corrige y se reenvía |
| 8 | Al aprobar: reprobar con cuentas sin rol en ambos canales; monitorear la primera semana (revisar ecos, postbacks y la ventana de 24 h en el log de n8n) | n8n | 1-2 h + monitoreo |

**Resumen de tiempos realista:** trabajo propio ≈ 2-3 días (casi todo adelantable offline). El camino crítico es **App Review de Instagram: presupuestar 2-4 semanas de calendario** desde la sumisión hasta operar con público general. Messenger podría quedar operativo el día 1 si la prueba del paso 6 confirma la exención para página propia.

**Riesgos y mitigaciones:**
- *Rechazo de App Review* → causa #1: el revisor no pudo probar el flujo. Mitigar: screencast completo y claro, instrucciones de prueba paso a paso, y el bot encendido (túnel + n8n arriba) durante TODA la ventana de revisión.
- *Túnel temporal de Cloudflare* → la Callback URL cambia en cada reinicio y hay que reconfigurarla en DOS productos (page + instagram) además de WhatsApp. Mitigar: montar el túnel fijo (o migrar a Oracle) ANTES de la activación de fase 2.
- *Docs de Meta en migración* → varias URLs viejas dan error 500 intermitente; si una fuente no abre, buscar el equivalente bajo `developers.facebook.com/documentation/business-messaging/…`.

---

## Fuentes (todas consultadas el 5 de julio de 2026)

**Oficiales de Meta (developers.facebook.com):**

1. Messenger Platform — Overview (permisos, acceso avanzado, App Review, verificación del negocio):
   https://developers.facebook.com/documentation/business-messaging/messenger-platform/overview
2. Messenger Platform — Get started (obtener Page token, endpoint de envío, curl):
   https://developers.facebook.com/documentation/business-messaging/messenger-platform/get-started
3. Messenger Platform — Webhooks (objeto `page`, campos, payload de ejemplo, verificación, regla de 5 s):
   https://developers.facebook.com/docs/messenger-platform/webhooks
4. Quick replies (13 máx., 20 caracteres, `message.quick_reply.payload`):
   https://developers.facebook.com/docs/messenger-platform/send-messages/quick-replies
5. Generic template (carrusel de 10, 3 botones, límites de caracteres):
   https://developers.facebook.com/docs/messenger-platform/send-messages/template/generic
6. Política de Messenger Platform e Instagram Messaging (ventana de 24 h, etiquetas, Human Agent 7 días):
   https://developers.facebook.com/documentation/business-messaging/messenger-platform/policy
7. Messenger Platform — App Review (restricción del modo desarrollo a cuentas con rol):
   https://developers.facebook.com/docs/messenger-platform/app-review/
8. Instagram Messaging — Get started (pasos, permisos, "Allow Access to Messages", Page token sin expiración):
   https://developers.facebook.com/documentation/business-messaging/instagram-messaging/get-started
9. Instagram Messaging — Send message (endpoint, IGSID, límite 1000 caracteres, 10 imágenes):
   https://developers.facebook.com/docs/messenger-platform/instagram/features/send-message
10. Instagram Messaging — Webhooks (objeto `instagram`, payload, `is_echo`, app publicada requerida):
    https://developers.facebook.com/docs/messenger-platform/instagram/features/webhook
11. Instagram Messaging — Quick replies (solo texto, 13 máx., no desktop):
    https://developers.facebook.com/docs/messenger-platform/instagram/features/quick-replies
12. Instagram Messaging — Generic template (soportado en IG, postback/web_url):
    https://developers.facebook.com/docs/messenger-platform/instagram/features/generic-template
13. Instagram Messaging — App Review "Apps For Your Own Business" (screencast, Automated/Live Agent):
    https://developers.facebook.com/docs/messenger-platform/instagram/app-review/apps-for-your-own-business/
14. Instagram API with Instagram Login — Messaging (Opción B: `graph.instagram.com`, `instagram_business_manage_messages`):
    https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/
15. Referencia de funciones — Human Agent (7 días; exige App Review y verificación del negocio):
    https://developers.facebook.com/docs/features-reference/human-agent
16. Rate limiting (Messenger 200×usuarios/24 h; IG Send API 100/s):
    https://developers.facebook.com/docs/graph-api/overview/rate-limiting
17. Usuarios de sistema — generar tokens (token permanente de usuario de sistema):
    https://developers.facebook.com/docs/business-management-apis/system-users/install-apps-and-generate-tokens/
18. App Review (proceso general):
    https://developers.facebook.com/docs/resp-plat-initiatives/appreview/
19. Messenger Platform — Changelog (deprecación de etiquetas; ⚠ la página devolvió error 500 durante esta investigación, fecha corroborada por fuentes secundarias):
    https://developers.facebook.com/documentation/business-messaging/messenger-platform/changelog

**Secundarias (usadas solo para corroborar o donde la doc oficial falló):**

20. ManyChat Help — mensajes fuera de las ventanas de 24 h/7 días en Messenger e IG (cita la deprecación del 27-abr-2026 y el reemplazo por Utility Templates / Marketing Messages):
    https://help.manychat.com/hc/en-us/articles/14281199732892
21. KeyAPI — política de la ventana de 24 h en Instagram (2026; HUMAN_AGENT como única etiqueta confiable en IG):
    https://www.keyapi.ai/blog/instagram-messaging-api-policy/
22. Chatwoot — guía práctica de App Review para Instagram (experiencia real del proceso y screencast):
    https://developers.chatwoot.com/self-hosted/instagram-app-review

**Notas de fiabilidad:** (a) la documentación de Meta está migrando de `…/docs/…` a `…/documentation/business-messaging/…` y varias páginas viejas dan error 500 intermitente; (b) existe la contradicción documental descrita en la sección 1.4 sobre App Review para páginas propias en Messenger — este plan la maneja con la prueba empírica del paso 6; (c) la fecha exacta de la deprecación de etiquetas (27-abr-2026) proviene del changelog oficial citado por fuentes secundarias, porque la página oficial no cargó durante la investigación: verificarla antes de implementar.
