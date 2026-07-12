# BRIEF — Agente WEB · VarMan Crew · 2026-07-08 (rev. 2: a PRODUCCIÓN)

> **Para Claude Code.** Trabajas en paralelo con el Agente V6/FASE2.
> **Tu territorio exclusivo:** `web/publicar/` (y `web/assets/` si hace falta). **NO toques**
> `app/`, `bot_n8n/`, ni los workflows. Tu brief vive en `web/briefs/` (esta carpeta).

## Objetivo (cambió respecto a la rev.1)
Dejar la tienda **publicada en PRODUCCIÓN apuntando al número del bot**, para que Cristhian
pueda pasarle el link a un grupo de amigos, probar el bot de punta a punta y **pulir las
respuestas antes del lanzamiento**. Cristhian hace los deploys; tú dejas el código listo y la
lista de pasos exacta.

## Contexto (estado real 8 jul 2026)
- Web en `web/publicar/`, se publica en Cloudflare Pages (proyecto **varmancrew**,
  `varmancrew.com`).
- `var WHATSAPP_NUMERO` en `web/publicar/index.html` (~línea 2062) **ya está en el número del
  BOT `573042916972`**. No lo cambies.
- Botones "Pedir" + FAB arman `wa.me/<WHATSAPP_NUMERO>?text=Hola! Quiero la Ref …` (v5).
- `privacidad.html` se queda con el número **humano 320** a propósito (consultas legales las
  atiende una persona, no el bot). No lo toques.

## ⚙️ Cómo se probará con amigos (contexto)
**CONFIRMADO (8 jul):** el bot YA recibe mensajes del público — se probó con amigos y responde
todo el flujo y muestra el estado del pedido. Meta no era el freno (la app es de tipo Negocio y,
con datos propios, no necesita publicarse ni verificarse). Por eso:
- La web se publica a producción ya; los amigos piden desde el sitio y prueban el bot de verdad.
- Se recogen las fallas para pulir las respuestas del bot antes de escalar (lo hace el Agente V6).
- Tu trabajo no depende de Meta; solo deja el sitio y la sección de pagos impecables.

## Tareas
1. **Verifica el cableado del 304:** `WHATSAPP_NUMERO === '573042916972'` y que "Pedir", FAB y
   el paso 2 de "¿Cómo comprar?" arman el `wa.me` con ese número. Corrige si algo apunta al 320.
2. **Sección "Métodos de pago" (QR):** agrégala coherente con el design system (variables
   `--surf-*`, `--brand`, patrón `s-label`/`s-title`, iconos Tabler ya cargados — sin CDNs
   nuevos, sin cambiar la CSP). Muestra Nequi / Daviplata / Bre-B con espacio para los **3 QR**
   en `web/publicar/img/pagos/qr-nequi.jpg`, `qr-daviplata.jpg`, `qr-breb.jpg` (Cristhian los
   genera). **Placeholder con `onerror`** que oculte el `<img>` si aún no existe el QR — nunca
   una imagen rota. Respeta EXACTO esos nombres (el bot consume las mismas URLs `PAGO_QR_*`).
3. **Mini-mejora de confianza (opcional, suma para la prueba con amigos):** un texto corto tipo
   "Te responde nuestro asistente por WhatsApp; si necesitas una persona, escribe *asesor*."
   Así los amigos saben que es un bot y prueban el handoff.
4. **Responsive + accesibilidad** de lo nuevo (3 col escritorio → 1 móvil; `alt`; contraste).
5. **Deja lista la publicación:** verifica todo en local y escribe en tu nota el paso único de
   deploy que hará Cristhian (arrastrar `web/publicar/` a Cloudflare Pages → varmancrew).

## Checklist de puesta en producción (lo ejecuta Cristhian, déjalo escrito)
1. **Recepción del bot: ya confirmada** (amigos escriben al 304 y el bot responde). No hace falta
   nada de Meta para publicar.
2. **Deploy web:** arrastrar `web/publicar/` a Cloudflare Pages (proyecto varmancrew).
3. Pasarle el link a los amigos + una pregunta guía ("¿fue claro?, ¿te faltó info?, ¿el pago se
   entendió?"). Recoger las fallas → pulir las respuestas del bot (lo hace el Agente V6).

## Verificación (déjala escrita en tu nota)
- Captura del `wa.me` que arma un botón "Pedir" (debe llevar el 304).
- La sección de pagos carga bien con y sin los QR (fallback OK), sin errores de consola.
- `varmancrew.pages.dev/privacidad` sigue viva (Meta la referencia) y con el 320.

## Entregable
- `web/publicar/` actualizado + `web/NOTA-AGENTE-WEB-2026-07-08.md` (qué cambió, checklist de
  producción, verificación). Lo replicable → `plantilla/01-web.md`.

## Reglas del proyecto
- OneDrive: check verde antes de subir/leer grande. Credenciales jamás a git.
- No romper lo que funciona; el bot v4.1 en producción no se toca desde aquí.
