# BRIEF — AGENTE 4 · Datos y tallas (conversión, cantidad, validación) · VarMan Crew · 2026-07-10

> **Para Claude Code.** Lee primero `BRIEF-GEMINI-0-COORDINACION.md`. Paralelo con otros 4.
> **Tu territorio:** en `workflows/src/cerebro-v4.js` los **helpers** (~L57–99:
> `parseCantidad`, `tallaAEUR`, `convEUR`, `detectarGenero`, `totalSes`), la **validación
> del estado `datos`** (`pareceEnvio`, ~L896–914) y la **parte determinista del estado
> `talla`** (regex/conversión, no las ramas de IA que son del Agente 2).

## Misión
Que el bot **capture bien la talla, la cantidad y los datos de envío** — que son el
origen de pedidos equivocados. La matemática de tallas la hace el CÓDIGO (no Gemini) para
que siempre sea correcta.

## Fallos que arreglas (BANCO-RESPUESTAS §0 y §14.1-3,5)
1. **Tallas 35–45:** verifica que TODO el bot use `3[5-9]|4[0-5]` y diga "35 a la 45"
   (regex + textos + los prompts que consumes). No deben quedar residuos de "36".
2. **Conversión nacional/US → EUR con género:** ya existe (`convEUR`/`tallaAEUR`), pero
   cúbrela bien: **nacional→EUR dama +1, hombre +2** (39 nacional hombre = 41 EUR); **US→EUR**
   aprox (US 10 hombre ≈ 43–44). Siempre **confirmar sistema y género** antes de fijar. Si
   el cliente "no sabe su talla", coordina con el Agente 2 para dar un tip de medición.
3. **Cantidad en cualquier momento (§14.3):** "quiero 2 pares" a mitad de flujo debe
   actualizar cantidad y total (ya hay lógica ~L619). Robustece `parseCantidad` (palabras
   y "par/pares/unidades") y define con el Agente 2 cómo tratar "quiero 2" **sin** la
   palabra "pares" (ambiguo con la talla → mejor confirmar, no adivinar). Asegura que el
   total correcto se refleje en Wompi, contra entrega, comprobante y el aviso al 320
   (todos usan `totalSes` — verifícalo).
4. **Validación de datos de envío (§backlog):** hoy vale con "15+ chars y un dígito". Súbelo
   a validar **nombre + ciudad + teléfono (7–10 dígitos)**. Si falta algo puntual, pide SOLO
   lo que falta (no repitas todo). Con el flag `BOT_ROBUSTEZ` OFF, conserva el criterio v5.
5. **"¿solo estoy pagando una?" (§14.5):** en el paso de pago la respuesta debe aclarar
   **cantidad y total reales** (coordina con el Agente 2: su respuesta de IA usa tu total).

## Tareas
1. Auditar y unificar el rango 35–45 (código + textos que te tocan).
2. Endurecer la conversión de tallas con los casos del BANCO (sistemas y géneros) y
   mensajes claros cuando falta el género.
3. Mejorar `parseCantidad` y confirmar que el total se propaga a todos los cierres de pedido.
4. Validación de envío por campos (nombre/ciudad/teléfono) con "pide solo lo que falta".
5. Dejar la matemática en el código; **no** delegar la conversión a Gemini.

## Casos de prueba a añadir (`tests/test-offline-v4.js`)
- "39 nacional, hombre" → fija 41 EUR. "39 nacional, dama" → 40 EUR. "10 US hombre" → 43–44.
- "39" sin sistema → pide sistema+género (no adivina).
- "2 pares" / "dos pares" (al arrancar y a mitad de flujo) → total ×2 en el pedido y aviso.
- Datos de envío incompletos (sin teléfono) → pide solo el teléfono, no todo de nuevo.
- Flag OFF → validación y comportamiento v5 exactos.

## No toca
Los prompts de Gemini (`GEMINI_SISTEMA`/`GEMINI_ASISTENTE`) ni las ramas de IA de los
estados (Agente 2) · el clasificador (Agente 1) · el match de marca (Agente 3) · la
plomería de Gemini (Agente 5).

## Hecho cuando
Build OK, tests en verde con tus casos, tallas/cantidad/datos capturados sin errores y el
total correcto en todos los cierres. Nota `NOTA-GEMINI-4-2026-07-10.md`.
