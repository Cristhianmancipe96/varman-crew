# BRIEF — Ronda 2 · 4 agentes en paralelo · 2026-07-06 (tarde)

**Contexto: la ronda 1 terminó (ver NOTA-AGENTE*.md en cada carpeta). Verificación de Meta ENVIADA hoy ("En revisión", ~2 días). Corte: ~14 jul. Cada agente lee su NOTA de ronda 1 + `BRIEF-NUEVA-SESION.md` + `LEEME-BOT.txt` antes de tocar nada.**

## Novedad de esta ronda: LA PLANTILLA
El proyecto se va a replicar con otros negocios. Se creó `plantilla\PLAYBOOK-REPLICACION.md` (documento maestro). **Cada agente, además de su tarea funcional, documenta SU capa** en un archivo propio dentro de `plantilla\` (nadie toca el archivo de otro):

- Agente 1 → `plantilla\03-bot.md`
- Agente 2 → `plantilla\02-app.md`
- Agente 3 → `plantilla\01-web.md`
- Agente 4 → `plantilla\04-infra.md`

Qué documentar en ese archivo: (a) qué partes de tu capa son GENÉRICAS (sirven tal cual para otro negocio), (b) qué está HARDCODEADO de VarMan (nombres, colecciones `tiendas/varman/*`, colores, textos, números) con archivo+línea o cómo encontrarlo, (c) la lista de variables que un negocio nuevo tendría que definir, (d) pasos de montaje de cero de tu capa en orden, con tiempos estimados. Escríbelo para que otra sesión de Claude lo ejecute sin conocer VarMan.

## Regla maestra (igual que ronda 1)
Un agente = sus carpetas. Solo Agente 1 toca n8n, `.env`, `workflows\`. Verificar con `ls` antes de borrar/mover. Credenciales jamás salen de sus carpetas.

---

## AGENTE 1 — Bot (`bot_n8n\` excepto `deploy\`)
1. **Re-importar el v4.1 a n8n** (la copia importada el 05-jul quedó vieja — tu pendiente clave de ronda 1). Con n8n APAGADO, procedimiento del RUNBOOK paso 3. El v4 queda INACTIVO (el eco sigue activo hasta que Meta apruebe). Arrancar n8n de nuevo y verificar: eco responde y el webhook verifica (GET challenge por el túnel).
2. Correr `node tests\test-offline-v4.js` después del re-import (debe seguir 32/32).
3. **Parametrizar los textos del bot:** extraer del Cerebro los textos de venta/tono (saludo, despedida, mensajes de pago, handoff) a una sección de constantes clara al inicio de `src\cerebro-v4.js` (o un `src\textos.js`), de modo que cambiar el tono para otro negocio sea editar UN lugar y rebuild. No cambiar el contenido actual de los textos.
4. `plantilla\03-bot.md` (ver arriba).

## AGENTE 2 — App (`app\`)
1. **Exportar pedidos a Excel** desde la pestaña Pedidos (mismo patrón del botón verde de Inventario/Ventas): fecha, cliente, teléfono, ref+talla, total, método, estado.
2. **Preparar el enlace catálogo↔inventario SIN activarlo:** campo opcional `refInventario` editable en el detalle de cada referencia de la pestaña Tienda (dropdown con las VRM001-080). Si está lleno, la pestaña Pedidos muestra el stock real de esa VRM junto al aviso de "verificar a mano". Vacío = comportamiento actual. Así Cristhian enlaza gradualmente sin migraciones (responde a `briefs\DECISION-CATALOGO-INVENTARIO.md` con la opción no invasiva).
3. Actualizar `reglas-firestore.txt` solo si el punto 2 lo requiere, y `LEEME-APP.txt` con lo nuevo.
4. `plantilla\02-app.md`.

## AGENTE 3 — Web (`web\`) + marketing
1. **Sección "¿Cómo comprar?"** en `publicar\index.html`: 3-4 pasos visuales (elige en el catálogo → pide por WhatsApp → paga por Nequi/Daviplata/Bre-B → te llega). Ligera, coherente con el diseño actual, encima del footer. Preparada para que el paso de WhatsApp use `var WHATSAPP_NUMERO`.
2. **Kit de pauta (16 jul)** en `web\marketing\`: 6 textos de anuncio click-to-WhatsApp (2 por categoría: deportivas/casuales/urbanas, con gancho + CTA), 3 textos para tráfico a la web, y `GUIA-PRIMERA-CAMPANA.md` (Meta Ads: objetivo mensajes vs tráfico, presupuesto 15-20k COP/día, segmentación Colombia + intereses sneakers, qué métricas mirar la primera semana). Solo texto/guía — las piezas gráficas se harán con las fotos reales.
3. `plantilla\01-web.md`.

## AGENTE 4 — Infra (`deploy\`)
1. **Parametrizar los scripts:** mover todo lo VarMan-específico de los 4 scripts .sh y los compose a variables al inicio (o un `config.sh` que los demás importan): nombre del negocio, IDs de workflows, rutas, zona horaria. Objetivo: replicar infra para otro negocio = editar un solo archivo.
2. **`deploy\GUIA-CUENTAS-ORACLE-DOMINIO.md`**: guía paso a paso PARA CRISTHIAN (no técnico) de los pasos A2-A5 del checklist: crear cuenta Oracle Free Tier (qué pide, qué elegir, trampas del A1.Flex "out of capacity" y cómo reintentar), comprar dominio barato (registrador recomendado y por qué), conectarlo a Cloudflare (nameservers) y crear el túnel NOMBRADO. Con tiempos y capturas de qué botones buscar.
3. Si para cuando corras ya hay Docker Desktop instalado: ejecutar `probar-local.ps1` y anotar el resultado en tu NOTA. Si no, sigue pendiente (no instalar Docker tú — reinicia el PC y tumba el túnel).
4. `plantilla\04-infra.md`.

---

## Contratos vigentes
- Esquema de pedido: dueño Agente 1; cambios por `briefs\CAMBIOS-PEDIDOS.md`. La app solo escribe `estado`, `notas` y ahora `refInventario` (en catálogo, no en pedidos).
- Estados: `nuevo`/`pagado_por_verificar` (bot) → `verificado`→`enviado`→`entregado`/`cancelado` (app).
- `var WHATSAPP_NUMERO` no se cambia hasta EL CORTE.

## Pendientes de Cristhian (siguen de ronda 1 — nada de esto lo hace un agente)
1. Pegar `app\reglas-firestore.txt` en Firebase Console (activa Caja + Pedidos de una vez).
2. Subir `app\` a Cloudflare Pages (varmanapp) y `web\publicar` (varmancrew).
3. Datos de pago reales → `.env` (`PAGO_*`) — avisar al Agente 1 para reiniciar n8n.
4. Fotos y precios reales (pestaña Tienda).
5. Esta semana: cuenta Oracle + dominio (con la guía nueva del Agente 4) e instalar Docker Desktop (al final del día: el reinicio tumba el túnel → después seguir `GUIA-META-CALLBACK.md`).
6. Estar pendiente del email de Meta (verificación).

*Brief generado en Cowork (PM del proyecto) el 2026-07-06.*
