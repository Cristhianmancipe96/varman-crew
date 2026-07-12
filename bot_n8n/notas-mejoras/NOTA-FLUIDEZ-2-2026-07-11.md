# NOTA FLUIDEZ 2 — Menos burbujas de golpe en el catálogo (flag BOT_FLUIDEZ_CATALOGO) · 2026-07-11

**Backlog fluidez: [F1] — "manda muchas burbujas de golpe (parece spam)".**

## Qué cambié (`workflows/src/cerebro-v4.js`)
Con el flag **`BOT_FLUIDEZ_CATALOGO`** (default **OFF** = hoy exacto):

1. **Tanda de 3 fotos** (antes 5): `TANDA_ACTIVA = flag ? 3 : TANDA_FOTOS`, usada
   en `tandaCatalogo`, `listaElegir` y los cálculos de intro "{n} de {total}".
   La paginación "Ver más" sigue funcionando sola (offsets 3, 6, 9…).
2. **Sin burbuja de intro ni de fallback**: el intro y las líneas "• *Ref NN*"
   (refs con foto de app) van DENTRO del body de la ÚNICA lista "Elige tu
   referencia" (`listaElegir` ganó un parámetro opcional `bodyTexto`; el body
   se recorta a 1024 como siempre).

**Resultado: máx 4 burbujas por tanda (3 fotos + 1 lista) vs hasta 8 de hoy.**
El flujo no cambia: elegir de la lista arranca el pedido igual; el catálogo
nativo (MPM) no se toca.

## Tests (sección 38, fixture determinista)
- OFF: la tanda de hoy = 7 burbujas (intro + 4 fotos + fallback + lista).
- ON: 4 burbujas (3 fotos + 1 lista) · la lista lleva el intro en el body y
  pagina de a 3 (`cat:deportivas:3`) · la Ref 04 (foto de app) va dentro del
  body sin burbuja extra · elegir de la lista arranca el pedido igual.

Resultado: **197 PASS · 0 FAIL** (antes 192; +5).

## Cómo revertir
1. `workflows/respaldo/bot-varman.pre-fluidez-2.json` sobre `workflows/bot-varman.json`.
2. Quitar `FLAG_FLUIDEZ_CATALOGO`/`TANDA_ACTIVA` (y devolver los usos a
   `TANDA_FOTOS`), el bloque ON de `tandaCatalogo` y el parámetro `bodyTexto`
   de `listaElegir`; quitar la sección 38 y el flag del delete-list del test.
3. `node workflows/build-v4-pedidos.js`.

## ⚙️ Entorno
Node portable en `bot_n8n/herramientas/node/node.exe`. Ver `NOTA-MEJORA-1`.
