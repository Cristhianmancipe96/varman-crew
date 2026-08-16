// ============ TRIGGER 5 MIN: rescate del modo conversa (~3 min de silencio) ============
// (flag BOT_MODO_CONVERSA, reunión socios 22-jul) Si el bot mostró info (ficha,
// precio, marca) y el cliente NO respondió en ~3 minutos, se le ofrece UNA sola
// vez el catálogo de la web para que compre por ahí. La salida va DIRECTO al
// nodo "Enviar a WhatsApp" (payloads válidos o []).
// - Con el flag OFF: devuelve [] SIN tocar Firestore (cero carga, cero cambios).
// - Ventana de 24h abierta por definición: convEsperaAt nace del último
//   mensaje del cliente (minutos antes).
// - UNA vez por sesión (convRescatado); las sesiones las limpia el barrido diario.
// textos.js va pegado ANTES de este archivo (TEXTOS y T disponibles).
const H = this.helpers;
const crypto = require('crypto');
const FS_BASE = 'https://firestore.googleapis.com/v1/projects/varman-crew/databases/(default)/documents';

const FLAG_MODO_CONVERSA = /^(on|1|true|si|s[ií])$/i.test(String($env.BOT_MODO_CONVERSA || '').trim());
if (!FLAG_MODO_CONVERSA) return [];

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function tokenAdmin() {
  const sa = JSON.parse(Buffer.from($env.FIREBASE_SA_B64, 'base64').toString('utf8'));
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600
  }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(header + '.' + claims);
  const jwt = header + '.' + claims + '.' + b64url(signer.sign(sa.private_key));
  const r = await H.httpRequest({
    method: 'POST', url: 'https://oauth2.googleapis.com/token',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt,
    timeout: 15000, json: true
  });
  return r.access_token;
}
function unwrap(v) {
  if (v == null) return null;
  if ('integerValue' in v) return parseInt(v.integerValue, 10);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('stringValue' in v) return v.stringValue;
  return null;
}
function fromFs(doc) {
  if (!doc || !doc.fields) return null;
  const o = {};
  for (const k in doc.fields) o[k] = unwrap(doc.fields[k]);
  return o;
}
async function fsMerge(tok, path, obj) {
  const mask = Object.keys(obj).map((k) => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
  const fields = {};
  for (const k in obj) {
    const v = obj[k];
    if (typeof v === 'number') fields[k] = { integerValue: String(Math.round(v)) };
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    else fields[k] = { stringValue: String(v) };
  }
  await H.httpRequest({ method: 'PATCH', url: FS_BASE + '/' + path + '?' + mask,
    headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: { fields }, json: true, timeout: 15000 });
}
// [FIX-RESCATE-PISA-TURNO] lectura puntual de un doc (null si no existe)
async function fsGet(tok, path) {
  try {
    const r = await H.httpRequest({ method: 'GET', url: FS_BASE + '/' + path,
      headers: { Authorization: 'Bearer ' + tok }, json: true, timeout: 10000 });
    return fromFs(r);
  } catch (e) { return null; }
}
async function listar(tok, coleccion) {
  const docs = [];
  let pageToken = '';
  do {
    const url = FS_BASE + '/tiendas/varman/' + coleccion + '?pageSize=300' + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
    const r = await H.httpRequest({ method: 'GET', url,
      headers: { Authorization: 'Bearer ' + tok }, json: true, timeout: 20000 });
    for (const d of (r.documents || [])) {
      const o = fromFs(d) || {};
      o._id = d.name.split('/').pop();
      docs.push(o);
    }
    pageToken = r.nextPageToken || '';
  } while (pageToken);
  return docs;
}
function msjTexto(to, body) {
  return { messaging_product: 'whatsapp', to, type: 'text', text: { body } };
}

const MIN_MS = 60 * 1000;
const salida = [];
const tok = await tokenAdmin();
const dueno = String($env.OWNER_WHATSAPP || '').replace(/\D/g, '');

try {
  const sesiones = await listar(tok, 'botSesiones');
  for (const s of sesiones) {
    if (!s.convEsperaAt) continue;                 // no quedó esperando nada
    if (s.convRescatado === true) continue;        // UNA sola vez por sesión
    if (s.enHandoffAt) continue;                   // el humano la tiene: silencio
    if (!s._id || s._id === dueno) continue;       // al dueño no (pruebas)
    // [FIX-RESCATE-PISA-TURNO] (barrido 25-jul) este trigger solo miraba la edad
    // de convEsperaAt. Dos agujeros: (1) el cerebro nunca limpia convEsperaAt,
    // así que un campo heredado del modo conversa quedaba FÓSIL y disparaba la
    // invitación al catálogo web en mitad de una negociación que iba bien; (2)
    // no consultaba el candado, así que podía escribirle al cliente mientras su
    // turno estaba en vuelo. Ahora: si el cliente habló hace poco (updatedAt
    // fresco) o tiene un turno corriendo, no se le empuja nada.
    const act = Date.parse(s.updatedAt || '');
    if (!isNaN(act) && Date.now() - act < 3 * MIN_MS) continue; // conversación viva
    // ¿la atiende el cerebro? Se mira por sus campos propios (prefijo `ia`, que
    // sí viajan planos); el `historial` es un array y fromFs no lo desenvuelve.
    let esDelCerebro = false;
    for (const k in s) { if (/^ia[A-Z]/.test(k) && s[k]) { esDelCerebro = true; break; } }
    if (esDelCerebro) {
      // [CIERRE-ASESOR-IA] (3-ago) antes esto era `continue` a secas ("el
      // cerebro lleva su propio rescate" — que nunca existió): NINGÚN cliente
      // del cerebro recibía seguimiento. Ahora, con BOT_CIERRE_ASESOR on, a las
      // ~3 HORAS de silencio se le retoma la conversación UNA sola vez
      // (iaRescatado). Solo si había un modelo en juego (iaRef): a un "hola"
      // suelto no se le insiste. La ventana de 24h de Meta aguanta hasta 12h.
      const FLAG_CIERRE_ASESOR = /^(on|1|true|si|s[ií])$/i.test(String($env.BOT_CIERRE_ASESOR || '').trim());
      if (!FLAG_CIERRE_ASESOR) continue;
      if (s.iaRescatado === true) continue;
      if (!s.iaRef) continue;
      const edadIA = Date.now() - Date.parse(s.updatedAt || '');
      if (isNaN(edadIA) || edadIA < 180 * MIN_MS || edadIA > 12 * 60 * MIN_MS) continue;
      await fsMerge(tok, 'tiendas/varman/botSesiones/' + s._id, { iaRescatado: true });
      salida.push(msjTexto(s._id, TEXTOS.rescateCerebro));
      continue;
    }
    try {
      const lock = await fsGet(tok, 'tiendas/varman/botLocks/' + s._id);
      if (lock) continue; // turno en vuelo: no escribir encima
    } catch (e) {}
    const edad = Date.now() - Date.parse(s.convEsperaAt);
    // entre 3 min y 12h (más viejo = conversación muerta, no molestar)
    if (isNaN(edad) || edad < 3 * MIN_MS || edad > 12 * 60 * MIN_MS) continue;
    // se marca ANTES de encolar: mejor perder un rescate que repetirlo
    await fsMerge(tok, 'tiendas/varman/botSesiones/' + s._id, { convRescatado: true });
    // en el paso de DATOS el empujón pide los 2 datos que faltan (no el
    // catálogo); en la conversa (sin pedido) va la invitación al catálogo web
    salida.push(msjTexto(s._id, s.estado === 'datos'
      ? TEXTOS.conversaRescateDatos
      : T(TEXTOS.conversaRescate, { url: TEXTOS.catalogoWebUrl })));
  }
} catch (e) {}

return salida.map((m) => ({ json: m }));
