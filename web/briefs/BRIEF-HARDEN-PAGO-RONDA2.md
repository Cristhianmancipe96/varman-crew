# BRIEF — Endurecer el flujo de pago web (ronda 2 de hallazgos) · VarMan Crew · 2026-07-12

> **Para Claude Code (o el PM).** UN agente. **Territorio:** `web/publicar/index.html`
> (script de compra), `web/publicar/_worker.js`, y el bot SOLO en
> `bot_n8n/workflows/src/wompi-webhook.js` + `textos.js` + `tests/` (regla de oro:
> editar src, regenerar con `node workflows/build-v4-pedidos.js`, batería en verde
> y AGREGAR casos). Un solo escritor; no correr junto a otro agente de web o bot.
>
> **Origen:** revisión triple (seguridad + code-review + harden) con verificación
> adversarial del 2026-07-12 — 12 agentes, 8 hallazgos confirmados. Los 3 fáciles
> ya quedaron aplicados (commits en el repo git local); estos 5 son los pendientes.
> El detalle completo con líneas exactas está al final de
> `seguridad/INFORME-SEGURIDAD-2026-07-12.md`.

## Ya aplicado (no repetir)
- `font-weight: 400` en `.hero-title` y `.s-title` (los h1/h2 sintetizaban negrita falsa).
- `closeModal()` ya llama `window.vmCancelarCompra()` si existe (hook listo, la función es parte del hallazgo 2).
- Variable `abortCompra` declarada en el IIFE de compra (sin uso aún).

## Pendiente 1 — 🔴 ALTA · fetch de pago sin timeout (web)
`index.html` ~línea 2626: el `fetch('/api/comprar')` no tiene `AbortController` ni
timeout. Red colgada = botón "Creando tu pago seguro…" bloqueado para siempre =
venta perdida. **Fix:** crear la petición con `abortCompra = new AbortController()`
+ `setTimeout(25s) → abort()` + `signal`. El abort dispara el `.catch` existente,
que ya restablece el botón. Limpiar el timeout en then/catch.

## Pendiente 2 — 🟠 MEDIA · cerrar el modal no cancela la compra en vuelo (web)
Definir `window.vmCancelarCompra = function(){ if (abortCompra) abortCompra.abort(); abortCompra = null; }`
en el IIFE de compra, y llamarla también al inicio de `vmPrepararCompra` (abrir otro
producto). Sin esto: cierre → respuesta tardía → `location.assign` sorpresa al
checkout, o compra cruzada de producto con dos pedidos `pago_pendiente`.

## Pendiente 3 — 🟠 MEDIA · volver "atrás" desde el checkout deja el botón muerto (web)
bfcache: la página se restaura con `enviando=true`. **Fix:** en el IIFE de compra:
`window.addEventListener('pageshow', function(e){ if (e.persisted && enviando){ enviando=false; abortCompra=null; setBtn('<i class="ti ti-lock"></i> Ir a pagar', false); } });`

## Pendiente 4 — 🟠 MEDIA · el catch bota el mensaje real del error (web)
El worker responde causas accionables ("talla no disponible", "la referencia ya no
está disponible") pero el `.catch(function(){...})` no recibe el error y siempre
pinta el genérico → el cliente reintenta en bucle imposible. **Fix:** propagar
`r.status` en el then; si es 4xx con `res.j.error`, mostrar ese texto con
`mostrarErr` (usa `textContent`, sin riesgo XSS); genérico solo para 5xx/red.
De paso: subir el mínimo del celular no-57 a `(pref+cel).length >= 8` (hoy +1 con
6 dígitos pasa el formulario y muere en el worker con error invisible).

## Pendiente 5 — 🟠 MEDIA · bot: pago APROBADO sobre pedido CANCELADO se traga en silencio
`wompi-webhook.js` ~línea 165: `ESTADOS_NO_TOCAR` incluye 'cancelado' → un pago
que llega DESPUÉS de que el equipo canceló (el link no expira) entra a Wompi y
nadie se entera; antes al menos llegaba el aviso al 320. **Fix (aditivo):**
1. Si `estado === 'cancelado'`: NO tocar el pedido, pero `logError('wompi-pago-sobre-cancelado', …)`
   y avisar al 320 con un texto NUEVO en `textos.js` (ej. `wompiPagoSobreCancelado`:
   "⚠️ Pago Wompi APROBADO en un pedido CANCELADO — revisar/reembolsar. Ref {ref} · {total} · {ruta}").
2. Convertir la denylist en **allowlist**: solo confirmar si `estado === 'pago_pendiente'`
   (cubre typos y estados futuros; los pedidos Wompi nacen siempre ahí).
3. Tests: ajustar/mantener 19d-bis (enviado → no toca) y AGREGAR 19d-ter
   (cancelado + APPROVED → 1 solo mensaje al 320 con "CANCELADO", estado intacto).
4. `node workflows/build-v4-pedidos.js` + batería completa en verde (hoy: 271/0).

## Hecho cuando
Los 5 fixes aplicados · batería del bot en verde con el caso nuevo · compra sandbox
local vuelve a pasar (arnés `web/pruebas-wompi/`) · commit por pieza · nota corta
en `seguridad/INFORME-SEGURIDAD-2026-07-12.md` marcando los 5 como resueltos ·
recordar al dueño re-subir `web\publicar` y el JSON del bot (v6.3+) a la VM.
