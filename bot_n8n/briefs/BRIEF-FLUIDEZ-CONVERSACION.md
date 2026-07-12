# BRIEF — Agente DEDICADO a la FLUIDEZ de la conversación · VarMan Crew · 2026-07-11

> **Para Claude Code.** UN solo agente enfocado en que el bot **se sienta humano y fluido**.
> Trabajas igual que el agente del loop (una mejora por corrida, la registras y paras), pero
> tu único tema es la **fluidez conversacional**.
>
> **⚠️ UN SOLO ESCRITOR.** Este agente edita `cerebro-v4.js` y `textos.js` — los mismos
> archivos que el loop de mejoras. **NUNCA corras este agente y `loop-mejoras.ps1` /
> la tarea nocturna al mismo tiempo** (OneDrive + edición paralela ya borró trabajo). Antes
> de arrancar, para el loop de mejoras (Ctrl+C). Al terminar la fluidez, se retoma el loop.
>
> **Memoria compartida:** lees y escribes la MISMA bitácora `briefs/BITACORA-MEJORAS.md`
> (tabla "Hechas") que el loop, para no repetir ni pisar lo ya hecho. Tu backlog propio está
> aquí abajo (§5, "Tier F").
>
> **Modo:** *preparar y probar; el dueño despliega.* NO tocas la VM, NO credenciales/`.env`,
> NO `git push`.

---

## 1. El problema (en palabras del dueño)
En chats reales la conversación se ve **incómoda**: el bot **reenvía/repite mensajes**, manda
**muchas burbujas de golpe** (parece spam), y **a veces no entiende lo que pregunta el
cliente**. Tu trabajo es que cada turno del bot se sienta como una persona: **reconoce lo que
dijo el cliente, responde lo que preguntó, y pide UNA sola cosa clara** — sin muros de texto ni
repeticiones.

## 2. Lee esto primero (cada corrida)
1. `briefs/BITACORA-MEJORAS.md` — **memoria compartida.** Qué ya se hizo (no lo repitas).
2. `briefs/CONVERSACIONES-INCOMODAS.md` — **chats reales incómodos** que pegó el dueño.
   **Son tu fuente de verdad #1:** arregla ESOS casos, no ejemplos inventados. Si el archivo
   está vacío o no existe, usa el BANCO y deja anotado en tu nota que faltan transcripciones.
3. `briefs/BANCO-RESPUESTAS-V1-2026-07-09.md` — tono y diálogos de referencia.
4. `briefs/BRIEF-AGENTE-LOOP-MEJORA-CONTINUA.md` — **de ahí heredas TODAS las reglas de oro
   (§3), el ciclo de una corrida (§2) y las anclas de código (§7).** No las repito aquí.
5. El código: `workflows/src/cerebro-v4.js` y `workflows/src/textos.js`.

## 3. Reglas de oro
**Las mismas del loop** (`BRIEF-AGENTE-LOOP-MEJORA-CONTINUA.md` §3), sin excepción:
aditivo + **detrás de flag** (apagado por defecto ⇒ el bot = hoy) · editar `src/` y regenerar
con el build · **una mejora por corrida** · tests SIEMPRE verdes + un caso nuevo · no tocar
credenciales/VM/git · respetar el contrato del pedido · el bot **nunca adivina** stock/tallas.

## 4. El ciclo de UNA corrida (idéntico al loop)
Salud (tests en verde antes de tocar) → elige UNA mejora de fluidez de la cola (§5) → **test
primero** (con un caso de `CONVERSACIONES-INCOMODAS.md`) → implementa detrás de flag → respalda
el JSON + `node workflows/build-v4-pedidos.js` → `node tests/test-offline-v4.js` verde (flag
OFF = hoy, y ON) → registra en la BITÁCORA "Hechas" (fila con prefijo **F**, p. ej. "F1") +
deja `notas-mejoras/NOTA-FLUIDEZ-<n>-2026-07-11.md` → imprime una línea y **termina**.

> Entorno: si `node` "no se reconoce", usa el Node portable (ver el aviso al inicio de
> `briefs/BITACORA-MEJORAS.md`).

## 5. Backlog de FLUIDEZ (Tier F — prioridad de arriba hacia abajo)
Elige la de mayor impacto en los chats reales que no esté en "Hechas". Cada una **detrás de su
flag** (sugerido); el dueño los enciende juntos con `BOT_FLUIDEZ*` al desplegar.

1. **[F1] Menos burbujas de golpe en el catálogo.** Hoy `tandaCatalogo()` (~L324 en
   `cerebro-v4.js`) manda intro + hasta 5 imágenes + fallback + lista = **7-8 mensajes
   seguidos** → se siente spam. Reduce el preámbulo y agrupa: un intro corto, las fotos, y
   **una** lista para elegir; evita textos redundantes entre burbujas. Flag `BOT_FLUIDEZ_CATALOGO`.

2. **[F2] Acuse + transición humana antes de pedir el siguiente dato.** Que el bot **reconozca
   lo que el cliente acaba de decir** y enlace, en vez de saltar seco a la plantilla. Ej.:
   talla 40 → "¡De una, la 40! 🙌 Ahora pásame tus datos de envío…" en vez de solo
   `TEXTOS.pedirTalla`/`datos`. Aplica en los pasos `talla`→`datos`→`pago`. Textos en
   `textos.js`. Flag `BOT_FLUIDEZ_ACUSE`.

3. **[F3] Nunca "no entendí" seco.** Cuando Gemini devuelve `null` o el cliente escribe algo
   raro, el bot debe **reconducir con calidez** (ofrecer catálogo / repreguntar UNA cosa), no
   cortar. Revisa el fallback del clasificador (~L1072) y los `else` de los 4 estados. Enlaza
   con `BOT_CLASIF_V2`/`BOT_DISPATCH_V2` (ya existen) donde aplique; si necesitas texto nuevo,
   flag `BOT_FLUIDEZ_RECONDUCE`.

4. **[F4] Comprensión de la pregunta real.** Cuando el cliente mete una pregunta junto al dato
   ("talla 40 y ¿envían a Cali?"), que el bot **conteste lo que preguntó** además de avanzar,
   sin repetir la plantilla. Afina las ramas `asist` de los 4 estados y el prompt
   `GEMINI_ASISTENTE` (respuestas cortas, 1 idea, sin mexicanismos). Detrás de `BOT_ROBUSTEZ`
   (existente) + texto nuevo tuyo si hace falta.

5. **[F5] Un turno = una pregunta.** Audita los puntos donde el bot manda **varias burbujas de
   texto** en un mismo turno (fuera del catálogo): consolídalas en 1-2 mensajes con **una sola
   pregunta clara** al final. Flag `BOT_FLUIDEZ_UNTURNO`.

6. **[F6] Tono humano uniforme.** Máx 2 frases por mensaje, máx 1 emoji, colombiano **sin
   mexicanismos**, sin MAYÚSCULAS de bloque ni signos de más. Pasa el copy de venta por este
   filtro (coordina con `BOT_TEXTOS_V2`, ya existente, para no duplicar overrides).

> Cuando la cola baje, saca casos nuevos de `CONVERSACIONES-INCOMODAS.md` y del BANCO.

## 6. Casos de prueba a añadir (`tests/test-offline-v4.js`)
Usa el patrón existente (`correrCerebro(msj({...}))`, `check(...)`, `mockGemini`). Para fluidez,
verifica **cantidad y forma de los mensajes**, no solo el contenido:
- Catálogo (F1): con el flag ON, el nº de mensajes de la tanda **baja** vs OFF, y sigue habiendo
  exactamente **una** lista para elegir.
- Acuse (F2): tras fijar talla, el mensaje siguiente **menciona la talla** y pide datos en el
  mismo turno (no dos burbujas plantilla).
- Reconduce (F3): Gemini `null`/basura → respuesta cálida con catálogo, **nunca** un texto tipo
  "no entendí" seco.
- Pregunta+dato (F4): "talla 40 y ¿envían a Cali?" → fija 40 **y** responde el envío, sin
  repetir la plantilla de pago/datos.
- Con **todos los flags de fluidez OFF** → el bot se comporta **EXACTO como hoy** (regresión).

## 7. Lo que NO tocas
Credenciales/`.env`/VM/git · el JSON a mano · el contrato del pedido · el dedup por
`message_id` (no lo rompas: es lo que evita respuestas dobles de verdad) · la matemática de
tallas (es del código, no de Gemini) · el cumplimiento de Gemini (tier de pago).

## 8. Hecho cuando (por corrida)
Build OK · batería verde con caso nuevo · con los flags de fluidez OFF el bot = hoy · fila "F"
en la BITÁCORA + `NOTA-FLUIDEZ-<n>` · línea de cierre. **Una** mejora. Y paras.

## 9. Cómo te corren
`bot_n8n/loop-fluidez.ps1` te llama en bucle (una mejora de fluidez por vuelta). Recuerda: **no
al mismo tiempo que el loop de mejoras.** Tu continuidad entre vueltas es la BITÁCORA compartida.
