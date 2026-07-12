# BRIEF — AGENTE 2 · Asistente a mitad de flujo (robustez conversacional) · VarMan Crew · 2026-07-10

> **Para Claude Code.** Lee primero `BRIEF-GEMINI-0-COORDINACION.md`. Paralelo con otros 4.
> **Tu territorio:** en `workflows/src/textos.js` el prompt **`GEMINI_ASISTENTE`** y los
> textos `pasoTalla/pasoDatos/pasoPago/pasoComprobante`; en `workflows/src/cerebro-v4.js`
> la función **`asistir()`** (~L482) y las ramas **`asist`** dentro de los estados
> `talla` / `datos` / `pago` / `comprobante`.

## Misión
Cuando el bot ya está en un pedido y le pidió un dato (talla, envío, pago…), el cliente
suele escribir en lenguaje libre. Que el bot **responda coherente a eso** sin trabarse,
sin repetir la plantilla y sin dejarlo sin salida.

## Fallos que arreglas (BANCO-RESPUESTAS §14.4, §14.5 + pruebas reales)
1. **Repite la plantilla del paso** cuando Gemini ya respondió (ej. "Método de pago…" 3
   veces). Ya hay manejo parcial; revísalo en **los 4 estados** para que, si llega
   `asist.respuesta`, se mande SOLO esa respuesta y se mantengan los botones — nunca el
   bloque plantilla encima.
2. **Datos de envío + IA:** en el estado `datos` (~L896) hoy se acepta por heurística
   (`pareceEnvio`) y **no se usa `asist.dato`**. Si Gemini confirma que los datos están
   completos pero el heurístico duda, el bot se queda pegado. Acepta el avance cuando
   Gemini lo confirme. *(La validación fina de campos es del Agente 4: acuerden que
   avanza si `pareceEnvio` **o** `asist.dato` trae nombre+dirección+ciudad+teléfono.)*
3. **Choque IA↔regex en talla** (~L845–894): afínalo para que una **pregunta** ("¿tienen
   la 35?") no se tome como talla elegida (queda en `respuesta`, no en `dato`), y una
   afirmación ("uso la 40") sí la fije.
4. **Preguntas extra ignoradas:** "talla 40 y ¿envían a Cali y cuánto vale?" debe fijar la
   talla **y** contestar lo extra.
5. **Handoff duplicado:** el handoff determinista ya corre antes (~L587). Evita mandar el
   aviso al 320 dos veces si además `asist.handoff` viene true.

## Tareas
1. **Mejora `GEMINI_ASISTENTE`** (textos.js) con el BANCO: respuestas cortas (máx 2
   frases, 1 emoji) a envíos/tiempos/descuentos/calidad; **sin mexicanismos**; regla clara
   pregunta-vs-dato en talla; **nunca inventar stock** (si preguntan por una talla puntual,
   ofrece que un asesor confirma). Mantén EXACTA la forma del JSON (`handoff`,`dato`,`respuesta`).
2. **Revisa los 4 estados** (`talla`,`datos`,`pago`,`comprobante`): patrón uniforme →
   `asist.handoff` → handoff (una vez); `asist.respuesta` → solo esa respuesta (+ botones si
   aplica); si no hay nada de IA → comportamiento determinista v5. Ningún dead-end.
3. **Usa el helper `llamarGemini()`** del Agente 5 dentro de `asistir()` (sin cambiar el
   prompt, que sí es tuyo). Si vuelve `null`, comportamiento v5 exacto.
4. **Fast-path:** confirma que si el mensaje es SOLO el dato (ej. talla "37") no se gasta
   Gemini, y que si trae pregunta/algo extra sí se consulta (mira `tienePregunta` ~L902).
5. **Coordina con el Agente 4** el criterio de "datos completos" y con el Agente 1 que el
   asistente NO pisa el clasificador (tú solo actúas con pedido en curso).

## Casos de prueba a añadir (`tests/test-offline-v4.js`)
- Estado talla: "uso la 40" → fija 40. "¿tienen la 35?" → responde la pregunta, NO fija.
  "no sé mi talla" → da un tip y re-pregunta (no repite seco).
- Estado talla: "talla 40 y ¿envían a Cali?" → fija 40 + responde envío, sin repetir plantilla.
- Estado pago: "¿esto ya incluye envío?" → responde y mantiene los botones (no reenvía el bloque).
- Cualquier estado: "quiero hablar con una persona" → handoff una sola vez.
- Flag `BOT_ROBUSTEZ` OFF → los 4 estados se comportan EXACTO como v5.

## No toca
`GEMINI_SISTEMA` ni el clasificador (Agente 1) · el match de marca (Agente 3) · la
conversión de tallas y la validación de campos de envío (Agente 4; tú los consumes) · la
plomería de la llamada a Gemini (Agente 5).

## Hecho cuando
Build OK, tests en verde con tus casos, sin repeticiones de plantilla, sin dead-ends, y con
el flag OFF el bot = v5. Nota `NOTA-GEMINI-2-2026-07-10.md`.
