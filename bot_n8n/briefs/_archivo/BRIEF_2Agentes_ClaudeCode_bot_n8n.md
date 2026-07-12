# BRIEF PARA CLAUDE CODE — Bot WhatsApp (n8n) · VarMan Crew

## Construcción en paralelo con DOS agentes

**Fecha:** 5 jul 2026 · **Corte de lanzamiento:** ~14 jul 2026
**Base:** este documento complementa `BRIEF_ClaudeCode_bot_n8n.md` (plan completo). Léelo primero: arquitectura, decisiones v3, endpoints y esquema de Firestore siguen vigentes.

**Estado real de la carpeta hoy (verificado):**
- `workflows/bot-whatsapp-eco.json` ya funciona: webhook verificado (GET challenge) + recepción (POST) + eco de texto. Nodos: *Webhook verificación (GET) → Verificar token → Responder a Meta*, y *Webhook mensajes (POST) → Extraer mensajes → Enviar eco*.
- `.env` con todas las variables (WhatsApp, Gemini, Firebase SA, owner handoff). n8n 2.28.6 local con 2 parches manuales (zod, @langchain/core) — **NO actualizar n8n en este PC**.
- Credenciales listas en `credenciales/` (token Meta permanente, service account Firebase JSON).
- Túnel Cloudflare temporal activo (la URL cambia en cada reinicio).

Es decir: los pasos 1–3 del checklist original están hechos. El trabajo restante (pasos 4–9) es lo que se reparte entre los dos agentes.

---

## Por qué dos agentes y cómo se reparte

El cuello de botella es que todo vive en un solo workflow gigante de n8n, y dos manos editando el mismo JSON se pisan. La solución es **partir el bot por capas con un contrato claro entre ellas**, de modo que cada agente trabaje en archivos distintos y se integren al final por un único punto.

- **Agente A — "Datos & IA" (backend / servicios):** todo lo que toca Firestore, Gemini, estado de conversación e infraestructura. Expone **sub-workflows reutilizables** con entrada/salida JSON fija.
- **Agente B — "Conversación & WhatsApp" (orquestador):** parseo del payload de Meta, máquina de estados del pedido, mensajes interactivos (listas/botones), envío por Graph API y handoff. **Consume** los sub-workflows de A vía nodos *Execute Workflow*; nunca habla con Firestore ni Gemini directamente.

Ventaja: pueden avanzar simultáneamente. B empieza con "mocks" (respuestas fijas) mientras A construye los servicios reales; al conectar los *Execute Workflow* el bot queda armado.

---

## EL CONTRATO (interfaz entre A y B) — acordar ANTES de codear

Cuatro sub-workflows que A construye y B invoca. Si esto se respeta, no hay conflictos. Todos reciben y devuelven un solo objeto JSON.

### 1. `svc_catalogo` — leer catálogo
- **Entrada:** `{ categoria?: string, referencia?: string }` (vacío = todo)
- **Salida:** `{ productos: [ { referencia, nombre, precio, tallas:[{talla, stock}], foto_url } ] }`
- Fuente: `tiendas/varman/catalogo` (80 refs). Filtra stock>0.

### 2. `svc_guardar_pedido` — escribir pedido
- **Entrada:** `{ cliente:{nombre,telefono,direccion,ciudad}, items:[{referencia,talla,cantidad,precio}], total, metodo_pago, comprobante_url? }`
- **Salida:** `{ pedido_id, estado }`
- Destino: `tiendas/varman/pedidos` (confirmar nombre exacto con la app de inventario). Escribe `estado:"nuevo"` o `"pagado_por_verificar"`, `timestamp`.

### 3. `svc_estado` — memoria de la conversación por cliente
- **Entrada:** `{ wa_id, accion:"get"|"set", data? }`
- **Salida:** `{ estado }` (ej. `{ paso:"eligiendo_talla", carrito:[...], datos_envio:{...} }`)
- Implementación: Firestore `tiendas/varman/conversaciones/{wa_id}` (decisión abierta: Firestore vs Redis vs static data de n8n — arrancar con Firestore).

### 4. `svc_intencion` — Gemini interpreta y redacta
- **Entrada:** `{ mensaje, contexto? }`
- **Salida:** `{ intencion:"saludo|ver_catalogo|preguntar_precio|comprar|hablar_humano|otro", respuesta_natural, entidades:{producto?,talla?} }`
- Modelo `gemini-1.5-flash` (gratis). Prompt de sistema con tono VarMan Crew (confirmar con Cristhian).

> **Regla de oro:** el formato de estos 4 objetos se congela al inicio. Si algo debe cambiar, se cambia en el contrato primero y se avisa al otro agente; no se improvisa dentro de un sub-workflow.

---

## AGENTE A — Datos & IA (backend / infra)

**Misión:** entregar los 4 sub-workflows del contrato, funcionando y probados aislados, más dejar la base lista para producción.

**Tareas**
1. `svc_catalogo`: nodo Firestore (o HTTP a REST API con service account) que lee `tiendas/varman/catalogo`. Inspeccionar primero el esquema real de un documento; normalizar la salida al contrato.
2. `svc_guardar_pedido`: escribe en `tiendas/varman/pedidos`. Confirmar el nombre de colección con la app de inventario para que las órdenes aparezcan ahí.
3. `svc_estado`: get/set del estado por `wa_id` en Firestore.
4. `svc_intencion`: HTTP Request a Gemini con prompt de sistema; parsear la respuesta a JSON estable (manejar cuando Gemini no devuelve intención clara → `otro`).
5. **Autenticación Firebase:** cargar el service account (`FIREBASE_SA_JSON`) como credencial de n8n, sin hardcodear.
6. **Infra hacia producción (no bloquea a B):** dejar túnel Cloudflare **fijo/nombrado** (no el temporal que cambia de URL), preparar `docker-compose` con `env_file=.env` para la futura migración a Oracle Cloud Free Tier (A1.Flex; E2.1.Micro 1GB como plan B).

**Entregables:** 4 archivos `workflows/svc_*.json` exportados + una nota corta de cómo probar cada uno con datos de ejemplo. `docker-compose.yml` borrador.

**No toca:** el flujo conversacional ni el envío por WhatsApp (eso es de B).

---

## AGENTE B — Conversación & WhatsApp (orquestador)

**Misión:** el flujo de punta a punta que ve el cliente, consumiendo los servicios de A.

**Tareas**
1. **Parseo robusto** del payload de Meta (`entry[].changes[].value.messages[]`): distinguir texto, respuesta de botón/lista, imagen (comprobante). Reusar/mejorar el nodo "Extraer mensajes" del eco actual.
2. **Router principal** (Switch) por `intencion` (de `svc_intencion`) y por `paso` (de `svc_estado`) → **máquina de estados del pedido**:
   saludo → ver catálogo (lista interactiva) → elegir producto → mostrar tallas (botones) → cantidad → datos de envío → método de pago (botones: Nequi/Daviplata/Bre-B) → mostrar llave + total → recibir comprobante → guardar (`svc_guardar_pedido`) → notificar a Cristhian.
3. **Constructor de mensajes interactivos** de WhatsApp (`interactive` list/button) a partir del catálogo — pasos críticos (producto, talla, pago) con botones, no texto libre.
4. **Envío** vía `POST graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages` (text / interactive / template).
5. **Handoff:** si el cliente pide humano o Gemini falla 2 veces → notificar a Cristhian al **+57 320 225 0619** y avisar al cliente "te escribirán desde el 320".
6. Manejar el **comprobante** (imagen entrante): obtener la URL del media y pasarla a `svc_guardar_pedido` como `comprobante_url`.

**Mientras A no termina:** B trabaja con *mocks* — un catálogo fijo de 2–3 productos y respuestas de intención simuladas — para no bloquearse. Al final reemplaza los mocks por nodos *Execute Workflow* → `svc_*`.

**Entregables:** `workflows/bot-conversacion.json` (flujo principal) + `workflows/lib-mensajes-wa.json` si conviene separar el constructor de mensajes.

**No toca:** la lógica interna de Firestore/Gemini (llama a los servicios de A por su contrato).

---

## Reglas de coordinación (evitan que se pisen)

1. **Un archivo por dueño.** A edita `svc_*` y `docker-compose`; B edita `bot-conversacion` / `lib-*`. Nadie edita el archivo del otro.
2. **El eco actual no se borra** hasta que el flujo nuevo pase la prueba punta a punta; sirve de referencia y fallback.
3. **Contrato congelado.** Cambios al contrato se anuncian y se versionan antes de tocar código.
4. **Git / ramas:** si se usa git, `feat/svc-datos-ia` (A) y `feat/conversacion-wa` (B); merge al final. Nunca subir `.env` ni `credenciales/` (ya en `.gitignore`).
5. **Variables por entorno**, jamás secretos en el JSON del workflow.
6. **Punto de integración único:** una sola sesión donde B cambia sus mocks por los `Execute Workflow` de A y se corre la prueba completa con el número de prueba de Meta.

## Orden sugerido (paralelo)

| Día | Agente A | Agente B |
|---|---|---|
| 1 | Congelar contrato · `svc_catalogo` + auth Firebase | Parseo Meta + router con mocks |
| 2 | `svc_estado` · `svc_intencion` (Gemini) | Máquina de estados + mensajes interactivos |
| 3 | `svc_guardar_pedido` · túnel fijo + docker-compose | Envío WhatsApp + pago + comprobante + handoff |
| 4 | Apoyo a integración | **Integración** (mocks→Execute Workflow) + prueba E2E |
| ~14 jul | Migrar a Oracle + número real (SIM): solo cambia `WHATSAPP_PHONE_NUMBER_ID` | — |

## Pendientes de Cristhian (desbloquean a A)
- `GEMINI_API_KEY` (Google AI Studio, gratis) y modelo/tono del bot.
- Nombre exacto de la colección de **pedidos** en Firestore (que cuadre con la app de inventario).
- Datos de pago reales: llaves/números de **Nequi, Daviplata, Bre-B**.
- Decisión de estado de conversación (arrancamos con Firestore salvo que prefieras otra).

---
*Handoff generado en Cowork. La construcción de workflows, docker-compose y config de servidor la hace Claude Code, ahora repartida en dos agentes que corren en paralelo.*
