# Nota del AGENTE 1 · Ronda 2 · 2026-07-06 (tarde/noche)

**Misión: re-import v4.1 + arranque post-reinicio + Callback URL + tareas 2-4 del
brief ronda 2. TODO HECHO.** El PC se había reiniciado por la instalación de Docker
Desktop (túnel y n8n caídos).

## 1. Re-import y arranque (tarea 1)

- Con n8n APAGADO (verificado: puerto 5678 cerrado, ningún node de n8n):
  `n8n import:workflow` del v4.1 + `VarmanBotV4Ped01 --active=false` +
  `VarmanEcoBot0001 --active=true`. (La CLI avisa que `update:workflow` está
  deprecado a favor de `publish/unpublish:workflow` — funciona igual.)
- `start-tunnel.ps1` → URL nueva: `https://provider-ward-metropolitan-bond.trycloudflare.com`
  (en `tunnel-url.txt`). Luego `start-n8n.ps1` (puerto arriba en ~40s).
- GET challenge por el túnel: **200 + challenge devuelto con token bueno, 403 con
  token malo**. (El primer intento dio timeout — era el registro de webhooks de
  30-60s; reintentar es la respuesta correcta.)
- **Callback URL actualizada en Meta y verificada** (con Cristhian en el navegador:
  la sesión del developer console era la del negocio, no la personal). El campo
  **messages** sigue suscrito. Detalles y trampas nuevas de la interfaz de Meta
  anotadas en `briefs\GUIA-META-CALLBACK.md` (interfaz inline, el token se vacía
  al editar la URL, y el **App ID correcto es 2168913153950288** — el brief viejo
  tenía un dígito malo).

## 2. Tests offline (tarea 2)

`node tests\test-offline-v4.js` → **32/32 PASS** después del re-import, y OTRA VEZ
32/32 después de la parametrización de textos (punto 3).

## 3. Textos parametrizados (tarea 3)

- **Nuevo `workflows\src\textos.js`**: TODOS los textos que ve el cliente/dueño
  (objeto `TEXTOS` con ~30 entradas), el prompt de Gemini (`GEMINI_SISTEMA`) y el
  helper `T(plantilla, vars)` que reemplaza `{placeholders}`.
- `cerebro-v4.js` quedó solo con lógica; usa `TEXTOS.*` / `T(...)`.
- `build-v4-pedidos.js` pega `textos.js` ANTES del cerebro en el mismo nodo Code.
- **El contenido de los textos NO cambió** (regla del brief) — lo prueban los
  asserts de la suite, que comparan contra los textos reales.
- Respaldo del JSON anterior:
  `workflows\respaldo\bot-whatsapp-v4-pedidos.2026-07-06-v41-pre-textos.json`.
- ⚠ **El JSON se regeneró DESPUÉS del re-import** → la copia dentro de n8n vuelve a
  ser más vieja que el archivo (misma conducta, distinto código). NO re-importé de
  nuevo para no tumbar n8n recién verificado con Meta; el paso 3 del
  `RUNBOOK-CORTE.md` ya re-importa el día del corte y eso lo cubre. Si alguien
  necesita el v4 al día en n8n antes del corte: apagar n8n → re-import → prender.

## 4. Plantilla (tarea 4)

`plantilla\03-bot.md` escrito: qué es genérico, qué está hardcodeado de VarMan
(archivo+línea), tabla completa del `.env`, montaje de cero en 9 pasos con tiempos,
y las trampas conocidas. Estilo alineado con `02-app.md`.

## Estado al cerrar

- Túnel y n8n CORRIENDO (2 ventanas de PowerShell abiertas — no cerrarlas).
- Eco ACTIVO y verificado con Meta (URL nueva); v4.1 IMPORTADO e INACTIVO.
- No toqué: `.env` (solo lectura), `deploy\`, `app\`, `web\`, `fase2\`,
  archivos de otros agentes en `plantilla\`.

## Pendientes que siguen vivos

- Los de Cristhian del brief ronda 2 (reglas Firestore, subir app/web, PAGO_* reales
  → avisar para reiniciar n8n, fotos/precios, Oracle+dominio, email de Meta).
- E2E de descarga REAL de comprobante: sigue para el día del corte (RUNBOOK paso 5).
