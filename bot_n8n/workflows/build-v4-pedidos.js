// ============ BUILD del workflow v4 (bot-whatsapp-v4-pedidos.json) ============
// El código de los nodos Code vive legible en workflows\src\*.js.
// Este script arma el JSON completo del workflow. Correr con:
//   node "workflows\build-v4-pedidos.js"      (desde bot_n8n\)
// Respaldo del JSON anterior en workflows\respaldo\.
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const src = (f) => fs.readFileSync(path.join(DIR, 'src', f), 'utf8');
// Nombre ESTABLE del archivo que se despliega (siempre el mismo → la VM lo
// sobrescribe sin ambigüedad). El nombre no importa a n8n; lo que identifica al
// bot es el `id` de abajo (VarmanBotV4Ped01).
const SALIDA = path.join(DIR, 'bot-varman.json');
// Versión: cada valor nuevo deja su propio respaldo en respaldo/ para rollback.
// Subir SOLO cuando haya un cambio que quieras poder revertir por separado.
const VERSION = '11.1';

const wf = {
  // OJO: el id NO se cambia — importar-workflows.sh de la VM activa por id
  id: 'VarmanBotV4Ped01',
  name: 'Bot WhatsApp VarMan - v6 (v5 + robustez + Wompi + catálogo nativo, todo con flags)',
  active: false,
  nodes: [
    {
      parameters: { httpMethod: 'GET', path: 'whatsapp', responseMode: 'responseNode', options: {} },
      id: '40000000-0000-4000-8000-000000000001',
      name: 'Webhook verificacion (GET)',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2,
      position: [0, 0],
      webhookId: '40000000-0000-4000-8000-000000000001'
    },
    {
      parameters: {
        jsCode: "const q = $input.first().json.query || {};\nconst ok = q['hub.mode'] === 'subscribe' && q['hub.verify_token'] === $env.WEBHOOK_VERIFY_TOKEN;\nreturn [{ json: { body: ok ? q['hub.challenge'] : 'token invalido', statusCode: ok ? 200 : 403 } }];"
      },
      id: '40000000-0000-4000-8000-000000000002',
      name: 'Verificar token',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [220, 0]
    },
    {
      parameters: {
        respondWith: 'text',
        responseBody: '={{ $json.body }}',
        options: { responseCode: '={{ $json.statusCode }}' }
      },
      id: '40000000-0000-4000-8000-000000000003',
      name: 'Responder a Meta',
      type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1.1,
      position: [440, 0]
    },
    {
      parameters: { httpMethod: 'POST', path: 'whatsapp', responseMode: 'onReceived', options: {} },
      id: '40000000-0000-4000-8000-000000000004',
      name: 'Webhook mensajes (POST)',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2,
      position: [0, 260],
      webhookId: '40000000-0000-4000-8000-000000000004'
    },
    {
      parameters: {
        jsCode: "const out = [];\nfor (const item of $input.all()) {\n  const body = item.json.body || item.json;\n  for (const e of (body.entry || [])) {\n    for (const ch of (e.changes || [])) {\n      const v = ch.value || {};\n      const contacto = (v.contacts && v.contacts[0]) || {};\n      for (const m of (v.messages || [])) {\n        let texto = '';\n        let inter_id = '';\n        let imagen_id = '';\n        if (m.type === 'text') texto = (m.text && m.text.body) || '';\n        else if (m.type === 'image') imagen_id = (m.image && m.image.id) || '';\n        else if (m.type === 'interactive') {\n          const it = m.interactive || {};\n          if (it.type === 'list_reply') inter_id = (it.list_reply && it.list_reply.id) || '';\n          else if (it.type === 'button_reply') inter_id = (it.button_reply && it.button_reply.id) || '';\n        }\n        // Atribucion de pauta (v5): los webhooks de anuncios click-to-WhatsApp\n        // traen m.referral con el source_id del anuncio. Solo llega en el\n        // PRIMER mensaje; el Cerebro lo conserva en la sesion hasta el pedido.\n        let fuente = '';\n        // [FUENTE-DETALLE] detalle del referral: titulo del anuncio (headline),\n        // tipo (ad|post) y url. Se emiten SIEMPRE (campos inertes: sin referral\n        // van como strings vacios, nunca se inventa nada) — el Cerebro solo los\n        // usa cuando el flag BOT_FUENTE_DETALLE esta encendido.\n        let fuente_titulo = '';\n        let fuente_tipo = '';\n        let fuente_url = '';\n        if (m.referral) {\n          const r = m.referral;\n          fuente = 'ctwa:' + (r.source_id || r.ctwa_clid || r.source_url || 'anuncio');\n          fuente_titulo = r.headline || '';\n          fuente_tipo = r.source_type || '';\n          fuente_url = r.source_url || '';\n        }\n        out.push({ json: {\n          wa_id: m.from,\n          nombre: (contacto.profile && contacto.profile.name) || '',\n          tipo: m.type,\n          texto,\n          inter_id,\n          imagen_id,\n          fuente,\n          fuente_titulo,\n          fuente_tipo,\n          fuente_url,\n          message_id: m.id\n        }});\n      }\n      // [LOG-FALLOS] (flag BOT_LOG_FALLOS, 2026-07-18): statuses `failed` de\n      // Meta -> item especial que el Cerebro registra en botErrores. Un envio\n      // puede ser 'aceptado' (devuelve wamid, n8n en verde) y aun asi NO\n      // entregarse (ej. ventana de 24h cerrada, codigo 131047 — el caso real\n      // de los resumenes al 320). Con el flag OFF no se emite nada (identico a hoy).\n      if (/^(on|1|true|si|s[ií])$/i.test(String($env.BOT_LOG_FALLOS || '').trim())) {\n        for (const s of (v.statuses || [])) {\n          if (String(s.status) !== 'failed') continue;\n          const err = (s.errors && s.errors[0]) || {};\n          out.push({ json: {\n            tipo_evento: 'fallo_envio',\n            wa_id: '',\n            destinatario: s.recipient_id || '',\n            message_id: s.id || '',\n            error_code: String(err.code || ''),\n            error_title: String(err.title || (err.error_data && err.error_data.details) || '')\n          }});\n        }\n      }\n    }\n  }\n}\nreturn out;"
      },
      id: '40000000-0000-4000-8000-000000000005',
      name: 'Parsear mensaje',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [220, 260]
    },
    {
      // [BUZON] (flag BOT_BUZON, 16-ago-2026) Guarda el mensaje y termina la
      // ejecucion, en vez de contestar de una. Con el flag OFF devuelve los
      // items TAL CUAL: el nodo es transparente y el bot se comporta igual
      // que hoy. Quien junta y responde es "Buzon recoger (cada minuto)".
      parameters: { jsCode: src('buzon-guardar.js') },
      id: '40000000-0000-4000-8000-000000000012',
      name: 'Buzon guardar (BOT_BUZON)',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [330, 120]
    },
    {
      // [BUZON] el que despierta cada minuto a mirar quien ya cumplio su
      // ventana de 45 s. Con el flag OFF devuelve [] sin tocar Firestore.
      parameters: {
        rule: { interval: [{ field: 'minutes', minutesInterval: 1 }] }
      },
      id: '40000000-0000-4000-8000-000000000013',
      name: 'Cada minuto',
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.2,
      position: [0, 1360]
    },
    {
      parameters: { jsCode: src('buzon-recoger.js') },
      id: '40000000-0000-4000-8000-000000000014',
      name: 'Buzon recoger (cada minuto)',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [220, 1360]
    },
    {
      parameters: {
        method: 'GET',
        // [FIX-CATALOGO-PESADO] (barrido r2) este GET corre en CADA mensaje que
        // entra, incluso en turnos que jamás miran el catálogo. Venía en JSON
        // "bonito" (con sangrías) y trayendo TODOS los campos de las 64 refs:
        // ~84 KB por mensaje contra una VM de 1 GB. Con prettyPrint=false y una
        // máscara de los campos que el código realmente lee, baja a ~38 KB
        // (-55%) sin cambiar una sola línea de lógica.
        url: 'https://firestore.googleapis.com/v1/projects/varman-crew/databases/(default)/documents/tiendas/varman/catalogo?pageSize=300&prettyPrint=false'
          + ['ref', 'marca', 'precio', 'orden', 'fotos', 'tallas', 'genero', 'activo', 'cat', 'tag', 'video', 'tallasWeb']
            .map((f) => '&mask.fieldPaths=' + f).join(''),
        options: {}
      },
      id: '40000000-0000-4000-8000-000000000006',
      name: 'Leer catalogo (Firestore)',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [440, 260],
      retryOnFail: true,
      maxTries: 2,
      waitBetweenTries: 2000
    },
    {
      // textos.js (TEXTOS/GEMINI_SISTEMA/T) va pegado ANTES del cerebro:
      // ambos viven en el mismo nodo Code
      parameters: { jsCode: src('textos.js') + '\n' + src('cerebro-v4.js') },
      id: '40000000-0000-4000-8000-000000000007',
      name: 'Cerebro (sesion+pedido+Gemini)',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [660, 260]
    },
    {
      parameters: {
        method: 'POST',
        url: '=https://graph.facebook.com/v21.0/{{ $env.WHATSAPP_PHONE_NUMBER_ID }}/messages',
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: 'Authorization', value: '=Bearer {{ $env.WHATSAPP_TOKEN }}' }
          ]
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: '={{ JSON.stringify($json) }}',
        options: {}
      },
      id: '40000000-0000-4000-8000-000000000008',
      name: 'Enviar a WhatsApp',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [880, 260],
      // hardening: reintento 1x y, si aun asi falla, el item sale por la
      // salida de error hacia el log en Firestore (no tumba el workflow)
      retryOnFail: true,
      maxTries: 2,
      waitBetweenTries: 2000,
      onError: 'continueErrorOutput'
    },
    {
      parameters: { jsCode: src('log-error-envio.js') },
      id: '40000000-0000-4000-8000-000000000009',
      name: 'Log error envio (Firestore)',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1100, 400]
    },
    {
      parameters: {
        rule: { interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 3, triggerAtMinute: 15 }] }
      },
      id: '40000000-0000-4000-8000-00000000000a',
      name: 'Cada dia 3:15am',
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.2,
      position: [0, 560]
    },
    {
      // v5: el barrido también arma el resumen diario al 320 → necesita los
      // TEXTOS, así que textos.js va pegado antes (igual que en el Cerebro)
      parameters: { jsCode: src('textos.js') + '\n' + src('limpiar-sesiones.js') },
      id: '40000000-0000-4000-8000-00000000000b',
      name: 'Limpiar sesiones caducadas',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [220, 560]
    },
    {
      // v5 backlog 10-12: trigger HORARIO para carrito abandonado y para las
      // notificaciones que deja la app (reseña post-entrega, guía de envío)
      parameters: {
        rule: { interval: [{ field: 'hours', hoursInterval: 1 }] }
      },
      id: '40000000-0000-4000-8000-00000000000c',
      name: 'Cada hora',
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.2,
      position: [0, 760]
    },
    {
      parameters: { jsCode: src('textos.js') + '\n' + src('notificaciones.js') },
      id: '40000000-0000-4000-8000-00000000000d',
      name: 'Recordatorios y avisos (cada hora)',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [220, 760]
    },
    {
      // v7 MODO-CONVERSA: trigger cada 5 min para el rescate de los ~3 minutos
      // de silencio. Con BOT_MODO_CONVERSA apagado el código devuelve [] sin
      // tocar Firestore (el nodo existe pero queda inerte: cero mensajes).
      parameters: {
        rule: { interval: [{ field: 'minutes', minutesInterval: 5 }] }
      },
      id: '40000000-0000-4000-8000-000000000010',
      name: 'Cada 5 min',
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.2,
      position: [0, 1160]
    },
    {
      parameters: { jsCode: src('textos.js') + '\n' + src('rescate-conversa.js') },
      id: '40000000-0000-4000-8000-000000000011',
      name: 'Rescate conversa (cada 5 min)',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [220, 1160]
    },
    {
      // v6 Wompi: webhook de confirmación de pago. onReceived → responde 200
      // de inmediato (Wompi solo necesita un 2xx). El código verifica la firma.
      parameters: { httpMethod: 'POST', path: 'wompi', responseMode: 'onReceived', options: {} },
      id: '40000000-0000-4000-8000-00000000000e',
      name: 'Wompi webhook (POST)',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2,
      position: [0, 960],
      webhookId: '40000000-0000-4000-8000-00000000000e'
    },
    {
      // textos.js va pegado antes (usa TEXTOS/T para el aviso al 320)
      parameters: { jsCode: src('textos.js') + '\n' + src('wompi-webhook.js') },
      id: '40000000-0000-4000-8000-00000000000f',
      name: 'Wompi webhook (procesa)',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [220, 960]
    }
  ],
  connections: {
    'Webhook verificacion (GET)': { main: [[{ node: 'Verificar token', type: 'main', index: 0 }]] },
    'Verificar token': { main: [[{ node: 'Responder a Meta', type: 'main', index: 0 }]] },
    'Webhook mensajes (POST)': { main: [[{ node: 'Parsear mensaje', type: 'main', index: 0 }]] },
    // [BUZON] el mensaje pasa por el buzon antes de llegar al catalogo. Con
    // BOT_BUZON OFF el nodo devuelve los items tal cual y la cadena es
    // exactamente la de siempre (Parsear -> catalogo -> Cerebro).
    'Parsear mensaje': { main: [[{ node: 'Buzon guardar (BOT_BUZON)', type: 'main', index: 0 }]] },
    'Buzon guardar (BOT_BUZON)': { main: [[{ node: 'Leer catalogo (Firestore)', type: 'main', index: 0 }]] },
    // [BUZON] la otra entrada al mismo camino: los mensajes ya juntados entran
    // al catalogo y al Cerebro con la MISMA forma que trae "Parsear mensaje".
    'Cada minuto': { main: [[{ node: 'Buzon recoger (cada minuto)', type: 'main', index: 0 }]] },
    'Buzon recoger (cada minuto)': { main: [[{ node: 'Leer catalogo (Firestore)', type: 'main', index: 0 }]] },
    'Leer catalogo (Firestore)': { main: [[{ node: 'Cerebro (sesion+pedido+Gemini)', type: 'main', index: 0 }]] },
    'Cerebro (sesion+pedido+Gemini)': { main: [[{ node: 'Enviar a WhatsApp', type: 'main', index: 0 }]] },
    // salida 0 = exito (no va a ningun lado), salida 1 = error -> log
    'Enviar a WhatsApp': { main: [[], [{ node: 'Log error envio (Firestore)', type: 'main', index: 0 }]] },
    'Cada dia 3:15am': { main: [[{ node: 'Limpiar sesiones caducadas', type: 'main', index: 0 }]] },
    // v5: el barrido devuelve el resumen diario (payload de mensaje) → al 320
    'Limpiar sesiones caducadas': { main: [[{ node: 'Enviar a WhatsApp', type: 'main', index: 0 }]] },
    // v5 backlog 10-12: recordatorios y avisos → al cliente
    'Cada hora': { main: [[{ node: 'Recordatorios y avisos (cada hora)', type: 'main', index: 0 }]] },
    'Recordatorios y avisos (cada hora)': { main: [[{ node: 'Enviar a WhatsApp', type: 'main', index: 0 }]] },
    // v7 modo conversa: rescate a los ~3 min de silencio → al cliente
    'Cada 5 min': { main: [[{ node: 'Rescate conversa (cada 5 min)', type: 'main', index: 0 }]] },
    'Rescate conversa (cada 5 min)': { main: [[{ node: 'Enviar a WhatsApp', type: 'main', index: 0 }]] },
    // v6 Wompi: webhook → procesa (verifica firma + confirma pedido) → avisa al 320
    'Wompi webhook (POST)': { main: [[{ node: 'Wompi webhook (procesa)', type: 'main', index: 0 }]] },
    'Wompi webhook (procesa)': { main: [[{ node: 'Enviar a WhatsApp', type: 'main', index: 0 }]] }
  },
  settings: { executionOrder: 'v1', timezone: 'America/Bogota' },
  pinData: {}
};

const json = JSON.stringify(wf, null, 2) + '\n';
fs.writeFileSync(SALIDA, json, 'utf8');
// respaldo versionado (vive en respaldo/, que el import NO toca) para rollback
const backup = path.join(DIR, 'respaldo', 'bot-varman-v' + VERSION + '.json');
fs.writeFileSync(backup, json, 'utf8');
console.log('OK ->', SALIDA, '(' + fs.statSync(SALIDA).size + ' bytes, ' + wf.nodes.length + ' nodos)');
console.log('     respaldo v' + VERSION + ' ->', backup);

// --- copia "PARA SUBIR" en el Escritorio (deploy manual del dueño) ---
// El dueño sube el bot a la VM por el navegador (SSH de GCP). Problema
// recurrente: hay varios bot-varman.json viejos regados y a veces sube uno
// viejo por error. Solución: dejar en el Escritorio UN solo archivo con nombre
// FECHADO e inconfundible (el más nuevo es SIEMPRE el correcto) y borrar los
// "PARA-SUBIR" anteriores para que no quede ninguno viejo que confunda.
// En la VM se renombra a bot-varman.json (ver PASOS-SUBIR-CATALOGO-WEB.txt).
//
// [2026-07-25] Se probó dejar la copia llamada ya `bot-varman.json` para
// ahorrarse el renombrado en la VM y el DUEÑO LO DESCARTÓ: con ese nombre la
// subida le falla siempre (subir un archivo que ya existe con ese mismo nombre
// da guerra en la consola SSH y se presta para confundirlo con los viejos).
// Se mantiene el nombre FECHADO. Lo que sí queda como paso obligatorio de la
// guía es verificar el archivo DESPUÉS de moverlo y ANTES de importar
// (`grep -c mancipiola`): ese es el chequeo que caza el error de verdad, y
// funciona con cualquier nombre.
// Va en try/catch: si no hay Escritorio (loop/CI), el build NO se rompe.
try {
  const os = require('os');
  const home = os.homedir();
  const escritorio = [path.join(home, 'OneDrive', 'Desktop'), path.join(home, 'Desktop')]
    .find((d) => fs.existsSync(d));
  if (escritorio) {
    for (const f of fs.readdirSync(escritorio)) {
      if (/^bot-varman-PARA-SUBIR-.*\.json$/i.test(f)) fs.unlinkSync(path.join(escritorio, f));
    }
    const hoy = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const destino = path.join(escritorio, 'bot-varman-PARA-SUBIR-v' + VERSION + '-' + hoy + '.json');
    fs.writeFileSync(destino, json, 'utf8');
    console.log('     >>> SUBE ESTE a la VM ->', destino);
  }
} catch (e) {
  console.log('     (aviso: no pude dejar la copia en el Escritorio — ' + e.message + ')');
}

// --- recordatorio del error de deploy que costó dos tardes (25-jul) ---
// El archivo subido por la consola SSH queda en ~, NO en workflows/. Sin el
// `mv`, n8n importa el bot-varman.json VIEJO y TODO sale en verde: import sin
// errores, verificar-salud 7/7, workflow publicado… y el bot idéntico a antes.
// No hay ninguna señal. Por eso el build lo recuerda con el TAMAÑO exacto, que
// sirve para cualquier versión (no depende de buscar una palabra concreta).
console.log('');
console.log('  ┌───────────────────────────────────────────────────────────────┐');
console.log('  │  ANTES DE IMPORTAR EN LA VM, COMPRUEBA QUE MOVISTE EL NUEVO:  │');
console.log('  │    ls -l ~/varman-bot/workflows/bot-varman.json               │');
console.log('  │  Tiene que pesar EXACTAMENTE ' + String(Buffer.byteLength(json)).padEnd(33) + '│');
console.log('  │  Si pesa otra cosa, el `mv` no se hizo y vas a importar el    │');
console.log('  │  viejo: el import sale en verde y el bot NO cambia. Pasó 2x.  │');
console.log('  └───────────────────────────────────────────────────────────────┘');










