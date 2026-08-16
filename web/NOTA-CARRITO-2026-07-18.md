# NOTA — Carrito: comprar 2+ productos en un solo pago · 2026-07-18

> Pedido del dueño: que la página deje **agregar al carrito** para comprar varios
> pares en un solo pago. Hecho **aditivo y reversible** (misma bandera
> `COMPRA_WOMPI` que la compra de un producto). **Probado**: 16/16 en la lógica
> del worker + flujo de carrito verificado en el navegador. **Nada del bot se
> tocó.** Falta solo desplegar (web + app).

## Qué cambió

| Pieza | Cambio |
|---|---|
| `web/publicar/index.html` | En el modal, botón **«Agregar al carrito»** (además de «Comprar», que sigue igual). **Botón flotante 🛒** (bajo el de WhatsApp) con contador de pares y un **panel lateral**: editar cantidades, quitar, ver total y pagar TODO junto. El carrito vive en `localStorage` (sobrevive recargas). |
| `web/publicar/_worker.js` | `POST /api/comprar` ahora acepta `items:[{ref,talla,cantidad,genero}]` (carrito) **además** del formato de un producto de siempre. Valida CADA ítem contra el catálogo real (precio del catálogo, nunca del navegador), fusiona líneas repetidas, y **un solo link de pago Wompi** por el total. El pedido multi lleva `items_json` (detalle exacto), `items_n`, `items_resumen`; los campos `ref/talla` llevan un resumen ("05 + 12"). **Con un solo producto el pedido queda byte-idéntico al de hoy.** |
| `app/app.jsx` | El detalle de un pedido con varios productos muestra la lista **"🛍 N referencias — alistar todas"** con ref · talla · género · pares · subtotal de cada uno (lee `items_json`). Los pedidos de hoy (sin ese campo) se ven igual que siempre. |

## Topes (para no armar pedidos absurdos)
- Máx **8 referencias** distintas y **10 pares** en total por pedido (validado en la web y, como red de seguridad, en el worker).
- Máx **5 pares por ítem** (igual que la compra de un producto).

## Reglas que se respetaron
- **Precio siempre del catálogo** (Firestore), nunca del navegador. Un ítem inválido (talla mala, ref inactiva, sin género en unisex) **tumba TODO el pedido** → nunca cobra de más.
- **Esquema del pedido congelado**: mismos campos de siempre + los nuevos `items_*` (aditivos). El **webhook del bot no cambió** — encuentra el pedido por `wompi_payment_link_id` y lo confirma igual.
- **Géneros mezclados** en el carrito (una dama + un caballero) → el pedido va con `genero` vacío para no engañar al aviso del bot; el detalle real está en `items_json`.

## Cómo desplegar (cuando quieras)
1. **La web**: dash.cloudflare.com → Workers & Pages → `varmancrew` → Create deployment → arrastrar `web\publicar` (ya trae el `_worker.js` nuevo). Las variables de entorno (WOMPI_PRV_KEY, WOMPI_ENV, FIREBASE_SA_B64) **ya están puestas** de la compra web — no hay que tocarlas.
2. **La app**: dash.cloudflare.com → `varmanapp` → Create deployment → arrastrar la carpeta `app\`. (Solo para ver bonito el pedido multi; si no la subes, un pedido de 2 productos igual llega, solo que el detalle exacto no se lista.)

## Prueba después de desplegar
- Abre un modelo → elige talla → **«Agregar al carrito»** → abre otro → agrégalo → toca el 🛒 → revisa cantidades y total → **«Ir a pagar»** → datos → checkout de Wompi con el **total sumado**.
- En `test` (tarjeta 4242 4242 4242 4242) el pago es de mentiras. Al confirmar, en la app el pedido aparece con "🌐 Compra hecha en la página web" y la lista de las 2 referencias, y te llega el WhatsApp al 320.

## Rollback (1 minuto)
- En `index.html`, `var COMPRA_WOMPI = false;` → re-subir la web: vuelve todo al botón de WhatsApp (carrito incluido queda inerte). El worker sigue aceptando el formato viejo, así que no hay que revertirlo.

---

# RONDA 2 (2026-07-18, misma tarde) — auditoría móvil + pulido de diseño

Revisión a fondo en viewport de celular (375px) con estas correcciones — todas
verificadas con mediciones reales en el navegador:

## Bugs REALES encontrados y arreglados (auditoría)
1. **La página se ensanchaba a 411px en un celular de 375px** (la marquesina y
   la palabra gigante del hero empujaban el layout): todo se veía corrido y el
   botón del menú quedaba medio por fuera de la pantalla. Fix:
   `html,body{overflow-x:clip}` → verificado: 375 = 375, cero arrastre lateral.
2. **Cualquier clic desbloqueaba el scroll del fondo** con el modal de compra
   abierto (el cierre del menú móvil corría con TODOS los clics y reseteaba
   `body.overflow` incondicionalmente). Fix: solo restaura el scroll si el menú
   era quien lo tenía bloqueado. Afectaba modal, y habría afectado el carrito.

## Placas DAMA / CABALLERO (más interactivas, sin invadir)
- Cada placa muestra **cuántos modelos hay** ("Para ella · 34 modelos") — se
  refresca solo cuando el catálogo real carga de Firestore.
- **Barra de estado del filtro** encima del grid: "👟 Viendo: Dama — 34 modelos
  · [Ver todo ✕]". Siempre se sabe qué se está viendo y cómo volver → nadie se
  pierde. Toma el color del género activo (rosa/azul). `role=status` para
  lectores de pantalla, y foco visible en las placas.

## Envío GRATIS visible al comprar (pedido del dueño)
- Franja "🚚 Envío GRATIS a todo el país 🇨🇴" **arriba del selector de talla**
  (se ve apenas se abre cualquier producto).
- Repetida **dentro del formulario de pago** ("ya va incluido") — en el móvil la
  de arriba queda fuera de pantalla al llenar los datos.
- Y en el **pie del carrito** ("incluido") junto al total.

## Carrito (pulido de diseño)
- Ítems con 2+ pares muestran el desglose: "$ 499.800 (2 × $ 249.900)" — antes
  el subtotal parecía el precio de UN par.
- Botón flotante alineado con el de WhatsApp (mismo tamaño 58px, apilados con
  12px de aire) y **pop sutil del contador** al agregar.
- Panel entra **deslizándose** (animación corta, `prefers-reduced-motion` la
  apaga), **bloquea el scroll del fondo**, botón de cerrar de 44px, y padding
  inferior con `safe-area` (iPhone con barra gestual).
- Carrito vacío con botón **"Ver el catálogo 👟"** (cierra y lleva al grid).

Verificado con mediciones en navegador móvil: sin desborde (375=375), placas y
barra dentro de pantalla, tap-targets ≥34px, franjas contenidas en el modal,
bloqueos de scroll correctos en menú/modal/carrito, y sintaxis de los 6 bloques
de script en limpio. **Mismo deploy: re-subir `web\publicar`.**

## Tallas: tope REAL del negocio = EU 44 (corrección del dueño)
El rango por defecto de hombre/unisex era CO 35-45 y, como hombre EU = CO + 2,
la web ofrecía hasta **EU 47** — tallas que NO llegan. Corregido en `index.html`
y `_worker.js` (los dos deben ir iguales):
- **Hombre/unisex: CO 35-42 = EU 37-44** (la 42 CO es la última que se vende).
- **Dama: CO 34-41 = EU 35-42** (ya estaba bajo el tope, no cambió).
- Una referencia con "Tallas en la web" propias puestas en la app **usa las
  suyas** (el dueño manda por encima del default).
Verificado: chips del modal hombre terminan en CO 42/EU 44, dama en CO 41/EU 42,
y el worker rechaza CO 43+ en refs sin tallas propias (20/20 tests del worker).
⚠ OJO: el BOT de WhatsApp todavía dice "de la 35 a la 45 (europeas)" en sus
textos y acepta talla 45 — alinearlo a 44 es un cambio del bot aparte
(pendiente de decisión del dueño).
