# RUNBOOK — EL CORTE (~14 jul 2026) · Bot WhatsApp VarMan Crew

> **⚠ ACTUALIZACIÓN 2026-07-06 (tarde) — el plan cambió, varios pasos YA están hechos:**
> - **Paso 1 HECHO:** el número real ya está registrado en Cloud API
>   (Phone Number ID `1129717360235397`, WABA nueva `1572485474895736`).
> - **Paso 2 HECHO** para producción: el `.env` de la VM ya está armado con todo
>   real (incl. `PAGO_*`): `credenciales\.env.produccion-gcp`.
> - **Pasos 0(B), 3 y 4 CAMBIAN:** ya NO hay Oracle NI túnel. Producción = VM de
>   Google Cloud con dominio fijo `bot.varmancrew.com` → montarla ANTES del corte
>   con **`deploy\GUIA-GCP.md`** (incluye importar/activar v4.1 y la Callback
>   definitiva, que se configura UNA sola vez).
> - **Siguen vigentes tal cual:** paso 0 (app publicada, SIM sin WhatsApp normal),
>   paso 5 (prueba E2E), paso 6 (cambiar número en web/redes) y paso 7 (cierre).
> - Rollback: igual que abajo, pero los comandos de workflows se corren en la VM
>   con `docker compose` (ver scripts de `deploy\`).

**Checklist exacto para pasar del eco de prueba al bot v4.1 en producción con el
número real.** Escrito por el Agente 1 el 2026-07-06. Hacer los pasos EN ORDEN
y marcar cada casilla. Tiempo estimado: 1-2 horas (sin contar esperas de Meta).

---

## 0 · Requisitos previos (verificar ANTES de empezar — si falta uno, NO cortar)

- [ ] App Meta "VarMan Crew" **PUBLICADA** (verificación del negocio aprobada).
- [ ] `.env`: `PAGO_NEQUI` / `PAGO_DAVIPLATA` / `PAGO_BREB` con los datos
      REALES (hoy dicen PENDIENTE — el bot se los muestra al cliente tal cual).
- [ ] SIM del número comercial a la mano, con señal, y ese número **NO** debe
      tener cuenta activa de WhatsApp normal ni Business App (si la tiene:
      abrir WhatsApp → Ajustes → Cuenta → Eliminar cuenta, y esperar ~5 min).
- [ ] Fotos y precios reales cargados en el catálogo (bloquea pauta, no el corte).
- [ ] Decidir dónde correrá n8n ese día: **(A) este PC** o **(B) Oracle** (si la
      migración del Agente 4 ya está lista, hacer primero su
      `deploy\CHECKLIST-DIA-CORTE.md` y luego volver aquí — los pasos 3-6 son
      los mismos, ejecutados en el servidor).

## 1 · Registrar la SIM (número real) en WhatsApp Cloud API

- [ ] developers.facebook.com → app VarMan Crew → WhatsApp → **Configuración de
      la API** → "Agregar número de teléfono".
- [ ] Nombre para mostrar: *VarMan Crew* · categoría comercio · verificar por
      SMS con la SIM.
- [ ] Copiar el **Phone Number ID NUEVO** que aparece al seleccionar el número
      recién agregado (el viejo `1222323670963330` era del número de prueba).
- [ ] ⚠ NO tocar "Eliminar" junto al portafolio ni agregar casos de uso nuevos.

## 2 · Actualizar `.env`

- [ ] `WHATSAPP_PHONE_NUMBER_ID=` ← el ID nuevo del paso 1.
- [ ] Confirmar que siguen intactos: `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`,
      `NODE_FUNCTION_ALLOW_BUILTIN=crypto`, `FIREBASE_SA_B64`, `GEMINI_*`,
      `WEBHOOK_VERIFY_TOKEN`, `PAGO_*` reales.
- [ ] Si el token `WHATSAPP_TOKEN` es temporal, generar uno permanente del
      system user y reemplazarlo. Recordar: SOLO funciona como header
      `Authorization: Bearer` (como `?access_token=` da error 190).

## 3 · Apagar eco + activar v4.1 (CLI, SIEMPRE con n8n APAGADO — lock SQLite)

⚠ La copia de v4 importada en n8n el 05-jul quedó VIEJA: el 06-jul el Agente 1
le agregó descarga de comprobantes, comandos admin y hardening al JSON de
`workflows\`. **Hay que RE-IMPORTAR antes de activar.**

- [ ] Cerrar la ventana de n8n (o matar sus procesos node).
- [ ] En PowerShell, en la carpeta `bot_n8n\` (cargar el .env como hace
      start-n8n.ps1, o correr los comandos con las mismas env vars):
  ```
  n8n import:workflow --input=".\workflows\bot-whatsapp-v4-pedidos.json"
  n8n update:workflow --id=VarmanEcoBot0001 --active=false
  n8n update:workflow --id=VarmanBotV4Ped01 --active=true
  ```
  (mismo id `VarmanBotV4Ped01` → el import ACTUALIZA el workflow existente)
- [ ] Arrancar: `start-tunnel.ps1` PRIMERO, después `start-n8n.ps1`.
      En Oracle: el túnel nombrado del Agente 4 ya da URL fija.
- [ ] Esperar **30-60 segundos** (los webhooks tardan en registrarse; un 404
      inicial es normal).

## 4 · Callback URL en Meta

- [ ] Si la URL del túnel cambió (túnel temporal local) o se migró a Oracle:
      actualizar Callback URL + verify token según `briefs\GUIA-META-CALLBACK.md`
      y darle "Verificar y guardar" (debe responder 200).
- [ ] Confirmar campo **messages** suscrito en Webhooks.
- [ ] En "Configuración de la API": seleccionar el número NUEVO como remitente.

## 5 · Prueba E2E (con un celular que NO sea el 320)

- [ ] "hola" → llega la lista de categorías.
- [ ] Categoría → modelo → talla → datos → botón Nequi → muestra el número real.
- [ ] Enviar una FOTO cualquiera como comprobante →
  - [ ] llega "¡Pedido recibido! 🎉" al cliente,
  - [ ] llega el aviso "🛒 NUEVO PEDIDO" al 320 con "📎 Comprobante guardado",
  - [ ] el pedido aparece en la pestaña Pedidos de la app CON la imagen visible
        (esto valida la descarga REAL de media, que offline solo se probó con mock).
- [ ] Desde el 320: escribir `pedidos` → lista el pedido de prueba.
- [ ] Desde el 320: `pausar` → desde el otro celular escribir algo → responde
      "ya te escribimos" → desde el 320: `activar`.
- [ ] Marcar el pedido de prueba como `cancelado` en la app.

## 6 · Cambio de número en la web y redes

- [ ] `web\publicar\index.html`: cambiar `var WHATSAPP_NUMERO` al número real
      (buscar el comentario `<!-- EL CORTE: cambiar aquí -->` que dejó el
      Agente 3) y arrastrar `web\publicar` a Cloudflare Pages (proyecto
      varmancrew).
- [ ] Probar el botón de WhatsApp de la web desde un celular.
- [ ] Actualizar bios/links de Instagram, Facebook y demás redes al wa.me nuevo.
- [ ] Confirmar que `varmancrew.pages.dev/privacidad` sigue viva (Meta la referencia).

## 7 · Cierre

- [ ] Dejar corriendo 24h y revisar `tiendas/varman/botErrores` en la consola
      de Firebase (o pedirle a Claude que la lea) al día siguiente.
- [ ] Anotar en `LEEME-BOT.txt` la fecha del corte, el Phone Number ID nuevo y
      dónde quedó corriendo n8n (PC u Oracle).

## Si algo sale mal (rollback)

1. Desde el 320: `pausar` (el bot responde "ya te escribimos" y Cristhian
   atiende a mano — los mensajes siguen llegando al webhook).
2. Rollback total: con n8n apagado,
   `n8n update:workflow --id=VarmanBotV4Ped01 --active=false` y
   `n8n update:workflow --id=VarmanEcoBot0001 --active=true` (o dejar TODO
   inactivo y atender 100% a mano; los clientes escriben al número real igual).
3. El JSON anterior del v4 está en `workflows\respaldo\bot-whatsapp-v4-pedidos.2026-07-06.json`.
