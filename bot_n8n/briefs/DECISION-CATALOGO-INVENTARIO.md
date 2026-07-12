# DECISIÓN: ¿Enlazamos el catálogo público con el inventario privado?

**Fecha:** 2026-07-05 · **Para:** dueño de VarMan Crew · **Tiempo de lectura:** 5 minutos.
**Qué se decide:** si conectamos las 33 referencias de la página con los 80 códigos VRM de la bodega, y cómo.

## 1. Lo que existe hoy (verificado en el código y en la nube)

Todo vive en el mismo Firestore (proyecto `varman-crew`), bajo `tiendas/varman/`:

| Cosa | Colección | Campos de cada documento |
|---|---|---|
| Catálogo público (33 refs, lo lee la página sin clave) | `catalogo` | `id` (c01…c33), `ref` ("01"…"33"), `cat` (deportivas/casuales/urbanas), `precio`, `tag`, `orden`, `activo`, `fotos` (lista de ids de foto) |
| Fotos del catálogo | `catalogoFotos` | `data` (imagen comprimida) |
| Inventario privado (solo con login) | `products` | `id`, `referencia` (VRM001…VRM080), `modelo`, `color`, `talla` (36–45), `stock`, `costo`, `precio` |
| Pedidos del bot WhatsApp | `pedidos` | `cliente_nombre`, `cliente_wa`, `datos_envio`, `ref` (la del catálogo), `talla`, `cantidad`, `total`, `metodo_pago`, `comprobante_media_id`, `estado`, `canal`, `creado` |

**Cómo se guarda el stock por talla:** en `products` hay un documento por cada combinación
referencia + talla (la app suma al stock si la talla ya existe). Ojo: los datos migrados del
Excel entraron como un solo documento por código VRM con el stock total y la talla vacía.

**Hoy no hay NINGÚN campo que conecte una `ref` del catálogo con un código VRM.**
El bot guarda ref + talla y tú verificas stock a mano cuando te llega el aviso.

## 2. Opciones

**Opción A — Campo de enlace dentro de cada referencia del catálogo.**
A cada documento de `catalogo` se le agrega un campo nuevo, p. ej. `codigosInv: ["VRM0xx", …]`
(lista, porque una ref de la página puede corresponder a varios códigos de bodega).
- Toca: solo Firestore (se llena una vez con tu tabla). La app y el bot siguen igual por ahora.
- Esfuerzo: bajo (~1–2 h una vez tengas la tabla llena).
- Pro: lo más simple; el enlace queda pegado a cada referencia.
- **Contra serio:** `catalogo` es de lectura PÚBLICA. Cualquiera vería tus códigos internos de bodega.

**Opción B — Colección de mapeo aparte (privada).**
Se crea `tiendas/varman/mapaCatalogo`: un documento por ref con `{ ref: "01", codigosInv: ["VRM0xx", …] }`,
con regla de Firestore de lectura solo con login (igual que `products`).
- Toca: solo Firestore + una regla nueva (2 líneas). La app de inventario y el bot NO se tocan hoy.
- Esfuerzo: bajo (~2–3 h una vez tengas la tabla llena).
- Pro: los códigos internos siguen privados; el catálogo público no cambia ni un byte;
  deja lista la Fase 2 del bot (el bot ya escribe en Firestore con credencial propia, podría leer el mapa y el stock).
- Contra: una colección más que recordar mantener cuando entren o salgan referencias.

**Opción C — Seguir como estamos (sin enlace).**
- Toca: nada. Esfuerzo: cero.
- Pro: con el volumen actual de pedidos, verificar a mano funciona.
- Contra: riesgo de vender por WhatsApp una talla agotada; cada pedido te cuesta una revisada manual;
  y cualquier automatización futura (bot que diga "no hay talla 40") queda bloqueada.

## 3. Tabla para llenar A MANO (regla de oro: nadie adivina, solo tú)

Escribe el/los códigos VRM que corresponden a cada referencia. Si una ref no está en bodega, escribe "NO HAY".

| Ref catálogo | Categoría | Precio | Código(s) VRM (llenar) |
|---|---|---|---|
| 01 | deportivas | $259.900 | |
| 02 | casuales | $259.900 | |
| 03 | deportivas | $235.000 | |
| 04 | deportivas | $299.900 | |
| 05 | urbanas | $480.000 | |
| 06 | urbanas | $480.000 | |
| 07 | deportivas | $269.900 | |
| 08 | deportivas | $259.900 | |
| 09 | deportivas | $289.900 | |
| 10 | deportivas | $299.900 | |
| 11 | casuales | $249.900 | |
| 12 | casuales | $329.900 | |
| 13 | casuales | $329.900 | |
| 14 | casuales | $289.900 | |
| 15 | urbanas | $369.900 | |
| 16 | urbanas | $359.900 | |
| 17 | casuales | $249.900 | |
| 18 | deportivas | $269.900 | |
| 19 | urbanas | $359.900 | |
| 20 | urbanas | $359.900 | |
| 21 | urbanas | $349.900 | |
| 22 | urbanas | $399.900 | |
| 23 | urbanas | $369.900 | |
| 24 | casuales | $339.900 | |
| 25 | urbanas | $389.900 | |
| 26 | casuales | $259.900 | |
| 27 | urbanas | $379.900 | |
| 28 | deportivas | $240.000 | |
| 29 | urbanas | $399.900 | |
| 30 | deportivas | $409.900 | |
| 31 | deportivas | $409.900 | |
| 32 | deportivas | $399.900 | |
| 33 | urbanas | $369.900 | |

## 4. Recomendación

**Opción B (colección de mapeo privada).** Cuesta casi lo mismo que la A, pero no publica tus
códigos internos en la página, no toca ni la app de inventario ni el bot que ya funcionan, y deja
el terreno listo para que en Fase 2 el bot consulte stock real antes de aceptar un pedido.
Lo único que se necesita de ti es la tabla de arriba llena; sin ella no se hace nada (regla de oro).
Si prefieres no mover nada todavía, la C es válida: llena la tabla igual y la guardamos para cuando sea.
