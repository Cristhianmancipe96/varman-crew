# BRIEF — Ajustes de la reunión con el socio (22 jul 2026): bot conversacional, humano cierra

**Para:** UN agente de Claude Code · **Zona:** SOLO `bot_n8n\workflows\src\` (textos.js, cerebro-v4.js) + tests.
**NO tocar:** el JSON del workflow (se regenera con `node workflows\build-v4-pedidos.js`), web, app, .env de la VM.
**Regla de la casa:** TODO aditivo + detrás de flag + OFF por defecto (flags off = byte-idéntico a hoy) + rollback = apagar flag. Subir VERSION en build-v4-pedidos.js ANTES de construir. Tests: 352 existentes en verde + casos nuevos por flag.
**Orden:** si también se va a ejecutar `brief-2026-07-22-cierre-confianza.md`, correrlos EN SECUENCIA con el mismo agente (misma zona, no en paralelo).

## Decisión de negocio (contexto)
Reunión socios 22 jul: el bot deja de intentar cerrar pedidos solo. Nuevo modelo aprobado:
**el bot saluda, conversa e informa; la venta la cierra un humano (320) o la web.**
El bot NUNCA vuelve a preguntar la talla. Menos información por mensaje, tono más humano y
un poco más formal. Todo reversible por flags para poder comparar.

## Flag maestro `BOT_MODO_CONVERSA` (los cambios de flujo van juntos aquí)

### 1. Saludo SIEMPRE primero (guardando lo que el cliente mandó)
Cliente llega con lo que sea (solo una referencia, solo una foto, solo "precio", texto del
anuncio): el bot GUARDA esa info en la sesión (ref detectada / media_id de la foto / intención)
y responde SOLO un saludo breve que abre conversación, p. ej.:
«¡Hola! Bienvenido a VarMan Crew 👟 Con gusto te atiendo, ¿qué modelo estás buscando?»
(si ya trae ref detectada: «¡Hola! Bienvenido a VarMan Crew 👟 ¡Claro que sí! ¿Lo buscas para ti o para regalar?» — redacción final la ajusta el dueño en textos.js).
Cuando el cliente RESPONDA, el bot continúa usando lo guardado (muestra el par pedido, etc.).
La foto se sigue reenviando al 320 como hoy.

### 2. La ficha del producto: sin número de ref, sin talla, sin "cancelar"
- **Sin número de referencia:** el cliente NUNCA ve "Ref NN". Se muestra solo la descripción
  registrada en la app (marca/nombre; fallback: categoría). La ref sigue viajando POR DENTRO
  (sesión, Firestore, avisos al 320) — igual que el flag BOT_NOMBRE_MODELO existente:
  extender esa lógica a TODOS los textos que ve el cliente (fichaCaption, listas, intros).
  ⚠️ PRERREQUISITO del dueño: ponerle nombre/marca a TODAS las refs en la app.
- **Sin pregunta de talla:** eliminar del flujo la pregunta "¿Qué talla buscas? (35 a la 45)".
  El bot no arma pedido por chat con este flag ON.
- **Sin "cancelar":** ningún texto de ficha menciona la palabra cancelar (la palabra clave
  sigue funcionando si el cliente la escribe, solo no se anuncia).

### 3. Intención de compra → humano o web (el bot no cierra)
Cuando el cliente muestre intención ("lo quiero", "cómo pago", "me interesa", da una talla
espontáneamente, etc.): el bot responde con las 2 salidas, en tono conversacional:
- comprar directo en la web (link), y/o
- «te conecto con uno de nuestros asesores para que te ayude con tu pedido» → handoff real
  (aviso al 320 vía msjAvisoDueno con TODO el contexto: ref interna, talla si la dio, ciudad).
Los textos de pago/talla/datos actuales quedan intactos para flag OFF.

### 4. Varias burbujas cortas, no un mensajote
Con el flag ON, las respuestas largas se parten en 2-3 mensajes cortos enviados en secuencia
(saludo aparte, info aparte, pregunta aparte). Implementar como lista de mensajes que el
Cerebro emite en orden (el nodo de envío ya procesa múltiples items). Máximo 3 burbujas por
turno para no spamear ni cargar la VM.

### 5. Seguimiento a los 3 minutos de silencio
Si tras mostrar info (ficha o precio) el cliente NO responde en ~3 min → UN solo mensaje:
invitación amable a ver el catálogo completo en la web (link) «por si quieres ver todos los
modelos con calma». Una sola vez por conversación (marca en la sesión).
**Implementación sugerida:** el cron de recordatorios hoy corre cada hora → crear un
segundo Schedule Trigger cada 5 min SOLO para este rescate corto (barato en RAM; revisa
sesiones con `esperandoRespuesta` y >3 min). NO usar N8N_CONCURRENCY (lección del 21 jul).
Nota: el cliente escribió hace minutos → dentro de ventana de 24h, texto libre llega bien.

## Cambios de TEXTO (flag `BOT_TEXTOS_SOCIO`, independiente del flujo)
1. Quitar los asteriscos de `*VarMan Crew*` en TODOS los textos al cliente → VarMan Crew plano.
2. FAQ contra entrega nacional (plantilla APROBADA por los socios, textual):
   «¡Claro que te entiendo! 🙌 El pago contra entrega lo manejamos solo en Bogotá, porque ahí entregamos con logística propia el mismo día.
   Para el resto del país trabajamos con pago anticipado 100% seguro por Wompi (la plataforma de pagos de Bancolombia): puedes pagar con Nequi, PSE, Bancolombia o tarjeta, y te llega tu comprobante oficial de inmediato.
   Y para que compres tranquilo:
   ✅ Te enviamos la guía de la transportadora apenas despachamos, para que rastrees tu pedido en todo momento
   ✅ Envío GRATIS a todo el país
   ✅ Somos tienda establecida: nos encuentras en varmancrew.com y en nuestras redes
   ¿Te comparto el link de pago para apartar tu talla? 👟»
   Disparador: cualquier pregunta por contra entrega / pago al recibir, en cualquier paso.
   (En modo conversa, la última línea cambia a: «¿Quieres que un asesor te ayude con tu pedido? 😊»)
   Respetar el modo multi-burbuja: enviarla en 2 mensajes (explicación / garantías+pregunta).

## Cambios de PROMPT de Gemini (flag `BOT_TONO_SOCIO`)
Bloques aditivos a GEMINI_SISTEMA y GEMINI_ASISTENTE (v1 y v2):
1. **Producto:** los productos se describen como **«importados»** (p. ej. «son importados, de
   excelente calidad»). PROHIBIDO decir «calidad 1.1» o «réplica». Se MANTIENE la regla legal:
   nunca afirmar que son originales de marca ni negar explícitamente que lo sean.
2. **Tono:** cálido y cercano pero un punto más formal/profesional. PROHIBIDO: «parcero»,
   «chimba», «mor», «bro», «huevón» y jerga similar. Se mantiene: sin mexicanismos. Tutear
   está bien; evitar exceso de confianza. Máximo 1 emoji por mensaje.
3. **Respuestas cortas:** máximo 2 frases por mensaje; si hay más que decir, se parte en
   burbujas (coordina con el multi-burbuja del flujo).

## Qué NO cambia
- El bot pausado, comandos admin, Wompi webhook, resumen diario, avisos al 320 (plantilla aviso_bt).
- El flujo completo actual queda intacto con los flags OFF (es el rollback y el plan B si
  el modo conversa vende menos).

## Hecho cuando
1. Build regenera el JSON sin errores, VERSION nueva.
2. Tests: los 352 en verde + nuevos: saludo-primero guarda y retoma ref/foto; ficha sin
   "Ref" ni "cancelar" ni talla; intención → handoff con contexto al 320; multi-burbuja ≤3;
   rescate a 3 min una sola vez; FAQ contraentrega dispara en cualquier paso; prompts con
   "importados" y tono sin palabras prohibidas; flags OFF = todo byte-idéntico.
3. Guía de despliegue paso a paso (estilo PASOS-V6.9): qué flags encender, en qué orden
   probar (sugerido: primero BOT_TEXTOS_SOCIO + BOT_TONO_SOCIO, después BOT_MODO_CONVERSA),
   y rollback por flag.
