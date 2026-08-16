# Runbook de montaje — Campaña Meta + Instagram · VarMan Crew

**Para el día del montaje (meta: jue 16 jul).** Revisado con el skill `/ads` el 2026-07-12.
Lo hacemos **de la mano**: tú vas por cada pantalla, me mandas un pantallazo, yo confirmo o
corrijo **antes** de darle *Publicar*.

> Aclaración que evita hacer el doble de trabajo: **NO son dos campañas** (una FB y otra IG).
> Es **UNA sola campaña** en el Administrador de Anuncios; Instagram entra como **ubicación**
> (Feed, Stories, Reels, Explora de IG) cuando dejas las **Ubicaciones en Automáticas /
> Advantage+**. Un presupuesto, un conjunto, sale en FB **y** en IG.

---

## Parte A — Lo único que dependes de TI (en orden, antes de gastar un peso)

Cada clic pagado que caiga en un bot a medias o en el número equivocado es plata perdida.
Este es el camino crítico; sin esto NO se enciende la pauta.

1. **Subir el bot v6.4 a la VM con los flags de campaña.**
   Usa la guía fija del Escritorio `PASOS-SUBIR-CATALOGO-WEB.txt` con el archivo
   `bot-varman-PARA-SUBIR-v6.4-2026-07-12.json`. En el `.env` de la VM deja encendidos:
   - `BOT_FOTO_ASESOR=on` y `BOT_NOMBRE_MODELO=on` (venían pendientes de CW2).
   - `BOT_FUENTE_DETALLE=on` → **REQUERIDO para la campaña**: sin esto el pedido no guarda de
     qué anuncio vino y volamos a ciegas sobre qué VENDE.
   - `BOT_MODELO_ASESOR=on` → **recomendado para pauta**: si el cliente pide un modelo puntual,
     el bot manda la foto y arranca la compra directo en WhatsApp (más ventas del tráfico pago).
     Es decisión tuya encenderlo, pero para clientes de anuncio conviene.
   - Luego `docker compose up -d --force-recreate` + reimportar.

2. **Ponerle marca a TODAS las refs activas en la app** (pestaña Tienda). Con `BOT_NOMBRE_MODELO`
   ON el bot le muestra al cliente el nombre del modelo (no "Ref 07"), y el pinpoint del punto
   anterior solo acierta si el nombre completo está escrito en el campo `marca`.

3. **Probar el bot E2E:** hola → catálogo → precio → una marca → una foto → **una compra
   completa**. Y confirmar que un chat que "entra por anuncio" deja la `fuente` grabada en el
   pedido (el termómetro de qué anuncio vende).

4. **EL CORTE de números:** botón WhatsApp de la página de FB, bio de TikTok @varmansnk, bio de
   IG y links de la web → todos al **304 291 6972 (el bot)**. El orgánico se queda en el 320
   (lo atiendes tú a mano). *(La pauta paga siempre cae al 304.)*

5. **Cuenta publicitaria lista** (Configuración del negocio):
   - Método de pago cargado (Meta cobra en COP).
   - **WABA del 304 vinculada** al portafolio de negocio (Cuentas → Cuentas de WhatsApp).
   - **@varmansnk vinculada** al portafolio y a la página (Cuentas → Cuentas de Instagram) →
     así los anuncios salen en IG con tu identidad @varmansnk, no como "página de Facebook".

6. **Elegir las 3 fotos** de los anuncios: on-feet con medias blancas, exterior urbano, con la
   marca de agua. **Sin logo de tercero protagonista** y **nunca tipo LV** (riesgo de baneo de
   la cuenta publicitaria).

> Si el 15 jul algo de esto falta, la pauta se corre los días que haga falta. El 16 es la
> meta, no una promesa a Meta. **Nunca se paga tráfico hacia un bot sin probar.**

---

## Parte B — Montaje pantalla por pantalla (en `adsmanager.facebook.com → Crear`)

1. **Objetivo:** *Interacción* (Engagement).
   *(Es lo correcto: el bot mide en la app, no devuelve conversiones a Meta; las "conversaciones
   iniciadas" son eventos baratos y dejan que Meta salga de aprendizaje con presupuesto chico.)*
2. **Ubicación de conversión:** *Apps de mensajes* → **WhatsApp**.
3. **Nombre de campaña:** `META_Mensajes_Colombia_Sneakers_2026-07`.
4. **Detalles de conversión:** "Hacer clic para enviar mensaje" → tu **Página de FB** →
   **WhatsApp** → en el desplegable elige el número **304 291 6972**.
5. **Presupuesto (a nivel del CONJUNTO):** 15.000 COP/día. **Déjalo ≥7 días sin tocar** (los
   primeros 3–4 son "aprendizaje": no editar, no pausar).
6. **Público — ancho (ajuste `/ads`):** Colombia · 18–40 · todos los géneros ·
   **Advantage+ audience ON**. Si quieres darle una pista, **máximo 2–3 intereses**
   (sneakers / streetwear) como *sugerencia*, nunca como filtro duro. En 2026 el creativo ES la
   segmentación: la foto encuentra al comprador mejor que 12 intereses apilados.
7. **Ubicaciones:** **Automáticas (Advantage+)** → aquí es donde entra **Instagram** (Feed +
   Stories + Reels de FB **e IG**). No las pongas manuales.
8. **Creativos:** los **3 anuncios en el MISMO conjunto** — D1 (deportivas), C1 (casuales),
   U1 (urbanas) de `../TEXTOS-ANUNCIOS.md`. Foto **1:1** (feed) + **9:16** (stories/reels).
   **Sin texto encima de la foto** (Meta lo penaliza) — el texto va en los campos.
9. **Mensaje prellenado — NOMBRA el modelo del anuncio** (mejora 07-13). Cada anuncio va por un
   modelo puntual; si el prellenado nombra ese modelo, el bot manda la **foto + precio + talla**
   (venta directa), no el catálogo genérico. Plantilla (cambia `[MODELO]` por el nombre EXACTO
   de la app, ≥2 palabras del modelo, no solo la marca):
   - *"¡Hola! 👀 Vi su anuncio, ¿precio de las [MODELO]? 👟"*
   - *"¡Hola! Me encantaron las [MODELO] del anuncio 🔥 ¿Están disponibles?"*
   - *"¡Hola! Vi sus [MODELO] 🖤 ¿Qué tallas les quedan?"*
   Requisito: el modelo debe existir y tener `marca` escrita en la app (si no, el pinpoint no
   acierta y cae al link del catálogo). Guía de dueño: Escritorio `CAMPANA-META-PASO-A-PASO.txt`.
   Así el cliente cae directo al flujo del bot y queda registrada la `fuente`.
10. **Revisar → Publicar** (después de tu pantallazo y mi OK).

---

## Parte C — Ajustes de creativo del `/ads` (listos para usar)

**1. Precio en el texto (ya se puede — los precios están en la app).**
Toma el precio activo más bajo en la pestaña Tienda y agrega al final del *Texto principal*:
`Desde $XX.XXX 👟`. Plan: probar **con precio vs. sin precio** para ver cuál trae más
conversaciones (una variable por vez).

**2. Truco de la "palabra-identidad" (barato, abre público nuevo).**
Cuando ya tengas un anuncio ganador, duplícalo insertando una palabra que el cliente sienta
como "esto es para mí". Banco de ángulos (elige uno por variante):
- Talla difícil: *"¿Talla 44 o 45 y nunca la encuentras?"* · *"para pies grandes"*
- Uso: *"para el gym"* · *"para trotar"* · *"para la U"* · *"para estar de pie todo el día"*
- Ciudad/entrega: *"en Bogotá contra entrega"* · *"envíos a toda Colombia"*
- Ocasión: *"para estrenar este mes"*
⚠️ La palabra es **identidad del cliente**, **nunca** marca de tercero (Nike/Adidas en el texto
= riesgo de rechazo del anuncio).

**3. Video orgánico que despegue → súbelo TAL CUAL como anuncio.**
Si un Reel/TikTok de @varmansnk explota orgánicamente, además de Promote en TikTok, métele ese
mismo video como 4º creativo en el conjunto de Mensajes. Contenido probado + distribución paga
= la jugada de mayor palanca.

**4. Máquina de creativo semanal.**
El cuello de botella no es el presupuesto, es el creativo. Cada jueves que rotes, entra un
**estático nuevo** del mismo estilo del ganador. Reserva ~1 hora/semana para producirlos.

---

## Parte D — Reglas de decisión (para el ritual de los jueves, 30 min)

- **Costo/conversación iniciada:** <3.000 COP excelente · 3–6.000 normal · **>8.000 sostenido =
  cambia la FOTO**.
- **CTR** >1% bien · <0,6% la foto no llama. **Frecuencia >3 = rota creativo.**
- **La métrica que MANDA:** `plata gastada ÷ pedidos verificados en la app = costo por pedido`.
  Si un pedido deja más margen que su costo de pauta → **subir +20% (máximo, 1 vez por semana)**.
- **1ª semana: NO editar nada.** Editar reinicia el aprendizaje (error de novato #1).
- **No repartir el presupuesto** en varias campañas: con plata chica, ninguna aprende.

---

## Errores de novato a evitar
1. Editar la campaña a diario → reinicia el aprendizaje.
2. Repartir el presupuesto en muchas campañas chicas → ninguna aprende.
3. Texto encima de la foto → Meta la muestra menos.
4. Anunciar referencias/tallas agotadas → revisa stock en la app antes.
5. Segmentación híper-específica (muchos intereses) tapando un creativo flojo → ve ancho + creativo bueno.

---

*Runbook del PM (Cowork), 2026-07-12. Revisión con `/ads` (era Andromeda): público ancho,
creativo como máquina semanal, palabra-identidad, video orgánico probado → pago. Textos en
`../TEXTOS-ANUNCIOS.md`; estrategia y presupuesto en `PLAN-2-MESES.md`; estilo en
`../ESTILO-MARCA-REDES.md`.*
