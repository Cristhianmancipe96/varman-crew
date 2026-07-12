# Catálogo nativo de WhatsApp (MPM) · VarMan Crew · v6

> Tarjetas de producto nativas de WhatsApp (Multi-Product Message) en vez de
> fotos sueltas. **Aditivo y con flag:** sin `CATALOGO_NATIVO=on` +
> `WHATSAPP_CATALOG_ID`, el bot responde con el catálogo de FOTOS de la v5.
> Enviar mensajes de catálogo requiere el número **alcanzable/Live**, por eso va
> tras flag: hoy (app en modo desarrollo) se deja listo y se activa cuando el 304
> esté en Live.

## Lo que ya quedó hecho (sin Meta)
1. **Generador del feed:** `node fase2/generar-feed-catalogo.js` → crea
   `fase2/feed-catalogo-whatsapp.csv` desde el catálogo Firestore
   (`tiendas/varman/catalogo`). Columnas Meta: `id` (=ref, es el SKU), `title`,
   `description`, `availability`, `condition`, `price` (`NNN COP`), `link`,
   `image_link` (foto pública `varmancrew.pages.dev/img/pNNN.jpg`), `brand`.
   Las refs sin foto pública se omiten (Meta exige `image_link`) y el script las
   lista para que les subas una foto pública.
2. **Capacidad MPM en el bot (tras flag):** al elegir una categoría, el bot manda
   un `interactive` tipo `product_list` (tarjetas nativas) con
   `product_retailer_id = ref`, seguido de la lista "Elige tu referencia" para que
   el flujo de pedido (talla→datos→pago) siga funcionando igual.

## Pasos en Commerce Manager (cuando quieras activarlo)
1. **Generar el feed:** `node fase2/generar-feed-catalogo.js` (desde `bot_n8n/`).
   Revisa el CSV y sube fotos públicas a las refs que el script reporte sin foto.
2. **Crear el catálogo** en Meta Commerce Manager
   (business.facebook.com → Commerce Manager → **Catálogos → Crear catálogo →
   Comercio electrónico**). Asócialo al **negocio** y a la **WABA
   `1572485474895736`** (WhatsApp Manager → Catálogo).
3. **Subir el feed:** en el catálogo → **Fuentes de datos → Añadir productos →
   Subida manual (CSV)** → sube `feed-catalogo-whatsapp.csv`. (Opcional: subida
   programada apuntando a una URL del CSV público.)
4. **Copiar el ID del catálogo** (Catálogo → Configuración) → ponlo en el `.env`
   de la VM como `WHATSAPP_CATALOG_ID=...`.
5. **Activar el flag:** en el `.env` de la VM, `CATALOGO_NATIVO=on`, y
   `docker compose up -d`. Prueba escribiendo `hola` → elige una categoría → deben
   verse tarjetas de producto nativas.

## ⚠ Commerce Policy (importante para que NO rechacen el catálogo)
- **Sin logos protagonistas de terceros** (Adidas, Nike, Louis Vuitton…) en las
  imágenes ni en los títulos como marca "oficial". El `brand` puede decir la
  marca del modelo, pero las **fotos** no deben destacar logos de terceros.
- Precios y disponibilidad reales; nada de falsificaciones explícitas.
- Zapatos = categoría permitida; el riesgo real es el uso de marcas de terceros.

## Estado / límites
- El MPM **muestra** productos; cuando el cliente toca "Añadir al carrito" y envía
  el pedido, WhatsApp manda un mensaje tipo `order` (carrito nativo). Procesar ese
  carrito nativo para crear el pedido automáticamente **queda en el backlog**
  (necesita el número en Live para probarse). Mientras tanto, el cliente puede
  pedir con la lista "Elige tu referencia" (ref:) que va junto al MPM — flujo v5
  probado. Ver `fase2/BACKLOG-V6.md`.

## Rollback
Quitar/comentar `CATALOGO_NATIVO` (o `WHATSAPP_CATALOG_ID`) del `.env` y
`docker compose up -d`. El bot vuelve al catálogo de fotos v5. El workflow no cambia.
