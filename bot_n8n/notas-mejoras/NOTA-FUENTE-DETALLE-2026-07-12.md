# NOTA — Atribución DETALLADA de pauta (flag `BOT_FUENTE_DETALLE`) · 2026-07-12

> Pedido del dueño: que cada pedido diga DE DÓNDE vino el cliente — qué anuncio
> (título), si fue anuncio o publicación, y la plataforma cuando se pueda deducir.
> **NO desplegado** — preparado y probado; el dueño sube.

## Qué se construyó

1. **"Parsear mensaje" (build)** — además de `fuente` (que queda EXACTAMENTE
   igual), el nodo emite SIEMPRE 3 campos inertes del `referral` de Meta:
   `fuente_titulo` (headline del anuncio), `fuente_tipo` (`ad`|`post`) y
   `fuente_url`. Sin referral van como strings vacíos — nunca se inventa nada.
   Sin el flag, el Cerebro ni los mira.
2. **Cerebro (flag NUEVO `BOT_FUENTE_DETALLE`, OFF por defecto)** — con el flag ON:
   - arma `fuenteDet = { titulo, tipo, url, plataforma }` desde lo parseado;
     la **plataforma se deduce de la url** (contiene "instagram" → `instagram`;
     "fb.me" o "facebook" → `facebook`; si no lo dice, queda vacía — no se adivina).
   - el detalle **sobrevive en la sesión** exactamente igual que la fuente de hoy
     (campo `fuenteDetalle`, JSON string, en `guardarSes` y `recordarFuente`;
     se restaura junto a `ses.fuente`).
   - en los TRES puntos de creación del pedido (comprobante, Wompi y contra
     entrega) el pedido lleva los **campos planos** `fuente_titulo`,
     `fuente_tipo` y `fuente_plataforma` — solo los que tengan valor.
   - los 3 avisos de pedido nuevo al 320 **anexan al final** la línea
     `📣 Vino de: {titulo} ({plataforma})` (plantilla nueva `fuenteAvisoDueno`;
     si Meta no mandó headline se dice "un anuncio"/"una publicación" según el
     `source_type`). Las plantillas existentes NO se tocaron.
3. **Contrato** — los 3 campos nuevos quedaron documentados como ADICIÓN en
   `briefs/CAMBIOS-PEDIDOS.md` (opcionales, la app los muestra solo si vienen).

## Con el flag OFF (estado por defecto)

Comportamiento **byte-idéntico al de hoy**: los campos extra del parseo viajan
pero nadie los lee, no se escribe nada nuevo en sesión ni en pedido, y los
avisos al 320 quedan idénticos carácter a carácter. El flujo que ya vende no
cambia en nada.

## Cómo probar

1. Regenerar el workflow: `node "workflows\build-v4-pedidos.js"` (desde `bot_n8n\`).
2. Batería: `node "tests\test-offline-v4.js"` — sección **49** nueva
   (10 checks): facebook (fb.me) con supervivencia por sesión hasta el pedido y
   línea en el aviso, instagram (url → plataforma), y regresión con flag OFF
   (pedido sin campos nuevos y aviso de siempre).
3. En vivo: encender el flag y hacer clic en un anuncio CTWA real → el primer
   mensaje trae el referral; al cerrar el pedido, el aviso al 320 debe terminar
   con "📣 Vino de: …" y el pedido en la app debe traer `fuente_titulo`.

## Variable para el dueño (agregar al .env de la VM y recargar)

```
BOT_FUENTE_DETALLE=on   # el pedido y el aviso al 320 dicen de qué anuncio vino
```

(Recargar: `docker compose up -d --force-recreate`.)

## Cómo revertir (rollback en 1 paso)

Quitar `BOT_FUENTE_DETALLE` del `.env` (o ponerlo en `off`) y recargar: todo
vuelve EXACTO a como está hoy. Respaldo del build anterior:
`workflows/respaldo/bot-varman-v6.3.json`.

## Archivos tocados

`workflows/build-v4-pedidos.js` (nodo "Parsear mensaje" + VERSION 6.4),
`workflows/src/cerebro-v4.js` (flag + `fuenteDet` + sesión + 3 pedidos + 3 avisos),
`workflows/src/textos.js` (plantilla `fuenteAvisoDueno`),
`tests/test-offline-v4.js` (flag en lista OFF, `msj()` con campos nuevos,
sección 49), `briefs/CAMBIOS-PEDIDOS.md` (adición al contrato) → build regenerado.
