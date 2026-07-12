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

---
*Ciclo A (bot + app + worker) — 2026-07-12. Próximos ciclos: XSS/CSP en el
render del catálogo web, manejo de sesión en la app, y validación de entrada en
`cerebro-v4.js`.*
