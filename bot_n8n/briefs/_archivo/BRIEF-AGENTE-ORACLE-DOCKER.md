# BRIEF — Agente "Migración Oracle/Docker" · Bot WhatsApp VarMan Crew

**Fecha:** 5 jul 2026 · **Deadline del corte:** ~14 jul 2026

## Contexto (autocontenido)

VarMan Crew es una marca colombiana de calzado. Su bot de ventas por WhatsApp corre en
**n8n 2.28.6** en el PC personal del dueño técnico (Windows 11), instalado vía pnpm
hoisted con 2 parches manuales frágiles (NO tocar esa instalación). El túnel actual es
**temporal** (`cloudflared tunnel --url` → URL trycloudflare que cambia en cada
reinicio, lo que obliga a re-verificar el webhook en Meta cada vez).

Todo el proyecto del bot vive en:
`C:\Users\cmanc\OneDrive\Escritorio\Proyecto_zapatos\bot_n8n\`
- `.env` → variables y secretos (PUEDES LEERLO, NO MODIFICARLO)
- `workflows\*.json` → los flujos de n8n (PUEDES LEERLOS, NO MODIFICARLOS)
- `credenciales\` → NO TOCAR
- `BRIEF_ClaudeCode_bot_n8n.md` → plan general del bot (léelo para contexto)
- `LEEME-BOT.txt` → estado actual (léelo para contexto)

**El plan (ya decidido, no re-decidir):** migrar n8n a **Oracle Cloud Free Tier**
(VM A1.Flex ARM preferida; E2.1.Micro 1GB como plan B) con **Docker Compose**
(n8n + cloudflared) y un **túnel FIJO de Cloudflare** (named tunnel) para que la
Callback URL de Meta no cambie nunca más.

## Tu tarea

Crear el paquete de migración COMPLETO y listo para ejecutar, SOLO dentro de la
carpeta nueva: `C:\Users\cmanc\OneDrive\Escritorio\Proyecto_zapatos\bot_n8n\deploy\`

Entregables:
1. **docker-compose.yml** — servicios n8n (imagen oficial, versión moderna estable,
   ≥2.28) y cloudflared (named tunnel por token), `env_file: .env`, volumen persistente
   para `/home/node/.n8n`, `restart: unless-stopped`, timezone America/Bogota, y las
   variables que el bot necesita: `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`, `WEBHOOK_URL`
   fija del túnel, `N8N_SECURE_COOKIE`, etc. (revisa el `.env` actual para la lista).
2. **.env.example** — misma estructura del `.env` real pero con placeholders
   (SIN copiar los secretos reales).
3. **GUIA-MIGRACION-ORACLE.md** — guía paso a paso EN ESPAÑOL SENCILLO (el que la
   ejecuta no es experto en Linux): crear cuenta Oracle Free Tier, crear la VM
   (A1.Flex, Ubuntu 22.04+, abrir puertos), instalar Docker+Compose, crear el named
   tunnel de Cloudflare (con cuenta gratis: `cloudflared tunnel create`, token,
   ¿necesita dominio propio o funciona con dominio gratis de Cloudflare? — investiga
   y documenta la opción MÁS BARATA/SIMPLE), copiar la carpeta, migrar los workflows
   (n8n export/import o copiar la base), probar salud, actualizar la Callback URL en
   Meta (una sola vez, queda fija), y checklist final del corte del ~14 jul
   (incluye: cambiar WHATSAPP_PHONE_NUMBER_ID cuando se registre el número real con SIM
   — el token de usuario de sistema sigue sirviendo, eso ya está confirmado).
4. **verificar-salud.sh** — script simple que chequee n8n (healthz) y el túnel.

## Reglas duras
- Escribe ÚNICAMENTE dentro de `bot_n8n\deploy\` (créala). No toques nada más.
- NO ejecutes nada contra el n8n local (ni CLI de n8n, ni su base de datos, ni matar
  procesos). Otra sesión está trabajando con él.
- NO subas nada a internet ni instales software en este PC.
- Si investigas en la web (recomendado para: named tunnels gratis de Cloudflare,
  imagen Docker de n8n 2.x, particularidades de Oracle A1), cita las fuentes en la guía.
- Español sencillo, pasos numerados, comandos copy-paste.
