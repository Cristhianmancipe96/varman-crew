# Guion real del dueño — conversaciones que SÍ fluyen (24 jul 2026)

> Transcripción de capturas que mandó Cristhian el 25-jul de madrugada: **dos conversaciones
> reales suyas** desde el 320, con clientes que el bot le pasó ("nuestro asistente virtual nos
> envió tu contacto"), o sea el **modo híbrido en acción**. Él las señaló como *"fluidas, para
> que tengas una guía"*. Esto es la referencia de tono y de ORDEN de la conversación: manda
> sobre cualquier texto inventado. Las capturas no están en el repo — esta transcripción es el
> único registro, no la borres.

## Conversación A — cliente +57 300 4716627 (Pasto)

```
DUEÑO   21:54  Buenas noches
DUEÑO   21:54  Bienvenido a Varman Crew
DUEÑO   21:54  Nuestro asistente virtual nos envió tu contacto
DUEÑO   21:55  Mi nombre es Cristian
DUEÑO   21:55  En que modelo estás interesado?
DUEÑO   21:55  [FOTO del post de Instagram: Reebok Classic azules]
CLIENTE 21:55  Hola!
CLIENTE 21:55  Estos en 39
CLIENTE 21:55  39 y medio
DUEÑO   21:55  Claro que si están disponibles
DUEÑO   21:55  Donde estás ubicado
CLIENTE 21:55  Pasto
DUEÑO   21:55  ?
DUEÑO   21:56  Para pasto manejamos envío gratis
DUEÑO   21:56  [FOTO del modelo]
DUEÑO   21:56  Reebok classic · Casuales · 💵 $239.900
CLIENTE 21:57  Bonitos, como sería el método de pago
DUEÑO   21:57  Manejamos transferencia o con tarjeta por medio de wompi
DUEÑO   21:58  [VIDEO 0:19 del zapato REAL en la mano]
```

## Conversación B — cliente +57 321 2587057 (Caparrapí, Cundinamarca)

```
DUEÑO   22:12  Buenas noches bienvenido a Varman Crew
DUEÑO   22:13  Nuestro asistente virtual nos envió tu contacto
               Mi nombre es Cristian
               En que modelo estás interesado?
DUEÑO   22:13  [FOTO del post de Instagram: Reebok Classic azules · 354 ❤ 45 💬]
CLIENTE 22:14  De esas
DUEÑO   22:15  Ese modelo tenéis todas las tallas disponibles en el momento
DUEÑO   22:15  [VIDEO 0:19 del zapato REAL en la mano]
DUEÑO   22:16  Donde te encuentras ubicado          (editado)
DUEÑO   22:16  ?
CLIENTE 22:19  Caparrapi cumdinamarca
CLIENTE 22:19  Y que sistema de pago manejan
DUEÑO   22:20  Transferencias por Nequi, Daviplata o Wompi. 👟
DUEÑO   22:20  Con wompi puedes usar tarjeta débito o crédito
DUEÑO   22:21  ↪ (citando "Caparrapi cumdinamarca")
               Para caparrapi nuestros envíos son gratis
```

## El patrón, en orden (esto es el guion a imitar)

1. **Saludo por hora del día** ("Buenas noches") + **bienvenida a Varman Crew**.
2. **El puente del handoff:** "Nuestro asistente virtual nos envió tu contacto". Le explica al
   cliente por qué le escribe alguien nuevo, sin decir "bot" ni pedir disculpas.
3. **Se presenta con NOMBRE PROPIO:** "Mi nombre es Cristian". Humaniza de una.
4. **UNA pregunta abierta:** "¿En qué modelo estás interesado?" — no ofrece catálogo, no manda link.
5. **Manda la FOTO DEL POST que el cliente vio** (la creatividad del anuncio de Instagram, con
   sus likes). El cliente la reconoce y contesta "De esas" / "Estos en 39".
6. **Si pide una talla → NO pregunta la talla: confirma disponibilidad.**
   "Claro que si están disponibles" · "Ese modelo tenéis todas las tallas disponibles en el momento".
7. **Pregunta la CIUDAD** ("¿Dónde estás ubicado?") antes de hablar de precio o de pago.
8. **Responde la ciudad CON EL NOMBRE de la ciudad:** "Para **pasto** manejamos envío gratis" ·
   "Para **caparrapi** nuestros envíos son gratis". Personalizado, no genérico.
9. **Ficha compacta:** `Reebok classic · Casuales · 💵 $239.900` — nombre · categoría · precio.
   Nunca "Ref NN". El precio va junto a la foto.
10. **VIDEO del zapato real en la mano (0:19).** Aparece en LAS DOS conversaciones y es el
    gancho de confianza más fuerte que usa. **NO EXISTE como herramienta en el CUADERNO.**
11. **Pago:** "Transferencias por Nequi, Daviplata o Wompi" + "Con wompi puedes usar tarjeta
    débito o crédito". Dos burbujas cortas, sin bloque de instrucciones.
12. **Cita el mensaje del cliente** (reply citado) cuando responde algo puntual como la ciudad.

## Detalles de estilo (medidos, no opinados)

- **Mensajes cortísimos**, una idea por burbuja, 3-5 burbujas seguidas sin esperar respuesta.
- **Casi cero emojis**: uno solo en todo el hilo (👟 y el 💵 de la ficha). Muy lejos del
  emoji-por-mensaje que traían los textos viejos.
- **Sin signos de apertura** (`¿` `¡`) y **con typos** ("tenéis" por "tienes", "cumdinamarca"):
  escribe como persona apurada, no como plantilla. No hay que copiar los typos, pero sí el
  registro: **directo, sin formalismo, sin negrillas, sin asteriscos**.
- **Nunca pregunta "¿te muestro?"**: manda la foto y el video directo.
- **Nunca menciona la palabra "bot"** ni "no puedo ver imágenes" ni "calidad".
- El "?" suelto que aparece dos veces es él re-preguntando cuando el cliente no contestó — es
  un **empujón corto**, no una plantilla de rescate larga.

## Qué hay que cambiar en el CUADERNO-IA por esto

| # | Cambio | Por qué |
|---|---|---|
| 1 | **Herramienta nueva `enviar_video(ref)`** | El video del producto real en la mano es su gancho más fuerte y sale en las 2 ventas. Hoy el cuaderno no lo puede pedir. Requiere que la app tenga un campo de video por referencia (o `videosRef` en `botConfig`, como `refsFoto`). |
| 2 | **Mandar la creatividad del anuncio, no solo la ficha del catálogo** | Él manda la FOTO DEL POST que el cliente vio; el cliente la reconoce ("De esas"). Encaja con la cascada N1/N2: si el referral trae `source_url`/`fuente_titulo`, la imagen del anuncio es mejor primer disparo que la foto de catálogo. |
| 3 | **Saludo con nombre propio + puente del handoff** | "Mi nombre es Cristian" y "nuestro asistente virtual nos envió tu contacto". Si el bot cierra, el nombre debe ser el del asesor configurado; si pasa a humano, ese es el texto puente exacto. |
| 4 | **Respuesta de ciudad personalizada con el nombre de la ciudad** | "Para Pasto manejamos envío gratis" vende más que "el envío es gratis". El código ya tiene la ciudad: hay que interpolarla. |
| 5 | **Bajar el tope de emojis a ~0-1 por CONVERSACIÓN** | Hoy el cuaderno permite 1 por mensaje. El dueño usa 1 en todo el hilo. |
| 6 | **Talla: confirmar disponibilidad con sus palabras exactas** | "Claro que sí están disponibles" / "todas las tallas disponibles en el momento" — ya es la regla, pero estas son las frases reales que funcionan. |
| 7 | **Empujón corto cuando no contesta** | Un "?" o una línea, no el párrafo de rescate. |

## Lo que estas conversaciones CONFIRMAN del análisis

- El orden **modelo → disponibilidad → ciudad → envío gratis + precio → pago** es exactamente el
  cierre que el CUADERNO ya especifica. **El dueño y el análisis coinciden**: no se pregunta la
  talla y la ciudad va antes del pago.
- El **#1 del Top 10 de pérdidas** (preguntar la talla) queda confirmado desde el otro lado: él
  jamás la pregunta, y esas dos conversaciones avanzaron.
- Los leads venían de la **campaña de Instagram** y el bot ya estaba pasando el contacto: el
  modo híbrido funciona como filtro. Lo que falta es que el bot haga los pasos 1-9 solo.
