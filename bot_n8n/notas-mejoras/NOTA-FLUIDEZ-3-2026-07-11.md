# NOTA FLUIDEZ 3 — Anti-repetición de plantilla (flag BOT_FLUIDEZ_RECONDUCE) · 2026-07-11

**Backlog fluidez: [F3] "nunca 'no entendí' seco" + mandato del dueño: fluidez ante
mensajes INCOHERENTES. Anclado en el caso real 3 (la plantilla de talla salió 4
veces idéntica) y el caso 1 (el bloque de pago re-enviado).**

## Qué cambié
Helper **`pushReask(paso, msgCompleto, msgBreve)`** en `cerebro-v4.js`, bajo el
flag existente **`BOT_FLUIDEZ_RECONDUCE`** (default **OFF** = hoy): cuando un paso
va a repetir su MISMA plantilla de "no entendí", desde la **2ª vez seguida** manda
una **variante breve con salidas reales** en vez del mismo muro:

- Racha en la sesión (`repEstado`/`repN`, vía `fsMerge`); se resetea sola en
  `guardarSes` (cualquier avance del flujo la limpia — las ramas arrastran la
  sesión con `Object.assign`, así que el reset vive en el guardado central; sin
  el flag esos campos nunca existen y el `delete` es no-op).
- Cableado en los 6 puntos de re-pregunta: talla ×3 (`tallaInvalida` en cm
  inválido, rama IA degenerada y rama sin IA), datos (`datosIncompletos`/
  `datosFaltan`), pago (re-envío de botones → ahora texto breve, caso 1) y
  comprobante (`pideComprobante`).
- Textos nuevos: `reintentoTalla`, `reintentoDatos`, `reintentoPago`,
  `reintentoComprobante` — 1-2 frases, UNA pregunta, con salidas *catálogo* /
  *asesor* ("asesor" ya dispara el handoff determinista `PIDE_HUMANO`).
- **"catálogo" como mensaje completo** se sumó a `PIDE_OTRO_MODELO` (la salida
  que la variante anuncia tiene que funcionar): reencamina al catálogo y cierra
  la sesión.

## Tests (sección 39, deterministas sin IA)
OFF: el muro se repite idéntico 2 veces (caso 3, hoy). ON (7): 1ª vez plantilla
completa · 2ª vez variante breve (catálogo/asesor, sin muro) · la salida
"catálogo" reencamina de verdad · datos 2ª vez breve · pago 2ª vez texto breve sin
re-enviar botones · comprobante 2ª vez breve · dar la talla tras un fallo avanza
normal y limpia el contador.

Resultado: **205 PASS · 0 FAIL** (antes 197; +8). Nota: la 1ª corrida salió
204/1 — el contador se arrastraba al avanzar de paso (inocuo pero sucio); se
arregló con el reset en `guardarSes`.

## Cómo revertir
1. `workflows/respaldo/bot-varman.pre-fluidez-3.json` sobre `workflows/bot-varman.json`.
2. Quitar `pushReask` + sus 6 llamadas (volver a `mensajes.push(...)` directo),
   el `delete doc.repEstado/repN` de `guardarSes`, el alternativo `^catálogo$`
   de `PIDE_OTRO_MODELO`, los 4 textos `reintento*` y la sección 39.
3. `node workflows/build-v4-pedidos.js`.

## ⚙️ Entorno
Node portable en `bot_n8n/herramientas/node/node.exe`. Ver `NOTA-MEJORA-1`.
