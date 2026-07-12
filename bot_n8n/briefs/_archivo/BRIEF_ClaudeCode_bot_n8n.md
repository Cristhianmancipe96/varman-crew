# BRIEF PARA CLAUDE CODE — Bot de WhatsApp (n8n) · VarMan Crew

**Fecha:** 4 jul 2026
**Rol de Claude Code:** construir los workflows de n8n, docker-compose, configuración de servidor/Cloudflare Tunnel y todo lo que sea código/configuración.
**Estado:** las credenciales de Meta (WhatsApp Cloud API) ya están listas con el **número de prueba** (sin SIM). Se puede construir y testear el bot completo de punta a punta ahora mismo.

---

## 1. Objetivo

Bot de WhatsApp que atiende clientes de VarMan Crew (tienda online de zapatos): saluda, entiende lenguaje libre, muestra catálogo, arma el pedido, cobra y guarda la orden. Visión del dueño: "una tienda con bots que la maneje y que él solo supervise". Debe correr 24/7 y escalar a un humano cuando haga falta.

## 2. Arquitectura y decisiones (Plan v3, vigentes)

- **Canal:** WhatsApp Cloud API oficial de Meta.
- **Motor:** n8n autoalojado (Docker). Primero en el PC de Cristhian con **Cloudflare Tunnel** para HTTPS estable; luego se migra a **Oracle Cloud Free Tier** (A1.Flex preferida; E2.1.Micro 1GB como plan B viable, ya que se descartó Chatwoot).
- **Base de datos:** **Firestore** (mismo proyecto que la página y la app de inventario). El bot **lee** el catálogo y **escribe** los pedidos ahí, para que las órdenes aparezcan en la app de inventario. Google Sheets descartado.
- **IA híbrida:** **Gemini gratis** (1500 req/día) entiende lenguaje libre desde el primer mensaje. Para los pasos críticos (elegir producto/talla, método de pago) se usan **botones y listas interactivas** de WhatsApp, no texto libre — menos errores. Migrar a API paga de Gemini cuando sea rentable.
- **Pagos (Fase 1):** métodos **múltiples** — Nequi, Daviplata y Bre-B. El bot muestra las llaves/números, el cliente paga y envía comprobante; verificación manual por ahora.
- **Handoff (sin Chatwoot):** cuando el cliente pide humano o el bot se traba, el bot **notifica a Cristhian al +57 320 225 0619** y le dice al cliente "te escribirán desde el 320". Simple, sin herramientas extra.
- **Verificación de negocio de Meta: NO se necesita** para operar. Sin verificación el límite es 250 conversaciones iniciadas por el negocio / 24h (suficiente); responder a quien escribe primero es ilimitado y gratis.

## 3. Credenciales y accesos

Los valores secretos están en `Proyecto_zapatos\credenciales_bot_whatsapp_PRIVADO.txt`. **No hardcodear en el código ni subir a git/Netlify** — usar variables de entorno / credenciales de n8n.

| Dato | Valor | Uso |
|---|---|---|
| Número de prueba | +1 (555) 612-3421 | Solo envía a los ≤5 números verificados en Meta |
| `WHATSAPP_PHONE_NUMBER_ID` | `1222323670963330` | Va en la URL del endpoint de envío |
| `WHATSAPP_WABA_ID` | `2484088882063635` | Cuenta madre (plantillas, catálogo) |
| `WHATSAPP_TOKEN` | (ver archivo privado) | Token permanente, no expira. Permisos: `whatsapp_business_messaging`, `whatsapp_business_management` |

> **OJO al pasar a producción (EL CORTE ~14 jul):** al registrar el número real (SIM) el **Phone Number ID cambia**. El token del usuario del sistema sigue sirviendo. Solo hay que actualizar `WHATSAPP_PHONE_NUMBER_ID`.

**Pendiente que Cristhian debe entregar:**
- **API key de Gemini** — gratis en Google AI Studio (aistudio.google.com) → `GEMINI_API_KEY`.
- **Credenciales de servicio de Firebase/Firestore** (service account JSON) para que n8n lea/escriba — o reutilizar las que ya usa la app.
- Datos de pago reales: llaves/números de **Nequi, Daviplata, Bre-B**.

## 4. Endpoints clave

**Enviar mensaje (WhatsApp Cloud API):**
```
POST https://graph.facebook.com/v21.0/{WHATSAPP_PHONE_NUMBER_ID}/messages
Authorization: Bearer {WHATSAPP_TOKEN}
Content-Type: application/json
```
Soporta `text`, `interactive` (button / list), `template`.

**Webhook entrante (Meta → n8n):**
- Meta hace un `GET` de verificación una vez: responder `hub.challenge` si `hub.verify_token` coincide con un valor secreto que tú defines (`WEBHOOK_VERIFY_TOKEN`).
- Luego manda `POST` con cada mensaje del cliente. En n8n: nodo **Webhook** como trigger.
- La Callback URL será la del **Cloudflare Tunnel** (HTTPS). Suscribir el webhook al campo **messages** en la config de la app (Meta → WhatsApp → Configuration).

**Gemini (nivel gratis):**
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}
```

## 5. Estructura de datos en Firestore

- **Catálogo (lectura):** `tiendas/varman/catalogo` — misma fuente que la página. Inspeccionar el esquema real de cada documento (nombre, referencia, precio, tallas, stock, foto/URL). 80 referencias cargadas.
- **Pedidos (escritura):** crear en `tiendas/varman/pedidos` (confirmar nombre con la app de inventario para que las órdenes aparezcan). Campos sugeridos: `cliente` (nombre, teléfono), `items` (ref, talla, cantidad, precio), `total`, `metodo_pago`, `estado` (nuevo/pagado/enviado), `comprobante_url`, `timestamp`.

## 6. Flujo conversacional (Fase 1)

1. **Cliente escribe** (cualquier texto) → webhook dispara el workflow.
2. **Gemini interpreta** la intención (saludo / preguntar producto / precio / comprar / hablar con humano).
3. **Bot saluda** y ofrece ver catálogo (**lista interactiva** con categorías o productos leídos de Firestore).
4. Cliente **elige producto** → bot muestra tallas disponibles (**botones/lista**, desde stock en Firestore).
5. Cliente **elige talla y cantidad** → bot pide datos de envío (nombre, dirección, ciudad).
6. **Método de pago** (**botones**: Nequi / Daviplata / Bre-B) → bot muestra la llave/número correspondiente y el total.
7. Cliente **envía comprobante** (imagen) → bot guarda `comprobante_url`, marca pedido `pagado (por verificar)`.
8. **Guardar pedido** en Firestore + **notificar a Cristhian** al 320 con el resumen.
9. **Handoff:** si en cualquier punto el cliente pide humano o Gemini no entiende tras 2 intentos → notificar a Cristhian y avisar al cliente.

## 7. Nodos n8n sugeridos

- **Webhook** (trigger, verificación + recepción).
- **Function/Code** para parsear el payload de Meta (estructura anidada: `entry[].changes[].value.messages[]`).
- **HTTP Request** a Gemini (interpretar intención / generar respuesta natural).
- **Firestore** (leer catálogo, escribir pedido) — nodo Google Firebase o HTTP a la REST API con service account.
- **Switch** por tipo de mensaje/intención.
- **HTTP Request** a Graph API para responder (text / interactive / template).
- **Set/Merge** para mantener el estado de la conversación (considerar un store por `wa_id`: Firestore o Redis/variable estática de n8n).

## 8. Orden de construcción sugerido (checklist)

1. [ ] Docker + n8n corriendo local; Cloudflare Tunnel con HTTPS estable.
2. [ ] Webhook verificado con Meta (GET challenge) y suscrito a `messages`.
3. [ ] Eco básico: recibir mensaje → responder texto fijo (probar con número de prueba).
4. [ ] Leer catálogo de Firestore y mostrarlo como lista interactiva.
5. [ ] Integrar Gemini para intención + respuestas naturales.
6. [ ] Flujo de pedido completo con botones (producto → talla → envío → pago).
7. [ ] Guardar pedido en Firestore + notificar a Cristhian.
8. [ ] Handoff a humano.
9. [ ] Prueba punta a punta (EL CORTE ~14 jul) → migrar a Oracle + cambiar al número real (SIM).

## 9. Fase 2 (post-lanzamiento, NO bloquea el 14 jul)

- **Wompi** (link de pago + webhook de confirmación automática): acepta persona natural con RUT (gratis en DIAN) + Nequi de desembolso. Primer desembolso tarda ~30 días, por eso Nequi/Daviplata/Bre-B siguen de respaldo.
- **Catálogo nativo de WhatsApp** vía Commerce Manager conectado a la WABA (carruseles hasta 30 productos).

## 10. Decisiones abiertas para confirmar con Cristhian

- Nombre exacto de la colección de pedidos en Firestore (que cuadre con la app de inventario).
- Manejo de estado de conversación: ¿Firestore, Redis, o static data de n8n?
- Modelo Gemini exacto y prompt de sistema (personalidad del bot / tono VarMan Crew).

---
*Documento generado en Cowork como handoff. Los workflows, docker-compose y config de servidor los construye Claude Code.*
