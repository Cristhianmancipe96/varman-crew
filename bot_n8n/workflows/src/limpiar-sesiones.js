// ============ BARRIDO DIARIO: sesiones caducadas + resumen al dueño ============
// Corre con el Schedule Trigger (diario 3:15am Bogotá) mientras el workflow
// esté ACTIVO. Complementa la limpieza al vuelo del Cerebro (que solo borra la
// sesión caducada cuando ESE cliente vuelve a escribir): este barrido elimina
// las sesiones de clientes que nunca volvieron.
// Usa el updateTime de Firestore (metadato) como respaldo si falta updatedAt.
// v5: también borra los contadores anti-spam viejos (botRate) y arma el
// RESUMEN DIARIO al 320 (pedidos nuevos + errores de las últimas 24h). La
// salida de este nodo va al nodo "Enviar a WhatsApp": SOLO debe devolver
// payloads válidos de mensaje (o [] si no hay OWNER_WHATSAPP configurado).
const H = this.helpers;
const crypto = require('crypto');
const FS_BASE = 'https://firestore.googleapis.com/v1/projects/varman-crew/databases/(default)/documents';

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
function fmtPrecio(n) {
  return '$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// barre una colección borrando los docs con updatedAt (o updateTime) más
// viejos que maxMs; devuelve cuántos borró
async function barrer(tok, coleccion, maxMs) {
  let borradas = 0;
  let pageToken = '';
  do {
    const url = FS_BASE + '/tiendas/varman/' + coleccion + '?pageSize=300' + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
    const r = await H.httpRequest({ method: 'GET', url,
      headers: { Authorization: 'Bearer ' + tok }, json: true, timeout: 20000 });
    for (const d of (r.documents || [])) {
      const f = d.fields || {};
      const updatedAt = (f.updatedAt && f.updatedAt.stringValue) || d.updateTime;
      const edad = Date.now() - Date.parse(updatedAt);
      if (isNaN(edad) || edad > maxMs) {
        try {
          await H.httpRequest({ method: 'DELETE', url: 'https://firestore.googleapis.com/v1/' + d.name,
            headers: { Authorization: 'Bearer ' + tok }, json: true, timeout: 15000 });
          borradas++;
        } catch (e) {}
      }
    }
    pageToken = r.nextPageToken || '';
  } while (pageToken);
  return borradas;
}

// últimos docs de una subcolección de tiendas/varman ordenados por un campo
async function ultimos(tok, coleccion, campo, n) {
  const r = await H.httpRequest({ method: 'POST', url: FS_BASE + '/tiendas/varman:runQuery',
    headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: { structuredQuery: {
      from: [{ collectionId: coleccion }],
      orderBy: [{ field: { fieldPath: campo }, direction: 'DESCENDING' }],
      limit: n
    } }, json: true, timeout: 15000 });
  return (Array.isArray(r) ? r : []).filter((x) => x.document).map((x) => fromFs(x.document));
}

// nº de números DISTINTOS que le escribieron al bot en las últimas 24h. Cada
// contacto deja un doc botRate/{wa} (anti-spam) cuyo updatedAt es su último
// mensaje → contarlos ANTES del barrido = "conversaciones iniciadas".
async function contarConversaciones(tok, maxMs) {
  let n = 0, pageToken = '';
  const limite = Date.now() - maxMs;
  do {
    const url = FS_BASE + '/tiendas/varman/botRate?pageSize=300' + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
    const r = await H.httpRequest({ method: 'GET', url, headers: { Authorization: 'Bearer ' + tok }, json: true, timeout: 20000 });
    for (const d of (r.documents || [])) {
      const f = d.fields || {};
      const ua = (f.updatedAt && f.updatedAt.stringValue) || d.updateTime;
      if (Date.parse(ua) >= limite) n++;
    }
    pageToken = r.nextPageToken || '';
  } while (pageToken);
  return n;
}

const tok = await tokenAdmin();
const conversaciones = await contarConversaciones(tok, 24 * 3600 * 1000); // antes de barrer botRate
const sesionesBorradas = await barrer(tok, 'botSesiones', 24 * 3600 * 1000);
// dedup del webhook (message_ids ya procesados): se conservan 24h, luego fuera
await barrer(tok, 'botProcesados', 24 * 3600 * 1000);
// contadores anti-spam: el contador vale 1 minuto, pero su updatedAt es el
// "último mensaje del cliente" y el trigger horario lo usa para saber si la
// ventana de 24h está abierta (reseñas/guías) → se conservan 25h, no 1h
await barrer(tok, 'botRate', 25 * 3600 * 1000);
// [FIX-COLECCIONES-SIN-PODA] (barrido r2) `botLocks` es nueva de la v10 y nadie
// la limpiaba: un candado huérfano (n8n matado, OOM en la VM de 1 GB) se quedaba
// ahí para siempre y el doc se acumulaba. El candado vivo dura segundos, así que
// cualquiera de más de una hora es basura y borrarlo es seguro. `botErrores`
// tampoco se podaba: es la bitácora que el dueño ve en la app y en el resumen,
// pero un mes de errores en la VM chica no le sirve a nadie — se conservan 30
// días. (`botAnuncios` NO se toca a propósito: es el mapa de anuncios que el
// dueño usa para asignar refs, no un dato de paso.)
await barrer(tok, 'botLocks', 1 * 3600 * 1000);
await barrer(tok, 'botErrores', 30 * 24 * 3600 * 1000);

// ---- resumen diario al dueño (últimas 24h) ----
const dueno = String($env.OWNER_WHATSAPP || '').replace(/\D/g, '');
if (!dueno) return [];

const hace24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
let lineasPedidos = TEXTOS.resumenSinPedidos;
let nPedidos = 0;
let nErrores = 0;
let lineasErrores = '';
try {
  const pedidos = (await ultimos(tok, 'pedidos', 'creado', 30)).filter((p) => (p.creado || '') >= hace24h);
  nPedidos = pedidos.length;
  if (nPedidos) {
    lineasPedidos = pedidos.slice(0, 10).map((p) => T(TEXTOS.resumenLineaPedido, {
      ref: p.ref || '?', talla: p.talla || '?', total: fmtPrecio(p.total || 0), estado: String(p.estado || '').replace(/_/g, ' ')
    })).join('');
  }
} catch (e) {}
try {
  const errs = (await ultimos(tok, 'botErrores', 'fecha', 30)).filter((x) => (x.fecha || '') >= hace24h);
  nErrores = errs.length;
  lineasErrores = errs.slice(0, 5).map((x) => T(TEXTOS.resumenLineaError, {
    origen: x.origen || '?', error: String(x.error || '').slice(0, 120)
  })).join('');
} catch (e) {}

const cuerpo = T(TEXTOS.resumenDiarioTitulo, {
  fecha: new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', year: 'numeric' }),
  conversaciones, pedidos: nPedidos, lineasPedidos, errores: nErrores, lineasErrores, sesiones: sesionesBorradas
});
// [AVISO-PLANTILLA] msjAvisoDueno (textos.js): con BOT_AVISO_PLANTILLA=on el
// resumen va como PLANTILLA aprobada → llega aunque la ventana de 24h esté
// cerrada (el caso real: a las 3:15am casi siempre lo está y el resumen se
// perdía en silencio). Flag OFF = texto libre EXACTO como hoy.
return [{ json: msjAvisoDueno(dueno, cuerpo) }];
