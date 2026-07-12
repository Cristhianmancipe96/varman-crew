# BRIEF — 4 agentes Claude Code en paralelo · 2026-07-06

**Corte de lanzamiento: ~14 jul (faltan 8 días). Cada agente lee esto + `BRIEF-NUEVA-SESION.md` + `LEEME-BOT.txt` ANTES de tocar nada.**

## Estado en 3 líneas
- Bot v4 (Fase 1 completa) importado en n8n, INACTIVO. Eco activo, tubo verificado con Meta.
- Bloqueo externo: app Meta en modo Desarrollo; falta verificación del negocio (la inicia Cristhian hoy).
- Ya hechos: guía Oracle (`deploy/`), brief Fase 2 MSN/IG (`fase2/`), pestaña Caja (pendiente activar).

## Regla maestra de reparto
**Un agente = una carpeta. Nadie edita archivos de otro.** Solo el AGENTE 1 toca n8n, `.env` y `workflows\`. Antes de borrar/mover: re-verificar con `ls` (OneDrive + sesiones paralelas ya causaron pérdidas el 01-02 jul). Nada de `credenciales\` ni `.env` sale de la carpeta ni va a git/deploys.

---

## AGENTE 1 — Bot n8n (dueño de `bot_n8n\` excepto `deploy\`)
**Misión:** dejar el v4 listo para producción mientras Meta aprueba.

1. **Descarga de comprobantes:** hoy el pedido guarda solo el `media_id`. Agregar al v4 la descarga de la imagen vía Graph API (GET media → URL → download con header Bearer) y guardarla (base64 comprimido en el doc del pedido, o carpeta local `comprobantes\` — decidir y documentar).
2. **Comandos admin desde el 320:** si escribe el número de Cristhian, modo admin: `pedidos` (últimos 5 pendientes), `pausar`/`activar` (bot en mantenimiento responde "ya te escribimos").
3. **Hardening:** reintento 1x en envíos a Graph API; log de errores a Firestore `tiendas/varman/botErrores`; validar que sesiones caducadas (24h) se limpien bien.
4. **RUNBOOK-CORTE.md** en `briefs\`: checklist exacto del 14 jul — registrar SIM, nuevo Phone Number ID en `.env`, apagar eco, activar v4, actualizar Callback URL, prueba E2E, cambio de botón web y bios.
5. Probar todo offline contra Firestore real (como se hizo con v4).

**No hace:** activar v4 en producción (espera publicación de Meta) · tocar `deploy\`, `app\`, `web\`.

## AGENTE 2 — App inventario (dueño de `app\`)
**Misión:** pestaña **"Pedidos"** — los pedidos del bot visibles y gestionables en la app.

1. **Leer el esquema real** de pedido del nodo que escribe en `workflows\bot-whatsapp-v4-pedidos.json` (solo LECTURA de ese archivo; el esquema lo define el bot y está congelado — si falta un campo, se anota en `briefs\CAMBIOS-PEDIDOS.md`, no se improvisa).
2. Pestaña Pedidos en `app.jsx`: lista de `tiendas/varman/pedidos` ordenada por fecha, badge de nuevos, detalle (cliente, ref+talla, pago, comprobante), y flujo de estados: `nuevo` / `pagado_por_verificar` → `verificado` → `enviado` → `entregado` (+ `cancelado`).
3. Visible para socios y vendedor (a diferencia de Caja); actualizar `app\reglas-firestore.txt` con las reglas nuevas (Cristhian las pega en la consola).
4. Recordatorio en la app: NO cruza catálogo (01-33) con inventario (VRM001-080) — decisión pendiente (`briefs\DECISION-CATALOGO-INVENTARIO.md`). Cristhian verifica stock a mano.
5. Al final: nota en LEEME de app con pasos de deploy (arrastrar `app\` a Cloudflare Pages, proyecto varmanapp).

**No hace:** tocar el bot, `web\`, ni reglas de colecciones que no use.

## AGENTE 3 — Tienda web (dueño de `web\`)
**Misión:** dejar la web lista para EL CORTE y el tráfico de pauta (16 jul).

1. **Preparar el cambio de número:** confirmar que `var WHATSAPP_NUMERO` es el ÚNICO punto donde vive el número en `publicar\index.html` (buscar duplicados en links wa.me, schema, footer). Dejar comentario `<!-- EL CORTE: cambiar aquí -->`.
2. Verificar fallback: si Firestore no responde, el catálogo fijo carga bien (probar bloqueando el dominio).
3. Conversión y velocidad: CTA de WhatsApp visible en móvil (sticky), lazy-load de las 73 fotos si falta, revisar meta tags OG con las URLs pages.dev actuales.
4. Confirmar que `/privacidad` sigue accesible (Meta la referencia — NO romperla).
5. Nota de deploy al final (arrastrar `web\publicar` a Cloudflare Pages, proyecto varmancrew).

**No hace:** cambiar el número todavía (eso es el 14 jul) · tocar `publicar\img\` · usar `generar-web.ps1`.

## AGENTE 4 — Migración Oracle (dueño de `deploy\`)
**Misión:** convertir la guía de 14 pasos (`deploy\GUIA-MIGRACION-ORACLE.md`) en migración de 1 hora para el día del corte.

1. Scripts automatizados de los pasos que lo permitan: instalación Docker en Ubuntu ARM (A1.Flex), `cloudflared` como servicio con **túnel nombrado** (URL fija — adiós al túnel temporal), import de workflows por CLI.
2. Probar `docker-compose.yml` LOCALMENTE con Docker Desktop en **puerto ≠5678** (no chocar con el n8n local) y usando `deploy\.env.example` con valores dummy — **jamás el `.env` real**.
3. `backup.sh` / `restore.sh` (workflows .json + .env cifrado) con cron diario.
4. `CHECKLIST-DIA-CORTE.md`: orden exacto migración + SIM + DNS del dominio (cuando se compre) en una sola pasada.

**No hace:** tocar el n8n local, `.env` real, `workflows\` (los lee, no los edita) · crear nada en Oracle todavía (la cuenta la abre Cristhian).

---

## Contratos entre agentes (congelados)
- **Esquema de pedido:** lo define el v4 (Agente 1). Agente 2 lo consume tal cual; cambios se piden por escrito en `briefs\CAMBIOS-PEDIDOS.md` y los aplica el Agente 1.
- **Campo `estado` del pedido:** valores acordados: `nuevo`, `pagado_por_verificar`, `verificado`, `enviado`, `entregado`, `cancelado`. El bot solo escribe los 2 primeros; la app gestiona el resto.
- **Número de WhatsApp en la web:** solo `var WHATSAPP_NUMERO`; nadie lo cambia hasta EL CORTE.

## Lo que SOLO Cristhian puede hacer hoy (desbloquea a los agentes)
1. **Iniciar la verificación del negocio en Meta** (RUT) — guía: `briefs\GUIA-VERIFICACION-NEGOCIO.md`. ⚠ NO tocar "Eliminar" junto al portafolio.
2. **Números/llaves reales de pago** → reemplazar `PAGO_NEQUI`/`PAGO_DAVIPLATA`/`PAGO_BREB` en `.env` (avisar al Agente 1 para reiniciar n8n).
3. **Fotos y precios reales** desde la pestaña Tienda de la app (bloquea pauta).
4. **Decidir:** ¿enlazar catálogo↔inventario? (`briefs\DECISION-CATALOGO-INVENTARIO.md`).
5. Activar pestaña Caja: pegar reglas de `app\reglas-firestore.txt` + subir `app\` a Cloudflare (se puede unificar con las reglas nuevas del Agente 2 en una sola pegada).

## Reglas que NO se negocian (resumen; detalle en BRIEF-NUEVA-SESION.md)
- NO actualizar n8n/pnpm en este PC (2 parches manuales).
- `.env`: conservar `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` y `NODE_FUNCTION_ALLOW_BUILTIN=crypto`.
- Token WhatsApp SOLO como header `Authorization: Bearer`.
- Import/activación de workflows por CLI con n8n APAGADO (lock SQLite).
- NO agregar casos de uso a la app Meta (no se pueden quitar).
- Webhooks tardan 30-60s en registrarse tras arrancar n8n (404 transitorio).

*Brief generado en Cowork el 2026-07-06. Al terminar, cada agente deja una nota corta de lo hecho en su carpeta y actualiza LEEME-BOT.txt solo si es el Agente 1.*
