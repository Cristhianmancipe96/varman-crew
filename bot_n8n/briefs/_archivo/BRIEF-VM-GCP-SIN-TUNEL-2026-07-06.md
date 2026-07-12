# BRIEF Claude Code — n8n en la VM de Google Cloud, SIN túnel · 6 jul 2026

## Contexto (lo nuevo de hoy, decidido con Cowork/PM)

- **Cristhian eliminó el túnel de Cloudflare del plan** (ni temporal ni nombrado). El bot vivirá en la VM con dominio directo.
- **El número REAL ya está registrado en Cloud API y probado** (envío de texto confirmado con el token permanente):
  - Phone Number ID REAL: `1129717360235397` (reemplaza al `1222323670963330` del número de prueba)
  - WABA NUEVA: `1572485474895736` (el asistente de Meta la creó aparte; usuario del sistema "VarMan Bot" ya tiene control total y webhooks suscritos. La WABA vieja `2484088882063635` queda solo con el número de prueba.)
  - Credenciales al día en `credenciales\credenciales_bot_whatsapp_PRIVADO.txt`.
- La app de Meta sigue en modo desarrollo (verificación del negocio en revisión). El envío saliente ya funciona; los webhooks entrantes completos llegan al publicar la app (eso NO bloquea este trabajo).
- VM ya creada: **varman-bot**, e2-micro (always free), us-central1-a, Ubuntu 24.04 LTS x86, disco 30GB. Proyecto GCP: varman-crew (cuenta varmansneakersandclothes).
- Dominio en Cloudflare: **varmancrew.com**. Subdominio a usar: **bot.varmancrew.com**.

## Objetivo

n8n productivo en la VM, accesible en `https://bot.varmancrew.com`, sin túneles, sobreviviendo reinicios, con el workflow v4.1 activo y listo para que la Callback URL de Meta se configure UNA sola vez (la definitiva).

## Arquitectura pedida

```
Cliente WhatsApp → Meta Cloud API → https://bot.varmancrew.com (Caddy, TLS Let's Encrypt)
                                        → n8n (Docker, puerto interno 5678)
```

- **DNS:** registro A `bot` → IP estática de la VM, **DNS only (nube gris)** para que Caddy emita el certificado Let's Encrypt sin fricción. (Alternativa B si hubiera problema: proxy naranja + Full strict con origin cert — solo si A falla.)
- **Caddy** como reverse proxy en la VM (contenedor en el mismo docker-compose), HTTPS automático.

## Tareas

1. **GCP (con gcloud o guiando a Cristhian en consola):**
   - Promover la IP efímera de varman-bot a **IP estática** (gratis mientras esté asignada a la VM).
   - Reglas de firewall: permitir TCP 80 y 443 (SSH ya está).
2. **Adaptar `deploy\`** (los scripts del Agente 4 eran para Oracle):
   - `instalar-servidor.sh` sirve casi igual (usar `--swap`: la VM tiene 1GB de RAM → swap de 2GB).
   - `docker-compose.yml`: quitar cloudflared, agregar servicio caddy (Caddyfile: `bot.varmancrew.com { reverse_proxy n8n:5678 }`), `restart: unless-stopped` en todo.
   - `.env` de producción: `WHATSAPP_PHONE_NUMBER_ID=1129717360235397`, token permanente, `WEBHOOK_VERIFY_TOKEN` (el mismo), `FIREBASE_SA_B64`, `GEMINI_*`, `PAGO_*` (confirmar con Cristhian que ya sean los reales), `N8N_HOST=bot.varmancrew.com`, `WEBHOOK_URL=https://bot.varmancrew.com/`, `N8N_PROTOCOL=http` (TLS lo termina Caddy), y las flags conocidas: `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`, `NODE_FUNCTION_ALLOW_BUILTIN=crypto`.
3. **Importar workflows** con `importar-workflows.sh` (SIEMPRE con n8n detenido — lock SQLite). El JSON `workflows\bot-whatsapp-v4-pedidos.json` del repo YA es la versión buena (v4.1 + textos parametrizados). Activar v4.1; el eco ya no hace falta en producción.
4. **Backups:** `backup.sh --instalar-cron` y copiar la clave a `credenciales\clave-backup-oracle.txt` (renombrar mención de Oracle si se quiere).
5. **Prueba de salud:** desde internet, GET del webhook con el challenge → debe responder 200 con token bueno y 403 con token malo.
6. **Actualizar** `GUIA-MIGRACION-ORACLE.md`/`CHECKLIST-DIA-CORTE.md` → versión GCP sin túnel (o crear `GUIA-GCP.md` y marcar las viejas como obsoletas). Documentar en `plantilla\04-infra.md` (módulo pendiente del playbook).

## Lo que hace Cristhian con Cowork (NO Claude Code)

- Crear el registro A en Cloudflare (necesita la IP estática del paso 1 — dejarla anotada).
- Configurar la Callback URL definitiva en Meta (`briefs\GUIA-META-CALLBACK.md`; App ID correcto: 2168913153950288) apuntando a `https://bot.varmancrew.com/webhook/...` con el verify token.
- Publicar la app cuando Meta apruebe la verificación → prueba E2E real.

## Reglas intactas

- La SIM del 304 jamás se registra en la app de WhatsApp (ya está en Cloud API — no tocar).
- Credenciales nunca a git/Netlify.
- El número público de la web/bios se cambia SOLO el día de EL CORTE, cuando el bot pase la E2E.
- RAM 1GB: si n8n se queda corto incluso con swap, plan B Hetzner CX22 (~US$4.5/mes) — avisar antes de mover nada.

## Criterio de éxito

`https://bot.varmancrew.com` responde el challenge de Meta correctamente, v4.1 activo, backups programados, y todo vuelve solo tras un `sudo reboot` de la VM.
