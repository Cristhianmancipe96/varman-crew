# NOTA AGENTE — Bot v6 (Fase 2) · VarMan Crew · 2026-07-08

Estado técnico del bot tras el brief `briefs/BRIEF-AGENTE-V6-FASE2-2026-07-08.md`.
Todo **aditivo, detrás de flags, con rollback en 1 comando**. Mismo `id` del
workflow (`VarmanBotV4Ped01`) → `importar-workflows.sh` sin cambios.

## Resumen: qué se hizo
- **(0) v5 lista/desplegable:** el build reproduce el JSON byte a byte; baseline
  79/79 verde antes de tocar nada. Respaldo v5 en
  `workflows/respaldo/bot-whatsapp-v4-pedidos.v5-pre-v6.2026-07-08.json`.
  (La v5 ya corre en la VM 7/7 según `GUIA-IMPLEMENTAR-V5`; lo pendiente de v5 es
  Cloudflare app/web + reglas Firestore, que son de otros agentes.)
- **(A) Robustez conversacional** — flag `BOT_ROBUSTEZ`. El bot enruta el texto
  por Gemini AUNQUE esté esperando un dato (talla/datos/pago/comprobante):
  1. **Handoff a humano** en cualquier momento sin frase exacta.
  2. **Datos adicionales / multi-intención** (captura el dato + responde lo extra).
  3. **Dato incorrecto/fuera de lugar** (guía en vez de error seco).
  Fallback seguro: sin el flag o si Gemini falla/timeout → comportamiento v5 EXACTO.
- **(B) Wompi** — flag por llaves. Método extra "Tarjeta/PSE/Nequi (Wompi)":
  crea link de pago (API), pedido `pago_pendiente`, y un **webhook con firma
  verificada** lo pasa a `pago_confirmado` (idempotente). Sin llaves → no aparece.
- **(C) Catálogo nativo** — flag `CATALOGO_NATIVO`+`WHATSAPP_CATALOG_ID`.
  Generador de feed CSV + capacidad MPM (tarjetas de producto) en la vista de
  categoría, manteniendo la lista "Elige" (ref:) para el pedido. Sin flag → fotos v5.

## Arquitectura (recordatorio)
- El workflow se GENERA: `node workflows/build-v4-pedidos.js` pega `src/*.js` en
  los nodos Code. **Editar `src/`, nunca el JSON a mano.**
- Nodo Cerebro = `src/textos.js` + `src/cerebro-v4.js`. Textos/tono en `textos.js`.
- **Nodos nuevos v6:** `Wompi webhook (POST)` (path `wompi`, onReceived) →
  `Wompi webhook (procesa)` (`src/wompi-webhook.js`, self-contained) →
  `Enviar a WhatsApp`. Total 15 nodos (antes 13).

## Flags (todas OFF por defecto → v5 idéntico). Detalle en `.env`.
| Flag | Efecto |
|---|---|
| `BOT_ROBUSTEZ=on` | robustez conversacional (usa el Gemini existente) |
| `WOMPI_PUB_KEY`/`WOMPI_PRV_KEY`/`WOMPI_EVENTS_SECRET`/`WOMPI_ENV` | pago Wompi |
| `CATALOGO_NATIVO=on` + `WHATSAPP_CATALOG_ID` | catálogo nativo MPM |

## Cambios de esquema (contrato app↔bot)
Documentados en `briefs/CAMBIOS-PEDIDOS.md` (sección v6): pedidos Wompi llevan
`wompi_payment_link_id`/`wompi_transaction_id`/`wompi_status` y estados nuevos
`pago_pendiente` / `pago_confirmado`. La app solo necesita mostrarlos (pendiente
de mapeo en la vista de Pedidos; si no se mapean, se ven como texto crudo).

## Verificación
- `node tests/test-offline-v4.js` → **111 PASS · 0 FAIL** (Firestore real; WhatsApp
  Graph y Wompi mockeados; Gemini real en el saludo y mockeado en la lógica).
  Secciones nuevas: 18 (robustez, incl. flag OFF), 19 (Wompi, incl. firma inválida
  e idempotencia), 20 (catálogo nativo, con/sin flag y paginación "Ver más").

## v6.1 — catálogo/ficha + llegada con mensaje prellenado (pedido del dueño)
- **Ficha al elegir (o al llegar con la ref):** `arrancarPedido` ahora manda la
  **foto grande + info completa** en un solo mensaje (`fichaCaption`:
  `Ref · marca · categoría · tag · precio`, con `infoRef(p)`) y luego pide la
  talla (`pedirTalla`). Sirve IGUAL para el `ref:` de la lista y para la ref
  prellenada de la web/anuncios → venta fluida.
- **Lista de catálogo con info por fila:** cada fila muestra `precio · marca/
  categoría · tag` (antes solo precio · detalle).
- **Llegada con mensaje prellenado (web/anuncios):** ya funcionaba la "ref
  directa"; queda confirmado y probado (test 21). El cliente que llega con
  *"Hola! Quiero la Ref NN"* arranca el pedido en esa ref (foto+info→talla) y se
  conserva la `fuente` (ctwa) para la atribución. **Recomendación para web/anuncios
  (agente WEB / Cristhian):** el texto prellenado DEBE incluir `Ref NN` (con la
  palabra "Ref" + número) para que el bot lo reconozca; ej. `Hola, me interesa la
  Ref 05`. Si el anuncio es general (sin ref), el bot muestra el catálogo normal.
- **Catálogo nativo (MPM):** sigue detrás de flag; es la ÚNICA forma nativa de
  "lista con miniatura por ítem + tocar → foto grande". Se activa con
  `CATALOGO_NATIVO=on` + `WHATSAPP_CATALOG_ID` cuando el número esté Live.

## Revisión a fondo (bugs corregidos en la misma sesión)
- **Catálogo nativo "Ver más" en bucle:** el MPM se reenviaba y la lista volvía a
  offset 0. Ahora el MPM sale solo en la 1ª vista y la lista pagina con el offset
  real. (test 20)
- **Pago sin respuesta:** un `pay:` desconocido dejaba al cliente en silencio →
  ahora re-muestra los métodos.
- **UX Wompi:** la opción decía "Nequi" (duplicado con la fila manual) → "Tarjeta
  o PSE (también Nequi)".
- **Tono MPM:** "nuestros Deportivas" → "nuestros deportivas".
- Con TODAS las variables nuevas vacías, el bot se comporta idéntico a la v5
  (secciones 1–17 en verde sin cambios).

## Entregables de esta ronda
- `workflows/` (build + `src/`, incl. `wompi-webhook.js`), JSON regenerado.
- `fase2/WOMPI-INTEGRACION.md`, `fase2/CATALOGO-NATIVO-WHATSAPP.md`,
  `fase2/generar-feed-catalogo.js`, `fase2/feed-catalogo-whatsapp.csv`,
  `fase2/BACKLOG-V6.md`.
- `briefs/RUNBOOK-DEPLOY-V6-2026-07-08.md`, `briefs/CAMBIOS-PEDIDOS.md` (v6),
  este `NOTA-AGENTE-V6-FASE2-2026-07-08.md`.
- `.env` con las variables nuevas documentadas (comentadas, OFF).

## Deploy
Lo hace Cristhian con `briefs/RUNBOOK-DEPLOY-V6-2026-07-08.md`. Orden: v5 ya en la
VM → importar v6 (comportamiento = v5) → salud 7/7 → activar `BOT_ROBUSTEZ=on` →
probar → luego Wompi y catálogo nativo cuando estén las llaves / el Live.
