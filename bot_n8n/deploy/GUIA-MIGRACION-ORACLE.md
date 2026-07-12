# ⛔ OBSOLETA (6 jul 2026) — usar `GUIA-GCP.md`

> **Esta guía ya NO aplica.** Se decidió NO usar Oracle NI túnel de Cloudflare:
> el bot va en la VM **varman-bot de Google Cloud** con dominio directo
> (`bot.varmancrew.com` → IP fija + Caddy/Let's Encrypt).
> La guía vigente es **`GUIA-GCP.md`** en esta misma carpeta.
> Se conserva solo como referencia histórica.

---

# GUÍA DE MIGRACIÓN — Bot WhatsApp VarMan Crew a Oracle Cloud + Docker

**Fecha:** 5 de julio de 2026 · **Para el corte del ~14 de julio**
**Quién la ejecuta:** una persona SIN experiencia en Linux (todo es copiar y pegar).

---

## ¿Qué vamos a montar? (léelo primero, son 2 minutos)

Hoy el bot corre en el PC de Cristhian con un túnel **temporal** de Cloudflare:
cada vez que se reinicia, la URL cambia y toca re-verificar el webhook en Meta.

Después de esta guía el bot quedará así:

```
Cliente de WhatsApp
      │
      ▼
Meta (WhatsApp Cloud API)
      │  https://bot.TU-DOMINIO.com/webhook/whatsapp   ← URL FIJA, nunca más cambia
      ▼
Cloudflare (túnel fijo "named tunnel", gratis)
      │  (conexión saliente desde el servidor: no se abre ningún puerto)
      ▼
Servidor GRATIS en Oracle Cloud (prendido 24/7)
      ├── Docker: contenedor "n8n" (el bot, versión 2.28.6, la misma del PC)
      └── Docker: contenedor "cloudflared" (mantiene el túnel)
```

**Costo total:** $0 al mes, EXCEPTO el dominio (~US$5–11 AL AÑO, una sola compra).
Es lo único que hay que pagar y es lo que hace que la URL sea fija para siempre.

**Lo que investigué sobre el túnel gratis (respuesta a la pregunta del brief):**
- El túnel fijo (named tunnel) de Cloudflare es **gratis para todos los planes** [F3],
  PERO **sí necesita un dominio propio** agregado a tu cuenta de Cloudflare [F1].
- La única opción 100% sin dominio es el túnel temporal `trycloudflare` (el que usamos
  hoy), y Cloudflare mismo dice que es **solo para pruebas, no para producción** [F2].
  Es exactamente el problema que queremos quitar.
- La opción **más barata y simple**: comprar el dominio directamente en
  **Cloudflare Registrar**, que vende a precio de costo, sin margen
  (hay dominios desde ~US$4–5/año; un `.com` cuesta ~US$10.44/año) [F4].
  Es lo más simple porque el DNS ya queda configurado solo, sin tocar nada.
- Existen dominios "gratis" de terceros (eu.org, etc.), pero la aprobación tarda
  días o semanas y no son serios para un negocio. **No los recomiendo** para VarMan.

**Datos importantes de Oracle (investigado, julio 2026):**
- El nivel gratis "Always Free" de la VM ARM (A1.Flex) hoy es **2 OCPUs y 12 GB de
  RAM en total** (Oracle lo redujo en junio 2026; antes era 4/24) [F7]. Sigue siendo
  muchísimo más de lo que n8n necesita (~1 GB).
- Plan B si no hay ARM disponible: 2 VMs pequeñas **E2.1.Micro** (1 GB RAM cada una,
  x86). Alcanza para n8n, pero hay que agregarle memoria swap (está en el Paso 4B).
- En regiones populares a veces sale **"Out of capacity"** al crear la VM ARM:
  la solución es reintentar en otro momento o probar otra "Availability Domain" [F8].
- Oracle puede **reciclar VMs gratis que estén "ociosas"** (si durante 7 días el CPU,
  la red Y la memoria están por debajo del 20% de uso). Antes de reciclar, avisan por
  correo [F7]. Al final de la guía digo cómo manejarlo (Paso 14, punto 8).

**Reglas de seguridad de esta guía:**
- El n8n del PC local NO se toca hasta que el de Oracle esté probado y funcionando.
- Los archivos con secretos (`.env`, `credenciales/`) se copian por SSH directo
  al servidor. Nada se sube a git ni a ningún otro lado.

---

## RUTA RÁPIDA — la migración en ~1 hora (scripts nuevos, 2026-07-06)

La guía de abajo sigue siendo la referencia paso a paso, pero los pasos
mecánicos ya quedaron automatizados en esta misma carpeta:

| Qué hace | Script | Reemplaza |
|---|---|---|
| Preparar la VM: Docker, zona horaria, carpetas (y swap del plan B con `--swap`) | `instalar-servidor.sh` | Pasos 4B y 6 |
| Importar los workflows por CLI (con n8n detenido) y activar el v4 | `importar-workflows.sh` | Paso 11 |
| Respaldo diario: workflows + `.env` cifrado (+ cron 3:00 am con `--instalar-cron`) | `backup.sh` | Copia de seguridad de Mantenimiento |
| Restaurar un respaldo (descifra el `.env` y re-importa workflows) | `restore.sh` | — |
| Chequeo de salud: contenedores, túnel, URL pública, reto del webhook | `verificar-salud.sh` | Paso 12 |
| Probar este compose EN EL PC con Docker Desktop (puerto 5679, valores dummy) | `probar-local.ps1` | — |

**El orden exacto del día del corte (migración + SIM + DNS en una sola
pasada) está en `CHECKLIST-DIA-CORTE.md`.**

Lo que NO se automatiza (lo hace una persona en el navegador, una sola vez):
crear las cuentas (pasos 1 y 3), comprar el dominio (paso 2), crear la VM
(paso 4), crear el túnel y copiar su token (paso 8) y la Callback URL en
Meta (paso 13).

---

## PARTE A — Dominio y Cloudflare (30–45 min)

### Paso 1. Crear cuenta gratis en Cloudflare

1. Entra a https://dash.cloudflare.com/sign-up
2. Regístrate con el correo del negocio (por ejemplo el de
   varmansneakersandclothes@gmail.com) y una contraseña fuerte. Guárdala.
3. Elige el plan **Free** ($0). No hace falta tarjeta.

### Paso 2. Comprar el dominio (lo ÚNICO que cuesta plata)

1. Dentro de Cloudflare, en el menú de la izquierda busca
   **Domain Registration → Register Domains**.
2. Busca un nombre, por ejemplo `varmancrew.com` o alguna variante libre
   (`varmancrew.shop`, `varmancrew.store`...). El buscador muestra el precio
   anual de cada uno; Cloudflare cobra a precio de costo [F4].
3. Págalo con tarjeta (~US$5–11 según la terminación). Con eso el dominio queda
   YA configurado dentro de Cloudflare, sin pasos extra de DNS.
4. Anota el dominio comprado. En el resto de la guía escribo `TU-DOMINIO.com`;
   reemplázalo siempre por el tuyo. La URL del bot será `bot.TU-DOMINIO.com`.

> Alternativa: si compras el dominio en otro lado (Namecheap, Porkbun...), luego
> hay que "Agregar sitio" en Cloudflare y cambiar los nameservers en el registrador.
> Funciona igual, pero son 2 pasos más. Por eso recomiendo comprarlo en Cloudflare.

---

## PARTE B — Servidor gratis en Oracle (1–2 horas, la espera es de Oracle)

### Paso 3. Crear la cuenta Oracle Cloud Free Tier

1. Entra a https://signup.oraclecloud.com
2. Regístrate con correo y datos reales. **Piden tarjeta de crédito para validar
   identidad, pero NO cobran nada** mientras uses solo recursos "Always Free"
   (hacen una retención temporal pequeña que devuelven).
3. **MUY IMPORTANTE — la región "home":** te preguntará la región principal y
   **no se puede cambiar después**. Para Colombia, buena opción:
   **Brazil East (São Paulo)** o **US East (Ashburn)**. Si al crear la VM ARM
   (paso 4) esa región dice "out of capacity" varios días, el plan B (E2.1.Micro)
   funciona en cualquier región [F8].
4. Espera el correo de "cuenta lista" y entra a https://cloud.oracle.com

### Paso 4. Crear la VM (el servidor)

1. En el menú ☰ arriba a la izquierda: **Compute → Instances → Create instance**.
2. Nombre: `varman-bot`.
3. En **Image and shape** pulsa "Edit":
   - **Image (sistema):** Canonical **Ubuntu 22.04** (o 24.04). Si eliges la forma
     ARM, asegúrate de que diga **aarch64/ARM** en la imagen.
   - **Shape (tamaño):** pulsa "Change shape" → **Ampere** →
     **VM.Standard.A1.Flex** → ponle **2 OCPUs y 12 GB de RAM**
     (es el máximo gratis actual [F7], úsalo todo).
4. En **Add SSH keys**: elige **"Generate a key pair for me"** y **DESCARGA la
   llave privada** (`ssh-key-....key`). Guárdala en el PC, por ejemplo en
   `C:\Users\cmanc\OneDrive\Escritorio\Proyecto_zapatos\bot_n8n\credenciales\oracle-vm.key`
   **Sin esa llave no se puede entrar al servidor. No la pierdas.**
5. En **Networking** deja lo que propone (crea una red VCN nueva con IP pública).
   Verifica que esté marcado **"Assign a public IPv4 address"**.
6. Pulsa **Create** y espera a que el punto quede **verde (Running)**.
7. Copia la **Public IP address** que muestra la instancia. En la guía la llamo
   `IP-DEL-SERVIDOR`.

> **¿Y los puertos?** No hay que abrir NINGUNO nuevo. El túnel de Cloudflare sale
> desde el servidor hacia afuera (puerto 7844 de salida) [F1], así que el bot queda
> accesible por HTTPS sin exponer puertos. El único abierto es el 22 (SSH), que
> Oracle deja listo por defecto.

> **Si sale "Out of capacity"** al crear la A1.Flex: inténtalo de nuevo más tarde
> (pasa mucho en regiones populares [F8]), prueba otra "Availability Domain" en el
> mismo formulario, o usa el plan B de abajo.

#### Paso 4B (SOLO plan B). VM E2.1.Micro si no hay ARM disponible

1. Igual que arriba, pero en Shape elige **Specialty and previous generation →
   VM.Standard.E2.1.Micro** (1 GB RAM, siempre disponible).
2. Como tiene poquita RAM, después del paso 5 crea memoria swap (copia y pega):
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```
3. Todo lo demás de la guía es idéntico (Docker funciona igual en x86 y ARM;
   las imágenes de n8n y cloudflared existen para ambas arquitecturas [F5]).

### Paso 5. Conectarse al servidor desde Windows

1. Abre **PowerShell** en el PC (Inicio → escribir "PowerShell" → Enter).
2. Copia y pega (con TU ruta de llave y TU IP):
   ```powershell
   ssh -i "C:\Users\cmanc\OneDrive\Escritorio\Proyecto_zapatos\bot_n8n\credenciales\oracle-vm.key" ubuntu@IP-DEL-SERVIDOR
   ```
3. La primera vez pregunta `Are you sure you want to continue connecting?` →
   escribe `yes` y Enter.
4. Si ves algo como `ubuntu@varman-bot:~$`, ya estás DENTRO del servidor.
   (Para salir en cualquier momento: escribir `exit`.)

> Si Windows se queja de permisos de la llave: clic derecho al archivo .key →
> Propiedades → Seguridad → Opciones avanzadas → quitar herencia y dejar solo
> tu usuario con lectura. (O mueve la llave a `C:\Users\cmanc\.ssh\`.)

---

## PARTE C — Docker en el servidor (10 min)

### Paso 6. Instalar Docker + Docker Compose

> **Automatizado:** si ya copiaste la carpeta `deploy` (o solo el script), este
> paso completo es `bash instalar-servidor.sh` (con `--swap` si usas el plan B
> del paso 4B). Hace también la zona horaria y las carpetas. Lo de abajo es el
> equivalente manual.

Dentro del servidor (después del paso 5), copia y pega estas líneas UNA POR UNA:

```bash
sudo apt-get update && sudo apt-get upgrade -y
```
```bash
curl -fsSL https://get.docker.com | sudo sh
```
```bash
sudo usermod -aG docker ubuntu
```
```bash
exit
```

Vuelve a entrar (repite el comando ssh del paso 5) y comprueba:

```bash
docker --version && docker compose version
```

Debe mostrar las dos versiones sin errores. (Instalación oficial de Docker para
Ubuntu, que ya incluye el plugin de Compose [F6].)

---

## PARTE D — Copiar el bot al servidor (15 min)

### Paso 7. Subir la carpeta deploy, el .env real y los workflows

Estos comandos se ejecutan **en PowerShell del PC (NO dentro del servidor)**.
Reemplaza `IP-DEL-SERVIDOR` y la ruta de la llave, como en el paso 5.

1. La carpeta `deploy` (docker-compose, script de salud):
   ```powershell
   scp -i "C:\Users\cmanc\OneDrive\Escritorio\Proyecto_zapatos\bot_n8n\credenciales\oracle-vm.key" -r "C:\Users\cmanc\OneDrive\Escritorio\Proyecto_zapatos\bot_n8n\deploy" ubuntu@IP-DEL-SERVIDOR:/home/ubuntu/varman-bot
   ```
2. El `.env` REAL (con los secretos; viaja cifrado por SSH):
   ```powershell
   scp -i "C:\Users\cmanc\OneDrive\Escritorio\Proyecto_zapatos\bot_n8n\credenciales\oracle-vm.key" "C:\Users\cmanc\OneDrive\Escritorio\Proyecto_zapatos\bot_n8n\.env" ubuntu@IP-DEL-SERVIDOR:/home/ubuntu/varman-bot/.env
   ```
3. Los workflows:
   ```powershell
   scp -i "C:\Users\cmanc\OneDrive\Escritorio\Proyecto_zapatos\bot_n8n\credenciales\oracle-vm.key" -r "C:\Users\cmanc\OneDrive\Escritorio\Proyecto_zapatos\bot_n8n\workflows" ubuntu@IP-DEL-SERVIDOR:/home/ubuntu/varman-bot/workflows
   ```
4. (Opcional, solo si más adelante el bot escribe pedidos con la llave de
   Firebase) la carpeta credenciales:
   ```powershell
   scp -i "C:\Users\cmanc\OneDrive\Escritorio\Proyecto_zapatos\bot_n8n\credenciales\oracle-vm.key" -r "C:\Users\cmanc\OneDrive\Escritorio\Proyecto_zapatos\bot_n8n\credenciales" ubuntu@IP-DEL-SERVIDOR:/home/ubuntu/varman-bot/credenciales
   ```

Al final, dentro del servidor debe existir `/home/ubuntu/varman-bot/` con:
`docker-compose.yml`, `.env`, `.env.example`, `verificar-salud.sh`,
`GUIA-MIGRACION-ORACLE.md` y la carpeta `workflows/`.

---

## PARTE E — El túnel fijo de Cloudflare (20 min)

### Paso 8. Crear el "named tunnel" y su URL fija

Esto se hace en el navegador del PC:

1. Entra a https://one.dash.cloudflare.com (mismo usuario de Cloudflare).
   Si pide activar "Zero Trust", acepta el plan **Free** ($0).
2. Menú **Networks → Tunnels** → botón **Create a tunnel** [F1].
3. Tipo de conector: **Cloudflared** → Next.
4. Nombre del túnel: `varman-bot` → Save tunnel.
5. En la pantalla del conector aparece un comando de instalación que contiene un
   **token larguísimo que empieza por `eyJ`**. NO ejecutes ese comando: solo
   **copia el token** (hay un botón de copiar; del texto copiado, el token es lo
   que va después de `--token` o de `install`).
   *Ese token es secreto: no lo compartas ni lo subas a ningún lado.*
6. Pulsa **Next** y crea la ruta pública (pestaña **Routes / Public hostname**):
   - **Subdomain:** `bot`
   - **Domain:** `TU-DOMINIO.com` (el del paso 2)
   - **Service → Type:** `HTTP` · **URL:** `n8n:5678`
     (queda `http://n8n:5678`: "n8n" es el nombre del contenedor dentro de
     Docker; cloudflared lo encuentra solo.)
   - Guarda.
7. Listo por ahora: el túnel aparecerá "Down/Inactive" hasta que arranquemos
   Docker en el paso 10.

### Paso 9. Completar el .env del servidor

Dentro del servidor (ssh del paso 5):

```bash
cd /home/ubuntu/varman-bot
nano .env
```

En el editor `nano` (flechas para moverse):

1. Agrega al final (o donde está el comentario de WEBHOOK_URL) estas 2 líneas,
   con TU dominio y TU token del paso 8.5:
   ```
   WEBHOOK_URL=https://bot.TU-DOMINIO.com/
   TUNNEL_TOKEN=eyJ...pega-aqui-el-token-completo...
   ```
2. (Solo si copiaste `credenciales/` en el paso 7.4) cambia la línea de
   `FIREBASE_SA_JSON` para que apunte a la ruta DENTRO del contenedor:
   ```
   FIREBASE_SA_JSON=/files/credenciales/varman-crew-firebase-adminsdk-fbsvc-7c17da86e9.json
   ```
   y quita el `#` de la línea `./credenciales:/files/credenciales:ro` en
   `docker-compose.yml` (con `nano docker-compose.yml`).
3. Guardar y salir de nano: `Ctrl+O`, Enter, `Ctrl+X`.

> El `.env` del PC local NO se toca. Este cambio es solo en la copia del servidor.

---

## PARTE F — Arrancar y migrar los workflows (30 min)

### Paso 10. Arrancar el bot

Dentro del servidor:

```bash
cd /home/ubuntu/varman-bot
docker compose up -d
```

La primera vez descarga las imágenes (2–3 min). Luego:

```bash
docker compose ps
```

Deben verse `varman-n8n` (healthy después de ~1 min) y `varman-cloudflared`
corriendo. En el panel de Cloudflare (Networks → Tunnels) el túnel `varman-bot`
debe pasar a **HEALTHY** en 1–2 minutos.

Ahora abre en el navegador del PC: `https://bot.TU-DOMINIO.com`
- Debe salir la pantalla de n8n para **crear la cuenta de dueño** (es una
  instalación nueva). Crea la cuenta con el correo
  varmansneakersandclothes@gmail.com y una contraseña fuerte (puede ser la misma
  del n8n local o una nueva; apúntala).

> OJO: igual que en el PC, después de arrancar n8n los webhooks tardan
> ~30–60 segundos en registrarse. Paciencia antes de probar.

### Paso 11. Importar los workflows del bot

Los `.json` de la carpeta `workflows/` son la fuente de verdad. Opción fácil
(recomendada), desde el navegador:

1. En `https://bot.TU-DOMINIO.com` → menú de workflows → botón **⋯ / Import from
   file** → elige el archivo desde el PC:
   `C:\Users\cmanc\OneDrive\Escritorio\Proyecto_zapatos\bot_n8n\workflows\bot-whatsapp-v4-pedidos.json`
   (el v4 es EL BOT COMPLETO Fase 1; el v3 quedó como respaldo intermedio).
2. Guarda el workflow y **actívalo** (interruptor "Active" arriba a la derecha).
3. Importa también los otros si quieres tenerlos a mano
   (`bot-whatsapp-eco.json`, `bot-whatsapp-v3-gemini.json`,
   `bot-whatsapp-catalogo.json`) pero **DÉJALOS INACTIVOS**: todos usan el
   mismo camino `/webhook/whatsapp` y solo puede haber UNO activo a la vez.

Opción por comandos (RECOMENDADA, dentro del servidor):

```bash
cd /home/ubuntu/varman-bot
bash importar-workflows.sh
```

Importa TODOS los `.json` de `workflows/` y deja activo SOLO el v4
(`VarmanBotV4Ped01`), respetando la regla del proyecto: la CLI de n8n
se usa con el n8n principal DETENIDO (lock de SQLite) — el script lo
detiene, importa en un contenedor temporal y lo vuelve a arrancar solo.
Para activar otro (ej. el eco): `bash importar-workflows.sh --activar VarmanEcoBot0001`.

> ¿Y el historial/ejecuciones del n8n del PC? No hace falta migrarlo: los
> workflows no usan credenciales guardadas en n8n (todo va por variables del
> .env), así que con importar los .json queda todo. Si algún día quieres clonar
> la base completa, se copia `database.sqlite` + la clave de cifrado de
> `~/.n8n/config` CON EL n8n LOCAL APAGADO, pero para este bot no se necesita.

### Paso 12. Probar la salud

Dentro del servidor:

```bash
cd /home/ubuntu/varman-bot
bash verificar-salud.sh
```

Debe decir `[OK]` en: Docker, los 2 contenedores, n8n local, túnel, URL pública
y el reto del webhook. Si algo falla, el propio script dice qué comando de logs
mirar. También puedes probar desde el navegador del PC:
`https://bot.TU-DOMINIO.com/healthz` → debe responder `{"status":"ok"}`.

---

## PARTE G — Apuntar Meta a la URL fija (10 min, UNA sola vez)

### Paso 13. Actualizar la Callback URL en Meta

1. Entra a https://developers.facebook.com → tu app → **WhatsApp → Configuración**
   (Configuration).
2. En **Webhook** pulsa **Editar** y pon:
   - **Callback URL:** `https://bot.TU-DOMINIO.com/webhook/whatsapp`
   - **Verify token:** el mismo `WEBHOOK_VERIFY_TOKEN` del `.env`
     (el que empieza por `varman-`).
3. Pulsa **Verificar y guardar**. Como el workflow ya está activo (paso 11),
   Meta recibe la respuesta al reto y guarda.
4. Revisa que el campo **messages** siga **suscrito** (ya lo estaba; no debería
   cambiar).
5. **Esta fue la última vez que tocas esta pantalla por la URL.** El túnel es
   fijo: reinicios del servidor, de Docker o de n8n NO cambian la URL.

Prueba de fuego: manda un WhatsApp al número de prueba (+1 555 612 3421) desde
el 320 (con la app de Meta ya publicada) y debe responder el bot de Oracle.

---

## PARTE H — El corte del ~14 de julio

### Paso 14. Checklist final del lanzamiento

1. [ ] App de Meta **PUBLICADA** (botón azul Publicar; la política de privacidad
       ya está aceptada: https://varmancrew.pages.dev/privacidad).
2. [ ] **Verificación del negocio** en Meta completada (RUT o cámara de comercio;
       tarda de horas a ~3 días — iniciarla YA si no está).
3. [ ] Bot en Oracle respondiendo al número de prueba (paso 13 probado).
4. [ ] **Registrar el número REAL (con SIM)** en Meta → WhatsApp. Al hacerlo,
       Meta genera un **PHONE_NUMBER_ID NUEVO**. Entonces, en el servidor:
       ```bash
       cd /home/ubuntu/varman-bot
       nano .env    # cambiar WHATSAPP_PHONE_NUMBER_ID por el nuevo
       docker compose up -d --force-recreate n8n
       bash verificar-salud.sh
       ```
       El **token de usuario de sistema SIGUE SIRVIENDO** tal cual (ya está
       confirmado): NO hay que cambiar `WHATSAPP_TOKEN`.
5. [ ] Verificar en Meta que el webhook sigue apuntando a
       `https://bot.TU-DOMINIO.com/webhook/whatsapp` y `messages` suscrito.
6. [ ] Prueba punta a punta con el número real: saludo → catálogo → Gemini →
       handoff (pedir "hablar con una persona" debe avisar al 320).
7. [ ] Solo cuando TODO lo anterior funcione: apagar el n8n del PC local
       (cerrar sus ventanas de PowerShell). El PC queda libre; el bot vive en
       Oracle. **No borrar la carpeta bot_n8n del PC: es el respaldo.**
8. [ ] Anti-reciclaje de Oracle: la VM gratis puede ser reciclada si pasa 7 días
       con CPU, red y memoria bajo el 20% [F7]. Con el bot recibiendo mensajes es
       poco probable, pero por si acaso: (a) NO ignorar correos de Oracle con
       asunto de "idle/reclaim", y (b) si algún día quieres eliminar el riesgo del
       todo, en Oracle se puede pasar la cuenta a "Pay As You Go": sigue costando
       $0 si solo usas lo Always Free, y las VMs dejan de ser reciclables (además
       suele desaparecer el problema de "out of capacity") [F8].

---

## Mantenimiento (para después)

- **Ver logs del bot:** `docker logs varman-n8n --tail 100`
  · del túnel: `docker logs varman-cloudflared --tail 50`
- **Reiniciar todo:** `cd /home/ubuntu/varman-bot && docker compose restart`
- **Apagar / prender:** `docker compose down` / `docker compose up -d`
  (los datos NO se pierden: viven en el volumen `n8n_data`).
- **Actualizar n8n** (cuando se quiera, sin parches manuales como en el PC):
  editar `docker-compose.yml`, cambiar `2.28.6` por la nueva versión estable
  (ver https://github.com/n8n-io/n8n/releases [F9]), y:
  `docker compose pull && docker compose up -d`
- **Copia de seguridad:** ya es automática si instalaste el cron
  (`bash backup.sh --instalar-cron`): todos los días a las 3:00 am guarda los
  workflows y el `.env` cifrado en `/home/ubuntu/backups-bot/` (conserva 14).
  A mano en cualquier momento: `bash backup.sh` (o `--completo` para incluir
  también el volumen entero de n8n). Restaurar: `bash restore.sh`.
  De vez en cuando bajar un respaldo al PC:
  `scp -i ...key -r ubuntu@IP-DEL-SERVIDOR:/home/ubuntu/backups-bot/respaldo-FECHA "C:\...\bot_n8n\deploy\respaldos\"`.
- **Cambiar textos/tono del bot:** se edita el workflow en
  `https://bot.TU-DOMINIO.com` (igual que se hacía en localhost:5678).

---

## Fuentes consultadas (julio 2026)

- **[F1]** Cloudflare Docs — *Create a remotely-managed tunnel (dashboard)*:
  requiere tener un sitio/dominio en la cuenta; conector por token; salida por
  puerto 7844; ruta pública hacia un servicio local.
  https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/
- **[F2]** Cloudflare Docs — *Quick Tunnels (trycloudflare)*: gratis y sin dominio,
  pero pensados para pruebas/desarrollo, no producción; URL aleatoria.
  https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/
- **[F3]** Blog de Cloudflare — *Tunnel gratis para todos los planes*.
  https://blog.cloudflare.com/tunnel-hostname-routing/
- **[F4]** Cloudflare Registrar — dominios a precio de costo, sin margen
  (.com ≈ US$10.44/año; hay TLDs desde ~US$4).
  https://www.cloudflare.com/products/registrar/ · https://domains.cloudflare.com/
- **[F5]** n8n Docs — *instalación oficial con Docker* (imagen
  `docker.n8n.io/n8nio/n8n`, volumen en `/home/node/.n8n`, `GENERIC_TIMEZONE`):
  https://docs.n8n.io/hosting/installation/docker/ y
  *Docker Compose*: https://docs.n8n.io/hosting/installation/server-setups/docker-compose/
- **[F6]** Docker Docs — *instalación en Ubuntu* (script get.docker.com, plugin
  compose incluido). https://docs.docker.com/engine/install/ubuntu/
- **[F7]** Oracle Docs — *Always Free Resources*: A1.Flex = 1.500 horas de OCPU y
  9.000 GB-hora al mes (equivale a 2 OCPUs + 12 GB fijos); E2.1.Micro = hasta 2 VMs
  de 1 GB; política de reciclaje de instancias ociosas (7 días con CPU, red y
  memoria < 20%, con aviso por correo).
  https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- **[F8]** Experiencias documentadas sobre capacidad del free tier de Oracle
  ("out of capacity" en regiones populares; PAYG lo alivia):
  https://fullmetalbrackets.com/blog/oci-free-tier-breakdown ·
  https://space-node.net/blog/oracle-cloud-always-free-limits-2026
- **[F9]** GitHub n8n — *Releases*: **n8n 2.28.6 es la última versión estable**
  (2026-07-03; las 2.29.x aún son pre-release).
  https://github.com/n8n-io/n8n/releases
