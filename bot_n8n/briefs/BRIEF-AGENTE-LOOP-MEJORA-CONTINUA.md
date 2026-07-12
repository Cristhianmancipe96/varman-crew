# BRIEF — Agente de MEJORA CONTINUA en bucle · VarMan Crew · 2026-07-11

> **Para Claude Code.** UN solo agente. En **cada corrida haces UNA (1) mejora completa**
> del bot y **terminas**. Un script externo (`loop-mejoras.ps1`) te vuelve a lanzar para la
> siguiente. **Cada corrida es una sesión nueva SIN memoria:** tu única memoria entre vueltas
> es la **BITÁCORA** (`briefs/BITACORA-MEJORAS.md`). Por eso SIEMPRE empiezas leyéndola y
> SIEMPRE terminas escribiéndola.
>
> **Modo de trabajo (decisión del dueño):** *preparar y probar; el dueño despliega.* Editas
> `src/`, regeneras el JSON, dejas los tests en verde y una nota. **NO** despliegas a la VM,
> **NO** tocas credenciales/`.env`, **NO** haces `git push`. Cristhian revisa y sube a producción.
>
> **Alcance:** toda la lógica del bot **con Gemini como eje** — clasificador, asistente a
> mitad de flujo, fiabilidad de Gemini, la lógica determinista (tallas, datos, pago) **y**
> la experiencia de venta (textos, catálogo, flujos). Tienes permiso de tocar lo que vende,
> así que **el flag es tu red de seguridad**: cualquier cosa con riesgo va detrás de un flag
> apagado por defecto.

---

## 0. Por qué en bucle (léelo una vez)
El bot **v6 ya está EN PRODUCCIÓN** (VM de Google Cloud, número +57 304 291 6972) y atiende
conversaciones reales. No se trata de un rediseño: se trata de **muchas mejoras pequeñas,
seguras y verificadas**, una tras otra, sin romper nunca lo que ya vende. El bucle existe
para eso: cada vuelta entrega **una** mejora atómica, probada y documentada, y para. Así el
dueño puede revisar y desplegar cuando quiera, y si algo sale mal, revertir en un paso.

---

## 1. Lee esto primero (cada corrida, en este orden)
1. `ESTADO-VARMAN.md` (raíz) — el tablero: qué está en vivo, en curso y pendiente.
2. `bot_n8n/LEEME-BOT.txt` — mapa del bot: cómo se edita, deploy, Gemini, Wompi.
3. `bot_n8n/briefs/BITACORA-MEJORAS.md` — **tu memoria.** Qué ya se hizo y qué sigue.
4. `bot_n8n/briefs/BRIEF-GEMINI-0-COORDINACION.md` — arquitectura + reglas de oro.
5. `bot_n8n/briefs/BANCO-RESPUESTAS-V1-2026-07-09.md` — **diálogos reales = tu fuente de
   verdad** de tono y de casos de prueba.
6. `bot_n8n/briefs/CAMBIOS-PEDIDOS.md` — el contrato del pedido (app ↔ bot), **congelado**.
7. El código: `bot_n8n/workflows/src/cerebro-v4.js` y `bot_n8n/workflows/src/textos.js`.
8. `bot_n8n/briefs/BRIEF-GEMINI-1..5` — **tu MENÚ de mejoras ya analizadas.** Son el backlog
   rico del que sale casi todo (cada uno describe fallos reales con líneas concretas).

> No releas todo el proyecto "por si acaso". Con el ESTADO + la BITÁCORA + el archivo que
> toca tu mejora, ya estás al día. Ahorra contexto.

---

## 2. El ciclo de UNA corrida (haz esto y para)
**Paso 0 — Salud primero.** Corre `node tests/test-offline-v4.js` (desde `bot_n8n/`).
- Si la batería ya está en **ROJO antes de tocar nada** → **NO agregues features.** Arregla
  el rojo si es chico y claro; si no, **para** y anota en la BITÁCORA "suite en rojo — requiere
  atención humana (motivo)". **Nunca construyas sobre rojo.**

**Paso 1 — Elige UNA mejora.** La de mayor **(impacto × baja de riesgo)** que **NO** esté ya
en "Hechas" de la BITÁCORA. Fuente: la cola "Próximas" de la BITÁCORA + el menú `BRIEF-GEMINI-1..5`.
Regla de prioridad, en orden: **fiabilidad > corrección > cobertura > pulido/venta.**
(La mejora fundacional del §4 va primero si aún no existe.)

**Paso 2 — Test primero.** Escribe en `tests/test-offline-v4.js` el caso que **captura la
conducta deseada y hoy falla** (usa diálogos del BANCO). Así demuestras el problema antes de
arreglarlo y evitas "arreglos" que no arreglan nada.

**Paso 3 — Implementa.** Aditivo, **solo en `src/`**, **detrás de un flag** si hay cualquier
riesgo para el flujo que ya vende. Con el flag **OFF**, el bot debe comportarse **EXACTO como
hoy**. Cambios chicos y atómicos: nada de refactors gigantes.

**Paso 4 — Respaldo + build.** Antes de regenerar, **copia** `workflows/bot-varman.json` a
`workflows/respaldo/bot-varman.pre-mejora-<N>.json` (rollback en 1 paso). Luego:
`node workflows/build-v4-pedidos.js` (regenera el JSON desde `src/`).

**Paso 5 — Tests en verde.** `node tests/test-offline-v4.js`. **Todo** verde: los casos viejos
**y** tu caso nuevo. Prueba también el flag **OFF** (comportamiento idéntico a hoy) y **ON**.

**Paso 6 — Si no logras verde en esta corrida:** **revierte** (restaura el respaldo del JSON y
descarta tus cambios de `src/`), registra la mejora como **"descartada (motivo)"** en la
BITÁCORA y **termina**. Nunca dejes el árbol roto para la siguiente vuelta.

**Paso 7 — Documenta.**
- Agrega una fila a **"Hechas"** en `briefs/BITACORA-MEJORAS.md` (fecha · qué · flag nuevo ·
  test añadido · archivos tocados).
- Actualiza la cola **"Próximas"** (saca la que hiciste, sube la siguiente).
- Deja `bot_n8n/notas-mejoras/NOTA-MEJORA-<N>-2026-07-11.md` (crea la carpeta si no existe):
  **qué** cambiaste, **por qué**, **cómo revertir**, y **qué variable/flag nueva** añadiste
  (comentada, con su valor por defecto seguro).

**Paso 8 — Cierra.** Imprime **UNA** línea y **TERMINA** (no encadenes otra mejora; el loop te
vuelve a llamar):
`Mejora <N> HECHA: <título> · flag <X>=<off> · tests verdes · siguiente sugerida: <Y>`

---

## 3. Reglas de oro (innegociables — iguales que el resto del proyecto)
1. **Aditivo + reversible + detrás de flag.** Con el flag OFF, el bot = hoy. **Esta es LA regla:**
   tienes permiso de tocar venta, así que el flag apagado por defecto es tu seguro de vida.
2. **Editar `src/`, regenerar con el build.** Prohibido tocar `bot-varman.json` a mano.
3. **Una mejora por corrida.** Pequeña, atómica, revisable. Nada de cambios de 500 líneas.
4. **Tests SIEMPRE verdes + un caso nuevo por mejora** (con diálogos del BANCO). Mejora sin
   test nuevo = no está hecha.
5. **No tocar credenciales/`.env`/`credenciales/`.** Solo **documentar** variables nuevas
   (comentadas, con default seguro). Las llaves las pone el dueño en la VM.
6. **NO desplegar. NO `git push`. NO tocar la VM.** Solo preparar + probar + documentar.
7. **Un solo escritor.** Corre **UNA** instancia a la vez (OneDrive + edición paralela ya
   causó pérdidas). El runner lo garantiza; no lances dos.
8. **El bot NUNCA adivina** (equivalencias de talla, stock, autenticidad). Lo que no sabe, lo
   confirma un humano. En tallas, **la matemática la hace el código, no Gemini**.
9. **Respeta el contrato del pedido** (`CAMBIOS-PEDIDOS.md`). ¿Campo nuevo? Se pide **por
   escrito ahí** primero; no se improvisa. No expongas a la app las colecciones internas
   (`botSesiones`, `botConfig`, `botErrores`, `botProcesados`, `botRate`).
10. **Si algo no se puede volver seguro** (sin flag, con riesgo real a lo que vende) → **no lo
    hagas.** Regístralo en "Ideas descartadas" y elige una mejora más chica.

---

## 4. Teniendo en cuenta la IA de Gemini (contexto clave)
- **Dos usos de Gemini**, ambos con prompt en `src/textos.js`:
  - `GEMINI_SISTEMA` = **clasificador** de intención cuando **NO** hay pedido en curso
    (call site en `cerebro-v4.js` ~L1052).
  - `GEMINI_ASISTENTE` = **asistente** a mitad de flujo, detrás del flag `BOT_ROBUSTEZ`
    (función `asistir()` ~L482).
- **Modelo en variable:** `GEMINI_MODEL=gemini-flash-lite-latest`. Los modelos de Gemini **se
  retiran sin aviso** → **nunca lo hardcodees**; usa la variable + fallback.
- **Cupo GRATIS** (~1500 req/día) y devuelve **429/503** bajo carga. Por eso existe el
  **FAST-PATH**: si el mensaje es **solo el dato** (ej. talla "37"), **NO** se gasta Gemini
  (ver `soloTalla` ~L851, `tienePregunta` ~L902). **Toda mejora debe respetar o ampliar el
  fast-path**, nunca meter llamadas de más.
- **Gemini puede devolver `null`, basura o JSON con ` ```json ` fences`.** **Nunca asumas que
  responde:** cada rama necesita **fallback determinista** (mostrar catálogo, seguir con el
  regex). Un "no entendí" seco o el silencio son bugs.
- **Cumplimiento:** el tier de **PAGO** de Gemini no entrena con los datos (ver
  `CUMPLIMIENTO-IA-WHATSAPP.md`). No cambies esto; solo tenlo presente al proponer más uso de IA.

### 4.1 Mejora fundacional (si aún no existe, es TU PRIMERA mejora)
Un **helper único** `llamarGemini(systemPrompt, userText, opts)` que centraliza las **dos**
llamadas (`asistir()` ~L482 y el clasificador ~L1052):
- `fetch` a `generativelanguage…:generateContent` con `x-goog-api-key` y timeout.
- **1 reintento con backoff corto** ante 429/503.
- **Parseo JSON tolerante:** quita ` ```json / ``` `, toma el primer bloque `{...}`, tolera
  comas colgantes; si aun así no parsea, **devuelve `null`** (nunca lanza).
- **Un solo default de modelo** (`gemini-flash-lite-latest`) — elimina el hardcode duplicado
  (~L487 y ~L1056).
- Loguea el fallo en `tiendas/varman/botErrores` (mejor esfuerzo).
- **Firma estable:** devuelve **objeto** ya parseado **o `null`**. Nadie asume que Gemini
  siempre responde.

Refactoriza los **dos call sites** para usarlo **sin cambiar el contenido de los prompts**.
Verifica que, con Gemini devolviendo basura o `null`, el bot **no se rompe** (degrada a
catálogo / regex). Esto convierte muchos "errores de Gemini" (que en realidad son plomería
frágil) en cero de un golpe.

---

## 5. De dónde sale la próxima mejora (backlog vivo)
**La BITÁCORA manda.** Su cola "Próximas" ya viene sembrada con el backlog priorizado (Tier
A→E), anclado en líneas reales del código y en los fallos de `BRIEF-GEMINI-1..5`. Si algún día
la cola queda vacía, genera candidatas nuevas mirando:
- Los **diálogos del BANCO** que aún no tengan test.
- Los **errores** en `tiendas/varman/botErrores` (si tienes acceso de lectura offline).
- `bot_n8n/fase2/BACKLOG-V6.md` y las notas de agente (`NOTA-AGENTE-*`).
Prioriza siempre **fiabilidad > corrección > cobertura > pulido/venta**, y **riesgo bajo**
antes que alto.

---

## 6. Casos de prueba (cómo se añaden)
El arnés (`tests/test-offline-v4.js`) ya extrae el código **real** del nodo Cerebro del JSON y
lo corre contra **Firestore real** con **WhatsApp/Gemini/Wompi mockeados**. Patrón:
- `correrCerebro(msj({ texto: '...', inter_id: '...', tipo: '...' }))` simula un mensaje.
- `check(nombre, condicion, extra)` asienta una verificación (suma a `ok`/`mal`).
- `mockGemini = { intent:'...', respuesta:'...' }` fuerza una respuesta canned de Gemini
  (ponlo a `null` para usar Gemini real). Úsalo para probar clasificación exacta **y** el
  caso "Gemini devuelve JSON inválido → el bot no se cae".
Cada mejora añade **al menos un caso**. Prueba el flag **OFF** (idéntico a hoy) y **ON**.

---

## 7. Anclas rápidas del código (para no buscar cada vez)
- **Flags existentes:** `BOT_ROBUSTEZ` (asistente Gemini), `WOMPI_PUB_KEY`/`WOMPI_PRV_KEY`
  (pago Wompi), `CATALOGO_NATIVO` + `WHATSAPP_CATALOG_ID` (catálogo nativo MPM),
  `BOT_MSGS_POR_MIN` (anti-spam). Patrón para un flag nuevo:
  `const FLAG_X = /^(on|1|true|si|s[ií])$/i.test(String($env.BOT_X || '').trim());`
- **Estados de sesión** (en `cerebro-v4.js`): `talla` → `datos` → `pago` → `comprobante`.
- **Call sites de Gemini:** `asistir()` ~L482 · clasificador (bloque "sin pedido en curso")
  ~L1024–1136, llamada ~L1052.
- **Helpers de talla/cantidad:** ~L54–99 (`parseCantidad`, `tallaAEUR`, `convEUR`,
  `detectarGenero`, `totalSes`).
- **Prompts y textos:** `textos.js` → `TEXTOS` (~L12), `GEMINI_SISTEMA` (~L198),
  `GEMINI_ASISTENTE` (~L206), helper `T(plantilla, vars)` (~L209).
- **Handoff determinista** (sin Gemini, en cualquier estado): regex `PIDE_HUMANO` ~L51,
  `hacerHandoff()` ~L506.
- **Dedup por `message_id`** (`yaProcesado`, ~L245): no lo rompas — WhatsApp entrega "al menos
  una vez".

---

## 8. Lo que NO tocas
- **Credenciales / `.env` / `credenciales/`** — jamás. Solo documentas variables nuevas.
- **El JSON `bot-varman.json`** a mano — siempre vía `src/` + build.
- **La VM / el deploy / `git push`** — es del dueño.
- **El contrato del pedido** sin pedirlo por escrito en `CAMBIOS-PEDIDOS.md`.
- **El cumplimiento de Gemini** (tier de pago) y **el token de WhatsApp** (solo header Bearer).

---

## 9. Definición de HECHO (por corrida)
`node workflows/build-v4-pedidos.js` corre sin error y regenera el JSON · la batería
`node tests/test-offline-v4.js` en **verde** con **un caso nuevo** · con el flag nuevo **OFF**
el bot = hoy (probado) · BITÁCORA actualizada (Hechas + Próximas) · `NOTA-MEJORA-<N>` dejada ·
línea de cierre impresa. **Una** mejora. Y paras.

---

## 10. Cómo te corren (headless — no lo cambies)
`bot_n8n/loop-mejoras.ps1` te llama en bucle; cada vuelta = **sesión nueva**. Tu continuidad es
la **BITÁCORA**: por eso SIEMPRE empiezas leyéndola y SIEMPRE terminas escribiéndola. Si el
runner te pasa un contexto extra (número de vuelta), ignóralo salvo para el nombre de la nota.
