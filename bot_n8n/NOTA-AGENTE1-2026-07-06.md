# Nota del AGENTE 1 · 2026-07-06 (brief de 4 agentes)

**Misión: dejar el v4 listo para producción mientras Meta aprueba. HECHO — las
5 tareas del brief, probadas 32/32 offline contra Firestore real.**

## Qué cambió (bot v4 → v4.1, mismo id `VarmanBotV4Ped01`)

1. **Descarga de comprobantes:** al llegar la foto, el bot baja la imagen de
   Graph API (GET media → URL → download con Bearer) y la guarda en Firestore
   `tiendas/varman/comprobantes/{idPedido}` (b64 + mime; colección aparte para
   no inflar la lista de pedidos). El pedido lleva `comprobante_guardado`.
   Decisión documentada en `briefs\CAMBIOS-PEDIDOS.md` (carpeta local
   descartada: los nodos Code solo pueden usar `crypto`, no `fs`, y un archivo
   local moriría en la migración a Oracle). Si la descarga falla, el pedido se
   crea igual con el media_id y el error queda en `botErrores`.
2. **Comandos admin desde el 320** (`OWNER_WHATSAPP`): `pedidos` (últimos 5
   pendientes), `pausar` / `activar` (mantenimiento: a los clientes les responde
   "ya te escribimos"), `admin` (ayuda). Cualquier otro mensaje del 320 pasa por
   el flujo normal de cliente (para poder probar el bot).
3. **Hardening:** reintento 1x en Graph API (envíos vía retryOnFail del nodo
   HTTP + descarga de media en código); si el envío falla igual, nodo nuevo
   "Log error envio" lo registra en `tiendas/varman/botErrores` sin tumbar el
   workflow; try/catch global en el Cerebro (log + respuesta amable al cliente);
   barrido diario 3:15am de sesiones caducadas >24h (Schedule Trigger nuevo,
   complementa la limpieza al vuelo, que quedó validada en pruebas).
4. **`estado` del pedido corregido** a `pagado_por_verificar` (contrato del
   brief; antes escribía "pagado (por verificar)"). Respondido al Agente 2 en
   `briefs\CAMBIOS-PEDIDOS.md`.
5. **`briefs\RUNBOOK-CORTE.md`**: checklist completo del 14 jul (SIM, Phone
   Number ID, re-import, eco→v4, Callback URL, E2E, web/bios, rollback).

## Estructura nueva en workflows\

- `src\cerebro-v4.js`, `src\log-error-envio.js`, `src\limpiar-sesiones.js` —
  código legible de los nodos Code. **Editar ahí, no en el JSON.**
- `build-v4-pedidos.js` — regenera el JSON: `node workflows\build-v4-pedidos.js`
- `respaldo\bot-whatsapp-v4-pedidos.2026-07-06.json` — el v4 anterior.
- `tests\test-offline-v4.js` — pruebas offline (WhatsApp mockeado, Firestore
  real, limpia sus propios docs): `node tests\test-offline-v4.js` → 32 PASS.

## ⚠ Pendiente clave

- **La copia importada en n8n el 05-jul quedó VIEJA.** No re-importé hoy porque
  n8n estaba corriendo (regla: import solo con n8n apagado) y el v4 sigue
  inactivo. El re-import es el paso 3 del RUNBOOK — no saltárselo.
- La descarga REAL de media queda por validar en el E2E del corte (offline se
  probó con mock; el flujo de fallo también está cubierto).
- No toqué: n8n vivo, `.env`, `deploy\`, `app\`, `web\`, `fase2\`.
