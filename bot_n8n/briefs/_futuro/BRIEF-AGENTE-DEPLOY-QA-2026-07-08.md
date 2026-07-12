# BRIEF — Agente DEPLOY / QA · VarMan Crew · 2026-07-08

> **Para Claude Code.** Trabajas en paralelo con el Agente WEB y el Agente V6/FASE2.
> **Tu territorio exclusivo:** carpeta nueva `tools/` (créala) para scripts, y `bot_n8n/deploy/`
> para el runbook del deploy v5. **NO edites** el contenido de `web/publicar/*.html` (es del
> Agente WEB) ni `app/app.jsx` ni los workflows productivos. Tú **automatizas y verificas**, no
> cambias funcionalidad.

## Objetivo
Convertir el deploy de la v5 (hoy manual: arrastrar carpetas a Cloudflare + pasos en la VM) en
algo **repetible y verificable en 1 comando**, y crear un **smoke test** que confirme, tras
cada deploy, que todo el sistema respira. Esto reduce el riesgo de los pasos 1–4 del
`PASO-A-PASO-IMPLEMENTAR-V5.md` y sirve para siempre.

## Contexto (estado real 8 jul 2026)
- **v5 construida y probada OFFLINE (79/79 PASS)**, aún NO desplegada a la VM. El bot v4.1
  sigue vivo en producción (VM `varman-bot`, GCP e2-micro, `us-central1-a`, IP `136.114.253.74`,
  DNS `bot.varmancrew.com`, Callback verificado en Meta).
- Deploy de front hoy: arrastrar `app/` → Cloudflare Pages proyecto **varmanapp**; arrastrar
  `web/publicar/` → proyecto **varmancrew**. Queremos lo mismo con **wrangler CLI**.
- Deploy del bot v5 a la VM: runbook en `PASO-A-PASO-IMPLEMENTAR-V5.md` PASO 3 (backup →
  `importar-workflows.sh` → `verificar-salud.sh` 7/7 → pruebas). Los scripts ya existen en la VM.
- Firestore proyecto **varman-crew**; colecciones clave: `tiendas/varman/catalogo`,
  `catalogoFotos`, `pedidos`, `mapaCatalogo`, `proveedores`, `listaEspera`,
  `notificacionesPendientes`, `botErrores`.

## 🔴 Reglas de oro
- **No promuevas la web a producción con el número del bot** hasta el visto bueno del dueño
  (misma razón que el Agente WEB: el 304 no recibe público hasta que Meta apruebe). Tus scripts
  deben permitir deploy a **preview** por defecto y exigir un flag explícito (`--prod`) para
  producción.
- **No toques la VM de producción sin backup.** Todo comando destructivo va precedido de
  `backup.sh --completo` y con rollback documentado (1 comando).
- Credenciales (tokens, `.env`, service account) **jamás** a git. Usa variables de entorno /
  `wrangler secret`.

## Tareas
1. **`tools/deploy.sh` (o `.ps1` + `.sh`):** deploy de `app/` y `web/publicar/` a Cloudflare
   Pages con **wrangler** (`wrangler pages deploy`). Parámetros: qué proyecto (`app|web|both`) y
   `--preview` (default) / `--prod`. Que imprima la URL resultante. Documenta cómo autenticar
   wrangler (`CLOUDFLARE_API_TOKEN` con permiso Pages:Edit) sin hardcodear el token.
2. **`tools/smoke-test.mjs` (Node, sin dependencias pesadas):** tras un deploy, verifica en
   orden y con salida clara PASS/FAIL:
   - Web: `GET` a la URL → 200 y que el HTML contenga el `WHATSAPP_NUMERO` esperado
     (parametrizable: en preview debe ser el 304; producción hasta el corte, el 320).
   - App: `GET` a la URL de la app → 200 y que cargue `app.jsx`.
   - Imágenes del catálogo que usa el bot: 5 URLs `https://varmancrew.pages.dev/img/pNNN.jpg`
     → 200 `image/*` (esto valida las fotos del bot v5).
   - Bot: `GET https://bot.varmancrew.com/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=<TOKEN>&hub.challenge=123`
     → responde `123` con token bueno y **403** con token malo (challenge de Meta). El token
     sale de env, no del código.
   - (Opcional) Reachability de Firestore REST con la service account (solo lectura de 1 doc).
3. **`bot_n8n/deploy/RUNBOOK-DEPLOY-V5-2026-07-08.md`:** consolida el PASO-A-PASO v5 en un
   runbook copy-paste para Cloud Shell (subir workflow → `backup.sh --completo` →
   `importar-workflows.sh` → esperar 1 min → `verificar-salud.sh` 7/7 → pruebas funcionales),
   con el rollback exacto (`restore.sh` o reimportar `...v4.1-pre-v5...json`). No ejecutes en la
   VM tú; deja el runbook probado en seco (lint de los comandos, rutas correctas).
4. **`README` corto en `tools/`** explicando cómo correr todo y los prerrequisitos.

## Verificación
- `smoke-test.mjs` corre y da verde contra la web/app/bot ACTUALES (v4.1 en prod): debe pasar
  hoy mismo apuntado a las URLs vivas (con el token bueno del challenge).
- `deploy.sh --preview` genera una URL de preview real y el smoke test pasa contra ella.
- El runbook v5 no tiene rutas rotas ni pasos que exijan permisos que la VM no tenga.

## Entregable
- `tools/deploy.sh`, `tools/smoke-test.mjs`, `tools/README.md`,
  `bot_n8n/deploy/RUNBOOK-DEPLOY-V5-2026-07-08.md`, y
  `bot_n8n/NOTA-AGENTE-DEPLOY-QA-2026-07-08.md` con resultados del smoke test (pegando la salida).
- Si algo es replicable, anótalo en `plantilla/04-infra.md` (créalo si no existe).

## Reglas del proyecto
- OneDrive: check verde antes de subir/leer grande.
- No romper producción; backup + rollback siempre.
