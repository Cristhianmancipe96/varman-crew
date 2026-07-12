# NOTA MEJORA 5 — Normalización de marca (flag BOT_MARCA_NORM) · 2026-07-11

## Qué cambié
El clasificador, cuando devuelve `intent:"buscar_marca"`, ahora puede **corregir
typos de marca** de forma determinista antes de buscar en el catálogo.

- `workflows/src/cerebro-v4.js`:
  - nuevo flag `FLAG_MARCA_NORM` (lee `BOT_MARCA_NORM`).
  - nuevo mapa `MARCAS_CANON` + `MARCA_FIX` + helper `corregirMarca(m)`: mapea
    errores comunes a la marca canónica del catálogo. Curado y conservador — NO
    adivina: solo typos conocidos (`addidas/adiddas/adias → adidas`,
    `naik/naiki/nyke → nike`, `jordans/yordan → jordan`, `niu balance/newbalance →
    new balance`, `rebok/rebook → reebok`, `convers/conberse → converse`,
    `pumma → puma`, `vanz → vans`, `under armor → under armour`, `filla → fila`).
    Lo que no está en el mapa pasa igual.
  - en el clasificador: `marcaBuscada = FLAG_MARCA_NORM ?
    corregirMarca(normMarca(out.marca)) : normMarca(out.marca)`.

Con el flag **OFF**, se usa solo `normMarca` (minúsculas/sin acentos) **igual que hoy**.

## Por qué
El match del catálogo es `normMarca(p.marca).includes(marcaBuscada)`. Si Gemini
devuelve la marca mal escrita ("addidas"), `normMarca` no lo corrige y NO matchea
"adidas" → el cliente ve "no tengo referencias marcadas" aunque sí las haya. B1 pide
a Gemini corregir ortografía, pero no siempre lo hace; esta es la **red determinista**
para que un typo no cueste una venta. La matemática/normalización la hace el código,
no Gemini (regla de oro: el bot no adivina).

## Flag nueva
**`BOT_MARCA_NORM`** — default **OFF**.
- OFF (hoy): `marcaBuscada = normMarca(out.marca)`.
- ON: además `corregirMarca(...)` (typos → canónico).

## Variable de entorno (documentar, NO tocar .env)
Para activar en la VM: `BOT_MARCA_NORM=on`.

## Tests
`tests/test-offline-v4.js` sección **32** (Gemini mockeado con marca "addidas"):
- flag **OFF**: no matchea → respuesta honesta ("no tengo referencias marcadas"). = hoy.
- flag **ON**: `addidas → adidas` → matchea y manda fotos. (Fallaba hoy — el rojo.)

Resultado: **149 PASS · 0 FAIL** (antes 147; +2 checks).

## Cómo revertir
1. Copiar `workflows/respaldo/bot-varman.pre-mejora-5.json` sobre `workflows/bot-varman.json`.
2. En `workflows/src/cerebro-v4.js` quitar `FLAG_MARCA_NORM`, `MARCAS_CANON`/`MARCA_FIX`/
   `corregirMarca`, y volver el clasificador a `marcaBuscada = normMarca(out.marca || '')`.
   Quitar la sección 32 + el delete-list de `tests/test-offline-v4.js`.
3. `node workflows/build-v4-pedidos.js`.

El respaldo `pre-mejora-5.json` es el estado exacto de antes de esta mejora (incluye
A1 + B1 + B3 + C2).

## Idea futura (no ahora)
Si aparecen typos no cubiertos, ampliar `MARCAS_CANON`. Un match difuso (Levenshtein)
sería más general pero **adivina** — evitarlo salvo con umbral muy estricto y flag.

## ⚙️ Entorno
Node portable en `bot_n8n/herramientas/node/node.exe` (no está en PATH). Ver
`notas-mejoras/NOTA-MEJORA-1-2026-07-11.md`.
