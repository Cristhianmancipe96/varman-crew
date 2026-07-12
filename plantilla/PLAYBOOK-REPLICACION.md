# PLAYBOOK — Negocio digital replicable (basado en VarMan Crew)

**Qué es:** la receta completa para montar, para CUALQUIER negocio de productos, el mismo sistema de VarMan Crew: tienda web + app de inventario/caja + bot de ventas por WhatsApp, todo con costo cercano a $0/mes. Escrito para que una sesión de Claude lo ejecute de punta a punta con el dueño solo supervisando.

**Documento vivo.** Los detalles técnicos de cada capa están en los módulos (los llenan los agentes):

- `01-web.md` — tienda web (Cloudflare Pages + Firestore)
- `02-app.md` — app de inventario/ventas/caja/pedidos (PWA React + Firebase)
- `03-bot.md` — bot de WhatsApp (n8n + Meta Cloud API + Gemini)
- `04-infra.md` — servidor (VM Google Cloud), Docker, Caddy, dominio, backups
- `LECCIONES-DEPLOY-REAL-2026-07.md` — **gotchas del primer deploy real** (task runner en VM chica, `.env` no recarga sin `--force-recreate`, dedup por `message_id`, subir archivos a la VM, banco de respuestas). **Léelo ANTES de replicar el deploy** para no repetir los tropiezos.

---

## 1. Variables del negocio (rellenar ANTES de empezar)

| Variable | Ejemplo VarMan | Nuevo negocio |
|---|---|---|
| Nombre comercial | VarMan Crew | |
| Producto y categorías | Zapatos: deportivas/casuales/urbanas | |
| Logo + colores | imagenes varman/ | |
| Inventario inicial (Excel) | BASE GENERAL.xlsx (80 refs) | |
| Catálogo público (refs + fotos + precios) | 33 refs, 66 fotos | |
| Métodos de pago | Nequi + Daviplata + Bre-B | |
| Número WhatsApp humano | 320 225 0619 | |
| Número WhatsApp bot (SIM nueva) | 304 291 6972 | |
| Correo del negocio (Google nuevo) | varmansneakersandclothes@gmail.com | |
| Socios/roles (correos para la app) | 2 socios + vendedor | |
| Documento legal para Meta (RUT) | RUT persona natural de un socio | |
| Tono del bot | Cercano, colombiano, vos/tú | |

## 2. Arquitectura (la misma siempre)

Cliente → **Tienda web** (Cloudflare Pages, gratis) → botón WhatsApp → **Bot n8n** (Meta Cloud API + Gemini gratis) → pedido en **Firestore** → aparece en la **App de inventario** (Cloudflare Pages + Firebase, gratis) → el equipo verifica pago y despacha. Todo comparte UN proyecto Firebase (`tiendas/{negocio}/...`).

Principios que hicieron funcionar esto (no negociables al replicar):
- Bot en número NUEVO; el número humano no se toca ni se migra.
- Lo crítico del pedido con botones/listas de WhatsApp; la IA (Gemini gratis) solo para lenguaje libre.
- El bot NUNCA adivina (equivalencias, stock): lo que no sabe, lo verifica un humano.
- Firestore es la única base de datos (web, app y bot leen/escriben lo mismo).
- No se necesita Verificación de Negocio de Meta para OPERAR (250 conv/24h alcanza) — pero SÍ para PUBLICAR la app. Iniciarla temprano (~2 días).
- Fase 2 (pasarela Wompi, catálogo nativo, Messenger/IG) jamás bloquea el lanzamiento.

## 3. Fases y orden (cronología probada con VarMan)

**Fase 0 — Cuentas (día 1, dueño con Claude en el navegador):** correo Google del negocio; Firebase (proyecto nuevo, Firestore + Auth con los correos del equipo); Cloudflare (gratis); Meta: portafolio comercial + app de desarrollador con caso de uso WhatsApp (NUNCA agregar otros casos de uso: no se pueden quitar) + usuario del sistema con token permanente; Gemini API key (nivel gratis); SIM nueva para el bot (jamás registrarla en la app de WhatsApp).

**Fase 1 — Datos (día 1-2):** Excel del inventario → importar a la app. Definir catálogo público (subconjunto con fotos/precios).

**Fase 2 — Web + App (días 2-5):** clonar y rebrandear web y app (módulos 01 y 02: ahí está qué es genérico y qué se cambia). Publicar en Cloudflare Pages. Página /privacidad OBLIGATORIA (Meta la exige para publicar la app).

**Fase 3 — Bot (días 3-8, en paralelo con 2):** n8n local + túnel Cloudflare para desarrollar CON EL NÚMERO DE PRUEBA gratis de Meta (no hace falta la SIM para construir); workflows del módulo 03 (eco → catálogo → Gemini → pedido → pagos → handoff); pruebas offline.

**Fase 4 — Verificación y publicación Meta (iniciar día 2-3, corre en paralelo):** verificación del negocio (documento fiscal, datos LETRA POR LETRA como el documento) → publicar app → probar bot real con número de prueba.

**Fase 5 — EL CORTE (un día, ~semana 2):** migrar n8n a la VM con dominio directo (módulo 04: VM GCP + Caddy, sin túnel), registrar la SIM en Cloud API (cambia el Phone Number ID), botón de la web y bios al número del bot. Runbook con rollback en `bot_n8n\briefs\RUNBOOK-CORTE.md`.

**Fase 6 — Lanzamiento (días 1-2 post-corte orgánico; pauta después):** orgánico primero; pauta click-to-WhatsApp solo con catálogo real y bot probado (kit en `web\marketing\`).

## 4. División de trabajo (el modelo que funcionó)

- **Dueño:** decisiones, cuentas/identidad (todo lo que pide teléfono/documento/2FA), fotos y precios, dinero.
- **Cowork (Claude, esta herramienta):** PM del proyecto, tareas de navegador (Meta, Firebase, Cloudflare, Google Cloud), auditoría, briefs.
- **Claude Code (terminal, hasta 4 agentes en paralelo):** todo el código. Regla: un agente = una carpeta; contratos por escrito entre capas (ver briefs de VarMan como ejemplo: `BRIEF-4AGENTES-2026-07-06.md` y `BRIEF-RONDA2-2026-07-06.md`).

## 5. Costos reales

Dominio ~US$5-12/año (único costo fijo). Cloudflare Pages, Firebase (nivel gratis), Google Cloud e2-micro (always free), Gemini gratis, WhatsApp Cloud API (conversaciones entrantes gratis; 250 iniciadas/24h sin verificación): $0/mes. SIM prepago local. Pauta: opcional, desde ~15-20k COP/día.

## 6. Lecciones aprendidas (errores que NO se repiten)

1. OneDrive + varias sesiones editando lo mismo = archivos perdidos. Un agente = una carpeta, siempre.
2. n8n por npm/pnpm en Windows es frágil (parches manuales). Al replicar: Docker desde el día 1 si se puede.
3. El token de WhatsApp solo como header `Authorization: Bearer` (en URL da error 190).
4. Túnel temporal de Cloudflare cambia de URL en cada reinicio → túnel nombrado lo antes posible.
5. Netlify se queda sin créditos → Cloudflare Pages directo.
6. Modelos Gemini se retiran sin aviso (gemini-1.5-flash murió) → modelo en variable de entorno, con fallback si la IA falla.
7. Los casos de uso de una app Meta no se pueden quitar → app nueva SOLO con WhatsApp.
8. Verificación de Meta: motivo #1 de rechazo es que el nombre no coincida carácter por carácter con el documento.
9. Import de workflows por CLI siempre con n8n apagado (lock de SQLite).
10. Datos precargados con "ancla" verificada (saldo de caja real a una fecha) evitan discusiones contables después.

## 7. Checklist de replicación exprés

- [ ] Tabla de variables (sección 1) completa
- [ ] Fase 0: cuentas creadas, credenciales guardadas en carpeta privada del proyecto
- [ ] Excel de inventario recibido e importado
- [ ] Web rebrandeada y publicada (+/privacidad)
- [ ] App rebrandeada y publicada, equipo puede entrar
- [ ] Bot: eco funcionando con número de prueba
- [ ] Bot completo pasa pruebas offline
- [ ] Verificación Meta enviada / aprobada / app publicada
- [ ] E2E con número de prueba OK
- [ ] EL CORTE ejecutado (runbook)
- [ ] Lanzamiento orgánico → pauta

---
*Creado 2026-07-06 por Cowork (PM). Los módulos 01-04 los documentan los agentes de Claude Code (brief ronda 2). Actualizar este playbook con cada lección nueva.*
