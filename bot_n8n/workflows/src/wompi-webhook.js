// ============ WOMPI WEBHOOK (v6) — confirmación automática de pagos ============
// Fuente legible del nodo Code "Wompi webhook (procesa)". El build pega
// textos.js ANTES (para usar TEXTOS/T en el aviso al 320). NO editar el JSON a
// mano: editar este archivo y correr  node workflows\build-v4-pedidos.js
//
// Flujo: Webhook POST /wompi (onReceived → responde 200 de una) → este nodo.
//   1. Verifica la FIRMA del evento con WOMPI_EVENTS_SECRET (SHA256 de los
//      valores de signature.properties + timestamp + secret). Si no cuadra, se
//      descarta (posible suplantación).
//   2. Si la transacción quedó APPROVED, busca el pedido por
//      wompi_payment_link_id y lo pasa a estado 'pago_confirmado' (idempotente).
//   3. Devuelve UN mensaje de WhatsApp al 320 (avisar pago). Si no hay nada que
//      avisar, devuelve [] (el nodo "Enviar a WhatsApp" no manda nada).
// Sin WOMPI_EVENTS_SECRET el nodo no hace nada (Wompi apagado): return [].
const H = this.helpers;
const crypto = require('crypto');
const FS_BASE = 'https://firestore.googleapis.com/v1/projects/varman-crew/databases/(default)/documents';

// ---- utilidades Firestore (self-contained; no comparte scope con el Cerebro) ----
function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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
function toFs(obj) {
  const fields = {};
  for (const k in obj) {
    const v = obj[k];
    if (v === undefined || v === null) continue;
    if (typeof v === 'number') fields[k] = { integerValue: String(Math.round(v)) };
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    else fields[k] = { stringValue: String(v) };
  }
  return fields;
}
async function tokenAdmin() {
  const sa = JSON.parse(Buffer.from($env.FIREBASE_SA_B64, 'base64').toString('utf8'));
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600
  }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(header + '.' + claims);
  const jwt = header + '.' + claims + '.' + b64url(signer.sign(sa.private_key));
  const r = await H.httpRequest({
    method: 'POST', url: 'https://oauth2.googleapis.com/token',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt,
    json: true, timeout: 15000
  });
  return r.access_token;
}
async function buscarPedidoPorLink(tok, linkId) {
  const r = await H.httpRequest({ method: 'POST', url: FS_BASE + '/tiendas/varman:runQuery',
    headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: { structuredQuery: {
      from: [{ collectionId: 'pedidos' }],
      where: { fieldFilter: { field: { fieldPath: 'wompi_payment_link_id' }, op: 'EQUAL', value: { stringValue: linkId } } },
      limit: 1
    } }, json: true, timeout: 15000 });
  const doc = (Array.isArray(r) ? r : []).map((x) => x.document).filter(Boolean)[0];
  if (!doc) return null;
  return { path: doc.name.split('/documents/')[1], data: fromFs(doc) || {} };
}
async function fsMerge(tok, path, obj) {
  const mask = Object.keys(obj).filter((k) => obj[k] !== undefined && obj[k] !== null)
    .map((k) => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
  await H.httpRequest({ method: 'PATCH', url: FS_BASE + '/' + path + '?' + mask,
    headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: { fields: toFs(obj) }, json: true, timeout: 15000 });
}
async function logError(tok, origen, err, contexto) {
  try {
    await H.httpRequest({ method: 'POST', url: FS_BASE + '/tiendas/varman/botErrores',
      headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
      body: { fields: toFs({ fecha: new Date().toISOString(), origen,
        error: String((err && err.message) || err).slice(0, 800), contexto: contexto || '' }) },
      json: true, timeout: 15000 });
  } catch (e) {}
}
function fmtPrecio(n) { return '$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

// [NOMBRE-MODELO] (flag BOT_NOMBRE_MODELO): nombre del modelo (la marca que se
// registra desde la app) para el mensaje de pago confirmado al CLIENTE, en vez
// de "Ref NN". Lee el catálogo (misma URL pública que usa el bot). Mejor
// esfuerzo: si falla la lectura o la ref no tiene marca, devuelve '' y el
// mensaje sale con la Ref como hoy. El aviso al 320 conserva la Ref siempre.
const FLAG_NOMBRE_MODELO = /^(on|1|true|si|s[ií])$/i.test(String($env.BOT_NOMBRE_MODELO || '').trim());
async function modeloDeRef(ref) {
  if (!FLAG_NOMBRE_MODELO || !ref) return '';
  try {
    const r = await H.httpRequest({ method: 'GET',
      url: FS_BASE + '/tiendas/varman/catalogo?pageSize=300', json: true, timeout: 15000 });
    for (const d of (r.documents || [])) {
      const o = fromFs(d) || {};
      if (String(o.ref || '') === String(ref)) {
        const m = String(o.marca || '').trim();
        return m ? m.charAt(0).toUpperCase() + m.slice(1) : '';
      }
    }
  } catch (e) {}
  return '';
}

// ---- resuelve un path tipo "transaction.status" dentro de evt.data ----
function valorProp(evt, path) {
  return String(path).split('.').reduce((o, k) => (o == null ? undefined : o[k]), evt && evt.data);
}
// ---- verifica la firma del evento (Wompi Eventos) ----
function firmaValida(evt, secret) {
  try {
    const sig = evt && evt.signature;
    if (!sig || !sig.checksum || !Array.isArray(sig.properties)) return false;
    let concat = sig.properties.map((p) => { const v = valorProp(evt, p); return v == null ? '' : String(v); }).join('');
    concat += String(evt.timestamp) + secret;
    const calc = crypto.createHash('sha256').update(concat).digest('hex');
    return calc.toUpperCase() === String(sig.checksum).toUpperCase();
  } catch (e) { return false; }
}

async function principal() {
  const secret = String($env.WOMPI_EVENTS_SECRET || '').trim();
  if (!secret) return []; // Wompi apagado: no procesamos nada

  const inp = ($input.first() && $input.first().json) || {};
  const evt = inp.body || inp;
  if (!evt || !evt.data || !evt.data.transaction) return [];

  if (!firmaValida(evt, secret)) {
    const tok0 = await tokenAdmin().catch(() => null);
    if (tok0) await logError(tok0, 'wompi-webhook-firma', new Error('firma inválida'),
      'event=' + (evt.event || '?') + ' txn=' + (evt.data.transaction.id || '?'));
    return [];
  }

  const tx = evt.data.transaction;
  // solo nos interesa el pago aprobado; otros estados (DECLINED/VOIDED/PENDING)
  // se ignoran (el pedido queda pago_pendiente y el 320 puede hacer seguimiento)
  if (String(tx.status) !== 'APPROVED') return [];
  const linkId = tx.payment_link_id;
  if (!linkId) return [];

  const tok = await tokenAdmin();
  const pedido = await buscarPedidoPorLink(tok, linkId);
  if (!pedido) { await logError(tok, 'wompi-webhook-sin-pedido', new Error('no hay pedido para el link'), 'link=' + linkId); return []; }

  // idempotencia: si ya está confirmado (reintento de Wompi), no re-avisar
  if (pedido.data.estado === 'pago_confirmado') return [];

  await fsMerge(tok, pedido.path, {
    estado: 'pago_confirmado',
    wompi_transaction_id: String(tx.id || ''),
    wompi_status: String(tx.status || ''),
    actualizado: new Date().toISOString()
  });

  const salida = [];
  // 1) confirmación al CLIENTE (mensaje de tranquilidad). Mejor esfuerzo: si la
  //    ventana de 24h está cerrada el envío falla y se registra, no rompe nada.
  //    En la práctica el cliente acaba de pedir el link, así que está abierta.
  const clienteWa = String(pedido.data.cliente_wa || '').replace(/\D/g, '');
  if (clienteWa) {
    // [NOMBRE-MODELO] con el flag ON y marca registrada: "tus *Nike* (talla 39)"
    // en vez de "la *Ref 07* (talla 39)". Sin marca o flag OFF: texto de hoy.
    const modelo = await modeloDeRef(pedido.data.ref);
    salida.push({ json: { messaging_product: 'whatsapp', to: clienteWa, type: 'text', text: {
      body: T(modelo ? TEXTOS.wompiConfirmadoClienteModelo : TEXTOS.wompiConfirmadoCliente, {
        modelo, ref: pedido.data.ref || '?', talla: pedido.data.talla || '?'
      })
    } } });
  }
  // 2) aviso al DUEÑO (320)
  const dueno = String($env.OWNER_WHATSAPP || '').replace(/\D/g, '');
  if (dueno) {
    salida.push({ json: { messaging_product: 'whatsapp', to: dueno, type: 'text', text: {
      body: T(TEXTOS.wompiConfirmadoDueno, {
        ref: pedido.data.ref || '?', talla: pedido.data.talla || '?',
        total: fmtPrecio(pedido.data.total || 0),
        cliente: pedido.data.cliente_nombre || '(sin nombre)',
        wa: pedido.data.cliente_wa || '?', ruta: pedido.path
      })
    } } });
  }
  return salida;
}

try {
  return await principal();
} catch (e) {
  // nunca tumbar el workflow por un webhook: registrar si se puede y responder vacío
  try { const t = await tokenAdmin(); await logError(t, 'wompi-webhook', e, 'excepción'); } catch (e2) {}
  return [];
}
