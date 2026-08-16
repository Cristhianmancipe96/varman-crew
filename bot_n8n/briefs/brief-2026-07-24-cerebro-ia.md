# BRIEF — CEREBRO IA v9: el bot conversa con Gemini + entrada por campaña de Instagram (24 jul 2026)

**Para:** UN agente de Claude Code · **Zona:** SOLO `bot_n8n\workflows\src\` (cerebro-v4.js sección nueva, textos.js constante nueva) + `workflows\build-v4-pedidos.js` (VERSION y, si hace falta, la línea del nodo Cerebro) + `tests\test-offline-v4.js`.
**NO tocar:** el JSON del workflow (se regenera con `node workflows\build-v4-pedidos.js`), la web, la APP (la pantalla del mapa anuncio→ref es OTRA ZONA, otro brief, otro agente), el `.env` de la VM, las credenciales.
**Regla de la casa:** TODO aditivo + detrás del flag `BOT_CEREBRO_IA` + OFF por defecto (flag off = byte-idéntico a hoy) + rollback = apagar el flag. Subir `VERSION` en build-v4-pedidos.js ANTES de construir. Tests: los 352 existentes en verde + los casos nuevos del cerebro.
**Credenciales:** JAMÁS en el código. Todo por `$env` (`GEMINI_API_KEY` ya existe).
**Memoria de la VM:** e2-micro de 1 GB con task runner OFF (el código corre en el proceso principal de n8n). Nada de cargar imágenes en RAM: las fotos viajan por URL pública, igual que hoy.

---

## 1. Contexto (por qué)

Hoy el bot vende con un flujo clásico de pasos (menú → ref → talla → datos → pago) más dos llamadas cortas a Gemini: un **clasificador** (`GEMINI_SISTEMA`) y un **asistente** de paso (`GEMINI_ASISTENTE`). Funciona y vende, pero se rompe en cuanto el cliente sale del guion: repite plantillas, pierde el hilo, no retoma, y en el barrido de casos reales (`cerebro-ia\CASOS-CLIENTES.md`, 91 casos) el Top 10 de pérdidas es casi todo eso.

En paralelo, el dueño está corriendo **campañas de click-a-WhatsApp desde Instagram sin mensaje predeterminado**: el cliente llega escribiendo solo "Hola". Meta adjunta al primer mensaje un bloque `referral` que el nodo "Parsear mensaje" **ya emite** (`parsed.fuente`, `parsed.fuente_titulo`, `parsed.fuente_tipo`, `parsed.fuente_url`) y que hoy **solo** se usa para anexar una línea al aviso del 320. Ese dato es dinero tirado: el cliente ya vio un modelo y le gustó, y el bot lo trata como desconocido.

Este brief construye el **CEREBRO IA**: Gemini conduce la conversación completa con memoria y con herramientas, guiado por el `CUADERNO-IA-v1.md` ya escrito y verificado, y aprovechando el referral del anuncio. Todo detrás de un flag, con el flujo clásico **intacto** como fallback.

## 2. Qué se construye (resumen)

1. Flag `BOT_CEREBRO_IA` + desvío: mensaje del cliente → cerebro IA. Si el flag está OFF, si el que escribe es el dueño, o si Gemini falla → **flujo clásico de hoy, sin tocar**.
2. **Memoria** de los ~15 últimos turnos en la sesión de Firestore (`botSesiones`, campo nuevo `historial`).
3. Modelo `gemini-2.5-flash` para el cerebro (el clasificador clásico sigue en `flash-lite`).
4. **Function calling** con las 11 herramientas del CUADERNO, cada una implementada **reutilizando los helpers que ya existen**.
5. El **CUADERNO** como constante en `textos.js` — el dueño lo lee, el PM lo itera, sin tocar lógica.
6. **Entrada por campaña de Instagram**: cascada N1→N2→N3 sobre el referral + pivote + autodescubrimiento de anuncios sin mapear.
7. Vetos en **código** (precio, descuento, silencio post-handoff, forma), presupuesto y límites.
8. Prueba escalonada: fase A (un número allowlist) → fase B (todos).

## 3. Zona del agente y qué NO tocar

**Sí, esta es tu zona:**
- `workflows\src\cerebro-v4.js` → **una sección nueva `[CEREBRO-IA]`** con todo el código del cerebro, más **un solo punto de desvío** dentro de `principal()`.
- `workflows\src\textos.js` → la constante `CUADERNO_IA` + los textos de fallback nuevos que necesites.
- `workflows\build-v4-pedidos.js` → subir `VERSION` (8.2 → **8.3**) antes de construir.
- `tests\test-offline-v4.js` → los casos nuevos.

**Decisión que tomas TÚ mirando el build:** el nodo Cerebro se arma en `build-v4-pedidos.js:93` como `src('textos.js') + '\n' + src('cerebro-v4.js')`. Dos opciones:
- **(A, por defecto)** sección `[CEREBRO-IA]` al final de `cerebro-v4.js`. Cero riesgo, cero cambios en el build.
- **(B)** archivo nuevo `src\cerebro-ia.js` insertado **entre** textos.js y cerebro-v4.js (`src('textos.js') + '\n' + src('cerebro-ia.js') + '\n' + src('cerebro-v4.js')`). Solo si verificas que: las `function` de cerebro-v4.js se hoistean en el mismo cuerpo (sí, es un único nodo Code), que **nada** del archivo nuevo se ejecuta en tiempo de carga (`const H = this.helpers` y los `const FLAG_*` viven en cerebro-v4.js y estarían en TDZ), y que `principal()` sigue siendo lo último que corre. Si tienes cualquier duda: opción A.

**NO tocar (lo escribo explícito porque el CUADERNO pide cosas que aquí NO se hacen):**
- ❌ **NO elimines `GEMINI_SISTEMA`, `GEMINI_SISTEMA_FEWSHOT`, `GEMINI_ASISTENTE` ni `GEMINI_ASISTENTE_V2`.** El CUADERNO dice "ELIMINAR" — eso vale para el día en que el cerebro sea el único camino. Hoy son el **fallback que vende**: si los borras, con el flag OFF el bot deja de funcionar y perdemos el rollback. El CUADERNO **sustituye** esos prompts **solo dentro del cerebro** (flag ON).
- ❌ NO reescribas las plantillas de talla/precio de `textos.js` que el CUADERNO lista. El cerebro simplemente **no las usa**. Reescribirlas cambia el flujo clásico.
- ❌ El **filtro léxico de salida** se aplica **solo a la salida del cerebro**. Aplicarlo también a las rutas legacy es otro brief.
- ❌ La **pantalla de la app** para llenar `mapaAnuncios` es otra zona. Tu código **lee** el mapa de Firestore y **funciona igual si no existe** (cae a N2/N3). El dueño puede llenarlo a mano mientras tanto.
- ❌ No toques el bot pausado, los comandos admin, el webhook de Wompi, el resumen diario, el barrido ni `rescate-conversa.js`.

## 4. Diseño técnico

### 4.1 Flags (todos leídos igual que los demás: `/^(on|1|true|si|s[ií])$/i`)

| Flag | Default | Qué hace |
|---|---|---|
| `BOT_CEREBRO_IA` | **OFF** | Maestro. OFF = todo el código nuevo es inerte. |
| `BOT_CEREBRO_IA_SOLO` | vacío | Allowlist para la fase A: lista de números separados por coma (`57300...`). Si tiene valor, el cerebro **solo** actúa con esos números; el resto va al flujo clásico. |
| `GEMINI_MODEL_CEREBRO` | `gemini-2.5-flash` | Modelo del cerebro. El clasificador/asistente clásicos siguen con `GEMINI_MODEL`/`gemini-flash-lite-latest`: **no los toques**. |
| `BOT_CEREBRO_HISTORIAL` | `15` | Turnos máximos de memoria. |
| `BOT_CEREBRO_MAX_TOKENS` | `320` | `maxOutputTokens` del cerebro. |
| `BOT_CEREBRO_TIMEOUT` | `20000` | ms. |

### 4.2 El desvío (un solo punto, dentro de `principal()`)

Orden **obligatorio** — el cerebro se invoca DESPUÉS de todo lo que ya protege al bot:

1. `pausado` (botConfig) → como hoy.
2. Dueño (`OWNER_WHATSAPP`, el 320) → comandos admin, **nunca** al cerebro.
3. `pasadoDeMensajes()` (anti-spam) → como hoy.
4. **Silencio post-handoff** (`FLAG_SILENCIO_HANDOFF` / `ses.enHandoffAt`): si la sesión está en manos del humano, se reenvía al 320 y **NO se llama a Gemini**. Este veto va **antes** de la llamada, no después.
5. Antiruido / dedupe / agrupación de fotos: como hoy.
6. **Captura determinista de talla** (si el cliente la da, la anota el código) → va a `[SESIÓN].talla_capturada`. El cerebro nunca pide ni procesa la talla.
7. **→ Cerebro IA** (si el flag está ON y el número pasa la allowlist).
8. Si el cerebro devuelve `null` (Gemini caído, timeout, JSON ilegible, 2º fallo de herramienta) → **`return false` y sigue el flujo clásico exactamente como hoy**. El fallback es la ley: ninguna ruta nueva puede dejar al cliente sin respuesta.

### 4.3 Memoria (`historial` en la sesión)

- Campo **nuevo y aditivo** en `tiendas/varman/botSesiones/{wa}`: `historial: [{ r: 'u'|'b', t: '<texto>', ts: '<iso>' }, ...]`.
- Tope **doble**: máximo `BOT_CEREBRO_HISTORIAL` (15) entradas **y** máximo ~6 KB serializados; cada `t` se recorta a 400 caracteres. Se descartan siempre las más viejas. Esto protege la RAM de 1 GB y el tamaño del doc de Firestore.
- Se guarda con `fsMerge` (nunca `fsSet`) en el mismo `updatedAt` del turno: **una** escritura extra, no una por mensaje.
- Se mapea a `contents[]` de Gemini (`role: 'user'` / `role: 'model'`) y al final va el mensaje de este turno **precedido del bloque `[SESIÓN]`** con el formato fijo del §1 del CUADERNO (campo vacío = `—`).
- El campo `historial` **solo lo escribe el cerebro**. Con el flag OFF no aparece nunca.

### 4.4 La llamada a Gemini

`llamarGemini()` de hoy (cerebro-v4.js:1048) es de un solo turno y fuerza `responseMimeType: 'application/json'` — **no sirve** para function calling. Crea **al lado** `llamarGeminiCerebro(contents, tools, opts)` que:
- usa `$env.GEMINI_MODEL_CEREBRO || 'gemini-2.5-flash'`;
- manda `system_instruction` = `CUADERNO_IA` (constante, cacheable), `contents` = historial + `[SESIÓN]` + mensaje, `tools[0].function_declarations` = las 11 herramientas;
- `temperature` 0.4, `maxOutputTokens` `BOT_CEREBRO_MAX_TOKENS`, `timeout` `BOT_CEREBRO_TIMEOUT`;
- **copia la política de reintento de hoy**: 1 reintento solo en 429/503 con backoff de 700 ms; cualquier otro error, ninguno;
- registra fallos en `botErrores` con `logError` (origen `gemini-cerebro`);
- **NUNCA lanza**: devuelve `null` y el llamador cae al flujo clásico;
- **máximo 2 vueltas de herramienta por turno** (llamada → `functionResponse` → llamada final). A la tercera, corta y usa el texto que tenga o cae al clásico.

### 4.5 Herramientas: reutilizar, no reescribir

Cada declaración del §9 del CUADERNO se ejecuta con lo que ya existe. **Prohibido duplicar lógica**:

| Herramienta | Implementación (helpers existentes) |
|---|---|
| `mostrar_ficha(ref)` | `infoRef(p)` + `fotoUrlDe(p)` / `fotoUrlDeId` + `msjImagen(to, link, caption)`. Verifica la ref contra el catálogo **antes**; si no existe → resultado vacío. Si no hay foto → texto aprobado con precio (nunca ficha sin foto). |
| `buscar_catalogo(texto)` | `parseCatalogo(fsJson)` + `modeloDe(ref)` + la normalización de marca que ya está. Devuelve refs reales, nada más. |
| `listar_modelos(genero, estilo)` | La lógica de categorías existente (`CAT_LABEL`/`CAT_ORDER`) → **2 fotos con precio**, no la tanda de 5. |
| `enviar_fotos(ref, cantidad)` | `fotoUrlDe` + `msjImagen`, **máx 2**. |
| `enviar_catalogo_web()` | `msjCatalogoWeb(to)` — **única** vía al link de la web; cualquier URL que escriba el modelo se borra. |
| `crear_link_wompi(cotizacion_id)` | `crearLinkWompi(s)` / `pagarConWompi(s)` (cerebro-v4.js:2188). Si falla → los métodos manuales de siempre, sin narrar el error. |
| `registrar_pedido(...)` | El armado de pedido que ya existe (mismos campos, mismo estado). La talla la pone el código. |
| `consultar_pedido()` | `fsUltimosPedidos` filtrando por `cliente_wa`. |
| `cotizar(refs, cantidad, motivo)` | **NUEVA, 100% en código.** `subtotal` del catálogo × cantidad, `pct` según motivo (10% máx; 15% solo con 2+ pares; **15% es techo absoluto**), `total`, `texto_total` con `fmtPrecio`, y un `cotizacion_id` corto (`crypto.randomUUID().slice(0,8)`) guardado en la sesión. |
| `avisar_dueno(momento, detalle)` | `msjAvisoDueno(dueno, texto)` (plantilla aprobada). `momento` fuera del enum → se **descarta**, no se improvisa. Dedupe por sesión: `ses.avisosIA = ['intencion_compra', ...]`. |
| `pasar_asesor(motivo)` | `hacerHandoff()` (ya manda el traspaso al cliente, el aviso al 320 y marca el silencio). Después: **el cerebro no vuelve a hablar en ese turno**. |

### 4.6 Los VETOS que son del CÓDIGO (no del prompt)

Estos filtros van **antes de enviar** cualquier cosa que produzca el cerebro:

1. **Precio real:** si el texto del modelo trae una cifra en pesos que **no** vino de una herramienta ejecutada **en este turno** (ni de `cotizar`/`consultar_pedido`), se bloquea el envío y se cae al texto aprobado. Cero excepciones.
2. **Tope de descuento:** lo calcula `cotizar` en código. Nada por encima de 10% (15% con 2 pares) sale; si el modelo lo pide, se recalcula al tope o se pasa a asesor.
3. **Promo ofrecida ⇒ promo cobrada:** el total del link Wompi, el del pedido y el del aviso al 320 deben coincidir con el `cotizacion_id` de la sesión. Si no coinciden: no se envía y se avisa al dueño.
4. **Silencio post-handoff:** ya está en el paso 4 del desvío — el veto ocurre **antes** de llamar a Gemini, no filtrando su salida.
5. **Filtro léxico de salida:** regex que bloquea `1.1`, `réplica`, `AAA`, `imitación`, `parcero/parce/chimba/mor/bro`, diminutivos (`mi amor`, `corazón`, `linda/o`, `hermosa`, `mija/o`), mexicanismos, `¿te muestro`, `¿qué talla` y el arranque `¡Claro que sí`. **Afinado**: originales solo con `\b(son|es|100%|sí son|no son)\s+originales?\b` y `originales? de (la )?marca`; **lista blanca `caja original`**; tallas solo `(de la )?35 a la 45`.
6. **Confirmación por asentimiento:** si el mensaje del cliente trae `1.1`/`réplica`/`AAA`/`original`, la salida no puede empezar por `así es`/`exacto`/`correcto`/`sí`/`no`/`claro`/👍 → se regenera o cae al texto aprobado.
7. **Chequeo de FORMA:** máx **1** `?`, máx **1** emoji, máx **2** frases. Si no cumple: recorta o regenera.
8. **Un movimiento por turno:** máximo **una** herramienta que le habla al cliente + opcionalmente **una** `avisar_dueno`. `pasar_asesor` va sola. **Máx 2 imágenes por turno.**
9. **Una burbuja, en orden, completa:** el bug de burbujas volteadas del 23-jul no se repite. Ningún mensaje truncado.
10. **Solo refs verificadas:** un número que dijo el cliente se comprueba contra el catálogo antes de afirmarlo.

### 4.7 El CUADERNO como constante

- Va en `textos.js` como `const CUADERNO_IA = '...'` (o `[...].join('\n')`), **solo el bloque entre `═══ INICIO DEL PROMPT ═══` y `═══ FIN DEL PROMPT ═══`** de `cerebro-ia\CUADERNO-IA-v1.md`. Todo lo de arriba de esa línea es documentación para humanos y **no viaja** al modelo.
- Ojo con el escape (backticks, `${`, comillas, `\n`). Añade un test que verifique que la constante contiene los marcadores clave (`R1 · PRODUCTO`, `## 4. ENTRADA POR CAMPAÑA`, `avisar_dueno`, `pasar_asesor`) y que su longitud está en el rango esperado: si alguien rompe el escape, el test lo caza.
- La **nota operativa del DM de Instagram NO va en el prompt** (es enrutamiento; el bot no atiende DM, esos chats los responde el dueño a mano desde el 320).
- Al final del CUADERNO, el código inyecta el bloque `[SESIÓN]` del turno. El CUADERNO en sí no cambia entre llamadas.

## 5. ENTRADA POR CAMPAÑA DE INSTAGRAM (requisito nuevo del dueño, 24-jul) — la parte más importante

### 5.1 Prerrequisito que se VERIFICA EN LA VM (no se asume)

El referral **ya se parsea** (nodo "Parsear mensaje" emite `fuente`, `fuente_titulo`, `fuente_tipo`, `fuente_url` siempre; el Cerebro los usa solo con `BOT_FUENTE_DETALLE` ON, cerebro-v4.js:976). El `.env` local **no tiene flags**.
👉 **Antes de dar esto por hecho, hay que comprobar en la VM con `grep BOT_FUENTE_DETALLE` sobre el `.env` real.** Regla de la casa: "ya lo hice" se verifica en la máquina. Si está OFF, la guía de despliegue debe decir "encender `BOT_FUENTE_DETALLE=on` **junto con** `BOT_CEREBRO_IA`" — sin él, `fuente_titulo` no llega y la cascada se cae a N3 siempre.
Además: **el referral llega SOLO en el primer mensaje** → el cerebro lo lee de la sesión (`fuente`, `fuenteDetalle`), que ya sobrevive todo el pedido.

### 5.2 El mapa anuncio→ref

- Firestore: `tiendas/varman/botConfig/general` → **campo nuevo `mapaAnuncios`**: `{ "<source_id>": "<ref>" }`. El `source_id` es lo que va después de `ctwa:` en `parsed.fuente`.
- El bot **solo lee**. Si el campo no existe, si está vacío o si la ref mapeada ya no está en el catálogo → **baja de nivel en silencio**, nunca error visible para el cliente.
- La pantalla de la app para llenarlo es **otro brief**. Mientras tanto el dueño lo llena a mano o se usa `refPauta`.

### 5.3 Cascada de 3 niveles (nunca falla en silencio)

**N0 · Guardas.** Si el primer mensaje ya trae **intención concreta** (una ref, un número, una marca, un modelo, una foto, una pregunta de envío o de pago) → **se atiende ESO**. La ref del anuncio queda de respaldo en memoria. Nunca secuestrar con `ref_mapeada` ni `refPauta` a quien ya pidió otra cosa.

**N1 · `source_id` MAPEADO** → `mostrar_ficha(ref_mapeada)` **de una**: foto + nombre + **precio real del catálogo** + **una** pregunta de avance. **Sin pedir talla.** Sin el paso intermedio "¿te interesa el modelo de la publicación?" (ese paso pierde clientes). Si la ref vuelve vacía → baja a N2 sin decírselo al cliente.

**N2 · Sin mapa pero CON `fuente_titulo`** → `buscar_catalogo(titular_limpio)`.
- **Limpieza del titular (en código, antes de buscar):** quitar precios, emojis, `%`, `envío`, `gratis`, `off`, `descuento`, `oferta`, `2x1`, `desde $`, `nuevo`, `ya`; exigir un umbral mínimo de coincidencia. Ejemplo: `"Puma Speedcat Ballet envío gratis"` → `"puma speedcat ballet"`.
- **1 resultado** → ficha, como N1.
- **Varias hermanas (mismo modelo, distinto color)** → nombra los colores y muestra 2: "Las tenemos en negro, lila y crema 😍 ¿Cuál te gusta?"
- **Varios modelos distintos** → **no afirmes cuál es el del anuncio**: 2 fotos con precio y "¿Cuál es el que viste?"
- **0 resultados** → N3, en silencio.
- ⚠️ Solo se dice **"de nuestra publicación"** si el nombre del modelo devuelto aparece en el titular. Presentar el equivocado como "el del anuncio" quema el clic pagado.

**N3 · Sin mapa ni titular útil** → `refPauta` global (`botConfig/general.refPauta`, ya existe). Si tampoco hay → **sondeo normal**: ¿ref específica? / hombre-mujer + estilo → 2 fotos. **NUNCA el link de la web de entrada.**

### 5.4 PIVOTE OBLIGATORIO

Si el cliente muestra **otro interés** — "¿tienen Jordan?", "muéstrame más", manda foto de otro modelo, pregunta por otra marca, "ese no me gusta" — el bot **suelta la referencia del anuncio de inmediato y sin insistir** y sigue la venta normal. **Nunca forzar el modelo pautado más de una vez.** Si más adelante el cliente vuelve a él, lo **retoma** (para eso está la memoria): "Volvemos a las Speedcat entonces 👟". Implementación: bandera `ses.refAnuncioOfrecida = true` en cuanto se ofrece; con esa bandera puesta, el cerebro no la vuelve a proponer.

### 5.5 AUTODESCUBRIMIENTO (el dueño no caza IDs en Meta)

Cuando llega un cliente de un anuncio cuyo `source_id` **no está en `mapaAnuncios`** (o sea, N2 o N3 con `fuente` presente):
- `avisar_dueno("anuncio_sin_mapear", detalle)` al 320, con `detalle` = `fuente` + `fuente_titulo` + `fuente_url` **tal como vienen** (el código rellena el detalle aunque el modelo lo mande vacío).
- **UNA sola vez por anuncio, no por mensaje ni por cliente.** Dedupe en Firestore: doc `tiendas/varman/botAnuncios/{source_id}` con `{ titulo, url, tipo, avisado: true, primeraVez, visitas }`. Si `avisado` ya es `true`, se incrementa `visitas` y **no se manda nada**. Ese doc además le sirve al dueño (y a la app, después) para saber qué anuncios están trayendo gente.
- Invisible para el cliente: jamás se narra.

## 6. Presupuesto y límites (la VM es de 1 GB)

- `maxOutputTokens` 320 · `timeout` 20 s · **1** reintento solo en 429/503 · máx **2** vueltas de herramienta por turno.
- El **anti-spam existente** (`MSGS_POR_MIN`, default 8) aplica **antes** del cerebro: protege el cupo gratis de Gemini.
- Historial acotado (15 turnos / ~6 KB / 400 chars por entrada). Nada de imágenes en memoria: solo URLs públicas.
- El CUADERNO va como `system_instruction` constante (cacheable) — no se recompone por turno.
- Si el cupo de Gemini se agota: `null` → flujo clásico. **El bot nunca se queda mudo.**

## 7. Pruebas

### 7.1 Automáticas (`tests\test-offline-v4.js`)

- Los **352 existentes en verde** con el flag OFF (byte-idéntico a hoy: eso es el rollback).
- Nuevos, con Gemini **mockeado** (respuestas de function calling fabricadas, igual que hoy se mockea el clasificador):
  1. Flag OFF → el cerebro no se invoca ni una vez.
  2. Flag ON + `BOT_CEREBRO_IA_SOLO` con otro número → flujo clásico.
  3. Gemini devuelve error / timeout / JSON basura → **flujo clásico completo**, cliente atendido.
  4. Historial: 20 turnos → se guardan 15, se recortan los textos largos, el doc no crece sin control.
  5. Dueño (320) escribiendo → comandos admin, nunca cerebro.
  6. Sesión en handoff → **no se llama a Gemini**, se reenvía al 320.
  7. Veto de precio: el modelo escribe "$199.000" sin herramienta → **no se envía**.
  8. Veto de descuento: el modelo pide 25% → se recorta al tope o handoff.
  9. Filtro léxico: salida con "calidad 1.1" / "parcero" / "mi amor" → bloqueada; "caja original" → **pasa** (lista blanca).
  10. Forma: salida con 3 preguntas y 4 emojis → recortada a 1 y 1.
  11. **N1**: `fuente=ctwa:123` + `mapaAnuncios{"123":"07"}` → ficha de la 07 con foto y precio real, sin preguntar talla.
  12. **N2**: sin mapa, titular "Puma Speedcat Ballet envío gratis" → busca por "puma speedcat ballet" y ofrece los colores.
  13. **N3**: sin mapa ni titular → `refPauta`; sin `refPauta` → sondeo. En ningún caso el link de la web.
  14. **Pivote**: cliente de anuncio dice "¿tienen Jordan?" → suelta el modelo pautado, no insiste.
  15. **Autodescubrimiento**: primer cliente de un anuncio sin mapear → 1 aviso al 320 + doc `botAnuncios/{id}`; segundo cliente del mismo anuncio → **0 avisos**, `visitas` sube.
  16. `CUADERNO_IA` contiene los marcadores clave y no está roto por el escape.

### 7.2 Prueba escalonada en vivo

- **Fase A:** `BOT_CEREBRO_IA=on` + `BOT_CEREBRO_IA_SOLO=57300...` (el número de prueba del dueño). Todo el tráfico real sigue por el flujo clásico. Mínimo 1 día.
- **Fase B:** vaciar `BOT_CEREBRO_IA_SOLO` → todos.
- Entre A y B, revisar `botErrores` y el resumen diario.

### 7.3 Guion de prueba en vivo para el dueño (10 conversaciones)

Del banco de casos (`cerebro-ia\CASOS-CLIENTES.md`), incluidas **3 del Top de pérdida de ventas** y **1 de anuncio sin mapear**:
1. "Hola" seco → bienvenida + una pregunta (o `refPauta` si está activa).
2. **[anuncio, N1]** llegar desde un anuncio mapeado escribiendo solo "Hola" → debe abrir con ESE modelo, foto + precio, sin pedir talla.
3. **[anuncio sin mapear, N2/N3]** → atiende bien **y** al 320 le llega el aviso con el ID y el titular.
4. **[pérdida]** "¿son originales?" → "importados, de excelente calidad", sin confirmar ni negar, y avanza.
5. **[pérdida]** "¿manejan contra entrega?" desde Pasto → empatía + Wompi + **link en el mismo turno**, nunca "¿te comparto el link?".
6. **[pérdida]** "uy muy caro no?" → `cotizar` y la **cifra final**, no el porcentaje.
7. Mandar una foto de otro modelo → dice que es un bot y no ve imágenes, resuelve, y la foto llega al 320.
8. "Quiero hablar con una persona" a mitad del pedido → handoff inmediato + el bot **calla**.
9. Saludar a mitad del pedido ("hola") → **no reinicia**, retoma el paso pendiente.
10. Escribir raro dos veces ("Dndbbe", "Aja") → reformula distinto cada vez, sin repetir plantilla.

## 8. Hecho cuando (lista verificable)

1. `node workflows\build-v4-pedidos.js` regenera el JSON sin errores, con `VERSION` **8.3** y respaldo en `workflows\respaldo\`.
2. **Los 352 tests en verde** + los 16 casos nuevos del §7.1 en verde.
3. **Flag OFF = byte-idéntico a hoy** (comprobado con el diff del JSON generado en las partes del flujo clásico).
4. **Fallback probado a mano**: con `GEMINI_API_KEY` inválida y el flag ON, una conversación completa se atiende por el flujo clásico, sin un solo mensaje perdido.
5. `BOT_FUENTE_DETALLE` **verificado con grep en el `.env` REAL de la VM** (y anotado en la guía si hay que encenderlo).
6. Guion de las 10 conversaciones del §7.3 pasado en fase A con el número de prueba.
7. **Los avisos al 320 llegan** (plantilla aprobada, no texto libre) y no se repiten dentro de la misma sesión.
8. **Autodescubrimiento probado**: aviso con ID + titular al 320 la primera vez, silencio la segunda, doc en `botAnuncios`.
9. `CUADERNO_IA` en `textos.js`, legible, sin lógica dentro, y el PM puede editarlo sin tocar código.
10. Guía de despliegue paso a paso estilo `PASOS-V*.txt`: qué flags encender, en qué orden, cómo pasar de fase A a fase B y cómo revertir.

## 9. Rollback (1 paso)

`BOT_CEREBRO_IA=off` en el `.env` de la VM + reiniciar n8n. El bot vuelve al flujo clásico que vende hoy, con todos sus flags actuales intactos. **Nada del cerebro deja rastro que estorbe**: el campo `historial` y los docs `botAnuncios` son inertes con el flag apagado, y `mapaAnuncios` simplemente no se lee.
Si hace falta bajar solo el alcance sin apagar el cerebro: volver a poner un número en `BOT_CEREBRO_IA_SOLO` (vuelve a fase A).
