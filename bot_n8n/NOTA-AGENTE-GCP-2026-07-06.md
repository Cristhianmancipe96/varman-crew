# Nota del agente — VM GCP sin túnel · 2026-07-06

**Brief ejecutado:** `briefs\BRIEF-VM-GCP-SIN-TUNEL-2026-07-06.md`
(bot a la VM varman-bot de Google Cloud con dominio directo `bot.varmancrew.com`, sin túnel).

## Hecho hoy

1. **`deploy\gcp-configurar-red.sh` (NUEVO)** — se corre en **Cloud Shell** (no en la VM,
   no en el PC: aquí no hay gcloud). Promueve la IP efímera de varman-bot a estática
   (`varman-bot-ip`) y abre TCP 80/443 (regla `varman-bot-permitir-web` + etiqueta en
   la VM). Idempotente. Termina imprimiendo la IP fija para el registro A.
2. **`deploy\docker-compose.yml` adaptado** — fuera cloudflared, entra **caddy**
   (`caddy:2`, puertos 80/443, volúmenes para certificados) + **`deploy\Caddyfile`**
   (NUEVO: `bot.varmancrew.com { reverse_proxy n8n:5678 }`). n8n con `N8N_HOST`,
   `N8N_PROTOCOL=http` (TLS lo termina Caddy), `N8N_PROXY_HOPS=1`, `restart:
   unless-stopped` en todo.
3. **`credenciales\.env.produccion-gcp` (NUEVO)** — el .env REAL de la VM: Phone
   Number ID **1129717360235397** (número real), WABA nueva **1572485474895736**,
   token permanente, verify token, `FIREBASE_SA_B64` (copiado programáticamente del
   .env local, sin transcripción manual), Gemini, pagos reales (Nequi/Daviplata
   3002762786, Bre-B @CJM125), `WEBHOOK_URL=https://bot.varmancrew.com/` y las flags
   `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` + `NODE_FUNCTION_ALLOW_BUILTIN=crypto`.
4. **Scripts adaptados a GCP** (`instalar-servidor.sh`, `importar-workflows.sh`,
   `backup.sh`, `restore.sh`, `verificar-salud.sh`): rutas `$HOME` en vez de
   `/home/ubuntu` (en GCP el usuario NO es "ubuntu"), swap 2 GB automático si
   RAM < 2 GB, clave de backup ahora `credenciales\clave-backup-vm.txt`, y el chequeo
   de salud prueba el challenge de Meta por HTTPS público: **200 token bueno, 403
   token malo** (el criterio del brief). Sintaxis bash y terminaciones LF verificadas.
5. **`credenciales\varman-bot-vm.tar.gz` (NUEVO)** — paquete único para subir a la VM
   con el botón "Subir archivo" del SSH del navegador: compose + Caddyfile + scripts +
   los 4 workflows + el `.env` real. Extrae directo a `~/varman-bot`. Vive en
   `credenciales\` porque lleva secretos.
6. **`deploy\GUIA-GCP.md` (NUEVA, la vigente)** — 9 pasos copy-paste: Cloud Shell →
   registro A (nube GRIS) → instalar VM → arrancar + **crear cuenta admin de n8n de
   inmediato** → importar workflows (v4.1 activo) → backups+cron → salud → prueba de
   reinicio → Callback definitiva en Meta. Con tabla de problemas frecuentes.
   `GUIA-MIGRACION-ORACLE.md` y `CHECKLIST-DIA-CORTE.md` quedaron marcadas OBSOLETAS
   con banner. `probar-local.ps1` y `docker-compose.local-test.yml` actualizados a
   caddy (la prueba local sigue pendiente de Docker Desktop, igual que antes).
7. **`plantilla\04-infra.md` (NUEVO)** — el módulo de infra del playbook (genérico vs
   específico + gotchas). `PLAYBOOK-REPLICACION.md` actualizado (Oracle → GCP).
8. **Prueba local con Docker Desktop EJECUTADA (por fin — el Agente 4 no tenía
   Docker):** `probar-local.ps1` encontró un **BUG REAL heredado** en los scripts:
   `docker compose run ... n8n n8n import:workflow` fallaba con `Error: Command
   "n8n" not found`, porque el entrypoint de la imagen ya antepone el binario
   (`exec n8n "$@"`) y el `n8n` extra se vuelve un subcomando inválido. Se corrigió
   en `importar-workflows.sh` (función `cli`), `restore.sh` (3 llamadas `docker
   run`) y `probar-local.ps1` — habría roto la importación de workflows EN LA VM.
   OJO: `docker compose exec ... n8n n8n list:workflow` sí lleva el doble n8n
   (exec no pasa por el entrypoint); backup.sh queda bien como está. También se
   arregló `probar-local.ps1`: quedó en UTF-8 CON BOM (trampa #1 del proyecto: sin
   BOM el mojibake de un guión largo ROMPÍA el parseo del final del script) y la
   limpieza ya no aborta por el stderr de docker. Tras los fixes, la prueba
   completa pasó: n8n 2.28.6 sano, v4 importado y activado por CLI, webhook
   devolvió el reto de Meta. **El tar.gz de credenciales\ ya quedó reconstruido
   con los scripts corregidos.**

## Lo que sigue (Cristhian con Cowork)

1. Correr `gcp-configurar-red.sh` en Cloud Shell → **anotar la IP fija**.
2. Registro A en Cloudflare: `bot` → esa IP, **DNS only (nube GRIS)**.
3. Seguir `GUIA-GCP.md` pasos 3-8 en el SSH del navegador (subir el tar.gz, todo copy-paste).
4. Callback URL definitiva en Meta (`https://bot.varmancrew.com/webhook/whatsapp` +
   verify token; App ID 2168913153950288, guía `briefs\GUIA-META-CALLBACK.md`).
5. Publicar la app cuando Meta apruebe la verificación → E2E real → EL CORTE.

## No tocado (reglas intactas)

- n8n local del PC y su túnel siguen como están (el bot de desarrollo no se cayó).
- La SIM del 304 no se registra en la app de WhatsApp; el número público de web/bios
  no se cambia hasta EL CORTE.
- Nada de credenciales fue a git: todo lo sensible quedó en `credenciales\`.
- Si la e2-micro (1 GB) se queda corta incluso con swap: plan B Hetzner CX22
  (~US$4.5/mes) — avisar antes de mover nada.
