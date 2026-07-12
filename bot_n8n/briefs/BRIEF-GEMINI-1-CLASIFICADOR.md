# BRIEF — AGENTE 1 · Clasificador de intención (Gemini) · VarMan Crew · 2026-07-10

> **Para Claude Code.** Lee primero `BRIEF-GEMINI-0-COORDINACION.md`. Trabajas en
> paralelo con otros 4 agentes; respeta tu territorio.
> **Tu territorio:** en `workflows/src/textos.js` el prompt **`GEMINI_SISTEMA`**, y en
> `workflows/src/cerebro-v4.js` el bloque **"sin pedido en curso"** (~L1024–1136),
> EXCEPTO la sub-rama de marca (`intent === 'buscar_marca'` y `marca:`), que es del Agente 3.

## Misión
Que el bot **entienda bien qué quiere el cliente en el PRIMER mensaje** (cuando aún no
hay pedido) y nunca lo deje sin salida. Hoy clasifica con demasiados errores.

## Fallos que arreglas (de las pruebas reales — ver BANCO-RESPUESTAS §14)
1. **Marca mal detectada:** "¿Tienes Jordan?" terminó mostrando otra cosa. El
   clasificador debe devolver `intent:"buscar_marca"` + `marca:"jordan"` normalizada
   (corrige "addidas"→adidas, "naik"→nike). *(El match del catálogo lo hace el Agente 3;
   tú garantizas la clasificación y la marca limpia.)*
2. **Cae a "saludo" cuando el JSON de Gemini viene sucio** (~L1072 `catch → intent='saludo'`).
   Usa el helper `llamarGemini()` del Agente 5 (null-safe) y, si vuelve `null`, muestra el
   catálogo con un saludo cálido — **nunca un "no entendí" seco ni silencio**.
3. **Intents del prompt desalineados con el código.** El prompt enumera
   `saludo|ver_catalogo|buscar_marca|pregunta_precio|comprar|estado_pedido|aviso_stock|hablar_humano|otro`,
   pero el dispatch (~L1074–1135) solo ramifica algunos y el resto cae al `else`
   (catálogo). Alinea: cada intent debe tener un camino claro y útil.
4. **Multi-intención ignorada:** "hola, ¿tienen Jordan y hacen envíos a Cali?" hoy solo
   toma una cosa. Captura la intención principal en `intent` y **contesta lo extra en
   `respuesta`** (envíos, precio, calidad) en la misma vuelta.
5. **Guardrails de marca/calidad flojos:** debe responder a "¿son originales?" en positivo
   (calidad 1.1) **sin** decir "no son originales" y **sin** afirmar autenticidad.

## Tareas
1. **Reescribe `GEMINI_SISTEMA`** (textos.js) con el guion aprobado del BANCO:
   - Añade **ejemplos (few-shot)** dentro del prompt para los casos reales: saludo,
     "¿son originales?", "¿tienen Jordan?", "¿cuánto vale?", multi-intención.
   - Refuerza: tono colombiano **sin mexicanismos**; máximo 2 frases; calidad 1.1 en
     positivo; precios/envíos/contra entrega Bogotá/descuentos (10% con razón, 15% x2)
     como contexto para `respuesta`.
   - Mantén EXACTA la forma del JSON de salida (`intent`,`respuesta`,`marca`,`ref`,`talla`)
     — el Agente 3 y el código dependen de ella.
2. **Alinea el dispatch** (~L1074–1135): que `ver_catalogo`, `pregunta_precio` y `saludo`
   muestren catálogo/precios con la `respuesta` cálida; que `comprar` lleve a categorías;
   que ningún intent quede sin manejar.
3. **Endurece el arranque:** cambia la llamada cruda a Gemini (~L1052) por
   `llamarGemini(GEMINI_SISTEMA, texto, {temperature:0.3, maxTokens:200})`. Si `null` →
   catálogo + saludo (no dead-end).
4. **Coordina con el Agente 3:** tú entregas `intent:"buscar_marca"` + `marca` limpia; él
   hace el match y el "no lo tengo, mira parecidos". No toques su rama.

## Casos de prueba a añadir (`tests/test-offline-v4.js`)
- "hola" → intent saludo, muestra catálogo, tono de marca.
- "¿son originales?" → respuesta en positivo (calidad 1.1), NO dice "no son originales".
- "¿tienen Jordan?" → intent buscar_marca, marca="jordan".
- "¿cuánto valen?" → da precio/rango + invita a elegir.
- "hola, ¿tienen Nike y envían a Cali?" → intent buscar_marca+marca="nike" y la respuesta
  menciona envíos a Cali.
- Gemini devuelve JSON inválido (mock) → NO se cae; muestra catálogo.

## No toca
`GEMINI_ASISTENTE` ni `asistir()` (Agente 2) · el match de marca ni la foto al 320
(Agente 3) · la conversión de tallas ni la validación de envío (Agente 4) · la plomería
de la llamada a Gemini (la crea el Agente 5; tú solo la usas).

## Hecho cuando
Build OK, tests en verde con tus casos nuevos, el bot clasifica bien los casos del BANCO
y ningún mensaje queda sin salida. Nota `NOTA-GEMINI-1-2026-07-10.md`.
