// ============ CEREBRO DEL BOT v5 (fotos + marca + QR + fuente + estado) ============
// Fuente legible del nodo Code "Cerebro (sesion+pedido+Gemini)".
// NO editar el JSON del workflow a mano: editar ESTE archivo y correr
//   node workflows\build-v4-pedidos.js
// TEXTOS DE VENTA/TONO: viven en src\textos.js (TEXTOS, GEMINI_SISTEMA y el
// helper T). El build pega textos.js ANTES de este archivo en el mismo nodo
// Code, así que aquí se usan directo. Para cambiar el tono: editar textos.js.
// Novedades v5 (2026-07-07, brief V5-MEJORAS):
//   - Catálogo con FOTOS: tandas de máx 5 imágenes (type: image con link a las
//     fotos públicas de la web) + lista para elegir + fila "Ver más". Las refs
//     sin foto pública van como línea de texto (fallback, nunca mensaje roto).
//   - Búsqueda por marca: Gemini extrae la entidad `marca`; se filtra por el
//     campo `marca` del catálogo (lo llena Cristhian desde la app).
//   - Pago con QR: si existe PAGO_QR_<METODO> en el .env se envía la imagen
//     del QR + el dato solo (copiable) + total; si no existe, texto como antes.
//   - Ref directa desde la web ("Hola! Quiero la Ref 05"): arranca el pedido
//     ya en esa referencia, sin pasar por el menú.
//   - Atribución de pauta: `fuente` del referral ctwa (Parsear mensaje) viaja
//     por la sesión y queda en el pedido ('organico' si no hay).
//   - Intent estado_pedido: "¿cómo va mi pedido?" responde el estado real.
//   - Anti-spam: máx MSGS_POR_MIN mensajes/minuto por número (protege el cupo
//     gratis de Gemini). El dueño está exento.
// Novedades v4.1 (2026-07-06, Agente 1):
//   - Descarga del comprobante via Graph API y guardado en Firestore
//     tiendas/varman/comprobantes/{idPedido} (b64 + mime). El pedido lleva
//     comprobante_guardado true/false. Ver briefs\CAMBIOS-PEDIDOS.md.
//   - estado del pedido = 'pagado_por_verificar' (contrato congelado del brief).
//   - Comandos admin desde OWNER_WHATSAPP: pedidos / pausar / activar / admin.
//   - Pausa global en tiendas/varman/botConfig/general {pausado}.
//   - try/catch global + log de errores a tiendas/varman/botErrores.
//   - Reintento 1x en llamadas a Graph API (descarga de media).
const H = this.helpers;
const crypto = require('crypto');

const CAT_LABEL = { deportivas: 'Deportivas', casuales: 'Casuales', urbanas: 'Urbanas' };
const CAT_ORDER = ['deportivas', 'casuales', 'urbanas'];
const FS_BASE = 'https://firestore.googleapis.com/v1/projects/varman-crew/databases/(default)/documents';
const CFG_PATH = 'tiendas/varman/botConfig/general';
const GRAPH = 'https://graph.facebook.com/v21.0';
// Fotos públicas del catálogo: los ids "pNNN" de `fotos` en Firestore son los
// mismos archivos img/pNNN.jpg de la web en Cloudflare Pages (verificado
// 2026-07-07: responden 200 image/jpeg). Las fotos subidas DESPUÉS desde la
// app tienen ids "f..." y solo viven en Firestore como base64 → esas refs van
// por el fallback de texto (nada de cargar imágenes en memoria: RAM 1 GB).
const FOTOS_URL_BASE = $env.CATALOGO_FOTOS_URL_BASE || 'https://varmancrew.pages.dev/img/';
const TANDA_FOTOS = 5;        // máx imágenes por tanda (más = spam y carga)
// anti-spam: mensajes por minuto por número (ajustable con BOT_MSGS_POR_MIN)
const MSGS_POR_MIN = parseInt($env.BOT_MSGS_POR_MIN, 10) || 8;
// pide hablar con una persona/asesor → handoff determinista (sin Gemini, en
// cualquier estado). Frases claras; evita falsos positivos comunes.
const PIDE_HUMANO = /\basesor(?:a)?\b|\bun humano\b|\buna persona\b|\bpersona real\b|\bun agente\b|\bagente\b|\brepresentante\b|hablar con (?:alguien|una persona|un asesor|un humano|un agente|el due|la due)|me atiende (?:alguien|una persona)|no me est[aá]s? entend|no me entiend/i;
// [E1] insistencia por un modelo/marca que NO tenemos ("las quiero sí o sí").
// Solo se evalúa justo después de un marcaSinResultados (ses.marcaNoDisp), así
// que el contexto ya es estrecho; aun así son frases de insistencia clara.
const MARCA_INSISTE = /s[ií]\s+o\s+s[ií]|como\s+sea|de\s+todas\s+(?:formas|maneras)|insisto|me\s+urge|consig[au]\w*|consegu[ií]\w*|igual\s+l[ao]s?\s+quiero/i;

// ---------- utilidades ----------
function fmtPrecio(n) {
  return '$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
// cantidad de pares que pide el cliente ("2 pares", "dos pares", "un par").
// Default 1; tope 10 para no disparar totales absurdos por un typo.
const NUM_PALABRA = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6 };
function parseCantidad(texto) {
  const t = String(texto || '').toLowerCase();
  let m = t.match(/(\d+)\s*(?:pares|par|unidades|und|uds)\b/);
  if (m) return Math.min(10, Math.max(1, parseInt(m[1], 10) || 1));
  m = t.match(/\b(un|uno|una|dos|tres|cuatro|cinco|seis)\s+(?:pares|par)\b/);
  if (m) return NUM_PALABRA[m[1]] || 1;
  return 1;
}
// total del pedido = precio unitario × cantidad (default 1)
function totalSes(s) { return (Number(s.precio) || 0) * (Number(s.cantidad) || 1); }
// ---- conversión de tallas nacional/US → EUR (la que manejamos, 35-45) ----
// Nacional→EUR: dama +1, hombre +2. US→EUR (aprox): dama +31, hombre +33.
// La MATEMÁTICA la hace el código (no Gemini) para que siempre sea correcta.
function normTxtG(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function detectarGenero(t) {
  if (/\b(hombre|hombres|masculino|masculina|caballero|masc)\b/.test(t)) return 'h';
  if (/\b(mujer|mujeres|femenino|femenina|dama|fem)\b/.test(t)) return 'm';
  // [D1] v2: plurales y formas comunes que hoy se quedan sin entender. Solo con
  // el flag ON (OFF = exactamente lo de hoy). Curado a palabras inequívocas
  // ("chico/chica" NO: también significa tamaño).
  if (FLAG_TALLAS_V2) {
    if (/\b(caballeros|varon|varones)\b/.test(t)) return 'h';
    if (/\b(damas|senora|senorita)\b/.test(t)) return 'm';
  }
  return null;
}
// ¿el mensaje es una PREGUNTA por una talla ("¿tienen la 35?", "¿hay 42?") y no
// la talla del cliente ("uso la 40")? Red extra (C2) para el fallback crudo del
// paso talla cuando Gemini queda degenerado (sin dato ni respuesta): así un número
// dentro de una pregunta no se fija por error como la talla.
function esPreguntaTalla(t) {
  const s = String(t || '');
  return /[?¿]/.test(s) || /\b(tien(?:en|es)|hay|manej(?:an|as)|dispon\w*|les?\s+queda|tendr[ií]an?|consigu\w*|venden|llega\w*)\b/i.test(s);
}
// validación determinista de datos de envío (D3): revisa nombre + dirección +
// ciudad + teléfono. Devuelve {ok, faltan:[...]}. La usa el paso datos tras el flag.
const CIUDADES_CO = ['bogota', 'medellin', 'cali', 'barranquilla', 'cartagena', 'cucuta', 'bucaramanga', 'pereira', 'manizales', 'santa marta', 'ibague', 'pasto', 'monteria', 'villavicencio', 'armenia', 'neiva', 'valledupar', 'sincelejo', 'popayan', 'tunja', 'riohacha', 'florencia', 'yopal', 'quibdo', 'soacha', 'bello', 'envigado', 'itagui', 'soledad', 'palmira', 'buenaventura', 'floridablanca', 'giron', 'piedecuesta', 'dosquebradas', 'tulua', 'cartago', 'zipaquira', 'chia', 'facatativa', 'girardot', 'duitama', 'sogamoso', 'apartado', 'magangue', 'turbo', 'maicao'];
function validarEnvio(t) {
  const s = String(t || '');
  const limpio = s.replace(/[()\-.\s]/g, '');
  const telefono = /\d{7,10}/.test(limpio);
  const direccion = /\b(calle|carrera|cra|cll|kra|kr|avenida|av|diagonal|diag|transversal|transv|manzana|mz|barrio|conjunto|apto|apartamento|torre|casa|vereda|autopista)\b/i.test(s)
    || /#/.test(s) || /\bn[°ºo]\.?\s*\d/i.test(s) || /\b(cl|kr|cra|cll|dg|tv)\s*\d/i.test(s);
  const ciudad = CIUDADES_CO.some((c) => normTxtG(s).includes(c));
  const nombre = /[a-záéíóúñ]{2,}\s+[a-záéíóúñ]{2,}/i.test(s);
  const faltan = [];
  if (!nombre) faltan.push('nombre completo');
  if (!direccion) faltan.push('dirección');
  if (!ciudad) faltan.push('ciudad');
  if (!telefono) faltan.push('teléfono');
  return { ok: faltan.length === 0, faltan };
}
// [F-ACUSE] ciudad detectada en los datos de envío (palabra completa, no
// substring: "localidad" contiene "cali"), bonita para mostrar. Solo display.
const CIUDAD_BONITA = { bogota: 'Bogotá', medellin: 'Medellín', cucuta: 'Cúcuta', ibague: 'Ibagué', monteria: 'Montería', popayan: 'Popayán', quibdo: 'Quibdó', itagui: 'Itagüí', chia: 'Chía', zipaquira: 'Zipaquirá', facatativa: 'Facatativá', apartado: 'Apartadó', magangue: 'Magangué' };
function ciudadTitulo(texto) {
  const t = normTxtG(texto);
  const c = CIUDADES_CO.find((x) => new RegExp('\\b' + x + '\\b').test(t));
  if (!c) return '';
  return CIUDAD_BONITA[c] || c.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
function convEUR(num, sistema, genero) {
  // Math.round: identidad con enteros (= hoy); solo actúa con las medias
  // tallas US del v2 (9.5 → redondea hacia arriba, mejor que quede holgado).
  const eur = Math.round(sistema === 'us' ? num + (genero === 'h' ? 33 : 31) : num + (genero === 'h' ? 2 : 1));
  return (eur >= 35 && eur <= 45) ? String(eur) : null; // fuera de rango → null
}
// Devuelve {eur} si convierte de una; {pedirGenero, sistema, num} si el sistema es
// explícito pero falta el género; null si NO hay sistema nacional/US explícito
// (→ el flujo normal EUR/Gemini se encarga).
function tallaAEUR(texto) {
  const t = normTxtG(texto);
  // [D1] v2: largo del PIE en cm ("mi pie mide 25 cm", tras el tip de medición
  // del asistente). No depende del género: EUR ≈ cm × 1.5 + 2 (aprox, redondeo
  // arriba). Un "cm" fuera de 20–31 no es un pie → inválida (además evita que
  // el regex crudo del paso talla tome "40 cm" como talla 40).
  if (FLAG_TALLAS_V2) {
    const mcm = t.match(/(\d{2}(?:[.,]\d)?)\s*(?:cm\b|centimetros?\b)/);
    if (mcm) {
      const cm = parseFloat(mcm[1].replace(',', '.'));
      if (cm >= 20 && cm <= 31) {
        const eur = Math.round(cm * 1.5 + 2);
        return (eur >= 35 && eur <= 45) ? { eur: String(eur), aprox: true } : { invalida: true };
      }
      return { invalida: true };
    }
  }
  // sistema explícito: con v2 se aceptan plurales y más formas comunes;
  // con el flag OFF, los regex EXACTOS de hoy.
  // OJO: solo ADJETIVOS de talla (nacional/colombiana) — no "colombia" a secas
  // ("¿envían a toda colombia? uso 40" NO es una talla nacional).
  const nac = FLAG_TALLAS_V2
    ? /\b(nacional(?:es)?|colombian[ao]s?)\b/.test(t)
    : /\b(nacional|colombiana|colombiano)\b/.test(t);
  const us = FLAG_TALLAS_V2
    ? /\b(us|u\.?s\.?a?\.?|gring[ao]s?|american[ao]s?|estadounidense|ee\.?uu\.?)\b/.test(t)
    : /\b(us|u\.?s\.?a?|gringa|gringo|americana|americano|eeuu)\b/.test(t);
  if (!nac && !us) return null;
  // [D1] v2: medias tallas US ("9.5", "10 y medio") → +0.5 (convEUR redondea).
  // El (?!\d) conserva la guarda del \b de hoy: "395" no matchea "39".
  const m = FLAG_TALLAS_V2 ? t.match(/\b(\d{1,2})([.,]5|\s*y\s*medio)?(?!\d)/) : t.match(/\b(\d{1,2})\b/);
  if (!m) return null;
  let num = parseInt(m[1], 10);
  if (FLAG_TALLAS_V2 && m[2]) num += 0.5;
  const sistema = nac ? 'nacional' : 'us';
  const genero = detectarGenero(t);
  if (!genero) return { pedirGenero: true, sistema, num };
  const eur = convEUR(num, sistema, genero);
  return eur ? { eur } : null;
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
function parseCatalogo(fsJson) {
  const docs = (fsJson.documents || []);
  const items = docs.map((d) => {
    const f = d.fields || {}; const o = {};
    for (const k in f) o[k] = unwrap(f[k]);
    return o;
  }).filter((o) => o.activo !== false);
  items.sort((a, b) => (a.orden || 999) - (b.orden || 999));
  return items;
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
function fromFs(doc) {
  if (!doc || !doc.fields) return null;
  const o = {};
  for (const k in doc.fields) o[k] = unwrap(doc.fields[k]);
  return o;
}
function fechaCorta(iso) {
  try {
    return new Date(iso).toLocaleString('es-CO', {
      timeZone: 'America/Bogota', day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
  } catch (e) { return iso || ''; }
}
// reintento 1x (2 intentos en total) para llamadas de red criticas
async function con1Reintento(fn) {
  try { return await fn(); }
  catch (e) {
    await new Promise((r) => setTimeout(r, 1200));
    return await fn();
  }
}

// ---------- acceso admin a Firestore (service account) ----------
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
  const r = await con1Reintento(() => H.httpRequest({
    method: 'POST', url: 'https://oauth2.googleapis.com/token',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt,
    timeout: 15000, json: true
  }));
  return r.access_token;
}
async function fsGet(tok, path) {
  try {
    const d = await H.httpRequest({ method: 'GET', url: FS_BASE + '/' + path,
      headers: { Authorization: 'Bearer ' + tok }, json: true, timeout: 15000 });
    return fromFs(d);
  } catch (e) { return null; }
}
async function fsSet(tok, path, obj) {
  await H.httpRequest({ method: 'PATCH', url: FS_BASE + '/' + path,
    headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: { fields: toFs(obj) }, json: true, timeout: 15000 });
}
// como fsSet pero SOLO toca los campos indicados (updateMask): no pisa el
// resto del documento si ya existe, y lo crea si no existe.
async function fsMerge(tok, path, obj) {
  const mask = Object.keys(obj).filter((k) => obj[k] !== undefined && obj[k] !== null)
    .map((k) => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
  await H.httpRequest({ method: 'PATCH', url: FS_BASE + '/' + path + '?' + mask,
    headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: { fields: toFs(obj) }, json: true, timeout: 15000 });
}
async function fsDel(tok, path) {
  try {
    await H.httpRequest({ method: 'DELETE', url: FS_BASE + '/' + path,
      headers: { Authorization: 'Bearer ' + tok }, json: true, timeout: 15000 });
  } catch (e) {}
}
async function fsAdd(tok, colPath, obj) {
  const d = await H.httpRequest({ method: 'POST', url: FS_BASE + '/' + colPath,
    headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: { fields: toFs(obj) }, json: true, timeout: 15000 });
  return d.name.split('/documents/')[1];
}
// ultimos docs de una subcoleccion de tiendas/varman ordenados por un campo
// (los filtros finos se hacen en JS para no requerir indices compuestos)
async function fsUltimos(tok, coleccion, campo, n) {
  const r = await H.httpRequest({ method: 'POST', url: FS_BASE + '/tiendas/varman:runQuery',
    headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: { structuredQuery: {
      from: [{ collectionId: coleccion }],
      orderBy: [{ field: { fieldPath: campo }, direction: 'DESCENDING' }],
      limit: n
    } }, json: true, timeout: 15000 });
  return (Array.isArray(r) ? r : []).filter((x) => x.document).map((x) => {
    const o = fromFs(x.document) || {};
    o._id = x.document.name.split('/').pop();
    return o;
  });
}
const fsUltimosPedidos = (tok, n) => fsUltimos(tok, 'pedidos', 'creado', n);
// log de errores del bot (mejor esfuerzo: si el log falla, no rompe el flujo)
async function logError(tok, origen, err, extra) {
  try {
    await fsAdd(tok, 'tiendas/varman/botErrores', {
      fecha: new Date().toISOString(),
      origen,
      error: String((err && err.message) || err).slice(0, 800),
      wa_id: (extra && extra.wa_id) || '',
      contexto: (extra && extra.contexto) || ''
    });
  } catch (e) {}
}
// dedup (WhatsApp entrega "al menos una vez": Meta reintenta el webhook y llegan
// mensajes repetidos → respuestas dobles). Crea tiendas/varman/botProcesados/
// {message_id} de forma ATÓMICA (documentId): si Firestore responde
// 409/ALREADY_EXISTS es un duplicado → true (se ignora). Otros errores: no
// bloquear (mejor procesar que perder un mensaje). El barrido limpia la colección.
async function yaProcesado(msgId) {
  if (!msgId) return false;
  const id = String(msgId).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 250);
  try {
    await H.httpRequest({ method: 'POST',
      url: FS_BASE + '/tiendas/varman/botProcesados?documentId=' + id,
      headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
      body: { fields: toFs({ creado: new Date().toISOString() }) },
      json: true, timeout: 10000 });
    return false;
  } catch (e) {
    if (/409|ALREADY_EXISTS|already exists/i.test(String((e && e.message) || e))) return true;
    return false;
  }
}

// ---------- descarga del comprobante (Graph API, reintento 1x) ----------
// GET /{media_id} -> { url, mime_type } ; GET url (Bearer) -> binario.
// La URL de media de Meta caduca en ~5 min: se descarga de inmediato.
async function descargarComprobante(mediaId) {
  const auth = { Authorization: 'Bearer ' + $env.WHATSAPP_TOKEN };
  const meta = await con1Reintento(() => H.httpRequest({
    method: 'GET', url: GRAPH + '/' + mediaId,
    headers: auth, json: true, timeout: 20000
  }));
  if (!meta || !meta.url) throw new Error('media sin URL (id ' + mediaId + ')');
  const bin = await con1Reintento(() => H.httpRequest({
    method: 'GET', url: meta.url,
    headers: Object.assign({ 'User-Agent': 'curl/8.4.0' }, auth),
    encoding: 'arraybuffer', timeout: 30000
  }));
  const buf = Buffer.isBuffer(bin) ? bin : Buffer.from(bin);
  const b64 = buf.toString('base64');
  // limite de documento en Firestore ~1 MiB: si no cabe, se conserva solo el media_id
  if (b64.length > 900000) throw new Error('comprobante demasiado grande (' + buf.length + ' bytes)');
  return { mime: meta.mime_type || 'image/jpeg', b64, bytes: buf.length };
}

// ---------- constructores de mensajes WhatsApp ----------
function msjTexto(to, body) {
  return { messaging_product: 'whatsapp', to, type: 'text', text: { body } };
}
function msjImagen(to, link, caption) {
  const img = { link };
  if (caption) img.caption = String(caption).slice(0, 1024);
  return { messaging_product: 'whatsapp', to, type: 'image', image: img };
}
// [E1] reenviar una imagen RECIBIDA usando su media_id: la Graph API acepta
// {id} además de {link}, así el 320 recibe la foto tal cual el cliente la
// mandó SIN descargarla a memoria (RAM 1 GB en la VM).
function msjImagenId(to, mediaId, caption) {
  const img = { id: String(mediaId) };
  if (caption) img.caption = String(caption).slice(0, 1024);
  return { messaging_product: 'whatsapp', to, type: 'image', image: img };
}
// [CATALOGO-WEB] el único mensaje de catálogo cuando BOT_CATALOGO_WEB está ON:
// texto cálido + link de la web (sin fotos ni lista). El texto vive en textos.js.
function msjCatalogoWeb(to) {
  return msjTexto(to, T(TEXTOS.catalogoWebLink, { url: TEXTOS.catalogoWebUrl }));
}
// URL pública de la foto principal de una referencia, o null si no hay
// (solo ids "pNNN" existen como archivo en la web; los "f..." de la app no).
function fotoUrlDe(p) {
  const fid = (Array.isArray(p.fotos) && p.fotos[0]) || '';
  return /^p\d{1,4}$/.test(fid) ? FOTOS_URL_BASE + fid + '.jpg' : null;
}
// Qué se muestra junto a la ref en captions y listas: la marca si Cristhian
// ya la registró; si no, la categoría. NUNCA se adivina la marca.
function detalleDe(p) {
  const m = (p.marca || '').trim();
  if (m) return m.charAt(0).toUpperCase() + m.slice(1);
  return CAT_LABEL[p.cat] || p.cat || '';
}
// info completa de una referencia para la ficha y las filas de la lista: marca
// (si está) + categoría + tag ("Nuevo"/"Popular"), sin repetir ni dejar
// separadores sueltos. Ej: "Adidas EQT beige · Deportivas · Nuevo".
function infoRef(p) {
  const m = (p.marca || '').trim();
  const marca = m ? (m.charAt(0).toUpperCase() + m.slice(1)) : '';
  const cat = CAT_LABEL[p.cat] || p.cat || '';
  const tag = (p.tag || '').trim();
  return [marca || cat, marca ? cat : '', tag].filter(Boolean).join(' · ');
}
function normMarca(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}
// corrección determinista de marcas mal escritas (B2): mapea errores comunes a la
// marca canónica del catálogo. NO adivina — solo typos conocidos; lo desconocido
// pasa igual. Se aplica DESPUÉS de normMarca. La usa el clasificador tras el flag.
const MARCAS_CANON = {
  adidas: ['addidas', 'adiddas', 'adidaas', 'adias', 'addidad', 'adidass'],
  nike: ['naik', 'naiki', 'naike', 'nyke', 'naikie', 'nikee'],
  jordan: ['jordans', 'yordan', 'jordam', 'jordann'],
  'new balance': ['newbalance', 'niu balance', 'nuevo balance', 'niubalance'],
  puma: ['pumma'],
  reebok: ['rebok', 'rebook', 'ribok', 'reevok'],
  converse: ['convers', 'conver', 'conberse'],
  vans: ['vanz'],
  'under armour': ['under armor', 'andar armour', 'underarmour'],
  fila: ['filla']
};
const MARCA_FIX = (() => {
  const m = {};
  for (const canon in MARCAS_CANON) {
    m[canon] = canon; // el canónico se mapea a sí mismo
    for (const bad of MARCAS_CANON[canon]) m[bad] = canon;
  }
  return m;
})();
function corregirMarca(m) {
  const s = String(m || '').trim();
  return MARCA_FIX[s] || s;
}
// ---------- catálogo con fotos: tanda de imágenes + lista para elegir ----------
// items = referencias ya filtradas (categoría o marca). offset = desde dónde.
// Devuelve los mensajes: intro, imágenes (máx TANDA_FOTOS), fallback en texto
// para refs sin foto pública y una lista interactiva para elegir (+ "Ver más").
// masId = id de la fila "Ver más" (ej. 'cat:deportivas:5'); se arma afuera
// porque el formato depende de si es categoría o marca.
function tandaCatalogo(to, items, offset, intro, masIdBase) {
  const msgs = [];
  // [CATALOGO-WEB] flag ON: el catálogo no se manda por WhatsApp — solo el
  // link de la web, en UN mensaje (sin fotos, sin fallback, sin lista).
  if (FLAG_CATALOGO_WEB) { msgs.push(msjCatalogoWeb(to)); return msgs; }
  const tanda = items.slice(offset, offset + TANDA_ACTIVA);
  if (!tanda.length) return msgs;
  const sinFoto = [];
  const fotos = [];
  for (const p of tanda) {
    const url = fotoUrlDe(p);
    const caption = T(TEXTOS.fotoCaption, { ref: p.ref, detalle: detalleDe(p), precio: fmtPrecio(p.precio) });
    if (url) fotos.push(msjImagen(to, url, caption));
    else sinFoto.push(T(TEXTOS.fotoFallbackLinea, { ref: p.ref, detalle: detalleDe(p), precio: fmtPrecio(p.precio) }));
  }
  if (FLAG_FLUIDEZ_CATALOGO) {
    // [F-CATALOGO] menos burbujas de golpe (fluidez F1): sin burbuja de intro
    // ni bloque de fallback aparte — TODO el texto vive en el body de la ÚNICA
    // lista. Resultado: máx 3 fotos + 1 lista (vs hasta 8 burbujas de hoy).
    for (const m of fotos) msgs.push(m);
    const cuerpo = intro
      + (sinFoto.length ? '\n' + sinFoto.join('\n') : '')
      + '\n\n' + T(TEXTOS.eligeListaBody, { boton: TEXTOS.eligeListaBoton });
    msgs.push(listaElegir(to, items, offset, masIdBase, cuerpo));
    return msgs;
  }
  // flag OFF: la tanda de hoy, idéntica (intro + fotos + fallback + lista)
  msgs.push(msjTexto(to, intro));
  for (const m of fotos) msgs.push(m);
  if (sinFoto.length) {
    msgs.push(msjTexto(to, TEXTOS.fotoFallbackIntro + '\n\n' + sinFoto.join('\n')));
  }
  msgs.push(listaElegir(to, items, offset, masIdBase));
  return msgs;
}
// lista interactiva "Elige tu referencia" (ref:NN + fila "Ver más"). Extraída de
// tandaCatalogo para reusarla también con el catálogo nativo (MPM). Idéntica a v5.
function listaElegir(to, items, offset, masIdBase, bodyTexto) {
  const tanda = items.slice(offset, offset + TANDA_ACTIVA);
  const quedan = items.length - (offset + tanda.length);
  const rows = tanda.map((p) => ({
    id: 'ref:' + p.ref,
    title: T(TEXTOS.modelosFilaTitulo, { ref: p.ref }),
    // info por fila (v6): precio + marca/categoría + tag (recortado a 72)
    description: (fmtPrecio(p.precio) + '  ·  ' + infoRef(p)).slice(0, 72)
  }));
  if (quedan > 0) {
    rows.push({ id: masIdBase + ':' + (offset + tanda.length), title: TEXTOS.verMasFila, description: T(TEXTOS.verMasFilaDesc, { n: quedan }) });
  }
  return { messaging_product: 'whatsapp', to, type: 'interactive', interactive: {
    type: 'list',
    header: { type: 'text', text: TEXTOS.eligeListaHeader },
    // bodyTexto (opcional, fluidez F1): body compacto con el intro adentro
    body: { text: (bodyTexto || T(TEXTOS.eligeListaBody, { boton: TEXTOS.eligeListaBoton })).slice(0, 1024) },
    footer: { text: TEXTOS.eligeListaFooter },
    action: { button: TEXTOS.eligeListaBoton, sections: [{ title: TEXTOS.eligeListaSeccion, rows }] }
  }};
}
// ---------- catálogo nativo de WhatsApp (v6, flag CATALOGO_NATIVO) ----------
// "Encendido" solo si CATALOGO_NATIVO=on Y hay WHATSAPP_CATALOG_ID (el catálogo
// creado en Commerce Manager sobre la WABA). Enviar mensajes de catálogo exige
// el número alcanzable/Live, por eso va detrás de flag; sin él, el bot responde
// con el catálogo de FOTOS de la v5 (idéntico).
function catalogoNativoOn() {
  return /^(on|1|true|si|s[ií])$/i.test(String($env.CATALOGO_NATIVO || '').trim())
    && !!String($env.WHATSAPP_CATALOG_ID || '').trim();
}
// Multi-Product Message: tarjetas nativas de producto. product_retailer_id = la
// ref (mismo SKU del feed). Máx 30 productos por mensaje.
function mpmCategoria(to, catLabel, items) {
  const cl = String(catLabel);
  const product_items = items.slice(0, 30).map((p) => ({ product_retailer_id: String(p.ref) }));
  return { messaging_product: 'whatsapp', to, type: 'interactive', interactive: {
    type: 'product_list',
    header: { type: 'text', text: TEXTOS.mpmHeader },
    body: { text: T(TEXTOS.mpmBody, { categoria: cl.toLowerCase() }).slice(0, 1024) },
    footer: { text: TEXTOS.mpmFooter },
    action: { catalog_id: String($env.WHATSAPP_CATALOG_ID), sections: [{ title: cl.slice(0, 24), product_items }] }
  }};
}
function listaCategorias(to, catalogo, bodyTexto) {
  // [CATALOGO-WEB] flag ON: en vez de la lista de categorías (bienvenida,
  // comprar, fallback…) va el mensaje único con el link de la web.
  if (FLAG_CATALOGO_WEB) return msjCatalogoWeb(to);
  const counts = {};
  for (const p of catalogo) counts[p.cat] = (counts[p.cat] || 0) + 1;
  const rows = CAT_ORDER.filter((c) => counts[c]).map((c) => ({
    id: 'cat:' + c, title: CAT_LABEL[c], description: T(TEXTOS.categoriasFilaDesc, { n: counts[c] })
  }));
  return { messaging_product: 'whatsapp', to, type: 'interactive', interactive: {
    type: 'list',
    header: { type: 'text', text: TEXTOS.categoriasHeader },
    body: { text: (bodyTexto || TEXTOS.categoriasBody).slice(0, 1024) },
    footer: { text: TEXTOS.categoriasFooter },
    action: { button: TEXTOS.categoriasBoton, sections: [{ title: TEXTOS.categoriasSeccion, rows }] }
  }};
}
// (v5) la lista de modelos por categoría fue reemplazada por tandaCatalogo:
// fotos + lista para elegir. Los ids 'ref:NN' se conservan idénticos.
// Wompi (v6) está "encendido" solo si hay llaves pública y privada en el .env.
// Sin ellas, el método Wompi no se ofrece y el pago se comporta EXACTO como v5.
function wompiConfigurado() {
  return !!(String($env.WOMPI_PUB_KEY || '').trim() && String($env.WOMPI_PRV_KEY || '').trim());
}
// Contra entrega solo en Bogotá: se detecta en los datos de envío del cliente.
function esBogota(datosEnvio) { return /bogot/i.test(String(datosEnvio || '')); }
function botonesPago(to, total, conContraentrega, bodyTexto) {
  // Métodos base (v5): Nequi/Daviplata/Bre-B. Se suman Wompi (si hay llaves) y
  // Contra entrega (si el cliente es de Bogotá). Con >3 opciones → lista
  // interactiva (los botones de WhatsApp solo permiten 3); con 3 → botones v5.
  const rows = [
    { id: 'pay:nequi', title: 'Nequi', description: TEXTOS.pagoNequiDesc },
    { id: 'pay:daviplata', title: 'Daviplata', description: TEXTOS.pagoDaviplataDesc },
    { id: 'pay:breb', title: 'Bre-B', description: TEXTOS.pagoBrebDesc }
  ];
  if (wompiConfigurado()) rows.push({ id: 'pay:wompi', title: TEXTOS.pagoWompiTitulo, description: TEXTOS.pagoWompiDesc });
  if (conContraentrega) rows.push({ id: 'pay:contraentrega', title: TEXTOS.pagoContraentregaTitulo, description: TEXTOS.pagoContraentregaDesc });
  if (rows.length > 3) {
    return { messaging_product: 'whatsapp', to, type: 'interactive', interactive: {
      type: 'list',
      header: { type: 'text', text: TEXTOS.pagoHeader },
      body: { text: (bodyTexto || T(TEXTOS.pagoBody, { total: fmtPrecio(total) })).slice(0, 1024) },
      footer: { text: TEXTOS.pagoFooter },
      action: { button: TEXTOS.pagoBoton, sections: [{ title: TEXTOS.pagoSeccion, rows }] }
    }};
  }
  return { messaging_product: 'whatsapp', to, type: 'interactive', interactive: {
    type: 'button',
    body: { text: bodyTexto || T(TEXTOS.pagoBody, { total: fmtPrecio(total) }) },
    action: { buttons: rows.map((r) => ({ type: 'reply', reply: { id: r.id, title: r.title } })) }
  }};
}
const PAGOS = {
  nequi: { nombre: 'Nequi', dato: () => $env.PAGO_NEQUI, qr: () => $env.PAGO_QR_NEQUI },
  daviplata: { nombre: 'Daviplata', dato: () => $env.PAGO_DAVIPLATA, qr: () => $env.PAGO_QR_DAVIPLATA },
  breb: { nombre: 'Bre-B', dato: () => $env.PAGO_BREB, qr: () => $env.PAGO_QR_BREB }
};
// Mensajes al elegir método de pago. Si hay QR configurado (PAGO_QR_* con URL
// https) van 3 mensajes: imagen del QR + SOLO el dato (para copiar con un
// toque) + total/comprobante. Sin QR: el texto único de siempre — el flujo de
// pago NUNCA se rompe por una variable que falte.
function instruccionesPago(to, met, total, plantillaTexto) {
  const qr = (met.qr && met.qr()) || '';
  if (/^https:\/\//.test(qr)) {
    return [
      msjImagen(to, qr, T(TEXTOS.pagoQrCaption, { metodo: met.nombre })),
      msjTexto(to, T(TEXTOS.pagoQrDatoIntro, { metodo: met.nombre })),
      msjTexto(to, String(met.dato() || '')),
      msjTexto(to, T(TEXTOS.pagoQrCierre, { total: fmtPrecio(total) }))
    ];
  }
  return [msjTexto(to, T(plantillaTexto, { metodo: met.nombre, dato: met.dato(), total: fmtPrecio(total) }))];
}

// ---------- flujo principal ----------
const parsed = $('Parsear mensaje').item.json;
const catalogo = parseCatalogo($json);
const to = parsed.wa_id;
const sel = (parsed.inter_id || '').trim();
const texto = (parsed.texto || '').trim();
const dueno = String($env.OWNER_WHATSAPP || '').replace(/\D/g, '');
const esDueno = !!dueno && to === dueno;
const mensajes = [];
let tok = null;
let ses = null;
// atribución de pauta: viene del referral ctwa (Parsear mensaje) solo en el
// PRIMER mensaje del anuncio; se conserva en la sesión hasta llegar al pedido
let fuente = String(parsed.fuente || '');

// ---------- robustez conversacional (v6, flag BOT_ROBUSTEZ) ----------
// Enruta el texto libre por Gemini INCLUSO cuando el bot ya está esperando un
// dato (talla, envío, pago, comprobante), para: (1) handoff a humano en
// cualquier momento sin frase exacta, (2) responder preguntas EXTRA que el
// cliente meta junto al dato, (3) guiar cuando el dato es incorrecto/fuera de
// lugar. Si el flag no está o Gemini falla/timeout => devuelve null y el estado
// se comporta EXACTO como en v5 (fallback seguro, nada nuevo se activa solo).
const FLAG_ROBUSTEZ = /^(on|1|true|si|s[ií])$/i.test(String($env.BOT_ROBUSTEZ || '').trim());
// clasificador v2 (B1): prompt con ejemplos few-shot del BANCO. Apagado por
// defecto para poder comparar; con el flag OFF el clasificador usa el prompt v1
// EXACTO de hoy (mismo comportamiento).
const FLAG_CLASIF_V2 = /^(on|1|true|si|s[ií])$/i.test(String($env.BOT_CLASIF_V2 || '').trim());
// dispatch v2 (B3): caminos útiles explícitos para pregunta_precio/ver_catalogo/
// saludo, sin caer al else ciego. Apagado por defecto: con OFF el dispatch = hoy.
const FLAG_DISPATCH_V2 = /^(on|1|true|si|s[ií])$/i.test(String($env.BOT_DISPATCH_V2 || '').trim());
// normalización de marca (B2): corrige typos comunes ("addidas"→adidas) para que
// el match del catálogo funcione. Apagado por defecto: con OFF = solo normMarca (hoy).
const FLAG_MARCA_NORM = /^(on|1|true|si|s[ií])$/i.test(String($env.BOT_MARCA_NORM || '').trim());
// validación de datos de envío (D3): exige nombre+dirección+ciudad+teléfono (o que
// Gemini lo confirme) y dice qué falta. Apagado por defecto: con OFF = criterio v5.
const FLAG_DATOS_V2 = /^(on|1|true|si|s[ií])$/i.test(String($env.BOT_DATOS_V2 || '').trim());
// foto/insistencia al asesor (E1): si el cliente manda la FOTO de un modelo sin
// pedido en curso, o insiste por una marca sin resultados, se avisa al 320 (la
// foto se reenvía por media_id) y al cliente se le dice que un asesor confirma.
// Apagado por defecto: con OFF la foto y la insistencia se comportan como hoy.
const FLAG_FOTO_ASESOR = /^(on|1|true|si|s[ií])$/i.test(String($env.BOT_FOTO_ASESOR || '').trim());
// conversión de tallas v2 (D1): más expresiones deterministas — plurales de
// género (caballeros/damas/varón/señora), medias tallas US (9.5, "y medio"),
// más formas del sistema (colombianas, gringas, EE.UU.) y pie en CM → talla.
// La matemática SIEMPRE en código, nunca Gemini. Apagado por defecto: OFF = hoy.
const FLAG_TALLAS_V2 = /^(on|1|true|si|s[ií])$/i.test(String($env.BOT_TALLAS_V2 || '').trim());
// fluidez / reconducir (F): cambio de modelo A MITAD de pedido (casos reales
// 1 y 3 de CONVERSACIONES-INCOMODAS) — "quiero la Ref 06" re-arranca el pedido
// en esa ref, y "otro modelo / ver el catálogo" cierra la sesión y muestra el
// catálogo con calidez, en vez de repetir la plantilla del paso en bucle.
// Apagado por defecto: con OFF los pasos se comportan EXACTO como hoy.
const FLAG_FLUIDEZ_RECONDUCE = /^(on|1|true|si|s[ií])$/i.test(String($env.BOT_FLUIDEZ_RECONDUCE || '').trim());
// "otro modelo/referencia/estilo/color" o "ver catálogo" — OJO: sin "otro par"
// (eso suele ser CANTIDAD: un par más del mismo).
const PIDE_OTRO_MODELO = /\botr[oa]s?\s+(modelo|modelos|referencia|referencias|estilo|estilos|color|colores)\b|cambiar\s+de\s+(modelo|referencia)|\bver\s+(?:el\s+)?cat[aá]logo\b|^\s*cat[aá]logo\s*[!.]*\s*$/i;
// fluidez / catálogo (F): menos burbujas de golpe — tanda de 3 fotos (vs 5) y
// UNA sola lista cuyo body lleva el intro y las refs sin foto (sin burbujas de
// intro ni de fallback). Apagado por defecto: con OFF la tanda = hoy exacta.
const FLAG_FLUIDEZ_CATALOGO = /^(on|1|true|si|s[ií])$/i.test(String($env.BOT_FLUIDEZ_CATALOGO || '').trim());
// asistente vendedor v2 (F4): prompt del asistente con reglas de venta (CTA,
// máx 1 gancho), manejo de mensajes incoherentes y few-shot. Misma forma del
// JSON. Solo aplica cuando BOT_ROBUSTEZ está on. Apagado por defecto: OFF = v1.
const FLAG_ASISTENTE_V2 = /^(on|1|true|si|s[ií])$/i.test(String($env.BOT_ASISTENTE_V2 || '').trim());
// acuse datos→pago (F5): el bloque de pago menciona la ciudad detectada
// ("Envío a Cali anotado") — se siente leído, no plantilla. OFF = genérico hoy.
const FLAG_FLUIDEZ_ACUSE = /^(on|1|true|si|s[ií])$/i.test(String($env.BOT_FLUIDEZ_ACUSE || '').trim());
// tamaño efectivo de la tanda/página: 3 con fluidez de catálogo, 5 (hoy) sin ella
const TANDA_ACTIVA = FLAG_FLUIDEZ_CATALOGO ? 3 : TANDA_FOTOS;
// catálogo → link de la WEB (brief BRIEF-CATALOGO-WEB 2026-07-11): el bot NO
// envía catálogo por WhatsApp (mandar fotos satura la VM de 1 GB) — en TODOS
// los puntos donde hoy van fotos/listas de catálogo responde UN solo mensaje
// con el link https://varmancrew.com/#catalogo y el cliente compra en la web.
// El flujo de pedido (ref:NN, "Quiero la Ref NN", talla→datos→pago) NO cambia.
// Apagado por defecto: con OFF el catálogo de fotos de hoy queda EXACTO igual.
const FLAG_CATALOGO_WEB = /^(on|1|true|si|s[ií])$/i.test(String($env.BOT_CATALOGO_WEB || '').trim());
// nombre del modelo en vez de "Ref NN" (pedido del dueño 07-12): los mensajes
// al CLIENTE (pedido recibido, contra entrega, estado, pago confirmado Wompi)
// muestran la MARCA que se registra desde la app; la ref sigue viajando por
// dentro (Firestore, avisos al 320). Apagado por defecto: OFF = "Ref NN" como hoy.
const FLAG_NOMBRE_MODELO = /^(on|1|true|si|s[ií])$/i.test(String($env.BOT_NOMBRE_MODELO || '').trim());
// nombre "bonito" del modelo para mostrar al cliente: la marca de la ref en el
// catálogo, capitalizada. '' si la ref no existe o no tiene marca (→ el texto
// de hoy con la Ref). NUNCA se adivina: solo lo que Cristhian puso en la app.
function modeloDe(ref) {
  if (!FLAG_NOMBRE_MODELO || !ref) return '';
  const p = catalogo.find((x) => x.ref === ref);
  const m = p && String(p.marca || '').trim();
  return m ? m.charAt(0).toUpperCase() + m.slice(1) : '';
}

// ---------- helper único de Gemini (A1: fiabilidad, plomería equivalente) ----------
// Centraliza las DOS llamadas a Gemini (asistir() + clasificador): un solo armado
// de la petición, UN reintento corto SOLO en 429/503 (cupo gratis/sobrecarga),
// parseo JSON tolerante (quita fences ```json```, recorta al primer bloque {...},
// aguanta comas colgantes) y un ÚNICO default de modelo (antes duplicado en 2
// sitios). NUNCA lanza: devuelve el objeto parseado o null — nadie asume que
// Gemini responde. Loguea el fallo en botErrores (mejor esfuerzo). No lleva flag:
// reemplaza plomería SIN cambiar el contenido de los prompts ni la forma del JSON.
const GEMINI_MODEL_DEFAULT = 'gemini-flash-lite-latest';
function parseJsonTolerante(txt) {
  if (txt == null) return null;
  let s = String(txt).trim();
  // 1) quita fences de bloque de código (```json ... ``` o ``` ... ```)
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  // 2) recorta al primer bloque {...} por si viene con texto alrededor
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try { return JSON.parse(s); } catch (e) {}
  // 3) segundo intento: quita comas colgantes antes de } o ]
  try { return JSON.parse(s.replace(/,\s*([}\]])/g, '$1')); } catch (e) {}
  return null;
}
async function llamarGemini(systemPrompt, userText, opts) {
  opts = opts || {};
  const origen = opts.origen || 'gemini';
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/'
    + ($env.GEMINI_MODEL || GEMINI_MODEL_DEFAULT) + ':generateContent';
  const pedir = () => H.httpRequest({
    method: 'POST', url,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': $env.GEMINI_API_KEY },
    body: {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: String(userText || '') }] }],
      generationConfig: {
        temperature: typeof opts.temperature === 'number' ? opts.temperature : 0.3,
        maxOutputTokens: opts.maxOutputTokens || 200,
        responseMimeType: 'application/json'
      }
    },
    json: true, timeout: opts.timeout || 15000
  });
  let r;
  try {
    r = await pedir();
  } catch (e) {
    // 1 reintento SOLO en sobrecarga/cupo (429/503); otros errores no se reintentan
    const st = (e && (e.status || e.statusCode)) || 0;
    const sobrecarga = st === 429 || st === 503 || /\b(429|503)\b/.test(String((e && e.message) || ''));
    if (sobrecarga) {
      await new Promise((res) => setTimeout(res, 700)); // backoff corto
      try { r = await pedir(); }
      catch (e2) { await logError(tok, origen, e2, { wa_id: to, contexto: 'reintento 429/503' }); return null; }
    } else {
      await logError(tok, origen, e, { wa_id: to, contexto: 'sin reintento' });
      return null;
    }
  }
  let txt;
  try { txt = r.candidates[0].content.parts[0].text; }
  catch (e) { await logError(tok, origen, e, { wa_id: to, contexto: 'respuesta sin candidates' }); return null; }
  const obj = parseJsonTolerante(txt);
  if (obj == null) await logError(tok, origen, new Error('JSON no parseable'), { wa_id: to, contexto: String(txt || '').slice(0, 120) });
  return obj;
}
async function asistir(pasoDesc) {
  if (!FLAG_ROBUSTEZ || !texto) return null;
  const out = await llamarGemini(FLAG_ASISTENTE_V2 ? GEMINI_ASISTENTE_V2 : GEMINI_ASISTENTE,
    'Paso actual: ' + pasoDesc + '\nMensaje del cliente: ' + texto.slice(0, 500),
    { temperature: 0.2, maxOutputTokens: 220, timeout: 12000, origen: 'gemini-asistente' });
  if (!out) return null;
  return {
    handoff: out.handoff === true || /^(s[ií]|true|1)$/i.test(String(out.handoff || '')),
    dato: String(out.dato || '').trim(),
    respuesta: String(out.respuesta || '').trim()
  };
}
// handoff inmediato: avisa al cliente y al dueño (mismos textos que el flujo
// libre). No borra la sesión: el humano puede retomar el pedido en curso.
function hacerHandoff() {
  mensajes.push(msjTexto(to, TEXTOS.handoffCliente));
  if (dueno && dueno !== to) {
    mensajes.push(msjTexto(dueno, T(TEXTOS.handoffAvisoDueno, { cliente: parsed.nombre || '(sin nombre)', wa: to, texto })));
  }
}

// ---------- anti-spam: máx MSGS_POR_MIN mensajes/minuto por número ----------
// Protege el cupo gratis de Gemini (1500 req/día). Contador por minuto en
// tiendas/varman/botRate/{wa} (docs mínimos; el barrido diario los borra).
// true = frenar este mensaje. Mejor esfuerzo: si Firestore falla, no frena.
async function pasadoDeMensajes() {
  try {
    const RATE_PATH = 'tiendas/varman/botRate/' + to;
    const minuto = Math.floor(Date.now() / 60000);
    const r = await fsGet(tok, RATE_PATH);
    const n = (r && r.minuto === minuto) ? (r.n || 0) + 1 : 1;
    await fsSet(tok, RATE_PATH, { minuto, n, updatedAt: new Date().toISOString() });
    if (n === MSGS_POR_MIN + 1) {
      mensajes.push(msjTexto(to, TEXTOS.antiSpamAviso)); // se avisa UNA vez
      return true;
    }
    return n > MSGS_POR_MIN; // del aviso en adelante: silencio hasta el otro minuto
  } catch (e) { return false; }
}

async function modoAdmin(cmd) {
  if (cmd === 'pedidos') {
    const PENDIENTES = ['nuevo', 'pagado_por_verificar', 'pagado (por verificar)', 'pago_pendiente'];
    const todos = await fsUltimosPedidos(tok, 30);
    const pend = todos.filter((p) => PENDIENTES.indexOf(p.estado) >= 0).slice(0, 5);
    if (!pend.length) {
      mensajes.push(msjTexto(to, TEXTOS.adminSinPendientes));
      return;
    }
    const lineas = pend.map((p, i) =>
      (i + 1) + '. *Ref ' + p.ref + '* · Talla ' + (p.talla || '?') + ' · ' + fmtPrecio(p.total) +
      ' · ' + (p.metodo_pago || '?') + '\n   ' + (p.cliente_nombre || '(sin nombre)') + ' · +' + (p.cliente_wa || '?') +
      ' · ' + fechaCorta(p.creado) + '\n   Estado: ' + p.estado +
      (p.comprobante_guardado ? ' · 📎 comprobante guardado' : ''));
    mensajes.push(msjTexto(to, T(TEXTOS.adminListaTitulo, { n: pend.length, lineas: lineas.join('\n\n') })));
  } else if (cmd === 'pausar') {
    await fsSet(tok, CFG_PATH, { pausado: true, actualizado: new Date().toISOString(), por: 'admin-320' });
    mensajes.push(msjTexto(to, TEXTOS.adminPausado));
  } else if (cmd === 'activar') {
    await fsSet(tok, CFG_PATH, { pausado: false, actualizado: new Date().toISOString(), por: 'admin-320' });
    mensajes.push(msjTexto(to, TEXTOS.adminActivo));
  } else { // 'admin'
    mensajes.push(msjTexto(to, TEXTOS.adminAyuda));
  }
}

async function principal() {
  tok = await tokenAdmin();

  // ---- dedup: ignora reintentos del webhook de Meta (evita respuestas dobles)
  if (await yaProcesado(parsed.message_id)) return;

  // ---- comandos admin del dueño (solo palabras exactas; el resto fluye
  //      como cliente para poder probar el bot desde el 320)
  const cmd = texto.toLowerCase();
  if (esDueno && /^(pedidos|pausar|activar|admin)$/.test(cmd)) {
    await modoAdmin(cmd);
    return;
  }

  // ---- anti-spam (el dueño está exento para poder probar tranquilo)
  if (!esDueno && await pasadoDeMensajes()) return;

  // ---- pausa global (mantenimiento)
  if (!esDueno) {
    const cfg = await fsGet(tok, CFG_PATH);
    if (cfg && cfg.pausado === true) {
      mensajes.push(msjTexto(to, TEXTOS.botPausado));
      return;
    }
  }

  // ---- handoff a asesor SIEMPRE disponible (determinista, sin Gemini) ----
  // Si el cliente pide claramente una persona/asesor en CUALQUIER momento, se
  // hace handoff de una (no depende del flag ni del cupo de Gemini).
  if (texto && PIDE_HUMANO.test(texto)) { hacerHandoff(); return; }

  // ---- notificaciones pendientes para ESTE cliente (backlog 11-12) ----
  // La app deja avisos en tiendas/varman/notificacionesPendientes (reseña al
  // pasar a entregado, guía de envío al guardarla). El trigger horario los
  // manda si la ventana de 24h está abierta; si no alcanzó, se entregan aquí
  // apenas el cliente vuelva a escribir (la ventana se reabre con su mensaje).
  try {
    const pend = (await fsUltimos(tok, 'notificacionesPendientes', 'creado', 30))
      .filter((x) => String(x.cliente_wa || '') === to && x.estado === 'pendiente');
    for (const x of pend) {
      const m = mensajeDeNotificacion(to, x);
      // se marca ANTES de encolar para no duplicar con el trigger horario
      const estadoNuevo = m ? 'enviada' : (x.tipo === 'resena' ? 'omitida_sin_link' : 'omitida');
      await fsMerge(tok, 'tiendas/varman/notificacionesPendientes/' + x._id,
        { estado: estadoNuevo, actualizado: new Date().toISOString() });
      if (m) mensajes.push(m);
    }
  } catch (e) { /* mejor esfuerzo: nunca frena el flujo normal */ }

  const SES_PATH = 'tiendas/varman/botSesiones/' + to;
  ses = await fsGet(tok, SES_PATH);
  // sesion vieja (>24h) = sesion muerta
  if (ses && ses.updatedAt && (Date.now() - Date.parse(ses.updatedAt)) > 24 * 3600 * 1000) {
    await fsDel(tok, SES_PATH);
    ses = null;
  }
  // la fuente del anuncio sobrevive en la sesión aunque el cliente navegue
  if (!fuente && ses && ses.fuente) fuente = String(ses.fuente);
  // [F-MEDIA] nota de voz / video / sticker (flag BOT_FLUIDEZ_RECONDUCE): el
  // bot no puede escucharlos y hoy responde el catálogo o la plantilla del
  // paso como si nada. Respuesta humana única pidiendo el mensaje por TEXTO;
  // la sesión no se toca (el cliente sigue donde iba). Los 'document' NO se
  // interceptan (un PDF en comprobante debe seguir su flujo de hoy).
  if (FLAG_FLUIDEZ_RECONDUCE && ['audio', 'voice', 'video', 'sticker'].indexOf(String(parsed.tipo || '')) >= 0) {
    mensajes.push(msjTexto(to, TEXTOS.mediaNoSoportado));
    return;
  }
  // [F-RECONDUCE] cambio de modelo A MITAD de pedido (flag BOT_FLUIDEZ_RECONDUCE;
  // casos reales 1 y 3): hoy "Quiero la Ref 06" o "quiero otro modelo" en pleno
  // paso talla/datos/pago caen a la plantilla del paso repetida en bucle.
  //  - ref directa → re-arranca el pedido en ESA ref (ficha + talla, como si
  //    llegara de la web); arrancarPedido pisa la sesión vieja.
  //  - "otro modelo / ver el catálogo" → cierra la sesión y muestra el catálogo
  //    con calidez (elegir de la lista arranca el pedido nuevo).
  // Solo en talla/datos/pago — en comprobante pudo ya haber pagado. Solo texto
  // libre (!sel): las selecciones interactivas no se tocan.
  if (FLAG_FLUIDEZ_RECONDUCE && texto && !sel && ses && ['talla', 'datos', 'pago'].indexOf(ses.estado) >= 0) {
    const suenaEspera = /avis|cuando\s+(llegue|haya|vuelva|entre|tengan)/i.test(texto);
    const mRefCambio = suenaEspera ? null : texto.match(/\bref(?:erencia)?\.?\s*#?\s*(\d{1,3})\b/i);
    const pCambio = mRefCambio ? catalogo.find((x) => x.ref === mRefCambio[1].padStart(2, '0')) : null;
    if (pCambio) {
      await arrancarPedido(pCambio, TEXTOS.cambioRefIntro);
      return;
    }
    if (!mRefCambio && PIDE_OTRO_MODELO.test(texto)) {
      await fsDel(tok, SES_PATH);
      mensajes.push(listaCategorias(to, catalogo, TEXTOS.cambioModeloIntro));
      return;
    }
    // [F-RECONDUCE] "puedo llevar 2" SIN la palabra "pares" (caso real 3): es
    // ambiguo (¿cantidad?), así que se CONFIRMA con el gancho del 15% por 2
    // pares (BANCO §8) guiando al formato "2 pares" que el bot ya entiende.
    // No se fija nada ni se pierde el paso. Con "pares" explícito lo maneja el
    // bloque de cantidad de siempre; con un número de talla no se intercepta.
    if (!mRefCambio && !/\b(?:par|pares|unidades)\b/i.test(texto) && !/\b(3[5-9]|4[0-5])\b/.test(texto)
        && /\b(?:llev(?:o|ar|arme|ar[ií]a)|quiero|ser[ií]an?|dame)\s+(?:las?\s+|los\s+|otr[oa]s?\s+)?([2-9]|dos|tres|cuatro|cinco|seis)\b/i.test(texto)) {
      mensajes.push(msjTexto(to, TEXTOS.cantidadPregunta));
      return;
    }
    // [F-RECONDUCE] pregunta por una MARCA a mitad de pedido ("¿tienen nike?"):
    // muestra lo de esa marca en vez de la plantilla del paso (elegir de la
    // lista re-arranca el pedido). Guardas: debe sonar a pregunta/browse, sin
    // número de talla en el mensaje (para no secuestrar "las nike en 40"), y
    // la marca debe existir tal cual en el catálogo (no adivina).
    if (!mRefCambio && !suenaEspera && !/\b(3[5-9]|4[0-5])\b/.test(texto)
        && (/[?¿]/.test(texto) || /\b(tienen|tienes|hay|mu[eé]stra\w*|ver)\b/i.test(texto))) {
      const tNorm = normTxtG(texto);
      const marcasCat = [];
      for (const p of catalogo) {
        const mc = normMarca(p.marca);
        if (mc && marcasCat.indexOf(mc) < 0) marcasCat.push(mc);
      }
      const marcaMid = marcasCat.find((mc) => new RegExp('\\b' + mc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(tNorm));
      if (marcaMid) {
        const itemsMid = catalogo.filter((p) => normMarca(p.marca).includes(marcaMid));
        if (itemsMid.length) {
          await fsDel(tok, SES_PATH);
          const nM = Math.min(TANDA_ACTIVA, itemsMid.length);
          const introM = itemsMid.length > TANDA_ACTIVA
            ? T(TEXTOS.fotosIntroMarca, { marca: marcaMid, n: nM, total: itemsMid.length })
            : T(TEXTOS.fotosIntroMarcaTodos, { marca: marcaMid });
          mostrarTanda(itemsMid, 0, introM, 'marca:' + marcaMid);
          return;
        }
      }
    }
  }
  // cantidad a MITAD DE FLUJO: si ya hay pedido en curso y el cliente dice
  // "mejor 2 pares" / "quiero dos pares", se actualiza la cantidad y el total
  // (antes solo se tomaba al arrancar el pedido → "quiero 2" a mitad se perdía).
  if (ses && ses.estado && ses.precio) {
    const cantNueva = parseCantidad(texto);
    if (cantNueva > 1 && cantNueva !== (ses.cantidad || 1)) {
      ses.cantidad = cantNueva;
      try { await fsMerge(tok, SES_PATH, { cantidad: cantNueva, updatedAt: new Date().toISOString() }); } catch (e) {}
      mensajes.push(msjTexto(to, T(TEXTOS.cantidadNota, { cantidad: cantNueva, total: fmtPrecio((ses.precio || 0) * cantNueva) })));
    }
  }
  async function guardarSes(obj) {
    const extra = { updatedAt: new Date().toISOString() };
    if (fuente) extra.fuente = fuente;
    const doc = Object.assign({}, obj, extra);
    // [F-REPITE] cualquier guardado del flujo (capturó un dato / avanzó de
    // paso) resetea la racha de repetición: las ramas pasan Object.assign({},
    // ses, ...) y arrastrarían el contador viejo al doc nuevo. Sin el flag
    // estos campos nunca existen (delete = no-op).
    delete doc.repEstado;
    delete doc.repN;
    await fsSet(tok, SES_PATH, doc);
  }
  // si llegó del anuncio pero aún no hay pedido en curso, la fuente se guarda
  // sola en la sesión (sin estado) para no perderla mientras mira el catálogo
  async function recordarFuente() {
    if (!fuente) return;
    try { await fsMerge(tok, SES_PATH, { fuente, updatedAt: new Date().toISOString() }); } catch (e) {}
  }
  // muestra una tanda del catálogo (categoría o marca) y recuerda la fuente
  function mostrarTanda(items, offset, intro, masIdBase) {
    for (const m of tandaCatalogo(to, items, offset, intro, masIdBase)) mensajes.push(m);
  }
  // [F-REPITE] anti-repetición (fluidez, bajo BOT_FLUIDEZ_RECONDUCE): si el
  // paso va a repetir su MISMA plantilla de "no entendí", desde la 2ª vez
  // SEGUIDA manda una variante breve con salidas (catálogo/asesor) en vez del
  // mismo muro (caso real 3: la plantilla de talla salió 4 veces idéntica).
  // El contador vive en la sesión (repEstado/repN) y se limpia solo al avanzar
  // de paso (guardarSes pisa el doc completo). Flag OFF: la plantilla de hoy.
  async function pushReask(paso, msgCompleto, msgBreve) {
    if (!FLAG_FLUIDEZ_RECONDUCE) { mensajes.push(msgCompleto); return; }
    const n = (ses && ses.repEstado === paso) ? (Number(ses.repN) || 1) + 1 : 1;
    try { await fsMerge(tok, SES_PATH, { repEstado: paso, repN: n, updatedAt: new Date().toISOString() }); } catch (e) {}
    mensajes.push(n >= 2 ? msgBreve : msgCompleto);
  }
  // arranca el pedido en una referencia. Sirve igual al ELEGIR de la lista o al
  // LLEGAR con la ref prellenada (web/anuncios). Manda la ficha (foto grande +
  // info completa en un solo mensaje) y luego pide la talla → venta fluida.
  async function arrancarPedido(p, introExtra) {
    const cantidad = parseCantidad(texto); // "quiero dos pares de la ref 05"
    // si el cliente YA dijo la talla en el mismo mensaje ("la ref 05 en talla 42"),
    // la tomamos y saltamos directo a datos (más fluido). Exigimos la palabra
    // talla/numero/calzo/uso para NO confundirla con el número de la referencia.
    const tallaM = texto.match(/\b(?:talla|numero|número|calzo|uso)\s*(?:la\s*)?(3[5-9]|4[0-5])\b/i);
    await guardarSes(Object.assign(
      { ref: p.ref, precio: p.precio, cantidad, nombrePerfil: parsed.nombre || '' },
      tallaM ? { estado: 'datos', talla: tallaM[1] } : { estado: 'talla' }
    ));
    const ficha = T(TEXTOS.fichaCaption, { ref: p.ref, info: infoRef(p), precio: fmtPrecio(p.precio) });
    const url = fotoUrlDe(p);
    if (FLAG_FLUIDEZ_CATALOGO) {
      // [F-UNTURNO] arranque del pedido en UNA burbuja (fluidez F5 del brief):
      // intro + ficha + la pregunta de la talla van JUNTAS en el caption de la
      // foto (o en un solo texto si la ref no tiene foto pública). Si la talla
      // ya venía en el mensaje, la confirmación va aparte (2 burbujas máx).
      const caption = [introExtra, ficha, tallaM ? '' : TEXTOS.pedirTallaCorta].filter(Boolean).join('\n\n');
      if (url) mensajes.push(msjImagen(to, url, caption));
      else mensajes.push(msjTexto(to, caption));
      if (cantidad > 1) mensajes.push(msjTexto(to, T(TEXTOS.cantidadNota, { cantidad, total: fmtPrecio(p.precio * cantidad) })));
      if (tallaM) mensajes.push(msjTexto(to, T(TEXTOS.tallaAnotada, { talla: tallaM[1] })));
      return;
    }
    if (introExtra) mensajes.push(msjTexto(to, introExtra));
    if (url) mensajes.push(msjImagen(to, url, ficha));      // foto tamaño normal + info
    else mensajes.push(msjTexto(to, ficha));                // sin foto pública: la info como texto
    if (cantidad > 1) mensajes.push(msjTexto(to, T(TEXTOS.cantidadNota, { cantidad, total: fmtPrecio(p.precio * cantidad) })));
    if (tallaM) mensajes.push(msjTexto(to, T(TEXTOS.tallaAnotada, { talla: tallaM[1] })));
    else mensajes.push(msjTexto(to, TEXTOS.pedirTalla));
  }
  // ---- Wompi (v6): link de pago automático (solo si hay llaves) ----
  // Crea un "Link de pago" (API Wompi, Bearer llave privada). El pago lo
  // confirma solo el webhook (nodo aparte) marcando el pedido pago_confirmado.
  async function crearLinkWompi(s) {
    const base = String($env.WOMPI_ENV || 'test').toLowerCase() === 'prod'
      ? 'https://production.wompi.co/v1' : 'https://sandbox.wompi.co/v1';
    const r = await con1Reintento(() => H.httpRequest({
      method: 'POST', url: base + '/payment_links',
      headers: { Authorization: 'Bearer ' + $env.WOMPI_PRV_KEY, 'Content-Type': 'application/json' },
      body: {
        name: T(TEXTOS.wompiLinkNombre, { ref: s.ref }),
        description: T(TEXTOS.wompiLinkDesc, { ref: s.ref, talla: s.talla || '' }),
        single_use: true,
        collect_shipping: false,
        currency: 'COP',
        amount_in_cents: Math.round(totalSes(s)) * 100
      },
      json: true, timeout: 15000
    }));
    const id = r && r.data && r.data.id;
    if (!id) throw new Error('Wompi no devolvió id de link');
    return { id, url: 'https://checkout.wompi.co/l/' + id };
  }
  async function pagarConWompi(s) {
    let link;
    try {
      link = await crearLinkWompi(s);
    } catch (e) {
      // fallback seguro: nunca dejar al cliente sin salida → otros métodos
      await logError(tok, 'wompi-crear-link', e, { wa_id: to, contexto: 'ref=' + s.ref });
      mensajes.push(msjTexto(to, TEXTOS.wompiFallo));
      mensajes.push(botonesPago(to, s.precio, esBogota(s.datosEnvio)));
      return;
    }
    // el pedido nace en pago_pendiente; el webhook lo pasa a pago_confirmado
    const pedido = {
      cliente_nombre: s.nombrePerfil || parsed.nombre || '',
      cliente_wa: to,
      datos_envio: s.datosEnvio || '',
      ref: s.ref,
      talla: s.talla || '',
      cantidad: s.cantidad || 1,
      total: totalSes(s),
      metodo_pago: 'Wompi',
      wompi_payment_link_id: link.id,
      estado: 'pago_pendiente',
      canal: 'whatsapp-bot',
      fuente: fuente || 'organico',
      creado: new Date().toISOString()
    };
    const pedidoPath = await fsAdd(tok, 'tiendas/varman/pedidos', pedido);
    await fsDel(tok, SES_PATH);
    mensajes.push(msjTexto(to, T(TEXTOS.wompiLinkCliente, { total: fmtPrecio(totalSes(s)), url: link.url })));
    if (dueno && dueno !== to) {
      mensajes.push(msjTexto(dueno, T(TEXTOS.wompiAvisoDueno, {
        ref: s.ref, talla: s.talla || '?', cantidad: s.cantidad || 1, total: fmtPrecio(totalSes(s)),
        cliente: s.nombrePerfil || '(sin nombre)', wa: to, ruta: pedidoPath
      })));
    }
  }
  // ---- contra entrega (v6.3, solo Bogotá): cierra el pedido SIN pago anticipado
  // ni comprobante. Nace en 'nuevo' (orden por alistar); el cliente paga al recibir.
  async function pedidoContraentrega(s) {
    const pedido = {
      cliente_nombre: s.nombrePerfil || parsed.nombre || '',
      cliente_wa: to,
      datos_envio: s.datosEnvio || '',
      ref: s.ref,
      talla: s.talla || '',
      cantidad: s.cantidad || 1,
      total: totalSes(s),
      metodo_pago: 'Contra entrega',
      estado: 'nuevo',
      canal: 'whatsapp-bot',
      fuente: fuente || 'organico',
      creado: new Date().toISOString()
    };
    const pedidoPath = await fsAdd(tok, 'tiendas/varman/pedidos', pedido);
    await fsDel(tok, SES_PATH);
    // [NOMBRE-MODELO] nombre del modelo al cliente si el flag está ON (la ref
    // sigue en el pedido y en el aviso al 320, que la necesita para alistar).
    const modeloCe = modeloDe(s.ref);
    mensajes.push(msjTexto(to, T(modeloCe ? TEXTOS.contraentregaClienteModelo : TEXTOS.contraentregaCliente,
      { modelo: modeloCe, ref: s.ref, total: fmtPrecio(totalSes(s)) })));
    if (dueno && dueno !== to) {
      mensajes.push(msjTexto(dueno, T(TEXTOS.contraentregaAvisoDueno, {
        ref: s.ref, talla: s.talla || '?', cantidad: s.cantidad || 1, total: fmtPrecio(totalSes(s)),
        cliente: s.nombrePerfil || '(sin nombre)', wa: to, envio: s.datosEnvio || '', ruta: pedidoPath
      })));
    }
  }

  // cancelar: la palabra sola, o dentro de un mensaje CORTO ("mejor no, cancelar")
  // — corto para no cancelar por error en frases largas ("no quiero cancelar mi otro pedido")
  // [CATALOGO-WEB] "cancelar" también aplica a las sesiones de SOLO-link (sin
  // estado): borra linkCatalogoAt → apaga el seguimiento de compra de las ~2h
  // para quien rechazó explícito. Con el flag OFF esas sesiones no existen y
  // la condición queda EXACTA a la de hoy (ses && ses.estado).
  if ((/^(cancelar|cancela|cancel)$/i.test(texto) || (/\bcancel(ar|a|o)\b/i.test(texto) && texto.length <= 28)) && ses && (ses.estado || (FLAG_CATALOGO_WEB && ses.linkCatalogoAt))) {
    await fsDel(tok, SES_PATH);
    mensajes.push(msjTexto(to, ses.estado ? TEXTOS.pedidoCancelado : TEXTOS.catalogoWebCancelado));

  } else if (sel.startsWith('cat:')) {
    // formato: cat:<categoria> o cat:<categoria>:<offset> (fila "Ver más")
    const partes = sel.slice(4).split(':');
    const cat = partes[0];
    const offset = Math.max(0, parseInt(partes[1], 10) || 0);
    if (ses && ses.estado) await fsDel(tok, SES_PATH); // volvió a navegar
    await recordarFuente();
    const items = catalogo.filter((p) => p.cat === cat);
    if (items.length) {
      // [CATALOGO-WEB] con el flag ON tampoco va el catálogo nativo (MPM):
      // el else de abajo cae a mostrarTanda → tandaCatalogo → solo el link.
      if (catalogoNativoOn() && !FLAG_CATALOGO_WEB) {
        // catálogo nativo: tarjetas MPM (solo en la 1ª vista) + la lista "Elige"
        // (ref:NN) para que el flujo de pedido siga igual. La lista respeta el
        // offset para que "Ver más" pagine bien (sin reenviar el MPM).
        if (offset === 0) mensajes.push(mpmCategoria(to, CAT_LABEL[cat] || cat, items));
        mensajes.push(listaElegir(to, items, offset, 'cat:' + cat));
      } else {
        const label = (CAT_LABEL[cat] || cat).toLowerCase();
        const n = Math.min(TANDA_ACTIVA, items.length - offset);
        const intro = items.length > TANDA_ACTIVA
          ? T(TEXTOS.fotosIntroCat, { categoria: label, n, total: items.length })
          : T(TEXTOS.fotosIntroCatTodos, { categoria: label });
        mostrarTanda(items, offset, intro, 'cat:' + cat);
      }
    } else {
      mensajes.push(listaCategorias(to, catalogo));
    }

  } else if (sel.startsWith('marca:')) {
    // fila "Ver más" de una búsqueda por marca: marca:<marca>:<offset>
    const partes = sel.slice(6).split(':');
    const marca = normMarca(partes[0]);
    const offset = Math.max(0, parseInt(partes[1], 10) || 0);
    await recordarFuente();
    const items = catalogo.filter((p) => normMarca(p.marca).includes(marca));
    if (items.length) {
      const n = Math.min(TANDA_ACTIVA, items.length - offset);
      const intro = items.length > TANDA_ACTIVA
        ? T(TEXTOS.fotosIntroMarca, { marca, n, total: items.length })
        : T(TEXTOS.fotosIntroMarcaTodos, { marca });
      mostrarTanda(items, offset, intro, 'marca:' + marca);
    } else {
      mensajes.push(listaCategorias(to, catalogo, T(TEXTOS.marcaSinResultados, { marca })));
    }

  } else if (sel.startsWith('ref:')) {
    const ref = sel.slice(4);
    const p = catalogo.find((x) => x.ref === ref);
    if (p) {
      await arrancarPedido(p);
    } else {
      mensajes.push(msjTexto(to, TEXTOS.refNoEncontrada));
    }

  } else if (sel.startsWith('pay:') && ses && (ses.estado === 'pago' || ses.estado === 'comprobante')) {
    const clave = sel.slice(4);
    if (clave === 'wompi' && wompiConfigurado()) {
      await pagarConWompi(ses);
    } else if (clave === 'contraentrega' && esBogota(ses.datosEnvio)) {
      await pedidoContraentrega(ses);
    } else {
      const met = PAGOS[clave];
      if (met) {
        await guardarSes(Object.assign({}, ses, { estado: 'comprobante', metodo: met.nombre }));
        for (const m of instruccionesPago(to, met, totalSes(ses), TEXTOS.pagoInstruccionesBoton)) mensajes.push(m);
      } else {
        // método desconocido (o Wompi/contra entrega no disponible tras mostrarse):
        // nunca dejar al cliente sin respuesta → volver a mostrar los métodos
        mensajes.push(botonesPago(to, ses.precio, esBogota(ses.datosEnvio)));
      }
    }

  } else if (ses && ses.estado === 'talla' && ses.tallaPendNum) {
    // esperando el GÉNERO de una talla nacional/US que el cliente dijo antes
    const g = detectarGenero(normTxtG(texto));
    if (g) {
      const eur = convEUR(Number(ses.tallaPendNum), ses.tallaPendSis || 'nacional', g);
      if (eur) {
        await guardarSes(Object.assign({}, ses, { estado: 'datos', talla: eur, tallaPendNum: 0, tallaPendSis: '' }));
        mensajes.push(msjTexto(to, T(TEXTOS.tallaConvertida, { talla: eur })));
      } else {
        await guardarSes(Object.assign({}, ses, { tallaPendNum: 0, tallaPendSis: '' }));
        mensajes.push(msjTexto(to, TEXTOS.tallaInvalida));
      }
    } else {
      mensajes.push(msjTexto(to, TEXTOS.pedirGenero));
    }

  } else if (ses && ses.estado === 'talla') {
    // conversión determinista si el cliente dio la talla en NACIONAL o US
    const conv = tallaAEUR(texto);
    const sizeM = texto.match(/\b(3[5-9]|4[0-5])\b/);
    // fast-path: si el mensaje es SOLO la talla, o si ya resolvimos nacional/US,
    // no se gasta Gemini.
    const soloTalla = /^\s*(?:talla\s*)?(3[5-9]|4[0-5])\s*$/i.test(texto);
    const asist = (conv || soloTalla) ? null : await asistir(TEXTOS.pasoTalla);
    if (asist && asist.handoff) {
      hacerHandoff();
    } else if (conv && conv.eur) {
      // nacional/US con género → talla europea correcta (matemática en código).
      // conv.aprox (solo v2) = venía en CM: el texto lo dice ("aprox.").
      await guardarSes(Object.assign({}, ses, { estado: 'datos', talla: conv.eur }));
      mensajes.push(msjTexto(to, T(conv.aprox ? TEXTOS.tallaDesdeCm : TEXTOS.tallaConvertida, { talla: conv.eur })));
    } else if (conv && conv.invalida) {
      // [D1] v2: "cm" que no es un pie plausible (o pie fuera de 35-45) → no
      // fijar nada; también evita que el regex crudo tome "40 cm" como talla.
      await pushReask('talla', msjTexto(to, TEXTOS.tallaInvalida), msjTexto(to, TEXTOS.reintentoTalla));
    } else if (conv && conv.pedirGenero) {
      // sistema explícito pero falta el género: lo pide el CÓDIGO (no Gemini, para
      // no adivinar ni convertir mal) y guarda la talla pendiente.
      await guardarSes(Object.assign({}, ses, { tallaPendNum: conv.num, tallaPendSis: conv.sistema }));
      mensajes.push(msjTexto(to, T(TEXTOS.pedirGeneroTalla, { num: conv.num, sistema: conv.sistema === 'us' ? 'US' : 'nacional' })));
    } else if (asist) {
      // robustez ON y Gemini contestó: la IA MANDA. Solo fijamos la talla si
      // Gemini la extrajo (asist.dato); si el número venía dentro de una pregunta
      // ("¿tienen la 35?"), Gemini lo deja en respuesta y NO en dato, así el regex
      // crudo no lo captura por error (evita el choque IA↔plantilla).
      const gm = asist.dato.match(/\b(3[5-9]|4[0-5])\b/);
      if (gm) {
        await guardarSes(Object.assign({}, ses, { estado: 'datos', talla: gm[1] }));
        if (asist.respuesta) mensajes.push(msjTexto(to, asist.respuesta));
        mensajes.push(msjTexto(to, T(TEXTOS.tallaAnotada, { talla: gm[1] })));
      } else if (asist.respuesta) {
        // Gemini está aclarando/preguntando (no confirmó una talla) → solo su
        // mensaje, sin fijar nada. Nada de plantilla encima.
        mensajes.push(msjTexto(to, asist.respuesta));
      } else if (sizeM && !esPreguntaTalla(texto)) {
        // Gemini no dijo nada y hay un número claro que NO es una pregunta
        // ("¿tienen la 35?") → tomarlo como la talla del cliente (C2).
        await guardarSes(Object.assign({}, ses, { estado: 'datos', talla: sizeM[1] }));
        mensajes.push(msjTexto(to, T(TEXTOS.tallaAnotada, { talla: sizeM[1] })));
      } else {
        await pushReask('talla', msjTexto(to, TEXTOS.tallaInvalida), msjTexto(to, TEXTOS.reintentoTalla));
      }
    } else {
      // sin Gemini (mensaje = solo la talla, o robustez OFF, o Gemini falló):
      // regex determinista sobre el texto (comportamiento v5 seguro).
      if (sizeM) {
        await guardarSes(Object.assign({}, ses, { estado: 'datos', talla: sizeM[1] }));
        mensajes.push(msjTexto(to, T(TEXTOS.tallaAnotada, { talla: sizeM[1] })));
      } else {
        await pushReask('talla', msjTexto(to, TEXTOS.tallaInvalida), msjTexto(to, TEXTOS.reintentoTalla));
      }
    }

  } else if (ses && ses.estado === 'datos') {
    // v5: dato válido = 15+ chars. Con robustez exigimos además un dígito (toda
    // dirección/teléfono lo tiene) para no confundir una pregunta larga con la
    // dirección; sin el flag se conserva el criterio v5 exacto.
    const val = FLAG_DATOS_V2 ? validarEnvio(texto) : null;
    const pareceEnvio = FLAG_DATOS_V2 ? val.ok : (texto.length >= 15 && (!FLAG_ROBUSTEZ || /\d/.test(texto)));
    // fast-path: datos claros y sin pregunta → no se gasta Gemini
    const tienePregunta = /[?¿]|cu[aá]nt|precio|env[ií]o|cu[aá]ndo|puedo|tienen|\bhay\b|pares|varios|otro/i.test(texto);
    const asist = (pareceEnvio && !tienePregunta) ? null : await asistir(TEXTOS.pasoDatos);
    // con D3, Gemini también puede confirmar los datos (extrae un "dato" con teléfono)
    const geminiConfirma = FLAG_DATOS_V2 && asist && asist.dato && /\d{7,}/.test(String(asist.dato).replace(/[()\-.\s]/g, ''));
    if (asist && asist.handoff) {
      hacerHandoff();
    } else if (pareceEnvio || geminiConfirma) {
      await guardarSes(Object.assign({}, ses, { estado: 'pago', datosEnvio: texto.slice(0, 500) }));
      if (asist && asist.respuesta) mensajes.push(msjTexto(to, asist.respuesta));
      // [F-ACUSE] transición humana: si reconocemos la ciudad, el bloque de
      // pago la menciona en vez del genérico (flag OFF → body de hoy).
      const ciudadAc = FLAG_FLUIDEZ_ACUSE ? ciudadTitulo(texto) : '';
      mensajes.push(botonesPago(to, totalSes(ses), esBogota(texto),
        ciudadAc ? T(TEXTOS.pagoBodyAcuse, { ciudad: ciudadAc, total: fmtPrecio(totalSes(ses)) }) : null));
    } else if (asist && asist.respuesta) {
      mensajes.push(msjTexto(to, asist.respuesta));
    } else {
      // D3: mensaje claro de qué falta; v5: mensaje genérico.
      const msgDatos = (FLAG_DATOS_V2 && val && val.faltan.length)
        ? T(TEXTOS.datosFaltan, { faltan: val.faltan.join(', ') })
        : TEXTOS.datosIncompletos;
      await pushReask('datos', msjTexto(to, msgDatos), msjTexto(to, TEXTOS.reintentoDatos));
    }

  } else if (ses && ses.estado === 'pago') {
    // escribio texto en vez de tocar el boton
    const bogota = esBogota(ses.datosEnvio);
    if (/contra\s*-?\s*entrega|contraentrega/i.test(texto)) {
      // pidió contra entrega por texto: solo Bogotá cierra el pedido COD
      if (bogota) {
        await pedidoContraentrega(ses);
      } else {
        mensajes.push(msjTexto(to, TEXTOS.contraentregaSoloBogota));
        mensajes.push(botonesPago(to, totalSes(ses), false));
      }
    } else {
      const m = texto.match(/nequi|daviplata|bre/i);
      if (m) {
        const clave = m[0].toLowerCase().startsWith('bre') ? 'breb' : m[0].toLowerCase();
        const met = PAGOS[clave];
        await guardarSes(Object.assign({}, ses, { estado: 'comprobante', metodo: met.nombre }));
        for (const x of instruccionesPago(to, met, totalSes(ses), TEXTOS.pagoInstruccionesTexto)) mensajes.push(x);
      } else {
        const asist = await asistir(TEXTOS.pasoPago);
        if (asist && asist.handoff) {
          hacerHandoff();
        } else if (asist && asist.respuesta) {
          // IA sin interrupciones: si Gemini respondió la duda, NO reenviar el bloque
          // de pago encima (Gemini ya reencamina al método). Los botones siguen arriba.
          mensajes.push(msjTexto(to, asist.respuesta));
        } else {
          // [F-REPITE] 2ª vez seguida sin entender: texto breve en vez de
          // re-enviar el bloque de botones otra vez (caso real 1).
          await pushReask('pago', botonesPago(to, totalSes(ses), bogota), msjTexto(to, TEXTOS.reintentoPago));
        }
      }
    }

  } else if (ses && ses.estado === 'comprobante') {
    if (parsed.imagen_id) {
      // 1) descargar el comprobante (mejor esfuerzo; si falla queda el media_id)
      let comp = null;
      try {
        comp = await descargarComprobante(parsed.imagen_id);
      } catch (e) {
        await logError(tok, 'descarga-comprobante', e, { wa_id: to, contexto: 'media_id=' + parsed.imagen_id });
      }
      // 2) crear el pedido (estado segun contrato congelado del brief)
      const pedido = {
        cliente_nombre: ses.nombrePerfil || parsed.nombre || '',
        cliente_wa: to,
        datos_envio: ses.datosEnvio || '',
        ref: ses.ref,
        talla: ses.talla || '',
        cantidad: ses.cantidad || 1,
        total: totalSes(ses),
        metodo_pago: ses.metodo || '',
        comprobante_media_id: parsed.imagen_id,
        comprobante_guardado: false,
        estado: 'pagado_por_verificar',
        canal: 'whatsapp-bot',
        // atribución de pauta (briefs\CAMBIOS-PEDIDOS.md): id del anuncio
        // click-to-WhatsApp que trajo al cliente, u 'organico' si llegó solo
        fuente: fuente || 'organico',
        creado: new Date().toISOString()
      };
      const pedidoPath = await fsAdd(tok, 'tiendas/varman/pedidos', pedido);
      const pedidoId = pedidoPath.split('/').pop();
      // 3) guardar la imagen en tiendas/varman/comprobantes/{idPedido} y marcar el pedido
      if (comp) {
        try {
          await fsSet(tok, 'tiendas/varman/comprobantes/' + pedidoId, {
            pedido_id: pedidoId, mime: comp.mime, b64: comp.b64,
            bytes: comp.bytes, creado: new Date().toISOString()
          });
          pedido.comprobante_guardado = true;
          await fsSet(tok, pedidoPath, pedido);
        } catch (e) {
          await logError(tok, 'guardar-comprobante', e, { wa_id: to, contexto: 'pedido=' + pedidoId });
        }
      }
      await fsDel(tok, SES_PATH);
      // [NOMBRE-MODELO] al cliente se le muestra el nombre del modelo (marca de
      // la app) si el flag está ON y la ref lo tiene; si no, la Ref como hoy.
      const modeloPed = modeloDe(ses.ref);
      mensajes.push(msjTexto(to, T(modeloPed ? TEXTOS.pedidoRecibidoModelo : TEXTOS.pedidoRecibido,
        { modelo: modeloPed, ref: ses.ref, talla: ses.talla, cantidad: ses.cantidad || 1, total: fmtPrecio(totalSes(ses)) })));
      if (dueno && dueno !== to) {
        // 5-bis: si la ref está mapeada a bodega EXTERNA (tiendas/varman/
        // mapaCatalogo/{ref}, lo llena Cristhian en la app), el aviso interno
        // dice de qué proveedor pedirla. El flujo de venta no cambia.
        let externa = '';
        try {
          const mapa = await fsGet(tok, 'tiendas/varman/mapaCatalogo/' + ses.ref);
          if (mapa && (mapa.tipo === 'externa' || mapa.tipo === 'mixta') && mapa.proveedor) {
            externa = T(TEXTOS.avisoExternaLinea, { proveedor: mapa.proveedor });
          }
        } catch (e) {}
        mensajes.push(msjTexto(dueno, T(TEXTOS.avisoPedidoDueno, {
          ref: ses.ref, talla: ses.talla, cantidad: ses.cantidad || 1, total: fmtPrecio(totalSes(ses)), externa,
          metodo: ses.metodo || '?', cliente: ses.nombrePerfil || '(sin nombre)', wa: to,
          envio: ses.datosEnvio || '',
          comprobante: pedido.comprobante_guardado ? TEXTOS.avisoComprobanteOk : TEXTOS.avisoComprobanteFallo,
          ruta: pedidoPath
        })));
      }
    } else {
      const asist = await asistir(TEXTOS.pasoComprobante);
      if (asist && asist.handoff) {
        hacerHandoff();
      } else if (asist && asist.respuesta) {
        // IA sin interrupciones: si Gemini respondió, NO reenviar el recordatorio encima
        mensajes.push(msjTexto(to, asist.respuesta));
      } else {
        await pushReask('comprobante', msjTexto(to, TEXTOS.pideComprobante), msjTexto(to, TEXTOS.reintentoComprobante));
      }
    }

  } else {
    // ---------- sin pedido en curso: texto libre ----------

    // [E1] pasar al asesor un modelo que no tenemos (flag BOT_FOTO_ASESOR):
    // aviso al 320 + respuesta honesta al cliente (BANCO §3). Lo usan el camino
    // de la FOTO y el de la insistencia tras un marcaSinResultados.
    function pasarModeloAlAsesor(textoCliente, avisoDueno, vars) {
      mensajes.push(msjTexto(to, textoCliente));
      if (dueno && dueno !== to) {
        mensajes.push(msjTexto(dueno, T(avisoDueno, Object.assign({ cliente: parsed.nombre || '(sin nombre)', wa: to, texto }, vars))));
      }
    }
    // [E1] el cliente manda una FOTO sin pedido en curso = busca ese modelo
    // exacto. Con el flag ON se reenvía la foto al 320 (por media_id, sin
    // descargarla) y se le dice que un asesor confirma. Con OFF: como hoy
    // (la foto cae al catálogo).
    if (FLAG_FOTO_ASESOR && parsed.imagen_id) {
      await recordarFuente();
      pasarModeloAlAsesor(TEXTOS.fotoAsesorCliente, TEXTOS.fotoAsesorAvisoDueno);
      if (dueno && dueno !== to) {
        mensajes.push(msjImagenId(dueno, parsed.imagen_id, T(TEXTOS.fotoAsesorFotoCaption, { cliente: parsed.nombre || '(sin nombre)', wa: to })));
      }
      return;
    }
    // [E1] insistencia tras "de esa marca no tengo" (ses.marcaNoDisp): si el
    // cliente insiste con frase clara ("las quiero SÍ o SÍ"), se pasa el dato
    // al asesor en vez de repetir el catálogo. Determinista, sin gastar Gemini.
    if (FLAG_FOTO_ASESOR && ses && ses.marcaNoDisp && texto && MARCA_INSISTE.test(texto)) {
      const marcaPend = String(ses.marcaNoDisp);
      try { await fsMerge(tok, SES_PATH, { marcaNoDisp: '', updatedAt: new Date().toISOString() }); } catch (e) {}
      pasarModeloAlAsesor(TEXTOS.marcaAsesorCliente, TEXTOS.marcaAsesorAvisoDueno, { marca: marcaPend });
      return;
    }

    // Ref directa (mejora 4): la web abre WhatsApp con "Hola! Quiero la Ref 05"
    // (también entiende el formato viejo "Me interesa la referencia #05").
    // Arranca el pedido YA en esa referencia, sin menú y sin gastar Gemini.
    // OJO: si el mensaje suena a "avísame cuando llegue..." NO es compra —
    // se deja pasar a Gemini para que lo clasifique como aviso_stock.
    const suenaAEspera = /avis|cuando\s+(llegue|haya|vuelva|entre|tengan)/i.test(texto);
    const mRef = suenaAEspera ? null : texto.match(/\bref(?:erencia)?\.?\s*#?\s*(\d{1,3})\b/i);
    if (mRef) {
      const refBuscada = mRef[1].padStart(2, '0');
      const p = catalogo.find((x) => x.ref === refBuscada);
      if (p) {
        await recordarFuente();
        await arrancarPedido(p, TEXTOS.refDirectaIntro);
        return;
      }
      // [CATALOGO-WEB v2] pidió una ref que NO existe en el catálogo: respuesta
      // honesta + link de la web + puerta al asesor (antes caía a Gemini y con
      // el flag ON terminaba en el link genérico sin explicar nada).
      if (FLAG_CATALOGO_WEB) {
        await recordarFuente();
        mensajes.push(msjTexto(to, T(TEXTOS.catalogoWebRefNoEncontrada, { url: TEXTOS.catalogoWebUrl })));
        return;
      }
      // número que no existe en el catálogo: sigue al flujo normal (Gemini)
    }

    // [CATALOGO-WEB v2] fast-path determinista: si pide el catálogo con la
    // palabra clara ("catálogo", "ver el catálogo", "otro modelo"...) el link
    // sale de una, SIN gastar Gemini (y funciona aunque Gemini esté caído).
    // Los sinónimos libres ("muéstrame zapatos") siguen vía Gemini → ver_catalogo.
    if (FLAG_CATALOGO_WEB && texto && PIDE_OTRO_MODELO.test(texto)) {
      await recordarFuente();
      mensajes.push(msjCatalogoWeb(to));
      return;
    }

    await recordarFuente();
    // clasificador v1 (hoy) o v2 con few-shot (flag BOT_CLASIF_V2). Misma forma de JSON.
    const SISTEMA = FLAG_CLASIF_V2 ? GEMINI_SISTEMA_FEWSHOT : GEMINI_SISTEMA;
    let intent = 'saludo';
    let respuesta = '';
    let marcaBuscada = '';
    let refStock = '';
    let tallaStock = '';
    if (texto) {
      // clasificador (sin pedido en curso). El helper NUNCA lanza: si Gemini
      // falla o devuelve basura, out=null e intent se queda en 'saludo' (catálogo).
      const out = await llamarGemini(SISTEMA, texto.slice(0, 500),
        { temperature: 0.3, maxOutputTokens: 200, timeout: 15000, origen: 'gemini-clasificador' });
      if (out && out.intent) {
        intent = out.intent; respuesta = out.respuesta || '';
        marcaBuscada = FLAG_MARCA_NORM ? corregirMarca(normMarca(out.marca || '')) : normMarca(out.marca || '');
        refStock = String(out.ref || '').replace(/\D/g, '');
        tallaStock = String(out.talla || '').replace(/\D/g, '');
      }
    }
    if (intent === 'hablar_humano') {
      mensajes.push(msjTexto(to, respuesta || TEXTOS.handoffCliente));
      if (dueno && dueno !== to) {
        mensajes.push(msjTexto(dueno, T(TEXTOS.handoffAvisoDueno, { cliente: parsed.nombre || '(sin nombre)', wa: to, texto })));
      }
    } else if (intent === 'buscar_marca' && marcaBuscada) {
      // mejora 2: mostrar todas las referencias de esa marca, con fotos
      const items = catalogo.filter((p) => normMarca(p.marca).includes(marcaBuscada));
      if (items.length) {
        if (FLAG_CATALOGO_WEB) {
          // [CATALOGO-WEB v2] marca que SÍ tenemos: se le dice cuántos modelos
          // hay de esa marca (mirando el catálogo real) + el link, en UN mensaje.
          const marcaTit = marcaBuscada.charAt(0).toUpperCase() + marcaBuscada.slice(1);
          mensajes.push(msjTexto(to, T(TEXTOS.catalogoWebMarca, {
            marca: marcaTit, n: items.length,
            palabraModelos: items.length === 1 ? 'modelo disponible' : 'modelos disponibles',
            url: TEXTOS.catalogoWebUrl
          })));
        } else {
          const n = Math.min(TANDA_ACTIVA, items.length);
          const intro = items.length > TANDA_ACTIVA
            ? T(TEXTOS.fotosIntroMarca, { marca: marcaBuscada, n, total: items.length })
            : T(TEXTOS.fotosIntroMarcaTodos, { marca: marcaBuscada });
          mostrarTanda(items, 0, intro, 'marca:' + marcaBuscada);
        }
      } else if (FLAG_FOTO_ASESOR && ses && normMarca(ses.marcaNoDisp || '') === marcaBuscada) {
        // [E1] segunda vez que pregunta por la MISMA marca sin resultados =
        // insiste → pasar al asesor en vez de repetir el mismo catálogo.
        try { await fsMerge(tok, SES_PATH, { marcaNoDisp: '', updatedAt: new Date().toISOString() }); } catch (e) {}
        pasarModeloAlAsesor(TEXTOS.marcaAsesorCliente, TEXTOS.marcaAsesorAvisoDueno, { marca: marcaBuscada });
      } else {
        // sin refs marcadas con esa marca: catálogo normal con aviso honesto.
        // [E1] con el flag ON se recuerda la marca en la sesión (fsMerge, igual
        // que la fuente) para detectar la insistencia en el siguiente mensaje.
        if (FLAG_FOTO_ASESOR) {
          try { await fsMerge(tok, SES_PATH, { marcaNoDisp: marcaBuscada, updatedAt: new Date().toISOString() }); } catch (e) {}
        }
        if (FLAG_CATALOGO_WEB) {
          // [CATALOGO-WEB v2] honestidad + link + puerta al asesor, en UN mensaje
          const marcaTit2 = marcaBuscada.charAt(0).toUpperCase() + marcaBuscada.slice(1);
          mensajes.push(msjTexto(to, T(TEXTOS.catalogoWebMarcaSin, { marca: marcaTit2, url: TEXTOS.catalogoWebUrl })));
        } else {
          mensajes.push(listaCategorias(to, catalogo, T(TEXTOS.marcaSinResultados, { marca: marcaBuscada })));
        }
      }
    } else if (intent === 'estado_pedido') {
      // backlog 7: "¿cómo va mi pedido?" — busca el último pedido del cliente.
      // El filtro por cliente va en JS para no requerir índice compuesto.
      const todos = await fsUltimosPedidos(tok, 50);
      const mio = todos.find((p) => String(p.cliente_wa || '') === to);
      if (mio) {
        const est = String(mio.estado || '');
        const expl = TEXTOS['estadoExpl_' + est] || TEXTOS.estadoExpl_default;
        // [NOMBRE-MODELO] también aquí: el nombre del modelo si el flag está ON
        const modeloEst = modeloDe(mio.ref);
        mensajes.push(msjTexto(to, T(modeloEst ? TEXTOS.estadoPedidoInfoModelo : TEXTOS.estadoPedidoInfo, {
          modelo: modeloEst, ref: mio.ref || '?', talla: mio.talla || '?', total: fmtPrecio(mio.total || 0),
          fecha: fechaCorta(mio.creado), estado: est.replace(/_/g, ' '), explicacion: expl
        })));
      } else {
        mensajes.push(msjTexto(to, TEXTOS.estadoSinPedidos));
      }
    } else if (intent === 'aviso_stock') {
      // backlog 13: "avísame cuando llegue la talla X de la ref Y" → lista de
      // espera en Firestore (visible en la app; el aviso lo dispara Cristhian
      // a mano por ahora). Sin ref no se registra: se pide precisar.
      const refEspera = refStock ? refStock.padStart(2, '0') : '';
      if (refEspera && catalogo.some((p) => p.ref === refEspera)) {
        await fsAdd(tok, 'tiendas/varman/listaEspera', {
          cliente_wa: to,
          cliente_nombre: parsed.nombre || '',
          ref: refEspera,
          talla: tallaStock || '',
          estado: 'esperando',
          creado: new Date().toISOString()
        });
        mensajes.push(msjTexto(to, T(TEXTOS.listaEsperaOk, {
          ref: refEspera,
          talla: tallaStock ? T(TEXTOS.listaEsperaTallaParte, { talla: tallaStock }) : ''
        })));
      } else {
        mensajes.push(msjTexto(to, TEXTOS.listaEsperaFaltaRef));
      }
    } else if (intent === 'otro') {
      mensajes.push(msjTexto(to, respuesta || TEXTOS.otroDefault));
    } else if (FLAG_CATALOGO_WEB && intent === 'saludo') {
      // [CATALOGO-WEB v2] el saludo da la BIENVENIDA y espera la pregunta del
      // cliente (pedido del dueño): nada de link en frío. El link sale cuando
      // pida catálogo / comprar / precio / una marca. También es el fallback
      // cuando Gemini falla (intent por defecto = saludo): una pregunta abierta
      // nunca es un dead-end.
      mensajes.push(msjTexto(to, TEXTOS.catalogoWebBienvenida));
    } else if (intent === 'comprar') {
      // [CATALOGO-WEB] con el flag ON el intent comprar manda SOLO el link
      // (un mensaje, según el brief): la respuesta de Gemini no va encima.
      if (respuesta && !FLAG_CATALOGO_WEB) mensajes.push(msjTexto(to, respuesta));
      mensajes.push(listaCategorias(to, catalogo, TEXTOS.comprarIntro));
    } else if (FLAG_DISPATCH_V2 && intent === 'pregunta_precio') {
      // camino útil para precio: primero la respuesta de Gemini (o el rango de
      // precios si no dio texto) y luego el catálogo para elegir.
      // [CATALOGO-WEB] con el flag ON todo va en UN solo mensaje: bienvenida +
      // respuesta de precio + el link (un punto de catálogo = 1 mensaje).
      if (FLAG_CATALOGO_WEB) {
        mensajes.push(msjTexto(to, (respuesta || TEXTOS.catalogoWebPrecioIntro) + '\n\n' + T(TEXTOS.catalogoWebLinkCorto, { url: TEXTOS.catalogoWebUrl })));
      } else {
        mensajes.push(msjTexto(to, respuesta || TEXTOS.precioInfo));
        mensajes.push(listaCategorias(to, catalogo, TEXTOS.precioCatalogo));
      }
    } else if (FLAG_DISPATCH_V2 && (intent === 'saludo' || intent === 'ver_catalogo')) {
      // saludo / ver catálogo: bienvenida cálida + categorías (camino explícito).
      mensajes.push(listaCategorias(to, catalogo, respuesta || undefined));
    } else {
      // fallback seguro (intent desconocido o Gemini → null): catálogo + saludo
      // cálido, nunca un "no entendí" seco.
      mensajes.push(listaCategorias(to, catalogo, respuesta || undefined));
    }
  }
}

try {
  await principal();
} catch (e) {
  // error inesperado: log a botErrores + respuesta amable (nunca dejar al cliente en silencio)
  if (tok) await logError(tok, 'Cerebro', e, { wa_id: to, contexto: 'ses=' + (ses && ses.estado || 'sin sesion') + ' texto=' + texto.slice(0, 80) });
  if (!mensajes.length) {
    mensajes.push(msjTexto(to, TEXTOS.errorTecnico));
  }
}

// [CATALOGO-WEB] si en esta vuelta se mandó el link del catálogo web, se anota
// linkCatalogoAt en la sesión (fsMerge: no pisa nada, igual que la fuente).
// El trigger horario (notificaciones.js) lo usa para el seguimiento de compra
// a las ~2h. Mejor esfuerzo: si Firestore falla, el flujo no se rompe. Con el
// flag OFF este bloque no corre nunca.
if (FLAG_CATALOGO_WEB && tok) {
  try {
    const mandoLink = mensajes.some((m) => m && m.to === to && m.type === 'text'
      && m.text && String(m.text.body).indexOf(TEXTOS.catalogoWebUrl) >= 0);
    if (mandoLink) {
      const marca = { linkCatalogoAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      if (parsed.nombre) marca.nombrePerfil = parsed.nombre; // para el saludo del seguimiento
      await fsMerge(tok, 'tiendas/varman/botSesiones/' + to, marca);
    }
  } catch (e) {}
}

return mensajes.map((m) => ({ json: m }));
