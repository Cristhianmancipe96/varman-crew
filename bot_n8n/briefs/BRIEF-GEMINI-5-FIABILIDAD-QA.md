# BRIEF — AGENTE 5 · Fiabilidad de Gemini + QA/integración · VarMan Crew · 2026-07-10

> **Para Claude Code.** Lee primero `BRIEF-GEMINI-0-COORDINACION.md`. Eres el agente
> **base + QA**: arrancas dejando el terreno estable y cierras integrando a todos.
> **Tu territorio:** en `workflows/src/cerebro-v4.js` la **plomería** de las llamadas a
> Gemini (crear el helper único), `workflows/build-v4-pedidos.js` y
> `tests/test-offline-v4.js`. **NO** cambias el CONTENIDO de los prompts (son de 1 y 2) ni
> la lógica de negocio de cada frente.

## Misión
Muchos "errores de Gemini" no son del modelo: son **plomería frágil** (dos llamadas
duplicadas, `JSON.parse` que revienta con ```json, sin reintento ante 429/503). Céntrala en
un solo helper robusto y blinda los tests. Luego integra a los 4 agentes y deja todo verde.

## FASE 0 — Base (córrela PRIMERO, antes que 1–4)
1. **Helper único `llamarGemini(systemPrompt, userText, opts)`** (en `cerebro-v4.js`, o en
   un nuevo `src/gemini.js` que agregues al `build-v4-pedidos.js`):
   - `fetch` a `generativelanguage…:generateContent` con `x-goog-api-key` y timeout.
   - **1 reintento con backoff corto** ante 429/503 (el tier gratis los da; ver
     `CUMPLIMIENTO-IA-WHATSAPP.md`).
   - **Parseo JSON tolerante:** quita fences ```json / ```; toma el primer bloque `{...}`;
     tolera comas colgantes; si aun así no parsea, **devuelve `null`** (no lanza).
   - Loguea el fallo en `tiendas/varman/botErrores` (mejor esfuerzo).
   - Firma estable (contrato del brief maestro): devuelve **objeto** o **`null`**.
2. **Refactoriza los DOS call sites** para usar el helper, **sin tocar los prompts**:
   - `asistir()` (~L482) → `await llamarGemini(GEMINI_ASISTENTE, texto, {temperature:0.2, maxTokens:220})`.
   - Clasificador (~L1052) → `await llamarGemini(GEMINI_SISTEMA, texto, {temperature:0.3, maxTokens:200})`.
   - Deja el **default del modelo en UN solo lugar** (`gemini-flash-lite-latest`) y elimina
     el hardcode duplicado (~L487 y ~L1056).
3. Verifica que, con Gemini devolviendo basura o `null`, el bot **no se rompe** (los frentes
   1–4 harán su fallback; tú garantizas que el helper nunca lanza).

> Entrega esta Fase 0 y avisa: los Agentes 1 y 2 construyen SOBRE este helper.

## FASE 2 — QA / integración (córrela AL FINAL, después de 1–4)
4. Corre `node workflows/build-v4-pedidos.js` + `node tests/test-offline-v4.js`. Resuelve
   choques entre frentes (mismo archivo, distinta zona).
5. **Sección nueva de tests "diálogos reales del BANCO":** simula el recorrido completo con
   los guiones del BANCO-RESPUESTAS: saludo → "¿son originales?" → "¿tienen Jordan?" →
   talla nacional con género → "2 pares" → datos de envío → pago (Wompi mock y contra
   entrega Bogotá). Deja la batería **en verde**.
6. **Prueba de resiliencia:** mockea Gemini con 429 y con JSON inválido y verifica que el
   bot degrada bien (catálogo / fallback), sin dead-ends ni respuestas dobles (el dedup por
   `message_id` ya existe — no lo rompas).
7. Actualiza `bot_n8n/LEEME-BOT.txt` (solo tú) con el estado final y deja
   `NOTA-GEMINI-5-2026-07-10.md` resumiendo el helper, los flags nuevos de los 5 frentes y
   cómo revertir.

## No toca
El **contenido** de `GEMINI_SISTEMA`/`GEMINI_ASISTENTE` (Agentes 1 y 2) · la lógica de marca
(3) · la conversión de tallas/validación (4). Tú pones la plomería, los tests y la integración.

## Hecho cuando
Fase 0 entregada temprano; al final: build OK, **batería completa en verde** con la sección
del BANCO y las pruebas de resiliencia, `LEEME-BOT.txt` actualizado y la nota lista.
