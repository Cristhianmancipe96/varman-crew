# BACKLOG v6 — lo que quedó fuera (y por qué) · VarMan Crew · 2026-07-08

Lo entregado en v6 (robustez conversacional, Wompi, catálogo nativo) está
implementado, probado offline (102/102) y detrás de flags. Esto es lo que se dejó
para después, con la razón:

## Robustez conversacional
- **Handoff con estado "en atención humana":** hoy el handoff avisa al cliente y
  al 320, pero NO marca la sesión como "pausada por humano" (el bot podría seguir
  respondiendo si el cliente escribe otra vez). Falta un `estado: handoff` en la
  sesión + que el 320 la "reactive". Se dejó fuera para no tocar el flujo de
  pedido; el aviso al 320 es suficiente para el lanzamiento.
- **Asistente en el paso de datos de envío:** la captura sigue usando el
  heurístico de longitud (v5) + un dígito; Gemini responde preguntas extra y
  guía, pero no valida campo por campo (nombre/ciudad/teléfono). Suficiente para
  el lanzamiento; afinar si aparecen direcciones mal capturadas.

## Wompi
- **Llaves reales:** en el `.env` van placeholders; Cristhian saca las llaves
  (RUT + cuenta Wompi). Primer desembolso a persona natural ~30 días → Nequi/
  Daviplata/Bre-B siguen de respaldo.
- **Reconciliación / reembolsos:** el webhook confirma pagos APPROVED. No se
  maneja aún VOIDED/refund que revierta un pedido ya confirmado (poco frecuente;
  el 320 lo hace a mano en la app).
- **`redirect_url` de vuelta al chat:** el link de pago no lleva redirect a un
  "gracias"; se dejó simple. Se puede añadir cuando haya una página de gracias.

## Catálogo nativo (MPM)
- **Carrito nativo → pedido automático:** el MPM muestra productos, pero cuando el
  cliente arma el carrito nativo WhatsApp manda un mensaje tipo `order` que hoy NO
  se procesa para crear el pedido. Necesita el número en **Live** para probarse.
  Mientras tanto el cliente pide con la lista "Elige tu referencia" (ref:) que va
  junto al MPM. **Este es el pendiente más grande de C.**
- **MPM en búsqueda por marca:** el swap a MPM está en la vista por categoría; la
  búsqueda por marca sigue con fotos v5. Fácil de extender igual que la categoría.
- **Feed automático:** el feed se genera a mano (`generar-feed-catalogo.js`).
  Subida programada (URL del CSV) queda para después.

## General
- **Prueba E2E real:** todo se probó offline (Firestore real, WhatsApp/Wompi
  mockeados). La prueba con mensajes reales depende de Meta Live / llaves Wompi →
  la hace Cristhian con el runbook.
- **Messenger/Instagram:** fuera de v6 (ver `briefs/_futuro/BRIEF-MESSENGER-INSTAGRAM.md`).
