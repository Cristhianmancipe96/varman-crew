# NOTA FLUIDEZ 8 — Pregunta por una marca a mitad de pedido (flag BOT_FLUIDEZ_RECONDUCE) · 2026-07-11

**Mandato del dueño: fluidez ante mensajes fuera de guion. Patrón del caso real 3:
a mitad del paso talla el cliente pregunta por otra cosa y hoy recibe la plantilla.**

## Qué cambié (interceptor RECONDUCE en `cerebro-v4.js`)
Tercer camino del interceptor (talla/datos/pago, texto libre): si el mensaje
**pregunta por una MARCA que existe en el catálogo** ("¿tienen nike?"), muestra la
tanda de esa marca (elegir de la lista re-arranca el pedido) en vez de repetir la
plantilla del paso. Guardas para no secuestrar:
- Debe sonar a pregunta/browse (¿?, "tienen/hay/muéstrame/ver").
- **Sin número de talla en el mensaje** ("las nike en 40" sigue fijando la 40).
- La marca se busca por palabra completa contra las marcas REALES del catálogo
  (con escape de regex); marca desconocida → sigue el paso normal (no inventa).

## Tests (sección 44)
OFF: "¿tienen nike?" en talla → plantilla (hoy). ON: fotos de nike + lista con
sesión cerrada · "las nike en 40" fija la talla (no secuestra) · "¿tienen gucci?"
(fuera de catálogo) sigue el paso.

Resultado: **227 PASS · 0 FAIL** (antes 223; +4).

## Cómo revertir
1. `workflows/respaldo/bot-varman.pre-fluidez-8.json` sobre `workflows/bot-varman.json`.
2. Quitar el bloque "[F-RECONDUCE] pregunta por una MARCA" del interceptor y la
   sección 44.
3. `node workflows/build-v4-pedidos.js`.

## ⚙️ Entorno
Node portable en `bot_n8n/herramientas/node/node.exe`. Ver `NOTA-MEJORA-1`.
