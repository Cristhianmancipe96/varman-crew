# Nota AGENTE 3 — Tienda web · 2026-07-06

Trabajo del brief `bot_n8n\briefs\BRIEF-4AGENTES-2026-07-06.md` (AGENTE 3). Solo se tocó `web\publicar\` (index.html y privacidad.html). NO se tocó `publicar\img\`, ni `generar-web.ps1`, ni el número de WhatsApp (eso es EL CORTE, 14 jul).

## Qué se hizo

1. **Número de WhatsApp consolidado (index.html).** Antes vivía en 3 sitios (la
   variable, el FAB flotante y el handler de los botones "Pedir"). Ahora vive
   SOLO en `var WHATSAPP_NUMERO` (buscar `EL CORTE` en index.html); el FAB y
   los botones arman el enlace desde esa variable. El día del corte se cambia
   UNA línea.
   - OJO: `privacidad.html` tiene el número aparte (enlace + texto visible,
     marcado con `<!-- EL CORTE: cambiar aquí -->` en la línea del WhatsApp).
     Ese se cambia a mano el mismo día. Total el 14 jul: 2 archivos, 2 puntos.
2. **Fallback verificado en navegador:** con Firestore bloqueado (host
   inalcanzable en copia de prueba), las 33 tarjetas fijas quedan visibles con
   sus fotos locales y la página no queda en blanco. Con Firestore normal, el
   catálogo dinámico carga (64 fotos desde Firestore). Sin errores de consola
   ni peticiones fallidas en ambos casos.
3. **Conversión/velocidad:**
   - CTA de WhatsApp en móvil OK: el FAB verde es `position:fixed`, 58×58 px
     (tap target > 44px), siempre visible en viewport 375×812.
   - Lazy-load: las 70 fotos del catálogo ya lo tenían; se agregó a los 2
     logos bajo el pliegue (sección Nosotros y footer). El hero queda eager
     a propósito (es lo primero que se ve).
   - Meta OG: og:image / og:url apuntan a varmancrew.pages.dev (correcto);
     se eliminó un og:type duplicado.
4. **/privacidad confirmada accesible** en https://varmancrew.pages.dev/privacidad
   (carga completa con secciones de eliminación de datos y contacto — la URL
   que Meta referencia). No se cambió nada visible de esa página.

## Cómo publicar estos cambios (deploy)

1. Entrar a Cloudflare Pages → proyecto **varmancrew**.
2. Arrastrar la carpeta **`web\publicar`** completa (crear nuevo deployment).
3. Listo. Verificar https://varmancrew.pages.dev y /privacidad después.

Los cambios de hoy son solo locales hasta hacer ese deploy. No hay prisa:
son mejoras internas; lo crítico es tenerlos publicados antes de la pauta
(16 jul).

## Checklist web para EL CORTE (14 jul)

1. `publicar\index.html`: cambiar `var WHATSAPP_NUMERO` (buscar "EL CORTE").
2. `publicar\privacidad.html`: cambiar enlace wa.me Y el texto visible
   (buscar "EL CORTE").
3. Deploy: arrastrar `web\publicar` a Cloudflare Pages (proyecto varmancrew).
4. Probar en el celular: FAB, un botón "Pedir" de una tarjeta y el formulario
   de contacto → los 3 deben abrir el chat del número NUEVO.
