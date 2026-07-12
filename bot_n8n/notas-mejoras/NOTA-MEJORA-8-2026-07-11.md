# NOTA MEJORA 8 (MANTENIMIENTO) — Robustez de tests ante deriva de fotos · 2026-07-11

## Qué pasó
El **baseline arrancó en ROJO** (3 FAIL) antes de tocar nada — no por un bug, sino
por **deriva del catálogo en vivo**: el dueño agregó a "deportivas" una ref (Ref 35
"Superstar blessd", $230.000) con **foto de app** (id `f…`, no pública `pNNN`), que
por diseño se muestra como **línea de texto**, no como imagen. Tres tests hardcodeaban
"5 imágenes" o "la primera ref manda foto":
- `tanda: 5 mensajes de imagen` → llegaban 4.
- `ref elegida: manda foto` → la 1ª ref de la lista (Ref 35) manda texto, no imagen.
- `flag OFF: vuelve al catálogo de FOTOS v5` → 4 imágenes, no 5.

Per el Paso 0 del brief (rojo antes de tocar → arreglar el rojo si es chico y claro,
**sin** agregar features), esta vuelta fue **solo** ese arreglo. La mejora de feature
en cola ([E1]) queda para la siguiente vuelta.

## Qué cambié (solo `tests/test-offline-v4.js`, sin rebuild)
- `tanda: 5 mensajes de imagen` → `hasta 5 imágenes (refs con foto pública)`:
  `imgs.length >= 1 && imgs.length <= 5`. Las 5 refs se ofrecen igual en la lista
  (chequeo aparte, sin cambio).
- `ref elegida: manda foto`: ahora se elige una ref que **sí tiene foto pública**,
  sacándola del caption de la 1ª imagen (`/Ref (\d\d)/`), en vez de `filas[0]` a ciegas.
- `flag OFF: vuelve al catálogo de FOTOS v5`: `imagenes(r).length >= 1 && <= 5`.

No toqué `src/` ni el JSON. Resultado: **156 PASS · 0 FAIL**.

## Por qué así (y no derivar el conteo exacto)
Derivar el número exacto de fotos exigiría replicar en el test la lógica de
`fotoUrlDe` (regex `pNNN`) y desempaquetar `fotos` (arrayValue) de Firestore —
frágil y acoplado. El rango `[1,5]` + el chequeo de las 5 filas de la lista mantiene
el sentido (se muestran fotos, se ofrecen las 5 refs) y tolera la deriva. Un `0`
imágenes seguiría fallando (captura una ruptura real).

## Recurrencia — a atacar de raíz
Es la **2ª vez** que la deriva del catálogo en vivo rompe tests (Mejora 1: precios;
esta: fotos). El arnés corre contra el catálogo REAL, que Cristhian edita. Añadí a la
cola **"tests contra catálogo fijo (fixture)"** para desacoplarlos de los datos vivos
y que el loop no tropiece de noche. Mientras tanto, la limpieza previa auto-sanable
(Mejora B1) y estas asserts robustas reducen el ruido.

## Cómo revertir
Es test-only: revertir las 3 asserts a `=== 5` / `filas[0]` en `tests/test-offline-v4.js`.
(No recomendado: volvería a fallar con la deriva.)

## ⚙️ Entorno
Node portable en `bot_n8n/herramientas/node/node.exe` (no está en PATH). Ver
`notas-mejoras/NOTA-MEJORA-1-2026-07-11.md`.
