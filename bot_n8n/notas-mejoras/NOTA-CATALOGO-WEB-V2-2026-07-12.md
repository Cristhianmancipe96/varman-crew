# NOTA — Catálogo web v2: bienvenida conversacional + nombre del modelo · 2026-07-12

> Feedback del dueño tras probar `BOT_CATALOGO_WEB` en producción (el "hola" se sentía
> seco y la confirmación mostraba "Ref 07" en vez del nombre del zapato).
> **NO desplegado** — preparado y probado; el dueño sube.

## 1. Bienvenida conversacional (mismo flag `BOT_CATALOGO_WEB`)
- **`hola` (intent saludo)** → ya NO manda el link en frío: da la bienvenida y espera
  la pregunta del cliente. Texto exacto pedido por el dueño (`catalogoWebBienvenida`):
  "¡Hola! Bienvenido a *VarMan Crew* 👟 Cuéntame, ¿qué modelo o marca buscas, o en qué
  te puedo ayudar?". También es el fallback cuando Gemini falla (pregunta abierta,
  nunca dead-end). El saludo ya NO marca `linkCatalogoAt` (no salió link → no hay
  seguimiento de compra por un simple saludo).
- **"catálogo" y sinónimos claros** ("ver el catálogo", "otro modelo/estilo/color")
  → link DIRECTO por fast-path determinista (regex `PIDE_OTRO_MODELO`), sin gastar
  Gemini y funcionando aunque Gemini esté caído. Sinónimos libres ("muéstrame
  zapatos") siguen vía Gemini → `ver_catalogo` → link.
- **`precio`** (con `BOT_DISPATCH_V2`) → UNA burbuja: bienvenida + rango de precios +
  link (`catalogoWebPrecioIntro` cuando Gemini no dio texto).
- **Marca que SÍ tenemos** (`buscar_marca`) → el bot mira el catálogo real y responde
  "De *Nike* tenemos N modelos disponibles 🔥" + link (`catalogoWebMarca`).
- **Marca que NO tenemos** → honestidad + link + puerta al asesor
  (`catalogoWebMarcaSin`). El flujo de insistencia → asesor (E1) queda intacto.
- **Ref que NO existe** ("Quiero la ref 99") → "no la encuentro" + link + asesor
  (`catalogoWebRefNoEncontrada`), sin arrancar pedido. La ref que SÍ existe sigue
  arrancando la ficha + pedido como siempre.
- `ver_catalogo` / `comprar` / `cat:` / `marca:` → el link, igual que antes (v1).

## 2. Nombre del modelo en vez de "Ref NN" (flag NUEVO `BOT_NOMBRE_MODELO`, OFF)
Los mensajes al CLIENTE muestran la **marca que se registra desde la app de VarMan**
(capitalizada); la ref sigue viajando por dentro (Firestore, avisos al 320, que la
necesitan para alistar). Si la ref no tiene marca registrada → texto de hoy (no inventa).
- `pedidoRecibido` → `pedidoRecibidoModelo` ("*Adidas* · Talla 40 · $250.000") — con
  override de tono para `BOT_TEXTOS_V2`.
- `contraentregaCliente` → `contraentregaClienteModelo`.
- `estadoPedidoInfo` ("¿cómo va mi pedido?") → `estadoPedidoInfoModelo`.
- **Wompi pago confirmado** (`wompi-webhook.js`) → `wompiConfirmadoClienteModelo`
  ("tus *Nike* (talla 39)"); el nodo busca la marca leyendo el catálogo por la URL
  pública (mejor esfuerzo: si falla, sale la Ref como hoy).
- La ficha al elegir referencia conserva "Ref NN" (el cliente llega de la web con ese
  número y ya muestra la marca en la info); se puede quitar después si molesta.
- Pendiente opcional (documentado, no hecho): `carritoAbandonado` aún dice "Ref NN"
  (el nodo horario tendría que leer el catálogo; se puede hacer en otra vuelta).

## 3. Foto → asesor (NO se tocó código)
Ya existía (mejora 9, flag `BOT_FOTO_ASESOR`): foto sin pedido en curso → respuesta
honesta + reenvío de la foto al 320 por media_id. Solo falta encenderlo en el `.env`.

## Variables para el dueño (agregar al .env de la VM y recargar)
```
BOT_FOTO_ASESOR=on      # foto de un modelo → avisa al 320 con la foto
BOT_NOMBRE_MODELO=on    # nombre del zapato (marca de la app) en vez de "Ref NN"
```
(`BOT_CATALOGO_WEB=on` ya está en la VM. Recargar: `docker compose up -d --force-recreate`.)

## Archivos tocados
`src/textos.js` (bienvenida/marca/precio/ref + 4 textos *Modelo* + override V2),
`src/cerebro-v4.js` (rama saludo, buscar_marca ON, ref inexistente, precio, flag
`BOT_NOMBRE_MODELO` + `modeloDe()` en pedidoRecibido/contraentrega/estado),
`src/wompi-webhook.js` (`modeloDeRef()` + mensaje modelo), `tests/test-offline-v4.js`
(sección 47 ajustada + sección 48 nueva de 11 checks + fixture servido a los nodos +
flag en la lista OFF del arnés) → build.

## Tests
**268 PASS · 0 FAIL.** OFF = todo como hoy (regresión); ON: bienvenida sin link, marca
honesta con conteo real, ref inexistente honesta, precio en una burbuja, y el nombre
del modelo en pedido recibido / estado / contra entrega / Wompi (con el 320
conservando la Ref y fallback a "Referencia NN" si no hay marca).

## Cómo revertir
Apagar los flags en el `.env` (o restaurar `respaldo/bot-varman.pre-catalogo-web.json`).
Con los flags OFF el bot se comporta EXACTO como antes de todo esto.
