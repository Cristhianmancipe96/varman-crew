# GUÍA — Bot WhatsApp VarMan en la VM de Google Cloud (SIN túnel)

**Fecha:** 6 de julio de 2026 · **Reemplaza a** `GUIA-MIGRACION-ORACLE.md` y `CHECKLIST-DIA-CORTE.md` (quedaron obsoletas: ya no hay Oracle ni túnel de Cloudflare).
**Quién la ejecuta:** Cristhian, copiando y pegando. Cowork acompaña los pasos de navegador.
**Tiempo estimado:** ~45 minutos + esperas de DNS/certificado.

---

## ¿Qué vamos a montar?

```
Cliente WhatsApp → Meta Cloud API → https://bot.varmancrew.com
                                      │  (Caddy: HTTPS automático, Let's Encrypt)
                                      └→ n8n (Docker, puerto interno 5678)
```

- **VM:** varman-bot · e2-micro (always free) · us-central1-a · Ubuntu 24.04 · proyecto GCP `varman-crew` (cuenta varmansneakersandclothes).
- **Sin túnel:** el dominio apunta DIRECTO a la IP fija de la VM. La URL del webhook ya no cambia nunca → la Callback en Meta se configura UNA sola vez.
- **Todo sobrevive reinicios:** Docker arranca solo, los contenedores tienen `restart: unless-stopped`, el swap queda en fstab y el certificado se guarda en un volumen.

**Lo que ya está hecho (6 jul 2026):** número real +57 304 291 6972 registrado en Cloud API (Phone Number ID `1129717360235397`, WABA nueva `1572485474895736`), token permanente probado, VM creada, dominio varmancrew.com en Cloudflare.

**El paquete listo para subir:** `bot_n8n\credenciales\varman-bot-vm.tar.gz` (trae compose, Caddyfile, scripts, workflows y el `.env` REAL — por eso vive en `credenciales\` y JAMÁS se sube a git).

---

## Paso 1 — IP fija y firewall (Cloud Shell, 5 min)

1. Entrar a [console.cloud.google.com](https://console.cloud.google.com) con la cuenta **varmansneakersandclothes**.
2. Abrir **Cloud Shell** (botón `>_` arriba a la derecha) y esperar el prompt.
3. Subir `deploy\gcp-configurar-red.sh` (en Cloud Shell: menú ⋮ → *Subir*) y correr:

   ```bash
   bash gcp-configurar-red.sh
   ```

4. El script termina mostrando la **IP FIJA**. **Anotarla aquí y en el chat con Cowork:**

   > IP fija de varman-bot: `136.114.253.74` ✅ (anotada 7 jul 2026)

Es seguro correrlo dos veces si algo falla a la mitad.

## Paso 2 — Registro A en Cloudflare (Cristhian + Cowork, 2 min)

En Cloudflare → varmancrew.com → **DNS**:

| Campo | Valor |
|---|---|
| Tipo | A |
| Nombre | `bot` |
| IPv4 | la IP fija del paso 1 |
| Proxy | **DNS only (nube GRIS)** ← clave |
| TTL | Auto |

⚠️ **La nube tiene que quedar GRIS.** Si queda naranja (proxy), Caddy no puede emitir el certificado. (Plan B solo si la gris diera problemas: nube naranja + SSL Full strict con origin cert — pedirle a Claude Code que lo configure.)

Esperar 2-5 minutos a que el DNS propague antes del paso 5.

## Paso 3 — Preparar la VM (15 min)

1. En la consola de GCP: **Compute Engine → Instancias de VM → varman-bot → SSH** (se abre una terminal en el navegador).
2. Subir el paquete: en esa ventana SSH, botón **⚙ (o ⋮) → Subir archivo** → elegir `bot_n8n\credenciales\varman-bot-vm.tar.gz` del PC. Queda en el home.
3. Descomprimir y preparar el servidor:

   ```bash
   tar xzf varman-bot-vm.tar.gz
   bash varman-bot/instalar-servidor.sh
   ```

   (Instala Docker, crea el swap de 2 GB — la VM solo tiene 1 GB de RAM —, pone hora de Bogotá. Tarda unos minutos.)
4. **Cerrar la ventana SSH y abrir otra** (para que aplique el permiso de usar docker sin sudo).

## Paso 4 — Arrancar el bot (5 min)

```bash
cd ~/varman-bot
docker compose up -d
```

Esperar ~2 minutos y mirar que el certificado haya salido:

```bash
docker logs varman-caddy --tail 20
```

Debe verse algo como `certificate obtained successfully` para `bot.varmancrew.com`. Si sale error de DNS o de "challenge failed": revisar paso 2 (¿nube gris?, ¿IP correcta?) y esperar 5 min más.

**Enseguida, crear la cuenta de administrador de n8n** (no dejar pasar tiempo: el editor queda visible en internet y el PRIMERO que entre se queda con la cuenta):

1. Abrir `https://bot.varmancrew.com` en el navegador del PC.
2. Crear el usuario dueño (correo varmansneakersandclothes + contraseña fuerte).
3. Anotar esa contraseña en `bot_n8n\credenciales\credenciales_bot_whatsapp_PRIVADO.txt`.

## Paso 5 — Importar los workflows (5 min)

```bash
cd ~/varman-bot
bash importar-workflows.sh
```

Importa los 4 workflows con n8n detenido (regla del lock de SQLite) y deja activo SOLO el **v4.1** (`VarmanBotV4Ped01`, que ya incluye los textos parametrizados). El eco no hace falta en producción.

## Paso 6 — Backups automáticos (5 min)

```bash
cd ~/varman-bot
bash backup.sh --instalar-cron
```

- Queda un respaldo diario a las 3:00 am (workflows + `.env` cifrado, rota a 14).
- La PRIMERA vez imprime la **clave de cifrado**: copiarla al PC en `bot_n8n\credenciales\clave-backup-vm.txt`. Sin esa clave los respaldos no se pueden recuperar si la VM se pierde.

## Paso 7 — Chequeo de salud

En la VM:

```bash
cd ~/varman-bot
bash verificar-salud.sh
```

Debe dar 0 fallos: contenedores arriba, HTTPS válido desde internet, el webhook responde el reto de Meta con 200 (token bueno) y 403 (token malo).

Prueba extra desde el PC (PowerShell) — simula EXACTAMENTE lo que hará Meta
(reemplazar `TOKEN` por el `WEBHOOK_VERIFY_TOKEN` de `credenciales\.env.produccion-gcp`):

```powershell
# Debe responder: hola123
curl.exe "https://bot.varmancrew.com/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=hola123"
# Debe responder 403 / token invalido
curl.exe -i "https://bot.varmancrew.com/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=malo&hub.challenge=hola123"
```

## Paso 8 — La prueba de fuego del reinicio

```bash
sudo reboot
```

Esperar 2-3 minutos, volver a entrar por SSH y correr otra vez `bash verificar-salud.sh`. **Todo debe volver solo** (Docker habilitado, `restart: unless-stopped`, swap en fstab, certificado guardado en volumen). Si esto pasa, la VM quedó lista.

## Paso 9 — Callback en Meta (Cristhian + Cowork — LA DEFINITIVA)

Con `briefs\GUIA-META-CALLBACK.md` (App ID **2168913153950288**):

- **Callback URL:** `https://bot.varmancrew.com/webhook/whatsapp`
- **Verify token:** el `WEBHOOK_VERIFY_TOKEN` de `credenciales\.env.produccion-gcp` (el mismo de siempre)

Como la URL ya es fija, esto se hace UNA vez y no se toca más. Los webhooks entrantes completos llegarán cuando Meta apruebe la verificación del negocio y se publique la app (eso no bloquea nada de esta guía).

---

## Reglas que siguen intactas

- La SIM del 304 **jamás** se registra en la app de WhatsApp (ya está en Cloud API).
- Credenciales nunca a git/Netlify (el `.env` real y el tar.gz viven en `credenciales\`).
- El número público de la web/bios se cambia SOLO el día de EL CORTE, cuando el bot pase la E2E.
- **RAM 1 GB:** si n8n se queda corto incluso con swap (se nota lento u OOM en `docker logs varman-n8n`), plan B: Hetzner CX22 (~US$4.5/mes). **Avisar antes de mover nada.**

## Problemas frecuentes

| Síntoma | Causa probable | Arreglo |
|---|---|---|
| Caddy: `challenge failed` / no sale el certificado | Nube naranja en Cloudflare, o DNS sin propagar, o puertos cerrados | Nube GRIS; esperar 5 min; correr de nuevo `gcp-configurar-red.sh` en Cloud Shell |
| `https://bot.varmancrew.com` da 502 | n8n aún arrancando (e2-micro es lenta) | Esperar 1-2 min; `docker logs varman-n8n --tail 50` |
| El webhook no responde el reto | Workflow v4 sin importar/activar | `bash importar-workflows.sh` y esperar ~1 min |
| Todo muy lento / n8n se reinicia solo | RAM corta | Confirmar swap con `free -h`; si sigue, plan B Hetzner (avisar antes) |
| `permission denied` al usar docker | No se reabrió la sesión SSH tras instalar | Cerrar la ventana SSH y abrir otra |

## Mantenimiento

- **Respaldo manual antes de cambios:** `bash backup.sh --completo`
- **Restaurar:** `bash restore.sh` (ver comentarios del script)
- **Actualizar n8n (más adelante, sin prisa):** cambiar la versión en `docker-compose.yml` → `docker compose pull && docker compose up -d`. Antes: `bash backup.sh --completo`.
- **Editar workflows:** en `https://bot.varmancrew.com` con la cuenta de administrador. La fuente de la verdad sigue siendo `workflows\` del PC → cambios grandes se hacen ahí y se re-importan.
