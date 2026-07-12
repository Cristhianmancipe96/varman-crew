# Nota del AGENTE 4 — Migración Oracle · 2026-07-06

**Misión del brief:** convertir la guía de 14 pasos en una migración de ~1 hora.

## Hecho hoy

1. **Scripts nuevos en `deploy\`** (sintaxis bash verificada, terminaciones LF listas para Linux):
   - `instalar-servidor.sh` — prepara la VM Ubuntu (Docker oficial, zona horaria
     Bogotá, carpetas; `--swap` para el plan B E2.1.Micro). Idempotente.
   - `importar-workflows.sh` — importa los 4 workflows por CLI **con n8n detenido**
     (regla del lock de SQLite) y deja activo solo el v4. Flags `--activar <ID>`
     y `--sin-activar`.
   - `backup.sh` — respaldo de workflows (export del n8n vivo) + `.env` **cifrado
     AES-256** en `/home/ubuntu/backups-bot/`; rota a 14; `--completo` agrega el
     volumen entero; `--instalar-cron` programa el diario de las 3:00 am. La clave
     se autogenera la 1.ª vez y HAY QUE copiarla a `credenciales\clave-backup-oracle.txt`.
   - `restore.sh` — restaura el respaldo más reciente (o el que se indique):
     descifra el `.env`, re-importa workflows (n8n detenido) y reactiva el v4.
2. **`CHECKLIST-DIA-CORTE.md`** — la pasada única del ~14 jul: prerrequisitos,
   migración (4 fases), SIM/PHONE_NUMBER_ID nuevo, DNS del dominio y plan de
   reversa de 5 min. Para lo del servidor manda ese checklist; el lado PC/bot
   lo cubre el RUNBOOK del Agente 1.
3. **`GUIA-MIGRACION-ORACLE.md` actualizada:** sección "RUTA RÁPIDA" al inicio,
   paso 6 y paso 11 apuntando a los scripts, paso 11 corregido (importaba el v3;
   el bot completo es el **v4**), mantenimiento apuntando a `backup.sh`.
4. **Prueba local del compose:** `docker-compose.local-test.yml` (override: puerto
   **5679**, sin cloudflared, contenedor `varman-n8n-prueba`) + `probar-local.ps1`
   que automatiza TODA la prueba con `.env` dummy generado de `.env.example`
   (jamás toca el `.env` real): arranque + healthcheck + import CLI del v4 +
   reto del webhook + limpieza.

## Pendiente / bloqueos

- **La prueba local NO se pudo ejecutar: este PC no tiene Docker Desktop ni WSL.**
  Instalarlos exige reiniciar el PC (se caen el n8n local y el túnel temporal →
  re-verificar Callback en Meta), así que no se hizo sin permiso. Se validó en su
  lugar: sintaxis bash de los 4 scripts, sintaxis del .ps1, YAML de ambos compose
  y su fusión (puerto 5679, cloudflared excluido), y la generación del `.env` dummy.
  Cuando haya Docker Desktop (aquí o en otro PC): `powershell -ExecutionPolicy
  Bypass -File .\probar-local.ps1` y listo — la prueba entera es automática.
- Nada creado en Oracle ni en Cloudflare (la cuenta la abre Cristhian — pasos
  A2-A5 del checklist, ideal esta semana para no dejarlo al 14).
- No se tocó: n8n local, `.env` real, `workflows\` (solo lectura), otras carpetas.

*Requiere Docker Compose ≥ 2.24.4 para la etiqueta `!override` del archivo de
prueba (cualquier Docker Desktop 2024+; el compose real de Oracle no la usa).*
