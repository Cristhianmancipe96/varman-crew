# Lecciones de deploy REAL — Bot WhatsApp (n8n en VM chica) · jul 2026

Aprendizajes del **primer deploy real** de VarMan Crew (bot v6 en producción), para replicar en el
próximo negocio **sin repetir los tropiezos**. Parte del playbook: ver `PLAYBOOK-REPLICACION.md`,
`03-bot.md`, `04-infra.md`.

## Infra / VM (e2-micro, 1 GB — la opción más barata de GCP)
1. **El JS Task Runner de n8n 2.x se satura en la e2-micro.** Síntoma en `docker logs varman-n8n`:
   `Task ... rejected by Runner with reason "Offer expired – not accepted within validity window"`
   + `Failed to connect to n8n task broker ... 403 grant token`. Efecto: los nodos Code (el cerebro
   del bot) fallan o caen a fallback intermitente → "el bot no aplica los cambios". **Fix:** subir
   `N8N_RUNNERS_GRANT_TOKEN_TTL` (ej. `300`) en el `.env` + `docker compose up -d --force-recreate n8n`.
   Complemento: un **fast-path** que no llame al LLM en cada mensaje (baja la carga).
2. **`importar-workflows.sh` se cuelga en el paso "activar/desactivar"** porque abre un contenedor
   `docker compose run --rm` por comando (pesado en 1 GB). Termínalo a mano, con n8n **detenido**:
   `docker compose run --rm --no-deps -u node n8n publish:workflow --id=<ID>` (activar) y
   `unpublish:workflow --id=<ID>` (desactivar los demás).
3. **n8n 2.x deprecó `update:workflow --active`** → usar `publish:workflow` / `unpublish:workflow`.
   Actualizar los scripts de deploy.
4. **`docker compose up -d` NO recarga el `.env` si el contenedor ya existe** (dice "up to date").
   Para cargar variables nuevas: **`docker compose up -d --force-recreate n8n`**. Verifica con
   `docker exec varman-n8n printenv | grep MI_VAR`.
5. **n8n tarda 3-5 min en arrancar** en la e2-micro (el webhook ~1 min más). Correr
   `verificar-salud.sh` antes da falsos fallos. Esperar. Errores `Failed to refresh MCP registry
   (api.n8n.io)` = ruido, ignorar.

## `.env` / credenciales
6. **El `.env` de la VM es de PRODUCCIÓN — NUNCA sobrescribirlo con el local.** Solo AGREGAR
   variables nuevas (el compose usa `env_file`, así toda var del `.env` llega al contenedor).
7. **Al pegar una llave sobre un placeholder con prefijo** (`WOMPI_PUB_KEY=pub_test_xxxx`) es fácil
   dejar el **prefijo doble** (`pub_test_pub_test_...`) → llave inválida. Verifica el formato; fix:
   `sed -i 's/pub_test_pub_test_/pub_test_/' .env`.
8. **Comandos `sed` largos con `;` se rompen al pegar** en la consola web → usa varios `sed` cortos,
   uno por línea.
9. Las **llaves secretas** (privada de la pasarela, tokens) las pone el DUEÑO en el `.env`, no el
   asistente (regla de credenciales financieras). `.gitignore` desde el día 1: `credenciales/`,
   `**/.env`, service-account `*.json`, `*.tar.gz`, `*PRIVADO*.txt`.

## Subir archivos a la VM
10. **Lo más simple: el SSH del navegador de GCP tiene botón ⚙ → "Subir archivo"** (directo PC→VM).
    Más fácil que Cloud Shell + `gcloud compute scp`.
11. `gcloud compute ssh <vm>` se corre **desde Cloud Shell** (prompt `@cloudshell`), NO desde dentro
    de la VM (prompt `@<vm>`), o intenta conectarse a sí misma y pide crear una llave SSH.
12. **OneDrive:** el archivo debe tener **check verde** antes de subirlo. Estado "flechas azules"
    (sincronizando) = ya está completo local, se puede subir; solo el ícono de **nube** ☁️ es
    placeholder incompleto (bash/consola leen parcial → usar la herramienta que hidrata).

## Bot conversacional (n8n + LLM)
13. **WhatsApp entrega "at least once" y Meta reintenta el webhook** → respuestas dobles (peor si el
    bot va lento). **Obligatorio: dedup por `message_id`** (doc atómico `botProcesados/{id}`; si ya
    existe = duplicado → ignorar). Barrido diario limpia la colección.
14. **No llamar al LLM en cada mensaje.** Fast-path: si el mensaje es solo el dato esperado (regex),
    procesar directo; consultar el LLM solo si hay texto libre/extra. Ahorra plata, latencia y evita
    respuestas de más.
15. **El escape a humano ("asesor/persona/humano") debe ser determinista por palabras clave**, en
    cualquier estado, SIN depender del LLM ni de un flag — es crítico y no puede fallar.
16. **Cuando el LLM responde una pregunta a mitad de flujo, NO reenviar la plantilla del paso** (si no,
    repite "elige método de pago…" varias veces). Enviar solo la respuesta + mantener los botones.
17. Todo lo nuevo **aditivo + detrás de flag** (si falta la var, el bot = versión anterior EXACTA) +
    **rollback en 1 comando** (respaldo del JSON antes de importar). Tests offline que fuerzan los
    flags en OFF al inicio, así pasan sin importar el `.env` real.
18. **Cumplimiento:** usar el **tier de PAGO del LLM** (no comparte datos para entrenamiento) —
    requisito de los términos de WhatsApp Business Solution para usar IA de terceros como auxiliar.

## Mensajes del NEGOCIO al dueño (avisos, resúmenes) — lección 2026-07-18
20. **El "verde" del orquestador NO es entrega.** WhatsApp Cloud API **acepta** un texto libre fuera
    de la ventana de 24h (devuelve `wamid`, n8n lo pinta verde) y **NO lo entrega** (error 131047).
    El dueño no recibe el resumen diario ni los avisos de venta y **nadie se entera**. Para VarMan
    pasó semanas: el reporte llegaba solo los días siguientes a que el dueño le escribiera al bot.
    - **Regla:** todo mensaje que INICIA el negocio (resumen diario, aviso de pedido, handoff,
      reenvío de fotos) va por **plantilla aprobada**, nunca texto libre. Dejarlo detrás de un flag
      con helper único (`msjAvisoDueno()`) para poder volver atrás.
    - **Gotchas de plantillas de Meta:** no pueden empezar ni terminar en la variable (poner una
      línea fija al final); la variable **no admite saltos de línea** (aplanar a " | "); el **nombre
      y el código de idioma** del `.env` deben ser EXACTOS a los de Meta (`es_CO` ≠ `es`); no
      encender el flag hasta que la plantilla esté **"Activa"** (en revisión → los envíos se rechazan).
    - **Siempre registrar los `statuses: failed`** del webhook en la colección de errores: sin eso,
      un fallo de entrega es 100% invisible y se diagnostica a ciegas.
21. **Antes de teorizar, mirar Executions.** El mismo síntoma ("no me llega el reporte") tenía DOS
    causas: la ventana de 24h **y** ejecuciones atascadas en "Starting soon/Queued" (el trigger de la
    madrugada nunca corrió, cola zombie tras reinicios en una VM de 1 GB). Chequear tras cada
    reinicio que no queden ejecuciones colgadas ("Stop all").
22. **`import:workflow` deja el workflow DESACTIVADO** ("Deactivating workflow…" en su salida) → el
    webhook responde 404 y el bot queda mudo sin que nadie lo note. Hay que **publicarlo** después
    (en n8n 2.x el botón dice **Publish**, no "Active"; por CLI `publish:workflow`). **Correr el
    chequeo de salud SIEMPRE después de importar** — es lo que delata el 404.

## Proceso replicable: el BANCO DE RESPUESTAS
19. **Antes de "pulir" el bot, construir un BANCO DE RESPUESTAS con datos REALES** (conversaciones de
    la campaña + una compra de prueba). Define: reglas de negocio (tallas/conversión, calidad,
    descuentos, envíos, contra entrega, tono local), guiones aprobados por etapa, y la lista de
    arreglos de código que salieron de la prueba real. Eso alimenta `src/textos.js` y los prompts del
    LLM. Es lo que convierte un bot genérico en uno que **vende con la voz del negocio**. Plantilla:
    `bot_n8n/briefs/BANCO-RESPUESTAS-V1-2026-07-09.md` (VarMan).

## Regla de oro del deploy
Primero la versión estable (comportamiento anterior) → salud OK → recién las mejoras con flags, una a
una, probando entre cada una. Nunca meter dos saltos grandes a ciegas en una VM con 1 GB.
