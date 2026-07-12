// ============ PRUEBA OFFLINE del bot v5 (2026-07-07, brief V5-MEJORAS) ============
// Ejecuta el codigo REAL del nodo Cerebro (extraido del JSON del workflow)
// contra Firestore REAL, con Graph API (WhatsApp) MOCKEADA: no se envia
// ningun mensaje real ni se necesita n8n corriendo.
//   node "tests\test-offline-v4.js"     (desde bot_n8n\)
// Limpia sus propios documentos de prueba al final.
// v5: cubre fotos del catalogo, "Ver mas", ref directa de la web, busqueda
// por marca, pago con QR, fuente (ctwa), estado del pedido, anti-spam y el
// resumen diario. Gemini se usa REAL en el saludo y MOCKEADO en los tests de
// logica (para no depender del cupo gratis ni de la clasificacion exacta).
// [T1] CATALOGO: los tests deterministas corren contra tests/catalogo-fixture
// .json (17 refs FIJAS; ver correrCerebro). El catalogo VIVO solo se usa en la
// seccion 1 (smoke): la deriva del vivo ya rompio el arnes 3 veces.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = path.join(__dirname, '..');
const FS_BASE = 'https://firestore.googleapis.com/v1/projects/varman-crew/databases/(default)/documents';
const TEST_WA = '573999000111';
const TEST_WA2 = '573999000222';
const TEST_WA3 = '573999000333';

// ---------- .env ----------
const ENV = {};
for (const ln of fs.readFileSync(path.join(DIR, '.env'), 'utf8').split(/\r?\n/)) {
  const m = ln.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) ENV[m[1]] = m[2];
}
const DUENO = String(ENV.OWNER_WHATSAPP || '').replace(/\D/g, '');
// que el anti-spam no frene los flujos de prueba (se baja solo en su test)
ENV.BOT_MSGS_POR_MIN = '999';
// v6: los tests de baseline (v5) asumen los flags NUEVOS apagados; cada sección
// v6 enciende el suyo. Se fuerzan OFF aquí para que el resultado NO dependa de
// lo que esté activado en el .env real (Cristhian puede activar flags cuando
// despliegue). Así el suite prueba SIEMPRE ambos estados de forma determinista.
for (const k of ['BOT_ROBUSTEZ', 'BOT_CLASIF_V2', 'BOT_DISPATCH_V2', 'BOT_MARCA_NORM', 'BOT_DATOS_V2', 'BOT_TEXTOS_V2', 'BOT_FOTO_ASESOR', 'BOT_TALLAS_V2', 'BOT_FLUIDEZ_RECONDUCE', 'BOT_FLUIDEZ_CATALOGO', 'BOT_ASISTENTE_V2', 'BOT_FLUIDEZ_ACUSE', 'BOT_CATALOGO_WEB', 'BOT_NOMBRE_MODELO', 'WOMPI_PUB_KEY', 'WOMPI_PRV_KEY', 'WOMPI_EVENTS_SECRET', 'WOMPI_ENV', 'CATALOGO_NATIVO', 'WHATSAPP_CATALOG_ID']) delete ENV[k];

// ---------- workflow ----------
const wf = JSON.parse(fs.readFileSync(path.join(DIR, 'workflows', 'bot-varman.json'), 'utf8'));
const codigoCerebro = wf.nodes.find((n) => n.name.startsWith('Cerebro')).parameters.jsCode;
const codigoLimpiar = wf.nodes.find((n) => n.name === 'Limpiar sesiones caducadas').parameters.jsCode;
const codigoNotif = wf.nodes.find((n) => n.name.startsWith('Recordatorios')).parameters.jsCode;
const codigoWompi = wf.nodes.find((n) => n.name.startsWith('Wompi webhook (procesa)')).parameters.jsCode;

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

// ---------- mocks de Graph API y (opcional) Gemini ----------
const FAKE_JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), crypto.randomBytes(4096), Buffer.from([0xff, 0xd9])]);
const enviados = [];        // mensajes que el bot "enviaria" por WhatsApp
let fallarMedia = false;    // simular caida de la descarga de media
let mockGemini = null;      // objeto -> respuesta canned de Gemini; null = Gemini real
const geminiReqs = [];      // cuerpos enviados a Gemini (para inspeccionar el prompt del clasificador)
async function httpRuteado(opts) {
  const url = opts.url || '';
  if (url.includes('graph.facebook.com')) {
    if (url.endsWith('/messages')) { enviados.push(opts.body); return { messages: [{ id: 'wamid.mock' }] }; }
    if (fallarMedia) { const e = new Error('HTTP 400 mock: media no disponible'); e.status = 400; throw e; }
    return { url: 'https://lookaside.fbsbx.com/whatsapp/fake-media', mime_type: 'image/jpeg', id: url.split('/').pop() };
  }
  if (url.includes('lookaside.fbsbx.com')) {
    if (fallarMedia) { const e = new Error('HTTP 404 mock'); e.status = 404; throw e; }
    return FAKE_JPEG;
  }
  if (url.includes('generativelanguage.googleapis.com')) {
    geminiReqs.push(opts.body); // capturamos el prompt enviado (inspección en tests)
    if (mockGemini) {
      // objeto -> JSON canned (uso normal); string -> se devuelve CRUDO, para
      // probar la fiabilidad del helper llamarGemini (basura no-JSON o JSON
      // envuelto en fences ```json```). Ponlo a null para usar Gemini real.
      const text = typeof mockGemini === 'string' ? mockGemini : JSON.stringify(mockGemini);
      return { candidates: [{ content: { parts: [{ text }] } }] };
    }
  }
  if (url.includes('wompi.co') && url.endsWith('/payment_links')) {
    return { data: { id: 'test_link_ABC' } }; // link de pago mockeado
  }
  // [NM] el CATÁLOGO leído por los NODOS (p. ej. wompi-webhook busca la marca
  // de la ref) responde con el FIXTURE determinista, igual que el Cerebro.
  // El arnés mismo usa httpReal directo, así que esto no afecta sus lecturas.
  if (url.includes('/tiendas/varman/catalogo')) return catalogoFixture;
  return httpReal(opts); // oauth2 / firestore / gemini (sin mock) = REALES
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
async function fsGet(p) {
  try { return fromFs(await httpReal({ method: 'GET', url: FS_BASE + '/' + p, headers: { Authorization: 'Bearer ' + await tokenAdmin() } })); }
  catch (e) { return null; }
}
async function fsSet(p, obj) {
  await httpReal({ method: 'PATCH', url: FS_BASE + '/' + p, headers: { Authorization: 'Bearer ' + await tokenAdmin() }, body: { fields: toFs(obj) } });
}
async function fsDel(p) {
  try { await httpReal({ method: 'DELETE', url: FS_BASE + '/' + p, headers: { Authorization: 'Bearer ' + await tokenAdmin() } }); } catch (e) {}
}
async function fsAdd(colPath, obj) {
  const d = await httpReal({ method: 'POST', url: FS_BASE + '/' + colPath, headers: { Authorization: 'Bearer ' + await tokenAdmin() }, body: { fields: toFs(obj) } });
  return d.name.split('/documents/')[1];
}
async function fsRunQuery(colId, n, orderField) {
  const r = await httpReal({ method: 'POST', url: FS_BASE + '/tiendas/varman:runQuery', headers: { Authorization: 'Bearer ' + await tokenAdmin() },
    body: { structuredQuery: { from: [{ collectionId: colId }], orderBy: [{ field: { fieldPath: orderField }, direction: 'DESCENDING' }], limit: n } } });
  return (Array.isArray(r) ? r : []).filter((x) => x.document).map((x) => ({ _path: x.document.name.split('/documents/')[1], ...fromFs(x.document) }));
}

// ---------- ejecutar el Cerebro como lo haria n8n ----------
// [T1] catálogo FIXTURE: los tests deterministas corren contra tests/
// catalogo-fixture.json (formato REST de Firestore, 17 refs fijas), NO contra
// el catálogo VIVO que Cristhian edita desde la app — la deriva del vivo ya
// rompió el arnés 3 veces (precios, fotos ×2). El catálogo VIVO solo se usa en
// la sección 1 (smoke). Las fotos pNNN del fixture son archivos REALES de la
// web (verificadas 200), así el assert de URL sigue probando infra de verdad.
const catalogoFixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalogo-fixture.json'), 'utf8'));
let catalogoReal = null; // catálogo VIVO, solo para el smoke de la sección 1
async function correrCerebro(parsedMsg, catalogoJson) {
  enviados.length = 0;
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const fn = new AsyncFunction('$input', '$env', '$json', '$', 'require', codigoCerebro);
  const out = await fn.call(
    { helpers: { httpRequest: httpRuteado } },
    { all: () => [], first: () => ({ json: {} }) },
    ENV,
    catalogoJson || catalogoFixture,
    (name) => ({ item: { json: parsedMsg } }),
    require
  );
  return out.map((x) => x.json);
}
// smoke: el flujo completo contra el catálogo VIVO (solo la sección 1)
async function correrCerebroReal(parsedMsg) {
  if (!catalogoReal) {
    catalogoReal = await httpReal({ method: 'GET', url: 'https://firestore.googleapis.com/v1/projects/varman-crew/databases/(default)/documents/tiendas/varman/catalogo?pageSize=300' });
  }
  return correrCerebro(parsedMsg, catalogoReal);
}
// message_id ÚNICO por llamada (y por corrida): el bot ahora deduplica por
// message_id, así que reusar el mismo haría que la 2a llamada se ignore.
const RUN_MID = 'wamidTEST_' + Date.now() + '_';
let _midSeq = 0;
function msj(over) {
  return Object.assign({ wa_id: TEST_WA, nombre: 'Cliente Prueba', tipo: 'text', texto: '', inter_id: '', imagen_id: '', fuente: '', message_id: RUN_MID + (++_midSeq) }, over);
}
// helpers para leer la salida nueva (tandas de fotos)
const esLista = (m) => m && m.type === 'interactive' && m.interactive && m.interactive.type === 'list';
const filasDe = (m) => (esLista(m) ? m.interactive.action.sections[0].rows : []);
const imagenes = (r) => r.filter((m) => m.type === 'image');
// refs OFRECIDAS en una tanda = imágenes + líneas de fallback de texto
// ("• *Ref NN*"). El catálogo vivo deriva (Cristhian sube refs con foto de app,
// que salen como texto): contar SOLO imágenes ya rompió el arnés 3 veces.
const ofertasDe = (r) => imagenes(r).length + r.filter((m) => m.type === 'text')
  .reduce((n, m) => n + (String(m.text.body).match(/• \*Ref \d\d\*/g) || []).length, 0);
// una ref ACTIVA del catálogo FIXTURE con foto PÚBLICA (pNNN = archivo real en
// la web), para los asserts que necesitan sí o sí una foto real (ficha, URL 200).
function refConFotoPublica() {
  for (const d of ((catalogoFixture && catalogoFixture.documents) || [])) {
    const o = fromFs(d);
    if (o && o.activo !== false && Array.isArray(o.fotos) && /^p\d{1,4}$/.test(o.fotos[0] || '')) return o;
  }
  return null;
}
// precio/detalle de una ref leído del catálogo FIXTURE (el mismo que ve el
// Cerebro en los tests deterministas) → los asserts nunca derivan de datos.
const fmtP = (n) => '$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function docCat(ref) {
  for (const d of ((catalogoFixture && catalogoFixture.documents) || [])) {
    const o = fromFs(d);
    if (o && o.ref === ref) return o;
  }
  return null;
}

// ---------- asserts ----------
let ok = 0, mal = 0;
function check(nombre, cond, extra) {
  if (cond) { ok++; console.log('  PASS  ' + nombre); }
  else { mal++; console.log('  FAIL  ' + nombre + (extra ? '  -> ' + JSON.stringify(extra).slice(0, 300) : '')); }
}

(async () => {
  console.log('== Limpieza previa ==');
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA2);
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA3);
  await fsDel('tiendas/varman/botRate/' + TEST_WA);
  await fsDel('tiendas/varman/botRate/' + TEST_WA2);
  await fsDel('tiendas/varman/botRate/' + TEST_WA3);
  // barrido auto-sanable: si una corrida previa se interrumpió antes de su
  // limpieza final, borra aquí los docs de prueba que quedaron sueltos (ventanas
  // botRate/sesiones ya cubiertas arriba; faltaban listaEspera y notificaciones,
  // que contaminaban las secciones 16-17 de la siguiente corrida).
  for (const col of ['listaEspera', 'notificacionesPendientes']) {
    for (const d of await fsRunQuery(col, 30, 'creado')) {
      if ([TEST_WA, TEST_WA2, TEST_WA3].indexOf(d.cliente_wa) >= 0) await fsDel(d._path);
    }
  }
  await fsSet('tiendas/varman/botConfig/general', { pausado: false, actualizado: new Date().toISOString(), por: 'test' });

  console.log('== 1. SMOKE contra catalogo VIVO: saludo -> catalogo (Gemini REAL) ==');
  // ÚNICA sección contra el catálogo REAL que edita Cristhian (el resto de la
  // suite corre contra el FIXTURE): valida que Firestore responde, que el bot
  // arma el catálogo con datos de producción y que Gemini real clasifica.
  let r = await correrCerebroReal(msj({ texto: 'hola' }));
  check('responde algo', r.length >= 1);
  check('ultimo mensaje es lista interactiva', r[r.length - 1].type === 'interactive', r[r.length - 1]);
  // smoke de fotos: alguna ref ACTIVA del catálogo VIVO tiene foto pública pNNN
  // y el archivo existe en la web (si falla: producción quedó sin fotos públicas
  // o cambió la base de la web — avisar a Cristhian, no es culpa del fixture).
  const pubReal = (() => {
    for (const d of ((catalogoReal && catalogoReal.documents) || [])) {
      const o = fromFs(d);
      if (o && o.activo !== false && Array.isArray(o.fotos) && /^p\d{1,4}$/.test(o.fotos[0] || '')) return o;
    }
    return null;
  })();
  const urlReal = pubReal && (ENV.CATALOGO_FOTOS_URL_BASE || 'https://varmancrew.pages.dev/img/') + pubReal.fotos[0] + '.jpg';
  const headReal = urlReal ? await fetch(urlReal, { method: 'HEAD' }) : null;
  check('smoke: una foto pública del catálogo VIVO responde 200', !!headReal && headReal.ok, urlReal || 'catálogo vivo sin fotos pNNN');

  console.log('== 2. Compra completa con comprobante (catalogo con FOTOS) ==');
  r = await correrCerebro(msj({ tipo: 'interactive', inter_id: 'cat:deportivas' }));
  check('tanda: arranca con texto intro', r[0] && r[0].type === 'text', r[0]);
  const imgs = imagenes(r);
  // fixture determinista: la 1ª tanda de deportivas = 4 refs con foto pública
  // (01,02,03,05) + la Ref 04 con foto de app que va como línea de texto →
  // prueba las DOS vías de la tanda con conteos EXACTOS.
  check('tanda: 4 imágenes + fallback = 5 refs ofrecidas', imgs.length === 4 && ofertasDe(r) === 5, { imgs: imgs.length, ofertas: ofertasDe(r) });
  check('tanda: imagenes con link https y caption "Ref "', imgs.every((m) => /^https:\/\//.test(m.image.link) && /^Ref \d\d/.test(m.image.caption)), imgs[0]);
  const fbMsg = r.find((m) => m.type === 'text' && /también están disponibles/.test(m.text.body));
  check('tanda: la ref sin foto pública va como línea de texto (Ref 04)', !!fbMsg && /• \*Ref 04\*/.test(fbMsg.text.body), fbMsg && fbMsg.text.body);
  const lista = r[r.length - 1];
  check('tanda: cierra con lista para elegir', esLista(lista), lista);
  const filas = filasDe(lista);
  check('tanda: 5 refs + fila "Ver mas"', filas.length === 6 && filas[5].id === 'cat:deportivas:5', filas.map((f) => f.id));
  // la URL de una foto pública debe existir de verdad: la de la tanda si trajo
  // imágenes; si la tanda salió toda en fallback (deriva del catálogo), una
  // cualquiera del catálogo con foto pNNN.
  const pubRef = refConFotoPublica();
  const urlFoto = imgs[0] ? imgs[0].image.link
    : (pubRef && (ENV.CATALOGO_FOTOS_URL_BASE || 'https://varmancrew.pages.dev/img/') + pubRef.fotos[0] + '.jpg');
  const head = urlFoto ? await fetch(urlFoto, { method: 'HEAD' }) : null;
  check('la URL de la foto responde 200', !!head && head.ok, urlFoto);

  // elegimos una ref que SÍ tenga foto pública (robusto a que el dueño suba refs
  // con foto de app, que salen como texto): del caption de la 1ª imagen de la
  // tanda o, si la tanda no trajo imágenes, cualquiera del catálogo con pNNN.
  const ref = ((imgs[0] && imgs[0].image.caption.match(/Ref (\d\d)/)) || [])[1] || (pubRef && pubRef.ref) || filas[0].id.slice(4);
  r = await correrCerebro(msj({ tipo: 'interactive', inter_id: 'ref:' + ref }));
  check('ref elegida (con foto): manda foto', r[0] && r[0].type === 'image', r[0]);
  check('ref elegida: pide talla', r[r.length - 1].type === 'text' && /talla/i.test(r[r.length - 1].text.body), r[r.length - 1]);
  let ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('sesion estado=talla en Firestore', ses && ses.estado === 'talla' && ses.ref === ref, ses);
  r = await correrCerebro(msj({ texto: '40' }));
  check('pide datos de envio', /datos|Nombre completo/i.test(r[0].text.body), r[0]);
  r = await correrCerebro(msj({ texto: 'Juan Prueba, Calle Falsa 123, Medellin, 3001234567' }));
  check('botones de pago', r[0].type === 'interactive' && r[0].interactive.type === 'button', r[0]);
  r = await correrCerebro(msj({ tipo: 'interactive', inter_id: 'pay:nequi' }));
  check('sin QR configurado: UN solo texto con Nequi (como siempre)', r.length === 1 && r[0].type === 'text' && /Nequi/.test(r[0].text.body), r);
  r = await correrCerebro(msj({ tipo: 'image', imagen_id: 'FAKE_MEDIA_1' }));
  check('confirma pedido al cliente', r[0] && /Pedido recibido/.test(r[0].text.body), r[0]);
  check('avisa al dueno', r[1] && r[1].to === DUENO && /NUEVO PEDIDO/.test(r[1].text.body), r[1]);
  const mPath = (r[1] && r[1].text.body.match(/Pedido guardado: (\S+)/)) || [];
  const pedidoPath = mPath[1] || '';
  check('menciona ruta del pedido', !!pedidoPath, r[1] && r[1].text.body);
  const pedido = pedidoPath ? await fsGet(pedidoPath) : null;
  check('pedido con estado pagado_por_verificar', pedido && pedido.estado === 'pagado_por_verificar', pedido);
  check('pedido sin referral queda fuente=organico', pedido && pedido.fuente === 'organico', pedido && pedido.fuente);
  check('pedido con comprobante_guardado=true', pedido && pedido.comprobante_guardado === true, pedido);
  const pedidoId = pedidoPath.split('/').pop();
  const comp = pedidoId ? await fsGet('tiendas/varman/comprobantes/' + pedidoId) : null;
  check('comprobante guardado (b64 coincide)', comp && comp.b64 === FAKE_JPEG.toString('base64') && comp.mime === 'image/jpeg', comp && { mime: comp.mime, bytes: comp.bytes });
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('sesion borrada tras el pedido', ses === null, ses);

  console.log('== 3. Comandos admin desde el 320 ==');
  r = await correrCerebro(msj({ wa_id: DUENO, nombre: 'Cristhian', texto: 'pedidos' }));
  check('lista pedidos pendientes', r[0] && /pendientes/.test(r[0].text.body) && r[0].text.body.includes('Ref ' + ref), r[0]);
  r = await correrCerebro(msj({ wa_id: DUENO, texto: 'admin' }));
  check('ayuda admin', r[0] && /Comandos admin/.test(r[0].text.body), r[0]);
  r = await correrCerebro(msj({ wa_id: DUENO, texto: 'pausar' }));
  check('confirma pausa', r[0] && /mantenimiento/i.test(r[0].text.body), r[0]);
  let cfg = await fsGet('tiendas/varman/botConfig/general');
  check('botConfig pausado=true', cfg && cfg.pausado === true, cfg);
  r = await correrCerebro(msj({ texto: 'hola' }));
  check('cliente recibe "ya te escribimos"', r.length === 1 && /te escribimos/i.test(r[0].text.body), r[0]);
  r = await correrCerebro(msj({ wa_id: DUENO, texto: 'hola' }));
  check('dueno NO queda bloqueado por la pausa (flujo normal)', r.length >= 1 && !/te estamos atendiendo/i.test(JSON.stringify(r)), r[0]);
  r = await correrCerebro(msj({ wa_id: DUENO, texto: 'activar' }));
  check('confirma activacion', r[0] && /activo/i.test(r[0].text.body), r[0]);
  cfg = await fsGet('tiendas/varman/botConfig/general');
  check('botConfig pausado=false', cfg && cfg.pausado === false, cfg);
  r = await correrCerebro(msj({ texto: 'hola' }));
  check('cliente vuelve al flujo normal', r[r.length - 1].type === 'interactive', r[r.length - 1]);
  await fsDel('tiendas/varman/botSesiones/' + DUENO); // por si el hola del dueno creo algo

  console.log('== 4. Sesion caducada (>24h) se limpia al volver a escribir ==');
  const hace25h = new Date(Date.now() - 25 * 3600 * 1000).toISOString();
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, { estado: 'talla', ref: '01', precio: 250000, updatedAt: hace25h });
  r = await correrCerebro(msj({ texto: 'hola' }));
  check('sesion vieja ignorada (responde catalogo, no talla)', r[r.length - 1].type === 'interactive', r[r.length - 1]);
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('sesion caducada borrada de Firestore', ses === null, ses);

  console.log('== 5. Barrido diario: sesiones + botRate + RESUMEN al 320 ==');
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA2, { estado: 'datos', ref: '02', precio: 300000, updatedAt: hace25h });
  // los botRate se conservan 25h (marcan la ventana de 24h para reseñas/guías)
  const hace26h = new Date(Date.now() - 26 * 3600 * 1000).toISOString();
  await fsSet('tiendas/varman/botRate/' + TEST_WA2, { minuto: 1, n: 3, updatedAt: hace26h });
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const fnLimpiar = new AsyncFunction('$input', '$env', '$json', '$', 'require', codigoLimpiar);
  const sw = await fnLimpiar.call({ helpers: { httpRequest: httpRuteado } }, { all: () => [] }, ENV, {}, () => ({}), require);
  check('barrido devuelve el resumen diario (payload de mensaje)', sw[0] && sw[0].json.messaging_product === 'whatsapp' && sw[0].json.to === DUENO, sw[0] && sw[0].json);
  check('resumen menciona pedidos y errores', sw[0] && /Resumen VarMan Bot/.test(sw[0].json.text.body) && /Pedidos nuevos/.test(sw[0].json.text.body), sw[0] && sw[0].json.text);
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA2);
  check('sesion barrida ya no existe', ses === null, ses);
  const rate = await fsGet('tiendas/varman/botRate/' + TEST_WA2);
  check('contador anti-spam viejo barrido', rate === null, rate);

  console.log('== 6. Falla de descarga del comprobante (queda media_id + log) ==');
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, { estado: 'comprobante', ref, precio: 250000, metodo: 'Nequi', talla: '40', datosEnvio: 'x', nombrePerfil: 'Cliente Prueba', updatedAt: new Date().toISOString() });
  fallarMedia = true;
  r = await correrCerebro(msj({ tipo: 'image', imagen_id: 'FAKE_MEDIA_2' }));
  fallarMedia = false;
  check('pedido igual se crea aunque falle la descarga', r[0] && /Pedido recibido/.test(r[0].text.body), r[0]);
  check('aviso al dueno dice que no se pudo descargar', r[1] && /no se pudo descargar/.test(r[1].text.body), r[1]);
  const mPath2 = (r[1] && r[1].text.body.match(/Pedido guardado: (\S+)/)) || [];
  const pedido2 = mPath2[1] ? await fsGet(mPath2[1]) : null;
  check('pedido2 comprobante_guardado=false', pedido2 && pedido2.comprobante_guardado === false, pedido2);
  const errs = await fsRunQuery('botErrores', 5, 'fecha');
  check('error registrado en botErrores', errs.some((e) => e.origen === 'descarga-comprobante' && e.wa_id === TEST_WA), errs.slice(0, 2));

  console.log('== 7. v5: "Ver mas" (paginacion de la tanda) ==');
  r = await correrCerebro(msj({ tipo: 'interactive', inter_id: 'cat:deportivas:5' }));
  const imgs2 = imagenes(r);
  const filas2 = filasDe(r[r.length - 1]);
  check('segunda tanda: 5 imagenes mas (fixture: refs 06-10, todas con foto)', imgs2.length === 5 && ofertasDe(r) === 5, { imgs: imgs2.length, ofertas: ofertasDe(r) });
  check('segunda tanda: refs distintas a la primera', filas2[0] && filas2[0].id !== filas[0].id, { antes: filas[0] && filas[0].id, ahora: filas2[0] && filas2[0].id });
  check('segunda tanda: "Ver mas" apunta al offset 10', filas2.some((f) => f.id === 'cat:deportivas:10'), filas2.map((f) => f.id));

  console.log('== 8. v5: ref directa desde la web ==');
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  r = await correrCerebro(msj({ texto: 'Hola! Quiero la Ref 05 ($480.000 COP) \u{1F45F}' }));
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('texto de la web arranca el pedido en la ref 05', ses && ses.estado === 'talla' && ses.ref === '05', ses);
  check('manda foto + precio + pide talla', imagenes(r).length === 1 && /talla/i.test(r[r.length - 1].text.body), r);
  r = await correrCerebro(msj({ texto: 'cancelar' }));
  check('cancelar limpia la ref directa', /cancel/i.test(r[0].text.body), r[0]);
  r = await correrCerebro(msj({ texto: 'Me interesa la referencia #03 ($235.000 COP). ¿Está disponible?' }));
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('formato viejo de la web tambien funciona (ref 03)', ses && ses.estado === 'talla' && ses.ref === '03', ses);
  await correrCerebro(msj({ texto: 'cancelar' }));

  console.log('== 9. v5: busqueda por marca (Gemini mockeado; fixture: 4 refs adidas) ==');
  mockGemini = { intent: 'buscar_marca', respuesta: 'Claro, mira estas Adidas', marca: 'adidas' };
  r = await correrCerebro(msj({ texto: 'tienen addidas?' }));
  mockGemini = null;
  const imgsM = imagenes(r);
  const listaM = r[r.length - 1];
  check('marca con refs: manda las 4 fotos adidas del fixture (01,03,06,21)', imgsM.length === 4, r.map((m) => m.type));
  check('marca con refs: caption con la marca', imgsM[0] && /Adidas/.test(imgsM[0].image.caption), imgsM[0]);
  check('marca con refs: lista para elegir', esLista(listaM) && filasDe(listaM).some((f) => f.id.startsWith('ref:')), listaM);
  // marca inventada (no depende de qué marcas tenga el catálogo real hoy)
  mockGemini = { intent: 'buscar_marca', respuesta: 'De esa marca...', marca: 'zzzmarcainexistente' };
  r = await correrCerebro(msj({ texto: 'tienen zzzmarcainexistente?' }));
  mockGemini = null;
  check('marca sin refs marcadas: respuesta honesta + catalogo', r.length === 1 && r[0].type === 'interactive' && /no tengo referencias marcadas/i.test(r[0].interactive.body.text), r[0]);

  console.log('== 10. v5: pago con QR (PAGO_QR_NEQUI presente) ==');
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, { estado: 'pago', ref: '05', precio: 480000, talla: '40', datosEnvio: 'x', nombrePerfil: 'Cliente Prueba', updatedAt: new Date().toISOString() });
  ENV.PAGO_QR_NEQUI = 'https://varmancrew.pages.dev/img/pagos/qr-nequi.jpg';
  r = await correrCerebro(msj({ tipo: 'interactive', inter_id: 'pay:nequi' }));
  delete ENV.PAGO_QR_NEQUI;
  check('con QR: 4 mensajes', r.length === 4, r.map((m) => m.type));
  check('con QR: 1o es la imagen del QR', r[0] && r[0].type === 'image' && r[0].image.link.includes('qr-nequi'), r[0]);
  check('con QR: 3o es SOLO el dato (para copiar)', r[2] && r[2].type === 'text' && r[2].text.body === String(ENV.PAGO_NEQUI), r[2]);
  check('con QR: 4o trae el total y pide comprobante', r[3] && /480\.000/.test(r[3].text.body) && /comprobante/i.test(r[3].text.body), r[3]);
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('sesion queda esperando comprobante', ses && ses.estado === 'comprobante' && ses.metodo === 'Nequi', ses);
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 11. v5: fuente del anuncio (referral ctwa) llega al pedido ==');
  r = await correrCerebro(msj({ tipo: 'interactive', inter_id: 'cat:deportivas', fuente: 'ctwa:AD123' }));
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('la fuente queda en la sesion mientras navega', ses && ses.fuente === 'ctwa:AD123', ses);
  r = await correrCerebro(msj({ tipo: 'interactive', inter_id: 'ref:' + ref })); // SIN fuente: debe sobrevivir
  r = await correrCerebro(msj({ texto: '40' }));
  r = await correrCerebro(msj({ texto: 'Juan Prueba, Calle Falsa 123, Bogota, 3001234567' }));
  r = await correrCerebro(msj({ tipo: 'interactive', inter_id: 'pay:nequi' }));
  r = await correrCerebro(msj({ tipo: 'image', imagen_id: 'FAKE_MEDIA_3' }));
  const mPath3 = (r[1] && r[1].text.body.match(/Pedido guardado: (\S+)/)) || [];
  const pedido3 = mPath3[1] ? await fsGet(mPath3[1]) : null;
  check('el pedido guarda fuente=ctwa:AD123', pedido3 && pedido3.fuente === 'ctwa:AD123', pedido3 && pedido3.fuente);

  console.log('== 12. v5: "como va mi pedido" (Gemini mockeado) ==');
  mockGemini = { intent: 'estado_pedido', respuesta: '' };
  r = await correrCerebro(msj({ texto: 'como va mi pedido?' }));
  check('responde el estado del ultimo pedido', r[0] && /pagado por verificar/i.test(r[0].text.body) && r[0].text.body.includes('Referencia ' + ref), r[0]);
  r = await correrCerebro(msj({ wa_id: TEST_WA2, texto: 'como va mi pedido?' }));
  mockGemini = null;
  check('cliente sin pedidos: respuesta amable', r[0] && /No encontr/i.test(r[0].text.body), r[0]);

  console.log('== 13. v5: anti-spam por numero ==');
  ENV.BOT_MSGS_POR_MIN = '3';
  await fsDel('tiendas/varman/botRate/' + TEST_WA2);
  // el contador es por minuto: si el minuto esta por cambiar, esperarlo para
  // que las 5 llamadas caigan en el mismo minuto (si no, el test seria azaroso)
  const faltaMs = 60000 - (Date.now() % 60000);
  if (faltaMs < 25000) { console.log('  (esperando ' + Math.ceil(faltaMs / 1000) + 's al minuto nuevo…)'); await new Promise((res) => setTimeout(res, faltaMs + 500)); }
  let respuestas = [];
  for (let i = 0; i < 5; i++) {
    respuestas.push(await correrCerebro(msj({ wa_id: TEST_WA2, tipo: 'interactive', inter_id: 'cat:casuales' })));
  }
  check('mensajes 1-3 pasan normal', respuestas[0].length > 1 && respuestas[2].length > 1, respuestas[2].length);
  check('mensaje 4: aviso "muy rapido" (una vez)', respuestas[3].length === 1 && /rapidito|rápido/i.test(respuestas[3][0].text.body), respuestas[3]);
  check('mensaje 5: silencio total', respuestas[4].length === 0, respuestas[4]);
  ENV.BOT_MSGS_POR_MIN = '999';

  console.log('== 14. v5-bis: ref de bodega EXTERNA -> el aviso al 320 lo dice ==');
  await fsSet('tiendas/varman/mapaCatalogo/' + ref, { ref, tipo: 'externa', proveedor: 'Bodega Prueba', nota: 'contacto 300123' });
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, { estado: 'comprobante', ref, precio: 250000, metodo: 'Nequi', talla: '40', datosEnvio: 'x', nombrePerfil: 'Cliente Prueba', updatedAt: new Date().toISOString() });
  r = await correrCerebro(msj({ tipo: 'image', imagen_id: 'FAKE_MEDIA_4' }));
  const mPath4 = (r[1] && r[1].text.body.match(/Pedido guardado: (\S+)/)) || [];
  check('aviso al 320 incluye la ref externa y el proveedor', r[1] && /Ref EXTERNA/.test(r[1].text.body) && /Bodega Prueba/.test(r[1].text.body), r[1] && r[1].text.body);
  await fsDel('tiendas/varman/mapaCatalogo/' + ref);

  console.log('== 15. v5: carrito abandonado (trigger horario, UN solo recordatorio) ==');
  // OJO: el nodo procesa TODAS las sesiones reales (los envios estan mockeados;
  // marcar recordatorio=true en una sesion real abandonada es inofensivo).
  const hace4h = new Date(Date.now() - 4 * 3600 * 1000).toISOString();
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA2, { estado: 'datos', ref: '02', talla: '40', precio: 300000, nombrePerfil: 'Cliente Prueba', updatedAt: hace4h });
  const fnNotif = new AsyncFunction('$input', '$env', '$json', '$', 'require', codigoNotif);
  const correrNotif = async () => (await fnNotif.call({ helpers: { httpRequest: httpRuteado } }, { all: () => [] }, ENV, {}, () => ({}), require)).map((x) => x.json);
  let notifOut = await correrNotif();
  let rec = notifOut.filter((m) => m.to === TEST_WA2);
  check('recordatorio enviado con ref, talla y total', rec.length === 1 && /Ref 02/.test(rec[0].text.body) && /talla 40/.test(rec[0].text.body) && /300\.000/.test(rec[0].text.body), rec[0] && rec[0].text);
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA2);
  check('la sesion queda marcada (recordatorio=true) sin perder el estado', ses && ses.recordatorio === true && ses.estado === 'datos', ses);
  notifOut = await correrNotif();
  check('segunda corrida: NO repite el recordatorio', notifOut.filter((m) => m.to === TEST_WA2).length === 0, notifOut.length);
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA2);

  console.log('== 16. v5: notificaciones de la app (guia y reseña) con ventana de 24h ==');
  // guia CON ventana abierta (botRate reciente = el cliente escribio hace poco)
  await fsSet('tiendas/varman/botRate/' + TEST_WA2, { minuto: 1, n: 1, updatedAt: new Date().toISOString() });
  const notifGuia = await fsAdd('tiendas/varman/notificacionesPendientes', { tipo: 'guia', pedido_id: 'test', cliente_wa: TEST_WA2, cliente_nombre: 'Cliente Prueba', ref: '02', guia: 'G-12345', transportadora: 'Servientrega', estado: 'pendiente', creado: new Date().toISOString() });
  notifOut = await correrNotif();
  rec = notifOut.filter((m) => m.to === TEST_WA2);
  check('guia: mensaje "va en camino" con transportadora y numero', rec.length === 1 && /en camino/i.test(rec[0].text.body) && /Servientrega/.test(rec[0].text.body) && /G-12345/.test(rec[0].text.body), rec[0] && rec[0].text);
  let notifDoc = await fsGet(notifGuia);
  check('guia: doc marcado como enviada', notifDoc && notifDoc.estado === 'enviada', notifDoc);
  // reseña SIN LINK_RESENAS_FB -> se omite con registro (no rompe nada)
  const notifRes1 = await fsAdd('tiendas/varman/notificacionesPendientes', { tipo: 'resena', pedido_id: 'test', cliente_wa: TEST_WA2, cliente_nombre: 'Cliente Prueba', ref: '02', producto: 'tenis de la Ref 02', estado: 'pendiente', creado: new Date().toISOString() });
  notifOut = await correrNotif();
  notifDoc = await fsGet(notifRes1);
  check('reseña sin link: NO se envia y queda omitida_sin_link', notifOut.filter((m) => m.to === TEST_WA2).length === 0 && notifDoc && notifDoc.estado === 'omitida_sin_link', notifDoc);
  // reseña CON link
  ENV.LINK_RESENAS_FB = 'https://www.facebook.com/varmancrew/reviews';
  const notifRes2 = await fsAdd('tiendas/varman/notificacionesPendientes', { tipo: 'resena', pedido_id: 'test', cliente_wa: TEST_WA2, cliente_nombre: 'Cliente Prueba', ref: '02', producto: 'Adidas de la Ref 02', estado: 'pendiente', creado: new Date().toISOString() });
  notifOut = await correrNotif();
  rec = notifOut.filter((m) => m.to === TEST_WA2);
  check('reseña con link: mensaje con producto y link', rec.length === 1 && /Adidas de la Ref 02/.test(rec[0].text.body) && /facebook\.com/.test(rec[0].text.body), rec[0] && rec[0].text);
  delete ENV.LINK_RESENAS_FB;
  // SIN ventana (cliente sin botRate): el trigger la deja pendiente y el
  // CEREBRO la entrega apenas el cliente vuelve a escribir
  const notifGuia3 = await fsAdd('tiendas/varman/notificacionesPendientes', { tipo: 'guia', pedido_id: 'test', cliente_wa: TEST_WA3, cliente_nombre: 'Cliente Tres', ref: '03', guia: 'G-999', transportadora: 'Coordinadora', estado: 'pendiente', creado: new Date().toISOString() });
  notifOut = await correrNotif();
  notifDoc = await fsGet(notifGuia3);
  check('sin ventana: el trigger la deja pendiente', notifOut.filter((m) => m.to === TEST_WA3).length === 0 && notifDoc && notifDoc.estado === 'pendiente', notifDoc);
  r = await correrCerebro(msj({ wa_id: TEST_WA3, tipo: 'interactive', inter_id: 'cat:casuales' }));
  notifDoc = await fsGet(notifGuia3);
  check('el cliente escribe -> el Cerebro entrega la guia primero', r[0] && r[0].type === 'text' && /G-999/.test(r[0].text.body), r[0] && r[0].text);
  check('y el doc queda enviada', notifDoc && notifDoc.estado === 'enviada', notifDoc);

  console.log('== 17. v5: lista de espera de stock (Gemini mockeado) ==');
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA2);
  mockGemini = { intent: 'aviso_stock', respuesta: '', ref: '05', talla: '40' };
  r = await correrCerebro(msj({ wa_id: TEST_WA2, texto: 'avisame cuando llegue la talla 40 de la ref 05' }));
  mockGemini = null;
  check('confirma la anotacion con ref y talla', r[0] && /Ref 05/.test(r[0].text.body) && /talla 40/.test(r[0].text.body), r[0] && r[0].text);
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA2);
  check('NO arranco un pedido (la guarda de "avisame" funciona)', !ses || !ses.estado, ses);
  const esperaDocs = (await fsRunQuery('listaEspera', 10, 'creado')).filter((x) => x.cliente_wa === TEST_WA2);
  check('doc en listaEspera con estado esperando', esperaDocs.length === 1 && esperaDocs[0].ref === '05' && esperaDocs[0].talla === '40' && esperaDocs[0].estado === 'esperando', esperaDocs[0]);
  mockGemini = { intent: 'aviso_stock', respuesta: '', ref: '', talla: '' };
  r = await correrCerebro(msj({ wa_id: TEST_WA2, texto: 'me avisas cuando llegue?' }));
  mockGemini = null;
  check('sin ref: pide precisar la referencia', r[0] && /cu[aá]l referencia/i.test(r[0].text.body), r[0] && r[0].text);

  console.log('== 18. v6: robustez conversacional (flag BOT_ROBUSTEZ, Gemini mockeado) ==');
  ENV.BOT_ROBUSTEZ = 'on';
  const SES_TALLA = { estado: 'talla', ref: '05', precio: 480000, nombrePerfil: 'Cliente Prueba' };

  // 18a — handoff a humano en pleno paso de talla, sin frase exacta (mejora 1)
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, Object.assign({}, SES_TALLA, { updatedAt: new Date().toISOString() }));
  mockGemini = { handoff: true, dato: '', respuesta: '' };
  r = await correrCerebro(msj({ texto: 'ya no me estas entendiendo, paseme a una persona' }));
  mockGemini = null;
  check('handoff en talla: avisa al cliente que lo atiende una persona', r.some((m) => m.to === TEST_WA && /te escrib/i.test(m.text.body)), r);
  check('handoff en talla: avisa al dueño (320)', r.some((m) => m.to === DUENO && /atenci[oó]n humana/i.test(m.text.body)), r);
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('handoff: NO pierde el pedido en curso (sigue en talla)', ses && ses.estado === 'talla', ses);

  // 18b — datos ADICIONALES junto a la talla, multi-intención (mejora 2)
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, Object.assign({}, SES_TALLA, { updatedAt: new Date().toISOString() }));
  mockGemini = { handoff: false, dato: '40', respuesta: '¡Sí enviamos a Cali! 📦 El costo te lo confirma un asesor.' };
  r = await correrCerebro(msj({ texto: 'talla 40 y hacen envios a Cali? cuanto vale?' }));
  mockGemini = null;
  check('multi-intención: responde la pregunta extra (envío a Cali)', r.some((m) => m.type === 'text' && /Cali/.test(m.text.body)), r);
  check('multi-intención: TAMBIÉN captura la talla (confirma/pide datos)', r.some((m) => /anotada|datos de env[ií]o|Nombre completo/i.test(m.text.body)), r);
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('multi-intención: sesión avanza a datos con talla 40', ses && ses.estado === 'datos' && ses.talla === '40', ses);

  // 18c — dato INCORRECTO / fuera de lugar: "no sé mi talla" (mejora 3)
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, Object.assign({}, SES_TALLA, { updatedAt: new Date().toISOString() }));
  mockGemini = { handoff: false, dato: '', respuesta: 'Tranqui 😊 mide tu pie en cm de talón a punta y te digo la talla; ¿cuánto te da?' };
  r = await correrCerebro(msj({ texto: 'uf no se cual es mi talla' }));
  mockGemini = null;
  check('dato incorrecto: guía en vez del error seco', r[0] && /mide tu pie|cu[aá]nto te da/i.test(r[0].text.body) && !/35 a la 45/.test(r[0].text.body), r[0]);
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('dato incorrecto: NO avanza el pedido (sigue en talla)', ses && ses.estado === 'talla', ses);

  // 18d — SEGURIDAD: con el flag APAGADO, el mismo mensaje raro cae al texto v5
  delete ENV.BOT_ROBUSTEZ;
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, Object.assign({}, SES_TALLA, { updatedAt: new Date().toISOString() }));
  r = await correrCerebro(msj({ texto: 'uf no se cual es mi talla' })); // sin flag NO llama a Gemini
  check('flag OFF: comportamiento v5 idéntico (talla inválida)', r.length === 1 && /35 a la 45/.test(r[0].text.body), r);
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 19. v6: Wompi (link de pago + webhook con firma) ==');
  ENV.WOMPI_PUB_KEY = 'pub_test_x'; ENV.WOMPI_PRV_KEY = 'prv_test_x'; ENV.WOMPI_ENV = 'test'; ENV.WOMPI_EVENTS_SECRET = 'test_secret_123';
  const fnWompi = new AsyncFunction('$input', '$env', '$json', '$', 'require', codigoWompi);
  const correrWompi = async (evt) => (await fnWompi.call({ helpers: { httpRequest: httpRuteado } }, { first: () => ({ json: { body: evt } }) }, ENV, {}, () => ({}), require)).map((x) => x.json);
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  // 19a — con Wompi, los métodos de pago son una LISTA con la opción Wompi
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, { estado: 'datos', ref: '05', precio: 480000, nombrePerfil: 'Cliente Prueba', updatedAt: new Date().toISOString() });
  r = await correrCerebro(msj({ texto: 'Juan Prueba, Calle Falsa 123, Bogota, 3001234567' }));
  check('Wompi ON: métodos de pago en lista con opción Wompi', esLista(r[0]) && filasDe(r[0]).some((f) => f.id === 'pay:wompi'), r[0]);

  // 19b — elegir Wompi crea el link + pedido pago_pendiente + manda el link
  r = await correrCerebro(msj({ tipo: 'interactive', inter_id: 'pay:wompi' }));
  check('Wompi: manda el link de pago al cliente', r.some((m) => m.to === TEST_WA && /checkout\.wompi\.co\/l\/test_link_ABC/.test(m.text.body)), r);
  check('Wompi: avisa al 320 (pago pendiente)', r.some((m) => m.to === DUENO && /pago pendiente/i.test(m.text.body)), r);
  const wPath = ((r.find((m) => m.to === DUENO) || {}).text || {}).body || '';
  const wompiPedidoPath = (wPath.match(/Pedido guardado: (\S+)/) || [])[1] || '';
  let wPedido = wompiPedidoPath ? await fsGet(wompiPedidoPath) : null;
  check('Wompi: pedido en pago_pendiente con link y método Wompi', wPedido && wPedido.estado === 'pago_pendiente' && wPedido.metodo_pago === 'Wompi' && wPedido.wompi_payment_link_id === 'test_link_ABC', wPedido);
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('Wompi: la sesión se cierra tras enviar el link', ses === null, ses);

  // 19c — webhook con FIRMA VÁLIDA → confirma el pago y avisa al 320
  const wEvt = { event: 'transaction.updated', timestamp: 1720000000,
    signature: { properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'] },
    data: { transaction: { id: 'txn_test_1', status: 'APPROVED', amount_in_cents: 48000000, payment_link_id: 'test_link_ABC' } } };
  const concatOk = 'txn_test_1' + 'APPROVED' + '48000000' + '1720000000' + ENV.WOMPI_EVENTS_SECRET;
  wEvt.signature.checksum = crypto.createHash('sha256').update(concatOk).digest('hex').toUpperCase();
  let wOut = await correrWompi(wEvt);
  check('webhook Wompi: avisa al 320 el pago confirmado', wOut.some((m) => m.to === DUENO && /PAGO CONFIRMADO/i.test(m.text.body)), wOut);
  check('webhook Wompi: confirma al CLIENTE (alistando su pedido)', wOut.some((m) => m.to === TEST_WA && /alistando tu pedido/i.test(m.text.body)), wOut);
  wPedido = wompiPedidoPath ? await fsGet(wompiPedidoPath) : null;
  check('webhook Wompi: pedido pasa a pago_confirmado', wPedido && wPedido.estado === 'pago_confirmado' && wPedido.wompi_transaction_id === 'txn_test_1', wPedido);

  // 19d — idempotencia: el mismo evento otra vez NO re-avisa
  wOut = await correrWompi(wEvt);
  check('webhook Wompi: reintento NO re-avisa (idempotente)', wOut.length === 0, wOut);

  // 19d-bis (2026-07-12) — un reintento TARDÍO no pisa estados posteriores:
  // si el equipo ya pasó el pedido a 'enviado', el evento no lo regresa a
  // 'pago_confirmado' ni re-avisa (igual para verificado/entregado/cancelado).
  await fsSet(wompiPedidoPath, Object.assign({}, wPedido, { estado: 'enviado' }));
  wOut = await correrWompi(wEvt);
  let wTardio = await fsGet(wompiPedidoPath);
  check('webhook Wompi: reintento tardío NO regresa un pedido ya enviado',
    wOut.length === 0 && wTardio && wTardio.estado === 'enviado',
    { wOut: wOut.length, estado: wTardio && wTardio.estado });

  // 19e — SEGURIDAD: firma inválida NO confirma ni avisa
  await fsSet(wompiPedidoPath, Object.assign({}, wPedido, { estado: 'pago_pendiente' }));
  const wEvtMal = JSON.parse(JSON.stringify(wEvt));
  wEvtMal.signature.checksum = 'DEADBEEF';
  wOut = await correrWompi(wEvtMal);
  wPedido = await fsGet(wompiPedidoPath);
  check('webhook Wompi: firma inválida NO confirma ni avisa', wOut.length === 0 && wPedido && wPedido.estado === 'pago_pendiente', { wOut: wOut.length, estado: wPedido && wPedido.estado });

  delete ENV.WOMPI_PUB_KEY; delete ENV.WOMPI_PRV_KEY; delete ENV.WOMPI_ENV; delete ENV.WOMPI_EVENTS_SECRET;
  if (wompiPedidoPath) await fsDel(wompiPedidoPath);
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 20. v6: catálogo nativo (flag CATALOGO_NATIVO, MPM) ==');
  ENV.CATALOGO_NATIVO = 'on'; ENV.WHATSAPP_CATALOG_ID = 'CAT_TEST_1';
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  r = await correrCerebro(msj({ tipo: 'interactive', inter_id: 'cat:deportivas' }));
  const mpm = r.find((m) => m.type === 'interactive' && m.interactive.type === 'product_list');
  check('catálogo nativo: responde con MPM (product_list) al catalog_id', !!mpm && mpm.interactive.action.catalog_id === 'CAT_TEST_1', mpm && mpm.interactive.action);
  check('catálogo nativo: product_retailer_id = refs del catálogo', !!mpm && mpm.interactive.action.sections[0].product_items.every((x) => /^\d\d$/.test(x.product_retailer_id)), mpm && mpm.interactive.action.sections[0].product_items.slice(0, 3));
  check('catálogo nativo: el MPM reemplaza las fotos (0 imágenes)', imagenes(r).length === 0, r.map((m) => m.type));
  check('catálogo nativo: sigue la lista "Elige" (ref:) para pedir', r.some((m) => esLista(m) && filasDe(m).some((f) => f.id.startsWith('ref:'))), r.map((m) => m.type));
  // "Ver más" en modo nativo: NO reenvía el MPM y la lista pagina (offset 5→10)
  r = await correrCerebro(msj({ tipo: 'interactive', inter_id: 'cat:deportivas:5' }));
  check('catálogo nativo "Ver más": NO reenvía el MPM', !r.some((m) => m.type === 'interactive' && m.interactive.type === 'product_list'), r.map((m) => m.type));
  check('catálogo nativo "Ver más": la lista avanza (Ver más → offset 10)', r.some((m) => esLista(m) && filasDe(m).some((f) => f.id === 'cat:deportivas:10')), r.map((m) => m.type));
  delete ENV.CATALOGO_NATIVO; delete ENV.WHATSAPP_CATALOG_ID;
  r = await correrCerebro(msj({ tipo: 'interactive', inter_id: 'cat:deportivas' }));
  check('flag OFF: vuelve al catálogo de FOTOS v5 (tanda, sin MPM)', ofertasDe(r) === 5 && !r.some((m) => m.type === 'interactive' && m.interactive.type === 'product_list'), r.map((m) => m.type));
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 21. v6: llegada con mensaje prellenado (web/anuncios) + ficha con info ==');
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  r = await correrCerebro(msj({ texto: 'Hola! Quiero la Ref 01', fuente: 'ctwa:AD777' }));
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('prellenado: arranca el pedido en esa ref sin menú', ses && ses.estado === 'talla' && ses.ref === '01', ses);
  check('prellenado: conserva la fuente del anuncio', ses && ses.fuente === 'ctwa:AD777', ses && ses.fuente);
  const fichaImg = r.find((m) => m.type === 'image');
  const p01 = docCat('01');
  check('prellenado: foto grande con info (ref+marca+precio)', fichaImg && /Ref 01/.test(fichaImg.image.caption) && /Adidas/i.test(fichaImg.image.caption) && p01 && fichaImg.image.caption.includes(fmtP(p01.precio)), { cap: fichaImg && fichaImg.image.caption, precio: p01 && p01.precio });
  check('prellenado: pide la talla para continuar la venta', /talla/i.test(r[r.length - 1].text.body), r[r.length - 1]);

  // elegir de la LISTA arranca la MISMA ficha rica
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  r = await correrCerebro(msj({ tipo: 'interactive', inter_id: 'ref:01' }));
  const fichaImg2 = r.find((m) => m.type === 'image');
  check('elegir de la lista: ficha con foto + info', fichaImg2 && /Ref 01/.test(fichaImg2.image.caption) && p01 && fichaImg2.image.caption.includes(fmtP(p01.precio)), fichaImg2 && fichaImg2.image.caption);
  check('elegir de la lista: pide talla', /talla/i.test(r[r.length - 1].text.body), r[r.length - 1]);

  // la lista de catálogo lleva la info en cada fila (precio · marca/cat · tag)
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  r = await correrCerebro(msj({ tipo: 'interactive', inter_id: 'cat:deportivas' }));
  const listaCat = r.find((m) => esLista(m));
  check('lista de catálogo: cada fila muestra precio + info', listaCat && filasDe(listaCat).filter((f) => f.id.startsWith('ref:')).every((f) => /\$\d/.test(f.description)), listaCat && filasDe(listaCat).slice(0, 2));
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 22. v6.1: dedup (webhook repetido de Meta no duplica respuesta) ==');
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  await fsDel('tiendas/varman/botProcesados/wamid_dup1');
  const rDup1 = await correrCerebro(msj({ tipo: 'interactive', inter_id: 'cat:deportivas', message_id: 'wamid.dup1' }));
  const rDup2 = await correrCerebro(msj({ tipo: 'interactive', inter_id: 'cat:deportivas', message_id: 'wamid.dup1' }));
  check('dedup: 1a vez responde', rDup1.length >= 1, rDup1.length);
  check('dedup: 2a vez (mismo message_id) NO responde', rDup2.length === 0, rDup2.length);
  await fsDel('tiendas/varman/botProcesados/wamid_dup1');
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 23. v6.1: handoff determinista (asesor, sin Gemini, cualquier estado) ==');
  delete ENV.BOT_ROBUSTEZ; // handoff determinista NO depende del flag ni de Gemini
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  let rHo = await correrCerebro(msj({ texto: 'quiero hablar con un asesor' }));
  check('handoff: avisa al cliente', rHo.some((m) => m.to === TEST_WA && /te escrib/i.test(m.text.body)), rHo);
  check('handoff: avisa al dueño', rHo.some((m) => m.to === DUENO && /atenci[oó]n humana/i.test(m.text.body)), rHo);
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, { estado: 'datos', ref: '05', precio: 480000, updatedAt: new Date().toISOString() });
  rHo = await correrCerebro(msj({ texto: 'mejor pasame una persona real' }));
  check('handoff en pleno pedido (estado datos) también', rHo.some((m) => m.to === DUENO && /atenci[oó]n humana/i.test(m.text.body)), rHo);
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('handoff no rompe el pedido en curso (sigue en datos)', ses && ses.estado === 'datos', ses);
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 24. v6.1: fast-path talla (solo "37" no gasta Gemini ni mete texto extra) ==');
  ENV.BOT_ROBUSTEZ = 'on';
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, { estado: 'talla', ref: '05', precio: 480000, nombrePerfil: 'Cliente Prueba', updatedAt: new Date().toISOString() });
  mockGemini = { handoff: false, dato: '', respuesta: 'EXTRA_NO_DEBE_SALIR' }; // si llamara a Gemini, saldría
  let rFp = await correrCerebro(msj({ texto: '37' }));
  mockGemini = null;
  check('fast-path: NO mete respuesta extra de Gemini', !rFp.some((m) => m.text && /EXTRA_NO_DEBE_SALIR/.test(m.text.body)), rFp);
  check('fast-path: captura la talla y pide datos', rFp.some((m) => m.text && /anotada|datos de env/i.test(m.text.body)), rFp);
  delete ENV.BOT_ROBUSTEZ;
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 25. v6.1: cantidad (dos pares) ==');
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  const rCant = await correrCerebro(msj({ texto: 'Hola quiero dos pares de la ref 05' }));
  const sesCant = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('cantidad: sesión guarda cantidad 2 en la ref 05', sesCant && sesCant.cantidad === 2 && sesCant.ref === '05', sesCant);
  const p05 = docCat('05');
  const total2 = p05 ? fmtP(p05.precio * 2) : '';
  check('cantidad: avisa "2 pares" y total x2 (' + total2 + ')', rCant.some((m) => m.text && /2 pares/i.test(m.text.body) && total2 && m.text.body.includes(total2)), { total2, rCant });
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 26. v6.3: contra entrega (solo Bogotá) ==');
  delete ENV.BOT_ROBUSTEZ; // determinista: sin IA en el paso de pago
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, { estado: 'pago', ref: '05', precio: 480000, talla: '40', cantidad: 1, datosEnvio: 'Ana Ruiz, Cra 5 #10-20, Bogotá, 3019876543', nombrePerfil: 'Cliente Prueba', updatedAt: new Date().toISOString() });
  let rCE = await correrCerebro(msj({ texto: 'qué opciones de pago hay' }));
  const listaCE = rCE.find((m) => esLista(m));
  check('contra entrega: Bogotá ve la opción en la lista de pago', listaCE && filasDe(listaCE).some((f) => f.id === 'pay:contraentrega'), listaCE && filasDe(listaCE).map((f) => f.id));
  rCE = await correrCerebro(msj({ tipo: 'interactive', inter_id: 'pay:contraentrega' }));
  check('contra entrega: confirma al cliente (paga al recibir)', rCE.some((m) => m.text && /contra entrega/i.test(m.text.body)), rCE[0]);
  const ceAviso = rCE.find((m) => m.to === DUENO && m.text && /CONTRA ENTREGA/.test(m.text.body));
  check('contra entrega: avisa al dueño', !!ceAviso, ceAviso && ceAviso.text.body.slice(0, 60));
  const ceMatch = (ceAviso && ceAviso.text.body.match(/Pedido: (\S+)/)) || [];
  const cePath = ceMatch[1] || '';
  const cePedido = cePath ? await fsGet(cePath) : null;
  check('contra entrega: pedido metodo=Contra entrega, estado=nuevo, sin comprobante', cePedido && cePedido.metodo_pago === 'Contra entrega' && cePedido.estado === 'nuevo' && !cePedido.comprobante_media_id, cePedido);
  const ceSes = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('contra entrega: sesión borrada tras el pedido', ceSes === null, ceSes);
  if (cePath) await fsDel(cePath);
  // Fuera de Bogotá: la opción NO se ofrece; si la piden, se avisa que es solo Bogotá
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, { estado: 'pago', ref: '05', precio: 480000, talla: '40', cantidad: 1, datosEnvio: 'Pedro, Calle 1, Cali, 3001112222', nombrePerfil: 'Cliente Prueba', updatedAt: new Date().toISOString() });
  const rNoCE = await correrCerebro(msj({ texto: 'puedo pagar contra entrega' }));
  check('contra entrega: fuera de Bogotá NO cierra COD (avisa solo Bogotá)', rNoCE.some((m) => m.text && /solo.*bogot/i.test(m.text.body)), rNoCE);
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 27. v6.3: conversión de tallas nacional/US → EUR ==');
  delete ENV.BOT_ROBUSTEZ; // determinista
  const convCasos = [
    ['39 nacional hombre', '41'],   // nacional hombre +2
    ['uso talla 10 us hombre', '43'], // US hombre +33
    ['38 nacional para mujer', '39'], // nacional dama +1
    ['40', '40']                    // bare → EUR directo (sin conversión)
  ];
  for (const [txt, esperada] of convCasos) {
    await fsSet('tiendas/varman/botSesiones/' + TEST_WA, { estado: 'talla', ref: '05', precio: 480000, cantidad: 1, nombrePerfil: 'x', updatedAt: new Date().toISOString() });
    await correrCerebro(msj({ texto: txt }));
    const sConv = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
    check('conversión: "' + txt + '" → talla ' + esperada, sConv && sConv.talla === esperada && sConv.estado === 'datos', sConv && { talla: sConv.talla, estado: sConv.estado });
  }
  // nacional SIN género: el CÓDIGO pide el género (no adivina) y luego convierte
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, { estado: 'talla', ref: '05', precio: 480000, cantidad: 1, nombrePerfil: 'x', updatedAt: new Date().toISOString() });
  let rG = await correrCerebro(msj({ texto: 'la 39 pero nacional' }));
  let sG = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('conversión: nacional sin género → pide género (no fija talla)', rG.some((m) => m.text && /hombre|mujer/i.test(m.text.body)) && sG && sG.estado === 'talla' && Number(sG.tallaPendNum) === 39, { r: rG[0] && rG[0].text && rG[0].text.body, ses: sG && { estado: sG.estado, pend: sG.tallaPendNum } });
  await correrCerebro(msj({ texto: 'es para hombre' }));
  sG = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('conversión: tras el género → 39 nacional hombre = 41 EUR', sG && sG.talla === '41' && sG.estado === 'datos', sG && { talla: sG.talla, estado: sG.estado });
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 28. A1: fiabilidad de Gemini (helper llamarGemini) ==');
  // 28a — Gemini devuelve BASURA (no-JSON) en el clasificador → NO se cae y
  // degrada al catálogo (lista interactiva). Nunca un throw ni silencio.
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  mockGemini = 'se cayó el modelo, esto no es JSON {roto';
  r = await correrCerebro(msj({ texto: 'hola, tienen tenis nike?' }));
  mockGemini = null;
  check('A1: Gemini basura no rompe el bot (responde algo)', r.length >= 1, r.length);
  check('A1: Gemini basura degrada a catálogo (lista interactiva)', r[r.length - 1].type === 'interactive', r[r.length - 1] && r[r.length - 1].type);

  // 28b — Gemini responde JSON envuelto en fences ```json ... ``` (caso real de
  // los modelos pese a responseMimeType): el parseo tolerante lo entiende →
  // clasifica la marca y manda fotos. HOY (sin el helper) JSON.parse falla y el
  // bot cae al catálogo genérico sin fotos: este caso captura ese bug.
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  mockGemini = '```json\n{"intent":"buscar_marca","respuesta":"Claro, mira estas Adidas","marca":"adidas"}\n```';
  r = await correrCerebro(msj({ texto: 'tienen adidas?' }));
  mockGemini = null;
  const imgsA1 = imagenes(r);
  check('A1: parseo tolerante de fences ```json``` (clasifica marca → manda fotos)', imgsA1.length >= 1 && /Adidas/.test(imgsA1[0].image.caption), r.map((m) => m.type));

  // 28c — con BOT_ROBUSTEZ ON, basura de Gemini en asistir() → helper devuelve
  // null → el paso de talla cae al texto determinista v5 (no se cae, no adivina).
  ENV.BOT_ROBUSTEZ = 'on';
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, { estado: 'talla', ref: '05', precio: 480000, nombrePerfil: 'Cliente Prueba', updatedAt: new Date().toISOString() });
  mockGemini = 'no-json <<< roto';
  r = await correrCerebro(msj({ texto: 'mmm ayúdame no sé bien' }));
  mockGemini = null;
  delete ENV.BOT_ROBUSTEZ;
  check('A1: Gemini basura en asistir() no rompe (cae al texto v5 de talla)', r.length >= 1 && /35 a la 45/.test(r[r.length - 1].text.body), r.map((m) => m.text && m.text.body).filter(Boolean));
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 29. B1: few-shot en el clasificador (flag BOT_CLASIF_V2) ==');
  // El clasificador manda a Gemini un system_instruction. Con el flag OFF debe ser
  // el prompt v1 de hoy (sin ejemplos); con el flag ON, el v1 + bloque few-shot.
  const promptClasif = () => {
    const b = geminiReqs[geminiReqs.length - 1];
    return (b && b.system_instruction && b.system_instruction.parts && b.system_instruction.parts[0].text) || '';
  };
  // flag OFF: prompt v1 (sin marcador few-shot) → clasificador = hoy
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  delete ENV.BOT_CLASIF_V2;
  geminiReqs.length = 0;
  mockGemini = { intent: 'saludo', respuesta: '' };
  await correrCerebro(msj({ texto: 'hola buenas, una preguntica' }));
  mockGemini = null;
  const promptOff = promptClasif();
  check('B1 flag OFF: clasificador usa el prompt v1 (sin few-shot)', promptOff.length > 0 && !/EJEMPLOS \(few-shot/.test(promptOff) && !/tienen Jordan/i.test(promptOff), promptOff.slice(-60));

  // flag ON: el prompt incluye el bloque few-shot (ejemplos del BANCO)
  ENV.BOT_CLASIF_V2 = 'on';
  geminiReqs.length = 0;
  mockGemini = { intent: 'saludo', respuesta: '' };
  await correrCerebro(msj({ texto: 'hola buenas, una preguntica' }));
  mockGemini = null;
  delete ENV.BOT_CLASIF_V2;
  const promptOn = promptClasif();
  check('B1 flag ON: clasificador incluye ejemplos few-shot (Jordan, ¿originales?)', /EJEMPLOS \(few-shot/.test(promptOn) && /tienen Jordan/i.test(promptOn), promptOn.slice(-80));
  check('B1 flag ON: conserva la forma del JSON (intent/buscar_marca/aviso_stock)', /"intent"/.test(promptOn) && /buscar_marca/.test(promptOn) && /aviso_stock/.test(promptOn), promptOn.slice(0, 40));
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 30. B3: dispatch sin dead-ends (flag BOT_DISPATCH_V2) ==');
  // pregunta_precio SIN respuesta de Gemini:
  //  - flag OFF (hoy): cae al catálogo genérico (sin mencionar precios)
  //  - flag ON: responde con el rango de precios + catálogo (camino útil)
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  delete ENV.BOT_DISPATCH_V2;
  mockGemini = { intent: 'pregunta_precio', respuesta: '' };
  r = await correrCerebro(msj({ texto: 'y eso como a cuanto sale?' }));
  mockGemini = null;
  check('B3 flag OFF: pregunta_precio sin texto NO menciona precios (cae al catálogo)', r.length >= 1 && !r.some((m) => m.text && /235\.000/.test(m.text.body)), r.map((m) => m.type));

  ENV.BOT_DISPATCH_V2 = 'on';
  mockGemini = { intent: 'pregunta_precio', respuesta: '' };
  r = await correrCerebro(msj({ texto: 'y eso como a cuanto sale?' }));
  mockGemini = null;
  delete ENV.BOT_DISPATCH_V2;
  check('B3 flag ON: pregunta_precio responde el rango de precios', r.some((m) => m.text && /235\.000/.test(m.text.body) && /480\.000/.test(m.text.body)), r.map((m) => m.type));
  check('B3 flag ON: además muestra el catálogo para elegir', r.some((m) => esLista(m)), r.map((m) => m.type));

  // saludo con flag ON: sigue mostrando el catálogo (nunca dead-end)
  ENV.BOT_DISPATCH_V2 = 'on';
  mockGemini = { intent: 'saludo', respuesta: '¡Hola! Bienvenido 👟' };
  r = await correrCerebro(msj({ texto: 'holaaa' }));
  mockGemini = null;
  delete ENV.BOT_DISPATCH_V2;
  check('B3 flag ON: saludo muestra catálogo (lista interactiva)', r[r.length - 1].type === 'interactive', r[r.length - 1] && r[r.length - 1].type);
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 31. C2: pregunta-vs-dato en talla (BOT_ROBUSTEZ, Gemini degenerado) ==');
  // Con robustez ON y Gemini degenerado (dato y respuesta vacíos), el fallback
  // crudo NO debe fijar la talla si el número viene en una PREGUNTA.
  ENV.BOT_ROBUSTEZ = 'on';
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, { estado: 'talla', ref: '05', precio: 480000, nombrePerfil: 'Cliente Prueba', updatedAt: new Date().toISOString() });
  mockGemini = { handoff: false, dato: '', respuesta: '' };
  r = await correrCerebro(msj({ texto: '¿tienen la 35?' }));
  mockGemini = null;
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('C2: "¿tienen la 35?" NO fija talla (sigue en talla)', ses && ses.estado === 'talla' && !ses.talla, ses && { estado: ses.estado, talla: ses.talla });

  // control: "uso la 40" SÍ fija la talla (es un dato, no una pregunta)
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, { estado: 'talla', ref: '05', precio: 480000, nombrePerfil: 'Cliente Prueba', updatedAt: new Date().toISOString() });
  mockGemini = { handoff: false, dato: '', respuesta: '' };
  r = await correrCerebro(msj({ texto: 'uso la 40' }));
  mockGemini = null;
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('C2: "uso la 40" SÍ fija la talla (avanza a datos)', ses && ses.estado === 'datos' && ses.talla === '40', ses && { estado: ses.estado, talla: ses.talla });
  delete ENV.BOT_ROBUSTEZ;
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 32. B2: normalización de marca (flag BOT_MARCA_NORM) ==');
  // Gemini clasifica buscar_marca pero devuelve la marca MAL escrita ("addidas").
  //  - flag OFF (hoy): no corrige → no matchea el catálogo (respuesta honesta).
  //  - flag ON: corrige addidas→adidas → matchea y manda fotos.
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  delete ENV.BOT_MARCA_NORM;
  mockGemini = { intent: 'buscar_marca', respuesta: 'Claro', marca: 'addidas' };
  r = await correrCerebro(msj({ texto: 'tienen addidas?' }));
  mockGemini = null;
  check('B2 flag OFF: marca mal escrita NO matchea (respuesta honesta)', r.length === 1 && r[0].type === 'interactive' && /no tengo referencias marcadas/i.test(r[0].interactive.body.text), r[0] && r[0].type);

  ENV.BOT_MARCA_NORM = 'on';
  mockGemini = { intent: 'buscar_marca', respuesta: 'Claro', marca: 'addidas' };
  r = await correrCerebro(msj({ texto: 'tienen addidas?' }));
  mockGemini = null;
  delete ENV.BOT_MARCA_NORM;
  const imgsB2 = imagenes(r);
  check('B2 flag ON: addidas→adidas matchea y manda fotos', imgsB2.length >= 1 && /Adidas/i.test(imgsB2[0].image.caption), r.map((m) => m.type));
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 33. D3: validación de datos de envío (flag BOT_DATOS_V2) ==');
  const datosIncomp = 'Juan Pérez, 3001234567'; // sin dirección ni ciudad
  // flag OFF (v5 laxo): 15+ chars + dígito → avanza a pago igual (comportamiento hoy)
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, { estado: 'datos', ref: '05', precio: 480000, talla: '40', nombrePerfil: 'x', updatedAt: new Date().toISOString() });
  delete ENV.BOT_DATOS_V2;
  await correrCerebro(msj({ texto: datosIncomp }));
  let sD = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('D3 flag OFF: datos incompletos avanzan a pago (v5 laxo)', sD && sD.estado === 'pago', sD && sD.estado);

  // flag ON: NO avanza y dice qué falta (dirección y ciudad)
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, { estado: 'datos', ref: '05', precio: 480000, talla: '40', nombrePerfil: 'x', updatedAt: new Date().toISOString() });
  ENV.BOT_DATOS_V2 = 'on';
  r = await correrCerebro(msj({ texto: datosIncomp }));
  delete ENV.BOT_DATOS_V2;
  sD = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('D3 flag ON: datos incompletos NO avanzan (sigue en datos)', sD && sD.estado === 'datos', sD && sD.estado);
  check('D3 flag ON: dice qué falta (dirección y ciudad)', r.some((m) => m.text && /falta/i.test(m.text.body) && /direcci/i.test(m.text.body) && /ciudad/i.test(m.text.body)), r[0] && r[0].text);

  // flag ON con datos COMPLETOS → avanza a pago
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, { estado: 'datos', ref: '05', precio: 480000, talla: '40', nombrePerfil: 'x', updatedAt: new Date().toISOString() });
  ENV.BOT_DATOS_V2 = 'on';
  await correrCerebro(msj({ texto: 'Juan Pérez, Calle 10 #20-30, Medellín, 3001234567' }));
  delete ENV.BOT_DATOS_V2;
  sD = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('D3 flag ON: datos completos SÍ avanzan a pago', sD && sD.estado === 'pago', sD && sD.estado);
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 34. E2: textos de venta más cálidos (flag BOT_TEXTOS_V2) ==');
  // tallaAnotada (paso talla "40"). OFF = texto v5; ON = versión cálida del BANCO.
  delete ENV.BOT_TEXTOS_V2;
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, { estado: 'talla', ref: '05', precio: 480000, nombrePerfil: 'x', updatedAt: new Date().toISOString() });
  r = await correrCerebro(msj({ texto: '40' }));
  const anotOff = ((r.find((m) => m.text && /anotada/i.test(m.text.body)) || { text: {} }).text.body) || '';
  check('E2 flag OFF: tallaAnotada v5 (sin "Ya casi")', /anotada/i.test(anotOff) && !/Ya casi/i.test(anotOff), anotOff.slice(0, 40));

  ENV.BOT_TEXTOS_V2 = 'on';
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, { estado: 'talla', ref: '05', precio: 480000, nombrePerfil: 'x', updatedAt: new Date().toISOString() });
  r = await correrCerebro(msj({ texto: '40' }));
  delete ENV.BOT_TEXTOS_V2;
  const anotOn = ((r.find((m) => m.text && /anotada/i.test(m.text.body)) || { text: {} }).text.body) || '';
  check('E2 flag ON: tallaAnotada cálido (BANCO: "Ya casi" + datos)', /anotada/i.test(anotOn) && /Ya casi/i.test(anotOn) && /Nombre completo/i.test(anotOn), anotOn.slice(0, 60));
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  // pedirTalla (al arrancar el pedido con ref:05). ON = "Excelente elección".
  ENV.BOT_TEXTOS_V2 = 'on';
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  r = await correrCerebro(msj({ tipo: 'interactive', inter_id: 'ref:05' }));
  delete ENV.BOT_TEXTOS_V2;
  check('E2 flag ON: pedirTalla cálido ("Excelente elección" + 35 a la 45)', r.some((m) => m.text && /Excelente elecci/i.test(m.text.body) && /35 a la 45/.test(m.text.body)), r.map((m) => m.type));
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  // [E2b] categoriasBody (bienvenida, BANCO §1). OFF = v5; ON = "en la mira".
  delete ENV.BOT_TEXTOS_V2;
  mockGemini = { intent: 'saludo', respuesta: '' };
  r = await correrCerebro(msj({ texto: 'holaa buenas' }));
  mockGemini = null;
  const bienvOff = (esLista(r[r.length - 1]) && r[r.length - 1].interactive.body.text) || '';
  check('E2b flag OFF: bienvenida v5 ("Estos son nuestros estilos")', /Estos son nuestros estilos/.test(bienvOff), bienvOff.slice(0, 60));
  ENV.BOT_TEXTOS_V2 = 'on';
  mockGemini = { intent: 'saludo', respuesta: '' };
  r = await correrCerebro(msj({ texto: 'holaa buenas' }));
  mockGemini = null;
  const bienvOn = (esLista(r[r.length - 1]) && r[r.length - 1].interactive.body.text) || '';
  check('E2b flag ON: bienvenida BANCO §1 ("qué modelo tienes en la mira" + marca)', /modelo tienes en la mira/i.test(bienvOn) && /marca/i.test(bienvOn), bienvOn.slice(0, 80));

  // [E2b] pedidoRecibido (cierre con comprobante). ON = ganchos del BANCO
  // (caja original + guía) conservando "Pedido recibido" y los placeholders.
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, { estado: 'comprobante', ref: '05', precio: 480000, metodo: 'Nequi', talla: '40', datosEnvio: 'x', nombrePerfil: 'Cliente Prueba', updatedAt: new Date().toISOString() });
  r = await correrCerebro(msj({ tipo: 'image', imagen_id: 'FAKE_MEDIA_E2B' }));
  delete ENV.BOT_TEXTOS_V2;
  check('E2b flag ON: cierre cálido (caja original + guía) y conserva "Pedido recibido" con la ref', r[0] && /Pedido recibido/.test(r[0].text.body) && /caja original/i.test(r[0].text.body) && /gu[ií]a de rastreo/i.test(r[0].text.body) && /Referencia 05/.test(r[0].text.body), r[0] && r[0].text.body.slice(0, 120));
  const mPathE2B = ((r[1] && r[1].text.body.match(/Pedido guardado: (\S+)/)) || []);
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 35. E1: foto/insistencia → asesor (flag BOT_FOTO_ASESOR) ==');
  // 35a — flag OFF: foto sin pedido en curso = comportamiento de hoy
  // (texto vacío → catálogo) y NADA se envía al 320.
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  delete ENV.BOT_FOTO_ASESOR;
  r = await correrCerebro(msj({ tipo: 'image', imagen_id: 'FAKE_FOTO_MODELO' }));
  check('E1 flag OFF: foto sin pedido → catálogo de hoy, sin aviso al 320', r.length >= 1 && r[r.length - 1].type === 'interactive' && !r.some((m) => m.to === DUENO), r.map((m) => ({ type: m.type, to: m.to })));

  // 35b — flag ON: responde "asesor" al cliente + aviso al 320 + la foto
  // reenviada por su media_id (image.id, SIN link ni descarga).
  ENV.BOT_FOTO_ASESOR = 'on';
  r = await correrCerebro(msj({ tipo: 'image', imagen_id: 'FAKE_FOTO_MODELO' }));
  check('E1 flag ON: foto → dice al cliente que un asesor confirma', r.some((m) => m.to === TEST_WA && m.type === 'text' && /asesor/i.test(m.text.body)), r);
  check('E1 flag ON: foto → aviso al 320 con nombre y número', r.some((m) => m.to === DUENO && m.type === 'text' && /busca un modelo/i.test(m.text.body) && m.text.body.includes(TEST_WA)), r);
  const fotoFwd = r.find((m) => m.to === DUENO && m.type === 'image');
  check('E1 flag ON: foto reenviada al 320 por media_id (image.id, sin link)', !!fotoFwd && fotoFwd.image.id === 'FAKE_FOTO_MODELO' && !fotoFwd.image.link, fotoFwd);

  // 35c — flag ON: la foto DURANTE el pedido (comprobante) NO se desvía al
  // asesor — el cierre del pedido con comprobante sigue intacto.
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, { estado: 'comprobante', ref: '05', precio: 480000, metodo: 'Nequi', talla: '40', datosEnvio: 'x', nombrePerfil: 'Cliente Prueba', updatedAt: new Date().toISOString() });
  r = await correrCerebro(msj({ tipo: 'image', imagen_id: 'FAKE_MEDIA_E1' }));
  check('E1 flag ON: el comprobante sigue cerrando el pedido (no asesor)', r[0] && /Pedido recibido/.test(r[0].text.body), r[0]);
  const mPathE1 = ((r[1] && r[1].text.body.match(/Pedido guardado: (\S+)/)) || []);

  // 35d — flag ON: marca sin resultados recuerda la marca; la insistencia
  // ("las quiero SÍ o SÍ") pasa el dato al asesor sin gastar Gemini.
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  mockGemini = { intent: 'buscar_marca', respuesta: 'De esa...', marca: 'zzzmarcainexistente' };
  r = await correrCerebro(msj({ texto: 'tienen zzzmarcainexistente?' }));
  mockGemini = null;
  check('E1 flag ON: marca sin refs → mismo aviso honesto de hoy', r.length === 1 && r[0].type === 'interactive' && /no tengo referencias marcadas/i.test(r[0].interactive.body.text), r[0] && r[0].type);
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('E1 flag ON: la sesión recuerda la marca sin resultados', ses && ses.marcaNoDisp === 'zzzmarcainexistente', ses);
  mockGemini = { intent: 'comprar', respuesta: 'x' }; // por si el camino determinista fallara, que NO caiga a Gemini real
  r = await correrCerebro(msj({ texto: 'las quiero SÍ o SÍ' }));
  mockGemini = null;
  check('E1: insistencia → dice al cliente que un asesor confirma', r.some((m) => m.to === TEST_WA && m.type === 'text' && /asesor/i.test(m.text.body)), r);
  check('E1: insistencia → avisa al 320 con la marca', r.some((m) => m.to === DUENO && /insiste/i.test(m.text.body) && /zzzmarcainexistente/.test(m.text.body)), r);
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('E1: tras pasar al asesor se limpia la marca pendiente', !ses || !ses.marcaNoDisp, ses);

  // 35e — flag ON: preguntar OTRA VEZ por la misma marca sin resultados
  // también cuenta como insistencia → asesor, no repetir el mismo catálogo.
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  mockGemini = { intent: 'buscar_marca', respuesta: '', marca: 'zzzmarcainexistente' };
  await correrCerebro(msj({ texto: 'tienen zzzmarcainexistente?' }));
  r = await correrCerebro(msj({ texto: 'pero si tienen zzzmarcainexistente?' }));
  mockGemini = null;
  check('E1: repetir la misma marca sin refs → asesor (no repite catálogo)', r.some((m) => m.to === DUENO && /insiste/i.test(m.text.body)) && !r.some((m) => esLista(m)), r.map((m) => ({ type: m.type, to: m.to })));

  // 35f — SEGURIDAD flag OFF: la misma insistencia sigue el flujo de hoy
  // (clasificador normal, sin aviso al 320).
  delete ENV.BOT_FOTO_ASESOR;
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, { marcaNoDisp: 'zzzmarcainexistente', updatedAt: new Date().toISOString() });
  mockGemini = { intent: 'otro', respuesta: 'Con gusto te ayudo' };
  r = await correrCerebro(msj({ texto: 'las quiero SÍ o SÍ' }));
  mockGemini = null;
  check('E1 flag OFF: insistencia sigue el flujo de hoy (sin aviso al 320)', r.length >= 1 && !r.some((m) => m.to === DUENO), r.map((m) => ({ type: m.type, to: m.to })));
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 36. D1: conversión de tallas v2 (flag BOT_TALLAS_V2, determinista) ==');
  delete ENV.BOT_ROBUSTEZ; // sin IA: solo el camino determinista de tallas
  const setTalla36 = () => fsSet('tiendas/varman/botSesiones/' + TEST_WA, { estado: 'talla', ref: '05', precio: 480000, cantidad: 1, nombrePerfil: 'x', updatedAt: new Date().toISOString() });

  // --- flag OFF: comportamiento EXACTO de hoy ---
  delete ENV.BOT_TALLAS_V2;
  await setTalla36();
  await correrCerebro(msj({ texto: 'uso 9.5 us hombre' }));
  let sT = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('D1 flag OFF: "9.5 us hombre" trunca a 9 → fija 42 (hoy)', sT && sT.talla === '42' && sT.estado === 'datos', sT && { talla: sT.talla, estado: sT.estado });
  await setTalla36();
  r = await correrCerebro(msj({ texto: 'la 39 nacional para caballeros' }));
  sT = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('D1 flag OFF: "para caballeros" (plural) no se entiende → pide género', sT && sT.estado === 'talla' && Number(sT.tallaPendNum) === 39 && r.some((m) => m.text && /hombre.*mujer|mujer.*hombre/i.test(m.text.body)), sT && { estado: sT.estado, pend: sT.tallaPendNum });
  await setTalla36();
  r = await correrCerebro(msj({ texto: 'mi pie mide 25 cm' }));
  sT = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('D1 flag OFF: "25 cm" no se entiende (talla inválida, sigue en talla)', sT && sT.estado === 'talla' && !sT.talla && r.some((m) => m.text && /35 a la 45/.test(m.text.body)), sT && { estado: sT.estado, talla: sT.talla });
  await setTalla36();
  await correrCerebro(msj({ texto: 'mide como 40 cm' }));
  sT = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('D1 flag OFF: "40 cm" se toma como talla 40 (bug conocido de hoy)', sT && sT.talla === '40' && sT.estado === 'datos', sT && { talla: sT.talla, estado: sT.estado });

  // --- flag ON: expresiones ampliadas (la matemática sigue en código) ---
  ENV.BOT_TALLAS_V2 = 'on';
  await setTalla36();
  r = await correrCerebro(msj({ texto: 'uso 9.5 us hombre' }));
  sT = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('D1 flag ON: "9.5 us hombre" → 42.5 redondea a 43', sT && sT.talla === '43' && sT.estado === 'datos' && r.some((m) => m.text && /talla 43/.test(m.text.body)), sT && { talla: sT.talla });
  await setTalla36();
  await correrCerebro(msj({ texto: 'talla 10 y medio us para varon' }));
  sT = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('D1 flag ON: "10 y medio us para varón" → 44', sT && sT.talla === '44' && sT.estado === 'datos', sT && { talla: sT.talla });
  await setTalla36();
  await correrCerebro(msj({ texto: 'la 39 nacional para caballeros' }));
  sT = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('D1 flag ON: "39 nacional para caballeros" → 41', sT && sT.talla === '41' && sT.estado === 'datos', sT && { talla: sT.talla });
  await setTalla36();
  await correrCerebro(msj({ texto: '38 colombianas para damas' }));
  sT = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('D1 flag ON: "38 colombianas para damas" → 39', sT && sT.talla === '39' && sT.estado === 'datos', sT && { talla: sT.talla });
  await setTalla36();
  r = await correrCerebro(msj({ texto: 'mi pie mide 25 cm' }));
  sT = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('D1 flag ON: "pie 25 cm" → talla 40 aprox y avanza a datos', sT && sT.talla === '40' && sT.estado === 'datos' && r.some((m) => m.text && /aprox/i.test(m.text.body) && /talla 40/.test(m.text.body)), sT && { talla: sT.talla });
  await setTalla36();
  r = await correrCerebro(msj({ texto: 'mide como 40 cm' }));
  sT = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('D1 flag ON: "40 cm" NO es un pie → no fija talla (arregla el bug)', sT && sT.estado === 'talla' && !sT.talla && r.some((m) => m.text && /35 a la 45/.test(m.text.body)), sT && { estado: sT.estado, talla: sT.talla });
  await setTalla36();
  await correrCerebro(msj({ texto: '39 nacional hombre' }));
  sT = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('D1 flag ON: lo de hoy sigue igual ("39 nacional hombre" → 41)', sT && sT.talla === '41' && sT.estado === 'datos', sT && { talla: sT.talla });
  delete ENV.BOT_TALLAS_V2;
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 37. F1: cambio de modelo a mitad de pedido (flag BOT_FLUIDEZ_RECONDUCE) ==');
  delete ENV.BOT_ROBUSTEZ; // determinista: los casos reales pasaron SIN IA
  const setPedido37 = (estado, extra) => fsSet('tiendas/varman/botSesiones/' + TEST_WA, Object.assign({ estado, ref: '05', precio: 480000, cantidad: 1, nombrePerfil: 'x', updatedAt: new Date().toISOString() }, extra || {}));

  // --- flag OFF: los bugs del caso real 3 y 1, documentados ---
  delete ENV.BOT_FLUIDEZ_RECONDUCE;
  await setPedido37('talla');
  r = await correrCerebro(msj({ texto: 'Hola! Quiero la Ref 06 ($320.000 COP)' }));
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('F1 flag OFF: ref directa a mitad de talla → plantilla repetida (caso 3, hoy)', ses && ses.ref === '05' && ses.estado === 'talla' && r.some((m) => m.text && /35 a la 45/.test(m.text.body)), ses && { ref: ses.ref, estado: ses.estado });
  await setPedido37('datos', { talla: '40' });
  await correrCerebro(msj({ texto: 'mejor quiero otro modelo' }));
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('F1 flag OFF: "otro modelo" en datos hoy se toma como dirección → pasa a pago (bug)', ses && ses.estado === 'pago', ses && { estado: ses.estado });

  // --- flag ON: reconduce (casos 1 y 3) ---
  ENV.BOT_FLUIDEZ_RECONDUCE = 'on';
  await setPedido37('talla');
  r = await correrCerebro(msj({ texto: 'Hola! Quiero la Ref 06 ($320.000 COP)' }));
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('F1 flag ON: "Quiero la Ref 06" a mitad de talla → cambia el pedido a la 06', ses && ses.ref === '06' && ses.estado === 'talla', ses && { ref: ses.ref, estado: ses.estado });
  check('F1 flag ON: responde el cambio + ficha de la 06 + pide talla', r.some((m) => m.text && /Cambiamos tu pedido/i.test(m.text.body)) && r.some((m) => m.type === 'image' && /Ref 06/.test(m.image.caption)) && /talla/i.test(r[r.length - 1].text.body), r.map((m) => m.type));
  await setPedido37('datos', { talla: '40' });
  r = await correrCerebro(msj({ texto: 'mejor quiero otro modelo' }));
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('F1 flag ON: "otro modelo" en datos → sesión cerrada + catálogo cálido', ses === null && esLista(r[r.length - 1]) && /Claro que s[ií]/i.test(r[r.length - 1].interactive.body.text), { ses, body: esLista(r[r.length - 1]) && r[r.length - 1].interactive.body.text.slice(0, 50) });
  await setPedido37('pago', { talla: '40', datosEnvio: 'Calle 1, Cali, 3001112222' });
  r = await correrCerebro(msj({ texto: 'quiero ver el catalogo' }));
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('F1 flag ON: "ver el catálogo" en pago → catálogo, NO re-envía el bloque de pago (caso 1)', ses === null && esLista(r[r.length - 1]) && !r.some((m) => m.text && /prefieres pagar/i.test(m.text.body)) && !r.some((m) => esLista(m) && /prefieres pagar/i.test(m.interactive.body.text)), r.map((m) => m.type));
  // guardas: ref inexistente no secuestra; los botones interactivos no se tocan
  await setPedido37('talla');
  r = await correrCerebro(msj({ texto: 'tienen la ref 99?' }));
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('F1 flag ON: ref inexistente NO cambia el pedido (sigue el paso normal)', ses && ses.ref === '05' && ses.estado === 'talla', ses && { ref: ses.ref, estado: ses.estado });
  await setPedido37('pago', { talla: '40', datosEnvio: 'x' });
  r = await correrCerebro(msj({ tipo: 'interactive', inter_id: 'pay:nequi' }));
  check('F1 flag ON: los botones (pay:nequi) siguen funcionando igual', r.length === 1 && r[0].type === 'text' && /Nequi/.test(r[0].text.body), r[0] && r[0].type);
  delete ENV.BOT_FLUIDEZ_RECONDUCE;
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 38. F2: menos burbujas en el catálogo (flag BOT_FLUIDEZ_CATALOGO) ==');
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  // OFF: la tanda de hoy = 7 burbujas con el fixture (intro + 4 fotos + fallback + lista)
  delete ENV.BOT_FLUIDEZ_CATALOGO;
  r = await correrCerebro(msj({ tipo: 'interactive', inter_id: 'cat:deportivas' }));
  check('F2 flag OFF: la tanda de hoy manda 7 burbujas (fixture)', r.length === 7 && imagenes(r).length === 4, { n: r.length, tipos: r.map((m) => m.type) });
  // ON: baja a 4 burbujas (3 fotos + 1 lista única)
  ENV.BOT_FLUIDEZ_CATALOGO = 'on';
  r = await correrCerebro(msj({ tipo: 'interactive', inter_id: 'cat:deportivas' }));
  check('F2 flag ON: la tanda baja a 4 burbujas (3 fotos + 1 lista)', r.length === 4 && imagenes(r).length === 3 && r.filter(esLista).length === 1, { n: r.length, tipos: r.map((m) => m.type) });
  const listaF2 = r[r.length - 1];
  check('F2 flag ON: la lista lleva el intro en el body y pagina de a 3 (Ver más → 3)', esLista(listaF2) && /deportivas/i.test(listaF2.interactive.body.text) && filasDe(listaF2).length === 4 && filasDe(listaF2)[3].id === 'cat:deportivas:3', filasDe(listaF2).map((f) => f.id));
  // ON segunda página (offset 3): la Ref 04 (foto de app) va DENTRO del body, sin burbuja extra
  r = await correrCerebro(msj({ tipo: 'interactive', inter_id: 'cat:deportivas:3' }));
  const listaF2b = r[r.length - 1];
  check('F2 flag ON: ref sin foto va dentro del body de la lista (no burbuja extra)', r.length === 3 && imagenes(r).length === 2 && esLista(listaF2b) && /Ref 04/.test(listaF2b.interactive.body.text), { n: r.length, body: (esLista(listaF2b) && listaF2b.interactive.body.text.slice(0, 90)) || '' });
  // ON: elegir de la lista arranca el pedido en UNA burbuja (F7: ficha con la
  // pregunta de la talla dentro del caption)
  r = await correrCerebro(msj({ tipo: 'interactive', inter_id: 'ref:01' }));
  check('F2 flag ON: elegir de la lista arranca el pedido en 1 burbuja (ficha + talla en el caption)', r.length === 1 && r[0].type === 'image' && /Ref 01/.test(r[0].image.caption) && /talla/i.test(r[0].image.caption), r.map((m) => m.type));
  delete ENV.BOT_FLUIDEZ_CATALOGO;
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 39. F3: anti-repetición de plantilla (BOT_FLUIDEZ_RECONDUCE) ==');
  delete ENV.BOT_ROBUSTEZ; // determinista: el caso real 3 pasó sin IA
  // OFF: hoy el muro se repite idéntico (caso 3: 4 plantillas de talla seguidas)
  delete ENV.BOT_FLUIDEZ_RECONDUCE;
  await setPedido37('talla');
  const rw1 = await correrCerebro(msj({ texto: 'mmm no entiendo nada' }));
  const rw2 = await correrCerebro(msj({ texto: 'sigo sin saber' }));
  check('F3 flag OFF: el muro de talla se repite idéntico 2 veces (caso 3, hoy)', rw1[0] && rw2[0] && /Escríbeme solo el número/.test(rw1[0].text.body) && /Escríbeme solo el número/.test(rw2[0].text.body), rw2[0] && rw2[0].text.body.slice(0, 50));

  // ON: 1ª vez plantilla completa, 2ª vez variante BREVE con salidas
  ENV.BOT_FLUIDEZ_RECONDUCE = 'on';
  await setPedido37('talla');
  const rA39 = await correrCerebro(msj({ texto: 'mmm no entiendo nada' }));
  check('F3 flag ON: 1ª vez → plantilla completa de talla', rA39[0] && /Escríbeme solo el número/.test(rA39[0].text.body), rA39[0] && rA39[0].text.body.slice(0, 50));
  const rB39 = await correrCerebro(msj({ texto: 'sigo sin saber' }));
  check('F3 flag ON: 2ª vez → variante breve con salidas (catálogo/asesor), sin el muro', rB39[0] && /cat[aá]logo/i.test(rB39[0].text.body) && /asesor/i.test(rB39[0].text.body) && !/Escríbeme solo el número/.test(rB39[0].text.body), rB39[0] && rB39[0].text.body);
  // la salida "catálogo" funciona de verdad (reencamina y cierra la sesión)
  const rC39 = await correrCerebro(msj({ texto: 'catálogo' }));
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('F3 flag ON: la salida "catálogo" reencamina (lista + sesión cerrada)', esLista(rC39[rC39.length - 1]) && ses === null, { ses, tipos: rC39.map((m) => m.type) });
  // datos: 2ª vez → breve
  await setPedido37('datos', { talla: '40' });
  await correrCerebro(msj({ texto: 'mmm' }));
  const rD39 = await correrCerebro(msj({ texto: 'nop' }));
  check('F3 flag ON: datos 2ª vez → variante breve (asesor), no el genérico otra vez', rD39[0] && /asesor/i.test(rD39[0].text.body) && !/Creo que faltan datos/.test(rD39[0].text.body), rD39[0] && rD39[0].text.body);
  // pago: 2ª vez → texto breve, NO re-envía los botones (caso 1)
  await setPedido37('pago', { talla: '40', datosEnvio: 'Calle 1, Cali, 3001112222' });
  await correrCerebro(msj({ texto: 'mmm' }));
  const rF39 = await correrCerebro(msj({ texto: 'como asi' }));
  check('F3 flag ON: pago 2ª vez → texto breve, sin re-enviar los botones', rF39.length === 1 && rF39[0].type === 'text' && /asesor/i.test(rF39[0].text.body), rF39.map((m) => m.type));
  // comprobante: 2ª vez → recordatorio breve
  await setPedido37('comprobante', { talla: '40', metodo: 'Nequi', datosEnvio: 'x' });
  await correrCerebro(msj({ texto: 'ya casi' }));
  const rG39 = await correrCerebro(msj({ texto: 'espera un momento' }));
  check('F3 flag ON: comprobante 2ª vez → recordatorio breve con asesor', rG39[0] && /asesor/i.test(rG39[0].text.body) && !/cancelar/.test(rG39[0].text.body), rG39[0] && rG39[0].text.body);
  // avanzar limpia el contador: dar la talla tras un fallo → flujo normal
  await setPedido37('talla');
  await correrCerebro(msj({ texto: 'no sé' }));
  const rE39 = await correrCerebro(msj({ texto: '40' }));
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('F3 flag ON: dar la talla tras un fallo → avanza normal y limpia el contador', ses && ses.estado === 'datos' && !ses.repEstado && rE39.some((m) => m.text && /anotada/i.test(m.text.body)), ses && { estado: ses.estado, rep: ses.repEstado });
  delete ENV.BOT_FLUIDEZ_RECONDUCE;
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 40. F4: asistente vendedor v2 (flag BOT_ASISTENTE_V2) ==');
  // El asistente corre con BOT_ROBUSTEZ on; se inspecciona el system_instruction
  // que se le manda a Gemini (mismo patrón de la sección 29) con Gemini mockeado.
  ENV.BOT_ROBUSTEZ = 'on';
  const promptAsist = () => {
    const b = geminiReqs[geminiReqs.length - 1];
    return (b && b.system_instruction && b.system_instruction.parts && b.system_instruction.parts[0].text) || '';
  };
  // flag OFF: prompt v1 exacto (sin bloque de venta)
  delete ENV.BOT_ASISTENTE_V2;
  await setPedido37('talla');
  geminiReqs.length = 0;
  mockGemini = { handoff: false, dato: '', respuesta: 'ok' };
  await correrCerebro(msj({ texto: 'jajaja q locura' }));
  mockGemini = null;
  const pAsistOff = promptAsist();
  check('F4 flag OFF: asistente usa el prompt v1 (sin REGLAS DE VENTA)', pAsistOff.length > 0 && !/REGLAS DE VENTA/.test(pAsistOff), pAsistOff.slice(-60));
  // flag ON: prompt v2 (incoherencia + ganchos + CTA) con la MISMA forma de JSON
  ENV.BOT_ASISTENTE_V2 = 'on';
  await setPedido37('talla');
  geminiReqs.length = 0;
  mockGemini = { handoff: false, dato: '', respuesta: 'Tranquilo 😊 dime qué número calzas (35-45) y seguimos.' };
  r = await correrCerebro(msj({ texto: 'jajaja q locura' }));
  mockGemini = null;
  const pAsistOn = promptAsist();
  check('F4 flag ON: prompt v2 (REGLAS DE VENTA + incoherentes + ganchos)', /REGLAS DE VENTA/.test(pAsistOn) && /NO tiene sentido/i.test(pAsistOn) && /video de tu pedido/i.test(pAsistOn), pAsistOn.slice(-80));
  check('F4 flag ON: conserva la forma del JSON del asistente', /"handoff"/.test(pAsistOn) && /"dato"/.test(pAsistOn) && /"respuesta"/.test(pAsistOn), pAsistOn.slice(0, 60));
  check('F4 flag ON: mensaje incoherente → sale SOLO la respuesta cálida (sin plantilla encima)', r.length === 1 && r[0].type === 'text' && /Tranquilo/.test(r[0].text.body), r.map((m) => m.type));
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('F4 flag ON: no fija nada con el mensaje incoherente (sigue en talla)', ses && ses.estado === 'talla' && !ses.talla, ses && { estado: ses.estado, talla: ses.talla });
  delete ENV.BOT_ASISTENTE_V2;
  delete ENV.BOT_ROBUSTEZ;
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 41. F5: acuse datos→pago con la ciudad (flag BOT_FLUIDEZ_ACUSE) ==');
  delete ENV.BOT_ROBUSTEZ; // determinista
  const DATOS_CALI = 'Juan Pérez, Calle 10 #20-30, Cali, 3001234567';
  // OFF: el body de pago es el genérico de hoy
  delete ENV.BOT_FLUIDEZ_ACUSE;
  await setPedido37('datos', { talla: '40' });
  r = await correrCerebro(msj({ texto: DATOS_CALI }));
  check('F5 flag OFF: bloque de pago genérico (sin "Envío a")', r[0] && r[0].type === 'interactive' && /va quedando listo/.test(r[0].interactive.body.text) && !/Env[ií]o a \*/.test(r[0].interactive.body.text), r[0] && r[0].interactive.body.text.slice(0, 60));
  // ON: menciona la ciudad + envío incluido
  ENV.BOT_FLUIDEZ_ACUSE = 'on';
  await setPedido37('datos', { talla: '40' });
  r = await correrCerebro(msj({ texto: DATOS_CALI }));
  check('F5 flag ON: el bloque de pago acusa la ciudad ("Envío a Cali") + envío incluido', r[0] && r[0].type === 'interactive' && /Env[ií]o a \*Cali\*/.test(r[0].interactive.body.text) && /env[ií]o incluido/i.test(r[0].interactive.body.text) && /prefieres pagar/i.test(r[0].interactive.body.text), r[0] && r[0].interactive.body.text.slice(0, 80));
  // ON con Bogotá: acusa "Bogotá" (con tilde) y la lista trae contra entrega
  await setPedido37('datos', { talla: '40' });
  r = await correrCerebro(msj({ texto: 'Ana Ruiz, Cra 5 #10-20, Bogotá, 3019876543' }));
  const listaF5 = r[0];
  check('F5 flag ON: Bogotá acusada con tilde y contra entrega en la lista', esLista(listaF5) && /Env[ií]o a \*Bogot[aá]\*/.test(listaF5.interactive.body.text) && filasDe(listaF5).some((f) => f.id === 'pay:contraentrega'), listaF5 && listaF5.interactive.body.text.slice(0, 60));
  // ON con ciudad desconocida: cae al body genérico (nunca inventa)
  await setPedido37('datos', { talla: '40' });
  r = await correrCerebro(msj({ texto: 'Juan Pérez, Calle 10 #20-30, Pueblito Nuevo, 3001234567' }));
  check('F5 flag ON: ciudad no reconocida → body genérico (no inventa)', r[0] && /va quedando listo/.test(r[0].interactive.body.text), r[0] && r[0].interactive.body.text.slice(0, 60));
  delete ENV.BOT_FLUIDEZ_ACUSE;
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 42. F6: textos de venta con CTA de cierre (flag BOT_TEXTOS_V2) ==');
  // OFF: comprar → intro v5 (sin CTA de apartado)
  delete ENV.BOT_TEXTOS_V2;
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  mockGemini = { intent: 'comprar', respuesta: '' };
  r = await correrCerebro(msj({ texto: 'quiero comprar unos tenis' }));
  mockGemini = null;
  check('F6 flag OFF: comprarIntro v5 ("toca el modelo que buscas")', esLista(r[r.length - 1]) && /toca el modelo que buscas/.test(r[r.length - 1].interactive.body.text), esLista(r[r.length - 1]) && r[r.length - 1].interactive.body.text.slice(0, 50));
  // ON: comprar → CTA "te lo aparto"
  ENV.BOT_TEXTOS_V2 = 'on';
  mockGemini = { intent: 'comprar', respuesta: '' };
  r = await correrCerebro(msj({ texto: 'quiero comprar unos tenis' }));
  mockGemini = null;
  check('F6 flag ON: comprarIntro con CTA de cierre ("te lo aparto")', esLista(r[r.length - 1]) && /te lo aparto/i.test(r[r.length - 1].interactive.body.text), esLista(r[r.length - 1]) && r[r.length - 1].interactive.body.text.slice(0, 50));
  // ON: ref directa desde la web → intro con "la apartamos"
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  r = await correrCerebro(msj({ texto: 'Hola! Quiero la Ref 05' }));
  check('F6 flag ON: refDirectaIntro con CTA ("la apartamos")', r[0] && r[0].type === 'text' && /apartamos/i.test(r[0].text.body), r[0] && r[0].text.body);
  await correrCerebro(msj({ texto: 'cancelar' }));
  // ON: datosIncompletos cálido (una sola pregunta, "pedido listo")
  await setPedido37('datos', { talla: '40' });
  r = await correrCerebro(msj({ texto: 'mmm' }));
  check('F6 flag ON: datosIncompletos cálido ("Ya casi" + campos + pedido listo)', r[0] && /Ya casi/.test(r[0].text.body) && /Tel[eé]fono/i.test(r[0].text.body) && /pedido listo/i.test(r[0].text.body), r[0] && r[0].text.body);
  // ON + D3: datosFaltan cálido conserva {faltan} (dice exactamente qué falta)
  ENV.BOT_DATOS_V2 = 'on';
  await setPedido37('datos', { talla: '40' });
  r = await correrCerebro(msj({ texto: 'Juan Pérez, 3001234567' }));
  delete ENV.BOT_DATOS_V2;
  check('F6 flag ON + D3: datosFaltan cálido dice qué falta (dirección, ciudad)', r[0] && /Solo me falta/i.test(r[0].text.body) && /direcci/i.test(r[0].text.body) && /ciudad/i.test(r[0].text.body), r[0] && r[0].text.body);
  delete ENV.BOT_TEXTOS_V2;
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 43. F7: arranque del pedido en UNA burbuja (flag BOT_FLUIDEZ_CATALOGO) ==');
  // OFF: hoy = 2 burbujas al elegir de la lista (ficha + pedirTalla)
  delete ENV.BOT_FLUIDEZ_CATALOGO;
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  r = await correrCerebro(msj({ tipo: 'interactive', inter_id: 'ref:01' }));
  check('F7 flag OFF: elegir una ref manda 2 burbujas (ficha + pide talla), como hoy', r.length === 2 && r[0].type === 'image' && /talla/i.test(r[1].text.body), r.map((m) => m.type));
  // ON: 1 sola burbuja con la pregunta en el caption
  ENV.BOT_FLUIDEZ_CATALOGO = 'on';
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  r = await correrCerebro(msj({ tipo: 'interactive', inter_id: 'ref:01' }));
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('F7 flag ON: 1 burbuja (ficha + talla en el caption) y la sesión queda en talla', r.length === 1 && r[0].type === 'image' && /talla/i.test(r[0].image.caption) && ses && ses.estado === 'talla', { n: r.length, cap: r[0] && r[0].image && r[0].image.caption.slice(0, 80) });
  // ON: ref directa desde la web → el intro también va dentro del caption
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  r = await correrCerebro(msj({ texto: 'Hola! Quiero la Ref 05' }));
  check('F7 flag ON: ref directa de la web = 1 burbuja (intro + ficha + talla)', r.length === 1 && r[0].type === 'image' && /Ref 05/.test(r[0].image.caption) && /talla/i.test(r[0].image.caption), { n: r.length, cap: r[0] && r[0].image && r[0].image.caption.slice(0, 80) });
  await correrCerebro(msj({ texto: 'cancelar' }));
  // ON: si la talla ya venía en el mensaje → ficha sin pregunta + confirmación aparte
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  r = await correrCerebro(msj({ texto: 'Hola! Quiero la Ref 05 en talla 42' }));
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('F7 flag ON: talla en el mismo mensaje → ficha sin pregunta + anotada (2 burbujas, a datos)', r.length === 2 && r[0].type === 'image' && !/¿Qué \*talla\*/.test(r[0].image.caption) && /anotada/i.test(r[1].text.body) && ses && ses.estado === 'datos' && ses.talla === '42', { n: r.length, ses: ses && { estado: ses.estado, talla: ses.talla } });
  delete ENV.BOT_FLUIDEZ_CATALOGO;
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 44. F8: pregunta por una marca a mitad de pedido (BOT_FLUIDEZ_RECONDUCE) ==');
  delete ENV.BOT_ROBUSTEZ; // determinista
  // OFF: hoy la pregunta por marca en pleno paso talla recibe la plantilla
  delete ENV.BOT_FLUIDEZ_RECONDUCE;
  await setPedido37('talla');
  r = await correrCerebro(msj({ texto: '¿tienen nike?' }));
  check('F8 flag OFF: "¿tienen nike?" en talla → plantilla de talla (hoy)', r[0] && r[0].type === 'text' && /35 a la 45/.test(r[0].text.body), r[0] && r[0].text.body.slice(0, 40));
  // ON: muestra la tanda de nike y cierra la sesión (elegir re-arranca)
  ENV.BOT_FLUIDEZ_RECONDUCE = 'on';
  await setPedido37('talla');
  r = await correrCerebro(msj({ texto: '¿tienen nike?' }));
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('F8 flag ON: "¿tienen nike?" → fotos de nike + lista (sesión cerrada)', imagenes(r).length >= 1 && /nike/i.test(imagenes(r)[0].image.caption) && r.some(esLista) && ses === null, { n: r.length, ses });
  // guarda: si el mensaje trae un número de talla, NO secuestra (fija la talla)
  await setPedido37('talla');
  await correrCerebro(msj({ texto: 'las nike en 40' }));
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('F8 flag ON: "las nike en 40" NO secuestra → fija la talla 40', ses && ses.estado === 'datos' && ses.talla === '40', ses && { estado: ses.estado, talla: ses.talla });
  // marca fuera del catálogo → sigue el paso normal (no inventa)
  await setPedido37('talla');
  r = await correrCerebro(msj({ texto: '¿tienen gucci?' }));
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('F8 flag ON: marca fuera de catálogo → sigue el paso (no inventa)', ses && ses.estado === 'talla' && r[0] && r[0].type === 'text', ses && ses.estado);
  delete ENV.BOT_FLUIDEZ_RECONDUCE;
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 45. F9/D1b: "puedo llevar 2" sin la palabra pares (BOT_FLUIDEZ_RECONDUCE) ==');
  delete ENV.BOT_ROBUSTEZ; // determinista (el caso 3 pasó sin IA)
  // OFF: hoy cae a la plantilla de talla (caso 3)
  delete ENV.BOT_FLUIDEZ_RECONDUCE;
  await setPedido37('talla');
  r = await correrCerebro(msj({ texto: 'Puedo llevar 2' }));
  check('F9 flag OFF: "Puedo llevar 2" en talla → plantilla de talla (caso 3, hoy)', r[0] && /35 a la 45/.test(r[0].text.body), r[0] && r[0].text.body.slice(0, 40));
  // ON: confirma con el gancho del 15% y guía al formato "2 pares", sin perder el paso
  ENV.BOT_FLUIDEZ_RECONDUCE = 'on';
  await setPedido37('talla');
  r = await correrCerebro(msj({ texto: 'Puedo llevar 2' }));
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('F9 flag ON: "Puedo llevar 2" → "claro que sí" + 15% + guía "2 pares" (sin plantilla)', r.length === 1 && /Claro que s[ií]/i.test(r[0].text.body) && /15%/.test(r[0].text.body) && /2 pares/.test(r[0].text.body) && !/35 a la 45/.test(r[0].text.body), r[0] && r[0].text.body);
  check('F9 flag ON: no fija nada — la sesión sigue en talla con su ref', ses && ses.estado === 'talla' && ses.ref === '05' && (ses.cantidad || 1) === 1, ses && { estado: ses.estado, cantidad: ses.cantidad });
  // el seguimiento "2 pares" sí anota la cantidad (bloque de cantidad de siempre)
  r = await correrCerebro(msj({ texto: '2 pares' }));
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('F9 flag ON: el seguimiento "2 pares" anota cantidad=2 con su total', ses && ses.cantidad === 2 && r.some((m) => m.text && /2 pares/i.test(m.text.body) && /960\.000/.test(m.text.body)), ses && { cantidad: ses.cantidad });
  // guarda: "me llevo la 40" NO se intercepta → fija la talla 40
  await setPedido37('talla');
  await correrCerebro(msj({ texto: 'me llevo la 40' }));
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('F9 flag ON: "me llevo la 40" fija la talla (no se confunde con cantidad)', ses && ses.estado === 'datos' && ses.talla === '40', ses && { estado: ses.estado, talla: ses.talla });
  delete ENV.BOT_FLUIDEZ_RECONDUCE;
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 46. F10: nota de voz / sticker → pedir texto (BOT_FLUIDEZ_RECONDUCE) ==');
  // OFF: hoy una nota de voz sin sesión recibe el catálogo (como si nada)
  delete ENV.BOT_FLUIDEZ_RECONDUCE;
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  r = await correrCerebro(msj({ tipo: 'audio' }));
  check('F10 flag OFF: nota de voz sin sesión → catálogo (hoy)', r.length >= 1 && r[r.length - 1].type === 'interactive', r.map((m) => m.type));
  // ON: respuesta humana única pidiendo texto
  ENV.BOT_FLUIDEZ_RECONDUCE = 'on';
  r = await correrCerebro(msj({ tipo: 'audio' }));
  check('F10 flag ON: nota de voz → "te leo mejor" (1 burbuja, sin catálogo)', r.length === 1 && r[0].type === 'text' && /te leo mejor/i.test(r[0].text.body), r.map((m) => m.type));
  // ON con pedido en curso: mismo texto y la sesión queda intacta
  await setPedido37('talla');
  r = await correrCerebro(msj({ tipo: 'sticker' }));
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('F10 flag ON: sticker a mitad de pedido → pide texto y NO pierde el paso', r.length === 1 && /te leo mejor/i.test(r[0].text.body) && ses && ses.estado === 'talla', ses && { estado: ses.estado });
  delete ENV.BOT_FLUIDEZ_RECONDUCE;
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== 47. CATÁLOGO WEB: solo el link de la web (flag BOT_CATALOGO_WEB) ==');
  delete ENV.BOT_ROBUSTEZ; // determinista
  const LINK_CAT = /varmancrew\.com\/#catalogo/;
  // OFF (regresión): "hola" → catálogo de hoy (lista interactiva), sin el link
  delete ENV.BOT_CATALOGO_WEB;
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  mockGemini = { intent: 'saludo', respuesta: '' };
  r = await correrCerebro(msj({ texto: 'hola' }));
  mockGemini = null;
  check('CW flag OFF: "hola" → lista de categorías de hoy, sin link de la web', esLista(r[r.length - 1]) && !r.some((m) => m.type === 'text' && LINK_CAT.test(m.text.body)), r.map((m) => m.type));
  r = await correrCerebro(msj({ tipo: 'interactive', inter_id: 'cat:deportivas' }));
  check('CW flag OFF: cat:deportivas → tanda con fotos + lista (hoy)', imagenes(r).length >= 1 && r.some(esLista) && !r.some((m) => m.type === 'text' && LINK_CAT.test(m.text.body)), r.map((m) => m.type));
  // ON (v2): "hola" → BIENVENIDA conversacional que espera la pregunta del
  // cliente, SIN link en frío, sin image ni lista
  ENV.BOT_CATALOGO_WEB = 'on';
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  mockGemini = { intent: 'saludo', respuesta: '' };
  r = await correrCerebro(msj({ texto: 'hola' }));
  mockGemini = null;
  check('CW flag ON: "hola" → bienvenida que espera la pregunta (sin link en frío)', r.length === 1 && r[0].type === 'text' && /Bienvenido a \*VarMan Crew\*/.test(r[0].text.body) && !LINK_CAT.test(r[0].text.body), r);
  check('CW flag ON: sin mensajes image ni lista interactiva', !r.some((m) => m.type === 'image') && !r.some(esLista), r.map((m) => m.type));
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('CW flag ON: el saludo NO marca linkCatalogoAt (no se mandó link)', !ses || !ses.linkCatalogoAt, ses);
  // ON: elegir categoría → solo el link (sin fotos ni lista)
  r = await correrCerebro(msj({ tipo: 'interactive', inter_id: 'cat:deportivas' }));
  check('CW flag ON: cat:deportivas → solo el link (sin fotos ni lista)', r.length === 1 && r[0].type === 'text' && LINK_CAT.test(r[0].text.body), r.map((m) => m.type));
  // ON: "quiero ver zapatos" (ver_catalogo) → mismo link, y AHÍ sí se marca
  // linkCatalogoAt para el seguimiento (el link sí salió)
  mockGemini = { intent: 'ver_catalogo', respuesta: '¡Claro!' };
  r = await correrCerebro(msj({ texto: 'quiero ver zapatos' }));
  mockGemini = null;
  check('CW flag ON: "quiero ver zapatos" → solo el link', r.length === 1 && r[0].type === 'text' && LINK_CAT.test(r[0].text.body), r);
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('CW flag ON: mandar el link SÍ marca linkCatalogoAt (para el seguimiento)', ses && !!ses.linkCatalogoAt, ses);
  // ON (v2): marca que SÍ tenemos → dice cuántos modelos hay + link, sin fotos
  mockGemini = { intent: 'buscar_marca', respuesta: 'Mira las nike 🔥', marca: 'nike' };
  r = await correrCerebro(msj({ texto: 'tienen nike?' }));
  mockGemini = null;
  check('CW flag ON: marca que tenemos → "De *Nike* tenemos N modelos" + link (sin fotos)', r.length === 1 && r[0].type === 'text' && /De \*Nike\* tenemos \d+ modelos? disponibles?/.test(r[0].text.body) && LINK_CAT.test(r[0].text.body), r);
  // ON: comprar → UN solo mensaje (la respuesta de Gemini no va encima)
  mockGemini = { intent: 'comprar', respuesta: '¡Claro que sí!' };
  r = await correrCerebro(msj({ texto: 'quiero comprar unos tenis' }));
  mockGemini = null;
  check('CW flag ON: comprar → UN solo mensaje con el link', r.length === 1 && r[0].type === 'text' && LINK_CAT.test(r[0].text.body), r);
  // ON + dispatch v2: pregunta_precio → UN solo mensaje (precio + link)
  ENV.BOT_DISPATCH_V2 = 'on';
  mockGemini = { intent: 'pregunta_precio', respuesta: '' };
  r = await correrCerebro(msj({ texto: 'a como los tenis?' }));
  mockGemini = null;
  delete ENV.BOT_DISPATCH_V2;
  check('CW flag ON + dispatch v2: pregunta_precio → UNA burbuja (rango de precios + link)', r.length === 1 && r[0].type === 'text' && /235\.000/.test(r[0].text.body) && LINK_CAT.test(r[0].text.body), r);
  // ON: el flujo de PEDIDO no cambia — "Quiero la Ref 05" arranca el pedido normal
  r = await correrCerebro(msj({ texto: 'Hola! Quiero la Ref 05' }));
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('CW flag ON: "Quiero la Ref 05" arranca el pedido (ficha + talla, sin link)', ses && ses.estado === 'talla' && ses.ref === '05' && !r.some((m) => m.type === 'text' && LINK_CAT.test(m.text.body)), { ses: ses && ses.estado, tipos: r.map((m) => m.type) });
  await correrCerebro(msj({ texto: 'cancelar' }));
  // ON: "cancelar" tras recibir el link borra la sesión de solo-link → apaga el
  // seguimiento para quien rechazó explícito (y responde sin hablar de "pedido")
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA3);
  mockGemini = { intent: 'ver_catalogo', respuesta: '' };
  r = await correrCerebro(msj({ wa_id: TEST_WA3, nombre: 'Cliente Tres', texto: 'quiero ver el catálogo' }));
  mockGemini = null;
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA3);
  check('CW flag ON: el link también marca la sesión de otro cliente (TEST_WA3)', ses && !!ses.linkCatalogoAt, ses);
  r = await correrCerebro(msj({ wa_id: TEST_WA3, texto: 'cancelar' }));
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA3);
  check('CW flag ON: "cancelar" tras el link borra la sesión (no habrá seguimiento) con respuesta amable', ses === null && r[0] && r[0].type === 'text' && /hola/i.test(r[0].text.body) && !/pedido/i.test(r[0].text.body), { ses, r: r[0] && r[0].text });
  // --- seguimiento de compra a las ~2h (trigger horario, notificaciones.js) ---
  const hace3hCW = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
  // cliente ACTIVO hace <1h (botRate fresco) → se aplaza, sin marcar
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA3, { linkCatalogoAt: hace3hCW, nombrePerfil: 'Cliente Tres', updatedAt: hace3hCW });
  await fsSet('tiendas/varman/botRate/' + TEST_WA3, { minuto: 1, n: 1, updatedAt: new Date().toISOString() });
  let segOut = await correrNotif();
  check('CW seguimiento: cliente activo hace <1h → se APLAZA (no interrumpe la conversación)', segOut.filter((m) => m.to === TEST_WA3).length === 0, segOut.length);
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA3);
  check('CW seguimiento aplazado: NO queda marcado (el próximo run lo reintenta)', ses && ses.seguimientoLink !== true, ses);
  // cliente callado hace 3h → SÍ se manda, con nombre y link
  await fsSet('tiendas/varman/botRate/' + TEST_WA3, { minuto: 1, n: 1, updatedAt: hace3hCW });
  segOut = await correrNotif();
  let seg = segOut.filter((m) => m.to === TEST_WA3);
  check('CW seguimiento ~2h: pregunta si pudo comprar + link + nombre', seg.length === 1 && /¿Pudiste/i.test(seg[0].text.body) && LINK_CAT.test(seg[0].text.body) && /Cliente Tres/.test(seg[0].text.body), seg[0] && seg[0].text);
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA3);
  check('CW seguimiento: sesión marcada (seguimientoLink=true, máx 1)', ses && ses.seguimientoLink === true, ses);
  segOut = await correrNotif();
  check('CW seguimiento: NO se repite en la siguiente corrida', segOut.filter((m) => m.to === TEST_WA3).length === 0, segOut.length);
  // con pedido en curso NO se manda (eso lo cubre el carrito abandonado)
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA3, { estado: 'talla', ref: '05', precio: 480000, nombrePerfil: 'x', linkCatalogoAt: hace3hCW, updatedAt: new Date().toISOString() });
  segOut = await correrNotif();
  check('CW seguimiento: con pedido en curso NO se manda', segOut.filter((m) => m.to === TEST_WA3).length === 0, segOut.length);
  // cliente que YA compró por el bot (pedidos de esta corrida son de TEST_WA,
  // creados hace minutos) → NO se le pregunta si pudo comprar
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, { linkCatalogoAt: hace3hCW, nombrePerfil: 'Cliente Prueba', updatedAt: hace3hCW });
  await fsSet('tiendas/varman/botRate/' + TEST_WA, { minuto: 1, n: 1, updatedAt: hace3hCW });
  segOut = await correrNotif();
  check('CW seguimiento: cliente con pedido reciente por el bot NO recibe la pregunta', segOut.filter((m) => m.to === TEST_WA).length === 0, segOut.length);
  // flag OFF: aunque exista linkCatalogoAt, el trigger no manda nada (regresión)
  delete ENV.BOT_CATALOGO_WEB;
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA3, { linkCatalogoAt: hace3hCW, nombrePerfil: 'Cliente Tres', updatedAt: hace3hCW });
  segOut = await correrNotif();
  check('CW flag OFF: el trigger horario NO manda seguimiento', segOut.filter((m) => m.to === TEST_WA3).length === 0, segOut.length);
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA3);

  console.log('== 48. CW v2 + NOMBRE-MODELO: marca honesta, ref inexistente y nombre del zapato ==');
  delete ENV.BOT_ROBUSTEZ; // determinista
  // --- CATALOGO-WEB v2 (mismo flag BOT_CATALOGO_WEB) ---
  ENV.BOT_CATALOGO_WEB = 'on';
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  // marca que NO tenemos → honestidad + link + asesor, en UN mensaje
  mockGemini = { intent: 'buscar_marca', respuesta: '', marca: 'gucci' };
  r = await correrCerebro(msj({ texto: 'tienen gucci?' }));
  mockGemini = null;
  check('CW v2: marca que NO tenemos → honesto ("no tengo") + link + asesor (1 mensaje)', r.length === 1 && /De \*Gucci\* no tengo/.test(r[0].text.body) && LINK_CAT.test(r[0].text.body) && /asesor/i.test(r[0].text.body), r);
  // ref que NO existe → honesto + link, sin arrancar pedido
  r = await correrCerebro(msj({ texto: 'Quiero la ref 99' }));
  ses = await fsGet('tiendas/varman/botSesiones/' + TEST_WA);
  check('CW v2: ref inexistente → honesto ("no la encuentro") + link, NO arranca pedido', r.length === 1 && /no la encuentro/i.test(r[0].text.body) && LINK_CAT.test(r[0].text.body) && (!ses || !ses.estado), { r: r[0] && r[0].text, ses: ses && ses.estado });
  // pregunta de precio → bienvenida + rango + link en UNA burbuja
  ENV.BOT_DISPATCH_V2 = 'on';
  mockGemini = { intent: 'pregunta_precio', respuesta: '' };
  r = await correrCerebro(msj({ texto: 'precio?' }));
  mockGemini = null;
  delete ENV.BOT_DISPATCH_V2;
  check('CW v2: "precio" → bienvenida + rango + link en UNA burbuja', r.length === 1 && /bienvenido a \*VarMan Crew\*/i.test(r[0].text.body) && /235\.000/.test(r[0].text.body) && LINK_CAT.test(r[0].text.body), r);
  // "catálogo" → link DIRECTO y determinista (ni siquiera depende de Gemini)
  mockGemini = 'esto no es json'; // Gemini "caído": devuelve basura
  r = await correrCerebro(msj({ texto: 'catálogo' }));
  mockGemini = null;
  check('CW v2: "catálogo" → link directo aunque Gemini esté caído (fast-path)', r.length === 1 && r[0].type === 'text' && LINK_CAT.test(r[0].text.body), r);
  // la bienvenida quedó corta, sin la coletilla del link
  mockGemini = { intent: 'saludo', respuesta: '' };
  r = await correrCerebro(msj({ texto: 'hola' }));
  mockGemini = null;
  check('CW v2: bienvenida corta exacta (sin coletilla de "escríbeme catálogo")', r.length === 1 && /¿qué modelo o marca buscas, o en qué te puedo ayudar\?$/.test(r[0].text.body.trim()), r[0] && r[0].text);
  delete ENV.BOT_CATALOGO_WEB;
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  // --- NOMBRE-MODELO (flag BOT_NOMBRE_MODELO): la marca de la app en vez de "Ref NN" ---
  const marca01 = String(docCat('01').marca || '').replace(/^./, (c) => c.toUpperCase()); // Adidas (fixture)
  const reMarca01 = new RegExp('\\*' + marca01 + '\\*');
  // OFF: pedido recibido con "Referencia 01" (hoy)
  delete ENV.BOT_NOMBRE_MODELO;
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, { estado: 'comprobante', ref: '01', precio: 250000, metodo: 'Nequi', talla: '40', datosEnvio: 'x', nombrePerfil: 'Cliente Prueba', updatedAt: new Date().toISOString() });
  r = await correrCerebro(msj({ tipo: 'image', imagen_id: 'FAKE_MEDIA_NM1' }));
  const mPathNM1 = (r[1] && r[1].text.body.match(/Pedido guardado: (\S+)/)) || [];
  check('NM flag OFF: pedido recibido muestra "Referencia 01" (hoy)', r[0] && /Referencia 01/.test(r[0].text.body), r[0] && r[0].text);
  // ON: pedido recibido con el nombre del modelo, sin la Ref; el 320 la conserva
  ENV.BOT_NOMBRE_MODELO = 'on';
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, { estado: 'comprobante', ref: '01', precio: 250000, metodo: 'Nequi', talla: '40', datosEnvio: 'x', nombrePerfil: 'Cliente Prueba', updatedAt: new Date().toISOString() });
  r = await correrCerebro(msj({ tipo: 'image', imagen_id: 'FAKE_MEDIA_NM2' }));
  const mPathNM2 = (r[1] && r[1].text.body.match(/Pedido guardado: (\S+)/)) || [];
  check('NM flag ON: pedido recibido muestra el modelo (*' + marca01 + '*), sin la Ref', r[0] && reMarca01.test(r[0].text.body) && !/Referencia 01|Ref 01/.test(r[0].text.body) && /Pedido recibido/.test(r[0].text.body), r[0] && r[0].text);
  check('NM flag ON: el aviso al 320 CONSERVA la ref (la necesita para alistar)', r[1] && /Ref: 01/.test(r[1].text.body), r[1] && r[1].text);
  // ON: "¿cómo va mi pedido?" muestra el modelo
  mockGemini = { intent: 'estado_pedido', respuesta: '' };
  r = await correrCerebro(msj({ texto: 'como va mi pedido?' }));
  mockGemini = null;
  check('NM flag ON: "¿cómo va mi pedido?" muestra el modelo, no la Ref', r[0] && reMarca01.test(r[0].text.body) && !/Referencia 01/.test(r[0].text.body), r[0] && r[0].text);
  // ON: ref sin marca registrada → cae al texto de hoy (no inventa)
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, { estado: 'comprobante', ref: '77', precio: 100000, metodo: 'Nequi', talla: '40', datosEnvio: 'x', nombrePerfil: 'Cliente Prueba', updatedAt: new Date().toISOString() });
  r = await correrCerebro(msj({ tipo: 'image', imagen_id: 'FAKE_MEDIA_NM3' }));
  const mPathNM3 = (r[1] && r[1].text.body.match(/Pedido guardado: (\S+)/)) || [];
  check('NM flag ON: ref sin marca → cae a "Referencia 77" (no inventa)', r[0] && /Referencia 77/.test(r[0].text.body), r[0] && r[0].text);
  // ON: contra entrega muestra el modelo al cliente (el 320 conserva la ref)
  await fsSet('tiendas/varman/botSesiones/' + TEST_WA, { estado: 'pago', ref: '01', precio: 250000, talla: '40', datosEnvio: 'Calle 1 # 2-3, Bogotá, 3001234567', nombrePerfil: 'Cliente Prueba', updatedAt: new Date().toISOString() });
  r = await correrCerebro(msj({ tipo: 'interactive', inter_id: 'pay:contraentrega' }));
  const mPathNM4 = (r[1] && r[1].text.body.match(/Pedido: (\S+)/)) || [];
  check('NM flag ON: contra entrega muestra el modelo al cliente', r[0] && reMarca01.test(r[0].text.body) && !/Ref 01/.test(r[0].text.body) && /contra entrega/i.test(r[0].text.body), r[0] && r[0].text);
  // ON: confirmación de pago Wompi (webhook) muestra el modelo
  ENV.WOMPI_EVENTS_SECRET = 'test_secret_123';
  const pedidoNMPath = await fsAdd('tiendas/varman/pedidos', { cliente_wa: TEST_WA2, cliente_nombre: 'Cliente Prueba', ref: '01', talla: '40', cantidad: 1, total: 250000, metodo_pago: 'Wompi', wompi_payment_link_id: 'test_link_MODELO', estado: 'pago_pendiente', canal: 'whatsapp-bot', fuente: 'organico', creado: new Date().toISOString() });
  const wEvtNM = { event: 'transaction.updated', timestamp: 1720000001,
    signature: { properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'] },
    data: { transaction: { id: 'txn_nm_1', status: 'APPROVED', amount_in_cents: 25000000, payment_link_id: 'test_link_MODELO' } } };
  wEvtNM.signature.checksum = crypto.createHash('sha256').update('txn_nm_1' + 'APPROVED' + '25000000' + '1720000001' + ENV.WOMPI_EVENTS_SECRET).digest('hex').toUpperCase();
  const wOutNM = await correrWompi(wEvtNM);
  const msgCliNM = wOutNM.find((m) => m.to === TEST_WA2);
  check('NM flag ON: pago confirmado Wompi muestra el modelo, no la Ref', !!msgCliNM && reMarca01.test(msgCliNM.text.body) && !/Ref 01/.test(msgCliNM.text.body) && /Pago confirmado/i.test(msgCliNM.text.body), msgCliNM && msgCliNM.text);
  check('NM flag ON: el aviso Wompi al 320 conserva la Ref', wOutNM.some((m) => m.to === DUENO && /Ref: 01/.test(m.text.body)), wOutNM);
  delete ENV.WOMPI_EVENTS_SECRET;
  delete ENV.BOT_NOMBRE_MODELO;
  for (const mp of [mPathNM1[1], mPathNM2[1], mPathNM3[1], mPathNM4[1]]) {
    if (mp) { await fsDel(mp); await fsDel('tiendas/varman/comprobantes/' + mp.split('/').pop()); }
  }
  if (pedidoNMPath) await fsDel(pedidoNMPath);
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);

  console.log('== Limpieza final de documentos de prueba ==');
  if (mPathE1[1]) {
    await fsDel(mPathE1[1]);
    await fsDel('tiendas/varman/comprobantes/' + mPathE1[1].split('/').pop());
  }
  if (mPathE2B[1]) {
    await fsDel(mPathE2B[1]);
    await fsDel('tiendas/varman/comprobantes/' + mPathE2B[1].split('/').pop());
  }
  if (mPath4[1]) {
    await fsDel(mPath4[1]);
    await fsDel('tiendas/varman/comprobantes/' + mPath4[1].split('/').pop());
  }
  for (const nid of [notifGuia, notifRes1, notifRes2, notifGuia3]) await fsDel(nid);
  for (const e of esperaDocs) await fsDel(e._path);
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA3);
  await fsDel('tiendas/varman/botRate/' + TEST_WA3);
  if (pedidoPath) await fsDel(pedidoPath);
  if (pedidoId) await fsDel('tiendas/varman/comprobantes/' + pedidoId);
  if (mPath2[1]) await fsDel(mPath2[1]);
  if (mPath3[1]) {
    await fsDel(mPath3[1]);
    await fsDel('tiendas/varman/comprobantes/' + mPath3[1].split('/').pop());
  }
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA);
  await fsDel('tiendas/varman/botSesiones/' + TEST_WA2);
  await fsDel('tiendas/varman/botRate/' + TEST_WA);
  await fsDel('tiendas/varman/botRate/' + TEST_WA2);
  for (const e of await fsRunQuery('botErrores', 15, 'fecha')) {
    if (e.wa_id === TEST_WA || e.wa_id === TEST_WA2 || (e.origen && e.origen.indexOf('wompi-webhook') === 0)) await fsDel(e._path);
  }
  // dedup de prueba: borra los botProcesados que crearon las corridas de test
  try {
    const proc = await httpReal({ method: 'GET', url: FS_BASE + '/tiendas/varman/botProcesados?pageSize=300', headers: { Authorization: 'Bearer ' + await tokenAdmin() } });
    for (const d of (proc.documents || [])) {
      const id = d.name.split('/').pop();
      if (id.indexOf('wamidTEST') === 0 || id.indexOf('wamid_dup') === 0) await fsDel('tiendas/varman/botProcesados/' + id);
    }
  } catch (e) {}
  await fsSet('tiendas/varman/botConfig/general', { pausado: false, actualizado: new Date().toISOString(), por: 'test-final' });

  console.log('\n== RESULTADO: ' + ok + ' PASS · ' + mal + ' FAIL ==');
  process.exit(mal ? 1 : 0);
})().catch((e) => { console.error('ERROR FATAL:', e); process.exit(1); });
