# BRIEF — Nueva sesión · Bot WhatsApp VarMan Crew
**Actualizado: 2026-07-05 (noche). Lee esto ANTES de tocar nada.**

## Qué es esto
Bot de ventas por WhatsApp para VarMan Crew (marca colombiana de calzado) con
n8n + WhatsApp Cloud API + Gemini + Firestore. Todo vive en:
`C:\Users\cmanc\OneDrive\Escritorio\Proyecto_zapatos\bot_n8n\`
El estado COMPLETO y las instrucciones operativas están en `LEEME-BOT.txt`
(leerlo es obligatorio). El plan original: `BRIEF_ClaudeCode_bot_n8n.md`.

## Estado en una pantalla
- **n8n 2.28.6 local** (localhost:5678, cuenta dueño creada) + **túnel Cloudflare
  temporal** (URL en `tunnel-url.txt`; CAMBIA en cada reinicio → hay que actualizar
  la Callback URL en Meta). Arranque tras reinicio: `start-tunnel.ps1` PRIMERO,
  luego `start-n8n.ps1`.
- **Workflow activo en n8n:** el ECO (`VarmanEcoBot0001`). Webhook verificado con
  Meta, campo `messages` suscrito, tubo probado de punta a punta.
- **`workflows\bot-whatsapp-v4-pedidos.json` = EL BOT COMPLETO Fase 1** (catálogo
  interactivo + Gemini + pedido completo con pago y comprobante + pedidos en
  Firestore + avisos al 320 + handoff). Probado offline contra Firestore real.
  IMPORTADO a n8n el 2026-07-05 (id VarmanBotV4Ped01, INACTIVO; el eco sigue
  activo). Se activa cuando la app de Meta esté publicada (pasos en LEEME-BOT.txt).
- **Bloqueo actual:** la app Meta "VarMan Crew" (ID 2168913152950288) está en modo
  Desarrollo → los mensajes reales NO entran. Para publicar solo falta la
  **VERIFICACIÓN DEL NEGOCIO** (portafolio "VarMan Sneakers and Clothes",
  id 166545813059032). Todo lo demás ya está (ícono, privacidad, datos, categoría).
- **Agentes en paralelo (2026-07-05, AMBOS TERMINADOS):**
  (a) Migración Oracle/Docker en `deploy\` (guía 14 pasos; requiere comprar
  dominio ~US$5-11/año, único costo del stack; NO copiar la base SQLite —
  la migración es importar los .json + .env).
  (b) Fase 2 Messenger+IG en `fase2\BRIEF-MESSENGER-INSTAGRAM.md`: IG DMs
  necesita App Review (2-4 semanas, exige screencast del bot); Messenger quizá
  no para página propia (probar día 1); token nuevo = Page Access Token con el
  mismo system user; diseño "un cerebro, tres canales" confirmado (~4 nodos
  nuevos; en Messenger/IG el catálogo puede ir en carrusel CON fotos).

## Pendientes de HOY (en orden)
1. **Usuario:** iniciar verificación del negocio en Meta (RUT o cámara de comercio).
   Página "Publicar" → "Iniciar verificación". ⚠ NUNCA tocar el botón "Eliminar"
   junto al portafolio (desconecta el negocio de la app).
2. **Usuario:** conseguir números/llaves reales de pago → reemplazar en `.env` los
   `PAGO_NEQUI` / `PAGO_DAVIPLATA` / `PAGO_BREB` (hoy dicen PENDIENTE).
3. ~~**Claude:** importar v4 a n8n~~ HECHO 2026-07-05 (importado inactivo,
   n8n reiniciado y webhook verificado). OJO: cuando el .env tenga los PAGO_*
   reales, reiniciar n8n de nuevo para que los recoja.
   Guías nuevas en briefs\: GUIA-META-CALLBACK.md (actualizar Callback URL),
   GUIA-VERIFICACION-NEGOCIO.md (pendiente 1) y
   DECISION-CATALOGO-INVENTARIO.md (pendiente 4).
4. **Preguntar al usuario:** ¿enlazar catálogo (refs 01-33) con inventario
   (VRM001-080) para stock real por talla? Fase 1 NO los cruza (regla: no adivinar
   equivalencias entre zapatos). Hoy el pedido guarda ref+talla y él verifica a mano.
5. Cuando Meta apruebe: publicar app → activar v4 → probar compra real end-to-end.

## Reglas que NO se negocian (aprendidas a golpes)
- **NO actualizar n8n ni pnpm en este PC** (instalación con 2 parches manuales;
  se rompe con cualquier `pnpm add/update -g`). Detalles en LEEME-BOT.txt.
- `.env` debe conservar `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` y
  `NODE_FUNCTION_ALLOW_BUILTIN=crypto` (sin eso los nodos Code fallan).
- El token de WhatsApp SOLO funciona como header `Authorization: Bearer` (como
  `?access_token=` da error 190).
- Los webhooks de n8n tardan ~30-60s en registrarse tras arrancar (404 transitorio).
- Importar/activar workflows por CLI SIEMPRE con n8n apagado (lock SQLite).
- Los casos de uso de la app Meta NO se pueden quitar → NO agregar ninguno nuevo
  (Messenger/IG van en Fase 2, DESPUÉS de publicar).
- Si hay OTRA sesión de Claude trabajando en paralelo: cada una es dueña exclusiva
  de sus carpetas; n8n, `.env` y `workflows\` los toca UNA SOLA sesión. Antes de
  borrar/mover, re-verificar con ls (OneDrive + sesiones paralelas ya causaron
  pérdidas el 2026-07-01/02).
- Credenciales: `.env` y `credenciales\` son privados; nunca a git/deploys.

## Contexto de negocio
- Dueños: Cristhian (técnico, c.mancipe.96@gmail.com, WhatsApp 573202250619) y
  socio. Cuenta n8n/negocio: varmansneakersandclothes@gmail.com.
- Número de prueba Meta: +1 555-612-3421 (env vars en `.env`). El Phone Number ID
  CAMBIA cuando se registre el número real (corte ~14 jul, con migración a Oracle).
- Catálogo público: 33 refs (deportivas 12 / casuales 8 / urbanas 13), precios
  $235.000-$480.000, lectura REST pública. Inventario: 80 refs (privado, el bot
  accede como admin con FIREBASE_SA_B64 del .env).
