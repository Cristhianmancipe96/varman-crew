# BRIEF — Estilo de cierre humano en el bot (caso Andrés, 22 jul 2026)

**Para:** UN agente de Claude Code · **Zona:** SOLO `bot_n8n\workflows\src\` (textos.js y cerebro-v4.js) + tests
**NO tocar:** el JSON del workflow (se regenera con `node workflows\build-v4-pedidos.js`), la web, la app, el .env de la VM.
**Regla de la casa:** todo ADITIVO + detrás de flag + OFF por defecto (flag off = comportamiento byte-idéntico a hoy) + rollback = apagar el flag. Subir la VERSION en build-v4-pedidos.js ANTES de construir. Tests: los 352 existentes en verde + casos nuevos por cada flag.

## Contexto (por qué)
Venta real del 22 jul: el cliente Andrés llegó al bot (304), mandó foto de un modelo que no
estaba en la lista, tocó «Ninguna de estas» → handoff. El dueño (Cristhian) cerró la venta a
mano desde el 320 con un estilo que funcionó y quedó APROBADO como plantilla (fila 61 de
`base-datos-respuestas-bot.csv`). El dueño quiere que el bot conteste "de esa manera".
Los ingredientes de ese estilo: precio con descuento SIEMPRE en cifra (normal tachado →
final), urgencia suave ("te lo respeto por el día de hoy", sin presionar), y un bloque de
confianza (foto/video del pedido al alistarlo + guía de la transportadora + envío gratis).

## Cambio 1 — Flag `BOT_CIERRE_CONFIANZA` (textos.js)
Versiones V2 de los textos de pago/cierre que agregan el bloque de confianza del dueño.
Con el flag ON se sobrescriben SOLO estos textos (mismo mecanismo que BOT_TEXTOS_V2):
- `wompiLinkCliente`, `pagoInstruccionesBoton`, `pagoInstruccionesTexto`, `contraentregaCliente`:
  añadir al final una línea tipo:
  «Todos nuestros envíos son seguros 🙌 te enviamos *foto o video de tu pedido* cuando lo
  alistamos, y te compartimos la *guía de rastreo* con la transportadora que te quede más cómoda.»
  (Redacción final: conservar {placeholders}; el dueño puede ajustar palabras en textos.js.)
- Conservar TODOS los {placeholders} actuales. Flag OFF → textos idénticos a hoy.

## Cambio 2 — Refuerzo del prompt de descuentos (GEMINI_SISTEMA / ASISTENTE v2)
Flag `BOT_DESCUENTO_CIFRA`. Con el flag ON, añadir a los prompts (bloque nuevo, aditivo):
- Cuando el bot ofrezca u acepte un descuento, SIEMPRE dar la cifra final calculada
  (ej: «queda en $212.400»), nunca solo el porcentaje.
- Formato sugerido en la respuesta: precio normal ~tachado~ → precio con descuento → envío gratis.
- Urgencia SUAVE: «te lo puedo respetar por el día de hoy», prohibido presionar («¡compra ya!»).
- Límites que NO cambian: máx 10% con razón, 15% solo por 2 pares.
- OJO bug conocido del barrido: si se ofrece 15%, el TOTAL del pedido debe salir CON el
  descuento aplicado. Si el cálculo del total vive en el cerebro, agregar el caso de test:
  «promo ofrecida ⇒ promo cobrada» (hallazgo "Datos peligrosos" del 20 jul).

## Cambio 3 — Flag `BOT_SILENCIO_HANDOFF` (cerebro-v4.js)
Del mismo caso real: tras el handoff, Andrés siguió escribiendo al bot («Me cuenta», «Estos»)
y el bot lo saludó como nuevo y le tiró el catálogo, mientras el humano ya lo atendía.
- Con el flag ON: cuando se dispara un handoff (cualquier vía: «asesor», foto:asesor,
  antibucle), marcar la sesión de ese wa_id como `enHandoff` con timestamp.
- Mientras `enHandoff` y no pasen N horas (env `BOT_SILENCIO_HORAS`, default 4): el bot NO
  responde plantillas de flujo a ese cliente; reenvía cada mensaje del cliente al 320 como
  aviso (usar `msjAvisoDueno()` — ya maneja plantilla/texto libre) con el texto del cliente.
- Sale del silencio: al vencer las N horas, o si el dueño escribe el comando `activar <wa_id>`
  (opcional, solo si es barato; si no, con el timeout basta).
- Flag OFF → comportamiento de hoy, byte-idéntico.

## Hecho cuando
1. `node workflows\build-v4-pedidos.js` regenera el JSON sin errores y con VERSION nueva.
2. Batería completa de tests en verde (352 + los nuevos de cada flag, mínimo:
   texto V2 aparece con flag on / no aparece con flag off; descuento con cifra;
   silencio post-handoff reenvía al 320 y no responde al cliente; silencio expira).
3. Con los 3 flags OFF, el JSON generado se comporta idéntico al actual.
4. Guía de despliegue paso a paso para el dueño (estilo PASOS-V6.9), incluyendo qué flags
   encender en el .env y el rollback (flag en off).
