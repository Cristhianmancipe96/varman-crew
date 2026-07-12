# 02 — APP de inventario/ventas/caja/pedidos (PWA React + Firebase)

**Módulo del `PLAYBOOK-REPLICACION.md`. Capa documentada por el Agente 2 (ronda 2, 2026-07-06).**
Escrito para que otra sesión de Claude monte esta capa para un negocio nuevo sin conocer VarMan.

## Qué es esta capa

Una PWA (app instalable en el celular, sin tiendas de apps) para el EQUIPO del negocio:
inventario por talla, registro de ventas, estadísticas, administración del catálogo público
de la tienda web, caja privada de los socios y gestión de los pedidos que crea el bot de
WhatsApp. Corre 100% en el navegador (React con JSX compilado por Babel EN el navegador,
sin build ni node_modules) y usa Firebase como única base de datos (Firestore) y login
(Firebase Auth por correo/contraseña). Hosting: Cloudflare Pages (gratis). En VarMan:
https://varmanapp.pages.dev (código en `app\`).

**Decisión de diseño heredable:** TODO el código está en UN archivo (`app.jsx`, ~4.700
líneas) + un `index.html` que carga React/Babel desde `vendor\` (local, sin CDN). Se
edita con cualquier editor, se prueba con `python servidor.py` y se publica arrastrando
la carpeta a Cloudflare Pages. Cero tooling.

## (a) Qué es GENÉRICO (sirve tal cual para otro negocio)

- **Toda la estructura de la app**: pestañas (Inventario / Ventas / Pedidos / Stats /
  Tienda / Caja), navegación flotante, hojas de detalle (`Sheet`), toasts, empty states.
- **El motor de datos**: `store` (respaldo localStorage), `fbSyncList` (sube solo lo que
  cambió), suscripciones en tiempo real `onSnapshot`, sembrado idempotente la primera vez,
  persistencia offline de Firestore.
- **Login** (Firebase Auth email/contraseña) con mensajes de error en español.
- **PWA completa**: `manifest.json`, `sw.js` (red primero, caché de respaldo), banner de
  instalación Android + ayuda iOS.
- **Exportar a Excel**: `downloadCSV` (CSV con BOM y `;`, sanitiza fórmulas) y el botón
  verde `BotonExportar`, usados por Inventario, Ventas, Caja y Pedidos.
- **Pestaña Pedidos completa**: estados (`ESTADOS_PEDIDO`), tolerancia a literales viejos
  (`normEstadoPedido`), badge de pendientes, filtros, detalle con comprobante en colección
  aparte, botón wa.me, notas, exportación. El CONTRATO con el bot (esquema del pedido) es
  genérico: ver `bot_n8n\briefs\CAMBIOS-PEDIDOS.md` como plantilla del contrato.
- **Enlace opcional catálogo↔inventario** (`refInventario`): mecanismo genérico para
  cruzar el catálogo público con el inventario interno SIN migraciones (vacío = apagado).
- **Caja de socios**: gastos/ingresos con categorías, saldo corrido con "ancla", acceso
  restringido por correos + reglas de Firestore.
- **Fotos**: compresión en canvas, IndexedDB local + espejo en Firestore.
- `reglas-firestore.txt` como PATRÓN de reglas (cambiar solo correos y nombre de tienda).

## (b) Qué está HARDCODEADO de VarMan (archivo → dónde)

En `app\app.jsx` (números de línea de 2026-07-06; si se movieron, buscar el texto):

| Qué | Línea | Buscar |
|---|---|---|
| Config de Firebase (proyecto varman-crew) | 39 | `const firebaseConfig` |
| Espacio Firestore `tiendas/varman/*` | 47 | `const TIENDA = "varman"` |
| Clave de guardado local | 34 | `varman-tienda-v1` |
| Tallas del producto (zapatos EUR 36-45) | 188 | `const TALLAS` |
| Correos de los 2 socios (pestaña Caja) | 254 | `const SOCIOS_CAJA` |
| Ancla de caja (saldo real 22/06/2026) | 260 | `const ANCLA_CAJA` |
| Gastos históricos del Excel de VarMan | 282 | `const GASTOS_INICIALES` |
| Categorías de gasto/ingreso | 264 | `const CATS_GASTO` |
| Atajos de gastos (arriendo, nómina Martín…) | 3734 | `const ATAJOS_GASTO` |
| Categorías del catálogo (deportivas/casuales/urbanas) | 3224 | `const CATS_TIENDA` |
| URL de la tienda web pública | 3443 | `varmancrew.pages.dev` |
| Texto "el aviso al 320" (número humano) | 4405 | `el aviso al 320` |
| Marca en Login y cabecera ("VARMAN CREW", "Control de bodega") | 465, 879 | `VARMAN` |
| Nombres de archivos exportados | 1261, 2303, 3876, 4218 | `varman-inventario` etc. |
| Colores de marca (naranja #FF5A1F) | 19 | `const C = {` |
| Moneda/locale (es-CO, COP) | 165 | `toLocaleString("es-CO")` |

En los demás archivos de `app\`:

- `index.html`: `<title>`, `apple-mobile-web-app-title`.
- `manifest.json`: name, short_name, description.
- `sw.js`: nombre de caché `varman-v1`.
- `icon.png`: logo del negocio (192px+; sirve uno de 512x512).
- `reglas-firestore.txt`: correos de socios y proyecto Firebase.
- `seed-catalogo.json`: catálogo inicial DE VARMAN (fotos+precios). Un negocio nuevo NO
  lo usa: crea sus referencias desde la pestaña Tienda (+ Nueva referencia), o genera su
  propio seed con el mismo formato `{ products: [...], fotos: {fid: dataURL} }`.
- `importar-datos.html`: asistente de carga del Excel de inventario (ajustar columnas al
  Excel del negocio nuevo).
- `iniciar-varman.bat` / `servidor.py`: solo el nombre; funcionan tal cual.

## (c) Variables que un negocio nuevo debe definir

| Variable | Ejemplo VarMan | Dónde se aplica |
|---|---|---|
| `firebaseConfig` (proyecto nuevo) | varman-crew | app.jsx:39, reglas |
| Nombre del espacio (`TIENDA`) | "varman" | app.jsx:47 (y el bot y la web usan el MISMO) |
| Nombre comercial + logo + color acento | VarMan Crew, #FF5A1F | app.jsx (C, textos), manifest, icon.png |
| Correos del equipo (Auth) y de socios (Caja) | 2 socios + vendedor | Firebase Console + SOCIOS_CAJA + reglas |
| "Tallas"/variantes del producto | 36-45 EUR | TALLAS (puede ser S/M/L, colores, etc.) |
| Categorías del catálogo público | deportivas/casuales/urbanas | CATS_TIENDA (y la web debe usar las mismas) |
| Categorías y atajos de gastos | arriendo, nómina… | CATS_GASTO, ATAJOS_GASTO |
| Ancla de caja (fecha + saldo real verificado) | 22/06/2026 → $2.548.119 | ANCLA_CAJA (evita discusiones contables) |
| Gastos históricos (opcional) | Excel de cierre | GASTOS_INICIALES (o dejar `[]`) |
| Moneda y locale | COP, es-CO | fmt/precioTienda |
| URL de la tienda web | varmancrew.pages.dev | app.jsx:3443 |
| Número WhatsApp humano | 320 225 0619 | texto del comprobante (app.jsx:4405) |
| Inventario inicial (Excel) | BASE GENERAL.xlsx | importar-datos.html |

## (d) Montaje de cero (orden y tiempos, ~½ día con cuentas ya creadas)

Requisitos previos (Fase 0 del playbook): proyecto Firebase con Firestore y Auth
(correo/contraseña, usuarios del equipo creados) y cuenta Cloudflare.

1. **Copiar `app\` completa** al proyecto nuevo (con `vendor\`). — 5 min
2. **Rebrandear**: tabla (b) de arriba, de arriba a abajo: firebaseConfig, TIENDA,
   textos/colores/moneda, TALLAS, categorías, SOCIOS_CAJA, ANCLA_CAJA (saldo real del
   dueño), GASTOS_INICIALES (`[]` si no hay histórico), manifest/index/sw/icon. — 1-2 h
3. **Reglas de Firestore**: editar correos en `reglas-firestore.txt` y pegarlas en
   Firebase Console → Firestore → Reglas → Publicar. Sin esto Caja/Pedidos salen vacías. — 10 min
4. **Probar en local**: `python servidor.py` → http://localhost:8000, entrar con un
   usuario del equipo. — 15 min
5. **Cargar inventario**: abrir `importar-datos.html` (ajustado al Excel del negocio) o
   registrar productos a mano con "+ Agregar". — 30-60 min
6. **Crear catálogo público**: pestaña Tienda → "+ Nueva referencia" (foto, precio,
   categoría) por cada producto que irá en la web. Opcional: enlazar cada referencia con
   su ref de inventario (selector "Referencia del inventario") para que Pedidos muestre
   stock real. — 30-90 min según nº de referencias
7. **Publicar**: Cloudflare Pages → Create deployment → arrastrar `app\` completa.
   Probar desde un celular e instalar (banner PWA). — 15 min
8. **Conectar el bot** (cuando exista, módulo 03): el bot escribe pedidos en
   `tiendas/{negocio}/pedidos` y comprobantes en `.../comprobantes/{idPedido}` con el
   esquema de `CAMBIOS-PEDIDOS.md`; la app los muestra sola, sin cambios de código. — 0 min

**Trampas conocidas** (ya resueltas en el código — no "arreglarlas" de vuelta):
- `hoyLocal()` existe porque `toISOString()` registra ventas con fecha del día siguiente
  por la noche (UTC): siempre usarla para fechas de hoy.
- Los comprobantes van en colección aparte (no inflar los docs de pedidos con base64).
- `creado` del pedido es string ISO (ordena bien como texto): NO cambiarlo a timestamp
  sin renegociar el contrato con el bot.
- El teléfono en los CSV va con espacios: Excel convierte 12 dígitos en "5,73E+11".
- La app tolera literales de estado viejos del bot (`normEstadoPedido`).
- Cambio de correos del equipo = DOS lugares: reglas de Firestore y `SOCIOS_CAJA`.

*Escrito por el Agente 2 (Claude Code) el 2026-07-06.*
