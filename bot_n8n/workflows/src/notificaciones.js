// ============ TRIGGER HORARIO: carrito abandonado + reseñas/guías (v5) ============
// Corre cada hora con su propio Schedule Trigger mientras el workflow esté
// ACTIVO. La salida va DIRECTO al nodo "Enviar a WhatsApp": SOLO devuelve
// payloads válidos de mensaje (o [] si no hay nada que mandar).
//
// 1) CARRITO ABANDONADO (backlog 10): sesiones que eligieron referencia pero
//    no llegaron al comprobante, con 3-24h sin actividad → UN recordatorio
//    (se marca `recordatorio: true` en la sesión con updateMask, sin tocar el
//    resto). Quien escribió *cancelar* no tiene sesión → nunca le llega.
//    La ventana de 24h de WhatsApp está abierta por definición: updatedAt es
//    la hora del último mensaje del cliente.
// 2) NOTIFICACIONES PENDIENTES (backlog 11-12): docs que deja la app en
//    tiendas/varman/notificacionesPendientes (reseña al pasar a `entregado`,
//    guía de envío al guardarla). Solo se envían si la ventana de 24h está
//    abierta — se estima con botRate/{wa}.updatedAt (se actualiza con CADA
//    mensaje entrante del cliente; el barrido diario conserva esos docs 25h).
//    Sin ventana → quedan `pendiente` y el Cerebro las entrega apenas el
//    cliente vuelva a escribir. Reseña sin LINK_RESENAS_FB → `omitida_sin_link`.
// textos.js va pegado ANTES de este archivo (TEXTOS, T, mensajeDeNotificacion).
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
async function fsGetDoc(tok, path) {
  try {
    const d = await H.httpRequest({ method: 'GET', url: FS_BASE + '/' + path,
      headers: { Authorization: 'Bearer ' + tok }, json: true, timeout: 15000 });
    return fromFs(d);
  } catch (e) { return null; }
}
async function fsMerge(tok, path, obj) {
  const mask = Object.keys(obj).filter((k) => obj[k] !== undefined && obj[k] !== null)
    .map((k) => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
  const fields = {};
  for (const k in obj) {
    const v = obj[k];
    if (v === undefined || v === null) continue;
    if (typeof v === 'number') fields[k] = { integerValue: String(Math.round(v)) };
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    else fields[k] = { stringValue: String(v) };
  }
  await H.httpRequest({ method: 'PATCH', url: FS_BASE + '/' + path + '?' + mask,
    headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: { fields }, json: true, timeout: 15000 });
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

const HORA_MS = 3600 * 1000;
const salida = [];
const tok = await tokenAdmin();
const dueno = String($env.OWNER_WHATSAPP || '').replace(/\D/g, '');

// [RESCATE-CEREBRO] ¿esta sesión la lleva el cerebro? (campos con prefijo `ia`)
function esDelCerebro(s) {
  for (const k in s) if (/^ia[A-Z]/.test(k) && s[k]) return true;
  return false;
}
// catálogo bajo demanda: solo se lee si hay algún candidato a rescate (1 lectura
// por corrida como mucho, y la mayoría de las horas ni eso).
let _catalogo = null;
async function nombreDeRef(tok, ref) {
  const r = String(ref || '').replace(/\D/g, '').padStart(2, '0');
  if (!r) return '';
  if (_catalogo === null) {
    try { _catalogo = await listar(tok, 'catalogo'); } catch (e) { _catalogo = []; }
  }
  const p = _catalogo.find((x) => String(x.ref || '').padStart(2, '0') === r);
  const m = p ? String(p.marca || '').trim() : '';
  return m ? m.charAt(0).toUpperCase() + m.slice(1) : '';
}

// ---- 0. [RESCATE-CEREBRO] el link de Wompi que nadie pagó ----
// El hueco #10 del barrido de julio: el 100% de los links quedó sin pagar y sin
// rescate. rescate-conversa.js salta a propósito las conversaciones del cerebro
// ("lleva su propio rescate") y ese rescate NO existía: el CUADERNO documenta el
// evento `silencio_link` pero nadie lo disparaba. Una sola vez por sesión, entre
// 2 y 12 h después del link, y nunca si ya pagó, si hay un humano en la
// conversación o si el cliente escribió hace poco.
try {
  const sesiones = await listar(tok, 'botSesiones');
  for (const s of sesiones) {
    if (!s._id || s._id === dueno) continue;
    if (!esDelCerebro(s)) continue;
    if (s.iaRescateLink === true) continue;          // máx 1 por sesión
    if (s.enHandoffAt) continue;                     // lo tiene un humano
    if (String(s.iaEstadoPedido || '') === 'registrado') continue;
    if (String(s.iaPago || '') === 'confirmado') continue;
    if (!s.iaLinkAt) continue;                       // no se le mandó ningún link
    const edad = Date.now() - Date.parse(s.iaLinkAt || '');
    if (isNaN(edad) || edad < 2 * HORA_MS || edad > 12 * HORA_MS) continue;
    // ventana de 24h de WhatsApp: sin ella el texto libre no se entrega
    const rate = await fsGetDoc(tok, 'tiendas/varman/botRate/' + s._id);
    const ultimo = rate && rate.updatedAt ? Date.now() - Date.parse(rate.updatedAt) : Infinity;
    if (!(ultimo < 24 * HORA_MS)) continue;
    if (ultimo < 1 * HORA_MS) continue;              // conversación viva: no interrumpir
    // doble red: si el PEDIDO ya está pagado/despachado, no se rescata nada
    // (el webhook de Wompi marca la sesión, pero un pago por Nequi lo confirma
    // el dueño a mano sobre el pedido y la sesión puede no enterarse).
    if (s.iaPedidoPath) {
      const ped = await fsGetDoc(tok, String(s.iaPedidoPath));
      const est = ped ? String(ped.estado || '') : '';
      if (['pago_confirmado', 'verificado', 'enviado', 'entregado', 'cancelado'].indexOf(est) >= 0) continue;
    }
    const modelo = (await nombreDeRef(tok, s.iaRef)) || 'tus tenis';
    const total = Number(s.iaCotTotal) > 0 ? fmtPrecio(s.iaCotTotal) : '';
    if (!total) continue;                            // sin cifra real no se escribe
    const nombre = String(s.nombrePerfil || '').trim();
    await fsMerge(tok, 'tiendas/varman/botSesiones/' + s._id, { iaRescateLink: true });
    salida.push(msjTexto(s._id, T(TEXTOS.iaRescateLink, {
      nombre: nombre ? ' ' + nombre : '', modelo, total
    })));
  }
} catch (e) {}

// ---- 1. carrito abandonado ----
try {
  const sesiones = await listar(tok, 'botSesiones');
  for (const s of sesiones) {
    // [FIX-CARRITO-CEREBRO] (barrido r2) la guarda pedía `estado` y `ref`, que
    // solo escribía el flujo clásico: con el cerebro esta sección estaba MUERTA
    // para todos los clientes. El cerebro tiene su propio rescate (bloque 0),
    // así que aquí se saltan sus sesiones en vez de dejarlas sin nada.
    if (esDelCerebro(s)) continue;
    if (!s.estado || !s.ref) continue;              // sin pedido en curso (o solo fuente)
    if (s.recordatorio === true) continue;          // máx 1 recordatorio por sesión
    if (!s._id || s._id === dueno) continue;        // al dueño no (sesiones de prueba)
    const edad = Date.now() - Date.parse(s.updatedAt || '');
    if (isNaN(edad) || edad < 3 * HORA_MS || edad > 24 * HORA_MS) continue;
    const nombre = String(s.nombrePerfil || '').trim();
    const plantilla = s.talla ? TEXTOS.carritoAbandonado : TEXTOS.carritoAbandonadoSinTalla;
    // se marca ANTES de encolar: mejor perder un recordatorio que repetirlo
    await fsMerge(tok, 'tiendas/varman/botSesiones/' + s._id, { recordatorio: true });
    salida.push(msjTexto(s._id, T(plantilla, {
      nombre: nombre ? ' ' + nombre : '',
      ref: s.ref, talla: s.talla || '', total: fmtPrecio(s.precio || 0)
    })));
  }
} catch (e) {}

// ---- 2. notificaciones pendientes (reseña / guía) con ventana de 24h ----
try {
  const pendientes = (await listar(tok, 'notificacionesPendientes'))
    .filter((x) => x.estado === 'pendiente');
  for (const x of pendientes) {
    const wa = String(x.cliente_wa || '').replace(/\D/g, '');
    if (!wa) continue;
    // ventana de servicio: último mensaje entrante del cliente hace <24h
    const rate = await fsGetDoc(tok, 'tiendas/varman/botRate/' + wa);
    const ultimo = rate && rate.updatedAt ? Date.now() - Date.parse(rate.updatedAt) : Infinity;
    if (!(ultimo < 24 * HORA_MS)) continue;         // sin ventana: la entrega el Cerebro
    const m = mensajeDeNotificacion(wa, x);
    const estadoNuevo = m ? 'enviada' : (x.tipo === 'resena' ? 'omitida_sin_link' : 'omitida');
    await fsMerge(tok, 'tiendas/varman/notificacionesPendientes/' + x._id,
      { estado: estadoNuevo, actualizado: new Date().toISOString() });
    if (m) salida.push(m);
  }
} catch (e) {}

// ---- 3. seguimiento de compra web (flag BOT_CATALOGO_WEB, brief 2026-07-11) ----
// Cuando el bot manda el link del catálogo web, el Cerebro anota linkCatalogoAt
// en la sesión. Si a las ~2h (trigger horario: en la práctica 2-3h) el cliente
// NO arrancó un pedido por el bot (sin estado; si compró por el bot la sesión ya
// no existe), se le pregunta UNA sola vez si pudo hacer su compra, para intentar
// cerrar la venta. El bot NO puede saber si compró en la web → PREGUNTA, no
// asume. Ventana de 24h abierta: linkCatalogoAt es la hora del último mensaje
// del cliente. Con el flag OFF esta sección no corre (comportamiento = hoy).
const FLAG_CATALOGO_WEB = /^(on|1|true|si|s[ií])$/i.test(String($env.BOT_CATALOGO_WEB || '').trim());
// wa de los clientes con pedido RECIENTE (<24h) por el bot: a quien ya compró
// no se le pregunta "¿pudiste comprar?". Mejor esfuerzo: últimos 30 pedidos
// (una sola consulta por corrida, y solo si hay candidatos al seguimiento).
async function compradoresRecientes(tok) {
  try {
    const r = await H.httpRequest({ method: 'POST', url: FS_BASE + '/tiendas/varman:runQuery',
      headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
      body: { structuredQuery: {
        from: [{ collectionId: 'pedidos' }],
        orderBy: [{ field: { fieldPath: 'creado' }, direction: 'DESCENDING' }],
        limit: 30
      } }, json: true, timeout: 15000 });
    return (Array.isArray(r) ? r : []).filter((x) => x.document).map((x) => fromFs(x.document) || {})
      .filter((p) => p.creado && (Date.now() - Date.parse(p.creado)) < 24 * HORA_MS)
      .map((p) => String(p.cliente_wa || ''));
  } catch (e) { return []; }
}
if (FLAG_CATALOGO_WEB) {
  try {
    const sesiones = await listar(tok, 'botSesiones');
    let compraron = null; // se consulta UNA vez, solo si hay candidatos
    for (const s of sesiones) {
      if (!s.linkCatalogoAt) continue;                // nunca le mandamos el link
      if (s.seguimientoLink === true) continue;       // máx 1 seguimiento por sesión
      if (s.estado && s.ref) continue;                // pedido en curso: lo cubre el carrito abandonado
      // [FIX-SEGUIMIENTO-CEREBRO] (barrido r2) esa guarda era del flujo clásico
      // y con el cerebro NUNCA se cumple: al cliente que estaba eligiendo modelo
      // con el bot le llegaba "¿pudiste hacer tu compra?" en plena venta, o
      // incluso teniendo un asesor encima. Se salta si el cerebro ya lo está
      // atendiendo o si hay un humano en la conversación.
      if (esDelCerebro(s)) continue;
      if (s.enHandoffAt) continue;
      if (!s._id || s._id === dueno) continue;        // al dueño no (sesiones de prueba)
      const edad = Date.now() - Date.parse(s.linkCatalogoAt || '');
      if (isNaN(edad) || edad < 2 * HORA_MS || edad > 24 * HORA_MS) continue;
      // no interrumpir una conversación VIVA: botRate/{wa}.updatedAt se refresca
      // con CADA mensaje entrante del cliente; si escribió hace <1h se aplaza
      // (queda sin marcar → el próximo run lo reintenta dentro de la ventana).
      const rate = await fsGetDoc(tok, 'tiendas/varman/botRate/' + s._id);
      if (rate && rate.updatedAt && (Date.now() - Date.parse(rate.updatedAt)) < 1 * HORA_MS) continue;
      // si YA compró por el bot hace poco, no se le pregunta si pudo comprar
      if (compraron === null) compraron = await compradoresRecientes(tok);
      if (compraron.indexOf(s._id) >= 0) continue;
      const nombre = String(s.nombrePerfil || '').trim();
      // se marca ANTES de encolar: mejor perder un seguimiento que repetirlo
      await fsMerge(tok, 'tiendas/varman/botSesiones/' + s._id, { seguimientoLink: true });
      salida.push(msjTexto(s._id, T(TEXTOS.seguimientoCompraWeb, {
        nombre: nombre ? ' ' + nombre : '',
        url: TEXTOS.catalogoWebUrl
      })));
    }
  } catch (e) {}
}

return salida.map((m) => ({ json: m }));
