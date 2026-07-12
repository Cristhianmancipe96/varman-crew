# PLAN DE PRUEBA DEL BOT · 7 jul 2026 (Agente Bot + Cristhian)

**Contexto:** Claude Code está ejecutando AHORA `BRIEF-VM-GCP-SIN-TUNEL-2026-07-06.md`
(n8n en la VM varman-bot, bot.varmancrew.com). Este plan arranca CUANDO ese brief termine.
No tocar la VM mientras Claude Code trabaja.

## Cómo está configurado el bot hoy (auditoría v4.1)

Workflow `bot-whatsapp-v4-pedidos.json` — 11 nodos, cerebro de ~550 líneas:

1. **Webhooks:** GET verificación (challenge Meta, token bueno=200/malo=403) + POST mensajes.
2. **Parseo** del mensaje entrante (texto, botones, imágenes).
3. **Catálogo** leído de Firestore `tiendas/varman/catalogo` (misma fuente que la web).
4. **Cerebro:** sesiones con caducidad 24h · Gemini gratis como clasificador de intenciones
   (lenguaje libre) · flujo de pedido con botones: referencia → talla → datos de envío →
   pago (Nequi/Daviplata/Bre-B desde `PAGO_*`) → foto del comprobante → pedido en Firestore
   con estado `pagado_por_verificar` → visible en pestaña Pedidos de la app.
5. **Handoff humano:** avisa a Cristhian y le dice al cliente que le escriben del 320.
6. **Admin desde el 320:** `pedidos` / `pausar` / `activar` / `admin`.
7. **Robustez:** reintento en envíos, log de errores a Firestore `botErrores`, limpieza de
   sesiones 3:15am. Textos parametrizados (editables sin tocar código). 32/32 tests offline.

## Prueba de hoy — pasos en orden

**Fase A — al terminar Claude Code (Cristhian + Cowork):**
1. Anotar la IP estática que deja Claude Code → crear registro A `bot` en Cloudflare
   (**DNS only, nube gris**).
2. `https://bot.varmancrew.com` responde el challenge (Claude Code lo prueba; re-verificar).
3. Configurar Callback URL definitiva en Meta (guía: `GUIA-META-CALLBACK.md`, App ID
   2168913153950288) — esta vez es LA definitiva, no se vuelve a tocar.

**Fase B — prueba funcional (app aún en modo desarrollo: solo funcionan números de
admins/testers de la app; usar el 320 de Cristhian):**

| # | Enviar al +57 304 291 6972 | Debe pasar |
|---|---|---|
| 1 | `hola` | Saludo + menú de categorías |
| 2 | "tienen deportivos?" (lenguaje libre) | Gemini clasifica → muestra deportivas del catálogo real |
| 3 | Elegir referencia → talla → datos | Pide cada paso con botones, sin trabarse |
| 4 | Elegir Nequi | Muestra 3002762786 y total correcto |
| 5 | Mandar foto cualquiera (comprobante) | Confirma pedido; pedido aparece en pestaña Pedidos de la app |
| 6 | "quiero hablar con alguien" | Handoff: aviso llega al 320 |
| 7 | Desde el 320: `pedidos`, `pausar`, `activar` | Lista pendientes; en pausa responde mantenimiento |
| 8 | `sudo reboot` a la VM | Todo vuelve solo (docker restart policies) |

**Registrar cada resultado aquí mismo (✅/❌ + nota).** Si algo falla: revisar
`botErrores` en Firestore y ejecuciones en n8n antes de tocar código.

## RESULTADOS (7 jul 2026, tarde) — TODO PASÓ ✅

- Fase A completa: IP 136.114.253.74, DNS gris, VM instalada (Cloud Shell + gcloud ssh,
  el botón SSH del navegador no funcionó), v4.1 activo, backups con cron, salud 7/7,
  reinicio superado, Callback definitiva verificada en Meta y `messages` suscrito.
- Fase B: pruebas 1-7 ✅ TODAS (flujo completo con Gemini, pedido con Nequi, comprobante,
  pedido visible en la app, handoff, comandos admin). Prueba 8 (reboot) ✅.
- Truco usado: en modo desarrollo Meta no entrega mensajes del número real; se probó
  escribiendo al NÚMERO DE PRUEBA (webhook sí llega) y el bot responde por el 304.
- PENDIENTE ÚNICO para E2E real: email de aprobación de Meta → botón Publicar →
  probar "hola" directo al 304 → EL CORTE (~14 jul): cambiar número en web + botón
  WhatsApp de FB + bios de IG/TikTok.
- Backlog de mejoras (sección de abajo) queda para brief de Claude Code; prioridad 1
  el campo `fuente` (referral de ctwa) antes del 16 jul.

## Qué mejorar (backlog priorizado por el PM — NO hacer hoy salvo que la prueba pase rápido)

1. **Atribución de pauta:** capturar el objeto `referral` de los webhooks click-to-WhatsApp
   y guardarlo como `fuente` en el pedido → medir qué anuncio VENDE (lo pide el brief de
   marketing). Esfuerzo bajo, valor alto para el 16 jul.
2. **"¿Cómo va mi pedido?":** intención de consulta de estado (lee el pedido del cliente en
   Firestore y responde el estado). Reduce chats al 320.
3. **Anti-spam básico:** límite de mensajes por cliente/minuto (Gemini gratis = 1500 req/día;
   un abuso se lo come).
4. **Fallback sin foto:** si una referencia no tiene foto/precio en Firestore, respuesta
   digna en vez de campos vacíos.
5. **Alerta diaria al 320** con resumen: pedidos nuevos, errores del día (usa el schedule
   trigger que ya existe).

*Generado por Cowork (PM) el 2026-07-07.*
