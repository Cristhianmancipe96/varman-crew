# NOTA MEJORA 1 — Helper único `llamarGemini()` (fiabilidad de Gemini) · 2026-07-11

## Qué cambié
Centralicé las **dos** llamadas a Gemini del Cerebro en un solo helper
`llamarGemini(systemPrompt, userText, opts)` (en `workflows/src/cerebro-v4.js`).

- **Antes:** dos bloques `H.httpRequest`→`JSON.parse` casi idénticos, cada uno con
  el modelo `gemini-flash-lite-latest` **hardcodeado** (en `asistir()` ~L482 y en el
  clasificador ~L1052) y un `JSON.parse` crudo que **se caía** si Gemini devolvía el
  JSON envuelto en fences (bloque de código ```json```).
- **Ahora:**
  - `asistir()` y el clasificador llaman al helper (mismos prompts, mismos
    `temperature`/`maxOutputTokens`/`timeout`, misma forma del JSON de salida).
  - **Un solo default de modelo:** `GEMINI_MODEL_DEFAULT = 'gemini-flash-lite-latest'`.
    La variable `GEMINI_MODEL` del `.env` lo sigue pudiendo sobreescribir.
  - **Parseo JSON tolerante** (`parseJsonTolerante`): quita fences ```json```,
    recorta al primer bloque `{...}`, tolera comas colgantes; si aun así no parsea,
    devuelve `null`.
  - **1 reintento corto (700 ms)** SOLO en 429/503 (cupo gratis / sobrecarga).
  - **Nunca lanza:** devuelve objeto parseado o `null`. Loguea el fallo en
    `tiendas/varman/botErrores` (mejor esfuerzo).

Los prompts (`GEMINI_SISTEMA`, `GEMINI_ASISTENTE`) y la forma del JSON de salida
(`intent,respuesta,marca,ref,talla` / `handoff,dato,respuesta`) **no cambiaron**.
Es plomería equivalente + más robusta.

## Por qué
Muchos "errores de Gemini" eran en realidad plomería frágil: dos copias del mismo
código, sin reintento, y un `JSON.parse` que se caía con los fences ```json``` que
los modelos añaden a veces **pese a** `responseMimeType`. Con esos fences el
clasificador degradaba **todo** al catálogo genérico (perdía la intención real, p.
ej. una búsqueda de marca). El helper lo arregla de un golpe y deja base para las
mejoras B/C que también usan Gemini.

## Flag nueva
**Ninguna.** A1 no lleva flag (plomería equivalente, sin riesgo para lo que vende).
La red de seguridad es la batería de tests + que con basura/`null` de Gemini el bot
degrada igual que antes (catálogo / regex determinista).

## Variable de entorno
Sin variables nuevas. `GEMINI_MODEL` (ya existente) sigue mandando; si falta, el
único default es `gemini-flash-lite-latest`.

## Tests
`tests/test-offline-v4.js` sección **28** (nueva):
- **28a:** Gemini basura no-JSON en el clasificador → no se cae, degrada a catálogo.
- **28b:** Gemini responde JSON con fences ```json``` → el parseo tolerante clasifica
  la marca y manda fotos. **Este caso fallaba antes del helper** (era el rojo que
  demuestra el bug).
- **28c:** con `BOT_ROBUSTEZ` ON, basura en `asistir()` → helper `null` → cae al
  texto determinista v5 de talla.

Para inyectar respuestas crudas de Gemini, el mock del arnés ahora acepta un
**string** (se devuelve tal cual) además de un objeto (se serializa a JSON).

**Además** (para dejar el suite en verde) hice **robustos a la deriva de datos** 3
asserts que hardcodeaban precios del catálogo (Ref 01 y Ref 05): ahora leen el
precio del catálogo **en vivo** (`docCat`/`fmtP`). Cristhian cambió esos precios en
la app durante la corrida y rompieron 3 tests que **no** tenían que ver con A1.

Resultado: **138 PASS · 0 FAIL** (antes 134; +4 checks nuevos de la sección 28).

## Cómo revertir
1. Restaurar el JSON: copiar `workflows/respaldo/bot-varman.pre-mejora-1.json`
   sobre `workflows/bot-varman.json`.
2. Descartar los cambios de `workflows/src/cerebro-v4.js` (quitar el bloque
   `parseJsonTolerante`/`llamarGemini` y volver los 2 call sites a su versión
   previa) y de `tests/test-offline-v4.js` (sección 28 + helpers `docCat`/`fmtP` +
   los 3 asserts de precio).
3. `node workflows/build-v4-pedidos.js` para regenerar.

El respaldo `pre-mejora-1.json` es el estado exacto de antes de esta mejora.

## ⚙️ Entorno (IMPORTANTE para las próximas vueltas)
Esta máquina **no tenía Node instalado**. Se dejó **Node portable** (no toca el
sistema, no está en el PATH global) en:

    bot_n8n/herramientas/node/node.exe      (Node v24.18.0 LTS)

Para build/tests, prepende esa carpeta al PATH de la sesión de PowerShell:

    $env:PATH = 'C:\Users\andre\OneDrive\Documentos\Proyecto_zapatos\bot_n8n\herramientas\node;' + $env:PATH
    node workflows\build-v4-pedidos.js
    node tests\test-offline-v4.js

`herramientas/` está en `.gitignore`. Si el dueño instala Node en el sistema, esta
carpeta se puede borrar.
