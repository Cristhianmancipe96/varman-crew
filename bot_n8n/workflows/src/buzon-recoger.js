// ============ BUZÓN · recoger los maduros y juntarlos (cada minuto) ============
// (decisión del dueño, 16-ago-2026) La otra mitad del buzón. Corre cada minuto,
// mira qué clientes tienen mensajes esperando y, para los que ya cumplieron la
// ventana, junta TODO lo que escribieron en un solo item y lo manda al Cerebro.
// El Cerebro no se entera de nada: recibe exactamente la misma forma de item
// que le entrega "Parsear mensaje". Por eso este cambio no lo toca.
//
// La ventana se abre con el PRIMER mensaje del cliente (BOT_BUZON_SEGUNDOS, 45
// por defecto). Ojo con la espera REAL: como el que revisa corre cada minuto,
// un cliente espera entre 45 y 105 segundos, ~75 de media. Bajar el trigger a
// 30 segundos lo dejaría en 45-75, pero dobla las ejecuciones diarias y esta
// VM es de 1 GB — no vale la pena sin medir antes.
//
// Con BOT_BUZON OFF devuelve [] sin tocar Firestore: el nodo queda inerte.
// No lleva textos.js pegado: no usa ni una frase, y son 256 KB por nodo.
const H = this.helpers;
const crypto = require('crypto');
const FS_BASE = 'https://firestore.googleapis.com/v1/projects/varman-crew/databases/(default)/documents';

const FLAG_BUZON = /^(on|1|true|si|s[ií])$/i.test(String($env.BOT_BUZON || '').trim());
if (!FLAG_BUZON) return [];

const VENTANA_MS = Math.max(5, parseInt($env.BOT_BUZON_SEGUNDOS, 10) || 45) * 1000;
// Un buzón más viejo que esto quedó huérfano (el Cerebro murió a mitad de
// turno): se procesa igual en vez de dejar al cliente esperando para siempre.
const HUERFANO_MS = 15 * 60 * 1000;
// Tope de mensajes que se juntan en un turno. Un álbum de 9 fotos no puede
// reventar el prompt (hallazgo #4 del barrido del 20-jul).
const MAX_MSGS = 20;

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
  if ('booleanValue' in v) return v.booleanValue;
  if ('stringValue' in v) return v.stringValue;
  return null;
}
async function borrar(tok, docId) {
  try {
    await H.httpRequest({ method: 'DELETE',
      url: FS_BASE + '/tiendas/varman/botBuzon/' + encodeURIComponent(docId),
      headers: { Authorization: 'Bearer ' + tok }, timeout: 10000 });
  } catch (e) { /* si no se borra, el siguiente turno lo vuelve a intentar */ }
}

let tok;
try { tok = await tokenAdmin(); } catch (e) { return []; }

// ---- leer el buzón entero (es chico por definición: solo lo que no maduró) ----
const docs = [];
try {
  let pageToken = '';
  do {
    const url = FS_BASE + '/tiendas/varman/botBuzon?pageSize=300'
      + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
    const r = await H.httpRequest({ method: 'GET', url,
      headers: { Authorization: 'Bearer ' + tok }, json: true, timeout: 20000 });
    for (const d of (r.documents || [])) {
      const f = d.fields || {};
      docs.push({
        _id: d.name.split('/').pop(),
        wa: unwrap(f.wa) || '',
        recibidoAt: unwrap(f.recibidoAt) || '',
        payload: unwrap(f.payload) || ''
      });
    }
    pageToken = r.nextPageToken || '';
  } while (pageToken);
} catch (e) { return []; }

if (!docs.length) return [];

// ---- agrupar por cliente ----
const porCliente = {};
for (const d of docs) {
  if (!d.wa) { await borrar(tok, d._id); continue; }   // basura: fuera
  (porCliente[d.wa] = porCliente[d.wa] || []).push(d);
}

const ahora = Date.now();
const salida = [];

for (const wa in porCliente) {
  const grupo = porCliente[wa].sort((a, b) => String(a.recibidoAt).localeCompare(String(b.recibidoAt)));
  const primero = Date.parse(grupo[0].recibidoAt) || ahora;
  const edad = ahora - primero;

  // Todavía dentro de la ventana: se deja madurar, se revisa al minuto siguiente.
  if (edad < VENTANA_MS && edad < HUERFANO_MS) continue;

  // ---- reconstruir los mensajes ----
  const msgs = [];
  for (const d of grupo.slice(0, MAX_MSGS)) {
    try { msgs.push(JSON.parse(d.payload)); } catch (e) { /* payload roto: se ignora */ }
  }
  // el buzón se vacía SIEMPRE, incluso lo que pasó del tope: si no, esos
  // documentos quedarían dando vueltas y se reprocesarían cada minuto
  for (const d of grupo) await borrar(tok, d._id);
  if (!msgs.length) continue;

  // ---- juntarlos en UN solo item con la forma de "Parsear mensaje" ----
  // Base: el ÚLTIMO mensaje (el estado más reciente del cliente).
  const base = Object.assign({}, msgs[msgs.length - 1]);

  // El referral de Meta (de qué anuncio viene) SOLO llega en el primer mensaje:
  // se rescata del primero que lo traiga o se pierde la atribución de la pauta.
  for (const m of msgs) {
    if (!base.fuente && m.fuente) {
      base.fuente = m.fuente;
      base.fuente_titulo = m.fuente_titulo || base.fuente_titulo || '';
      base.fuente_tipo = m.fuente_tipo || base.fuente_tipo || '';
      base.fuente_url = m.fuente_url || base.fuente_url || '';
    }
    if (!base.nombre && m.nombre) base.nombre = m.nombre;
  }

  // Textos: todos, en orden, uno por línea. El Cerebro los lee como un solo
  // mensaje del cliente y responde a todo junto.
  const textos = msgs.map((m) => String(m.texto || '').trim()).filter(Boolean);
  base.texto = textos.join('\n');

  // Fotos: el Cerebro solo puede mirar UNA por turno. Se usa la PRIMERA que
  // mandó (es la del modelo por el que pregunta) y, si mandó más, se le dice
  // al Cerebro cuántas para que responda una sola vez a todo el álbum.
  const fotos = msgs.map((m) => String(m.imagen_id || '')).filter(Boolean);
  if (fotos.length) {
    base.imagen_id = fotos[0];
    base.tipo = 'image';
    if (fotos.length > 1) {
      base.texto = (base.texto ? base.texto + '\n' : '')
        + '[el cliente envió ' + fotos.length + ' fotos en este rato]';
    }
  } else if (textos.length) {
    base.tipo = 'text';
    base.imagen_id = '';
  }

  // Botón o lista: gana el último que haya tocado.
  const inters = msgs.map((m) => String(m.inter_id || '')).filter(Boolean);
  base.inter_id = inters.length ? inters[inters.length - 1] : '';

  // Marca de agua para el barrido: cuántos mensajes se juntaron en este turno.
  base.buzon_juntados = msgs.length;

  salida.push({ json: base });
}

return salida;
