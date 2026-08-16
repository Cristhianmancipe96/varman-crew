# Decisiones del dueño — 25 jul 2026 (aplicar al CUADERNO-IA y al código)

> Instrucciones dictadas por Cristhian en sesión. Tienen prioridad sobre cualquier texto
> redactado antes. Van aquí porque llegaron mientras los agentes ya estaban escribiendo.

## D1 · Nunca "no lo tenemos": es "no lo encontré" + asesor, y el asesor SE ENVÍA

**Instrucción textual:** *"me gustaría que no dijera que no lo tiene, solo que no lo encontró y
que lo va a enviar a un asesor y lo envíe"*.

### La regla
Cuando el bot no logra identificar o ubicar lo que el cliente busca — foto que no hace match,
modelo que no aparece en el catálogo, color que no existe, titular de anuncio que no cuadra,
referencia borrada, búsqueda vacía — **está PROHIBIDO decir o insinuar que no se tiene el
producto**. Se dice que **no se encontró**, y se pasa a un asesor.

| ❌ PROHIBIDO decir | ✅ Lo que se dice |
|---|---|
| "No lo tenemos" | "No lo encontré en el catálogo" |
| "Esas no las manejamos" | "No logré ubicar ese modelo" |
| "Ese modelo está agotado" | "No me aparece a mí; un asesor lo verifica" |
| "No hay en ese color" | "Ese color no lo encuentro registrado" |
| "No trabajamos esa marca" | "No lo encontré; te comunico con un asesor" |

**El porqué (decisión de negocio):** el bot NO es la autoridad sobre el inventario. Decir "no lo
tenemos" es una afirmación de stock que el bot no puede hacer (viola la regla de que el bot nunca
adivina stock) **y mata la venta**: el cliente entiende "aquí no es" y se va. "No lo encontré"
es honesto, deja la puerta abierta y traslada la verificación a quien sí puede hacerla: un humano.

### La parte que NO es negociable: el asesor se ENVÍA, no se promete
Anunciar el asesor y no ejecutarlo es el error que casi costó la venta de Andrés (22 jul: el bot
prometió asesor, el aviso al 320 nunca llegó por la plantilla creada en la cuenta equivocada, el
cliente reclamó "Me cuenta" a los 12 min y el bot lo saludó como cliente nuevo). Por eso, en el
MISMO turno en que el bot dice que pasa a un asesor, el código debe:

1. Ejecutar el handoff de verdad (`pasar_asesor`) — no dejarlo para el turno siguiente.
2. Mandar el aviso al dueño (320) **como plantilla aprobada** (`msjAvisoDueno`), que es la única
   forma de que llegue siempre, esté o no abierta la ventana de 24 h de WhatsApp.
   El aviso debe llevar: qué buscaba el cliente, su número, y **la foto o el texto original**.
3. Dejar la marca de silencio (`BOT_SILENCIO_HANDOFF`): el bot **calla** con ese cliente y le
   reenvía sus mensajes al 320, para que no lo vuelva a saludar como nuevo.
4. Si el aviso al 320 **falla**, registrarlo en `botErrores` y reintentar/escalar — un handoff
   silencioso es un cliente perdido y hoy sería invisible.

### Redacción modelo (tono del dueño, máx 2 frases, sin emoji de más)
> "No logré ubicar ese modelo en el catálogo. Ya le pasé tu mensaje a un asesor y te escribe en
> un momento para confirmártelo."

Variante con foto del cliente:
> "No encontré ese modelo entre los que tengo registrados. Le paso tu foto a un asesor y te
> confirma de una si lo conseguimos."

### Dónde aplica (todos estos casos)
- `ver_foto` no hace match, o el match es dudoso y el cliente dice que no es ninguna de las 2.
- `buscar_catalogo` devuelve vacío (marca, modelo, color o talla que no aparece).
- Cascada de campaña: el titular del anuncio no cuadra con nada del catálogo.
- La referencia mapeada de un anuncio ya no existe en el catálogo.
- Cualquier pregunta de disponibilidad que el bot no pueda responder con el catálogo en la mano.

### Lo que NO cambia
- Cuando el modelo **sí** está en el catálogo, el bot cierra la venta él mismo: esto no es una
  excusa para pasar todo a un humano.
- Sigue prohibido inventar stock **en positivo**: tampoco puede prometer que sí lo consigue.
  El asesor confirma; el bot solo traslada.
- Sigue vigente la regla de tallas: nunca las pregunta, y "todas las tallas disponibles, se
  confirma al alistar el pedido".

---

## D2 · Las campañas de Instagram van SIN mensaje predeterminado
El cliente llega escribiendo solo "Hola". No hace falta mensaje predefinido: Meta manda el
`referral` igual (ID del anuncio, titular, tipo, URL) y el bot ya lo parsea. El **DM de
Instagram** sigue atendiéndose a mano en el 320: el bot solo atiende click-a-WhatsApp.

---

## D3 · El bot JAMÁS pregunta lo que ya sabe o puede deducir

**Instrucción textual:** *"en este punto de la conversación el bot ya debe saber si es para
hombre o dama, no?"* — sobre una respuesta donde el bot preguntó "¿los buscas para dama o
caballero?".

### El hallazgo que destapó
En la prueba puntual el bot NO estaba mal (era una conversación nueva, sin ningún dato previo).
Pero al revisar salió un hueco real: **el género NO se guarda en el estado de la sesión.** La
herramienta `listar_modelos` lo recibe como parámetro, pero no existe un campo `iaGenero` que lo
persista, así que el modelo solo lo "recuerda" mientras esté dentro de los últimos 15 turnos del
historial. Conversación larga o cliente que vuelve al día siguiente = **vuelve a preguntar**.
Eso es el "bot loro", el puesto #5 del Top 10 de pérdidas.

### La regla
Antes de preguntar CUALQUIER dato, el bot revisa el bloque `[SESIÓN]` y el historial. Si el dato
ya está, **no se pregunta: se usa**. Aplica a género, ciudad, modelo de interés, para quién es,
método de pago preferido y datos de envío.

**Y lo que se puede DEDUCIR tampoco se pregunta:**
- Hay una **referencia activa** → el género sale de la ficha del catálogo de esa referencia.
  No se pregunta.
- El cliente llegó de un **anuncio** de un modelo concreto → ese modelo define el género.
- El cliente dijo para quién es ("es para mi novia", "para mi papá") → queda registrado y no se
  vuelve a tocar. Ojo: **nunca deducir el género del producto a partir del nombre del cliente**;
  solo de lo que dijo o del modelo que eligió.
- Solo se pregunta dama/caballero cuando **de verdad** no hay ni referencia, ni anuncio, ni nada
  dicho — y en ese caso va junto con el estilo, en una sola pregunta.

### Cambio de comportamiento con mensajes de ruido
Si el mensaje del cliente es ruido ("jajaja", letras sueltas, sticker) y **ya había algo sobre la
mesa**, el bot **NO abre una pregunta nueva**: re-ancla en lo que estaba pasando
("¿Seguimos con las Vans?"). Abrir una pregunta nueva ahí es reiniciar la conversación, que es
justo lo que el dueño no quiere.

### Implementación pendiente
1. **CÓDIGO:** campo `iaGenero` en la sesión (persistente) + al bloque `[SESIÓN]`; **derivarlo**
   de la ficha de la referencia activa cuando exista, y guardar lo que diga el cliente.
2. **CUADERNO:** regla explícita "no preguntes lo que ya está en `[SESIÓN]`" + la deducción del
   género por la referencia + el re-ancle ante ruido.
3. **ARNÉS:** cambiar el guion 7 para que el mensaje de ruido llegue **a mitad de conversación**
   (después de mostrar un modelo) y verificar que el bot re-ancla en vez de preguntar de nuevo;
   y un guion nuevo donde el cliente dice el género al inicio y se comprueba que NO se le vuelve
   a preguntar más adelante.
