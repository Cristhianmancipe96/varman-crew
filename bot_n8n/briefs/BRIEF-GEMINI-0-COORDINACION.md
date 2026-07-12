# BRIEF MAESTRO — 5 agentes Claude Code para arreglar la lógica de Gemini · VarMan Crew · 2026-07-10

> **Léelo ANTES de repartir el trabajo.** Este archivo coordina a los 5 agentes.
> Cada agente tiene además su propio brief: `BRIEF-GEMINI-1..5`. Cada agente debe
> leer PRIMERO este maestro, luego el suyo, y de contexto: `bot_n8n/LEEME-BOT.txt`,
> `bot_n8n/briefs/BANCO-RESPUESTAS-V1-2026-07-09.md` y
> `bot_n8n/briefs/CAMBIOS-PEDIDOS.md`.

## Por qué estamos aquí
El bot v6 ya está **en producción** (VM de Google Cloud, número +57 304 291 6972) y
atendió conversaciones reales. En esas pruebas la parte de **Gemini** (la que
entiende lenguaje libre) mostró **demasiados errores**: clasifica mal, repite
plantillas, confunde marcas, se traba con datos fuera de lugar y a veces cae a un
"no entendí" cuando el JSON de Gemini no se puede leer. Estos 5 briefs reparten el
arreglo en 5 frentes que **casi no se solapan**, para poder trabajar en paralelo.

## Arquitectura en 6 líneas (para no romper nada)
- El workflow de n8n **se genera desde código**: se edita `workflows/src/*.js` y se
  corre `node workflows/build-v4-pedidos.js`. **NUNCA se edita el JSON a mano.**
- Nodo "Cerebro" = `src/textos.js` + `src/cerebro-v4.js` pegados (en ese orden).
- **Dos prompts de Gemini**, ambos en `src/textos.js`:
  - `GEMINI_SISTEMA` = clasificador de intención (cuando **NO** hay pedido en curso).
  - `GEMINI_ASISTENTE` = asistente a mitad de flujo (flag `BOT_ROBUSTEZ`).
- Dos llamadas HTTP a Gemini en `src/cerebro-v4.js`: `asistir()` (~L482) y el
  clasificador dentro del bloque "sin pedido en curso" (~L1052).
- Prueba: `node tests/test-offline-v4.js` (Firestore real; WhatsApp/Gemini/Wompi
  mockeados). Hoy pasa en verde; **debe seguir en verde**.

## 🔴 Reglas de oro (iguales para los 5)
1. **Aditivo + reversible.** Nada puede romper el flujo de pedido que ya vende. Si
   hay riesgo, va detrás de un flag; si el flag está OFF, el bot se comporta como hoy.
2. **Editar `src/`, regenerar con el build.** Prohibido tocar `bot-varman.json` a mano.
3. **Dejar los tests en VERDE** y **agregar casos** de tu frente (usa los diálogos
   reales del BANCO DE RESPUESTAS). Un frente sin test nuevo no está terminado.
4. **No toques credenciales ni `.env`** (solo se documentan variables nuevas,
   comentadas). Nada de `credenciales/` sale de la carpeta.
5. **Respeta tu territorio** (mapa abajo). Si necesitas algo del territorio de otro,
   pídelo por escrito al final de tu nota; no lo edites tú.
6. Al terminar: deja una nota corta `NOTA-GEMINI-<n>-2026-07-10.md` en `bot_n8n/`
   con qué cambiaste, qué flags añadiste y qué tests agregaste.

## Mapa de propiedad (para que NO se pisen)
| Agente | Frente | Archivos / funciones que POSEE | No toca |
|---|---|---|---|
| **1** | Clasificador de intención (sin pedido en curso) | `textos.js`→`GEMINI_SISTEMA`; `cerebro-v4.js`→ bloque "sin pedido en curso" (~L1024–1136), salvo la sub-rama de marca (del Agente 3) | `GEMINI_ASISTENTE`, estados de pedido, helpers de talla |
| **2** | Asistente a mitad de flujo (robustez) | `textos.js`→`GEMINI_ASISTENTE` + textos `paso*`; `cerebro-v4.js`→`asistir()` y las ramas `asist` dentro de los estados talla/datos/pago/comprobante | `GEMINI_SISTEMA`, clasificador, conversión de tallas, marca |
| **3** | Match de marca/modelo + reenviar foto al 320 | `cerebro-v4.js`→ ramas `buscar_marca` (~L1079) y `marca:` (~L785) + función de filtrado por marca + nueva capacidad "insiste/foto→320"; textos de marca en `textos.js` | clasificador general (solo consume `intent`), estados de pago |
| **4** | Datos y tallas (conversión, cantidad, validación de envío) | `cerebro-v4.js`→ helpers L57–99 (`parseCantidad`,`tallaAEUR`,`convEUR`,`detectarGenero`,`totalSes`) + validación en estado `datos` (`pareceEnvio`) + estado `talla` (parte determinista) | prompts de Gemini, clasificador, marca |
| **5** | Fiabilidad de Gemini + QA/integración | **base:** `cerebro-v4.js`→ helper único `llamarGemini()` + parseo JSON robusto + reintentos; **QA:** `tests/test-offline-v4.js`, `build-v4-pedidos.js` | los prompts (son de 1 y 2), la lógica de negocio de cada frente |

## Cómo correr los 5 SIN perder trabajo (importante: OneDrive)
Este proyecto vive en OneDrive y ya hubo **pérdidas por editar en paralelo**. Elige
UNA de estas dos formas:

**Opción A — con git (recomendada si el repo está en git):** un *worktree* por agente.
```
git worktree add ../vm-agente1 -b fix/gemini-1
git worktree add ../vm-agente2 -b fix/gemini-2   # ... 3, 4, 5
```
El **Agente 5** hace primero su "base" (helper `llamarGemini` + arnés de pruebas) y
lo mergea; los agentes 1–4 ramifican desde ahí. Al final, el Agente 5 mergea 1–4,
corre el build + los tests y resuelve choques.

**Opción B — sin git (más simple, 2 tandas):**
1. **Tanda 1:** corre SOLO el **Agente 5 – base** (crea `llamarGemini()`, endurece el
   parseo JSON, prepara los tests). Verifica verde. Cierra.
2. **Tanda 2:** corre **1, 2, 3 y 4** (uno tras otro, o en paralelo si son sesiones
   separadas que NO guardan el mismo archivo a la vez). Cada uno: edita su zona →
   `node workflows/build-v4-pedidos.js` → `node tests/test-offline-v4.js` verde →
   cierra.
3. **Cierre:** corre **Agente 5 – QA** (integra, corre todo, agrega los casos del
   BANCO, deja la batería verde y el JSON regenerado).

En ambos casos: **el que toca, reconstruye y corre los tests antes de soltar.**

## Contrato compartido: el helper `llamarGemini()` (lo crea el Agente 5 primero)
Para no duplicar plomería ni el parseo frágil, el Agente 5 deja UNA función que los
Agentes 1 y 2 usan:
```
// Llama a Gemini y devuelve un OBJETO ya parseado, o null si falla (timeout, 429,
// JSON inválido). Nunca lanza. Reintenta 1x con backoff corto en 429/503.
async function llamarGemini(systemPrompt, userText, opts) // opts: {temperature, maxTokens}
```
- Devuelve `null` de forma segura → cada frente decide su fallback (mostrar catálogo,
  seguir con el regex determinista, etc.). **Nadie asume que Gemini siempre responde.**
- El Agente 1 lo usa para el clasificador; el Agente 2 para `asistir()`. Mientras el
  Agente 5 no lo entregue, 1 y 2 codifican contra ESTA firma (no reimplementan el fetch).

## Definición de "HECHO" (global)
- `node workflows/build-v4-pedidos.js` corre sin error y regenera el JSON.
- `node tests/test-offline-v4.js` en **verde**, con **casos nuevos** de tu frente.
- Con los flags nuevos en OFF, el bot se comporta **igual que hoy** (probado).
- Nota corta dejada en `bot_n8n/`. `LEEME-BOT.txt` lo actualiza SOLO el Agente 5.

## Reglas del proyecto (recordatorio)
- Modelo actual: `GEMINI_MODEL=gemini-flash-lite-latest`. Cumplimiento: tier de PAGO
  de Gemini cuando haya volumen (`CUMPLIMIENTO-IA-WHATSAPP.md`).
- Token WhatsApp solo como header `Authorization: Bearer`.
- El esquema del pedido está congelado (`CAMBIOS-PEDIDOS.md`): si un frente necesita
  un campo nuevo, se pide ahí por escrito; no se improvisa.
