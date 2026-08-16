# Casos de clientes — Taxonomía maestra (2026-07-24)

> **Qué es esto.** El catálogo único y deduplicado de situaciones reales de cliente que el bot de VarMan Crew debe saber manejar. Se armó fusionando **248 casos en bruto minados de 6 fuentes** del proyecto: (1) el barrido de conversaciones `barrido-conversaciones-2026-07-20.json`, (2) el visor `conversaciones-bot-2026-07-21.html`, (3) el `informe-barrido-bot-2026-07-20.html`, (4) la base de datos de escenas CSV + HTML de casos (filas 1-61), (5) el playbook del dueño (`BANCO-RESPUESTAS-V1`, `CONVERSACIONES-INCOMODAS`, `brief-2026-07-22-cierre-confianza.md`), y (6) los textos vivos del bot (`textos.js`) más el `ESTADO` del proyecto en Obsidian.
>
> Muchos casos venían repetidos entre fuentes: aquí cada situación aparece **una sola vez**, con toda su evidencia junta. El "comportamiento correcto" está reescrito según las **12 reglas innegociables del negocio vigentes al 24-jul-2026** — por eso en varios casos el comportamiento correcto **contradice la plantilla que hoy está activa**; esas contradicciones quedan marcadas como `⚠️ CONFLICTO VIGENTE` porque son deuda a corregir en el bot, no descripciones de lo que hace hoy.
>
> **Cómo leerlo.** Dentro de cada categoría los casos van ordenados por **importancia para ventas** (frecuencia real × clientes reales perdidos). Marcas: `🔴` costó clientes reales documentados · `🟠` fricción real sin pérdida probada · `🟡` visto solo en pruebas del dueño o derivado de las reglas · `🟢` caso positivo de referencia.
>
> Al final está la sección **Top 10 momentos donde se pierden ventas**, que es la lista de trabajo priorizada.

---

## Índice de categorías

| # | Categoría | Casos |
|---|---|---|
| A | [Entrada y saludo (pauta y orgánico)](#a-entrada-y-saludo-pauta-y-orgánico) | 7 |
| B | [Precio](#b-precio) | 4 |
| C | [Catálogo, marcas y modelos](#c-catálogo-marcas-y-modelos) | 11 |
| D | [Tallas](#d-tallas) | 8 |
| E | [Fotos que manda el cliente](#e-fotos-que-manda-el-cliente) | 5 |
| F | [Objeciones, confianza y tono](#f-objeciones-confianza-y-tono) | 7 |
| G | [Descuentos, cantidad y multi-par](#g-descuentos-cantidad-y-multi-par) | 4 |
| H | [Pago y cierre por ciudad](#h-pago-y-cierre-por-ciudad) | 9 |
| I | [Envíos y logística](#i-envíos-y-logística) | 4 |
| J | [Datos de envío](#j-datos-de-envío) | 5 |
| K | [Incoherentes, ruido y bucles](#k-incoherentes-ruido-y-bucles) | 6 |
| L | [Handoff a asesor](#l-handoff-a-asesor) | 4 |
| M | [Post-venta y rescates](#m-post-venta-y-rescates) | 8 |
| N | [Fallas técnicas y de datos](#n-fallas-técnicas-y-de-datos) | 6 |
| O | [Casos positivos de referencia](#o-casos-positivos-de-referencia) | 3 |
| — | **Total** | **91** |

---

## A. Entrada y saludo (pauta y orgánico)

### A1 🔴 Lead de pauta llega con la ref del anuncio y el bot le pregunta la talla
**Frecuencia:** muy alta — el disparador más repetido de todo el barrido (≥17 conversaciones idénticas).

**Disparadores reales:**
- "Hola 👋 me interesan las Adidas Equipment (Ref 51)"
- "Hola 👋 me interesan las Nike Free Metcon (Ref 02)"
- "Hola, me interesa la Ref 51 que vi en su publicación"

**Qué hacía el bot:** foto del modelo **sin precio** + "¿Qué *talla* buscas? Escríbeme el número (manejamos de la *35 a la 45*)".

**Comportamiento correcto:** mostrar la ficha completa en una burbuja — **foto + precio pegado** (regla 3) — y cerrar con **una sola** pregunta de avance de venta que **no sea la talla** (regla 2): la ciudad, para encaminar contra entrega vs Wompi (regla 5). Si el cliente pregunta por tallas: "manejamos todas las tallas disponibles, la confirmamos al alistar tu pedido". Sin asteriscos en "VarMan Crew", máximo 1 emoji y 2 frases.

**Evidencia consolidada:** `barrido-conversaciones-2026-07-20.json` CONVs 24, 33-49 (tel 573026833200, 573203344708) — al menos **14 clientes de anuncio con un solo mensaje**, nunca volvieron a escribir tras la pregunta de talla. `conversaciones-bot-2026-07-21.html`: conversaciones …5351, …3551, …9489, …3918, …4708, …1564, …7070, …5670, …0861, …4480, …9218, …7200, …8584, …3200, …8865, …6163 (casi todas de 1 mensaje). CSV fila 2 (ACTIVO) + HTML escena 1.2. El informe del 20-jul lo llama la **fuga nº1 del embudo**: ~20 leads pagos enmudecieron aquí.

**⚠️ CONFLICTO VIGENTE:** la plantilla activa `pedirTallaCorta` mete "¿Qué *talla* calzas? (de la *35 a la 45*)" dentro del caption de la ficha (`textos.js` L144, L138-144). Contradice la regla 2.

---

### A2 🔴 "¡Hola! Quiero más información" (plantilla CTWA, sin ref) y el paso extra del "sí"
**Frecuencia:** alta — 6+ clientes con esta entrada.

**Disparadores reales:** "¡Hola! Quiero más información" · "Quiero más información" · "Si, tienes catalogo ?"

**Qué hacía el bot:** v6.9 responde "¿Buscas *Reebok classic* (Ref 56), la de nuestra publicación? Escríbeme *sí* y te paso la foto y el precio 📸". Funciona a medias: quien contesta "Si" recibe la foto; quien no contesta, se pierde.

**Comportamiento correcto:** **mostrar directo** la ficha (foto + precio) de la ref de pauta configurada en la app, sin pedir permiso — regla 6 prohíbe "¿te muestro?". Cerrar preguntando la ciudad. Guardas: no secuestrar con la refPauta si el mensaje trae dígitos, otra ref, una marca o una pregunta de envío.

**Evidencia consolidada:** CONV 20-21 (Diego Baique …6249) y …5467 respondieron "Si" y recibieron foto (flujo decente). CONV 32 / …0122 (Eilen Albarracin, ⏱46s) **nunca respondió al ofrecimiento — PERDIDA en el paso extra**. …1289 (Leonardo Casallas): "Si, tienes catalogo ?" → el bot saltó la foto y mandó el link — PERDIDO. CONV 5 (…0135, César de Armenia): su "¡Hola! Quiero más información" de las 04:46 **no recibió respuesta alguna**, y la de las 05:49 tampoco. CSV fila 4 + HTML 1.4; `textos.js` L121-130 (`refPautaInfoPregunta`), L367 (`conversaSaludoPautaPreg`); flag BOT_REF_PAUTA.

---

### A3 🔴 Demora en la primera respuesta a un lead de pauta
**Frecuencia:** alta 13-20 jul (corregida el 21-jul); **problema #1 histórico de la campaña**.

**Disparador:** cualquier primer mensaje de anuncio que no recibe respuesta en segundos.

**Comportamiento correcto:** responder **al instante, a cualquier hora** — es la razón de ser del bot. Objetivo <20 s en el primer mensaje de pauta; si algo tarda, al menos un acuse ("un momento 😊") en <10 s.

**Evidencia consolidada:** `BANCO-RESPUESTAS-V1` fila "Velocidad": el problema #1 eran demoras de **12 h a 4 días → leads perdidos**. Barrido: …1564 (Leidy Palacio) ⏱99 s y 1 solo mensaje — PERDIDA; …2273 ⏱152 s; …9732 (IDER) ⏱161 s; …7832 (Eduardo) ⏱157 s; …8871 (santiesa33) ⏱115 s; …8968 (Ian Hansen) ⏱86 s. slowList del 20-jul: respuestas de 84, 111 y 181 s. **Correlación directa demora ↔ cliente de un solo mensaje.** Estabilización de la VM el 21-jul (runner OFF en VM de 1 GB).

---

### A4 🟠 "Hola" / "buenas" en frío, sin contexto
**Frecuencia:** alta — todo cliente nuevo orgánico.

**Disparadores reales:** "hola" · "Hola, buenas" · "buenas" · "Buenas noches" · "info"

**Comportamiento correcto:** bienvenida corta y **sondeo**, sin mandar link ni catálogo de entrada (regla 7): `conversaSaludo` ("¡Hola! Bienvenido a VarMan Crew 👟") + `conversaSaludoPreg` ("Cuéntame, ¿qué modelo estás buscando o en qué te puedo ayudar? 😊"). Una sola pregunta. Si hay refPauta activa de campaña, cualquier saludo ofrece **ese** modelo.

**Evidencia consolidada:** CSV fila 1 (ACTIVO) + HTML escena 1.1; `textos.js` L363-364 (vigente), L539 (few-shot). Coexisten **3 generaciones de saludo**: `categoriasBody` (L19, manda lista), `catalogoWebBienvenida` (L73) y el modo conversa (L363-364). Con CW1 el saludo mandaba el link de una y el dueño lo probó en vivo y pidió cambiarlo (CW2: "hola" solo → solo saludo).

---

### A5 🟠 Saludo a mitad de pedido (no debe reiniciar)
**Frecuencia:** media — corregido, caso de regresión a vigilar.

**Disparadores reales:** "Ola buenas" (con Ref 51 ya elegida) · "Hola?" · "Buenas tardes" · "Hola" al día siguiente.

**Comportamiento correcto:** el saludo **no reinicia** (regla 11): re-anclar al paso pendiente — `saludoMidPedido` "¡Hola de nuevo! 👋 Seguimos con tu pedido{refTxt} 😊 Terminémoslo 👇". Y no mandar además la plantilla completa del paso como segunda burbuja.

**Evidencia consolidada:** CONV 4 (…9007, 14-jul 20:24): "Ola buenas" → bienvenida genérica, **se perdió el contexto de la Ref 51** y eso alimentó el bucle fatal de talla. CONV 1 / …8111 (Natalia, 07-08): el saludo le borró el hilo del asesor. Corregido y verificado en vivo el 15-jul: CONV 17 y …6265 (Edwinnadal). CSV fila 45 (flag BOT_SALUDO_NO_REINICIA) + HTML 5.2; `textos.js` L179-181.

---

### A6 🟠 Mensaje partido en dos: "Tienes esto" + "?" y el bot repite la bienvenida
**Frecuencia:** media — bug que ya "revivió" una vez.

**Comportamiento correcto:** un mensaje **sin ninguna letra ni número** (solo signos, emoji o sticker) es ruido o cola de un mensaje ya respondido → **no contestar** (BOT_ANTIRUIDO). Todo arreglo del flujo clásico debe replicarse en el modo conversa.

**Evidencia consolidada:** `ESTADO-VARMAN.md` bitácora 13-jul (el "?" suelto entraba al clasificador como 'saludo') + Lecciones 23-jul del ESTADO en Obsidian: **la falla revivió con el modo conversa** porque conversa pasaba por delante del antiruido, y se re-arregló.

---

### A7 🟠 Las dos burbujas del bot llegan volteadas
**Frecuencia:** baja.

**Disparador:** el cliente recibe la pregunta antes del saludo.

**Comportamiento correcto:** los mensajes de un mismo turno que van juntos se envían en **una sola burbuja** (máx 2 frases, regla 6).

**Evidencia consolidada:** ESTADO Obsidian, Lecciones 23-jul (despliegue v8).

---

## B. Precio

### B1 🔴 Preguntan el precio con una referencia ya en contexto y el bot suelta el rango genérico + link
**Frecuencia:** muy alta — el patrón que los 4 analistas del barrido marcaron como hallazgo #1.

**Disparadores reales:**
- "Precio" (Miguel …6281)
- "Que precio tiene gracias" (Diego Castillo …7027)
- "Hola 👋 me interesan las Adidas Equipment (Ref 51). Precio" (…3458)
- "Qué precio tienen estos Reebok" (Jhosep David …9383)
- "Q precios o si tienes más modelos" — **escrito 6 veces** por IDER (…9732)
- "¿El precio?" preguntado a mitad de pedido

**Qué hacía el bot:** "Nuestros tenis van desde $235.000 hasta $480.000… ¿Te gustaría ver nuestro catálogo?" + link (a veces truncado: "https://varmancr").

**Comportamiento correcto:** con ref activa (por pauta, por la web o porque ya se mostró), dar **la cifra exacta de ESA referencia pegada a su foto** (regla 3). El rango $235.000-$480.000 con envío incluido **solo** si preguntan precios en general sin ref en contexto. El precio nunca va solo ni en rango cuando hay modelo identificado.

**Evidencia consolidada:** `informe-barrido-bot-2026-07-20.html` hallazgo #1 (verificado por los 4 analistas). **Clientes perdidos:** IDER …9732 tenía **Ref 51 + talla 40 listas y solo le faltaba el precio**; tras 6 intentos escribió "Cancelar" a las 15:07 — *"esa venta estaba hecha"*, es uno de los 4 clientes calientes recuperables. Miguel …6281, Diego Castillo …7027 (visor líneas 284-293, además link cortado), …3458 y Jhosep David …9383: ninguno volvió a escribir. CSV filas 3 y 41 (HUECO #1) + HTML 1.3, caja: *"un cliente con ref+talla listos preguntó 6 veces el precio y canceló"*; ≈20 leads de pauta enmudecieron en la ficha sin precio.

---

### B2 🟠 "Precio?" pelado, sin decir de qué (viene de la pauta)
**Frecuencia:** alta — todo el tráfico de pauta.

**Comportamiento correcto:** asumir la **ref de pauta activa** marcada en la app y responder con la ficha: foto + cifra exacta. Guardas: no secuestrar si el mensaje trae dígitos, ref o marca, ni si la pregunta es de envío. Si no hay pauta activa ni ref identificable, `conversaPrecioPreg`: "¿De cuál modelo te gustaría saber el precio? Cuéntame cuál viste o mándame una foto 📸".

**Evidencia consolidada:** CSV fila 3 (flag BOT_REF_PAUTA, HUECO #1) + HTML 1.3; ESTADO Obsidian Bot v6.9; `textos.js` L128 (`refPautaPrecioIntro`), L370 (`conversaFicha`: "👟 {nombre} / 💵 {precio} / 🚚 Envío GRATIS a todo el país"), L373.

---

### B3 🟡 Precio en general, sin modelo
**Frecuencia:** media.

**Disparadores reales:** "¿qué precios manejan?" · "a cuánto valen?" · "Que precios manejas?" · "Catálogo y precios"

**Comportamiento correcto:** **única** situación donde va el rango: $235.000-$480.000 **con envío incluido**, y de una sondear para mostrar 2 fotos con precio (¿dama o caballero? ¿qué estilo?).

**Evidencia consolidada:** regla 3 + `textos.js` L312 (`precioInfo`), L75 (`catalogoWebPrecioIntro`), L542 (few-shot).
**⚠️ CONFLICTO VIGENTE:** `precioInfo` y `catalogoWebPrecioIntro` dicen "tenis de la *35 a la 45*" — hablar de rango de tallas está fuera de la regla 2.

---

### B4 🔴 La misma referencia con dos precios distintos
**Frecuencia:** media — riesgo crítico de datos.

**Disparador:** el cliente ve un precio en la web o en la lista y el bot le dice otro. Caso detectado: **Ref 30 a $409.900 en la lista y $264.900 en el detalle**; una búsqueda por estilo mostró todas las Jordan Retro 4 al mismo precio.

**Comportamiento correcto:** **punto único de verdad**: el bot solo cita el catálogo real de Firestore (regla 3), y la misma ref muestra el mismo precio en lista, detalle y cobro. Si se detecta discrepancia, pasar a asesor en lugar de sostener una cifra dudosa.

**Evidencia consolidada:** `informe-barrido-bot-2026-07-20.html` sección "Riesgos de datos" (marcado **Crítico**) + HTML tabla de huecos #5.

---

## C. Catálogo, marcas y modelos

### C1 🔴 Piden el catálogo y el bot responde con el link de la web
**Frecuencia:** muy alta — **fuga nº2 del embudo**; 7+ clientes reales perdidos justo después del link.

**Disparadores reales:**
- "Un favor tiene el catálogo de los zapatos" (santiesa33 …8871, lo pidió 4 veces)
- "Q precios o si tienes más modelos" (IDER …9732, 5 veces)
- "Me puedes regalar catálogo y precios de los tenis gracias"
- "Si q modelos tienen disponible" · "Catálogo y precios" · "Me muestras qué tenis tienes?"
- "Me encuentro interesada en unos zapatos" · "Quisiera comprar unos tenis"

**Qué hacía el bot:** "¡Con gusto! 👟 Mira todo el catálogo con fotos y precios aquí… https://varmancrew.com/#catalogo".

**Comportamiento correcto:** **no mandar el link de entrada** (regla 7). Sondear: ¿busca una referencia específica? → sí: cuál / no: ¿dama o caballero? ¿qué estilo? → **mostrar 2 fotos con precio dentro del chat**. El link web solo cuando no está lo que busca o en el rescate de ~3 min. Respuesta ambigua al sondeo ("algo para mí") → mostrar los más pedidos, sin insistir.

**Evidencia consolidada:** barrido: CONV 7 (santiesa33) PERDIDO; CONV 6 (IDER BELEÑO) PERDIDO tras "Cancelar"; CONV 26 (luispupo …3258), CONV 14 (Adrian …6036), CONV 18, CONV 13 (kevin santos …9617), CONV 15 (Chila Caicedo …9049), jorgecaballeronava72, …8111 (Natalia 07-12), …9003 (Andrés): todos recibieron link y no volvieron. `informe-barrido-bot-2026-07-20.html` hallazgo #3: *"después de recibir el link, casi ningún cliente volvió a escribir"*, *"mandar el link mata la conversación"*. CSV fila 5 + HTML 1.5 (HUECO #3). Matiz del dueño: el link fue decisión deliberada (BOT_CATALOGO_WEB) porque la VM se saturaba; v8 lo resuelve con sondeo + 2 fotos.

**⚠️ CONFLICTO VIGENTE:** `catalogoWebLink` (`textos.js` L59) y `catalogoWebLinkCorto` (L62) siguen mandando el link de una, contra el bloque [SONDEO] L374-382.

---

### C2 🔴 El cliente insiste en ver las fotos DENTRO del chat y recibe el mismo link 3-5 veces
**Frecuencia:** media-alta como patrón; es la fricción que crea C1.

**Disparadores reales:** "Me las puedes mostrar acá" · "Me puedes mandar la foto acá" · "Me puede enviar las fotos por este medio ?" · "Quiero verlos acá" (×2) · "No voy a pagar sin ver que voy a comprar"

**Comportamiento correcto:** al **primer** pedido explícito de fotos en el chat, mostrar 2 fotos con precio según el sondeo (regla 7); si aun así no le sirven, asesor. **Jamás repetir la misma plantilla de link** (regla 11).

**Evidencia consolidada:** hilo de pruebas del dueño …2786, 17-jul 06:45-06:48: **5 peticiones, 5 veces el mismo link**; y 09-jul 14:34 "No voy a pagar sin ver que voy a comprar" mientras el bot re-enviaba la plantilla de pago. `informe-barrido-bot-2026-07-20.html` hallazgo #3 (citas textuales). Es prueba del dueño, pero replica exactamente la fricción que mató a los clientes de C1.

---

### C3 🔴 "Si mil gracias" / "claro" / "dale": el bot vuelve a preguntar en vez de mostrar
**Frecuencia:** alta.

**Disparadores reales:**
- "Tienes Jordan retro 4 ?" → "¿Te gustaría ver las que tenemos disponibles?" → "Si muéstrame" → "¿Buscas algo en especial?" (y nunca muestra)
- "Si mil gracias" · "Si por favor" · "Si claro" · "dale"

**Comportamiento correcto:** regla 6 — **nunca "¿te muestro?"**. Al afirmar el cliente, se **muestra directo**: 2 fotos con precio o la ficha en cuestión. Cero turnos intermedios; el "sí" siempre avanza.

**Evidencia consolidada:** pruebas …2786 07-07 13:16-13:17 (dos bucles seguidos, con stock alucinado incluido). CONV 13 (kevin, real): "Si mil gracias" → "¿te gustaría ver nuestro catálogo?" → "Si por favor" → recién ahí el link; **3 turnos para lo que era 1, y tras el link no volvió**. CONV 2 07-11 22:12: "Si claro" → otra vez "¿Te gustaría ver nuestro catálogo?". CSV fila 10 (flag BOT_SI_CATALOGO, "caso real visto por el dueño") + HTML 1.10; Lecciones 23-jul: *"la regla es MOSTRAR al afirmar, nunca re-preguntar"*.

---

### C4 🟠 Preguntan por una marca que SÍ hay
**Frecuencia:** alta.

**Disparadores reales:** "Tienen Nike?" · "tienen Jordan?" · "buenas, tienen adidas y a cómo?" · "los de Blessd" · mal escritas: "addidas", "naik"

**Comportamiento correcto:** clasificar buscar_marca normalizando la ortografía, decir el **número real** de modelos que hay en el catálogo (dato de Firestore, nunca inventado) y **mostrar 2 fotos con precio en el chat** (`fotosIntroMarca`), sondeando estilo si hace falta. Si el mensaje además pregunta precio, responder **ambas cosas** en un mensaje. Estilo del dueño: "¡Y sí, los de Blessd los tengo! 👇". Cerrar con una pregunta de apartado, no con "¿Qué talla calzas?".

**Evidencia consolidada:** CSV fila 6 (ACTIVO) + HTML 1.6; `BANCO-RESPUESTAS-V1` sección 3; `textos.js` L33-34, L514, L541, L543.

**⚠️ CONFLICTO VIGENTE:** `catalogoWebMarca` (L77) responde con el **link** de una — contra regla 7.

---

### C5 🔴 Búsqueda de modelo puntual que falla o devuelve otro modelo
**Frecuencia:** alta — es el flujo estrella de la pauta.

**Disparadores reales:** "¿Tienes Jordan Retro 4?" · "las Nike Air Max blancas" · "Tienes Jordan?" → el bot devolvió **"Adidas campus"** como si fuera el match.

**Comportamiento correcto:** emparejar contra el **nombre completo del catálogo real** (campo marca de la app). 1 match → ficha directa con foto + precio y arranca el pedido (`modeloMatchUno`). Varios → lista con ref + precio para elegir (`modeloMatchVarios`). Ninguno → decirlo honestamente y ofrecer 2 parecidos **declarados como parecidos** ("Ese puntual no lo tengo, pero mira estos que se parecen mucho 👇. ¿Cuál te gusta?"), o asesor + aviso al 320 (`modeloAsesorCliente`). **Nunca presentar otro modelo como si fuera el pedido** — mata la confianza. Nunca inventar refs ni stock (regla 2).

**Evidencia consolidada:** `ESTADO-VARMAN.md` sección [CV1]: bug visto en vivo el 12-jul con Jordan Retro 4, flag BOT_MODELO_ASESOR, batería 292/0. `BANCO-RESPUESTAS-V1` sección 14 arreglo 6 (caso real de la compra de prueba: Jordan → Adidas campus) y sección 3. Pruebas …2786 07-07 13:16 (alucinó "manejamos varias Jordan Retro 4" y no mostró nada) vs 07-12 18:36 (correcto, con lista real: "De ese estilo tenemos 6 🔥 • Jordan retro 4 Cave Stone (Ref 45) — $264.900…"). `textos.js` L110-119.

---

### C6 🟠 Preguntan por una marca o ref que NO existe
**Frecuencia:** media.

**Disparadores reales:** "Tienen Balenciaga?" · "tienen Louis Vuitton?" · "quiero la ref 99"

**Comportamiento correcto:** honestidad, nunca inventar (regla 2): "De *{marca}* no tengo referencias marcadas todavía 🙈" / "esa referencia no la encuentro en el catálogo", mostrar lo que sí hay y abrir la puerta al asesor. **Aquí sí procede el link** (regla 7: no está lo que busca).

**Evidencia consolidada:** CSV filas 7 y 11 (ACTIVO) + HTML 1.7 y 1.9; `textos.js` L52 (`marcaSinResultados`), L79, L81, L393-394; ESTADO CW2.

**⚠️ CONFLICTO VIGENTE:** el texto viejo `refNoEncontrada` (L146) obliga a reiniciar ("Escribe *hola* para ver el catálogo de nuevo") — contra regla 11.

---

### C7 🟠 Insiste por la marca o el modelo que no hay
**Frecuencia:** baja-media.

**Disparadores reales:** "las quiero sí o sí" · repetir la misma pregunta de marca por segunda vez.

**Comportamiento correcto:** **no repetir el catálogo**: pasar a asesor con aviso inmediato al 320 incluyendo el último mensaje textual, y el bot **calla** con ese cliente (reglas 2 y 9). Estilo del dueño: "Esas puntuales no las tengo en catálogo ahorita 🙈… se la paso a un asesor para que te confirme si la conseguimos 📲".

**Evidencia consolidada:** CSV fila 8 (ACTIVO) + HTML 1.7 nota; `textos.js` L106-109 (el comentario documenta el antipatrón previo); `ESTADO-VARMAN.md` [CV1] punto (B) — fallback tras dos fallos de pinpoint; `BANCO-RESPUESTAS-V1` sección 3 y 14 arreglo 8.

---

### C8 🔴 El catálogo se condiciona a que el cliente entregue primero la talla o los datos
**Frecuencia:** media — contribuyó a una pérdida hostil.

**Disparadores reales:** "Manda el catalogo" en medio del flujo → "¡Claro que sí! Con gusto te comparto nuestro catálogo, **pero primero confírmame tu talla**" · "Primero terminemos de registrar tus datos para el envío y con gusto te comparto nuestro catálogo".

**Comportamiento correcto:** si pide el catálogo, **se le da** (sondeo + 2 fotos, link como apoyo) sin condicionarlo a nada. Un pedido a medias no es rehén. "catálogo" debe funcionar como escape en cualquier paso.

**Evidencia consolidada:** …9007 (El Dey) 14-jul 20:34 — **PERDIDO justo después**, y en el mismo chat escaló a "Q estafador". Prueba …2786 15-jul 12:47 (×2). CSV fila 24 (flag BOT_CATALOGO_PIDE v6.8+) + HTML 2.8, y fila 27 (HUECO #2).

---

### C9 🟠 Mensajes y links que llegan cortados
**Frecuencia:** media.

**Disparadores reales:** "https://varmancr" (13-jul) · "varmancrew.com/#c" (14-jul) · lista interactiva cortada a mitad de frase: "...no puedo ver las imágenes*. ¿S" (18-jul).

**Comportamiento correcto:** ningún mensaje sale cortado: respetar los límites de caracteres de las listas de WhatsApp y verificar que URLs y frases lleguen completas.

**Evidencia consolidada:** `informe-barrido-bot-2026-07-20.html` hallazgo #3 (citas de links rotos); visor 07-13 (Diego Castillo …7027 recibió el link truncado en el mismo mensaje con el que se perdió).

---

### C10 🟠 "¿Lo tienen en otro color?"
**Frecuencia:** media.

**Disparadores reales:** "Lo tiene en color negro" · "Y blaco" · "Bueno mándame en negro" · "La tienes en rojo?" · "¿hay en rojo?" · "¿lo tienen en otro color?"

**Comportamiento correcto:** solo catálogo real, **nunca inventar colores** (regla 2). Si existen **refs hermanas** (mismo nombre, el color va en el campo marca — ej. refs 60-70 "Puma Ballet X"): nombrar un color lleva a **esa ficha directa**, y "¿otros colores?" muestra la lista de colores + 2 fotos, sin mandar a la web. Si el color es único: honestidad — "esa referencia solo la manejamos en el color de la foto 🙏" + alternativas parecidas por nombre.

**Evidencia consolidada:** **inconsistencia real:** CONV 4 / …9007 (14-jul 20:25) **inventó disponibilidad de un color inexistente**: "¡Claro! Ese modelo en negro es una chimba. Para confirmarte la disponibilidad…" (además con "chimba" y coletilla de talla). Versión honesta correcta el 15-jul 12:45. CSV fila 22 (flag BOT_COLOR_CATALOGO) + HTML 2.6; `textos.js` L182-184 (clásico, con link) y L383-389 ([COLORES] / [COLORES-FAMILIAS] modo conversa, verificado en vivo el 23-jul).
**⚠️ Detalle de tono:** `conversaColorUnico` (L386) termina en "¿Te muestro otros modelos…?" — roza la prohibición de "¿te muestro?" (regla 6).

---

### C11 🟠 "¿Estas son para dama?" — género del modelo
**Frecuencia:** baja-media.

**Disparadores reales:** "Estas son para dama ?" · "Para caballero"

**Qué hacía el bot:** "¡Claro que sí, estos modelos se ven increíbles en dama!" — halago improvisado **sin dato real**.

**Comportamiento correcto:** responder con el dato del catálogo; si no está, lo confirma un humano (regla 2). No improvisar halagos como respuesta ni abrir con "¡Claro que sí!" (regla 6).

**Evidencia consolidada:** CONV 2 (13-jul 09:21). Relacionado con el sondeo `conversaSondeoOpciones` ("¿Los buscas para dama o caballero? 😊", `textos.js` L374-382).

---

## D. Tallas

### D1 🔴 El bot pregunta la talla (prohibido) y ahí se muere el embudo
**Frecuencia:** máxima — afecta a **todos** los clientes; es el punto de fuga nº1.

**Disparadores reales:** cualquier ficha mostrada → "¿Qué *talla* buscas? Escríbeme el número (manejamos de la *35 a la 45*)" / "¿Qué *talla* calzas? (de la *35 a la 45*)".

**Comportamiento correcto:** el bot **nunca** pregunta la talla (regla 2). Dice "manejamos todas las tallas disponibles 🙌 la confirmamos contigo al alistar tu pedido" (`conversaTodasTallas`); el pedido puede salir con talla "?" y un humano la confirma. Si la ref tiene rango propio en la app, se puede nombrar ("todas las tallas disponibles de la 35 a la 39"). La pregunta de avance es la **ciudad**, no la talla.

**Evidencia consolidada:** ~20 leads pagos enmudecieron exactamente aquí (ver A1 y B1). `textos.js` L422-424 ya tiene el texto correcto, **pero la contradicción vigente es masiva**: `eligeReferencia` (L137), `pedirTalla` (L145), `pedirTallaCorta` (L144), `tallaInvalida` (L158), `pedirTallaSimple` (L162), `tallaListaHeader/Body` (L169-174), `reintentoTalla` (L290), `pasoTalla` (L455) y el prompt del asistente (L552) siguen preguntando talla y citando "35 a la 45". En v8 se eliminó la pregunta; hay que limpiar los restos.

---

### D2 🔴 Bucle de interrogatorio de talla / sistema / género (el caso más doloroso del barrido)
**Frecuencia:** 1 caso extremo real + re-pregunta de talla en ≥6 conversaciones más.

**Disparadores reales (El Dey, …9007, 14-jul 20:24-20:34, 31 mensajes):** "Para caballero" → "Taya 38" → "Sisas te ma nasional" → "48", y el bot repreguntó ~15 veces "¿me confirmas qué talla eres y si es en sistema nacional o europeo y si es para hombre o mujer?" → escalada del cliente: "Aja bendes siono" → "Q cule preguntadera" → "No bendas nada" → "No grasiad" → "Q estafador" → al día siguiente "Canselar".

**Comportamiento correcto:** no preguntar la talla nunca (regla 2). Con "Taya 38" bastaba: anotarlo y avanzar. Ante ortografía no estándar, **una** reformulación amable (regla 11). Jamás dos preguntas en un mensaje (regla 6). Si el cliente da un dato claro, capturarlo **determinista antes** de Gemini. Antibucle: desde la 2ª repetición, variante breve con salidas (catálogo / asesor) y tras N vueltas **handoff automático** al 320.

**Evidencia consolidada:** `informe-barrido-bot-2026-07-20.html` hallazgo #2 + barrido CONV 4 + visor …9007. **CLIENTE PERDIDO Y HOSTIL**. Caso multiviolación: además "parcero", "chimba", "calidad 1.1" y catálogo condicionado. Lección 15-jul del ESTADO: *"si Gemini repregunta sin extraer el dato, el bot ignora la talla que el cliente SÍ dio → bucle infinito (caso real)"*. Origen de BOT_TALLA_ROBUSTA, BOT_ANTIBUCLE y de la eliminación total de la pregunta de talla en v8. CSV fila 19 + HTML 5.5.

---

### D3 🔴 El cliente YA dio la talla junto con la ref y el bot se la vuelve a pedir
**Frecuencia:** media.

**Disparadores reales:** "Ref 08 talla 38" → el bot muestra la ficha y pregunta "¿Qué talla buscas?" · "Está talla 38" → el bot inventó "avísame de la ref 05 talla 40" · "Hola 👋 me interesan las Adidas Equipment (Ref 51). Precio" → foto + pregunta de talla, **ignorando "Precio"**.

**Comportamiento correcto:** parsear ref + talla + precio del mismo mensaje: confirmar lo que dio, **responder lo que preguntó** (precio con foto) y no re-preguntar nada ya dicho.

**Evidencia consolidada:** Martin Vargas …4446 (08-jul 10:42 y 10:46); henrygutierrezmolina0 …3458 (14-jul, cliente de 1 mensaje — PERDIDO); barrido CONV 43.

---

### D4 🟠 "¿Tienen la 42?" — pregunta por stock de talla, no es su talla
**Frecuencia:** media.

**Disparadores reales:** "¿Tienen la 42?" · "¿tienen la 35?" · "¿hay 42?" · "¿manejan la 39?"

**Comportamiento correcto:** **no** tomarla como su talla y **no adivinar stock** (regla 2): "manejamos todas las tallas disponibles, la confirmamos al alistar tu pedido". Solo se anota si el cliente dice que esa es la suya. Lo que no sabe, lo confirma un humano.

**Evidencia consolidada:** CSV fila 18 (IA, FLAG); `textos.js` L552 — el prompt ya lo distingue: *"No inventes datos que no sabes (ej. si una talla puntual hay en stock): ofrece que un asesor lo confirma"*.

---

### D5 🟠 "No sé mi talla"
**Frecuencia:** media.

**Disparadores reales:** "No sé mi talla" · "Uy no sé qué talla soy" · "No sé qué talla soy, ¿me ayudas?" · "Me dio 26 cm" · "mi pie mide 25 cm"

**Comportamiento correcto:** no trancarse ni repetir la plantilla como robot: "manejamos todas las tallas disponibles, la confirmamos al alistar tu pedido" y **avanzar**; la equivalencia la confirma un humano (regla 2). Si el cliente mismo da la medida en cm, el **código** puede convertirla con la tabla aprobada aclarando que se confirma al alistar (`tallaDesdeCm`), pero el bot no improvisa guías ni equivalencias por su cuenta.

**Evidencia consolidada:** CONV 1 (pruebas, 08-jul 16:47): repitió 2 veces "Manejamos tallas de la 36 a la 45. Escríbeme solo el número" sin ayudar y el flujo terminó en "Cancelar". La versión del 13-jul 10:21 improvisó guía de medir el pie y equivalencias nacional→europea, que también viola la regla 2. CSV filas 15-16 (BOT_ROBUSTEZ / BOT_TALLAS_V2) + HTML 2.3; `textos.js` L153-156, L552.

---

### D6 🟠 Talla en sistema nacional o US, o fuera del rango informado
**Frecuencia:** media (nacional/US) · baja (fuera de rango).

**Disparadores reales:** "Yo calzo 38 nacional" · "39 nacional" · "8.5 US" · "10" · "35" (rechazada el 07-jul) · "48"

**Comportamiento correcto:** **no rechazar ninguna talla** ni exigir "escríbeme solo el número". No interrogar por sistema ni género: la equivalencia exacta la confirma un humano al alistar (regla 2). Ninguna talla cierra la puerta; si hay duda de disponibilidad, un asesor confirma y se avisa al 320.

**Evidencia consolidada:** CONV 1 07-07 19:33 ("35" → plantilla repetida) y CONV 4 07-14 20:30 ("48" → "Esa talla está por fuera de nuestro rango… ¿nacional o europea?" y siguió el bucle). `BANCO-RESPUESTAS-V1` fila "Tallas" y sección 14 arreglo 1 (bloqueaba ventas de talla 35). `textos.js` L148-158, L552; lección L159-161: la palabra **"sistema" enredaba a los clientes** → BOT_TALLA_ROBUSTA. Tabla histórica: nacional dama +1, hombre +2 (hoy la conversión pasa al humano).

---

### D7 🟠 Rango de tallas inconsistente entre bot y web
**Frecuencia:** baja, pero es riesgo de vender lo que no existe.

**Disparador:** los textos dicen "36 a la 45" en unos lados y "35 a la 45" en otros; la web se corrigió el 18-jul a CO 35-42 = **EU 37-44** y el bot siguió diciendo "35 a 45".

**Comportamiento correcto:** dejar de citar rangos: "manejamos todas las tallas disponibles, la confirmamos al alistar tu pedido". Si hay rango por ref en la app, usar **ese**. Decisión del dueño pendiente.

**Evidencia consolidada:** `informe-barrido-bot-2026-07-20.html` "Riesgos de datos"; `ESTADO-VARMAN.md` sesión 18-jul (decisión abierta); HTML tabla de huecos #7.

---

### D8 🟡 Tallas por botones (lista interactiva)
**Frecuencia:** media, si se activa.

**Comportamiento correcto:** si se usa la lista, rotular por talla **nacional** con la EUR al lado (equivalencia hombre); mujer, US y 45 van por texto y el bot convierte. Cero errores de dedo. Con la regla 2 vigente este flujo es opcional, no el camino principal.

**Evidencia consolidada:** HTML escena 2.4 (flag BOT_TALLA_BOTONES), no está en el CSV; `textos.js` L169-174.

---

## E. Fotos que manda el cliente

### E1 🔴 El bot finge haber visto la foto y afirma que no tiene el modelo
**Frecuencia:** alta — 5+ clientes reales, varios perdidos.

**Disparadores reales:** "[imagen]" · "Tienes este modelo" · "Tienes estos" · "Me gusta este modelo" · "Busco este modelo" · "Estos"

**Qué hacía el bot (12-17 jul):** "¡Qué buen modelo! 🔥 Esas puntuales no las tengo ahorita 🙈. Ya le pasé tu foto a un asesor…" — adivina stock **en negativo** sin poder ver la imagen y contradice la otra plantilla que sí dice "no puedo ver imágenes".

**Comportamiento correcto:** regla 8 — decir **claro que es un bot y que no puede ver imágenes**, ofrecer las refs marcadas en la app (lista tocable) con la salida "Ninguna de estas 🙋", y **reenviar siempre la foto al 320**. Nunca afirmar ni negar que se tiene el modelo. Una sola vez, sin repetir plantilla por cada foto.

**Evidencia consolidada:** CONV 5 (😎 …0135): 10 imágenes → **10 veces la misma plantilla**. CONV 9 (Andrés Vargas …9003): 4 intentos ignorados. CONV 10 (Fabian Moreno): 3 imágenes ignoradas en el paso de talla. …9383 (Jhosep David) 17-jul 19:59. Corregido el 18-jul (v6.9, caso Jhon Carter …4800: "soy el *asistente virtual (bot)* … *no puedo ver las imágenes*" + lista de refs + aviso 📸). CSV fila 9 (flag BOT_FOTO_REFS) + HTML 1.8; `textos.js` L91-105.

**⚠️ CONFLICTO VIGENTE:** la variante E1 `fotoAsesorCliente` (L88) todavía dice "¡Qué buen modelo! 🔥" e implica que vio la foto, sin declararse bot.

---

### E2 🔴 Álbum o ráfaga de fotos: una respuesta por imagen y spam de avisos al 320
**Frecuencia:** media, sistémico con álbumes; 2+ casos verificados.

**Disparador real (César, …0135, Armenia, 18-jul 04:53):** 8-9 fotos seguidas + "Buenos días hablas con César desde la ciudad de Armenia Quindío me regalas precios por favor de cada uno". El bot respondió **9 veces el mismo texto y disparó ~18 avisos idénticos al 320** (que Meta ni entregó). Una hora después escribió "¡Hola! Quiero más información" y **no recibió respuesta**.

**Comportamiento correcto:** **agrupar** las imágenes de una ventana de 1-2 min (dedupe por message_id) → **una** respuesta y **un** aviso al 320 con las fotos reenviadas. Declararse bot, decir que el asesor le confirma esos modelos, y mientras tanto mostrar 2 refs marcadas con foto + precio para no dejarlo en frío. **Nunca** despacharlo con el rango genérico + link.

**Evidencia consolidada:** `informe-barrido-bot-2026-07-20.html` hallazgo #4, **verificado independientemente ×2** (se repitió con otro cliente el 17-jul). CONV 5 del barrido: a las 04:53 rango $235.000-$480.000 + link; a las 05:49 quedó en 🔇. **CLIENTE PERDIDO de alto valor** — *"cliente con plata en la mano, perdido"*, quería varios pares; uno de los 4 calientes recuperables. HTML HUECO #4. **La agrupación sigue pendiente (encargo #3).**

---

### E3 🔴 Foto con contexto humano ignorada: "es para mi papá"
**Frecuencia:** media-alta — las fotos de anuncios son la fuente principal de leads.

**Disparadores reales (Andrés Vargas …9003, 09-jul 14:52-14:58):** "[foto]" → "Me gusta este modelo" → "Es que son para mi papá y el quiere ese modelo" → "Calza 39" → "Busco este modelo". El bot respondió con la bienvenida repetida y catálogo genérico 4 veces, incluido un "¡Claro que sí!" prohibido.

**Comportamiento correcto:** declararse bot que no ve imágenes, **una línea** reconociendo el detalle, y **resolver**: pedir el nombre o número de la referencia (están marcadas en la app) y, si no lo tiene, asesor con la foto reenviada al 320 (y el bot calla 4 h). Registrar la talla que dio. Nunca reenviar el catálogo ignorando la pregunta.

**Evidencia consolidada:** visor `conversaciones-bot-2026-07-21.html` líneas 254-280 (transcripción completa); `CONVERSACIONES-INCOMODAS` Caso 2 — el dueño pide *"haberlo felicitado, pero… responder a la solicitud y pedirle el nombre de la referencia y si dado caso no lo tiene enviarlo al chat del 320"*; `BANCO-RESPUESTAS-V1` sección 14 arreglo 8. **CLIENTE PERDIDO**, compraba para su papá y dio talla y modelo: uno de los 4 calientes recuperables.

---

### E4 🔴 Tras "Ninguna de estas 🙋" el bot no calla y saluda al cliente como nuevo
**Frecuencia:** media (1 caso real, pero el fallo del aviso afectó todos los handoffs del 21-22 jul).

**Disparador real (caso Andrés, +57 317 302 4405, 22-jul):** manda foto de unas Adidas Samba vinotinto, toca "Ninguna de estas 🙋", el bot promete asesor… y 12 min después el cliente reclama "Me cuenta" y luego "Estos" — **el bot lo saluda como cliente nuevo y le tira el catálogo**. El aviso de handoff al 320 nunca llegó: la plantilla `aviso_bt` estaba creada en la cuenta de Meta equivocada ("Test WhatsApp Business Account") → **error 132001 en TODOS los avisos desde el 21-jul**.

**Comportamiento correcto:** tras cualquier handoff (palabra "asesor", foto→asesor, antibucle) el bot **calla 4 h** con ese cliente y **reenvía cada mensaje suyo al 320** (regla 9, BOT_SILENCIO_HANDOFF). Todo aviso al dueño va por **plantilla aprobada en la cuenta correcta**, con registro de fallos de entrega (BOT_LOG_FALLOS).

**Evidencia consolidada:** ESTADO Obsidian sección "Caso Andrés (22 jul)" + `brief-2026-07-22-cierre-confianza.md` (citas "Me cuenta", "Estos"); `textos.js` L102-105, L448-450. **CASI PERDIDO**: la venta se salvó solo porque el dueño entró a mano desde el 320 (15% hoy → $212.400, talla 41). Origen de BOT_SILENCIO_HANDOFF, BOT_CIERRE_CONFIANZA y BOT_DESCUENTO_CIFRA.

---

### E5 🟠 Nota de voz, video o sticker
**Frecuencia:** media — comportamiento hoy correcto, con un ajuste pendiente.

**Disparadores reales:** "[audio]" · "🎤 Audio" · sticker · video.

**Comportamiento correcto:** `mediaNoSoportado` — "Por aquí te leo mejor 🙌 ¿Me lo escribes en un mensajito de texto? Así te ayudo de una 😊", **sin tocar la sesión** ni el pedido en curso. **Ajuste pendiente:** tras 1 reintento, ofrecer asesor — hay clientes que solo se comunican por voz.

**Evidencia consolidada:** CONV 15 (Chila Caicedo, 15-jul 15:08) y CONV 4 (…9007, 14-jul 20:31): respuesta correcta y consistente, **caso de referencia positiva**. Chila luego pidió el catálogo, recibió el link y no volvió — PERDIDA por C1, no por el audio. CSV fila 47 (flag BOT_FLUIDEZ_RECONDUCE) + HTML 5.4; `textos.js` L298-301 (antes respondía con el catálogo o la plantilla del paso).

---

## F. Objeciones, confianza y tono

### F1 🔴 "Calidad 1.1" dicho a clientes reales (violación grave y repetida de la regla 1)
**Frecuencia:** alta — **7+ conversaciones con clientes reales de anuncio**; estaba escrito en el prompt de esa versión.

**Disparadores reales:** cualquier pregunta de "más información" o de legitimidad. Frases textuales del bot:
- "manejamos tenis **calidad 1.1** con envío incluido a todo el país"
- "Tenemos tenis **calidad 1.1** de la talla 35 a la 45"
- "¡Claro que sí, parcero! Manejamos **calidad 1.1** con envíos a todo el país"
- a "Q estafador": "manejamos **calidad 1.1** con excelentes materiales y precios justos"

**Comportamiento correcto:** regla 1 — **"importados, de excelente calidad"**. Prohibido "calidad 1.1", "réplica", "AAA". Nunca afirmar **ni negar** que son originales de marca. Describir en positivo y cerrar con una pregunta de avance sobre el modelo.

**Evidencia consolidada:** barrido CONV 5 (18-jul 04:47), CONV 8 (17-jul 20:00), CONV 12 (19-jul 10:43), CONV 13 (17-jul 17:01), CONV 14 (17-jul 15:18), CONV 4 (14-jul 20:32 y 20:34), CONV 2 (13-jul 20:42). Visor: …9007, …6036 (Adrian), …9617 (kevin santos), …9383 (Jhosep David), …0135 (😎), …7832 (Eduardo). CSV fila 36 (ACTIVO) + HTML tabla 4 y escena 4.1.
**⚠️ CONFLICTO VIGENTE Y RIESGO REAL HOY:** el prompt del clasificador (`textos.js` L514) y el del asistente (L552) siguen diciendo "tenis de calidad 1.1… destaca la calidad 1.1", y el few-shot L540 responde literalmente "Son calidad 1.1, alta gama…". La corrección (`TONO_SOCIO_EXTRA` L521) solo se **anexa** con BOT_TONO_SOCIO=on y el few-shot contradictorio se queda dentro del prompt.

---

### F2 🟠 "¿Esos sí son originales?"
**Frecuencia:** alta — objeción clásica con sección propia aprobada en el playbook.

**Disparadores reales:** "Esos sí son originales?" · "¿Son originales?" · y la insistencia: "¿sí o no son originales?"

**Comportamiento correcto:** pivotear a la calidad **sin afirmar ni negar autenticidad** (regla 1): "Son importados, de la mejor calidad que se consigue — te van a encantar". Nunca decir "no son originales" (daña la venta) ni afirmar que lo son. Apoyar con garantías reales: pago seguro Wompi, contra entrega en Bogotá, video del pedido, guía de rastreo. Cerrar con **una** pregunta de avance sobre el modelo — no con "¿Te muestro el catálogo?" (regla 6).

**Evidencia consolidada:** `BANCO-RESPUESTAS-V1` sección 2 (Opción A aprobada por el dueño) y fila "Calidad": *"NO repetir 'no son originales' (daña la venta). Guardrail: NUNCA afirmar que son originales de marca"*. CSV fila 36 + HTML tabla 4 / escena 4.1 — la plantilla activa viola las reglas 1 y 6. `textos.js` L540 (few-shot). No aparece textualmente en el barrido porque el bot soltaba "calidad 1.1" antes de que preguntaran, pero la pregunta directa es inevitable.

---

### F3 🔴 Acusación de estafa o desconfianza abierta
**Frecuencia:** baja-media en volumen, **alto daño reputacional**.

**Disparadores reales:** "Q estafador" · "Aja bendes siono" · "Manda el calor careverdmga" · "¿Cómo sé que no me van a robar?"

**Comportamiento correcto:** reconocer la desconfianza sin discutir ni ponerse a la defensiva, en **una** pregunta: somos tienda virtual, producto importado de excelente calidad, y **una** prueba de confianza por mensaje (contra entrega en Bogotá / pago seguro Wompi con Bancolombia / video del pedido con su nombre / guía de rastreo). Ofrecer asesor humano de inmediato con aviso al 320.

**Evidencia consolidada:** CONV 4 / …9007 (14-jul 20:34): el bot respondió a "Q estafador" con "manejamos calidad 1.1 con excelentes materiales" — **empeora la desconfianza y viola la regla 1** — y siguió pidiendo talla. **CLIENTE PERDIDO**. CSV fila 42 (FLAG, IA asistente v2) + HTML 4.2 caja "regla de oro" (un gancho por mensaje, sin repetirlo); `BANCO-RESPUESTAS-V1` sección 13.

---

### F4 🔴 Tono prohibido: "parcero", "chimba", "¡Claro que sí!", dos preguntas por mensaje
**Frecuencia:** alta — **decenas de mensajes a clientes reales**, sobre todo en la versión "Cerebro" Gemini del 13-15 jul.

**Violaciones textuales documentadas:**
- "¡Claro que sí, **parcero**!" (…9007 ×3-4, …0619 09-jul), "¡Listo, **parcero**!", "¡Uy, qué pasó **parcero**!"
- "los Jordan son una **chimba**", "Ese modelo en negro es una **chimba**"
- "¡Ey, qué energía!" **a un cliente que estaba insultando**
- decenas de aperturas con "¡Claro que sí!", "¡Qué nota!"
- dobles burbujas contradictorias, 2-3 emojis, 2+ preguntas por mensaje, "*VarMan Crew*" con asteriscos

**Comportamiento correcto:** regla 6 — colombiano cálido y **profesional**. Prohibido parcero/parce/chimba/mor/bro y mexicanismos (te late, órale, chido). **Máx 1 emoji y 2 frases.** Prohibido abrir con "¡Claro que sí!". Todo mensaje de venta termina en **una sola** pregunta. "VarMan Crew" sin asteriscos.

**Evidencia consolidada:** barrido CONV 4 (14-jul 20:25, 20:29, 20:33), CONV 1 (13-jul 10:22; 09-jul 14:32), CONV 2 (09-jul 14:39). Visor …9007, …2786, …0619.
**⚠️ CONFLICTO VIGENTE:** varios textos activos abren con la fórmula prohibida — `cantidadPregunta`, `cambioRefIntro`, `cambioModeloIntro` ("¡Claro que sí! 😊", `textos.js` L282-286, L294-297) y `listaEsperaFaltaRef` ("¡Claro que te avisamos!").

---

### F5 🟠 "¿Y si no me sirven / no me gustan?"
**Frecuencia:** media.

**Comportamiento correcto:** hoy se responde con el gancho del dueño: "Tranquilo, antes de enviar te grabo un video de tu pedido con tu nombre 📦" + reencaminar al paso. **HUECO #6 abierto:** la política de cambios y devoluciones **no está definida** — el dueño debe definirla; mientras tanto **no prometer cambios que no existen**.

**Evidencia consolidada:** CSV fila 40 (FLAG, nota DEFINIR) + HTML tabla 4 y tabla de huecos #6; `textos.js` L571 (few-shot "y si no me sirven?"), L570 (regla de un gancho por mensaje).

---

### F6 🟠 Desconfianza en el momento del cierre (caso Andrés)
**Frecuencia:** media — aplica a todo cierre con pago anticipado.

**Disparadores reales:** "¿y si no me llega?" · "¿es seguro?" · el cliente recibe el link y no paga.

**Comportamiento correcto:** anexar el bloque de confianza aprobado (`cierreConfianzaLinea`): "Todos nuestros envíos son seguros 🙌 te enviamos foto o video de tu pedido cuando lo alistamos, y te compartimos la guía de rastreo con la transportadora que te quede más cómoda". Se pega a `wompiLinkCliente`, a las instrucciones de pago y a contra entrega. Máximo un gancho por mensaje, sin repetirlo.

**Evidencia consolidada:** `textos.js` L355-357 y L498-508 ([CIERRE-CONFIANZA], "caso Andrés 22-jul") + `brief-2026-07-22-cierre-confianza.md`. Caso real con nombre propio: el flag nació de esa venta en riesgo.

---

### F7 🟡 El bot niega que exista la página web
**Frecuencia:** baja (2 veces, en pruebas) — inconsistencia flagrante.

**Disparadores reales:** "Tiene página web" · "Tienes página web" → el bot respondió **"Por ahora gestionamos todos los pedidos directamente por aquí para darte una atención más personalizada"**, dos veces, mientras otras plantillas mandaban el link a cada rato.

**Comportamiento correcto:** **nunca negar la web.** Afirmar y compartir varmancrew.com cuando el cliente la pide explícitamente — es uno de los pocos casos donde el link sí va de una (regla 7).

**Evidencia consolidada:** CONV 2 / …0619, 11-jul 17:25 y 18:52. La web ya era el plan y se lanzó con carrito el 18-jul. Verificar que la versión actual no la niegue.

---

## G. Descuentos, cantidad y multi-par

### G1 🔴 Preguntan por descuento y el bot lo niega, lo ignora o da solo el porcentaje
**Frecuencia:** media-alta — 4+ conversaciones, 1 cliente real perdido.

**Disparadores reales:** "Hacen descuentos ?" · "Hay alguna promoción ?" · "Hay rebaja?" · "Y si llevo dos" · "Uy muy caro no?" · "¿me lo deja en menos?"

**Qué hacía el bot:** "Por ahora no tenemos descuentos activos" (contradice la regla 4) · o respondía **dos veces la plantilla de talla** ignorando la pregunta · o daba "un 10%" sin la cifra.

**Comportamiento correcto:** regla 4 — máximo **10% con una razón** (primera compra, pago hoy, seguir redes), **15% solo por 2 pares**, y **siempre la cifra final en pesos calculada** ("queda en $212.400"), nunca solo el %. Tono "te lo respeto por hoy", suave, sin presionar. Recordar que el envío ya va incluido. Si presiona por más: sostener el tope y ofrecer el combo de 2 pares con la cifra final. Estilo del dueño: "El precio normal es fijo, pero por ser tu primera compra con el Crew te dejo un 10% si cerramos hoy 🙌".

**Evidencia consolidada:** **Martin Vargas …4446 (real): "Y si llevo dos" y "Hay rebaja?" → plantilla de talla ×2 → CLIENTE PERDIDO sin respuesta.** CONV 2 (09-jul 14:39) negó los descuentos. `BANCO-RESPUESTAS-V1` sección 8 (citas del dueño) y fila "Descuentos" ("No regalar"). CSV fila 37 (ACTIVO) + HTML tabla 4 / escena 4.2; `textos.js` L514, L521-522 (DESCUENTO_CIFRA_EXTRA, "caso Andrés"), L571. `informe-barrido-bot-2026-07-20.html` hallazgo #2: **venta MAYOR ignorada por el secuestro de estados**.

---

### G2 🔴 Promo ofrecida que no se cobra: 15% prometido y total sin descuento
**Frecuencia:** baja en ocurrencias, **crítico cuando pasa**.

**Disparador real:** el bot ofreció "Por la compra de dos pares te damos un 15% de descuento", el cliente anotó "2 pares" y el total mostrado fue **$529.800 = 2 × $264.900 exactos, sin el 15%**. Otro pedido: 2 × $249.900 = **$499.800 exacto**.

**Comportamiento correcto:** **promo ofrecida ⇒ promo cobrada.** El total debe traer el descuento aplicado y la cifra final visible: 2 × $329.900 = $659.800 − 15% = **$560.830**. Si la promo no existe, no se ofrece.

**Evidencia consolidada:** pruebas …2786 13-jul 14:32-14:34; `informe-barrido-bot-2026-07-20.html` "Riesgos de datos"; CSV filas 20-21 + HTML 2.5 caja: *"PELIGRO: hubo un caso donde se OFRECIÓ el 15% y el total salió SIN el descuento aplicado"*; `brief-2026-07-22-cierre-confianza.md` Cambio 2 (BOT_DESCUENTO_CIFRA) con el test "promo ofrecida ⇒ promo cobrada". Riesgo directo de reclamo o de cobrar mal.

---

### G3 🔴 "Puedo llevar 2" ignorado por la plantilla del paso
**Frecuencia:** media — documentado en la compra de prueba y en un cliente real.

**Disparadores reales:** "Puedo llevar 2" · "Puedo llevar 2?" · "quiero 2" · "Y si llevo dos"

**Qué hacía el bot:** "Manejamos tallas de la 36 a la 45 👟. Escríbeme solo el número…" — ignoraba una intención de **comprar más**.

**Comportamiento correcto:** decir que sí, actualizar cantidad y total **en pesos**, y aprovechar para ofrecer el 15% por 2 pares con la **cifra final calculada** ("los 2 pares quedan en $560.830"). Si el cliente escribe "2" sin la palabra "pares", guiarlo al formato entendible sin perder el paso. Nunca repetir la plantilla del paso.

**Evidencia consolidada:** `CONVERSACIONES-INCOMODAS` Caso 3, cita real: *"Cristhian: Puedo llevar 2"* → *"Bot: Manejamos tallas de la 36 a la 45 👟…"*. **CLIENTE PERDIDO: tras el bucle escribió "Cancelar" dos veces y abandonó.** `BANCO-RESPUESTAS-V1` sección 14 arreglo 3; CSV fila 20 (flag BOT_FLUIDEZ) + HTML 2.5; `textos.js` L294-297 (el comentario cita "caso real 3, BANCO §8") y L252 (`cantidadNota`).
**⚠️ CONFLICTO VIGENTE:** `cantidadPregunta` abre con "¡Claro que sí!" (prohibido, regla 6).

---

### G4 🟠 Quiere 2 pares de modelos DISTINTOS y el flujo solo duplica el mismo
**Frecuencia:** media.

**Disparadores reales:** "Quiero llevar dos diferentes modelos" · "Pero quiero que sean diferentes modelos no dos del mismo" (repetido 3 veces) · "Solo estoy pagando una ?"

**Comportamiento correcto:** soportar **2 referencias distintas** en un pedido, con el 15% y la cifra final; o pasar a asesor con aviso al 320 ("intención de compra de 2 pares") antes de forzar el flujo. Si el cliente duda de la cantidad, **responder la duda**: aclarar cantidad y total exacto en pesos antes de volver al método de pago — nunca contestar con la plantilla de métodos de pago.

**Evidencia consolidada:** pruebas …2786 13-jul 14:33-14:35 (pidió modelos diferentes 3 veces y el bot cobró $529.800 de un solo modelo ×2) y …0619 09-jul 14:40-14:43 ("Solo estoy pagando una ?" → métodos de pago sin aclarar cantidad). Martin Vargas …4446 (real, PERDIDO). `BANCO-RESPUESTAS-V1` sección 14 arreglo 5.

---

## H. Pago y cierre por ciudad

### H1 🔴 Link Wompi enviado y cero seguimiento: el pedido queda "pago_pendiente" para siempre
**Frecuencia:** alta — **el 100% de los links Wompi del barrido quedaron sin pagar y sin rescate**.

**Disparador:** el cliente elige Wompi, recibe el link y no paga.

**Comportamiento correcto:** aviso al 320 de "link enviado" (ya existe) **+ rescate**: recordatorio suave único (`conversaLinkRecordatorio`) y, si sigue dando vueltas, cambiar de táctica (ver H6). Regla 12: cada momento de venta genera aviso inmediato al 320 para que el dueño pueda entrar en vivo.

**Evidencia consolidada:** CONV 2 (19-jul 05:40, lista "Pedidos" del 320): **3 pedidos reales en pago_pendiente sin seguimiento** — Natalia nieto Ref 56 $239.900 (18/7), Varman Ref 40, Cristhian Ref 22. El cliente real **Brayan (Medellín, 16-jul 22:37) recibió link Wompi real y nunca más escribió**. CSV fila 28 (ACTIVO PRODUCCIÓN) + HTML 3.1.

---

### H2 🔴 "Quiero contra entrega" desde fuera de Bogotá — la objeción #1 del negocio
**Frecuencia:** alta — el dueño la marca como **objeción número 1**.

**Disparadores reales:** "Manejas contra entrega ?" · "¿No manejan contra entrega?" · "yo solo pago contra entrega" (dispara en cualquier paso).

**Comportamiento correcto:** plantilla aprobada por los socios, en dos burbujas: (1) empatía ("¡Claro que te entiendo!") + razón honesta (logística propia solo en Bogotá) + Wompi 100% seguro (Bancolombia); (2) ganchos de confianza (guía de rastreo, envío **gratis**, tienda establecida en varmancrew.com) + cierre "¿Te comparto el link de pago para apartar tu talla? 👟". **Nunca** "por seguridad no". En modo conversa el cierre cambia a ofrecer asesor. Debe responder **en cualquier paso** del pedido.

**Evidencia consolidada:** `textos.js` L347-353 ([TEXTOS-SOCIO], "texto APROBADO", reunión de socios 22-jul); CSV filas 34 y 43 (fila 43 = PROPUESTA POR APROBAR; la 34 activa es seca y no convierte) + HTML 3.3 caja PROPUESTA y tabla de huecos #3. **Cliente perdido:** Jhosep David …9383 (17-jul 20:04 → 23:05) se fue en esta objeción.

---

### H3 🔴 El bot no acepta el "no" en el paso de pago
**Frecuencia:** media (prueba del dueño; riesgo alto con clientes reales) — bug del flujo real.

**Disparadores reales:** "Pero quiero ver las fotos de los modelos" · "No voy a pagar sin ver que voy a comprar" · "Ya no quiero comprar" (×2) · "Quiero otro modelo" · "Quiero ver más modelos" — y a **cada** mensaje: "¡Perfecto! 📦 Tu pedido va quedando listo. Total a pagar: $499.800 ¿Cómo prefieres pagar?" (**8 repeticiones**). Además dos burbujas contradictorias: "¡Qué lástima que no te animes hoy!" seguido de "¿Cómo prefieres pagar?".

**Comportamiento correcto:** el escape es **universal**: "cancelar", "ya no quiero", "asesor", "catálogo" y las FAQ funcionan en **cualquier** paso, incluidos datos y pago (reglas 9 y 11). Aceptar el no en una línea, sin re-disparar la plantilla de pago y sin dos burbujas contradictorias (máx 2 frases, una pregunta).

**Evidencia consolidada:** pruebas …2786 09-jul 14:34-18:12; `informe-barrido-bot-2026-07-20.html` hallazgo #2 (*"los estados de datos y pago secuestran"*); CSV fila 48 (HUECO #2) + HTML 2.10; CONV 1 (09-jul 14:35): "Ya no quiero comprar" → despedida **+ otra vez la plantilla de pago**, dos veces.

---

### H4 🟠 Cierre correcto fuera de Bogotá: link primero, datos después
**Frecuencia:** alta — flujo v8 (BOT_PAGO_PRIMERO), aún sin tráfico medido.

**Comportamiento correcto:** tras mostrar la ficha, preguntar la **ciudad**. Si no es Bogotá: pago anticipado con **link Wompi de una** (nombrar Wompi da confianza; **no** decir "bancos o tiendas grandes") y los **datos de envío después del pago** (`conversaPagoLink` → `conversaDatosPostPago`). Razón documentada: *"quien ya pagó siempre responde"*. Aviso al 320 en cada momento: intención de compra, link enviado, pago confirmado, datos completos.

**Evidencia consolidada:** `textos.js` L430-437 ([PAGO-PRIMERO], 22-jul PM) y L408-415 (`conversaPagoPregunta`, el patrón correcto según reglas 2, 5 y 6); `BANCO-RESPUESTAS-V1` secciones 10-11; ESTADO Obsidian v8.0/v8.1 (lógica del CUADERNO, desplegada 23-jul). El diseño mismo es evidencia de las pérdidas previas con el orden datos→pago.

---

### H5 🟠 Cierre correcto en Bogotá: contra entrega, mismo día, solo 2 datos
**Frecuencia:** alta.

**Comportamiento correcto:** con ciudad = Bogotá, ofrecer **contra entrega** (paga al recibir, sin comprobante) o Wompi anticipado si prefiere, con **entrega el mismo día** por logística propia, y pedir **solo nombre + dirección** (la ciudad ya la dio y el teléfono es su WhatsApp). Contra entrega **no se menciona** hasta que el cliente pregunta o da la ciudad (decisión de socios). Aviso al 320 con "Total a cobrar al entregar".

**Evidencia consolidada:** CSV fila 33 (ACTIVO) + HTML 3.3; `textos.js` L406 (`conversaCiudadBogota`), L420, L441, L222-226 (la opción solo aparece si los datos dicen Bogotá), L397-399 (`conversaCiudadPreg`), L444 (aviso "Cliente con intención de compra"); decisión del 9-jul en `ESTADO-VARMAN.md`; `BANCO-RESPUESTAS-V1` secciones 9-10.

---

### H6 🟠 Da vueltas con el link Wompi
**Frecuencia:** media.

**Disparadores reales:** "no puedo pagar por link" · "no tengo tarjeta" · "ahorita" · sigue preguntando otras cosas sin pagar.

**Comportamiento correcto:** cambiar de táctica (regla 5): pedir **los datos primero** (compromiso pequeño) y ofrecer **Nequi / Daviplata / Bre-B** (`conversaOtroPago`). Sin presionar, una sola pregunta. No insistir con el mismo link.

**Evidencia consolidada:** `textos.js` L438-440; regla 5 del negocio; `BANCO-RESPUESTAS-V1` fila "Pagos".
**⚠️ CONFLICTO VIGENTE:** `wompiLinkCliente` (L230) dice "Si prefieres otro medio, escribe *cancelar* y volvemos a empezar" — **obliga a reiniciar** en vez de ofrecer los otros medios de una.

---

### H7 🟠 Pago manual (Nequi / Daviplata / Bre-B) y comprobante
**Frecuencia:** alta.

**Comportamiento correcto:** dar número o llave + **total exacto** y pedir la foto del comprobante (`pagoInstruccionesBoton/Texto`); con QR configurado, 3 mensajes (QR → dato copiable → total + comprobante). Al recibir el comprobante: acuse con ref, talla y total + "vamos a verificar tu pago" y **aviso al 320 "NUEVO PEDIDO (por verificar)" con el comprobante adjunto** (regla 12). Si no lo manda: **un** recordatorio suave con salidas ("cancelar" para cambiar algo, "asesor" en el reintento), sin presionar.

**Evidencia consolidada:** CSV filas 30-32 (ACTIVO) + HTML 3.2 y 3.5; `textos.js` L197-205, L200 (`pideComprobante`), L248-255. Es el camino con el que se cerró la única venta real del barrido (Natalia, Nequi).

---

### H8 🟠 Pago acreditado (webhook Wompi)
**Frecuencia:** alta — cada venta cerrada.

**Comportamiento correcto:** confirmación aprobada, mantener tal cual: "¡Pago confirmado! ✅🎉 Ya estamos alistando tu pedido… en su caja original y bien protegido. Apenas salga te paso la guía de rastreo. ¡Gracias por confiar en VarMan Crew! 👟" + **aviso inmediato al 320 "PAGO CONFIRMADO"** (regla 12). Al despachar, enviar la guía.

**Evidencia consolidada:** CSV fila 29 (ACTIVO) + HTML 3.1; `textos.js` L232-235; `BANCO-RESPUESTAS-V1` sección 12 ("mantener el actual, funciona bien").

---

### H9 🟠 Wompi falla al generar el link
**Frecuencia:** baja.

**Comportamiento correcto:** no dejar al cliente colgado: ofrecer de inmediato los otros medios (`wompiFallo` con Nequi / Daviplata / Bre-B).

**Evidencia consolidada:** CSV fila 35 (ACTIVO) + HTML 3.4; `textos.js` L232-235.

---

## I. Envíos y logística

### I1 🔴 Pregunta de envío pegada a un dato del flujo: el bot extrae el dato e ignora la pregunta
**Frecuencia:** alta como patrón sistémico — visto 4+ veces.

**Disparadores reales:** "talla 40 y ¿hacen envíos a Cali?" · "Talla 37 ,¿hacen envíos a cali ?" · "Hacen envíos a cali ?" · "¿Cuánto tarda el envío?" dentro del paso de datos o pago.

**Qué hacía el bot:** "¡Talla 40 anotada! ✅ Ahora regálame los datos…" **sin mencionar Cali**, hasta 4 veces.

**Comportamiento correcto:** responder **primero la duda** (envío gratis a toda Colombia, 1-3 días hábiles ciudades principales, 2-5 alejadas — regla 10) y **luego** continuar el paso, con una sola pregunta. Nunca descartar la parte no estructurada del mensaje. HUECO #2: las FAQ deben responder dentro de datos y pago sin perder el avance.

**Evidencia consolidada:** pruebas …2786 08-jul 17:05, 18:21, 18:23 y …0619 08-jul 16:29, 17:45; `informe-barrido-bot-2026-07-20.html` hallazgo #2 (*"¿Hacen envíos a Cali? quedó sin respuesta 4 veces"*); CSV fila 38 (ACTIVO, nota HUECO #2) + HTML tabla 4. Cubierto en parte por BOT_TEXTOS_SOCIO (v7.0); el escape completo llegó con BOT_ESCAPE_DATOS en v8.

---

### I2 🔴 "¿Manejas contra entrega?" bien respondido y rematado con "¿Te gustaría ver nuestro catálogo?"
**Frecuencia:** media.

**Disparadores reales:** "Manejas contra entrega ?" · "Hacen envíos a todo el país ?"

**Qué hacía el bot:** respondía correctamente (contra entrega solo Bogotá; resto Nequi/Daviplata/Wompi) y **remataba con "¿Te gustaría ver nuestro catálogo?"** — el cliente respondió "No" 3 horas después y se fue.

**Comportamiento correcto:** responder según reglas 5 y 10 y **aprovechar para cerrar por ciudad**: "¿De qué ciudad nos escribes?" → Bogotá: contra entrega mismo día; fuera: link Wompi generando confianza. **Nunca** rematar una objeción de pago con el eterno "¿te gustaría ver el catálogo?".

**Evidencia consolidada:** CONV 8 / …9383 (Jhosep David, 17-jul 20:04) — **PERDIDO en la objeción de pago anticipado**. CONV 2 (11-jul 22:12): respondió "1 a 5 días hábiles" y otra vez "¿te gustaría ver el catálogo?".

---

### I3 🟠 Tiempos, costo y transportadoras
**Frecuencia:** alta.

**Disparadores reales:** "¿cuánto se demora?" · "¿cómo envían?" · "¿cobran envío?" · "¿Envían a [ciudad]?"

**Comportamiento correcto:** envío **gratis** a todo Colombia; **pago antes del mediodía = despacho el mismo día**; **1-3 días hábiles** ciudades principales, **2-5** zonas alejadas; al despachar se envía la guía de rastreo (Interrapidísimo, Servientrega, Envía, Coordinadora). Breve y reencaminando al paso con una pregunta.

**Evidencia consolidada:** regla 10; `BANCO-RESPUESTAS-V1` sección 7 (cita del dueño); `textos.js` L514 y L552 (contexto en ambos prompts), L404 (`conversaCiudadOk`, "1 a 3 días hábiles"), L351 (envío GRATIS en la FAQ).

---

### I4 🟠 "¿Dónde están ubicados?" / "¿Tienen tienda física?"
**Frecuencia:** media.

**Comportamiento correcto:** decirlo con naturalidad: **tienda virtual, sin punto físico** (nos encuentras en varmancrew.com), envío gratis a todo Colombia y contra entrega en Bogotá; cerrar preguntando la ciudad. Estilo del dueño: "Somos tienda virtual (aún sin punto físico), pero enviamos a todo Colombia 📦. En Bogotá manejamos pago contra entrega. ¿A qué ciudad sería?". Máximo **un** gancho de confianza por mensaje.

**Evidencia consolidada:** CSV fila 39 (ACTIVO) + HTML tabla 4; `BANCO-RESPUESTAS-V1` sección 6 (cita textual); regla 10.

---

## J. Datos de envío

### J1 🔴 Pedir 4 datos de golpe antes de pagar: el segundo punto de mayor abandono
**Frecuencia:** alta — el paso con más abandono después del de talla.

**Disparador:** el bot pide "en un solo mensaje: Nombre completo / Dirección / Ciudad / Teléfono" y el cliente **no vuelve a escribir**.

**Comportamiento correcto:** primero preguntar la **ciudad** para bifurcar (regla 5). Bogotá: pedir **solo nombre + dirección**. Fuera de Bogotá: **link Wompi de una** y los datos **después** del pago. Pedir 4 campos antes de pagar espanta.

**Evidencia consolidada:** **momento de pérdida recurrente**: CONV 6 (IDER: "Talla 40" → petición de datos → nunca los dio → "Cancelar" 3,5 h después, PERDIDO); CONV 10 (Fabian Moreno: "42" anotada → petición de datos → silencio total, PERDIDO); CONV 1 (17-jul 18:28, el flujo de la Ref 56 murió ahí y al día siguiente "Cancelar"). `textos.js` L425-427: *"SOLO 2 datos (22-jul PM)… pedir 4 datos de golpe era donde más clientes se perdían"* — **causa #1 registrada en el archivo**. CSV fila 25 (ACTIVO) + HTML 2.1.
**⚠️ CONFLICTO VIGENTE:** `tallaAnotada` (L147), `tallaConvertida` (L149), `tallaDesdeCm` (L156), `datosIncompletos`/`datosFaltan` (L185-187), `reintentoDatos` (L291) y `pasoDatos` (L456) siguen pidiendo los 4 datos.

---

### J2 🔴 El paso de datos secuestra TODO lo que el cliente escriba (HUECO #2)
**Frecuencia:** alta en la versión vieja del flujo; riesgo real vigente.

**Disparadores reales, todos respondidos con la misma plantilla "Creo que faltan datos 🙈. Mándame en un solo mensaje…":**
- "Puedo cambiar de modelo ?"
- "**Quiero hablar con un humano**"
- "Quiero ver más modelos"
- "No quiero eso"
- "Hola" (al día siguiente)
- "¿Hacen envíos a Cali?"
- "asesor" / "cancelar"

**Comportamiento correcto:** escape **universal**: "asesor", "cancelar", "catálogo" y las FAQ funcionan en **cualquier** paso sin perder el avance (reglas 9 y 11); cambiar de modelo debe ser posible sin cancelar; un saludo no choca con la plantilla. **Nunca la misma plantilla dos veces seguidas.**

**Evidencia consolidada:** CONV 1 (08-jul 18:24-18:25 y 09-jul 09:04): **5 intents distintos + un "Hola" respondidos con la misma plantilla 6 veces seguidas, incluida la petición de humano**. `informe-barrido-bot-2026-07-20.html` hallazgo #2: *"el handoff a asesor no funciona dentro de los pasos de datos y pago"*. CSV fila 27 (HUECO #2) + HTML 2.10 y tabla de huecos #2. Atacado con BOT_ESCAPE_DATOS en v8.

---

### J3 🔴 Datos basura aceptados por el validador
**Frecuencia:** media — **incluye un pedido real con teléfono inválido**.

**Disparadores reales:** "Daniel / Dirección / Ciuddb / Jejej" · "Bssb / Bebé / Bebé / 33" · "Ana sjejehd / Jejej / Jejej / 3002727" · "Brayan / Medellín / Medellin / **Instagram 300**" · teléfono "33" · ciudad "Jejej".

**Comportamiento correcto:** validación mínima antes de aceptar: **teléfono de 10 dígitos** y **ciudad colombiana reconocible** (la ciudad es crítica: decide el cierre Bogotá vs nacional, regla 5). Si un dato no pasa, re-preguntar amablemente **ese campo puntual**, sin reiniciar.

**Evidencia consolidada:** pruebas …2786 07-jul 13:02 y 10-jul 11:43 (pedidos "🛒 NUEVO PEDIDO" guardados con datos basura); **caso real: Brayan de Medellín (16-jul 22:37) puso "Instagram 300" como teléfono y el pedido avanzó a link Wompi real, quedando pago_pendiente con datos no entregables**. `informe-barrido-bot-2026-07-20.html` "Riesgos de datos" (*"la validación de datos de envío acepta basura"*); CSV fila 26 (flag BOT_DATOS_V2) + HTML 2.9 caja (HUECO #5: *"la validación aceptó un teléfono '33'"*).

---

### J4 🟠 Datos incompletos
**Frecuencia:** media.

**Disparador real:** "Juan Pérez, Medellín" (faltan dirección y teléfono).

**Comportamiento correcto:** pedir **solo lo que falta**, en un mensaje, nombrando lo que ya se tiene (`datosFaltan`). Acuse que nombre la ciudad para que el cliente se sienta leído + total con envío incluido. En Bogotá, solo nombre + dirección.

**Evidencia consolidada:** CSV filas 25-26 + HTML 2.1 y 2.9; `textos.js` L185-187, L425-427.

---

### J5 🟠 Silencio de ~3 minutos en el paso de datos
**Frecuencia:** media.

**Comportamiento correcto:** empujón **único**: `conversaRescateDatos` — "¿Seguimos con tu pedido? 😊 Solo me falta tu nombre completo y la dirección de entrega para dejarlo listo 📦". Una sola vez, sin insistir.

**Evidencia consolidada:** `textos.js` L428-429. Mecanismo creado precisamente por los clientes que se estaban perdiendo en J1.

---

## K. Incoherentes, ruido y bucles

### K1 🔴 La plantilla del paso responde a todo: el "bot loro"
**Frecuencia:** alta pre-15 jul; el patrón que más frustración generó.

**Disparadores reales, todos respondidos con "Manejamos tallas de la 36 a la 45 👟. Escríbeme solo el número…":**
- "No me gustan"
- "Tienen las Adidas special?"
- "Quiero otra referencia"
- "**Si estoy interesada, puedo hablar con un Asesor**"
- "Y si llevo dos" · "Hay rebaja?"
- "Hola! Quiero la Ref 06 ($480.000 COP)"

**Comportamiento correcto:** entender la intención y **responderla** (cambiar de ref, mostrar otra marca, precio, descuento, asesor) y reencaminar. Anti-repetición: desde la 2ª vez, variante **breve** con salidas claras ("catálogo" reencamina, "asesor" hace handoff de verdad) y tras N vueltas handoff automático. **Un cliente nunca debe recibir la misma plantilla 3 veces** (regla 11).

**Evidencia consolidada:** …8111 (Natalia, 07-jul 18:29 → 08-jul 07:15: 4 mensajes distintos, 4 veces la misma plantilla). **Martin …4446: PERDIDO.** `CONVERSACIONES-INCOMODAS` Caso 3: Cristhian pidió la Ref 06 y recibió la plantilla de tallas → **canceló dos veces (11:23 y 1:26 p.m.) y no volvió**. CSV fila 19 (BOT_ANTIBUCLE) + HTML 5.5; `textos.js` L287-293 (reintentos), y el deploy v6.5→v6.7 atacó la plantilla pero la re-pregunta de talla siguió.

---

### K2 🔴 Mensajes incoherentes o mínimos tratados como datos o como saludo
**Frecuencia:** media, con pérdidas reales.

**Disparadores reales:** "#" · "?" · "Gol" · "👍" · "Aja" · "No ches" · "Dndbbe" · "Cre / Ese / De / 339" · "Coma mondad" · "jajaja no sé q poner" · "📎 [unsupported]" · "Jejej"

**Qué hacía el bot:** con "#" preguntó el sistema de tallas nacional/europeo (⏱86 s); con "Gol" mandó la bienvenida (reinicio); con "Aja" repitió la plantilla de talla completa; con "👍" se quedó en 🔇; con "📎 [unsupported]" mandó el saludo de reinicio.

**Comportamiento correcto:** regla 11 — **una** línea amable con **otra** formulación y reencaminar al paso actual, sin regañar, sin repetir la plantilla, sin reiniciar y sin interpretar el símbolo como dato. Si el mensaje es puro signo o emoji (sin letras ni números): **no contestar** (antiruido).

**Evidencia consolidada:** **CONV 24 / …8968 (Ian Hansen, real): "#" → interrogatorio de talla → PERDIDO ahí.** …5003 (Mauricio): "👍" → 🔇 → PERDIDO. CONV 1 ("Gol"), CONV 4 ("No ches", "Aja"), …0135 ("📎 [unsupported]"). CSV fila 46 (FLAG, IA asistente v2) + HTML 5.3; `textos.js` L563-571 (ejemplo aprobado "jajaja no se q poner" — ojo: **el ejemplo todavía pregunta talla**, choca con la regla 2).

---

### K3 🔴 "Quiero otro modelo" a mitad del flujo y el bot repite el total anterior
**Frecuencia:** alta — aparece en 2 de los 3 casos incómodos documentados.

**Disparadores reales:** "Quiero otro modelo" (incluso dentro del paso de pago) · "Mejor muéstrame la Ref 12" · "Puedo cambiar de modelo ?" · "Qué más tienen? Muéstramelos" · "quiero la otra"

**Qué hacía el bot:** *"Método de pago 💳 ¡Perfecto! 📦… Total a pagar: $499.800"* repetido, antes de cualquier respuesta útil.

**Comportamiento correcto:** procesar la nueva intención: ficha nueva con foto + precio (o 2 opciones) y **rearmar el pedido sin perder el flujo**, y cuando la IA responda **enviar solo esa respuesta** — no reenviar información ya enviada salvo que el cliente la pida. Petición del dueño: *"solo enviar '…Cuéntame qué otro modelo te gustó…' sin repetir el mensaje anterior"*.

**Evidencia consolidada:** `CONVERSACIONES-INCOMODAS` Casos 1 y 3 (citas textuales); `BANCO-RESPUESTAS-V1` sección 14 arreglo 4; CSV filas 23-24 (flags BOT_FLUIDEZ_RECONDUCE / BOT_CATALOGO_PIDE) + HTML 2.7 y 2.8; `textos.js` L282-286 (*"casos reales 1 y 3 de CONVERSACIONES-INCOMODAS: hoy el bot repite la plantilla del paso"*).
**⚠️ CONFLICTO VIGENTE:** `cambioRefIntro` y `cambioModeloIntro` abren con "¡Claro que sí! 😊" (prohibido, regla 6).

---

### K4 🔴 "Cancelar" escrito por frustración (escape del bucle, no falta de ganas)
**Frecuencia:** media.

**Disparador real:** el cliente usa "cancelar" para **escapar de la plantilla repetida**, no porque no quiera comprar. Cristhian canceló, volvió con "Hola! Quiero la Ref 08" y **el bot volvió a pedir talla en bucle → segunda cancelación definitiva**.

**Comportamiento correcto:** cancelar limpio y sin regañar, y al retomar **continuar directo con esa referencia** sin caer en el mismo bucle. La causa raíz a eliminar es el bucle, no la cancelación.

**Evidencia consolidada:** `CONVERSACIONES-INCOMODAS` Caso 3 (dos cancelaciones reales). **CLIENTE PERDIDO.** Concuerda con IDER (…9732) y El Dey (…9007), que también cancelaron tras bucles.

---

### K5 🟠 Abandono suave y "cancelar" sin pedido activo
**Frecuencia:** media.

**Disparadores reales:** "Ya no quiero comprar" · "No" · "Cancelar" (tras recibir solo el link del catálogo) · "Gracias" y se va.

**Comportamiento correcto:** aceptar con gracia en **una** línea y dejar la puerta abierta ("escríbeme *hola* cuando quieras"). No re-enviar la plantilla de pago después de la despedida. "Cancelar" **sin pedido** no debe soltar interrogatorios ("cuéntanos qué pasó…"), ni hablar de un pedido que no existe (`catalogoWebCancelado` apaga además el seguimiento).

**Evidencia consolidada:** CONV 1 (09-jul 14:35): "Ya no quiero comprar" → despedida + plantilla de pago ×2. CONV 2 (11-jul 19:41): "Cancelar" → "Lamentamos que quieras cancelar, por favor cuéntanos qué pasó…" con **2 preguntas**. CSV filas 48-49 + `textos.js` L188 (`pedidoCancelado`), L63-65.

---

### K6 🟠 Ráfaga de mensajes muy rápidos (anti-spam)
**Frecuencia:** baja.

**Comportamiento correcto:** mensaje de calma enviado **una sola vez** ("Me estás escribiendo muy rapidito 🙈 Dame un momentico y seguimos, ¿va?"), sin bloquear la conversación ni tragarse los mensajes.

**Evidencia consolidada:** CSV fila 50 (ACTIVO) + HTML 5.6; `textos.js` L331-332.

---

## L. Handoff a asesor

### L1 🔴 Pide asesor y la plantilla del paso se lo traga
**Frecuencia:** alta — 3 conversaciones, incluida una clienta real que lo pidió **3 días distintos**.

**Disparadores reales:** "Quiero hablar con un asesor porfavor" · "Puedo hablar con un asesor ?" · "Quiero hablar con alguien" · "**Quiero hablar con un humano**" · "Me pasas con una persona real?" · "no me estas entendiendo" · "Si estoy interesada, puedo hablar con un Asesor"

**Comportamiento correcto:** detectar la petición en **cualquier** estado (incluidos datos y pago), avisar al 320 con plantilla aprobada (nombre + WhatsApp + último mensaje), decirle al cliente que un asesor lo atiende y dar el +57 320 225 0619 (regla 9).

**Evidencia consolidada:** CONV 3 / …8111 (Natalia, real): 08-jul 07:15 pidió asesor y recibió **la plantilla de talla**; 08-jul 18:25 lo pidió 2 veces más → **saludo genérico sin aviso al 320**; 10-jul 11:44 otra vez. Paso de datos: "Quiero hablar con un humano" → "Creo que faltan datos 🙈". CSV fila 44 (ACTIVO, nota HUECO #2) + HTML 5.1; `textos.js` L303-305, L552 (criterios de handoff con citas textuales); `informe-barrido-bot-2026-07-20.html` hallazgo #2.

---

### L2 🔴 Tras el handoff el bot sigue hablando
**Frecuencia:** alta.

**Disparadores reales:** después del handoff, el "Gracias" del cliente recibió **el saludo de bienvenida**; en otro caso el bot **siguió pidiendo datos de envío**; en el caso Andrés, 12 min después lo saludó **como cliente nuevo y le mandó el catálogo**.

**Comportamiento correcto:** tras pasar a asesor el bot **calla 4 h** con ese cliente y **reenvía cada mensaje suyo al 320** (`silencioReenvio`, regla 9 / BOT_SILENCIO_HANDOFF). No volver a saludar, no relanzar el catálogo, no seguir el flujo.

**Evidencia consolidada:** CONV 3 (Natalia, 08-jul 07:17), CONV 1 (09-jul 11:16), caso Andrés (22-jul). `textos.js` L448-450.

---

### L3 🔴 Los avisos al 320 no llegan y el dueño queda ciego de sus ventas
**Frecuencia:** alta durante 21-22 jul (afectó **todos** los handoffs).

**Disparadores técnicos:** plantilla `aviso_bt` creada en la cuenta de Meta equivocada ("Test WhatsApp Business Account", no la del 304) → **error 132001 en todos los avisos desde el 21-jul**. Y con **texto libre fuera de la ventana de 24 h** el aviso "se acepta" pero **nunca llega** (código **131047**).

**Comportamiento correcto:** todo aviso al dueño sale por **plantilla aprobada en la cuenta correcta** (`msjAvisoDueno`), con registro de fallos de entrega (BOT_LOG_FALLOS). Sin esto, la regla 12 no existe en la práctica.

**Evidencia consolidada:** ESTADO Obsidian "Caso Andrés (22 jul)"; `textos.js` L578-603 ([AVISO-PLANTILLA], bug real documentado). En el caso del álbum de César se dispararon ~18 avisos que **Meta ni entregó**.

---

### L4 🟠 Aviso al 320 en cada momento de venta (transversal)
**Frecuencia:** alta — atraviesa todo el embudo.

**Momentos que deben avisar:** intención de compra · link enviado · pago confirmado · datos completos · foto recibida · petición de asesor · marca o modelo que no se tiene · intención de 2 pares.

**Comportamiento correcto:** aviso **inmediato** con la plantilla aprobada en cada uno de esos momentos, para que el dueño pueda entrar en vivo (regla 12: el bot cierra la venta, pero el dueño quiere estar cerca).

**Evidencia consolidada:** reglas 9 y 12; HTML caja técnica sección 6; notas de CSV filas 8, 9, 31 y 44; `textos.js` L444 (`conversaAvisoDueno` con el último mensaje textual), L248-255, L430-437.

---

## M. Post-venta y rescates

### M1 🔴 Cliente que enmudeció a mitad del pedido y nadie lo rescata
**Frecuencia:** alta — es la pérdida más estructural del embudo.

**Comportamiento correcto:** rescate automático a **~3 min** de silencio (también en el paso de datos) y seguimiento a **2-4 h** dentro de la ventana de 24 h, **un solo recordatorio por sesión**, con nombre, ref, talla y total y **salida digna**: "Si ya no lo quieres, todo bien — escríbeme *cancelar*". Guardas: no interrumpir una charla activa, no escribir a quien ya compró ni canceló. Pasadas 24 h, solo plantilla aprobada.

**Evidencia consolidada:** `informe-barrido-bot-2026-07-20.html` hallazgo #5 (~20 leads pagos enmudecieron; *"cada silencio costó plata de pauta"*), con el **matiz del dueño**: el extractor **no ve los mensajes iniciados por el bot** y CW1 ya hace un seguimiento a ~2 h → "cero seguimiento" **no está probado**, hay que auditarlo en n8n/Firestore. CSV fila 56 (ACTIVO) + HTML 6.3; `textos.js` L265-268 (`carritoAbandonado`, backlog 10), L445-446 (`conversaRescate`), L428-429.

---

### M2 🟠 Rescate a ~3 min tras mostrar info de producto
**Frecuencia:** alta.

**Comportamiento correcto:** **una sola vez por sesión**, ofrecer el catálogo completo con link (`conversaRescate`) — este es uno de los **únicos** momentos donde el link web es correcto (regla 7).

**Evidencia consolidada:** `textos.js` L445-446; regla 7.

---

### M3 🟠 Seguimiento ~2 h después de mandar el link de la web
**Frecuencia:** media.

**Comportamiento correcto:** **preguntar sin asumir**: "¿Pudiste hacer tu compra en la web? Si algo se te complicó… te ayudo a dejar tu pedido listo 😊" (`seguimientoCompraWeb`). El bot no puede saber si compró. Sujeto a la ventana de 24 h.

**Evidencia consolidada:** CSV fila 57 (ACTIVO CW1) + HTML 6.4; `textos.js` L66-69. Nota de auditoría: el barrido no ve estos salientes.

---

### M4 🔴 "¿Cuándo llega?" respondido con la misma ficha de estado
**Frecuencia:** media — **le pasó a la única compradora real del barrido**.

**Disparadores reales:** "Ya quedó ?" · "Cuando llega ?" · "Si recibieron el pago ?" · "Ya enviaron mi pedido ?"

**Qué hacía el bot:** repetía exactamente la misma tarjeta "Estado: *verificado* ¡Pago confirmado!" a **ambas** preguntas, sin fecha.

**Comportamiento correcto:** responder **la pregunta concreta** con la regla 10: Bogotá entrega mismo día; 1-3 días hábiles ciudades principales, 2-5 alejadas; pago antes del mediodía = despacho mismo día. La ficha de estado es **apoyo, no respuesta**.

**Evidencia consolidada:** CONV 3 / …8111 (Natalia, 10-jul 11:53, ×2 la misma ficha) — pedido Ref 12 verificado.

---

### M5 🔴 Un pedido pagado aparece "cancelado" sin explicación
**Frecuencia:** baja (prueba), **crítico si le pasa a un cliente que pagó**.

**Disparador real:** "Ya enviaron mi pedido ?" → la ficha pasó de "Estado: *verificado*" a "Estado: *cancelado* … Si fue un error, escríbenos al +57 320" **3 minutos después**, sin explicación (pedido Jordan Retro 4 Thunder pagado por Daviplata).

**Comportamiento correcto:** estados consistentes: un pedido pagado **jamás** debe mostrarse "cancelado" al cliente. Si un humano lo cancela en la app, el bot **explica proactivamente** y dispara aviso al 320 **antes** de decírselo al cliente.

**Evidencia consolidada:** pruebas …2786 13-jul 09:23-09:26 — bug de sincronización de estados con la app.

---

### M6 🟠 "¿Cómo va mi pedido?" y el cliente sin pedidos
**Frecuencia:** media.

**Comportamiento correcto:** resumen del último pedido (modelo, talla, total, fecha) con el **estado explicado en lenguaje llano** (por verificar / pago pendiente / confirmado / alistando / en camino / entregado / cancelado). Si no tiene pedidos, decirlo con honestidad y sin drama, invitando a iniciar uno con "hola". **Al cliente se le habla del nombre del modelo** ("tus Nike"), no de "Ref 07": la ref solo viaja por dentro y en los avisos al 320 (BOT_NOMBRE_MODELO); si la ref no tiene marca registrada, caer al texto actual sin inventar.

**Evidencia consolidada:** CSV filas 53-54 (ACTIVO) + HTML 6.1 (tabla de estados); `textos.js` L317-329; `ESTADO-VARMAN.md` decisión 12-jul (**pendiente:** `carritoAbandonado` aún dice "Ref NN").

---

### M7 🟠 Guía de envío, entrega y reseña
**Frecuencia:** alta (cada pedido despachado).

**Comportamiento correcto:** al registrarse la guía, enviar **transportadora + número de guía** (`guiaEnvio`); tras la entrega, agradecer con nombre y modelo y pedir reseña **solo si existe LINK_RESENAS_FB** configurado (si no, se omite sin romper). Ambos son mensajes iniciados por el negocio: sujetos a la **ventana de 24 h** de WhatsApp.

**Evidencia consolidada:** CSV filas 55 y 58 (ACTIVO) + HTML 6.2 y 6.5 (caja técnica de la ventana 24 h); `textos.js` L270-275, L605-629.

---

### M8 🟠 Aviso de stock / lista de espera
**Frecuencia:** baja.

**Disparadores reales:** "Me avisan cuando llegue la 40 de la ref 05?" · o pide el aviso **sin decir cuál** referencia.

**Comportamiento correcto:** anotar ref + talla y confirmar que se le escribirá (`listaEsperaOk`); **nunca prometer fecha de llegada** (regla 2). Si falta la ref, pedirla con un ejemplo concreto: "avísame de la ref 05 talla 40".

**Evidencia consolidada:** CSV filas 59-60 (ACTIVO) + HTML 6.6; `textos.js` L277-280, L544.
**⚠️ Detalle de tono:** `listaEsperaFaltaRef` abre con "¡Claro que te avisamos!" — variante cercana al arranque prohibido.

---

## N. Fallas técnicas y de datos

### N1 🔴 El cliente escribe y NUNCA recibe respuesta
**Frecuencia:** baja en volumen, **letal**: pérdida silenciosa.

**Disparadores técnicos reales:** "⚠️ FALLA TÉCNICA: Parsear mensaje: **Task execution aborted because runner became unresponsive** — el cliente NO recibió respuesta" (aldeinergomez99 …2273, 15-jul 10:07, tras una primera respuesta de 152 s) · "**Task request timed out after 60 seconds**" ×2 (pruebas …2786, 12-jul 14:55) · el nodo "Parsear" llegó a **77 s**.

**Comportamiento correcto:** **todo mensaje entrante recibe respuesta.** Infraestructura: runner OFF en VMs de 1 GB (fix 23-jul, responde en segundos), timeouts ampliados, swap, cola con reintento; si falla, aviso al 320 para rescate manual del número. Al cliente afectado: contactarlo, es recuperable.

**Evidencia consolidada:** `informe-barrido-bot-2026-07-20.html` sección salud VM; CONV 25 del barrido; ESTADO Obsidian. **CLIENTE PERDIDO por falla técnica pura** — uno de los 4 calientes recuperables. También falló **7 veces** el comando "Pedidos" del dueño.

---

### N2 🔴 Mensajes legítimos silenciados como "duplicados de Meta"
**Frecuencia:** alta pre-21 jul.

**Disparador real:** santiesa33 (…8871) escribió "Un favor tiene el catálogo de los zapatos" y "Buenos dias" **9 veces en 5 minutos y 8 quedaron en 🔇 sin respuesta**. IDER (…9732): 5 veces "Q precios o si tienes más modelos" en 🔇, luego dio "Talla 40" y a las 3 h escribió "Cancelar". Anotación del visor: *"🔇 sin respuesta del bot (posible duplicado de Meta o mensaje perdido)"*.

**Comportamiento correcto:** responder **siempre al menos una vez por ráfaga**; dedupe **solo** de IDs de Meta realmente duplicados; rescate a ~3 min. Corregido en la estabilización del 21-jul — **verificar que no reaparezca**.

**Evidencia consolidada:** barrido CONV 7 (7 de 9 mensajes sin respuesta) y CONV 6 (5 repeticiones sin respuesta), CONV 5 (2 mensajes sin respuesta). **AMBOS CLIENTES PERDIDOS.**

---

### N3 🔴 Ráfagas por demora y ejecuciones "verdes" sin mensaje de salida
**Frecuencia:** alta — **51 respuestas lentas (>1 min) en 14 días**.

**Disparador:** el bot tarda → el cliente manda 3-5 mensajes seguidos → más carga → más demora. **El 86% de las respuestas lentas fueron ráfagas.** Hubo ejecuciones marcadas en verde con demora y **sin ningún mensaje de salida**: cliente ignorado en silencio.

**Comportamiento correcto:** responder **una sola vez** y de forma coherente a la ráfaga (dedupe por message_id + agrupación), rápido. **Auditar salidas, no solo estados verdes.**

**Evidencia consolidada:** `informe-barrido-bot-2026-07-20.html` (salud VM) + Lecciones 20-jul: *"el verde de una ejecución tampoco garantiza que el bot respondió"*. Demoras registradas: 84, 99, 111, 115, 152, 157, 161 y 181 s.

---

### N4 🟠 La ficha del modelo llega sin foto
**Frecuencia:** baja (arreglado; vigilar refs nuevas).

**Disparador:** el cliente pide un modelo puntual y la ficha llega **sin imagen**. Causa: las fotos que el dueño sube desde la app viven en Firestore como **base64**, no como URL, y el bot solo sabía mandar las viejas (pNNN). Fix: servirlas por `/foto/<fid>.jpg` vía Cloudflare.

**Comportamiento correcto:** la ficha **siempre** llega con foto + precio (regla 3: el precio nunca va solo, va pegado a una foto).

**Evidencia consolidada:** `ESTADO-VARMAN.md` bitácora 13-jul (bug real: *"la ficha llegaba sin foto"*).

---

### N5 🟠 Error técnico del bot, bot pausado o atención humana en curso
**Frecuencia:** baja.

**Comportamiento correcto:** `errorTecnico` — disculpa breve + ruta de rescate ("Escríbeme *hola* en un momento… o si es urgente te atendemos en el +57 320 225 0619"). Si el dueño pausó el bot o está atendiendo en persona: `botPausado` — "En este momento te estamos atendiendo en persona. Ya te escribimos por aquí…", para no interferir con la venta humana. **Nunca dejar al cliente sin respuesta.**

**Evidencia consolidada:** CSV filas 51-52 (ACTIVO) + HTML 5.7 y 5.8; `textos.js` L314-315, L343-344.

---

### N6 🟠 Comandos del dueño desde el 320
**Frecuencia:** media.

**Disparadores:** "pedidos" · "pausar" · "activar" · cualquier otro mensaje suyo pasa por el flujo normal (así prueba el bot).

**Comportamiento correcto:** `adminListaTitulo` (últimos 5 pendientes), `adminPausado`/`adminActivo`, `adminAyuda`. El comando "Pedidos" debe ser confiable: **falló 7 veces** durante la saturación de la VM.

**Evidencia consolidada:** `textos.js` L340-345; `informe-barrido-bot-2026-07-20.html` (salud VM).

---

## O. Casos positivos de referencia

### O1 🟢 La única venta cerrada por el bot en 14 días (Natalia, 10-jul)
**Flujo:** "Hola! Quiero la Ref 12 ($329.900 COP) 👟" (llegó con la ref desde la web) → talla → datos → Nequi con número → foto del comprobante → "¡Pedido recibido! 🎉" + aviso "🛒 NUEVO PEDIDO (por verificar)" al 320 con todos los datos. **Cerró en 11 minutos.**

**Qué replicar:** cuando el cliente llega con la referencia decidida, el flujo cierra rápido; el bot cierra y **avisa al 320 en cada momento** (regla 12).
**Qué ajustar:** en Bogotá bastaban nombre + dirección, y su "¿Cuándo llega?" merecía tiempos reales (ver M4).

**Evidencia:** `informe-barrido-bot-2026-07-20.html` (cifras de cabecera): **1 venta confirmada vs ~40 clientes perdidos en 14 días** — la razón de la presión del socio y de la ventana de prueba de 7-10 días. Natalia además figura con un pedido web Ref 56 · pago_pendiente · 18/7.

---

### O2 🟢 Willy (…6493), 21-jul: entrada de pauta bien atendida
**Flujo:** "Buenas noches" → saludo correcto **sin demora**; "Que precios manejas?" → "¡Claro! 😊 Te cuento del modelo de nuestra publicación 👇" + **FOTO con precio, de una** — sin rango, sin link. Ocurrió **durante** la ventana del incidente técnico stream-is-not-readable (21:54-22:00) y el cliente igual fue atendido las dos veces.

**Qué replicar:** este es el patrón para toda entrada de pauta. **Único ajuste:** cerrar con una pregunta de avance (la ciudad) en vez de "¿Qué talla buscas?" (regla 2).

**Evidencia:** ESTADO Obsidian, "Visor de conversaciones actualizado al 21 jul". Contrastar con …7151 (el mismo Willy el 20-jul: solo recibió el saludo genérico y no siguió).

---

### O3 🟢 Respuestas honestas que ya funcionan bien
- **Color único:** "Esa referencia solo la manejamos en el color de la foto 🙏" + alternativas (15-jul 12:45) — versus la alucinación del 14-jul ("Ese modelo en negro es una chimba… para confirmarte la disponibilidad").
- **Audio:** "Por aquí te leo mejor 🙌 ¿Me lo escribes en un mensajito?" — correcto y consistente en …9007 y …9049.
- **Saludo a mitad de pedido:** "¡Hola de nuevo! 👋 Seguimos con tu pedido de la *Ref 51* 😊" (…6265 Edwinnadal, 15-jul) — no reinicia.
- **Foto con lista de refs (v6.9, 18-jul, Jhon Carter …4800):** "soy el *asistente virtual (bot)* … *no puedo ver las imágenes*" + lista de refs + aviso 📸 al 320.
- **Lista real de catálogo (12-jul 18:36):** "De ese estilo tenemos 6 🔥 • Jordan retro 4 Cave Stone (Ref 45) — $264.900…" — solo datos reales.

**Qué replicar:** honestidad sin adivinar stock, una línea, un emoji, una pregunta.

**Evidencia:** pruebas …2786 (12, 15-jul), visor …4800, …6265, …9049.

---

## Top 10 momentos donde se pierden ventas

Ranking por **clientes reales perdidos documentados × frecuencia**. Es la lista de trabajo: arreglar de arriba hacia abajo.

| # | Momento | Caso(s) | Clientes reales costados | Por qué se pierde |
|---|---|---|---|---|
| 1 | **La pregunta de talla mata al lead de pauta** | D1, A1, D2 | **~20 leads pagos** (14 conversaciones de un solo mensaje: …5351, …3551, …9489, …3918, …4708, …1564, …7070, …5670, …0861, …4480, …9218, …7200, …8584, …3200, …8865, …6163) + El Dey …9007 hostil | El primer mensaje que recibe alguien que pagamos por traer es un formulario, no una oferta: foto sin precio + "¿Qué talla buscas?". Regla 2 lo prohíbe y el embudo lo confirma. |
| 2 | **Preguntan el precio y reciben un rango + link** | B1, B2 | IDER …9732 (**tenía ref + talla listas**, preguntó 6 veces, canceló), Miguel …6281, Diego Castillo …7027, …3458, Jhosep …9383 | El precio nunca va solo ni en rango: va pegado a la foto del modelo (regla 3). *"Esa venta estaba hecha."* |
| 3 | **El link de la web mata la conversación** | C1, C2, C3 | santiesa33 …8871, IDER …9732, luispupo …3258, Adrian …6036, kevin …9617, Chila …9049, jorgecaballeronava72, CONV 18 (**7+ documentados**) | Se responde con un link en vez de sondear y mostrar 2 fotos con precio en el chat (regla 7). Casi nadie vuelve a escribir después del link. |
| 4 | **Pedir 4 datos de golpe antes de pagar** | J1 | IDER (Talla 40 → silencio → "Cancelar"), Fabian Moreno (42 → silencio), flujo Ref 56 | Segundo punto de mayor abandono, reconocido en el propio código: *"pedir 4 datos de golpe era donde más clientes se perdían"*. Bogotá: solo nombre + dirección; fuera: link primero. |
| 5 | **El bot loro: la plantilla del paso responde a todo** | K1, J2, K4, H3 | El Dey …9007 ("Q estafador" + "Canselar"), Natalia …8111 (asesor ignorado 3 días), Martin …4446, Cristhian (2 cancelaciones), Ian Hansen …8968 | Descuento, cambio de modelo, envío, cancelación y **petición de humano** reciben la misma plantilla. Sin escapes universales, el cliente escribe "cancelar" para escapar. |
| 6 | **Fotos del cliente: el bot finge verlas, se repite y no resuelve** | E1, E2, E3, E4 | César …0135 (**quería varios pares**, 9 respuestas idénticas y luego 🔇), Andrés Vargas …9003 (compraba para su papá), Fabian Moreno, Jhosep …9383, caso Andrés 317…4405 (casi perdido) | Las fotos de anuncios son la fuente principal de leads y es el flujo más roto: sin declararse bot, sin agrupar el álbum, sin reenviar al 320 y sin callar tras el handoff. |
| 7 | **Silencio del sistema: el mensaje se queda sin respuesta** | N1, N2, N3, A3 | aldeinergomez99 …2273 (runner unresponsive), santiesa33 …8871 (8 de 9 en 🔇), IDER …9732 (5 en 🔇), César …0135, Leidy Palacio …1564 (⏱99 s, 1 mensaje) | Timeouts, dedupe agresivo y demoras de 84-181 s. **51 respuestas lentas en 14 días** y ejecuciones "verdes" que no enviaron nada. La demora era el problema #1 histórico de la campaña. |
| 8 | **"Calidad 1.1" y el tono prohibido queman la confianza** | F1, F4, F3 | 7+ conversaciones reales (…9007, …6036, …9617, …9383, …0135, …7832, CONV 12, CONV 13) | Se le dice a un cliente que acusa de estafa "manejamos calidad 1.1", con "parcero" y "chimba" encima. Viola las reglas 1 y 6 y hace imposible sostener la venta. **Sigue vivo en el prompt.** |
| 9 | **Intención de comprar MÁS ignorada (2 pares, rebaja)** | G1, G3, G4, G2 | Martin Vargas …4446 (PERDIDO: "Y si llevo dos" + "Hay rebaja?" → plantilla de talla ×2), Cristhian (2 cancelaciones) | Se ignora la venta más grande del embudo, se niegan descuentos que sí existen, se da el % sin la cifra final y una vez se ofreció 15% y se cobró sin descuento. |
| 10 | **El link Wompi enviado y nadie hace seguimiento** | H1, H2, M1, L3 | Brayan de Medellín (link real, nunca volvió) + **3 pedidos reales en pago_pendiente**: Natalia nieto Ref 56 $239.900, Varman Ref 40, Cristhian Ref 22; Jhosep …9383 en la objeción de contra entrega | **100% de los links Wompi del barrido quedaron sin pagar y sin rescate.** Falta rescate, falta el cambio de táctica (datos primero + Nequi/Daviplata/Bre-B) y los avisos al 320 no llegaban (132001 / 131047). |

### Los 4 clientes calientes recuperables (del plan de acción del barrido)
1. **IDER …9732** — Ref 51 + talla 40, solo le faltaba el precio (Top 2).
2. **César …0135 (Armenia)** — mandó 9 fotos pidiendo precios, quería varios pares (Top 6).
3. **Andrés Vargas …9003** — foto + talla 39, compraba para su papá (Top 6).
4. **aldeinergomez99 …2273** — nunca recibió respuesta por falla técnica (Top 7).

### Contexto de negocio que justifica el orden
En los 14 días del barrido (7-20 jul) hubo **1 venta confirmada (Natalia, Ref 12, $329.900) frente a ~40 clientes perdidos**, con tráfico pago de Meta entrando todos los días. Los cuatro primeros puestos del ranking son todos del **primer minuto de conversación** (talla, precio, link, datos): ahí es donde el dinero de la pauta se está evaporando, y son los cambios más baratos de hacer.

