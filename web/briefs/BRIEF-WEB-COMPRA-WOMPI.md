# BRIEF — Comprar en la WEB por Wompi + talla en la web + Dama/Caballero en la app · VarMan Crew · 2026-07-11

> **Para Claude Code.** UN agente. **Territorio:** la web (`web/publicar/index.html` + su script,
> y quizá una función serverless) y la app (`app/app.jsx`). **UN SOLO ESCRITOR en web/app:** no
> correr a la vez que el agente de seguridad ni otro que toque estos archivos. Lee primero:
> `ESTADO-VARMAN.md`, `LEEME.txt`, `bot_n8n/briefs/CAMBIOS-PEDIDOS.md` (contrato del pedido,
> **congelado**), `bot_n8n/fase2/WOMPI-INTEGRACION.md` y `bot_n8n/workflows/src/wompi-webhook.js`
> (Wompi YA está integrado en el bot; **reúsalo**), `app/reglas-firestore.txt`.
>
> **Modo:** *preparar y probar; el dueño despliega.* Aditivo + reversible. NO desplegar.

## ⚠️ PRIMERO: PREGÚNTALE AL DUEÑO (antes de construir)
**Antes de escribir código, dale DOS ideas concretas** para **notificar/registrar la compra hecha
en la web** (con pros y contras, en lenguaje simple) y **espera su elección**. Ejemplos:
- **Opción A — Reusar el bot (n8n):** el webhook de Wompi pega al endpoint que ya existe
  (`https://bot.varmancrew.com/webhook/wompi`) → escribe el pedido en Firestore **y avisa al
  WhatsApp del dueño (320)**, igual que un pedido del bot. *Pro:* reutiliza todo. *Contra:* la web
  depende de la VM del bot.
- **Opción B — Web independiente (función serverless):** una función de Cloudflare/Netlify recibe
  el webhook de Wompi → escribe el pedido en Firestore → **alerta dentro de la app**. *Pro:* web
  independiente del bot. *Contra:* hay que crear/mantener la función.

Anota la decisión en la nota final. **No avances sin su elección.**

## Objetivo
1. **La compra pasa en la web, por Wompi.** El botón de WhatsApp de cada producto pasa a
   **"Comprar"** y hace el pago por **Wompi en la misma página**. El cliente **no vuelve al bot**.
2. **Talla en la web:** cada producto muestra un **selector de talla** (y cantidad) que el cliente
   escoge **antes de pagar**.
3. **Al aprobarse el pago → se crea el pedido en Firestore** con el esquema congelado → **la app
   da la misma alerta** para alistarlo (igual que hoy con los pedidos del bot).
4. **App con secciones Dama y Caballero:** en el catálogo de la app (`app/app.jsx`), agrega la
   división por género (**Dama / Caballero**, y unisex si aplica), para navegar el catálogo por
   sección. Esto puede requerir un campo **`genero`** por producto (es dato de la app, no del
   contrato del pedido) — agrégalo y deja cómo llenarlo desde la app.

## Cómo (checkout Wompi en la web)
- Usa el **Widget/Checkout Web de Wompi** con la **LLAVE PÚBLICA** en el frontend (pública por
  diseño). `amount_in_cents` (precio×cantidad×100), moneda `COP`, **referencia única** por pedido,
  URL de retorno. La talla/cantidad elegidas viajan en la referencia/metadata del pago.
- **Llaves: reusa las que YA tiene el bot para Wompi** (no crees nuevas, no cambies a producción).
  La **pública** va al frontend; la **privada y el events secret** quedan **server-side** (como en
  el bot) — **NUNCA** en la web. 🔒 No expongas secretos en el código ni en git.
- **Confirmación del pago = server-side** por el **webhook de Wompi** (validando la firma; reúsa
  `wompi-webhook.js`). **Nunca** marques "pagado" solo por el redirect del navegador (es dinero).

## Registrar el pedido (para que la app lo vea igual)
Al **confirmar el pago**, crear el doc en `tiendas/varman/pedidos` con el **esquema congelado**
(`CAMBIOS-PEDIDOS.md`): `cliente_nombre`, contacto, `ref`, `talla`, `cantidad`, `total`,
`metodo_pago: 'Wompi'`, `estado: 'pago_confirmado'`, `canal: 'web'`, `fuente`, `creado`. La app ya
lista esa colección → misma alerta. ¿Falta un campo (p. ej. datos de envío capturados en la web)?
**Pídelo por escrito en `CAMBIOS-PEDIDOS.md`**, no improvises el esquema. En `app.jsx`, mapea los
estados de Wompi (`pago_pendiente`, `pago_confirmado`) si aún salen como texto crudo.

## Reglas de oro
- **No romper la web/tienda ni la app en vivo.** Cambio **reversible** (poder volver al botón de
  WhatsApp fácil: deja el código viejo comentado o documenta el rollback).
- Reusar las llaves de Wompi existentes; **no** poner llaves nuevas/producción tú; **no** exponer
  secretos (pública sí, privada/secret no).
- Respetar el contrato del pedido (congelado). No tocar `bot_n8n/credenciales/`.
- **No desplegar** (Cloudflare/Firebase) ni `git push` — deja todo listo + instrucciones de qué
  subir y qué webhook registrar.

## Verificación
- La web **carga**, cada producto muestra **talla + cantidad + botón Comprar**.
- **Pago de prueba (con las llaves del bot):** el webhook confirma → se crea el pedido en Firestore
  → **la app lo muestra** (y llega la alerta según la opción elegida).
- La app muestra el catálogo con **secciones Dama/Caballero**.
- Reversible: se puede volver al botón de WhatsApp.

## Hecho cuando
El dueño **eligió** la opción de notificación (anotada) · el botón Comprar hace checkout Wompi
(probado con las llaves existentes) · talla/cantidad se eligen en la web · al aprobarse el pago se
crea el pedido y **la app lo muestra/alerta** · la app tiene secciones **Dama/Caballero** · el
cambio es reversible · nota `web/NOTA-WEB-COMPRA-WOMPI-2026-07-11.md` con **qué desplegar y qué
webhook registrar** · línea de cierre.
