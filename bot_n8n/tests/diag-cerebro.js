// DIAGNÓSTICO de un solo turno del CEREBRO IA. No es un test: sirve para ver POR QUÉ
// el cerebro no toma el turno. Imprime: valor de los flags, el número que evalúa la
// allowlist, si SALIÓ la llamada del cerebro a Gemini (se reconoce porque su
// system_instruction lleva el CUADERNO), qué devolvió Gemini, y qué mensajes salieron.
//   node "tests\diag-cerebro.js"     (desde bot_n8n\)
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..');
const FS_BASE = 'https://firestore.googleapis.com/v1/projects/varman-crew/databases/(default)/documents';
const TEST_WA = '573999000111';

const ENV = {};
for (const ln of fs.readFileSync(path.join(DIR, '.env'), 'utf8').split(/\r?\n/)) {
  const m = ln.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) ENV[m[1]] = m[2];
}
ENV.BOT_MSGS_POR_MIN = '999';
ENV.BOT_CEREBRO_IA = 'on';
ENV.BOT_CEREBRO_IA_SOLO = TEST_WA;
ENV.BOT_MODO_CONVERSA = 'on';
ENV.BOT_FUENTE_DETALLE = 'on';
delete ENV.BOT_TEXTOS_SOCIO;

const wf = JSON.parse(fs.readFileSync(path.join(DIR, 'workflows', 'bot-varman.json'), 'utf8'));
const codigoCerebro = wf.nodes.find((n) => n.name.startsWith('Cerebro')).parameters.jsCode;
console.log('Nodo Cerebro: ' + (codigoCerebro.length / 1024).toFixed(0) + ' KB');
console.log('¿El CUADERNO está DENTRO del nodo?: ' + (codigoCerebro.indexOf('CUADERNO DEL ASESOR') >= 0 ? 'SÍ' : '*** NO ***'));
console.log('BOT_CEREBRO_IA=' + ENV.BOT_CEREBRO_IA + ' · SOLO=' + ENV.BOT_CEREBRO_IA_SOLO + ' · DUENO=' + ENV.OWNER_WHATSAPP);
console.log('');

async function httpReal(opts) {
  const init = { method: opts.method || 'GET', headers: Object.assign({}, opts.headers) };
  if (opts.body !== undefined) {
    init.body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
    if (typeof opts.body !== 'string' && !init.headers['Content-Type']) init.headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(opts.url, init);
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    const err = new Error('HTTP ' + res.status + ' ' + opts.url.slice(0, 90) + ' :: ' + t.slice(0, 300));
    err.status = res.status;
    throw err;
  }
  if (opts.encoding === 'arraybuffer') return Buffer.from(await res.arrayBuffer());
  const txt = await res.text();
  try { return JSON.parse(txt); } catch (e) { return txt; }
}

const catalogoFixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalogo-fixture.json'), 'utf8'));
const enviados = [];
let nGem = 0;

async function http(opts) {
  const url = opts.url || '';
  if (url.includes('graph.facebook.com')) {
    if (url.endsWith('/messages')) { enviados.push(opts.body); return { messages: [{ id: 'wamid.mock' }] }; }
    return { url: 'https://x/fake', mime_type: 'image/jpeg' };
  }
  if (url.includes('/tiendas/varman/catalogo')) return catalogoFixture;
  if (url.includes('generativelanguage.googleapis.com')) {
    nGem++;
    const b = opts.body || {};
    let sysTxt = '';
    try { sysTxt = b.system_instruction.parts[0].text || ''; } catch (e) {}
    const esCerebro = sysTxt.indexOf('CUADERNO DEL ASESOR') >= 0;
    const nHerr = (((b.tools || [])[0] || {}).functionDeclarations || []).length;
    console.log('  → GEMINI #' + nGem + '  quien=' + (esCerebro ? '*** CEREBRO ***' : 'clasificador/asistente viejo')
      + '  sysPrompt=' + sysTxt.length + ' chars  herramientas=' + nHerr
      + '  modelo=' + (url.split('/models/')[1] || '').split(':')[0]
      + '  thinking=' + (b.generationConfig && b.generationConfig.thinkingConfig ? 'off(0)' : 'no-enviado'));
    try {
      const r = await httpReal(opts);
      const parts = (((r.candidates || [])[0] || {}).content || {}).parts || [];
      const txt = parts.filter((p) => p && p.text).map((p) => p.text.trim()).join(' | ');
      const tools = parts.filter((p) => p && (p.functionCall || p.function_call))
        .map((p) => (p.functionCall || p.function_call).name);
      const fin = ((r.candidates || [])[0] || {}).finishReason || '';
      console.log('     ← texto(' + txt.length + '): ' + (txt.slice(0, 220) || '(VACÍO)'));
      console.log('       herramientas pedidas: ' + (tools.length ? tools.join(', ') : '(ninguna)') + '  finishReason=' + fin);
      if (r.usageMetadata) console.log('       tokens: in=' + r.usageMetadata.promptTokenCount + ' out=' + (r.usageMetadata.candidatesTokenCount || 0) + ' pensando=' + (r.usageMetadata.thoughtsTokenCount || 0));
      return r;
    } catch (e) {
      console.log('     ← *** ERROR HTTP: ' + String(e.message).slice(0, 300));
      throw e;
    }
  }
  return httpReal(opts);
}

(async () => {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const fn = new AsyncFunction('$input', '$env', '$json', '$', 'require', codigoCerebro);
  const parsed = {
    wa_id: TEST_WA, nombre: 'Diag', tipo: 'text', texto: 'muéstrame unas Vans',
    inter_id: '', imagen_id: '', fuente: '', fuente_titulo: '', fuente_tipo: '', fuente_url: '',
    message_id: 'wamidDIAG_' + Date.now()
  };
  console.log('cliente> ' + parsed.texto);
  let out;
  try {
    out = await fn.call({ helpers: { httpRequest: http } },
      { all: () => [], first: () => ({ json: {} }) }, ENV, catalogoFixture,
      () => ({ item: { json: parsed } }), require);
  } catch (e) {
    console.log('*** EL NODO LANZÓ: ' + e.message);
    console.log(String(e.stack || '').split('\n').slice(0, 6).join('\n'));
    return;
  }
  console.log('');
  console.log('MENSAJES QUE SALIERON (' + (out || []).length + '):');
  for (const m of (out || [])) {
    const j = m.json || m;
    const cuerpo = (j.text && j.text.body) || (j.image && j.image.caption) || ('[' + j.type + ']');
    console.log('   bot> ' + String(cuerpo).replace(/\n/g, ' / ').slice(0, 200));
  }
  console.log('');
  console.log('Llamadas a Gemini: ' + nGem);
  // limpieza de la sesión de prueba
  try {
    const tok = await (async () => {
      const crypto = require('crypto');
      const sa = JSON.parse(Buffer.from(ENV.FIREBASE_SA_B64, 'base64').toString('utf8'));
      const now = Math.floor(Date.now() / 1000);
      const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const h = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
      const c = b64u(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
      const s = crypto.createSign('RSA-SHA256'); s.update(h + '.' + c);
      const jwt = h + '.' + c + '.' + b64u(s.sign(sa.private_key));
      const r = await httpReal({ method: 'POST', url: 'https://oauth2.googleapis.com/token', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt });
      return r.access_token;
    })();
    for (const p of ['tiendas/varman/botSesiones/' + TEST_WA, 'tiendas/varman/botProcesados/' + parsed.message_id]) {
      await httpReal({ method: 'DELETE', url: FS_BASE + '/' + p, headers: { Authorization: 'Bearer ' + tok } }).catch(() => {});
    }
    console.log('(sesión de prueba limpiada)');
  } catch (e) { console.log('(no se pudo limpiar: ' + e.message + ')'); }
})();
