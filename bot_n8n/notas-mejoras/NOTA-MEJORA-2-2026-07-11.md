# NOTA MEJORA 2 — Few-shot en el clasificador (flag BOT_CLASIF_V2) · 2026-07-11

## Qué cambié
El clasificador de intenciones (Gemini, cuando NO hay pedido en curso) ahora puede
usar un prompt con **ejemplos few-shot**, detrás del flag `BOT_CLASIF_V2`.

- `workflows/src/textos.js`: nuevo `GEMINI_SISTEMA_FEWSHOT = GEMINI_SISTEMA + bloque
  de ejemplos`. Los ejemplos (sacados de casos reales del BANCO) anclan el tono
  colombiano sin mexicanismos y los casos difíciles:
  - saludo → `saludo`
  - "esos sí son originales?" → `otro`, respuesta EN POSITIVO (calidad 1.1 + precio),
    **sin negar ni afirmar** autenticidad de marca.
  - "tienen Jordan?" → `buscar_marca` con `marca:"jordan"`.
  - "a cuánto valen?" → `pregunta_precio`.
  - multi-intención "tienen adidas y a cómo?" → `buscar_marca` + precio en la respuesta.
  - "me avisan cuando llegue la 40 de la ref 05?" → `aviso_stock` con `ref`/`talla`.
  La **forma del JSON** (`intent,respuesta,marca,ref,talla`) queda EXACTA.
- `workflows/src/cerebro-v4.js`:
  - nuevo flag `FLAG_CLASIF_V2` (lee `BOT_CLASIF_V2`).
  - el clasificador elige el prompt: `SISTEMA = FLAG_CLASIF_V2 ? GEMINI_SISTEMA_FEWSHOT
    : GEMINI_SISTEMA`. Con el flag **OFF**, usa el prompt v1 **idéntico a hoy**.

## Por qué
El clasificador v1 a veces confunde casos comunes del negocio (preguntas de
autenticidad, marcas escritas de mil formas, "¿a cómo?", mensajes con 2 intenciones).
Los ejemplos few-shot son la palanca más barata y directa para subir la precisión sin
cambiar el contrato de salida. Va detrás de flag para que Cristhian lo pueda **comparar
(A/B)** en producción y revertir en un paso si no mejora.

## Flag nueva
**`BOT_CLASIF_V2`** — default **OFF**.
- OFF (hoy): clasificador usa `GEMINI_SISTEMA` (v1). Comportamiento idéntico.
- ON: clasificador usa `GEMINI_SISTEMA_FEWSHOT` (v1 + ejemplos).
Patrón igual que los demás flags: `on|1|true|si|sí`.

## Variable de entorno (documentar, NO tocar .env)
Para activar en la VM: `BOT_CLASIF_V2=on`. Sin la variable (o cualquier otro valor),
el bot se comporta EXACTO como hoy.

## Tests
`tests/test-offline-v4.js` sección **29** (nueva). El mock del arnés ahora **captura el
cuerpo enviado a Gemini** (`geminiReqs`) para inspeccionar el `system_instruction`:
- flag **OFF**: el prompt del clasificador es el v1 (sin el bloque few-shot). = hoy.
- flag **ON**: el prompt incluye el bloque `EJEMPLOS (few-shot...)` (Jordan, ¿originales?),
  **y conserva** la forma del JSON (`intent`/`buscar_marca`/`aviso_stock`). Este caso
  **fallaba** antes del cambio (era el rojo que lo demuestra).

Nota: la calidad real de clasificación depende del modelo y no es determinista, así que
el test valida el **cableado del flag + el contenido del prompt**, no la salida de Gemini.
Cristhian valida la mejora de precisión en producción con el flag ON.

### Robustez del arnés (auto-sanable)
Durante esta corrida detecté que la **limpieza previa** del test no borraba el `botRate`
de TEST_WA3 ni los `listaEspera`/`notificacionesPendientes` de prueba. Si una corrida se
interrumpe antes de su limpieza final, la siguiente heredaba esa basura y fallaban 3
checks de las secciones 16-17 (contaminación, no un bug real). Endurecí la limpieza
previa para barrer esos docs de los 3 números de prueba → el suite es **auto-sanable**
frente a corridas interrumpidas (importante para el loop nocturno).

Resultado: **141 PASS · 0 FAIL** (antes 138; +3 checks de la sección 29).

## Cómo revertir
1. Restaurar el JSON: copiar `workflows/respaldo/bot-varman.pre-mejora-2.json` sobre
   `workflows/bot-varman.json`.
2. Descartar los cambios de `workflows/src/textos.js` (quitar `GEMINI_SISTEMA_FEWSHOT`),
   `workflows/src/cerebro-v4.js` (quitar `FLAG_CLASIF_V2` y volver `SISTEMA` a
   `GEMINI_SISTEMA`) y de `tests/test-offline-v4.js` (sección 29 + `geminiReqs` + la
   limpieza previa endurecida).
3. `node workflows/build-v4-pedidos.js` para regenerar.

El respaldo `pre-mejora-2.json` es el estado exacto de antes de esta mejora (ya incluye
la Mejora 1 / A1).

## ⚙️ Entorno
Recordatorio: Node portable en `bot_n8n/herramientas/node/node.exe` (no está en PATH).
Ver `notas-mejoras/NOTA-MEJORA-1-2026-07-11.md`.
