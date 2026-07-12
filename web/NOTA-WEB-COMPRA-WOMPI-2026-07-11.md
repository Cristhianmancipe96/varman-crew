# NOTA — Compra en la web directo por Wompi · 2026-07-11

> Resultado del encargo `web/briefs/BRIEF-WEB-COMPRA-WOMPI.md`. **Todo probado en
> SANDBOX de punta a punta** (pago real de prueba aprobado y confirmado por el
> webhook del bot). Nada desplegado: los pasos de despliegue están abajo.

## Decisión del dueño (2026-07-11)

1. **Notificación de compras web: Opción A — el bot avisa por WhatsApp.**
   La web crea el pedido y el link de pago (función en Cloudflare Pages, donde ya
   vive la web); la confirmación la hace el **webhook del bot que ya existía**
   (`bot.varmancrew.com/webhook/wompi`), que pasa el pedido a `pago_confirmado` y
   avisa por WhatsApp al 320 y al cliente. **No se tocó ni una línea del bot.**
2. **Dama/Caballero: el cliente lo escoge en la web.** Cada referencia se marca
   (Dama/Caballero/Unisex) en la app → pestaña Tienda; la página muestra los
   filtros "Dama" y "Caballero". Sin marcar = sale en ambos.

## Qué cambió (aditivo y reversible)

| Pieza | Cambio |
|---|---|
| `web/publicar/index.html` | El botón de cada producto abre el modal con **selector de talla + cantidad**, formulario (nombre, WhatsApp, dirección) y botón **Comprar** que paga por Wompi. Filtros **Dama/Caballero**. Banner de gracias al volver del checkout. Todo detrás de la bandera `COMPRA_WOMPI`. |
| `web/publicar/_worker.js` | **NUEVO** — función de Cloudflare Pages: `POST /api/comprar` valida los datos, lee el **precio real** del catálogo (nunca el del navegador), crea el link de pago Wompi y el pedido en Firestore (`pago_pendiente`, `canal: 'web'`). Compatible con el deploy de arrastrar la carpeta. |
| `app/app.jsx` | Estados Wompi mapeados en Pedidos (`pago_pendiente` = "Pendiente de pago", `pago_confirmado` = "Pago confirmado" y **cuenta en el badge** de pedidos por atender). Detalle muestra "🌐 Compra hecha en la página web". Editor de la Tienda con campos **Género** y **Tallas en la web**. |
| `bot_n8n/briefs/CAMBIOS-PEDIDOS.md` | Sección nueva documentando el pedido `canal: 'web'` (esquema congelado respetado). |
| `web/pruebas-wompi/` | **NUEVO** — arnés local para repetir la prueba sandbox sin desplegar (no se sube a Cloudflare). |
| Bot / credenciales | **Sin cambios** (cero). |

## Prueba E2E en sandbox (hecha el 2026-07-11) ✅

1. Web local → Ref 45, talla 41 → formulario → `/api/comprar` creó el pedido
   `pago_pendiente` + link de pago → checkout sandbox de Wompi.
2. Pago con la tarjeta de prueba 4242… → **"¡Pago aprobado!"** (transacción
   `12133207-1783805700-70744`).
3. **El webhook real del bot confirmó solo**: el pedido pasó a `pago_confirmado`
   con `wompi_transaction_id` — o sea que la URL de eventos de sandbox YA apunta
   al bot y el secreto de la VM es correcto. Según el flujo del bot, salieron los
   avisos de WhatsApp (revisa tu 320: debe estar el aviso de la prueba).
4. El pedido de prueba quedó en Firestore como **"PRUEBA SANDBOX — no
   despachar"** (`uLoMTZwRdhbNwhQPPoal`): ábrelo en la app para verlo con su
   badge y luego ocúltalo (socios) o bórralo de la consola de Firebase.

## Qué desplegar (cuando quieras encender esto)

1. **La app** (ya estaba pendiente re-subirla): dash.cloudflare.com → Workers &
   Pages → `varmanapp` → Create deployment → arrastrar la carpeta `app\` completa.
2. **La web**: antes de subir, poner las variables en Cloudflare:
   dash.cloudflare.com → Workers & Pages → `varmancrew` → **Settings →
   Environment variables** (Production):
   - `WOMPI_PRV_KEY` = la llave privada (para probar: la `prv_test_…`; para
     cobrar de verdad: la `prv_prod_…` del panel Wompi)
   - `WOMPI_ENV` = `test` (o `prod` cuando pases a producción)
   - `FIREBASE_SA_B64` = el mismo valor que tiene el `.env` de la VM del bot
   Luego: `varmancrew` → Create deployment → arrastrar `web\publicar` (ahora
   incluye `_worker.js`). ⚠ Sin las variables, el botón Comprar dirá "no pudimos
   crear el pago" — la página normal sigue funcionando igual.
3. **Webhook**: no hay nada nuevo que registrar 🎉 — se usa el del bot
   (`https://bot.varmancrew.com/webhook/wompi`), que en sandbox ya está activo y
   funcionando. Cuando pases Wompi a producción, registra esa MISMA URL como URL
   de eventos de producción en el panel Wompi (paso que ya estaba en tu lista).
4. **Marcar el catálogo** (opcional pero recomendado): en la app → Tienda, a cada
   referencia ponle Género (para los filtros) y Tallas (si no, la web ofrece 36–45).

## ⚠ Hallazgo importante — llaves Wompi del `.env` LOCAL del bot

En `bot_n8n/.env` (el archivo local, NO la VM) las tres llaves Wompi quedaron con
el **prefijo pegado dos veces** (`pub_test_pub_test_…`, `prv_test_prv_test_…`,
`test_events_test_events_…`). Con esas llaves Wompi responde 401. Los valores
correctos están en `bot_n8n/credenciales/llave privada y publica wompi.txt`.
La VM está bien (el webhook validó la firma en la prueba). Corrígelo cuando
puedas para que las pruebas locales del bot no fallen. *(No lo toqué: el brief
prohíbe modificar credenciales.)*

## Rollback (volver al botón de WhatsApp en 1 minuto)

1. En `web/publicar/index.html` busca `var COMPRA_WOMPI = true;` y cámbialo a
   `false` → re-subir la web. Los botones vuelven a "Pedir por WhatsApp"
   exactamente como antes (el código viejo quedó intacto detrás de la bandera).
2. (Opcional, más drástico) borrar `_worker.js` de la carpeta antes de subir:
   la web queda 100 % estática como hoy.
3. La app no necesita rollback: los campos/estados nuevos son aditivos.

## Verificación rápida después de desplegar

- La web carga y las tarjetas muestran el botón de bolsa 🛍 (no el de WhatsApp).
- Comprar → elegir talla → formulario → checkout de Wompi con el monto correcto.
- Pagar (en `test`, tarjeta 4242 4242 4242 4242) → en 1-2 min el pedido aparece
  en la app como **"Pago confirmado"** con "🌐 Compra hecha en la página web" y
  te llega el WhatsApp al 320.

---

# RONDA 2 (2026-07-11, misma noche) — ajustes tras el primer despliegue

## ⚠ Por qué salía "No pudimos crear el pago" en varmancrew.com

La web ya desplegada responde `503 pago en línea no configurado`: **faltan las
variables de entorno en Cloudflare**. El código está bien; solo falta:

1. dash.cloudflare.com → Workers & Pages → **varmancrew** → Settings →
   **Environment variables** (Production) → agregar las 3 del paso "Qué
   desplegar" de arriba (`WOMPI_PRV_KEY`, `WOMPI_ENV`, `FIREBASE_SA_B64`).
2. **Volver a hacer un deployment** (arrastrar `web\publicar` otra vez) — en
   Pages las variables solo aplican a partir del siguiente deploy.
3. Probar una compra: con `WOMPI_ENV=test` y la llave `prv_test_…` el pago es
   de mentiras (tarjeta 4242…); cuando funcione, cambiar a `prv_prod_…` +
   `WOMPI_ENV=prod` y re-desplegar.

## Qué más cambió en esta ronda (pedidos del dueño)

- **Tallas desde 35** (35–45 por defecto) y **selector CO / EU / US** en el
  modal: el número de la talla cambia de sistema y al elegir muestra la
  equivalencia ("CO 41 · EU 43 · US 10 aprox."). Siempre se vende la talla
  colombiana (es la que llega al pedido).
- **Prefijo del celular elegible** (+57 por defecto, +1, +34, +52, etc.). El
  pedido guarda el número completo solo dígitos; Colombia se sigue validando
  estricto (3XX…).
- **Tema por género:** al elegir Dama la página se tiñe rosa cálido; Caballero,
  azul urbano; todo vuelve al naranja al des-seleccionar (variables OKLCH, misma
  frescura). Aplica desde los filtros del catálogo y el menú.
- **Menú hamburguesa:** bajo "Catálogo" ahora están "→ Dama" y "→ Caballero"
  (filtran y tiñen).
- **Sección "¿Cómo comprar?" oculta** (era el flujo viejo por WhatsApp). Con el
  rollback (`COMPRA_WOMPI=false`) reaparece sola.
- **Fixes de revisión:** no se puede disparar el pago dos veces (Enter+clic),
  el doble clic en "Comprar" ya no regaña por el nombre vacío, y las flechas
  del teclado dentro del formulario ya no mueven la galería de fotos.

Para que todo esto se vea: **re-subir `web\publicar`** (y la app si aún no).

---

# RONDA 3 (2026-07-11) — diseño: color por tarjeta, selector nuevo, tallas dama, marquesina

- **El color por género ya NO tiñe toda la página**: cada TARJETA lleva su acento
  con profundidad (etiqueta con degradado sobre la foto + halo al pasar):
  Dama rosa vivo · Caballero azul eléctrico · Unisex/sin marcar verde menta.
  El acento entra también al modal (categoría y talla elegida).
- **Selector de sección nuevo**: dos placas grandes "DAMA / Para ella" y
  "CABALLERO / Para él" encima del catálogo (se llenan con su degradado al
  elegirlas; tocarlas de nuevo las apaga). Reemplaza los dos botones planos.
- **Tallas de dama corregidas**: dama usa EU = CO + 1 (EU 35 = CO 34) con su
  tabla US de mujer y rango por defecto CO 34–41 (EU 35–42); hombre/unisex
  queda igual (EU = CO + 2, CO 35–45). Vale en la web y en la validación del
  worker. En la app, el campo "Tallas en la web" se escribe SIEMPRE en talla
  colombiana.
- **Marquesina restyle**: se acabó la franja naranja sólida — ahora es texto
  Bebas grande delineado (hueco) sobre fondo oscuro con puntos naranjas y un
  ítem de cada tres relleno. Mismo movimiento, mucho más crew.
- Contraste verificado (WCAG AA) en chips, placas activas y talla seleccionada.

Para verla: **re-subir `web\publicar`** (no cambia nada del pago ni de la app).

*Cierre: compra directa por Wompi en la web probada E2E en sandbox; pedido con
esquema congelado; alerta por el bot sin tocar el bot; reversible con una
bandera; el dueño pone llaves de producción y despliega. — Agente WEB-COMPRA-WOMPI, 2026-07-11.*
