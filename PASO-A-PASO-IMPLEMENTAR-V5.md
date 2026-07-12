# PASO A PASO — Implementar la v5 (VarMan Crew)

**Fecha:** 7 jul 2026 · **Objetivo:** poner en producción TODO lo de la v5 sin tumbar el bot v4.1 que ya corre.

**Orden pensado a propósito** para que nada dé *permission-denied* y para poder devolverte en 1 comando si algo sale mal. El bot v4.1 sigue vivo hasta el PASO 3. Nada de esto cambia el número público ni las credenciales.

Tiempo total del núcleo (pasos 0–4): **~20 min**. Lo opcional, cuando quieras.

---

## PASO 0 — Antes de empezar (2 min)

- [ ] **OneDrive sincronizado:** la carpeta `Proyecto_zapatos` con **check verde**. Si ves nube o flechas, click derecho → *Conservar siempre en este dispositivo* y espera. (Sin esto podrías subir el workflow a medias a la VM.)
- [ ] Sesión iniciada con la cuenta del negocio en: `console.cloud.google.com`, `console.firebase.google.com` y `dash.cloudflare.com`.

---

## PASO 1 — Reglas de Firestore (2 min) · HAZLO PRIMERO

Desbloquea lo nuevo de la app (Inventario, lista de espera, avisos de guía/reseña). Si subes la app antes de esto, esas secciones darán permisos denegados.

1. `console.firebase.google.com` → proyecto **varman-crew** → **Firestore Database** → pestaña **Reglas**.
2. En el PC abre `app\reglas-firestore.txt` y copia TODO el bloque entre las líneas de guiones (desde `rules_version = '2';` hasta el `}` final).
3. Borra lo que haya en el editor, pega el bloque y toca **Publicar**.

---

## PASO 2 — Subir app y web a Cloudflare Pages (5 min)

1. **App:** `dash.cloudflare.com` → Workers & Pages → **varmanapp** → *Create deployment* → arrastra la carpeta **`app\`** completa → Deploy. (Trae: anular ventas, campo Marca, fuente, Inventario, lista de espera.)
2. **Web:** proyecto **varmancrew** → *Create deployment* → arrastra **`web\publicar\`** → Deploy. (Trae el `wa.me` nuevo de los botones "Pedir".)
3. Check rápido: en la app, las pestañas **Pedidos** y **Tienda** cargan sin error; en la web, el botón "Pedir" de una ref abre WhatsApp con el texto "Hola! Quiero la Ref …".

---

## PASO 3 — Bot v5 a la VM (~10 min) · el corazón del deploy

Se hace desde **Cloud Shell** (el botón SSH del navegador te da los popups). Respaldo antes de tocar nada; **rollback = 1 comando**.

**3.1** Abre **Cloud Shell** (ícono `>_` arriba a la derecha en `console.cloud.google.com`).

**3.2** Sube el workflow a Cloud Shell: menú **⋮** de Cloud Shell → **Upload** → elige `bot_n8n\workflows\bot-whatsapp-v4-pedidos.json`.

**3.3** Pásalo a la VM:
```bash
gcloud compute scp ~/bot-whatsapp-v4-pedidos.json varman-bot:~/ --zone=us-central1-a
```

**3.4** Entra a la VM:
```bash
gcloud compute ssh varman-bot --zone=us-central1-a
```

**3.5** Respaldo COMPLETO antes de tocar nada (regla de oro):
```bash
cd ~/varman-bot
bash backup.sh --completo
```

**3.6** Reemplaza el workflow e importa (el script detiene n8n solo por el lock de SQLite y deja activo SOLO `VarmanBotV4Ped01`, ya en v5):
```bash
cp ~/bot-whatsapp-v4-pedidos.json ~/varman-bot/workflows/bot-whatsapp-v4-pedidos.json
bash importar-workflows.sh
```

**3.7** Espera ~1 min (a que registren los webhooks) y verifica salud — debe dar **7/7, 0 fallos**:
```bash
bash verificar-salud.sh
```

**Si algo sale mal → ROLLBACK:**
```bash
bash restore.sh        # restaura el respaldo del 3.5
```
o vuelve a importar `workflows\respaldo\bot-whatsapp-v4-pedidos.v4.1-pre-v5.2026-07-07.json` (subiéndolo igual que en 3.2–3.3).

---

## PASO 4 — Prueba funcional (desde tu WhatsApp del 320)

Estás en modo desarrollo: escribes al **número de PRUEBA** y el bot responde por el 304 (como el 7 jul).

- [ ] `hola` → menú de categorías.
- [ ] Toca **Deportivas** → llegan **5 fotos** + lista "Elige tu referencia" con "Ver más ➡️".
- [ ] `Hola! Quiero la Ref 05` → foto + precio + pide talla directo.
- [ ] `como va mi pedido` → responde el estado del último pedido.
- [ ] `avisame cuando llegue la talla 40 de la ref 05` → confirma; aparece en la app (Pedidos → 🔔 Lista de espera).
- [ ] Desde el 320: `pedidos` / `pausar` / `activar` siguen igual.
- [ ] (con la app v5 arriba) marca un pedido de prueba como `entregado` y guarda una guía → el bot manda los avisos al chat del cliente de prueba.
- [ ] Carrito abandonado: elige ref + talla y NO mandes comprobante → el recordatorio llega solo entre **3 y 4 h** después (una única vez).

Con esto **la v5 ya está viva.** Lo de abajo es opcional y suma valor cuando quieras.

---

## OPCIONALES (el bot ya funciona sin esto)

### A. QR de pago
1. Nequi: perfil → *Mi código QR* (o *Cobrar con Bre-B*) → exporta la imagen. (Daviplata igual si tu versión lo tiene.)
2. Guarda en el PC como `web\publicar\img\pagos\qr-nequi.jpg` (y `qr-daviplata.jpg`, `qr-breb.jpg` si hay). Vuelve a subir `web\publicar\` a Cloudflare (PASO 2).
3. Verifica que abre: `https://varmancrew.pages.dev/img/pagos/qr-nequi.jpg`.
4. En la VM:
   ```bash
   nano ~/varman-bot/.env
   ```
   quita el `#` y llena `PAGO_QR_NEQUI=https://varmancrew.pages.dev/img/pagos/qr-nequi.jpg` → guarda (Ctrl+O, Enter, Ctrl+X) →
   ```bash
   cd ~/varman-bot && docker compose up -d
   ```
5. Prueba: pide algo → elige Nequi → debe llegar QR + número solo + total.

### B. LINK_RESENAS_FB (reseña post-entrega)
- Copia el link de reseñas de tu página de Facebook (pestaña Reseñas → URL, tipo `facebook.com/<página>/reviews`).
- VM: `nano ~/varman-bot/.env` → llena `LINK_RESENAS_FB=...` → `docker compose up -d`. Sin la variable, el bot simplemente no pide reseñas.

### C. Marca de las 32 referencias (app → Tienda)
- Cada ref → campo **"Marca (opcional)"** → escribe (salen sugerencias) → Guardar y publicar. La **ref 01 ya quedó "Adidas"**. No hace falta hacerlas todas de una: el bot usa las que ya tengan marca.

### D. Asociar refs a bodega (app → Tienda → sección "Inventario")
- Agrega los códigos **VRM** (bodega propia) y/o escribe el **proveedor** (bodega externa; el nombre queda guardado y se reutiliza). Con esto, Pedidos muestra stock real o el aviso "🏭 Externa: …", y el bot te dice de dónde pedir cada ref.

### E. Lista de espera (aviso manual por ahora)
- Pedidos → 🔔 Lista de espera → 💬 (abre el chat del cliente) → le escribes tú que ya llegó → **"✓ Ya avisé"**.

---

## Fechas que dependen de esto
- **Atribución de pauta (`fuente`)** queda viva con el PASO 3 → debe estar antes del **16 jul** (arranque de pauta paga).
- **EL CORTE (~14 jul):** cambiar número público en la web + botón WhatsApp de Facebook + bios de IG/TikTok, tras la aprobación de Meta. (No cambió con la v5.)

---

*Fuente: `bot_n8n\NOTA-AGENTE-V5-2026-07-07.md` (secciones 3–4). Rollback probado; el bot v4.1 queda intacto hasta el PASO 3.*
