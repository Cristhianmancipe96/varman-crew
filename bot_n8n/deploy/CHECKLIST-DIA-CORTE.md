# ⛔ OBSOLETO EN PARTE (6 jul 2026) — el lado servidor ahora es `GUIA-GCP.md`

> **Cambió el plan:** ya no hay Oracle ni túnel. La VM es **varman-bot (Google
> Cloud)** y el servidor se monta ANTES del corte siguiendo **`GUIA-GCP.md`**
> (el número real ya quedó registrado el 6 jul: Phone Number ID nuevo listo).
> Del día del corte solo queda vigente: publicar la app cuando Meta apruebe la
> verificación, probar E2E y cambiar el número público de la web/bios.
> Lo de abajo se conserva como referencia histórica.

---

# CHECKLIST — DÍA DEL CORTE (~14 jul 2026)
**Migración a Oracle + número real (SIM) + DNS del dominio, en UNA SOLA PASADA.**

Quién: Cristhian (con Claude al lado si quiere). Tiempo estimado de la pasada: **~1 hora**
(si los "ANTES" ya están hechos). Guía detallada de cada paso: `GUIA-MIGRACION-ORACLE.md`.
El lado del PC/bot local lo cubre el RUNBOOK del Agente 1 (`briefs\RUNBOOK-CORTE.md`);
para todo lo del SERVIDOR manda este checklist.

---

## ANTES del día del corte (hacer días antes, no dejar para el 14)

- [ ] **A1.** Verificación del negocio en Meta APROBADA y app **PUBLICADA** (botón azul).
      Sin esto no hay corte: los mensajes reales no entran.
- [ ] **A2.** **Comprar el dominio** en Cloudflare Registrar (guía pasos 1-2, ~US$5-11/año).
      Anotarlo aquí: `____________________` (en adelante `DOMINIO`).
      *El DNS queda configurado solo al comprarlo en Cloudflare — no hay que tocar nada.*
- [ ] **A3.** Crear cuenta Oracle + VM `varman-bot` (guía pasos 3-5).
      Llave SSH guardada en `credenciales\oracle-vm.key` · IP anotada: `____________________`
- [ ] **A4.** En la VM: `bash instalar-servidor.sh` (Docker, zona horaria, carpetas; guía paso 6
      automatizado). Salir y volver a entrar por ssh al terminar.
- [ ] **A5.** Crear el **túnel nombrado** `varman-bot` en Cloudflare Zero Trust (guía paso 8):
      hostname `bot.DOMINIO` → `http://n8n:5678`. Guardar el **TUNNEL_TOKEN** (empieza por `eyJ`)
      en `credenciales\` del PC. *Al crear el hostname, Cloudflare crea solo el registro DNS
      de `bot.DOMINIO` — no hay paso DNS manual.*
- [ ] **A6.** `.env` del PC ya con los **PAGO_NEQUI / PAGO_DAVIPLATA / PAGO_BREB reales**
      (los pone Cristhian; el bot se los muestra a los clientes).
- [ ] **A7.** SIM del número real a la mano, con el teléfono que recibe SMS.
      ⚠ Ese número NO debe tener WhatsApp normal/Business activo: si lo tiene,
      eliminar esa cuenta de WhatsApp antes del corte (Meta no registra números en uso).
- [ ] **A8.** (Opcional, recomendado) Probar el compose en el PC: `probar-local.ps1`
      (necesita Docker Desktop; usa el puerto 5679 y valores dummy, no toca nada real).

---

## LA PASADA (día del corte, en este orden exacto)

### Fase 1 — Servidor arriba con URL fija (~25 min)

- [ ] **1.** Desde PowerShell del PC: copiar al servidor `deploy\`, el `.env` real y
      `workflows\` con los 3 comandos `scp` de la guía **paso 7**.
- [ ] **2.** En la VM: completar el `.env` del servidor (guía paso 9):
      agregar `WEBHOOK_URL=https://bot.DOMINIO/` y `TUNNEL_TOKEN=eyJ...` (de A5).
      *El `.env` del PC no se toca.*
- [ ] **3.** `cd /home/ubuntu/varman-bot && docker compose up -d` (guía paso 10).
      En Cloudflare → Tunnels: `varman-bot` debe pasar a **HEALTHY** en 1-2 min.
- [ ] **4.** Abrir `https://bot.DOMINIO` → crear la cuenta de dueño de n8n
      (correo varmansneakersandclothes@gmail.com; apuntar la contraseña).
- [ ] **5.** `bash importar-workflows.sh` → importa los 4 workflows y deja activo SOLO el v4.
- [ ] **6.** `bash verificar-salud.sh` → todo `[OK]` (incluido el reto del webhook).
- [ ] **7.** `bash backup.sh --instalar-cron` → primer respaldo + cron diario 3:00 am.
      ⚠ La PRIMERA vez imprime la **clave de cifrado**: copiarla YA a
      `credenciales\clave-backup-oracle.txt` en el PC.

### Fase 2 — Meta apunta al servidor (~10 min)

- [ ] **8.** developers.facebook.com → app VarMan Crew → WhatsApp → Configuración → Webhook →
      **Editar**: Callback URL `https://bot.DOMINIO/webhook/whatsapp` + el mismo
      `WEBHOOK_VERIFY_TOKEN` del `.env` → **Verificar y guardar** (guía paso 13).
      Si da 404: esperar 60 s (los webhooks tardan en registrarse) y reintentar.
- [ ] **9.** Confirmar que el campo **messages** sigue **suscrito**.
- [ ] **10.** Prueba con el número de prueba: WhatsApp al +1 555 612 3421 desde el 320 →
      debe responder **el v4 desde Oracle** (catálogo, no el eco).
      *Es la última vez que se toca la pantalla del webhook: la URL ya es fija para siempre.*

### Fase 3 — Registrar el número REAL con la SIM (~15 min)

- [ ] **11.** En Meta → WhatsApp → **API Setup / Agregar número de teléfono**: registrar el
      número real de la SIM (llega SMS de verificación). Poner nombre para mostrar "VarMan Crew".
- [ ] **12.** Copiar el **PHONE_NUMBER_ID NUEVO** que genera Meta (cambia SÍ o SÍ). En la VM:
      ```bash
      cd /home/ubuntu/varman-bot
      nano .env        # WHATSAPP_PHONE_NUMBER_ID=<el nuevo>
      docker compose up -d --force-recreate n8n
      ```
      El `WHATSAPP_TOKEN` (usuario de sistema) **sigue sirviendo tal cual** — NO cambiarlo.
      Recordar: el token SOLO como header `Authorization: Bearer` (nunca `?access_token=`).
- [ ] **13.** `bash verificar-salud.sh` de nuevo → todo `[OK]`.
- [ ] **14.** **Prueba E2E real** al número nuevo desde otro celular:
      saludo → catálogo → elegir ref y talla → datos de envío → pago (Nequi/Daviplata/Bre-B
      reales) → foto de comprobante → pedido en Firestore + aviso al 320 → pedir
      "hablar con una persona" avisa al 320 (handoff).

### Fase 4 — Apagar lo viejo y publicar el número (~10 min)

- [ ] **15.** Solo cuando el 14 esté OK: **apagar el n8n local y el túnel temporal** del PC
      (cerrar sus 2 ventanas de PowerShell). ⚠ NO borrar la carpeta `bot_n8n\` — es el respaldo.
- [ ] **16.** **Web:** cambiar `var WHATSAPP_NUMERO` en `web\publicar\index.html`
      (está marcado `<!-- EL CORTE: cambiar aquí -->` por el Agente 3) al número real y
      arrastrar `web\publicar` a Cloudflare Pages (proyecto varmancrew).
- [ ] **17.** Actualizar el número de WhatsApp en las **bios** de Instagram/redes.
- [ ] **18.** `bash backup.sh --completo` → respaldo completo del día del corte y bajarlo
      al PC con el `scp` que imprime al final.

### DNS del dominio — misma pasada (opcional, no afecta al bot)

- [ ] **19.** Si se quiere que la tienda viva en el dominio nuevo: Cloudflare →
      **Workers & Pages → varmancrew → Custom domains → Set up a domain** → agregar
      `DOMINIO` y `www.DOMINIO`. Cloudflare crea los registros DNS solo.
      *(varmancrew.pages.dev sigue funcionando igual; coordinar con el Agente 3 si además
      hay que actualizar meta tags OG con la URL nueva.)*
- [ ] **20.** (Higiene) Si el dominio no va a mandar correo, en Cloudflare → DNS agregar
      TXT `@` = `v=spf1 -all` para que nadie pueda falsificar correos con él.

---

## Si algo sale mal (plan de reversa, 5 min)

El bot local queda INTACTO hasta el paso 15. Para volver atrás en cualquier momento:
1. En el PC: `start-tunnel.ps1` → copiar la URL temporal → `start-n8n.ps1`.
2. En Meta: Callback URL de vuelta a la URL temporal + verify token → Verificar y guardar.
3. El bot vuelve a operar desde el PC como hoy. Diagnosticar Oracle con calma
   (`bash verificar-salud.sh`, `docker logs varman-n8n --tail 100`).

## Después del corte (semana siguiente)

- [ ] Vigilar el correo de Oracle: si llega aviso de "idle/reclaim", entrar y usar la VM
      (o pasar la cuenta a Pay As You Go, sigue en $0 — guía paso 14.8).
- [ ] Confirmar un día después que el cron dejó respaldo en `/home/ubuntu/backups-bot/`
      (`ls /home/ubuntu/backups-bot/` y `tail backup.log`).
- [ ] Cuando todo lleve una semana estable: bajar un respaldo al PC y probar `restore.sh`
      en frío un día tranquilo (un respaldo no probado no es un respaldo).

*Checklist generado por el Agente 4 el 2026-07-06.*
