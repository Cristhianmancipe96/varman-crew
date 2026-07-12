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
const VERSION = '6.3';

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
        jsCode: "const out = [];\nfor (const item of $input.all()) {\n  const body = item.json.body || item.json;\n  for (const e of (body.entry || [])) {\n    for (const ch of (e.changes || [])) {\n      const v = ch.value || {};\n      const contacto = (v.contacts && v.contacts[0]) || {};\n      for (const m of (v.messages || [])) {\n        let texto = '';\n        let inter_id = '';\n        let imagen_id = '';\n        if (m.type === 'text') texto = (m.text && m.text.body) || '';\n        else if (m.type === 'image') imagen_id = (m.image && m.image.id) || '';\n        else if (m.type === 'interactive') {\n          const it = m.interactive || {};\n          if (it.type === 'list_reply') inter_id = (it.list_reply && it.list_reply.id) || '';\n          else if (it.type === 'button_reply') inter_id = (it.button_reply && it.button_reply.id) || '';\n        }\n        // Atribucion de pauta (v5): los webhooks de anuncios click-to-WhatsApp\n        // traen m.referral con el source_id del anuncio. Solo llega en el\n        // PRIMER mensaje; el Cerebro lo conserva en la sesion hasta el pedido.\n        let fuente = '';\n        if (m.referral) {\n          const r = m.referral;\n          fuente = 'ctwa:' + (r.source_id || r.ctwa_clid || r.source_url || 'anuncio');\n        }\n        out.push({ json: {\n          wa_id: m.from,\n          nombre: (contacto.profile && contacto.profile.name) || '',\n          tipo: m.type,\n          texto,\n          inter_id,\n          imagen_id,\n          fuente,\n          message_id: m.id\n        }});\n      }\n    }\n  }\n}\nreturn out;"
      },
      id: '40000000-0000-4000-8000-000000000005',
      name: 'Parsear mensaje',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [220, 260]
    },
    {
      parameters: {
        method: 'GET',
        url: 'https://firestore.googleapis.com/v1/projects/varman-crew/databases/(default)/documents/tiendas/varman/catalogo?pageSize=300',
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
    'Parsear mensaje': { main: [[{ node: 'Leer catalogo (Firestore)', type: 'main', index: 0 }]] },
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
