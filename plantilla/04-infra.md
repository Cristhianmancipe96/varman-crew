# 04 — INFRA de producción (VM Google Cloud + Docker + Caddy, SIN túnel)

**Módulo del `PLAYBOOK-REPLICACION.md`. Capa documentada el 2026-07-06 (decisión: sin Oracle, sin túnel).**
Escrito para que otra sesión de Claude monte esta capa para un negocio nuevo sin conocer VarMan.

## Qué es esta capa

El servidor donde el bot (módulo 03) vive en producción 24/7. Durante el desarrollo
el bot corre en el PC del dueño con un túnel temporal de Cloudflare (URL que cambia
en cada reinicio); esta capa lo pasa a una VM gratuita con **dominio propio y fijo**,
de modo que la Callback URL de Meta se configura UNA sola vez y todo sobrevive
reinicios sin tocar nada.

```
Cliente WhatsApp → Meta Cloud API → https://bot.DOMINIO (Caddy, TLS Let's Encrypt)
                                        → n8n (Docker, puerto interno 5678)
```

**Stack:** VM e2-micro de Google Cloud (always free, 1 GB RAM + swap 2 GB, Ubuntu 24.04)
· Docker Compose (n8n versión FIJADA + Caddy) · IP estática (gratis asignada a la VM)
· registro A en Cloudflare en modo **DNS only (nube gris)** · backups cifrados con cron.
Costo: $0/mes (solo el dominio, ~US$5-12/año).

**Por qué así (decisiones heredables):**
- **Sin túnel en producción.** El túnel (temporal o nombrado) agrega una pieza más que
  se puede caer y otra cuenta que administrar. Con IP fija + Caddy, la cadena es
  DNS → VM y ya. El túnel queda SOLO para la fase de desarrollo en el PC.
- **Caddy y no nginx/certbot:** un archivo de 3 líneas, certificado Let's Encrypt
  automático y renovación sola. Cero mantenimiento.
- **Nube GRIS (DNS only) en Cloudflare:** con proxy naranja, Let's Encrypt no puede
  validar el dominio directo y Caddy falla. Plan B documentado: naranja + SSL Full
  strict con origin cert (solo si se necesita ocultar la IP).
- **n8n en Docker con versión FIJADA** (la misma probada en desarrollo): los
  workflows se importan sin sorpresas de migración, y actualizar es cambiar un
  número y `docker compose pull`. Esto además elimina la fragilidad de instalar
  n8n con npm/pnpm en Windows (parches manuales, hoisting — ver historia VarMan).
- **e2-micro siempre con swap de 2 GB:** 1 GB de RAM no alcanza para n8n en los picos.
  Si aun así queda corto, plan B barato: Hetzner CX22 (~US$4.5/mes) — mismo compose,
  solo cambia el proveedor.

## (a) Qué es GENÉRICO (sirve tal cual para otro negocio)

Todo el contenido de `bot_n8n\deploy\` de VarMan:

- **`docker-compose.yml`** — n8n (env_file `.env`, volumen persistente, healthcheck,
  puerto 5678 SOLO en 127.0.0.1) + Caddy (80/443, volúmenes para certificados),
  todo con `restart: unless-stopped`. Solo cambia la versión de n8n si se replica
  más adelante.
- **`Caddyfile`** — 3 líneas: dominio → `reverse_proxy n8n:5678`. Cambiar dominio y correo.
- **`gcp-configurar-red.sh`** — se corre en Cloud Shell: promueve la IP efímera a
  estática y abre TCP 80/443 con una regla etiquetada. Cambiar las variables del
  encabezado (proyecto/VM/zona).
- **`instalar-servidor.sh`** — prepara la VM (Docker oficial, swap automático si
  RAM < 2 GB, zona horaria, carpetas `~/varman-bot` y `~/backups-bot`). Idempotente.
- **`importar-workflows.sh`** — importa los workflows por CLI **con n8n detenido**
  (regla del lock de SQLite) y activa solo el workflow de producción.
- **`backup.sh` / `restore.sh`** — respaldo diario 3:00 am por cron: workflows
  exportados del n8n vivo + `.env` cifrado AES-256 (clave autogenerada que HAY QUE
  copiar al PC), rotación a 14. Restore descifra y re-importa.
- **`verificar-salud.sh`** — Docker, contenedores, /healthz local, HTTPS público,
  y el reto de Meta: 200 con token bueno y 403 con token malo.
- **`docker-compose.local-test.yml` + `probar-local.ps1`** — prueba de TODO el
  compose en el PC con Docker Desktop sin tocar nada real (puerto 5679, .env dummy).
- **El orden de montaje** (probado con VarMan, ~45 min):
  1. Cloud Shell: `gcp-configurar-red.sh` → anotar IP fija.
  2. Cloudflare: registro A `bot` → IP, **nube gris**.
  3. SSH del navegador: subir paquete tar.gz → `instalar-servidor.sh` → reabrir SSH.
  4. `docker compose up -d` → verificar certificado → **crear la cuenta admin de
     n8n DE INMEDIATO** (el editor queda público; el primero que entre es dueño).
  5. `importar-workflows.sh` → `backup.sh --instalar-cron` → `verificar-salud.sh`.
  6. `sudo reboot` de prueba: todo debe volver solo.
  7. Callback URL definitiva en Meta (una sola vez).

## (b) Qué es ESPECÍFICO del negocio (cambiar al replicar)

| Qué | VarMan | Al replicar |
|---|---|---|
| Proyecto GCP / cuenta | `varman-crew` / varmansneakersandclothes | proyecto del negocio nuevo |
| VM | `varman-bot`, e2-micro, us-central1-a | mismo tipo; us-*1 para el free tier |
| Dominio / subdominio | varmancrew.com / `bot.varmancrew.com` | dominio del negocio |
| Correo en el Caddyfile | varmansneakersandclothes@gmail.com | correo del negocio |
| `.env` de producción | `credenciales\.env.produccion-gcp` | regenerar con los IDs/tokens del negocio (plantilla: `deploy\.env.example`) |
| Paquete para subir | `credenciales\varman-bot-vm.tar.gz` | rearmar: compose + Caddyfile + scripts + workflows + `.env` real |

## Gotchas aprendidos (no repetir)

- **El Phone Number ID cambia** al registrar el número real con SIM: regenerar el
  `.env` de producción ANTES de armar el paquete de la VM.
- **La nube naranja rompe la emisión del certificado.** Gris primero; naranja
  después solo si hace falta y con Full strict.
- **La CLI de n8n jamás con el n8n principal corriendo** (lock de SQLite):
  import/activar siempre vía los scripts, que lo detienen y lo levantan.
- **La clave de backup se imprime UNA vez** (primera corrida de `backup.sh`):
  copiarla al PC en ese momento (`credenciales\clave-backup-vm.txt`) o los
  respaldos serán irrecuperables.
- **El editor de n8n queda público en el dominio:** crear la cuenta de
  administrador inmediatamente después del primer `docker compose up -d`.
- **Los .sh deben ir con terminaciones LF** (los de `deploy\` ya lo están; si se
  editan en Windows, verificar).
- **Secretos fuera de git:** el `.env` real y el tar.gz viven en `credenciales\`
  (carpeta ignorada). El token de Meta nunca va en código ni en la web.
