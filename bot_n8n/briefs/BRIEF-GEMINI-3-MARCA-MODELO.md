# BRIEF — AGENTE 3 · Match de marca/modelo + reenviar foto al asesor · VarMan Crew · 2026-07-10

> **Para Claude Code.** Lee primero `BRIEF-GEMINI-0-COORDINACION.md`. Paralelo con otros 4.
> **Tu territorio:** en `workflows/src/cerebro-v4.js` la rama **`intent === 'buscar_marca'`**
> (~L1079) y la rama de selección **`marca:`** (~L785), la **función de filtrado por marca**,
> y una **capacidad nueva** (imagen/insistencia → 320). Los textos de marca en `textos.js`
> (`fotosIntroMarca*`, `marcaSinResultados`, y los que agregues).

## Misión
Que cuando el cliente pide un modelo/marca, el bot **muestre lo correcto** — y cuando NO lo
tenemos, lo diga con honestidad y ofrezca pasarlo a un asesor (reenviando la foto), en vez
de mostrar un modelo equivocado como si fuera el pedido.

## Fallos que arreglas (BANCO-RESPUESTAS §14.6 y §14.8)
1. **Match equivocado:** "¿Tienes Jordan?" devolvió "Adidas campus". El filtro actual
   `normMarca(p.marca).includes(marcaBuscada)` falla si el catálogo no tiene el campo
   `marca` poblado, o hace match parcial raro. Hay que hacerlo **robusto** y, si no hay
   match real, **NO** devolver otra cosa: mostrar catálogo con aviso honesto.
2. **No hay "reenviar al 320":** si el cliente insiste por un modelo que no tenemos, o
   manda una **foto** del modelo exacto, hoy el bot no hace nada útil. Debe reenviar esa
   foto/mensaje al dueño (320) y decirle al cliente que un asesor le confirma.

## Tareas
1. **Match robusto (rama `buscar_marca` y `marca:`):**
   - Filtra por `marca` **y** por nombre/palabras del modelo si el catálogo tiene ese
     dato (revisa qué campos trae cada referencia: `marca`, y si existe algún `nombre`/
     `descr`/`tag`). Normaliza acentos/mayúsculas (ya está `normMarca`).
   - Si hay resultados → muéstralos (fotos + lista, como hoy con `mostrarTanda`).
   - Si **no** hay → catálogo normal con `marcaSinResultados` (honesto: "de esa marca no
     tengo marcadas, pero mira esto"). **Nunca** presentar un modelo cualquiera como el pedido.
2. **Reenviar foto/insistencia al asesor (nuevo, aditivo, detrás de flag p. ej.
   `FOTO_ASESOR=on`):** en el bloque "sin pedido en curso", si llega `parsed.imagen_id`
   (el cliente mandó una foto y no hay pedido en curso), o si insiste tras un
   `marcaSinResultados`, manda al 320 un aviso con el contexto (nombre, wa, y la foto vía
   su `media_id`/reenvío) y responde al cliente con el texto tipo BANCO §3:
   *"Esas puntuales no las tengo ahorita 🙈. Se la paso a un asesor para confirmar si la
   conseguimos 📲."* Con el flag OFF, el comportamiento queda como hoy.
   - ⚠ Reenviar una imagen por la Graph API se hace con su `media_id` (mismo patrón que ya
     usa el bot para leer el comprobante). No descargues la foto a memoria si no hace falta
     (RAM 1 GB en la VM).
3. **Lista de refs sin `marca`:** deja en tu nota la lista de referencias del catálogo que
   **no** tienen `marca` registrada, para que Cristhian las complete desde la app (pestaña
   Tienda). Eso es lo que más mejora el match; tú no puedes poblar esos datos.
4. **Coordina con el Agente 1:** él te entrega `intent:"buscar_marca"` + `marca` limpia. No
   cambies el prompt `GEMINI_SISTEMA` (es de él); si necesitas que devuelva algo más (p. ej.
   un `modelo`), pídelo por escrito en tu nota.

## Casos de prueba a añadir (`tests/test-offline-v4.js`)
- "¿tienen Jordan?" con refs marcadas "jordan" → muestra solo esas.
- "¿tienen Jordan?" SIN refs marcadas → catálogo + aviso honesto (no un modelo ajeno).
- Cliente manda una foto sin pedido en curso (flag ON) → aviso + foto al 320, y respuesta
  de "se lo paso a un asesor". Flag OFF → comportamiento de hoy.
- "las quiero SÍ o SÍ" tras "no lo tengo" → handoff/reenvío al asesor.

## No toca
El prompt del clasificador ni su dispatch general (Agente 1; tú solo consumes `intent`+`marca`)
· `GEMINI_ASISTENTE`/estados de pedido (Agente 2) · tallas y validación (Agente 4) · la
plomería de Gemini (Agente 5).

## Hecho cuando
Build OK, tests en verde, el bot nunca muestra un modelo equivocado como el pedido, la foto
al asesor funciona tras el flag, y dejaste la lista de refs sin marca. Nota `NOTA-GEMINI-3-2026-07-10.md`.
