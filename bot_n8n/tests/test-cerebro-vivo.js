// ============ PRUEBA EN VIVO del CEREBRO IA v9 (2026-07-25) ============
// Primer arnés que corre el CEREBRO conversacional DE VERDAD: Gemini REAL,
// Firestore REAL (solo números de prueba) y WhatsApp MOCKEADO. Imita el patrón
// del arnés oficial (tests/test-offline-v4.js, líneas 1-260): extrae el código
// del nodo Cerebro del JSON, mockea graph.facebook.com y deja pasar Firestore y
// Gemini. Limpia sus propios documentos de prueba al final.
//   node "tests\test-cerebro-vivo.js"     (desde bot_n8n\)
//
// EL DUEÑO AUTORIZÓ EL GASTO en llamadas reales a Gemini (~26-36 llamadas: los
// guiones 11 y 12 del 25-jul comparten UNA conversación de 3 turnos, ≈6 llamadas).
//
// Diferencias con el arnés oficial (a propósito):
//   - Fuerza BOT_CEREBRO_IA=on para que Gemini conduzca la conversación.
//   - Fuerza BOT_MODO_CONVERSA=on (red de seguridad si el cerebro cae) y
//     BOT_TEXTOS_SOCIO=off (para que la FAQ aprobada no corte antes del cerebro).
//   - Fuerza BOT_FUENTE_DETALLE=on (el titular del anuncio llega al cerebro) y
//     BOT_SILENCIO_HANDOFF=on (la marca de silencio post-handoff se puede ver).
//   - Wompi: se mockea el endpoint (como el oficial) y se ponen llaves de PRUEBA
//     en memoria para que wompiConfigurado() sea true SIN pegarle al Wompi real.
//   - SPY de Gemini: se capturan las herramientas que el modelo pidió y su texto
//     CRUDO en cada llamada (interceptando la respuesta real de Gemini). Así las
//     aserciones prueban COMPORTAMIENTO (se llamó cotizar/pasar_asesor, el texto
//     dijo "no lo encontré"...), no la redacción exacta, que Gemini varía.
//   - Catálogo: FIXTURE tests/catalogo-fixture.json (mismas 17 refs del oficial),
//     inyectado igual que el oficial (2º arg de correrCerebro). Marcas únicas
//     del fixture (Vans/Converse/Reebok) dan fichas deterministas; New Balance
//     NO está (prueba la regla D1). Es un test de comportamiento, no de precio.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = path.join(__dirname, '..');
const FS_BASE = 'https://firestore.googleapis.com/v1/projects/varman-crew/databases/(default)/documents';
const TEST_WA = '573999000111';
const TEST_WA2 = '573999000222';
const TEST_WA3 = '573999000333';
// source_id de anuncio de PRUEBA (guion 1): claramente NO mapeado en botConfig.
const SID_PRUEBA = 'test-cerebro-vivo-001';
const TITULAR_PRUEBA = 'Reebok Classic azules envío gratis';

// ---------- .env ----------
const ENV = {};
for (const ln of fs.readFileSync(path.join(DIR, '.env'), 'utf8').split(/\r?\n/)) {
  const m = ln.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) ENV[m[1]] = m[2];
}
const DUENO = String(ENV.OWNER_WHATSAPP || '').replace(/\D/g, '');

// que el anti-spam no frene los flujos de prueba (se baja solo en su test)
ENV.BOT_MSGS_POR_MIN = '999';
// Baseline determinista: se APAGAN los flags nuevos (igual que el arnés oficial)
// para que el resultado NO dependa de lo que Cristhian tenga en el .env. Luego se
// ENCIENDEN a mano solo los que el cerebro necesita.
for (const k of ['BOT_ROBUSTEZ', 'BOT_CLASIF_V2', 'BOT_DISPATCH_V2', 'BOT_MARCA_NORM', 'BOT_DATOS_V2', 'BOT_TEXTOS_V2', 'BOT_FOTO_ASESOR', 'BOT_TALLAS_V2', 'BOT_FLUIDEZ_RECONDUCE', 'BOT_FLUIDEZ_CATALOGO', 'BOT_ASISTENTE_V2', 'BOT_FLUIDEZ_ACUSE', 'BOT_CATALOGO_WEB', 'BOT_NOMBRE_MODELO', 'BOT_FUENTE_DETALLE', 'BOT_MODELO_ASESOR', 'BOT_ANTIRUIDO', 'BOT_TALLA_ROBUSTA', 'BOT_TALLA_NACIONAL_DEF', 'BOT_TALLA_BOTONES', 'BOT_ANTIBUCLE', 'BOT_ANTIBUCLE_MAX', 'BOT_PAUTA_CATALOGO', 'BOT_SALUDO_NO_REINICIA', 'BOT_COLOR_CATALOGO', 'BOT_CATALOGO_PIDE', 'BOT_REF_PAUTA', 'BOT_SI_CATALOGO', 'BOT_AVISO_PLANTILLA', 'BOT_LOG_FALLOS', 'BOT_FOTO_REFS', 'BOT_TEXTOS_SOCIO', 'BOT_TONO_SOCIO', 'BOT_CIERRE_CONFIANZA', 'BOT_DESCUENTO_CIFRA', 'BOT_SILENCIO_HANDOFF', 'BOT_SILENCIO_HORAS', 'BOT_MODO_CONVERSA', 'BOT_ESCAPE_DATOS', 'BOT_PAGO_PRIMERO', 'BOT_CIUDAD_UNA_VEZ', 'BOT_SI_MUESTRA', 'BOT_COLORES_FAMILIAS', 'BOT_LECTURA_ROBUSTA', 'WHATSAPP_PLANTILLA_AVISO', 'WHATSAPP_PLANTILLA_IDIOMA', 'WOMPI_PUB_KEY', 'WOMPI_PRV_KEY', 'WOMPI_EVENTS_SECRET', 'WOMPI_ENV', 'CATALOGO_NATIVO', 'WHATSAPP_CATALOG_ID']) delete ENV[k];

// ---- flags que el CEREBRO necesita encendidos para esta prueba ----
ENV.BOT_CEREBRO_IA = 'on';                        // Gemini conduce la conversación
ENV.BOT_CEREBRO_IA_SOLO = [TEST_WA, TEST_WA2, TEST_WA3].join(','); // solo números de prueba
ENV.BOT_MODO_CONVERSA = 'on';                     // red de seguridad si el cerebro cae
ENV.BOT_FUENTE_DETALLE = 'on';                    // el titular del anuncio llega al cerebro (guion 1)
ENV.BOT_SILENCIO_HANDOFF = 'on';                  // marca de silencio post-handoff visible (guion 9)
// BOT_TEXTOS_SOCIO queda OFF (borrado arriba): la FAQ no corta antes del cerebro.
// Wompi: llaves de PRUEBA en memoria (el endpoint se mockea, no se toca el real).
ENV.WOMPI_PUB_KEY = 'pub_test_cerebro';
ENV.WOMPI_PRV_KEY = 'prv_test_cerebro';
ENV.WOMPI_ENV = 'test';

// ---------- workflow: se extrae el código REAL del nodo Cerebro ----------
const wf = JSON.parse(fs.readFileSync(path.join(DIR, 'workflows', 'bot-varman.json'), 'utf8'));
const codigoCerebro = wf.nodes.find((n) => n.name.startsWith('Cerebro')).parameters.jsCode;

// ---------- http real (fetch) con la misma forma que helpers.httpRequest ----------
async function httpReal(opts) {
  const init = { method: opts.method || 'GET', headers: Object.assign({}, opts.headers) };
  if (opts.body !== undefined) {
    init.body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
    if (typeof opts.body !== 'string' && !init.headers['Content-Type']) init.headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(opts.url, init);
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    const err = new Error('HTTP ' + res.status + ' ' + opts.url.slice(0, 90) + ' :: ' + t.slice(0, 200));
    err.status = res.status;
    throw err;
  }
  if (opts.encoding === 'arraybuffer') return Buffer.from(await res.arrayBuffer());
  const txt = await res.text();
  try { return JSON.parse(txt); } catch (e) { return txt; }
}

// ---------- mocks de Graph API + Wompi, y SPY de Gemini ----------
const enviados = [];        // mensajes que el nodo mande DIRECTO por WhatsApp (red de seguridad)
let geminiSpy = [];         // por TURNO: [{ text, tools:[{name,args}] }] de cada llamada real a Gemini
let geminiTotal = 0;        // contador global de llamadas a Gemini (presupuesto ~40)
async function httpRuteado(opts) {
  const url = opts.url || '';
  if (url.includes('graph.facebook.com')) {
    if (url.endsWith('/messages')) { enviados.push(opts.body); return { messages: [{ id: 'wamid.mock' }] }; }
    return { url: 'https://lookaside.fbsbx.com/whatsapp/fake-media', mime_type: 'image/jpeg', id: url.split('/').pop() };
  }
  if (url.includes('wompi.co') && url.endsWith('/payment_links')) {
    return { data: { id: 'test_link_ABC' } }; // link de pago mockeado (no se toca Wompi real)
  }
  if (url.includes('generativelanguage.googleapis.com')) {
    // Gemini REAL: se llama de verdad y se ESPÍA la respuesta (herramientas + texto).
    const r = await httpReal(opts);
    geminiTotal++;
    try {
      const parts = (r.candidates && r.candidates[0] && r.candidates[0].content && r.candidates[0].content.parts) || [];
      const rec = { text: '', tools: [] };
      for (const p of parts) {
        if (p && typeof p.text === 'string' && p.text.trim()) rec.text += (rec.text ? ' ' : '') + p.text.trim();
        const fc = p && (p.functionCall || p.function_call);
        if (fc && fc.name) rec.tools.push({ name: String(fc.name), args: fc.args || fc.arguments || {} });
      }
      geminiSpy.push(rec);
    } catch (e) { geminiSpy.push({ text: '', tools: [], error: true }); }
    return r;
  }
  // catálogo leído por los nodos: fixture determinista (igual que el oficial).
  if (url.includes('/tiendas/varman/catalogo')) return catalogoFixture;
  return httpReal(opts); // oauth2 / firestore = REALES
}

// ---------- acceso admin directo (verificaciones y limpieza) ----------
function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
let TOK = null;
async function tokenAdmin() {
  if (TOK) return TOK;
  const sa = JSON.parse(Buffer.from(ENV.FIREBASE_SA_B64, 'base64').toString('utf8'));
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(header + '.' + claims);
  const jwt = header + '.' + claims + '.' + b64url(signer.sign(sa.private_key));
  const r = await httpReal({ method: 'POST', url: 'https://oauth2.googleapis.com/token', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt });
  TOK = r.access_token;
  return TOK;
}
function unwrap(v) {
  if (v == null) return null;
  if ('integerValue' in v) return parseInt(v.integerValue, 10);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('stringValue' in v) return v.stringValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(unwrap);
  return null;
}
function fromFs(doc) {
  if (!doc || !doc.fields) return null;
  const o = {};
  for (const k in doc.fields) o[k] = unwrap(doc.fields[k]);
  return o;
}
async function fsGet(p) {
  try { return fromFs(await httpReal({ method: 'GET', url: FS_BASE + '/' + p, headers: { Authorization: 'Bearer ' + await tokenAdmin() } })); }
  catch (e) { return null; }
}
async function fsDel(p) {
  try { await httpReal({ method: 'DELETE', url: FS_BASE + '/' + p, headers: { Authorization: 'Bearer ' + await tokenAdmin() } }); } catch (e) {}
}
async function fsRunQuery(colId, n, orderField) {
  try {
    const r = await httpReal({ method: 'POST', url: FS_BASE + '/tiendas/varman:runQuery', headers: { Authorization: 'Bearer ' + await tokenAdmin() },
      body: { structuredQuery: { from: [{ collectionId: colId }], orderBy: [{ field: { fieldPath: orderField }, direction: 'DESCENDING' }], limit: n } } });
    return (Array.isArray(r) ? r : []).filter((x) => x.document).map((x) => ({ _path: x.document.name.split('/documents/')[1], ...fromFs(x.document) }));
  } catch (e) { return []; }
}

// ---------- catálogo FIXTURE (17 refs fijas, igual que el arnés oficial) ----------
const catalogoFixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalogo-fixture.json'), 'utf8'));

// ---------- ejecutar el Cerebro como lo haría n8n ----------
async function correrCerebro(parsedMsg) {
  enviados.length = 0;
  geminiSpy = [];
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const fn = new AsyncFunction('$input', '$env', '$json', '$', 'require', codigoCerebro);
  const out = await fn.call(
    { helpers: { httpRequest: httpRuteado } },
    { all: () => [], first: () => ({ json: {} }) },
    ENV,
    catalogoFixture,
    (name) => ({ item: { json: parsedMsg } }),
    require
  );
  return { msgs: out.map((x) => x.json), spy: geminiSpy.slice() };
}

// message_id ÚNICO por llamada: el bot deduplica por message_id.
const RUN_MID = 'wamidTEST_' + Date.now() + '_';
let _midSeq = 0;
function msj(over) {
  return Object.assign({ wa_id: TEST_WA, nombre: 'Cliente Prueba', tipo: 'text', texto: '', inter_id: '', imagen_id: '', fuente: '', fuente_titulo: '', fuente_tipo: '', fuente_url: '', message_id: RUN_MID + (++_midSeq) }, over);
}

// ---------- render / helpers de lectura ----------
function render(m) {
  if (!m) return '(vacío)';
  if (m.type === 'text') return m.text.body;
  if (m.type === 'image') return '[IMG ' + (m.image.link || ('id:' + m.image.id)) + ']' + (m.image.caption ? '  ' + m.image.caption : '');
  if (m.type === 'interactive') return '[interactive] ' + ((m.interactive.body && m.interactive.body.text) || '');
  if (m.type === 'template') return '[plantilla] ' + (((m.template.components || [])[0] || {}).parameters || [{}])[0].text || '';
  return JSON.stringify(m).slice(0, 200);
}
const oneLine = (s) => String(s).replace(/\s*\n+\s*/g, ' / ');

// un turno: manda el mensaje, IMPRIME la conversación y devuelve todo para asertar.
async function turno(wa, texto, over) {
  const { msgs, spy } = await correrCerebro(msj(Object.assign({ wa_id: wa, texto: texto }, over || {})));
  const cli = msgs.filter((m) => m.to === wa);
  const own = msgs.filter((m) => m.to === DUENO && DUENO && m.to !== wa);
  const tools = spy.reduce((a, s) => a.concat(s.tools.map((t) => t.name)), []);
  const rawText = spy.map((s) => s.text).filter(Boolean).join(' ⟂ ');
  console.log('  cliente> ' + texto);
  for (const m of cli) console.log('     bot> ' + oneLine(render(m)));
  for (const m of own) console.log('    →320> ' + oneLine(render(m)));
  if (tools.length) console.log('    ~tools: ' + tools.join(', '));
  return { msgs, spy, cli, own, tools, rawText, cliTxt: cli.map(render).join('\n'), ownTxt: own.map(render).join('\n') };
}

// ---------- asserts ----------
let ok = 0, mal = 0;
function check(nombre, cond, extra) {
  if (cond) { ok++; console.log('    PASS  ' + nombre); }
  else { mal++; console.log('    FAIL  ' + nombre + (extra !== undefined ? '  -> ' + JSON.stringify(extra).slice(0, 300) : '')); }
}
// términos que el bot NUNCA puede decir (R1 + D1)
const PROHIBIDO = /\b1\.1\b|r[eé]plicas?|\bAAA\b|imitaci[oó]n|\bcopias?\b|no lo tenemos|no lo tengo|no las? manejamos|no trabajamos|agotad|no hay en/i;
// preguntar la talla (R2: PROHIBIDO)
const PIDE_TALLA = /qu[eé]\s+talla|tu\s+talla|talla\s+(calzas|usas|buscas|necesitas)|n[uú]mero\s+calzas|escr[ií]beme\s+(?:solo\s+)?el\s+n[uú]mero/i;
const digitos = (s) => String(s || '').replace(/\D/g, '');
const contieneCifra = (txt, n) => {
  const d = digitos(n);
  const bruto = String(txt || '');
  return digitos(bruto).indexOf(d) >= 0 && /\d[.,]?\d{3}/.test(bruto); // hay una cifra de miles
};

// ============================================================================
// [TANDA 25-jul · FALLAS EN VIVO] utilidades SOLO para los guiones 13-23.
// Todo lo de aquí abajo es ADITIVO: no cambia ni una línea de lo de arriba.
// ============================================================================

// -- una cifra de miles ("$269.900", "239.900"): sirve para exigir que un turno
//    NO traiga precio (el "$" no siempre viene y el teléfono del 320 no matchea).
const CIFRA_PRECIO = /\d{1,3}[.,]\d{3}/;
// -- saludo y pregunta (apertura correcta: saluda y PREGUNTA, no suelta ficha)
const HAY_SALUDO = /hola|buen(?:os|as)\s+(?:d[ií]as|tardes|noches)|bienvenid/i;
// -- el sondeo de género, tal cual lo escribe el bot ("¿Los buscas para dama o caballero?")
const PREGUNTA_GENERO = /(dama|caballero|hombre|mujer)\s*(?:o|u|\/)\s*(dama|caballero|hombre|mujer)|para\s+(?:dama|caballero|hombre|mujer)\s*[?¿]/i;
// -- el bot jamás puede decir que no ve las fotos del cliente (R8)
const NIEGA_VER_FOTO = /no\s+puedo\s+ver|no\s+(?:puedo|logro)\s+(?:abrir|procesar|acceder)|no\s+veo\s+(?:la|las|tu)\s+(?:foto|imagen)|no\s+tengo\s+(?:la\s+)?capacidad\s+de\s+ver/i;
// -- "no lo encontré" honesto (D1) y traspaso al equipo
const DICE_NO_ENCONTRADO = /no\s+(?:lo|la|los|las)?\s*(?:encontr|ubiqu|hall|logr|aparec|figur)|no\s+.{0,25}registrad/i;
const DICE_ASESOR = /equipo|asesor|320/i;
// -- normaliza para comparar dos respuestas del bot (espacios/mayúsculas)
const norml = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
// -- links de las fotos que salieron en un turno (para saber si mandó OTRA ref)
const fotosDe = (t) => t.cli.filter((m) => m.type === 'image').map((m) => String((m.image && (m.image.link || m.image.id)) || ''));
// -- marcas del catálogo: si el cliente pide una, ninguna otra puede aparecer.
//    "ballet/baleta/speedcat" son las trampas REALES del 25-jul (le mandaron
//    baletas Puma a quien pidió Reebok), por eso también están vetadas.
const MARCAS_CAT = ['puma', 'nike', 'jordan', 'adidas', 'vans', 'converse', 'reebok'];
function otraMarcaEn(txt, marcaPedida) {
  const t = String(txt || '').toLowerCase();
  const mala = MARCAS_CAT.filter((m) => m !== marcaPedida).find((m) => t.indexOf(m) >= 0);
  if (mala) return mala;
  if (marcaPedida !== 'puma' && /ballet|baleta|speedcat/.test(t)) return 'modelo ajeno (ballet/speedcat)';
  return '';
}
// -- hora REAL de Colombia: el saludo tiene que ser el de la franja de AHORA
//    (el fallo real fue "Buenas noches" a las 11 de la mañana).
function horaBogota() {
  try {
    const h = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', hour: '2-digit', hourCycle: 'h23' }).format(new Date());
    const n = parseInt(h, 10);
    return isNaN(n) ? new Date().getHours() : (n === 24 ? 0 : n);
  } catch (e) { return new Date().getHours(); }
}
function franjaBogota() { const h = horaBogota(); return h < 12 ? 'mañana' : (h < 19 ? 'tarde' : 'noche'); }
const SALUDO_DE_OTRA_FRANJA = {
  'mañana': /buenas\s+tardes|buenas\s+noches/i,
  'tarde': /buenos\s+d[ií]as|buenas\s+noches/i,
  'noche': /buenos\s+d[ií]as|buenas\s+tardes/i
};

// ---------- refs EXTRA del catálogo, SOLO para los guiones 13-23 ----------
// El fixture de arriba trae la marca "pelada" ("reebok"), pero en el catálogo
// REAL el campo `marca` guarda el NOMBRE COMPLETO del modelo ("Adidas EQT",
// "Puma Speedcat ballet rosada") — así es como el dueño lo carga en la app.
// Sin nombres completos no se puede reproducir ni el alias EQT/equipment ni la
// trampa de "pedí Reebok y me mandaron las baletas Puma". Se ENCIENDEN justo
// antes del primer guion nuevo y se APAGAN al final: los guiones 1-12 corren
// exactamente con las 17 refs de siempre.
function docCat(ref, marca, cat, precio, fotoId, orden) {
  return {
    name: 'projects/varman-crew/databases/(default)/documents/tiendas/varman/catalogo/' + ref,
    fields: {
      ref: { stringValue: ref }, cat: { stringValue: cat },
      precio: { integerValue: String(precio) }, marca: { stringValue: marca },
      fotos: { arrayValue: { values: [{ stringValue: fotoId }] } },
      activo: { booleanValue: true }, orden: { integerValue: String(orden) }
    }
  };
}
const REFS_EXTRA = [
  docCat('40', 'Adidas EQT', 'casuales', 259000, 'p040', 40),          // alias "adidas equipment"
  docCat('41', 'Reebok Classic azul', 'deportivas', 239900, 'p041', 41), // la que el cliente SÍ pidió
  docCat('42', 'Puma Speedcat ballet rosada', 'casuales', 269900, 'p042', 42) // la que el bot mandaba de más
];
function catalogoExtraOn() { for (const d of REFS_EXTRA) if (catalogoFixture.documents.indexOf(d) < 0) catalogoFixture.documents.push(d); }
function catalogoExtraOff() {
  for (const d of REFS_EXTRA) { const i = catalogoFixture.documents.indexOf(d); if (i >= 0) catalogoFixture.documents.splice(i, 1); }
}

// ---------- simular un mensaje entrante CON FOTO del cliente ----------
// `msj()` ya acepta `imagen_id` y `tipo`, y httpRuteado ya mockea la META de la
// media de Meta (GET graph.facebook.com/{id} → { url, mime_type }). Lo único que
// faltaba es el BINARIO: hoy el cerebro no descarga la foto del cliente (solo la
// reenvía al 320), pero en cuanto el PM le conecte la visión va a pedir esa URL.
//   >>> STUB LISTO PARA CONECTAR: devuelve un JPEG 1x1 en memoria para la URL de
//   >>> lookaside.fbsbx.com (la que devuelve el mock de la meta). Si el arreglo
//   >>> descarga por otra ruta, basta con añadirla al `if` de abajo.
const FOTO_STUB_MEDIA_ID = 'MEDIA_TEST_FOTO_1';
const FOTO_STUB_JPEG_B64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
async function httpRuteadoConFoto(opts) {
  const url = opts.url || '';
  if (/lookaside\.fbsbx\.com|fake-media/.test(url)) return Buffer.from(FOTO_STUB_JPEG_B64, 'base64');
  return httpRuteado(opts);
}
// mismo runner que correrCerebro() pero con el router que sirve el binario.
async function correrCerebroConFoto(parsedMsg) {
  enviados.length = 0;
  geminiSpy = [];
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const fn = new AsyncFunction('$input', '$env', '$json', '$', 'require', codigoCerebro);
  const out = await fn.call(
    { helpers: { httpRequest: httpRuteadoConFoto } },
    { all: () => [], first: () => ({ json: {} }) },
    ENV,
    catalogoFixture,
    (name) => ({ item: { json: parsedMsg } }),
    require
  );
  return { msgs: out.map((x) => x.json), spy: geminiSpy.slice() };
}
// un turno con foto adjunta (misma salida que turno(), para asertar igual)
async function turnoFoto(wa, texto, over) {
  const { msgs, spy } = await correrCerebroConFoto(msj(Object.assign(
    { wa_id: wa, texto: texto || '', tipo: 'image', imagen_id: FOTO_STUB_MEDIA_ID }, over || {})));
  const cli = msgs.filter((m) => m.to === wa);
  const own = msgs.filter((m) => m.to === DUENO && DUENO && m.to !== wa);
  const tools = spy.reduce((a, s) => a.concat(s.tools.map((t) => t.name)), []);
  const rawText = spy.map((s) => s.text).filter(Boolean).join(' ⟂ ');
  console.log('  cliente> [FOTO adjunta] ' + (texto || ''));
  for (const m of cli) console.log('     bot> ' + oneLine(render(m)));
  for (const m of own) console.log('    →320> ' + oneLine(render(m)));
  if (tools.length) console.log('    ~tools: ' + tools.join(', '));
  return { msgs, spy, cli, own, tools, rawText, cliTxt: cli.map(render).join('\n'), ownTxt: own.map(render).join('\n') };
}

// ============================================================================
// [TANDA v10 · PRUEBA DEL DUEÑO 25-jul TARDE] utilidades SOLO para G24-G32.
// Todo ADITIVO: variantes nuevas de helpers, sin cambiar ni una línea de arriba.
// ============================================================================

// -- apertura de cero: el bot JAMÁS vuelve a presentarse a mitad de conversación
//    (falla real: "Buenas tardes, bienvenido a VarMan Crew. Mi nombre es…" con pedido andando).
const SALUDO_DE_CERO = /bienvenid[oa]?s?\s+a\s+varman|mi\s+nombre\s+es/i;
// -- frases del traspaso a asesor (para exigir que NO haya handoff en un turno)
const FRASE_HANDOFF = /le\s+avis[eé]\s+a\s+nuestro\s+equipo|en\s+un\s+momento\s+te\s+escriben|320\s*225\s*0619/i;
// -- el bloque de pedir los 2 datos JUNTOS quedó prohibido (decisión "de a UNO")
const BLOQUE_DOS_DATOS = /solo\s+necesito\s+dos\s+datos|📌/i;
// -- plantillas de la máquina VIEJA (G31): jamás pueden volver a salirle al cliente
const PLANTILLA_VIEJA = /te\s+interesa\s+el\s+modelo\s+de\s+nuestra\s+publicaci|no\s+alcanzo\s+a\s+ver|asistente\s+virtual/i;

// ---------- G31: GEMINI CAÍDO (fallo total simulado en el espía) ----------
// Variante ADITIVA del router: en ese turno la llamada a Gemini devuelve 500
// (misma forma de error que httpReal); todo lo demás sigue igual a httpRuteado.
async function httpRuteadoGeminiCaido(opts) {
  const url = opts.url || '';
  if (url.includes('generativelanguage.googleapis.com')) {
    const err = new Error('HTTP 500 generativelanguage :: fallo de Gemini SIMULADO por el arnés (G31)');
    err.status = 500;
    throw err;
  }
  return httpRuteado(opts);
}
// mismo runner que correrCerebro() pero con Gemini caído.
async function correrCerebroGeminiCaido(parsedMsg) {
  enviados.length = 0;
  geminiSpy = [];
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const fn = new AsyncFunction('$input', '$env', '$json', '$', 'require', codigoCerebro);
  const out = await fn.call(
    { helpers: { httpRequest: httpRuteadoGeminiCaido } },
    { all: () => [], first: () => ({ json: {} }) },
    ENV,
    catalogoFixture,
    (name) => ({ item: { json: parsedMsg } }),
    require
  );
  return { msgs: out.map((x) => x.json), spy: geminiSpy.slice() };
}
// un turno con el cerebro caído (misma salida que turno(), para asertar igual)
async function turnoGeminiCaido(wa, texto, over) {
  const { msgs, spy } = await correrCerebroGeminiCaido(msj(Object.assign({ wa_id: wa, texto: texto }, over || {})));
  const cli = msgs.filter((m) => m.to === wa);
  const own = msgs.filter((m) => m.to === DUENO && DUENO && m.to !== wa);
  console.log('  cliente> [GEMINI CAÍDO] ' + texto);
  for (const m of cli) console.log('     bot> ' + oneLine(render(m)));
  for (const m of own) console.log('    →320> ' + oneLine(render(m)));
  return { msgs, spy, cli, own, tools: [], rawText: '', cliTxt: cli.map(render).join('\n'), ownTxt: own.map(render).join('\n') };
}

// ---------- G32: dos turnos del MISMO número EN PARALELO (carrera real) ----------
// OJO: `geminiSpy`/`enviados` son globales y en paralelo se pisan entre sí, así
// que aquí NO se usa el espía: las aserciones van SOLO sobre los mensajes que
// devuelve cada ejecución (`out`), que sí son locales a cada corrida.
async function turnosEnParalelo(wa, textos) {
  const rs = await Promise.all(textos.map((tx) => correrCerebro(msj({ wa_id: wa, texto: tx }))));
  return rs.map((r, i) => {
    const cli = r.msgs.filter((m) => m.to === wa);
    const own = r.msgs.filter((m) => m.to === DUENO && DUENO && m.to !== wa);
    console.log('  cliente∥> ' + textos[i]);
    for (const m of cli) console.log('     bot> ' + oneLine(render(m)));
    for (const m of own) console.log('    →320> ' + oneLine(render(m)));
    return { cli, own, cliTxt: cli.map(render).join('\n'), ownTxt: own.map(render).join('\n') };
  });
}

// ============================================================================
(async () => {
  console.log('======== ARNÉS EN VIVO · CEREBRO IA v9 ========');
  console.log('Gemini REAL · Firestore REAL (solo ' + TEST_WA + '/222/333) · WhatsApp+Wompi MOCK\n');
  if (!ENV.GEMINI_API_KEY) { console.log('SIN GEMINI_API_KEY en .env: aborto.'); process.exit(2); }
  if (!DUENO) console.log('AVISO: OWNER_WHATSAPP vacío en .env — los avisos al 320 no se podrán verificar.\n');

  console.log('== Limpieza previa ==');
  await limpiarTodo();

  // ---------------------------------------------------------------------------
  console.log('\n──────── GUION 1 · Lead de pauta con referral (sin mapear) ────────');
  console.log('(Espera: apertura estilo dueño o ficha deducida · CERO talla · aviso "sin mapear" al 320)');
  {
    const t = await turno(TEST_WA2, 'Hola', {
      fuente: 'ctwa:' + SID_PRUEBA, fuente_titulo: TITULAR_PRUEBA,
      fuente_tipo: 'ad', fuente_url: 'https://www.instagram.com/p/varman-test'
    });
    check('G1: el cerebro respondió algo al cliente', t.cli.length > 0);
    check('G1: NO pregunta la talla (R2)', !PIDE_TALLA.test(t.cliTxt), t.cliTxt);
    check('G1: sin términos prohibidos (1.1/réplica/…)', !PROHIBIDO.test(t.cliTxt), t.cliTxt);
    check('G1: apertura de dueño (bienvenida/puente) O ficha del modelo deducido',
      /bienvenid|varman|asistente|nos envió|nos escribi|reebok|classic|modelo/i.test(t.cliTxt) || t.cli.some((m) => m.type === 'image'), t.cliTxt);
    check('G1: aviso al 320 de ANUNCIO SIN MAPEAR con el titular',
      /sin.?mapear|anuncio/i.test(t.ownTxt) && /reebok/i.test(t.ownTxt), t.ownTxt);
  }

  // ---------------------------------------------------------------------------
  console.log('\n──────── CONV A · Guiones 2 (talla) + 3 (ciudad fuera) + 10 (memoria) ────────');
  await limpiarNumero(TEST_WA);
  let precioModelo = '';
  {
    console.log('  · turno de apertura');
    await turno(TEST_WA, 'Hola, buenas');
    console.log('  · muestra un modelo (marca única en el fixture → determinista)');
    const tv = await turno(TEST_WA, 'muéstrame unas Vans');
    // captura el precio que el bot mostró (para el guion 10)
    const mP = tv.cliTxt.match(/\$?\s?(\d{3}[.,]\d{3})/);
    precioModelo = mP ? mP[1] : '';
    check('CONV-A: el bot mostró una ficha/foto del modelo con precio',
      (tv.cli.some((m) => m.type === 'image') || /vans/i.test(tv.cliTxt)) && !!precioModelo, { precioModelo: precioModelo, txt: tv.cliTxt });

    console.log('\n  ── GUION 2 · "estos en 39" (confirma disponibilidad, NO repregunta) ──');
    const t2 = await turno(TEST_WA, 'estos en 39');
    check('G2: NO vuelve a preguntar la talla (R2)', !PIDE_TALLA.test(t2.cliTxt), t2.cliTxt);
    check('G2: confirma disponibilidad y/o avanza a la ciudad',
      /disponible|todas las tallas|ciudad|ubicad|d[oó]nde|env[ií]o/i.test(t2.cliTxt), t2.cliTxt);
    check('G2: sin términos prohibidos', !PROHIBIDO.test(t2.cliTxt), t2.cliTxt);

    console.log('\n  ── GUION 3 · "Pasto" (fuera de Bogotá: nombre de ciudad + envío gratis + pago primero) ──');
    const t3 = await turno(TEST_WA, 'estoy en Pasto');
    check('G3: responde CON el nombre de la ciudad (Pasto)', /pasto/i.test(t3.cliTxt), t3.cliTxt);
    check('G3: menciona envío gratis', /env[ií]o\s+grat|gratis/i.test(t3.cliTxt), t3.cliTxt);
    check('G3: avanza al pago (link Wompi o método de pago), pago primero',
      t3.tools.indexOf('crear_link_wompi') >= 0 || /wompi|link|pago|nequi|transferencia/i.test(t3.cliTxt), { tools: t3.tools, txt: t3.cliTxt });
    check('G3: NO ofrece contra entrega fuera de Bogotá', !/contra\s*-?\s*entrega|contraentrega/i.test(t3.cliTxt), t3.cliTxt);

    console.log('\n  ── GUION 10 · memoria: "cuál era el precio del que me mostraste?" ──');
    const t10 = await turno(TEST_WA, 'oye, cuál era el precio del que me mostraste?');
    check('G10: NO repite la ficha completa (sin foto nueva)', !t10.cli.some((m) => m.type === 'image'), t10.cliTxt);
    check('G10: recuerda el precio correcto del modelo (' + (precioModelo || '?') + ')',
      !!precioModelo && contieneCifra(t10.cliTxt, precioModelo), { precioEsperado: precioModelo, txt: t10.cliTxt });
  }

  // ---------------------------------------------------------------------------
  console.log('\n──────── CONV C · GUION 4 · Bogotá (contra entrega + solo nombre y dirección) ────────');
  await limpiarNumero(TEST_WA3);
  {
    console.log('  · muestra un modelo');
    await turno(TEST_WA3, 'Hola, quiero ver unas Converse');
    const t = await turno(TEST_WA3, 'estoy en Bogotá');
    check('G4: ofrece CONTRA ENTREGA (solo Bogotá)', /contra\s*-?\s*entrega|contraentrega|al recibir/i.test(t.cliTxt), t.cliTxt);
    check('G4: pide nombre y/o dirección', /nombre|direcci[oó]n/i.test(t.cliTxt), t.cliTxt);
    check('G4: sin términos prohibidos', !PROHIBIDO.test(t.cliTxt), t.cliTxt);
  }

  // ---------------------------------------------------------------------------
  console.log('\n──────── CONV D · GUION 5 · Regateo (descuento con cifra, tope 10% · 1 par) ────────');
  await limpiarNumero(TEST_WA);
  {
    console.log('  · muestra un modelo (Reebok = ref única, $265.000)');
    const tr = await turno(TEST_WA, 'Hola, muéstrame unas Reebok');
    const mP = tr.cliTxt.match(/\$?\s?(\d{3}[.,]\d{3})/);
    const base = mP ? parseInt(digitos(mP[1]), 10) : 0;
    const esperado10 = base ? Math.round(base * 0.9) : 0; // 265000 → 238500
    const t = await turno(TEST_WA, 'muy caro, hay rebaja?');
    check('G5: pidió cotizar (el código calcula el descuento, no el modelo)', t.tools.indexOf('cotizar') >= 0, t.tools);
    check('G5: da la cifra FINAL en pesos con 10% (' + (esperado10 ? fmt(esperado10) : '?') + ')',
      !!esperado10 && contieneCifra(t.cliTxt, esperado10), { base: base, esperado10: esperado10, txt: t.cliTxt });
    check('G5: sin términos prohibidos', !PROHIBIDO.test(t.cliTxt), t.cliTxt);
  }

  // ---------------------------------------------------------------------------
  console.log('\n──────── GUION 6 · "Son originales?" (calidad importada, vetos limpios) ────────');
  await limpiarNumero(TEST_WA2);
  {
    const t = await turno(TEST_WA2, 'una pregunta, son originales?');
    check('G6: responde con la calidad ("importados/excelente calidad")',
      /importad|calidad|excelente/i.test(t.cliTxt), t.cliTxt);
    check('G6: NO dice 1.1/réplica/AAA/imitación', !/\b1\.1\b|r[eé]plica|\bAAA\b|imitaci/i.test(t.cliTxt), t.cliTxt);
    check('G6: NO afirma ni niega originalidad', !/\b(son|es|100%|s[ií]\s+son|no\s+son)\s+originales?\b|originales?\s+de\s+(?:la\s+)?marca/i.test(t.cliTxt), t.cliTxt);
  }

  // ---------------------------------------------------------------------------
  console.log('\n──────── GUION 7 · Incoherente "jajaja no se q poner" (amable + reencamina) ────────');
  await limpiarNumero(TEST_WA3);
  {
    const t = await turno(TEST_WA3, 'jajaja no se q poner');
    check('G7: responde (no se queda mudo)', t.cli.length > 0 && t.cliTxt.trim().length > 0);
    check('G7: reencamina (pregunta de avance / invita a decir el modelo)',
      /[?¿]|modelo|ayud|busca|cuéntame|cuentame/i.test(t.cliTxt), t.cliTxt);
    check('G7: sin regaño ni términos prohibidos', !PROHIBIDO.test(t.cliTxt) && !/no\s+entiendo|no\s+te\s+entiendo|escribe\s+bien/i.test(t.cliTxt), t.cliTxt);
  }

  // ---------------------------------------------------------------------------
  console.log('\n──────── GUION 8 · Modelo inexistente "New Balance 9060" (regla D1) ────────');
  await limpiarNumero(TEST_WA);
  {
    const t = await turno(TEST_WA, 'tienen New Balance 9060 moradas?');
    check('G8: buscó en el catálogo (buscar_catalogo)', t.tools.indexOf('buscar_catalogo') >= 0, t.tools);
    // [ARNÉS-FIX 25-jul] antes se pedía `pasar_asesor` en el espía de Gemini y
    // fallaba EN FALSO: el handoff lo ejecuta el CÓDIGO (veto "promesa ⇒ handoff"
    // o la regla D1 determinista), así que no aparece entre lo que PIDIÓ el modelo.
    // Se valida el EFECTO observable: traspaso al cliente + aviso al 320 + marca de
    // silencio en Firestore, todo en el MISMO turno.
    // [ARNÉS-FIX v10 25-jul] ANTES se exigía el handoff en ESTE mismo turno. El
    // dueño lo cambió: "solo quiero que mande a un asesor cuando la conversación
    // se esté perdiendo". A la PRIMERA búsqueda vacía el bot se queda y pide
    // precisar; el asesor entra a la SEGUNDA. El flujo de las 2 vueltas lo
    // cubre G29; aquí solo se comprueba que en la 1ª NO hay traspaso.
    const sesD1 = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
    check('G8: a la PRIMERA falla NO pasa a asesor (se queda y pide precisar)',
      !/le avis[eé] a nuestro equipo|en un momento te escriben|320\s*225\s*0619/i.test(t.cliTxt)
      && !(sesD1 && sesD1.enHandoffAt),
      { cli: t.cliTxt, enHandoffAt: sesD1 && sesD1.enHandoffAt });
    // [ARNÉS-FIX 25-jul] antes se miraba el texto CRUDO del espía (t.rawText) y
    // fallaba EN FALSO cuando el código sustituía la redacción del modelo por el
    // texto aprobado de D1. Lo que importa es lo que RECIBIÓ el cliente; la
    // comprobación dura de las variantes prohibidas se mantiene, también sobre él.
    check('G8: al CLIENTE le dice "no lo encontré", JAMÁS "no lo tenemos"',
      /no\s+(?:lo|la|los|las)?\s*(?:encontr|ubiqu|hall|logr|aparec|figur)|no\s+.{0,25}registrad/i.test(t.cliTxt)
      && !/no lo tenemos|no lo tengo|no las? manejamos|no los? manejamos|no trabajamos|agotad|se agot|no hay en/i.test(t.cliTxt),
      { cli: t.cliTxt, crudoGemini: t.rawText });
    check('G8: le pide precisar para seguir buscando (sigue en la conversación)',
      /confirmas|cu[aá]l|nombre|marca|modelo|parecid/i.test(t.cliTxt), t.cliTxt);
    check('G8: NADA prohibido llegó al cliente', !PROHIBIDO.test(t.cliTxt), t.cliTxt);
  }

  // ---------------------------------------------------------------------------
  console.log('\n──────── GUION 9 · "quiero hablar con una persona" (handoff + silencio) ────────');
  await limpiarNumero(TEST_WA2);
  {
    const t = await turno(TEST_WA2, 'quiero hablar con una persona');
    check('G9: handoff al cliente', /equipo|320|asesor/i.test(t.cliTxt), t.cliTxt);
    check('G9: avisa al 320', !DUENO || t.own.length > 0, t.ownTxt);
    const ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA2);
    check('G9: la sesión queda marcada en silencio (enHandoffAt en Firestore)', !!(ses && ses.enHandoffAt), ses && Object.keys(ses || {}));
    if (t.spy.length === 0) console.log('    NOTA: 0 llamadas a Gemini — lo atajó el handoff DETERMINISTA (PIDE_HUMANO) ANTES del cerebro. El comportamiento observable (traspaso + aviso + silencio) es idéntico.');
  }

  // ---------------------------------------------------------------------------
  // Los dos fallos REALES de la corrida del 25-jul, en UNA sola conversación de 3
  // turnos (≈6 llamadas a Gemini: es lo mínimo para que haya ficha previa).
  console.log('\n──────── CONV E · GUION 11 (Bogotá ⇒ contra entrega) + GUION 12 (precio de una ref YA mostrada) ────────');
  await limpiarNumero(TEST_WA3);
  {
    console.log('  · muestra un modelo (Vans = marca única del fixture)');
    const t1 = await turno(TEST_WA3, 'Hola, quiero ver unas Vans');
    const mP = t1.cliTxt.match(/\$?\s?(\d{3}[.,]\d{3})/);
    const precioE = mP ? mP[1] : '';
    check('CONV-E: mostró la ficha del modelo con foto y precio',
      t1.cli.some((m) => m.type === 'image') && !!precioE, { precio: precioE, txt: t1.cliTxt });

    console.log('\n  ── GUION 11 · "estoy en Bogotá": el CONTRA ENTREGA tiene que salir ──');
    console.log('  (fallo real: el veto D3 quitaba la repregunta de ciudad y el modelo remataba con "¿Qué te parece?")');
    const t2 = await turno(TEST_WA3, 'estoy en Bogotá');
    check('G11: menciona el CONTRA ENTREGA (el cliente de Bogotá SÍ se entera)',
      /contra\s*-?\s*entrega|contraentrega|pagas?\s+(?:cuando|al)\s+recib/i.test(t2.cliTxt), t2.cliTxt);
    check('G11: NO remata con una pregunta vacía',
      !/qu[eé]\s+te\s+parece|te\s+gusta\b|c[oó]mo\s+te\s+suena|te\s+interesa\b|qu[eé]\s+opinas/i.test(t2.cliTxt), t2.cliTxt);
    check('G11: NO repregunta la ciudad (D3)',
      !/qu[eé]\s+ciudad|est[aá]s\s+ubicad|d[oó]nde\s+(?:est[aá]s|vives|te\s+encuentras)/i.test(t2.cliTxt), t2.cliTxt);
    // [ARNÉS-FIX v10 25-jul] ANTES se exigía pedir los 2 datos juntos. El dueño
    // lo cambió esa misma tarde: "quiero que el bot los pida uno a uno para que
    // no haya confusión". Ahora se exige lo contrario — el nombre SÍ, la
    // dirección NO todavía. El detalle del flujo completo lo cubre G24.
    check('G11: pide el nombre y NO la dirección en el mismo mensaje (datos de a uno)',
      /nombre/i.test(t2.cliTxt) && !/direcci[oó]n/i.test(t2.cliTxt), t2.cliTxt);
    check('G11: UNA sola pregunta en el mensaje', (t2.cliTxt.match(/\?/g) || []).length <= 1, t2.cliTxt);
    check('G11: NO pregunta la talla (R2) y nada prohibido',
      !PIDE_TALLA.test(t2.cliTxt) && !PROHIBIDO.test(t2.cliTxt), t2.cliTxt);

    console.log('\n  ── GUION 12 · precio de una ref YA mostrada: NO se reenvía la imagen ──');
    console.log('  (fallo real: el modelo re-llamaba mostrar_ficha y la MISMA foto se iba otra vez)');
    const t3 = await turno(TEST_WA3, 'y cuánto valían las Vans?');
    check('G12: NO reenvía ninguna imagen', !t3.cli.some((m) => m.type === 'image'), t3.cliTxt);
    check('G12: responde el precio REAL de memoria (' + (precioE || '?') + ')',
      !!precioE && contieneCifra(t3.cliTxt, precioE), { precioEsperado: precioE, txt: t3.cliTxt });
    check('G12: el cliente NO se queda sin respuesta',
      t3.cli.length > 0 && t3.cliTxt.trim().length > 0, t3.cliTxt);
    // anti-bucle del arreglo del FALLO 1: el bloque aprobado de los 2 datos se
    // manda UNA vez (marca iaDatosPedidos), no en cada turno siguiente.
    check('G12: no repite el bloque de los 2 datos (anti-bucle)',
      !/solo necesito dos datos/i.test(t3.cliTxt), t3.cliTxt);
  }

  // ===========================================================================
  // TANDA 25-jul · LAS FALLAS QUE EL DUEÑO ENCONTRÓ PROBANDO EN VIVO (G13-G23)
  // Guiones NUEVOS: cada uno reproduce un fallo REAL de la conversación de hoy.
  // Deben FALLAR con el código de hoy y PASAR con los arreglos de esta tanda.
  // Coste aparte de los guiones 1-12: ≈30 llamadas más a Gemini.
  // Se encienden 3 refs extra con NOMBRE COMPLETO de modelo (ver REFS_EXTRA).
  // ===========================================================================
  catalogoExtraOn();

  console.log('\n──────── CONV F · GUION 13 (saludo primero) + 14 (hora) + 15 (bot pegado) ────────');
  await limpiarNumero(TEST_WA2);
  {
    // FALLA REAL: el cliente escribió "Hola" y el bot soltó de una la ficha de la pauta ("👟 Puma ballet 💵 $269.900 …").
    console.log('  ── GUION 13 · primer "Hola": saludo y pregunta, SIN ficha ni precio ──');
    const t1 = await turno(TEST_WA2, 'Hola');
    check('G13: el primer turno NO manda foto de ninguna referencia',
      !t1.cli.some((m) => m.type === 'image'), t1.cliTxt);
    check('G13: el primer turno NO trae cifra de precio',
      !CIFRA_PRECIO.test(t1.cliTxt), t1.cliTxt);
    check('G13: saluda y pregunta en qué modelo está interesado',
      HAY_SALUDO.test(t1.cliTxt) && /\?/.test(t1.cliTxt), t1.cliTxt);

    // FALLA REAL: a las 11 de la mañana el bot dijo "Buenas noches, bienvenido a VarMan Crew".
    console.log('\n  ── GUION 14 · el saludo va con la franja REAL de Colombia (ahora: ' + franjaBogota() + ') ──');
    check('G14: NO usa el saludo de otra franja (franja real: ' + franjaBogota() + ')',
      !SALUDO_DE_OTRA_FRANJA[franjaBogota()].test(t1.cliTxt), { franja: franjaBogota(), hora: horaBogota(), txt: t1.cliTxt });

    // FALLA REAL: mandó CINCO veces seguidas "👟 Reebok classic 💵 $239.900 🚚 Envío GRATIS… ¿Qué te parece? 😊" ante mensajes distintos.
    console.log('\n  ── GUION 15 · el bot "pegado": dos respuestas seguidas nunca son iguales ──');
    const dichos = [norml(t1.cliTxt)];
    for (const m of ['Cristhian', 'Suba', 'Si', 'Si me gustan esas']) {
      const tt = await turno(TEST_WA2, m);
      dichos.push(norml(tt.cliTxt));
    }
    let repetido = '';
    for (let i = 1; i < dichos.length; i++) if (dichos[i] && dichos[i] === dichos[i - 1]) repetido = dichos[i];
    check('G15: dos respuestas CONSECUTIVAS nunca son idénticas', !repetido, repetido.slice(0, 200));
    const conteo = {};
    for (const d of dichos) if (d) conteo[d] = (conteo[d] || 0) + 1;
    const masRepetida = Object.keys(conteo).sort((a, b) => conteo[b] - conteo[a])[0] || '';
    check('G15: ninguna respuesta se repite 3 veces o más en la conversación',
      !masRepetida || conteo[masRepetida] < 3, { veces: conteo[masRepetida], txt: masRepetida.slice(0, 160) });
  }

  // ---------------------------------------------------------------------------
  console.log('\n──────── CONV G · GUION 16 · Respeto de marca en la búsqueda ────────');
  // FALLA REAL: pidió "Quiero las reebok" y le mandaron "Puma speedcat ballet rosada" y "morada"; luego pidió "las reebok azules" y recibió baletas.
  await limpiarNumero(TEST_WA);
  {
    const t1 = await turno(TEST_WA, 'quiero unas reebok');
    check('G16: NO ofrece un modelo de OTRA marca (turno 1)',
      !otraMarcaEn(t1.cliTxt, 'reebok'), { intruso: otraMarcaEn(t1.cliTxt, 'reebok'), txt: t1.cliTxt });
    check('G16: ofrece Reebok, o dice que no la encontró y pasa a asesor (turno 1)',
      /reebok/i.test(t1.cliTxt) || (DICE_NO_ENCONTRADO.test(t1.cliTxt) && DICE_ASESOR.test(t1.cliTxt)), t1.cliTxt);

    const t2 = await turno(TEST_WA, 'las reebok azules');
    check('G16: NO ofrece un modelo de OTRA marca (turno 2, "las reebok azules")',
      !otraMarcaEn(t2.cliTxt, 'reebok'), { intruso: otraMarcaEn(t2.cliTxt, 'reebok'), txt: t2.cliTxt });
    check('G16: sigue en Reebok, o es honesto y pasa a asesor (turno 2)',
      /reebok/i.test(t2.cliTxt) || (DICE_NO_ENCONTRADO.test(t2.cliTxt) && DICE_ASESOR.test(t2.cliTxt)), t2.cliTxt);
  }

  // ---------------------------------------------------------------------------
  console.log('\n──────── CONV H · GUION 17 · Alias del nombre del modelo (equipment = EQT) ────────');
  // FALLA REAL: el cliente dijo "son las Adidas equipment" y en el catálogo están como "Adidas EQT".
  await limpiarNumero(TEST_WA2);
  {
    const t = await turno(TEST_WA2, 'tienen las adidas equipment?');
    check('G17: encuentra y ofrece la(s) EQT',
      /eqt/i.test(t.cliTxt) || fotosDe(t).some((u) => /p040/.test(u)), { fotos: fotosDe(t), txt: t.cliTxt });
    check('G17: NO dice que no la encontró ni pasa a asesor',
      !DICE_NO_ENCONTRADO.test(t.cliTxt) && !/te\s+escriben|le\s+avis[eé]\s+a\s+nuestro\s+equipo/i.test(t.cliTxt), t.cliTxt);
    check('G17: NO ofrece otra marca en su lugar',
      !otraMarcaEn(t.cliTxt, 'adidas'), { intruso: otraMarcaEn(t.cliTxt, 'adidas'), txt: t.cliTxt });
  }

  // ---------------------------------------------------------------------------
  console.log('\n──────── CONV I · GUION 18 · Tras elegir, NO se mandan más referencias ────────');
  // FALLA REAL: el cliente ya había elegido su referencia y el bot le mandó igual unas baletas rojas que nunca pidió, y después más baletas.
  await limpiarNumero(TEST_WA3);
  {
    const t1 = await turno(TEST_WA3, 'quiero las reebok classic azul');
    const fotos1 = fotosDe(t1);
    check('CONV-I: el bot mostró la referencia elegida', t1.cli.length > 0 && (fotos1.length > 0 || /reebok/i.test(t1.cliTxt)), t1.cliTxt);

    const t2 = await turno(TEST_WA3, 'si, esas me gustan');
    const nuevas = fotosDe(t2).filter((u) => fotos1.indexOf(u) < 0);
    check('G18: NO envía fotos de OTRAS referencias tras elegir',
      nuevas.length === 0, { fotosNuevas: nuevas, fotosPrevias: fotos1 });
    check('G18: NO nombra un modelo de otra marca tras elegir',
      !otraMarcaEn(t2.cliTxt, 'reebok'), { intruso: otraMarcaEn(t2.cliTxt, 'reebok'), txt: t2.cliTxt });
  }

  // ---------------------------------------------------------------------------
  console.log('\n──────── CONV J · GUION 19 · Catálogo fluido (a la PRIMERA, no a la tercera) ────────');
  // FALLA REAL: pidió "compartir catálogo" y el link solo salió a la TERCERA insistencia (antes: dos veces "¿dama o caballero?" y dos veces la misma ficha).
  await limpiarNumero(TEST_WA);
  {
    const t = await turno(TEST_WA, 'Hola me puedes compartir catálogo de los zapatos porfavor');
    check('G19: en ESE turno sale el link del catálogo (o la herramienta enviar_catalogo_web)',
      /varmancrew\.com|#catalogo/i.test(t.cliTxt) || t.tools.indexOf('enviar_catalogo_web') >= 0,
      { tools: t.tools, txt: t.cliTxt });
    check('G19: NO responde con el sondeo de género en vez del catálogo',
      !PREGUNTA_GENERO.test(t.cliTxt), t.cliTxt);
  }

  // ---------------------------------------------------------------------------
  console.log('\n──────── CONV K · GUION 20 · El género se pregunta UNA sola vez ────────');
  // FALLA REAL: el bot preguntó "¿Los buscas para dama o caballero?" dos veces en la misma conversación.
  await limpiarNumero(TEST_WA3);
  {
    let vecesGenero = 0;
    for (const m of ['hola, cuánto valen?', 'no sé, algo cómodo', 'y qué me recomiendas?']) {
      const tt = await turno(TEST_WA3, m);
      if (PREGUNTA_GENERO.test(tt.cliTxt)) vecesGenero++;
    }
    check('G20: pregunta el género como MÁXIMO una vez en toda la conversación',
      vecesGenero <= 1, { veces: vecesGenero });
  }

  // ---------------------------------------------------------------------------
  console.log('\n──────── CONV L · GUION 21 · Foto del cliente (coincide, duda o handoff) ────────');
  // FALLA REAL: el cliente mandó la foto de un modelo concreto y el bot le contestó con otro modelo distinto, sin ninguna duda.
  await limpiarNumero(TEST_WA2);
  {
    const t = await turnoFoto(TEST_WA2, '');
    const nF = fotosDe(t).length;
    check('G21: le responde algo al cliente', t.cli.length > 0 && t.cliTxt.trim().length > 0, t.cliTxt);
    check('G21: NUNCA dice que no puede ver imágenes', !NIEGA_VER_FOTO.test(t.cliTxt), t.cliTxt);
    check('G21: manda como máximo 2 candidatas', nF <= 2, { fotos: nF });
    // [ARNÉS-FIX v10 25-jul] se acepta también la política nueva del dueño: a la
    // PRIMERA falla el bot NO pasa a asesor, dice que no lo encontró y pide
    // precisar (el handoff es a la 2ª — eso lo cubre G29).
    check('G21: o pregunta cuál es de las candidatas, o dice que no lo encontró (y pide precisar o pasa a asesor)',
      (nF >= 1 && nF <= 2 && /alguna\s+de\s+est|es\s+est[eao]|se\s+parece|cu[aá]l\s+de|el\s+modelo\s+que\s+buscas/i.test(t.cliTxt))
      || (DICE_NO_ENCONTRADO.test(t.cliTxt)
          && (DICE_ASESOR.test(t.cliTxt) || /confirmas|cu[aá]l|nombre|marca|modelo/i.test(t.cliTxt))),
      { fotos: nF, txt: t.cliTxt });
    check('G21: nada prohibido llegó al cliente', !PROHIBIDO.test(t.cliTxt), t.cliTxt);
  }

  // ---------------------------------------------------------------------------
  console.log('\n──────── CONV M · GUION 22 · "Precio" pelado como primer mensaje ────────');
  // FALLA REAL: el cliente escribió solo "Precio" y el bot soltó la ficha de una, sin saludar ni preguntar qué modelo busca.
  await limpiarNumero(TEST_WA);
  {
    const t = await turno(TEST_WA, 'Precio');
    check('G22: saluda antes de nada', HAY_SALUDO.test(t.cliTxt), t.cliTxt);
    check('G22: NO suelta la ficha de una (sin foto)', !t.cli.some((m) => m.type === 'image'), t.cliTxt);
    check('G22: encamina con una pregunta hacia el modelo que busca',
      /\?/.test(t.cliTxt), t.cliTxt);
  }

  // ---------------------------------------------------------------------------
  console.log('\n──────── CONV N · GUION 23 · Comando "mancipiola" (resetea la sesión) ────────');
  // FALLA REAL: tras un handoff el bot quedaba mudo con ese cliente y no había forma de volver a probar desde ese número.
  await limpiarNumero(TEST_WA);
  {
    const tH = await turno(TEST_WA, 'quiero hablar con una persona');
    check('G23: el handoff dejó la sesión en silencio', !!(await fsGet('tiendas/varman/botSesiones/' + TEST_WA) || {}).enHandoffAt, tH.cliTxt);

    const tMudo = await turno(TEST_WA, 'sigues ahí?');
    check('G23: con el silencio activo el bot NO le responde al cliente', tMudo.cli.length === 0, tMudo.cliTxt);

    const tR = await turno(TEST_WA, 'mancipiola');
    check('G23: "mancipiola" contesta una confirmación corta',
      tR.cli.length > 0 && tR.cliTxt.trim().length > 0 && tR.cliTxt.length < 220, tR.cliTxt);
    const sesR = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
    check('G23: borra la sesión completa (silencio del handoff + memoria)',
      !sesR || (!sesR.enHandoffAt && !sesR.historial && !sesR.estado), sesR && Object.keys(sesR || {}));

    const tOk = await turno(TEST_WA, 'Hola, quiero ver unas Vans');
    check('G23: el siguiente mensaje del cliente vuelve a ser atendido con normalidad',
      tOk.cli.length > 0 && tOk.cliTxt.trim().length > 0, tOk.cliTxt);
  }

  // el catálogo vuelve a las 17 refs de siempre (las 3 extras eran solo de G13-G23)
  catalogoExtraOff();

  // ===========================================================================
  // TANDA v10 · LA PRUEBA DEL DUEÑO DE HOY EN LA TARDE, POST-v9.9 (G24-G32)
  // Cada guion reproduce una falla REAL de esa prueba o una decisión NUEVA del
  // dueño: deben FALLAR contra el build v9.9 y PASAR con la v10 que el PM está
  // programando ahora. OJO para el PM: G24 invierte la expectativa de G11 (los
  // 2 datos juntos) y G29 refina la de G8 (handoff a la primera); con la v10
  // esos dos guiones VIEJOS quedan por ajustar. Coste: ≈45 llamadas más a Gemini.
  // Se reusan las 3 refs extra (Reebok Classic azul / baletas Puma) para G27.
  // ===========================================================================
  catalogoExtraOn();

  // ---------------------------------------------------------------------------
  console.log('\n──────── CONV O · GUION 24 (datos de a UNO en Bogotá) + GUION 30b (el pedido SÍ avisa al 320) ────────');
  // FALLA REAL (decisión nueva): ya no se piden nombre+dirección en UN mensaje — el bloque "solo necesito dos datos 📌📌" quedó prohibido.
  await limpiarNumero(TEST_WA3);
  {
    console.log('  · muestra un modelo');
    await turno(TEST_WA3, 'Hola, quiero ver unas Converse');

    console.log('\n  ── GUION 24 · "estoy en Bogotá": se pide SOLO el nombre ──');
    const t1 = await turno(TEST_WA3, 'estoy en Bogotá');
    check('G24: pide el NOMBRE', /nombre/i.test(t1.cliTxt), t1.cliTxt);
    check('G24: NO pide la dirección en el MISMO mensaje', !/direcci[oó]n/i.test(t1.cliTxt), t1.cliTxt);
    check('G24: sin el bloque prohibido de los 2 datos (📌)', !BLOQUE_DOS_DATOS.test(t1.cliTxt), t1.cliTxt);

    console.log('\n  ── GUION 24 · da el nombre: AHORA sí se pide la dirección ──');
    const t2 = await turno(TEST_WA3, 'Cristhian Mancipe');
    check('G24: tras el nombre pide la dirección', /direcci[oó]n/i.test(t2.cliTxt), t2.cliTxt);

    console.log('\n  ── GUION 30b · con los datos completos, el aviso de PEDIDO sí llega al 320 ──');
    const t3 = await turno(TEST_WA3, 'TV 88173, apto 501, barrio Suba');
    check('G30: el flujo que registra pedido SÍ avisa al 320 (PEDIDO/datos_completos)',
      !DUENO || /pedido|datos_completos/i.test(t2.ownTxt + '\n' + t3.ownTxt), { own2: t2.ownTxt, own3: t3.ownTxt });
  }

  // ---------------------------------------------------------------------------
  console.log('\n──────── CONV P · GUION 25 · Link de Wompi FORZADO fuera de Bogotá ────────');
  // FALLA REAL (Tunja): el cliente dijo "Si" DOS veces a "¿las dejamos listas?" y el link nunca salió; el bot hasta preguntó "¿te quedó alguna duda con el link de Wompi?" sin haberlo enviado.
  await limpiarNumero(TEST_WA);
  {
    console.log('  · muestra un modelo (Reebok = marca única del fixture)');
    await turno(TEST_WA, 'Hola, muéstrame unas Reebok');
    const t2 = await turno(TEST_WA, 'estoy en Tunja');
    const linkYa = t2.tools.indexOf('crear_link_wompi') >= 0 || /checkout\.wompi|wompi\.co\/l\//i.test(t2.cliTxt);
    check('G25: fuera de Bogotá NO ofrece contra entrega', !/contra\s*-?\s*entrega|contraentrega/i.test(t2.cliTxt), t2.cliTxt);
    const t3 = await turno(TEST_WA, 'Si porfabor');
    check('G25: al "Si porfabor" sale el link de Wompi en ESE turno (herramienta o URL)',
      t3.tools.indexOf('crear_link_wompi') >= 0 || /checkout\.wompi|wompi\.co\/l\//i.test(t3.cliTxt) || linkYa,
      { tools: t3.tools, linkYaEnTunja: linkYa, txt: t3.cliTxt });
    check('G25: NO se queda en el limbo repitiendo la misma oferta',
      t3.cli.length > 0 && norml(t3.cliTxt) !== norml(t2.cliTxt), t3.cliTxt);
  }

  // ---------------------------------------------------------------------------
  console.log('\n──────── CONV Q · GUION 26 · Asentimiento con typo ("Si milgracias") ────────');
  // PEDIDO DEL DUEÑO: entender "si milgracias" / "si porfavo" / "porfabor" / "profavor" como un SÍ y avanzar.
  await limpiarNumero(TEST_WA2);
  {
    console.log('  · el bot hace una oferta clara');
    const t1 = await turno(TEST_WA2, 'Hola, quiero ver unas Vans');
    const t2 = await turno(TEST_WA2, 'Si milgracias');
    check('G26: el bot AVANZA (responde y no repite la pregunta del turno anterior)',
      t2.cli.length > 0 && norml(t2.cliTxt) !== norml(t1.cliTxt), t2.cliTxt);
    check('G26: NO saluda de cero', !SALUDO_DE_CERO.test(t2.cliTxt), t2.cliTxt);
    const ses26 = await fsGet('tiendas/varman/botSesiones/' + TEST_WA2);
    check('G26: NO pasa a asesor por un simple typo',
      !FRASE_HANDOFF.test(t2.cliTxt) && !(ses26 && ses26.enHandoffAt), t2.cliTxt);
  }

  // ---------------------------------------------------------------------------
  console.log('\n──────── CONV R · GUION 27 · Color dentro del modelo ACTIVO ────────');
  // FALLA REAL: viendo la Reebok Classic pidió "Las quiero café" y el bot le mostró unas NIKE SB Cafe (otra marca) y habló de "otras Adidas".
  await limpiarNumero(TEST_WA3);
  {
    console.log('  · ficha del modelo elegido');
    await turno(TEST_WA3, 'quiero las reebok classic azul');
    const t2 = await turno(TEST_WA3, 'las quiero café');
    check('G27: NO trae un modelo de OTRA marca al pedir el color',
      !otraMarcaEn(t2.cliTxt, 'reebok'), { intruso: otraMarcaEn(t2.cliTxt, 'reebok'), txt: t2.cliTxt });
    check('G27: NO manda fotos de referencias ajenas al modelo activo',
      !fotosDe(t2).some((u) => /p040|p042/.test(u)), { fotos: fotosDe(t2) });
    check('G27: se queda en el modelo (solo el color de la foto / hermanas del mismo / ese color no está)',
      /reebok|classic/i.test(t2.cliTxt) || DICE_NO_ENCONTRADO.test(t2.cliTxt)
      || /solo\s+.{0,30}color|[uú]nico\s+color|en\s+caf[eé]\s+no/i.test(t2.cliTxt), t2.cliTxt);
  }

  // ---------------------------------------------------------------------------
  console.log('\n──────── CONV S · GUION 28 · No re-saludar a mitad de conversación ────────');
  // FALLA REAL: con pedido ya andando, un "Hola" del cliente disparó la apertura completa otra vez ("Buenas tardes, bienvenido a VarMan Crew. Mi nombre es…").
  await limpiarNumero(TEST_WA);
  {
    console.log('  · conversación con historial (modelo ya mostrado)');
    await turno(TEST_WA, 'Hola, muéstrame unas Vans');
    const t2 = await turno(TEST_WA, 'Hola');
    check('G28: NO repite la apertura ("bienvenido a VarMan Crew" / "mi nombre es")',
      !SALUDO_DE_CERO.test(t2.cliTxt), t2.cliTxt);
    check('G28: re-ancla a lo pendiente (responde y encamina)',
      t2.cli.length > 0 && /vans|modelo|ciudad|env[ií]o|pago|\?/i.test(t2.cliTxt), t2.cliTxt);
  }

  // ---------------------------------------------------------------------------
  console.log('\n──────── CONV T · GUION 29 · Asesor solo a la SEGUNDA falla (D1 refinada) ────────');
  // DECISIÓN NUEVA: la 1ª vez que algo no aparece → "no lo encontré" + confirmar nombre u ofrecer parecidos SIN handoff; el asesor va a la 2ª falla por lo mismo.
  await limpiarNumero(TEST_WA2);
  {
    const t1 = await turno(TEST_WA2, 'tienen las jordan retro 99 moradas?');
    const ses1 = await fsGet('tiendas/varman/botSesiones/' + TEST_WA2);
    check('G29: 1ª falla SIN handoff (ni traspaso en el texto ni enHandoffAt en Firestore)',
      !FRASE_HANDOFF.test(t1.cliTxt) && !(ses1 && ses1.enHandoffAt),
      { cli: t1.cliTxt, enHandoffAt: ses1 && ses1.enHandoffAt });
    check('G29: 1ª falla honesta (no lo encontró / confirma el nombre / ofrece parecidos)',
      DICE_NO_ENCONTRADO.test(t1.cliTxt) || /confirm|nombre\s+exacto|parecid|similar/i.test(t1.cliTxt), t1.cliTxt);
    const t2 = await turno(TEST_WA2, 'si, las jordan retro 99 moradas, esas mismas');
    const ses2 = await fsGet('tiendas/varman/botSesiones/' + TEST_WA2);
    check('G29: a la 2ª falla por lo MISMO, ahora SÍ handoff (traspaso + aviso al 320 + silencio)',
      /equipo|asesor|320/i.test(t2.cliTxt) && (!DUENO || t2.own.length > 0) && !!(ses2 && ses2.enHandoffAt),
      { cli: t2.cliTxt, own: t2.ownTxt, enHandoffAt: ses2 && ses2.enHandoffAt });
  }

  // ---------------------------------------------------------------------------
  console.log('\n──────── CONV U · GUION 30 · Avisos al 320 recortados (solo pedido y plata) ────────');
  // DECISIÓN DEL DUEÑO: al 320 solo llegan avisos de PEDIDO y de PLATA; "foto_recibida" e "intencion_compra" sobran (el reenvío de la foto sí puede seguir).
  await limpiarNumero(TEST_WA3);
  {
    const t1 = await turnoFoto(TEST_WA3, '');
    const t2 = await turno(TEST_WA3, 'me encantan, las quiero comprar ya');
    const ownAcum = t1.ownTxt + '\n' + t2.ownTxt;
    check('G30: la foto del cliente NO genera aviso "foto_recibida" al 320',
      !/foto_recibida/i.test(ownAcum), ownAcum);
    check('G30: la intención de compra NO genera aviso "intencion_compra" al 320',
      !/intencion_compra/i.test(ownAcum), ownAcum);
  }

  // ---------------------------------------------------------------------------
  console.log('\n──────── CONV V · GUION 31 · La máquina vieja está MUERTA con el cerebro encendido ────────');
  // FALLA REAL: bajo carga Gemini fallaba y contestaban las plantillas viejas ("¡Hola! Bienvenido 👟 ¿Te interesa el modelo de nuestra publicación? 😊", "no alcanzo a ver las imágenes").
  await limpiarNumero(TEST_WA);
  {
    const t = await turnoGeminiCaido(TEST_WA, 'Hola, quiero ver unas Vans');
    check('G31: con Gemini caído sale UNA sola respuesta al cliente', t.cli.length === 1, { mensajes: t.cli.length, txt: t.cliTxt });
    check('G31: la respuesta es corta y neutra (sin ficha, sin precio, sin foto)',
      t.cliTxt.trim().length > 0 && t.cliTxt.length < 350 && !CIFRA_PRECIO.test(t.cliTxt) && !t.cli.some((m) => m.type === 'image'), t.cliTxt);
    check('G31: JAMÁS la plantilla vieja ("¿Te interesa el modelo…?" / "no alcanzo a ver" / "asistente virtual")',
      !PLANTILLA_VIEJA.test(t.cliTxt), t.cliTxt);
  }

  // ---------------------------------------------------------------------------
  console.log('\n──────── CONV W · GUION 32 · Candado por cliente (dos mensajes seguidos en carrera) ────────');
  // FALLA REAL: "Cristhian mancipe" + "TV 88173" enviados seguidos → dos ejecuciones en paralelo → respuestas dobles y un "Si" que recibió saludo de cero por leer la sesión vieja.
  // El arnés SÍ aguanta el paralelismo real (Promise.all sobre el runner); las
  // aserciones son generosas a propósito porque el orden de la carrera varía.
  await limpiarNumero(TEST_WA2);
  {
    console.log('  · conversación con historial (modelo + ciudad)');
    await turno(TEST_WA2, 'Hola, quiero ver unas Converse');
    await turno(TEST_WA2, 'estoy en Bogotá');
    console.log('  · DOS turnos del MISMO número disparados EN PARALELO');
    const [pA, pB] = await turnosEnParalelo(TEST_WA2, ['Cristhian mancipe', 'TV 88173, apto 101']);
    check('G32: ambos turnos de la carrera reciben respuesta',
      pA.cli.length > 0 && pB.cli.length > 0, { a: pA.cliTxt, b: pB.cliTxt });
    check('G32: ninguna respuesta es un saludo de bienvenida de cero (ya había historial)',
      !SALUDO_DE_CERO.test(pA.cliTxt) && !SALUDO_DE_CERO.test(pB.cliTxt), { a: pA.cliTxt, b: pB.cliTxt });
    check('G32: no hay dos respuestas idénticas (el candado serializa la sesión)',
      norml(pA.cliTxt) !== norml(pB.cliTxt), { a: pA.cliTxt.slice(0, 160), b: pB.cliTxt.slice(0, 160) });
    const tPost = await turno(TEST_WA2, 'listo, eso es todo');
    check('G32: el candado queda LIBERADO (el siguiente turno se atiende normal)',
      tPost.cli.length > 0 && tPost.cliTxt.trim().length > 0, tPost.cliTxt);
  }

  // limpieza de la tanda v10: candados por número (botLocks) y catálogo de vuelta
  for (const wa of [TEST_WA, TEST_WA2, TEST_WA3]) await fsDel('tiendas/varman/botLocks/' + wa);
  catalogoExtraOff();

  // ---------------------------------------------------------------------------
  console.log('\n== Limpieza final de documentos de prueba ==');
  await limpiarTodo();

  console.log('\n== Llamadas reales a Gemini en esta corrida: ' + geminiTotal + ' ==');
  console.log('== RESULTADO CEREBRO: ' + ok + ' PASS · ' + mal + ' FAIL ==');
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error('\nERROR FATAL DEL ARNÉS:', e && e.stack || e); process.exit(3); });

// ---------- utilidades del arnés ----------
function fmt(n) { return '$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

async function limpiarNumero(wa) {
  await fsDel('tiendas/varman/botSesiones/' + wa);
  await fsDel('tiendas/varman/botRate/' + wa);
}
async function limpiarTodo() {
  for (const wa of [TEST_WA, TEST_WA2, TEST_WA3]) await limpiarNumero(wa);
  await fsDel('tiendas/varman/botAnuncios/' + SID_PRUEBA);
  // pedidos de prueba (los creó crear_link_wompi / registrar_pedido)
  for (const d of await fsRunQuery('pedidos', 60, 'creado')) {
    if ([TEST_WA, TEST_WA2, TEST_WA3].indexOf(String(d.cliente_wa || '')) >= 0) await fsDel(d._path);
  }
  // errores registrados con nuestros números
  for (const e of await fsRunQuery('botErrores', 40, 'fecha')) {
    if ([TEST_WA, TEST_WA2, TEST_WA3].indexOf(String(e.wa_id || '')) >= 0) await fsDel(e._path);
  }
  // dedup + candados de link que crearon las corridas de prueba
  try {
    const proc = await httpReal({ method: 'GET', url: FS_BASE + '/tiendas/varman/botProcesados?pageSize=300', headers: { Authorization: 'Bearer ' + await tokenAdmin() } });
    for (const d of (proc.documents || [])) {
      const id = d.name.split('/').pop();
      if (id.indexOf('wamidTEST') === 0 || id.indexOf('iawlink_' + TEST_WA) === 0 || id.indexOf('iawlink_' + TEST_WA2) === 0 || id.indexOf('iawlink_' + TEST_WA3) === 0) {
        await fsDel('tiendas/varman/botProcesados/' + id);
      }
    }
  } catch (e) {}
}
