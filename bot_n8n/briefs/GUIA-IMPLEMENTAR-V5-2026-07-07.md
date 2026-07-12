# GUÍA PASO A PASO — Implementar y probar las mejoras v5 · 7 jul 2026

## ⏸ ESTADO DEL DESPLIEGUE (actualizado 7 jul, noche — se retoma con agente nuevo)

- ✅ **FASE 4 HECHA — el bot v5 YA CORRE EN LA VM.** Cristhian subió el JSON,
  corrió `backup.sh --completo` (respaldo `respaldo-2026-07-07_1856`),
  `importar-workflows.sh` e `verificar-salud.sh` → **7 bien · 0 fallos**. El
  bot v5 está en producción. Ya funcionan sin nada más: fotos, "¿cómo va mi
  pedido?", anti-spam, resumen diario, carrito abandonado, ref directa (lado
  bot), registro de lista de espera, y `fuente` se guarda en el pedido.
- ⬜ **FASE 1 PENDIENTE** — pegar reglas de Firestore (`app\reglas-firestore.txt`).
- ⬜ **FASE 2 PENDIENTE** — subir `app\` a Cloudflare (varmanapp).
- ⬜ **FASE 3 PENDIENTE** — subir `web\publicar\` a Cloudflare (varmancrew).
- ⬜ **FASE 5 PENDIENTE (opcional, sin afán)** — marcas, bodegas, QR de pago,
  LINK_RESENAS_FB.
- **Próximo paso mañana:** Fase 1 → 2 → 3 (son 3 subidas de navegador, ~6 min en
  total) y después las pruebas de la Fase 6. Guiar a Cristhian pasito a pasito
  (no es técnico). El truco de prueba: escribir al número de PRUEBA de Meta desde
  el 320 (la app Meta sigue en modo desarrollo; el bot responde por el 304).

---

Para Cristhian. Sigue las FASES en orden. Cada una termina con "cómo saber que
quedó bien". Tiempo total: ~30 min de trabajo + esperas. Nada de esto borra
datos; el único punto delicado (la VM) arranca con un respaldo automático.

**Lo que vas a necesitar abierto:**
- El navegador con tu cuenta **varmansneakersandclothes** (para Cloudflare,
  Firebase y el SSH de la VM en Google Cloud).
- La carpeta del PC: `C:\Users\cmanc\OneDrive\Escritorio\Proyecto_zapatos\`.

**Los 13 cambios que vas a activar** (para ubicarte):
1. Catálogo con fotos · 2. Búsqueda por marca · 3. Pago con QR · 4. Botón "Pedir"
de la web que abre el chat con la referencia · 5. Anular ventas (+ 5-bis: asociar
referencias a bodega propia o externa) · 6. De qué anuncio vino el pedido ·
7. "¿Cómo va mi pedido?" · 8. Anti-spam · 9. Resumen diario al 320 · 10. Carrito
abandonado · 11. Reseña post-entrega · 12. Guía de envío · 13. Lista de espera.

---

## FASE 1 — Reglas de Firestore (2 min) · HAZLO PRIMERO

Sin esto, la app da "permiso denegado" en las funciones nuevas.

1. Entra a https://console.firebase.google.com → proyecto **varman-crew**.
2. Menú izquierdo: **Firestore Database** → pestaña **Reglas** (Rules).
3. Abre en el PC el archivo `app\reglas-firestore.txt`, copia TODO el bloque de
   reglas (desde `rules_version = '2';` hasta la última `}`).
4. En la consola: borra lo que haya, pega, botón **Publicar**.

✅ **Quedó bien si:** dice "Reglas publicadas" sin errores.

---

## FASE 2 — Subir la APP a Cloudflare (2 min)

Trae: anular ventas, campo Marca, sección Inventario (bodega propia/externa),
lista de espera, guía de envío, "de qué anuncio vino".

1. Entra a https://dash.cloudflare.com → **Workers & Pages** → proyecto
   **varmanapp**.
2. Pestaña **Deployments** → botón **Create deployment**.
3. **Arrastra la carpeta `app\` COMPLETA** (con `vendor\` adentro) a la zona de
   subida. → **Save and Deploy**. En ~1 min queda arriba.
4. En el celular: cierra y vuelve a abrir la app (o F5).

✅ **Quedó bien si:** al tocar una venta terminada aparece el botón "⛔ Anular
venta" (solo si entras como socio), y en la pestaña Tienda, al editar una
referencia, aparece "Marca" y la sección "Inventario".

---

## FASE 3 — Subir la WEB a Cloudflare (2 min)

Trae: el botón "Pedir" abre WhatsApp con "Hola! Quiero la Ref NN".

1. En Cloudflare → proyecto **varmancrew** → **Create deployment**.
2. **Arrastra la carpeta `web\publicar\` COMPLETA** → **Save and Deploy**.

✅ **Quedó bien si:** en https://varmancrew.pages.dev, al tocar el botón verde de
WhatsApp de una tarjeta, el mensaje que se abre dice "Hola! Quiero la Ref 01…".

---

## FASE 4 — Subir el BOT v5 a la VM (10 min) · EL PASO GRANDE

Aquí se activan casi todos los cambios del bot. El bot queda ~1-2 min fuera de
línea durante la importación (normal). Arrancamos con un respaldo por si acaso.

**4.1 — Abrir la terminal de la VM (en el navegador):**
1. https://console.cloud.google.com (cuenta varmansneakersandclothes).
2. Menú → **Compute Engine** → **Instancias de VM** → fila **varman-bot** →
   botón **SSH** (se abre una terminal negra en el navegador).

**4.2 — Subir el archivo nuevo del bot:**
3. En esa terminal, arriba a la derecha: botón **⚙ (o ⋮) → Subir archivo**.
4. Elige del PC: `bot_n8n\workflows\bot-whatsapp-v4-pedidos.json`.
   Queda en tu carpeta personal de la VM.

**4.3 — Respaldo + importar (copia y pega cada bloque, uno por uno):**
```bash
cd ~/varman-bot
bash backup.sh --completo
```
Espera a que diga que terminó. Luego:
```bash
cp ~/bot-whatsapp-v4-pedidos.json ~/varman-bot/workflows/bot-whatsapp-v4-pedidos.json
bash importar-workflows.sh
```
Este último detiene el bot, importa y lo vuelve a prender solo. Espera a que
diga **[OK] n8n responde**.

**4.4 — Revisar salud (espera ~1 min tras el paso anterior):**
```bash
bash verificar-salud.sh
```

✅ **Quedó bien si:** `verificar-salud.sh` da **0 fallos** (contenedores arriba,
HTTPS válido, el webhook responde 200/403).

**Si algo sale mal** (rollback en 1 paso): sube por el mismo botón el archivo
`bot_n8n\workflows\respaldo\bot-whatsapp-v4-pedidos.v4.1-pre-v5.2026-07-07.json`,
renómbralo y vuelve a importar; o corre `bash restore.sh` con el respaldo de 4.3.

---

## FASE 5 — Configuración (cuando quieras; el bot ya funciona sin esto)

Estos son los cambios que necesitan un dato tuyo. El bot NO se rompe si los
dejas para después: simplemente esa función se comporta como antes.

### 5.A — Marcas de las referencias (para "¿tienen adidas?")
La ref 01 ya quedó como "Adidas" (se dedujo del inventario). Las demás las
llenas tú: app → pestaña **Tienda** → abre cada referencia → campo **Marca**
(salen sugerencias) → **Guardar y publicar**. No hace falta hacerlas todas hoy;
el bot usa las que tengan marca.

### 5.B — Asociar referencias a su bodega (5-bis)
app → **Tienda** → abre una referencia → sección **Inventario**:
- **Bodega propia:** elige sus códigos VRM (puede tener varios).
- **Bodega externa:** escribe el proveedor (ej. "Bodega Andrés"); queda guardado
  para reutilizarlo. Opcional: una nota.
Con esto, la pestaña Pedidos te muestra stock real o "🏭 Externa", y el bot te
dice en cada pedido de dónde pedirla.

### 5.C — QR de pago (cambio 3)
1. En **Nequi**: perfil → *Mi código QR* (o "Cobrar con QR Bre-B") → guarda la
   imagen. En **Daviplata** igual, si tu versión lo tiene.
2. Guarda las imágenes en el PC como
   `web\publicar\img\pagos\qr-nequi.jpg` (y `qr-daviplata.jpg`, `qr-breb.jpg`).
3. Vuelve a subir `web\publicar\` a Cloudflare (Fase 3).
4. Comprueba que abre: `https://varmancrew.pages.dev/img/pagos/qr-nequi.jpg`.
5. En la VM (terminal SSH): `nano ~/varman-bot/.env` → busca la línea
   `#PAGO_QR_NEQUI=` → quítale el `#` y pega la URL:
   `PAGO_QR_NEQUI=https://varmancrew.pages.dev/img/pagos/qr-nequi.jpg`
   Guarda con **Ctrl+O, Enter, Ctrl+X**. Luego:
   ```bash
   cd ~/varman-bot && docker compose up -d
   ```

### 5.D — Link de reseñas (cambio 11)
Consigue el link público de reseñas de tu página de Facebook (pestaña Reseñas →
copiar URL). En la VM: `nano ~/varman-bot/.env` → línea `#LINK_RESENAS_FB=` →
quita el `#` y pega el link → guardar → `docker compose up -d`.
Sin este dato, el bot simplemente no pide reseñas (no se rompe nada).

---

## FASE 6 — Probar los 13 cambios

La app de Meta sigue en modo desarrollo, así que se prueba **escribiéndole al
número de PRUEBA** desde tu WhatsApp del 320 (el bot responde por el 304), igual
que el 7 de julio.

| # | Cambio | Cómo probarlo |
|---|--------|---------------|
| 1 | Fotos | `hola` → toca "Deportivas" → llegan 5 fotos + lista "Elige tu referencia" + "Ver más ➡️" |
| 2 | Marca | `tienen adidas?` → muestra las refs con marca Adidas (con foto). (Llena marcas en 5.A para ver más) |
| 3 | QR | Haz un pedido, elige Nequi → llega el QR + el número solo + el total. (Requiere 5.C) |
| 4 | Web→bot | En la web toca "Pedir" de una tarjeta → se abre el chat con "Hola! Quiero la Ref NN"; envíalo → el bot arranca en esa ref |
| 5 | Anular venta | App → Ventas → toca una venta → "⛔ Anular venta" → elige motivo → el stock vuelve y la venta queda tachada |
| 5-bis | Bodega externa | Asocia una ref a un proveedor (5.B), haz un pedido de esa ref → el aviso al 320 dice "🏭 Ref EXTERNA — proveedor: …" |
| 6 | Fuente | Haz un pedido normal → en la app, el detalle del pedido dice "🌱 Cliente orgánico" (o "📣 anuncio" si vino de pauta) |
| 7 | ¿Cómo va mi pedido? | Después de un pedido, escribe `como va mi pedido` → responde el estado |
| 8 | Anti-spam | Manda muchos mensajes seguidos rápido → tras 8 en un minuto, avisa "dame un momentico" y se calla hasta el otro minuto |
| 9 | Resumen diario | Llega solo al 320 a las 3:15 a.m. (o revisa al día siguiente que llegó) |
| 10 | Carrito abandonado | Elige ref y talla, NO mandes comprobante → entre 3 y 4 horas después llega UN recordatorio |
| 11 | Reseña | App → marca un pedido como "entregado" → el bot le pide reseña al cliente. (Requiere 5.D y ventana de 24h) |
| 12 | Guía de envío | App → detalle del pedido → escribe transportadora + guía → "📦 Guardar guía y avisar" → le llega al cliente "va en camino" |
| 13 | Lista de espera | Escribe `avísame cuando llegue la talla 40 de la ref 05` → confirma; aparece en App → Pedidos → "🔔 Lista de espera" |

---

## Orden recomendado si tienes poco tiempo

Hoy: **Fases 1 → 2 → 3 → 4** (deja el bot v5 arriba con todo lo que no necesita
config). Esta semana, sin afán: **Fase 5** (marcas, bodegas, QR, reseñas) y las
pruebas de la Fase 6 que dependan de ella.

*Guía generada el 2026-07-07. Detalle técnico completo en NOTA-AGENTE-V5-2026-07-07.md.*
