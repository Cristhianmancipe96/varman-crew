# Módulo 01 — Tienda web (Cloudflare Pages + Firestore)

**Capa:** tienda web pública del negocio. Página estática de una sola pieza que
muestra el catálogo y convierte visitas en chats de WhatsApp. Sin backend propio:
se sirve gratis desde Cloudflare Pages y lee el catálogo de Firestore (solo
lectura). Escrito para que una sesión de Claude replique esta capa para un
negocio nuevo sin conocer VarMan.

**Referencia viva:** `web\publicar\` del proyecto VarMan
(https://varmancrew.pages.dev). Todo lo que se menciona abajo se busca ahí.

---

## 1. Qué contiene la carpeta desplegable (`web\publicar\`)

| Archivo | Qué es | ¿Genérico? |
|---|---|---|
| `index.html` | TODA la tienda: CSS + HTML + JS en un solo archivo (~2.300 líneas). Sin build, sin frameworks (GSAP y fuentes por CDN). | Estructura sí; contenido no (ver §3) |
| `privacidad.html` | Política de privacidad. **Obligatoria**: Meta la exige para publicar la app de WhatsApp. | Plantilla sí; datos del negocio no |
| `_headers` | Cabeceras de seguridad de Cloudflare Pages | 100% genérico, copiar tal cual |
| `favicon.png`, `og-image.jpg` | Ícono y imagen de vista previa al compartir el link | Reemplazar por los del negocio |
| `img\` | Fotos del catálogo fijo (`pNNN.jpg`) + logos (`pNNN.png`) | Reemplazar completo |

El resto de `web\` (carpeta `assets\`, `revision_referencias\`, `generar-web.ps1`,
`varman_crew (19).html`) son archivos de trabajo históricos de VarMan — **no se
despliegan ni se replican**. `generar-web.ps1` fue el generador original del
catálogo fijo y apunta a rutas que ya no existen; para un negocio nuevo el
catálogo se maneja por Firestore (ver §2) y no hace falta.

## 2. Arquitectura del catálogo (la parte que hay que entender)

La página tiene **dos catálogos superpuestos**, a propósito:

1. **Catálogo fijo (fallback):** tarjetas HTML escritas dentro de `index.html`
   (buscar `prod-card` en el HTML), con fotos locales en `img\`. Es lo que se ve
   si Firestore no responde o aún no hay catálogo publicado. La página **nunca
   queda en blanco**.
2. **Catálogo dinámico:** un script al final de `index.html` (buscar
   `Catálogo dinámico`) lee por la API REST de Firestore (sin SDK, solo `fetch`):
   - `tiendas/{negocio}/catalogo` → referencias: nombre, precio, categoría, tag,
     ids de fotos.
   - `tiendas/{negocio}/catalogoFotos/{id}` → cada foto como base64 en el campo
     `data` (subidas desde la app de inventario, pestaña Tienda — ver módulo 02).
   - Si la lectura funciona, reemplaza las tarjetas fijas; si falla, no toca nada.
   - Las fotos se cachean en IndexedDB del navegador (`vm-catalogo-cache`) para
     que las visitas repetidas carguen al instante.

**Requisito cruzado:** las reglas de Firestore (módulo 02) deben permitir
lectura pública de `tiendas/{negocio}/catalogo*` y nada de escritura.

**El flujo de venta es siempre:** ver catálogo → botón "Pedir" → se abre
WhatsApp con mensaje prellenado → sigue el bot (módulo 03). La web no tiene
carrito ni pagos: es catálogo + puente a WhatsApp.

## 3. Qué está HARDCODEADO de VarMan en `index.html` (y cómo encontrarlo)

Buscar estas cadenas en `web\publicar\index.html`:

| Buscar | Qué es | Qué cambiar |
|---|---|---|
| `var WHATSAPP_NUMERO` (y comentarios `EL CORTE`) | **El número de WhatsApp vive SOLO en esa variable** (~línea 2020). El FAB flotante, los botones "Pedir", el formulario de contacto y el paso 2 de "¿Cómo comprar?" arman el enlace desde ahí. | Un solo punto de cambio. Mantener esta propiedad al replicar. |
| `Hola VarMan Crew` | Textos prellenados de los mensajes de WhatsApp (3 sitios: FAB, botones Pedir, formulario) | Nombre del negocio |
| `firestore.googleapis.com/v1/projects/varman-crew` | URL base del catálogo dinámico: proyecto Firebase `varman-crew` y ruta `tiendas/varman/` | Proyecto y slug del negocio nuevo |
| `<title>`, `og:title`, `og:description`, `og:url`, `og:image`, `theme-color` | SEO y vista previa al compartir (cabecera del archivo) | Todos |
| `--brand:` | Color de marca en OKLCH (naranja `#FF6B00`), dentro del bloque `:root`. Todo el design system deriva de variables CSS en `:root`. | Color del negocio (basta cambiar `--brand*` y `theme-color`) |
| `Bebas Neue` | Tipografía display (títulos). `Inter` para texto. | Opcional |
| `VARMAN`, `VarMan Crew` | Nombre en nav, hero, ticker, sección Nosotros, footer, copyright | Todos |
| `deportivas`, `casuales`, `urbanas` | Las 3 categorías: en las tarjetas fijas, los filtros (`f-btn`), la sección de categorías y el mapa `LBL` del script dinámico | Categorías del negocio (pueden ser 2-4) |
| `instagram.com/varmansnk`, `facebook.com/...`, `tiktok.com/@varmansnk` | Redes sociales (sección contacto + footer) | Las del negocio |
| `Nequi, Daviplata o Bre-B` | Métodos de pago (sección "¿Cómo comprar?", buscar `id="como-comprar"`) | Los del negocio |
| `img/p0NN` | Fotos del catálogo fijo y logos (hero, nosotros, footer) | Regenerar con fotos reales |
| Content-Security-Policy (buscar `http-equiv`) | CSP: incluye `connect-src ... firestore.googleapis.com` | Genérico; solo revisar si se agregan CDNs |

En `privacidad.html` (todo en ~70 líneas, fácil de leer entero): nombre del
negocio, dominio, **número de WhatsApp (enlace + texto visible, marcado con
`<!-- EL CORTE`)**, correo del negocio, fecha de actualización. La base legal
(Ley 1581 de 2012) sirve para cualquier negocio en Colombia.

## 4. Qué es GENÉRICO (se reutiliza tal cual)

- El design system completo (variables CSS en `:root`: colores, espaciado 8dp,
  tipos, movimiento) — rebrandear = cambiar variables, no reescribir CSS.
- Toda la maquinaria JS: filtros de categoría, modal con galería y carrusel,
  lazy-load, animaciones GSAP con fallback si el CDN no carga, FAB de WhatsApp,
  formulario de contacto → WhatsApp, catálogo dinámico con caché IndexedDB.
- La estructura de secciones: hero → categorías → catálogo → nosotros →
  contacto → **"¿Cómo comprar?"** (4 pasos: elegir → WhatsApp → pagar → recibir)
  → footer.
- `_headers`, la CSP, la accesibilidad (skip-link, focus rings, aria-labels,
  `prefers-reduced-motion`).
- `privacidad.html` como plantilla.

## 5. Variables que el negocio nuevo debe definir ANTES de empezar

1. Nombre comercial y slug corto (para `tiendas/{slug}/` en Firestore).
2. ID del proyecto Firebase (compartido con app y bot — módulos 02/03).
3. Color de marca (un hex basta; convertirlo a OKLCH) y logo en PNG.
4. Categorías del catálogo (2–4) y sus nombres visibles.
5. Número de WhatsApp de ventas (el del bot; ver nota EL CORTE abajo).
6. Métodos de pago aceptados.
7. Redes sociales (URLs completas).
8. Correo del negocio (para privacidad.html).
9. Fotos: mínimo 1 por referencia del catálogo fijo inicial + logo + og-image
   (1200×630) + favicon.
10. Textos de identidad: tagline del hero, párrafo "Nosotros" (o pedirlos y
    redactarlos con el dueño).
11. Dominio (opcional; `{proyecto}.pages.dev` funciona desde el día 1).

## 6. Montaje desde cero (orden y tiempos estimados)

Total: **medio día de trabajo de agente + esperas de deploy**. Prerrequisito:
proyecto Firebase creado (Fase 0 del playbook).

1. **Copiar la carpeta** `web\publicar\` de VarMan como base del negocio nuevo
   y borrar `img\` (5 min).
2. **Rebranding de `index.html`** con la tabla del §3: nombre, colores en
   `:root`, meta/OG, redes, categorías, textos de hero/nosotros, métodos de pago
   en "¿Cómo comprar?" (1–2 h).
3. **Catálogo fijo inicial:** con las fotos reales, generar `img\pNNN.jpg`
   (comprimidas a ~600px de lado mayor, JPEG ~70%) y reescribir las tarjetas
   `prod-card` (una por referencia, con `data-ref`, `data-precio`, categoría y
   sus fotos). Con 20–40 referencias: 1–2 h. Si aún no hay fotos, dejar 6–10
   tarjetas de muestra y seguir — el catálogo dinámico lo tapará después.
4. **Conectar el catálogo dinámico:** cambiar la URL `BASE` del script dinámico
   al proyecto/slug nuevos y verificar que las reglas de Firestore permiten
   lectura pública (15 min + módulo 02 publicando algo para probar).
5. **`WHATSAPP_NUMERO`:** poner el número que atenderá ventas. Mantener el
   patrón: la variable es el ÚNICO lugar del archivo con el número (5 min).
6. **`privacidad.html`:** nombre, dominio, WhatsApp, correo, fecha (15 min).
7. **`_headers`, favicon, og-image** (15 min).
8. **Deploy:** Cloudflare Pages → "Create project" → subir la carpeta arrastrándola
   (o conectar repo). Verificar `https://{proyecto}.pages.dev` y `/privacidad`
   (15–30 min).
9. **Prueba en celular real:** FAB, un botón "Pedir", el formulario y el paso 2
   de "¿Cómo comprar?" deben abrir el chat del número correcto; probar con y sin
   catálogo publicado en Firestore (30 min).
10. **Kit de pauta:** copiar `web\marketing\` de VarMan y adaptar los textos a
    producto/categorías del negocio (30–45 min; la guía de campaña es genérica
    salvo URLs y categorías).

## 7. Operación después del montaje

- **Actualizar catálogo:** el dueño lo hace solo desde la app (pestaña Tienda) —
  la web se actualiza sola vía Firestore, sin tocar código ni re-deploy.
- **Cambiar el número de WhatsApp** (p. ej. al pasar del número humano al bot,
  "EL CORTE"): 2 archivos, 2 puntos — `var WHATSAPP_NUMERO` en `index.html` y el
  enlace+texto en `privacidad.html` (ambos marcados con `EL CORTE`) — y re-deploy.
- **Cualquier otro cambio:** editar el archivo local y volver a arrastrar la
  carpeta a Cloudflare Pages. No hay build ni dependencias que instalar.

---
*Documentado por el Agente 3 (web) — ronda 2, 2026-07-06. Basado en el estado
real de `web\publicar\` a esa fecha (incluye la sección "¿Cómo comprar?").*
