# NOTA AGENTE WEB/APP — 2026-07-09

**Ámbito tocado:** `web\generar-web.ps1`, `app\app.jsx`, `app\reglas-firestore.txt` y esta
nota. No se tocó `bot_n8n\` (es de otro agente); el esquema de pedidos no cambió (la app
solo sigue leyendo/escribiendo lo de siempre, ver "Contratos" abajo).

## Tarea 1 — Número del bot en la web ✔ (bug corregido, nada que republicar)

- `web/publicar/index.html` (el que se publica de verdad) **ya tenía** el número del bot
  correcto: `WHATSAPP_NUMERO = '573042916972'` (línea ~2064), usado por el FAB y todos los
  botones "Pedir". No había nada que cambiar ahí.
- **Bug encontrado y corregido:** `web/generar-web.ps1` (líneas 231 y 258) todavía tenía el
  número viejo `573202250619` hardcodeado. Si alguien vuelve a correr ese script, iba a
  pisar el sitio con el número equivocado. Ya quedó en `573042916972`.
- **Aviso importante:** `generar-web.ps1` es un generador viejo/desconectado — apunta a
  carpetas que ya no existen (`web-tienda\`, `Proyecto_zapatosfotos catalogo\Fotos Junio`)
  y su salida NO es `web/publicar/index.html`. No se puede "correr" hoy (fallaría por
  carpetas faltantes) y aunque corriera no tocaría el sitio publicado. El fix solo previene
  que alguien lo reactive por error en el futuro con el número viejo adentro.
- **No hace falta volver a subir la web** por esta tarea: `web/publicar/` no cambió.

## Tarea 2 — Ocultar pedidos de prueba (pestaña Pedidos) ✔

El dueño pidió una forma de sacar de la vista los pedidos de prueba. Ya existían "Anular"
y "Eliminar venta" para **ventas**, pero nada para **pedidos** — se agregó:

- Botón **"🙈 Ocultar pedido (de prueba)"** en el detalle de cada pedido, **solo visible
  para socios** (mismo criterio que "Anular venta": `esSocio`). Pide confirmación antes de
  ocultar.
- Al ocultar: el pedido desaparece de todos los filtros normales (Por verificar,
  Verificados, Enviados, Entregados, Cancelados, Todos) y del globito "N nuevos" de la
  barra de navegación. Aparece un filtro nuevo **"Ocultos (N)"** — solo visible si hay algo
  oculto y solo para socios — donde se puede abrir el pedido y tocar **"👁️ Mostrar de
  nuevo"** para deshacerlo en cualquier momento.
- **No es lo mismo que "Cancelar pedido"**: cancelar es un estado real del flujo (queda
  visible en el historial como Cancelado); ocultar es solo para que un pedido de prueba no
  estorbe — no representa nada del negocio real.
- **Decisión de diseño (por qué no toqué el pedido del bot):** el pedido lo escribe el bot
  y su esquema está congelado (`bot_n8n\briefs\CAMBIOS-PEDIDOS.md`); la app solo debía
  modificar `estado`/`notas`/`actualizado`. Para no tocar ese contrato ni pedir un cambio
  de esquema, "ocultar" NO escribe nada en el documento del pedido: se guarda en una
  colección **nueva y separada**, `pedidosOcultos` (id = id del pedido, con motivo, quién
  y cuándo lo ocultó). Reversible, y el bot ni se entera de que existe.

### Reglas de Firestore (Cristhian: hay que volver a pegarlas)

`app/reglas-firestore.txt` tiene una entrada nueva para `pedidosOcultos`, protegida igual
que la Caja (solo los dos socios pueden leer/escribir esa colección). Sin esta regla,
ocultar/mostrar pedidos fallaría con un error de permisos para cualquiera (socio incluido).
Hay que pegar el bloque completo de nuevo en la consola de Firebase (los pasos exactos
están dentro del mismo archivo `reglas-firestore.txt`, y resumidos abajo).

## Cómo se probó (sin tocar la nube real)

Banco de pruebas local con un **Firestore simulado en memoria** (2 pedidos de ejemplo) para
no arriesgar datos de producción. Verificado en navegador, sin errores de consola:

- El botón "Ocultar pedido" solo aparece para socios.
- Ocultar → toast de confirmación, el pedido desaparece de "Por verificar"/"Todos", aparece
  el filtro "Ocultos (1)", y el globito de la navegación baja de 1 a 0 (ya no cuenta el
  oculto).
- Filtro "Ocultos" → se ve el pedido oculto; "Mostrar de nuevo" lo devuelve a todos los
  filtros y el contador de navegación vuelve a subir.
- El documento del pedido en sí nunca se modificó (se verificó que solo se creó/borró el
  doc en `pedidosOcultos`).

## Contratos (sin novedad para el Agente V6/bot)

La app sigue sin escribir nada nuevo en `pedidos`; `pedidosOcultos` es una colección propia
de la app que el bot nunca lee ni escribe. No hace falta ningún cambio en
`CAMBIOS-PEDIDOS.md`.

---

## Pendientes de Cristhian (pasito a pasito)

### 1. Pegar las reglas de Firestore actualizadas (2 minutos, obligatorio para que "Ocultar" funcione)

1. Entra a https://console.firebase.google.com → proyecto **varman-crew**.
2. Menú izquierdo: **Firestore Database** → pestaña **Reglas** (Rules).
3. Abre el archivo `app\reglas-firestore.txt` en este proyecto, copia TODO el bloque entre
   las líneas de guiones (`----`) y pégalo reemplazando lo que había.
4. Botón **Publicar** (Publish).

### 2. Volver a subir la app (para ver el botón "Ocultar pedido")

1. Entra a https://dash.cloudflare.com → **Workers & Pages** → proyecto **varmanapp**.
2. Pestaña **Deployments** → botón **Create deployment**.
3. Arrastra la carpeta `app\` COMPLETA a la zona de subida (con `vendor\` incluida).
4. **Save and Deploy**. En ~1 minuto queda en varmanapp.pages.dev.
5. En el celular: cerrar y volver a abrir la app (o refrescar) para ver lo nuevo.

### 3. La web (`web/publicar/`) — NO hace falta volver a subirla

El número del bot ya estaba bien en el sitio publicado; el fix de hoy fue solo en un script
viejo que no se usa. Si en algún momento sí cambias algo en `web/publicar/`, el paso es el
mismo de siempre: arrastrar `web/publicar/` a Cloudflare Pages, proyecto **varmancrew**.

*Agente WEB/APP (Claude Code) — 2026-07-09.*
