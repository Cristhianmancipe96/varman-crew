# Guía: actualizar la Callback URL del webhook de WhatsApp en Meta

Actualizado: 2026-07-06 · App: **VarMan Crew** (ID 2168913153950288, modo Desarrollo)
(El ID que circulaba antes tenía un dígito malo; el bueno es ...53950288.)
El webhook ya fue verificado antes y el campo **messages** ya está suscrito.
**Solo hay que cambiar la URL** porque cambió el túnel de Cloudflare.

> **⚠ 2026-07-06 (noche) — LA ÚLTIMA VEZ que se hace esto con túnel:** cuando la VM
> de Google Cloud quede montada (`deploy\GUIA-GCP.md`), la Callback DEFINITIVA es
> **`https://bot.varmancrew.com/webhook/whatsapp`** (URL fija, no cambia nunca más).
> El paso a paso de abajo sirve igual; solo cambia la URL que se pega.

## Antes de empezar

- Asegúrate de que n8n esté corriendo y el túnel activo.
- **Ojo:** tras reiniciar n8n, los webhooks tardan **30–60 segundos** en registrarse.
  Espera un minuto antes de verificar en Meta.

## Paso a paso en developers.facebook.com

1. Entra a **https://developers.facebook.com** e inicia sesión con la cuenta
   de Facebook dueña de la app.
2. Arriba a la derecha, clic en **"Mis apps"** y selecciona **VarMan Crew**.
3. En el **menú lateral izquierdo**, busca **WhatsApp → Configuración**
   (en inglés: *WhatsApp → Configuration*).
   - Si no ves "WhatsApp" en el menú, entra por **Casos de uso → Personalizar →
     Configuración** (*Use cases → Customize → Configuration*). Solo navega:
     **no agregues ni actives ningún caso de uso nuevo**.
4. En la sección **Webhook**, clic en el botón **"Editar"** (*Edit*) junto a la
   URL de devolución de llamada.
   - **Interfaz nueva (vista 2026-07-06):** puede que no haya botón "Editar" —
     en "Casos de uso → Personalizar → Paso 2: Configuración de producción →
     Configurar webhooks" los dos campos se editan directo en la página.
     ⚠ Al modificar la URL, el campo del token se VACÍA: hay que volver a pegar
     el token aunque antes apareciera con puntos. El botón "Verificar y guardar"
     solo se activa cuando ambos campos tienen contenido escrito.
5. Los dos campos se llenan así:
   - **URL de devolución de llamada (Callback URL):** la URL que esté en
     `tunnel-url.txt` + `/webhook/whatsapp`. A 2026-07-06 (tarde) es:
     `https://provider-ward-metropolitan-bond.trycloudflare.com/webhook/whatsapp`
     (cambia en cada reinicio del túnel — verificar siempre `tunnel-url.txt`).
   - **Identificador de verificación (Verify token):** `<VERIFY_TOKEN>`
     (está en el archivo `.env` del proyecto, variable `WEBHOOK_VERIFY_TOKEN`;
     pídeselo a Claude o cópialo de ahí — no lo compartas con nadie).
6. Clic en **"Verificar y guardar"** (*Verify and save*).

Meta enviará en ese momento una petición GET de prueba a la nueva URL con el
token. Si el servidor responde bien (código **200**), la ventana se cierra y
la URL queda guardada. Eso es toda la confirmación que necesitas.

## Cómo confirmar que quedó bien

- La sección Webhook muestra la **nueva URL** (`...trycloudflare.com/webhook/whatsapp`).
- En **"Campos de webhook"** (*Webhook fields*, botón "Administrar"/*Manage*),
  **messages** sigue con la suscripción activa. **No hace falta re-suscribirlo**,
  solo mirar que siga marcado. No cambies nada más ahí.
- Prueba real: envía un mensaje de WhatsApp al número del bot y verifica que
  llegue/responda.

## Si falla la verificación

1. **Error o 404 al pulsar "Verificar y guardar":** casi siempre es que n8n
   acaba de reiniciar. **Espera 1 minuto y vuelve a intentar.**
2. Revisa que la URL esté pegada **completa y sin espacios**, incluyendo el
   `/webhook/whatsapp` del final.
3. Revisa que el token sea **exactamente** el de `WEBHOOK_VERIFY_TOKEN`
   (sin espacios ni comillas). Si no coinciden, Meta rechaza la verificación.
4. Si sigue fallando, abre la URL del túnel en el navegador: si no carga nada,
   el túnel se cayó — avísale a Claude para levantarlo de nuevo.

## Advertencias importantes

- **NO agregues ningún caso de uso** nuevo a la app ni toques los existentes.
- **NO toques nada** relacionado con **eliminar el portafolio de negocio**
  (business portfolio) ni con quitar la app del negocio.
- Solo se cambia la URL del webhook. Nada más.
