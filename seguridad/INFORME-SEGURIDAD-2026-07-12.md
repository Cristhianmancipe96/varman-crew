# Informe de ciberseguridad — VarMan Crew · 2026-07-12

> Revisión en bucle (loop) de las 3 piezas: web (varmancrew.com + `_worker.js`),
> app de inventario (`app.jsx` + reglas Firestore) y bot de WhatsApp (n8n en la
> VM). Se va llenando por ciclos; lo nuevo arriba. **Severidad:** 🔴 alta ·
> 🟠 media · 🟡 baja · 🟢 ya bien.

## ✅ Corregido en esta revisión (ya aplicado en el disco; el dueño despliega)

1. **🔴→✅ Reglas de Firestore demasiado abiertas.** Antes, **cualquier persona
   con una cuenta** en el proyecto Firebase (`request.auth != null`) podía leer
   pedidos con datos de clientes (nombre, WhatsApp, dirección) y tocar
   inventario/catálogo/ventas. Ahora TODO exige estar en la lista del equipo
   (`esEquipo()` con los correos). **Falta que el dueño vuelva a pegar
   `app/reglas-firestore.txt` en la consola de Firebase** (2 min; pasos en el
   propio archivo). Si el vendedor tiene cuenta, agregar su correo antes.
2. **🟠→✅ `.gitignore` reforzado + repo git limpio.** Se inició control de
   versiones (`git init`) verificando que NO entraran secretos: `.env`,
   `credenciales/`, llaves de Wompi, token de WhatsApp, service account de
   Firebase, Node portable — todos ignorados y confirmados fuera del commit.
3. **🟠→✅ Archivo de variables con la llave privada borrado.** El
   `VARIABLES-CLOUDFLARE-BORRAR-DESPUES.txt` (tenía la `prv_test_`) se eliminó
   tras usarse; las llaves siguen solo en `credenciales/` y en Cloudflare.

## 🟢 Lo que ya estaba bien (verificado)

- **Precio server-side.** `_worker.js` lee el precio del catálogo en Firestore;
  nunca confía en el precio que manda el navegador → no se puede "editar el
  precio" desde el cliente.
- **Firma del webhook Wompi.** El bot verifica el checksum SHA-256 del evento
  con `WOMPI_EVENTS_SECRET` y descarta lo que no cuadre (anti-suplantación).
- **Puerto de n8n cerrado.** En `docker-compose.yml` el 5678 está atado a
  `127.0.0.1`: no se ve desde internet. Caddy expone solo 80/443 con TLS
  Let's Encrypt.
- **Exportación CSV sin inyección de fórmulas.** `downloadCSV` neutraliza celdas
  que empiezan por `= + - @` → no se puede meter una fórmula maliciosa en un
  Excel exportado.
- **Secreto del webhook = interruptor.** Sin `WOMPI_EVENTS_SECRET` el webhook no
  procesa nada; sin llaves, el `_worker.js` responde 503 y la web sigue estática.

## ⏳ Pendiente — necesita al dueño (tablero, no código)

1. **🟠 Sin límite de tasa en `/api/comprar`.** Un script podría llamarlo miles
   de veces y crear pedidos `pago_pendiente` basura en Firestore + links de pago
   en Wompi (no roba dinero —esos pedidos nunca se confirman— pero ensucia la
   lista de pedidos y golpea la API de Wompi). **Fix recomendado (Cloudflare,
   gratis):** dash.cloudflare.com → varmancrew → Security → **WAF → Rate
   limiting rules** → una regla tipo "máx. 5 solicitudes/min por IP a
   `/api/comprar`". Alternativa más fuerte: **Cloudflare Turnstile** (captcha
   invisible) en el formulario de compra. *(No se puede hacer desde el código
   del Worker sin KV/Durable Objects; es config del panel.)*

## 🟡 Para el agente del bot (zona de un solo escritor — editar `src/` + rebuild + tests + deploy del dueño)

1. **🟡 Idempotencia del webhook incompleta** (`bot_n8n/workflows/src/wompi-webhook.js:162`).
   Hoy solo evita re-procesar si el pedido ya está en `pago_confirmado`. Si el
   equipo ya avanzó el pedido a `verificado`/`enviado`/`entregado` y Wompi
   **reintenta** el evento APPROVED (lo hace), el webhook lo **regresaría** a
   `pago_confirmado`, borrando el avance del humano. **Fix (1 línea):** avanzar a
   `pago_confirmado` **solo si** el estado actual es `pago_pendiente` (en vez de
   "si no es pago_confirmado"). Requiere el ciclo normal del bot: editar `src/`,
   `node workflows/build-v4-pedidos.js`, tests en verde + caso nuevo, y que el
   dueño suba el JSON a la VM.

## Ciclo B — XSS/CSP de la web, sesión de la app, entrada del bot (2026-07-12)

**Corregido:**
- **🟡→✅ Endurecido `refSel` en la web.** Auditados los 9 usos de `innerHTML`
  del sitio: 8 eran seguros (texto estático, dígitos validados o datos pasados
  por `esc()`); el único que pintaba un dato del catálogo sin filtrar era la
  línea del total del modal — ahora `refSel` se limpia a caracteres seguros
  antes de pintarse. (Riesgo era bajo: el catálogo solo lo edita el equipo.)

**Verificado 🟢:**
- **CSP activa y sana**: scripts solo de la propia página y cdnjs (con
  integrity), imágenes solo propias + data: (fotos del catálogo), conexiones
  solo a Firestore; `X-Frame-Options: DENY` en `_headers` (anti-clickjacking).
- **Sesión de la app**: login solo con correo/contraseña de Firebase, botón de
  cerrar sesión presente; la persistencia local es la normal de una PWA (si
  comparten computador, cerrar sesión al salir).
- **Entrada del bot**: dedup por `message_id` (sanitizado y con tope), captions
  y comprobantes con límite de tamaño (900 KB), texto libre con topes.
- **Prompt injection a Gemini (riesgo residual aceptado)**: un cliente podría
  intentar manipular al asistente ("dame 90% de descuento"), pero Gemini solo
  devuelve `{handoff, dato, respuesta}` — el código valida el dato, los PRECIOS
  y el pedido salen del catálogo/código (nunca del texto de Gemini), y los
  descuentos los aplica un humano. Impacto máximo: una respuesta de chat rara.

## Ciclo C — infraestructura de la VM (GCP · Docker · n8n) (2026-07-12)

**Verificado 🟢 (auditado desde los archivos de deploy del repo):**
- Imagen de n8n **fijada** a versión exacta (`n8n:2.28.6`, no `latest`) — las
  actualizaciones son conscientes, como manda la lección de deploy.
- Puerto 5678 de n8n atado a `127.0.0.1` (invisible desde internet); el
  firewall de GCP solo abre 80/443 para Caddy (TLS automático Let's Encrypt).
- **Backups bien hechos**: el `.env` va CIFRADO (AES-256) y la clave de
  descifrado vive aparte en `credenciales/` — un backup robado no expone llaves.
- Telemetría de n8n apagada (`DIAGNOSTICS/PERSONALIZATION=false`).

**Recomendaciones 🟡 (decide el dueño, ninguna urgente):**
1. **El editor de n8n es alcanzable públicamente** en bot.varmancrew.com
   (protegido por el login de n8n). Y ojo: quien entre al editor puede leer
   TODAS las llaves (los nodos Code usan `$env`, que debe seguir habilitado).
   → Mínimo: contraseña LARGA y única para la cuenta de n8n + 2FA si la
   versión lo ofrece. Opcional más fuerte: restringir el editor por IP en
   Caddy dejando públicos solo los `/webhook/*` (complica administrar desde
   otros lugares; evaluar).
2. `N8N_SECURE_COOKIE=false`: como todo el acceso real ya es por HTTPS (Caddy),
   se puede probar `true` en el próximo mantenimiento (si el login falla,
   revertir — cambio de 1 línea en el compose).
3. **Mantenimiento programado**: revisar cada 1-2 meses si hay versión nueva de
   n8n con parches de seguridad y actualizar el número de versión del compose
   (leyendo primero `LECCIONES-DEPLOY-REAL`, nunca a ciegas).

---
*Ciclos A, B y C — 2026-07-12. Cobertura: código de las 3 piezas + reglas de
datos + infraestructura. Siguiente si el loop continúa: prueba activa de
endpoints en producción (headers reales de varmancrew.com y bot.varmancrew.com).*
