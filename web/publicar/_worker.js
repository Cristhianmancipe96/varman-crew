// ============ COMPRA WEB con Wompi — función de Cloudflare Pages ============
// (2026-07-11, BRIEF-WEB-COMPRA-WOMPI · Opción A elegida por el dueño)
//
// Este archivo es un "Pages Function" en modo avanzado (_worker.js): funciona
// con el deploy de siempre (arrastrar web\publicar a Cloudflare Pages). Todo
// lo que NO sea /api/... se sirve como archivo estático normal (env.ASSETS).
//
// POST /api/comprar  { ref, talla, cantidad, nombre, celular, direccion }
//   …o con CARRITO (2026-07-18): { items:[{ref,talla,cantidad,genero}], nombre, … }
//   1. Valida los datos y lee el PRECIO REAL del catálogo público de Firestore
//      (nunca se confía en el precio que mande el navegador). Con carrito se
//      valida CADA ítem igual de estricto y se lee el catálogo UNA sola vez.
//   2. Crea un LINK DE PAGO en Wompi (igual que el bot) con la llave privada.
//   3. Crea el pedido en tiendas/varman/pedidos con el esquema CONGELADO
//      (CAMBIOS-PEDIDOS.md): estado 'pago_pendiente', canal 'web',
//      metodo_pago 'Wompi', wompi_payment_link_id.
//   4. Devuelve { url } → el navegador va al checkout de Wompi.
//
// La CONFIRMACIÓN del pago NO pasa por aquí: la hace el webhook del BOT
// (bot.varmancrew.com/webhook/wompi) que ya verifica la firma del evento,
// busca el pedido por wompi_payment_link_id, lo pasa a 'pago_confirmado' y
// avisa por WhatsApp al dueño (320) y al cliente. Cero cambios en el bot.
//
// Variables (Cloudflare Pages → Settings → Environment variables — las pone
// el dueño; NUNCA van en archivos del repo/deploy):
//   WOMPI_PRV_KEY     llave privada Wompi (prv_test_... / prv_prod_...)
//   WOMPI_ENV         'test' (sandbox, por defecto) o 'prod'
//   FIREBASE_SA_B64   service account de Firebase en base64 (la misma del bot)
//
// Sin estas variables el endpoint responde error y la web muestra "no pudimos
// crear el pago" (la página estática sigue funcionando normal). Rollback: ver
// COMPRA_WOMPI en index.html y web/NOTA-WEB-COMPRA-WOMPI-2026-07-11.md.

const FS_BASE = 'https://firestore.googleapis.com/v1/projects/varman-crew/databases/(default)/documents';
const ORIGENES_OK = [
  'https://varmancrew.com', 'https://www.varmancrew.com',
  'https://varmancrew.pages.dev',
];
// [2026-07-18] tope REAL del negocio: EU 44 (hombre EU = CO+2 → CO máx 42;
// antes 35-45 dejaba pedir hasta EU 47). Debe ser IGUAL al del index.html.
// Una ref con tallas propias en la app usa las suyas (el dueño manda).
const TALLAS_DEF = '35-42';      // por defecto hombre/unisex (CO; EU 37-44)
const TALLAS_DEF_DAMA = '34-41'; // por defecto dama (CO; EU 35-42)
// [CARRITO] topes de un pedido con varios productos (evita pedidos absurdos y
// links de pago gigantes). Un ítem = una ref+talla; cantidad = pares de ese ítem.
const MAX_ITEMS = 8;             // referencias distintas en el carrito
const MAX_PARES = 10;            // pares en total en el pedido

// ---- utilidades Firestore (mismas convenciones que wompi-webhook.js del bot) ----
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

// ---- JWT RS256 con WebCrypto (los Workers no tienen require('crypto')) ----
function b64uDeStr(s) {
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64uDeBuf(buf) {
  let s = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
let tokenCache = { token: null, vence: 0 }; // vive mientras viva el isolate
async function tokenAdmin(env) {
  if (tokenCache.token && Date.now() < tokenCache.vence - 60000) return tokenCache.token;
  const sa = JSON.parse(new TextDecoder().decode(
    Uint8Array.from(atob(String(env.FIREBASE_SA_B64 || '').trim()), (c) => c.charCodeAt(0))
  ));
  const now = Math.floor(Date.now() / 1000);
  const header = b64uDeStr(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64uDeStr(JSON.stringify({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }));
  const base = header + '.' + claims;
  const pem = String(sa.private_key).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(base));
  const jwt = base + '.' + b64uDeBuf(sig);
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt,
  });
  if (!r.ok) throw new Error('token admin: HTTP ' + r.status);
  const j = await r.json();
  tokenCache = { token: j.access_token, vence: Date.now() + (j.expires_in || 3600) * 1000 };
  return tokenCache.token;
}

// ---- tallas: "36-45" o "38,39,40" (o mezcla) → lista; igual que en la web ----
function expandTallas(txt) {
  const out = [];
  String(txt || '').split(',').forEach((p) => {
    p = p.trim();
    if (!p) return;
    const m = p.match(/^(\d{2})\s*[-–]\s*(\d{2})$/);
    if (m) { for (let i = +m[1]; i <= +m[2] && out.length < 30; i++) out.push(String(i)); }
    else if (/^\d{2}$/.test(p)) out.push(p);
  });
  return out.length ? out : null;
}

// ---- lee el catálogo PÚBLICO (misma lectura que hace la web) ----
// [CARRITO] se lee UNA vez por pedido y se buscan todos los ítems ahí (antes
// era una lectura por referencia; con carrito serían N lecturas iguales).
async function catalogoPublico() {
  const r = await fetch(FS_BASE + '/tiendas/varman/catalogo?pageSize=300');
  if (!r.ok) throw new Error('catalogo: HTTP ' + r.status);
  const j = await r.json();
  return (j.documents || []).map(fromFs).filter(Boolean);
}
function buscarRef(prods, ref) {
  return prods.find((p) => String(p.ref) === String(ref) && p.activo !== false) || null;
}

// ---- valida UN ítem del pedido contra el catálogo real ----
// Devuelve { error } o la línea validada { ref, talla, cantidad, genero,
// precio, subtotal }. El precio SIEMPRE sale del catálogo, nunca del navegador.
function validarItem(prods, it) {
  const ref = String((it && it.ref) || '').trim();
  const talla = String((it && it.talla) || '').trim();
  const cantidad = Math.round(Number(it && it.cantidad) || 0);
  const generoIn = String((it && it.genero) || '').toLowerCase().trim(); // dama/caballero/''
  if (!/^\d{1,4}$/.test(ref)) return { error: 'referencia inválida' };
  if (cantidad < 1 || cantidad > 5) return { error: 'cantidad inválida' };
  const prod = buscarRef(prods, ref);
  if (!prod) return { error: 'la Ref ' + ref + ' ya no está disponible' };
  // Género REAL: el marcado en la app manda; si la ref es unisex, se usa la
  // elección del cliente (debe ser dama o caballero). Nunca se confía a ciegas.
  const generoRef = String(prod.genero || '').toLowerCase();
  const genero = (generoRef === 'dama' || generoRef === 'caballero') ? generoRef
    : (generoIn === 'dama' || generoIn === 'caballero') ? generoIn : '';
  if (!genero) return { error: 'elige si la Ref ' + ref + ' es para dama o caballero' };
  const esDama = genero === 'dama';
  const tallasOk = expandTallas(prod.tallas) || expandTallas(esDama ? TALLAS_DEF_DAMA : TALLAS_DEF);
  if (tallasOk.indexOf(talla) === -1) return { error: 'talla no disponible en la Ref ' + ref };
  const precio = Math.round(Number(prod.precio) || 0);
  if (precio < 1000) return { error: 'precio del catálogo inválido' };
  return { ref, talla, cantidad, genero, precio, subtotal: precio * cantidad };
}

// ---- crea el link de pago (misma llamada que crearLinkWompi del bot) ----
async function crearLinkWompi(env, datos, totalCOP, redirectUrl) {
  const base = String(env.WOMPI_ENV || 'test').toLowerCase() === 'prod'
    ? 'https://production.wompi.co/v1' : 'https://sandbox.wompi.co/v1';
  const r = await fetch(base + '/payment_links', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + env.WOMPI_PRV_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // [CARRITO] con varios productos el link se titula por el nº de pares y
      // el detalle va en la descripción; con uno solo, el texto de siempre.
      name: datos.multi
        ? 'VarMan Crew · ' + datos.totalPares + ' pares'
        : 'VarMan Crew · Ref ' + datos.items[0].ref + ' · talla ' + datos.items[0].talla,
      description: 'Compra en varmancrew.com — ' + datos.resumen,
      single_use: true,
      collect_shipping: false,
      currency: 'COP',
      amount_in_cents: totalCOP * 100,
      redirect_url: redirectUrl,
    }),
  });
  const j = await r.json().catch(() => null);
  const id = j && j.data && j.data.id;
  if (!r.ok || !id) throw new Error('wompi payment_links: HTTP ' + r.status);
  return { id, url: 'https://checkout.wompi.co/l/' + id };
}

function jsonResp(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

// ---- GET /foto/<fid>.jpg — sirve una foto del catálogo como imagen ----------
// Las fotos NUEVAS (subidas desde la app) viven en Firestore catalogoFotos como
// dataURL base64. El BOT necesita un enlace PÚBLICO para mandarlas por WhatsApp
// (WhatsApp baja la imagen de aquí, de Cloudflare, NO de la VM de 1 GB). Este
// endpoint lee el doc (lectura pública, igual que el catálogo), decodifica el
// dataURL y lo devuelve como imagen cacheable. Solo lectura; no toca nada.
async function serveFoto(fid) {
  if (!/^[a-z0-9]{4,40}$/i.test(fid)) return new Response('not found', { status: 404 });
  const r = await fetch(FS_BASE + '/tiendas/varman/catalogoFotos/' + fid);
  if (!r.ok) return new Response('not found', { status: 404 });
  const j = await r.json().catch(() => null);
  const data = j && j.fields && j.fields.data && j.fields.data.stringValue;
  const m = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(String(data || ''));
  if (!m) return new Response('not found', { status: 404 });
  const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': m[1],
      // el fid es único por foto → se puede cachear "para siempre"
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

async function apiComprar(request, env) {
  // Solo desde la propia página (o pruebas locales). Un Origin raro = 403.
  const origin = request.headers.get('Origin') || '';
  const esLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if (origin && !esLocal && ORIGENES_OK.indexOf(origin) === -1) {
    return jsonResp({ error: 'origen no permitido' }, 403);
  }
  if (!String(env.WOMPI_PRV_KEY || '').trim() || !String(env.FIREBASE_SA_B64 || '').trim()) {
    return jsonResp({ error: 'pago en línea no configurado' }, 503);
  }

  let b;
  try { b = await request.json(); } catch (e) { return jsonResp({ error: 'JSON inválido' }, 400); }

  const nombre = String(b.nombre || '').trim().slice(0, 80);
  const celular = String(b.celular || '').replace(/\D/g, '');
  const direccion = String(b.direccion || '').trim().slice(0, 400);

  // [CARRITO] `items` (varios productos) o los campos sueltos de siempre (un
  // solo producto). Con UN ítem el pedido queda EXACTAMENTE igual que antes.
  const bruto = (Array.isArray(b.items) && b.items.length)
    ? b.items
    : [{ ref: b.ref, talla: b.talla, cantidad: b.cantidad, genero: b.genero }];
  if (bruto.length > MAX_ITEMS) return jsonResp({ error: 'máximo ' + MAX_ITEMS + ' referencias por pedido' }, 400);

  if (nombre.length < 2) return jsonResp({ error: 'falta el nombre' }, 400);
  // Colombia estricto (57 + celular de 10 empezando por 3); otros países:
  // prefijo + número, entre 8 y 15 dígitos en total (formato E.164 sin '+')
  const esColombia = celular.indexOf('57') === 0 && celular.length === 12;
  if (esColombia && !/^573\d{9}$/.test(celular)) return jsonResp({ error: 'WhatsApp inválido (57 + 10 dígitos)' }, 400);
  if (!/^\d{8,15}$/.test(celular)) return jsonResp({ error: 'WhatsApp inválido' }, 400);
  if (direccion.length < 5) return jsonResp({ error: 'falta la dirección' }, 400);

  // Precios y tallas REALES desde el catálogo (nunca del navegador), ítem por ítem
  const prods = await catalogoPublico();
  const items = [];
  for (const it of bruto) {
    const v = validarItem(prods, it);
    if (v.error) return jsonResp({ error: v.error }, 400);
    // [CARRITO] une líneas repetidas (misma ref+talla+género): el carrito ya lo
    // hace en el navegador, aquí es la red de seguridad.
    const igual = items.find((x) => x.ref === v.ref && x.talla === v.talla && x.genero === v.genero);
    if (igual) {
      igual.cantidad += v.cantidad;
      // [SEGURIDAD 2026-07-21] El tope de 5 por línea (validarItem) se saltaba
      // mandando dos líneas iguales de 5 → 10 pares de una misma ref+talla.
      // Re-chequear el tope DESPUÉS de fusionar, igual que lo limita la UI.
      if (igual.cantidad > 5) return jsonResp({ error: 'máximo 5 pares de una misma referencia y talla' }, 400);
      igual.subtotal = igual.precio * igual.cantidad;
    }
    else items.push(v);
  }
  const totalPares = items.reduce((a, x) => a + x.cantidad, 0);
  if (totalPares < 1 || totalPares > MAX_PARES) return jsonResp({ error: 'máximo ' + MAX_PARES + ' pares por pedido' }, 400);
  const total = items.reduce((a, x) => a + x.subtotal, 0);
  const multi = items.length > 1;
  // resumen legible que viaja al pedido y al link de pago ("Ref 05 T41 · Ref 12 T40 x2")
  const resumen = items.map((x) => 'Ref ' + x.ref + ' T' + x.talla + (x.cantidad > 1 ? ' x' + x.cantidad : '')).join(' · ');

  // 1º el link de pago; 2º el pedido. Si el pedido falla NO se devuelve la URL
  // (el link single_use queda huérfano y nadie lo paga: inofensivo).
  const redirectUrl = (esLocal ? origin : (ORIGENES_OK.indexOf(origin) !== -1 ? origin : ORIGENES_OK[0])) + '/?compra=gracias';
  const link = await crearLinkWompi(env, { items, multi, resumen, totalPares }, total, redirectUrl);

  // Esquema CONGELADO del pedido (CAMBIOS-PEDIDOS.md; canal 'web' autorizado
  // por BRIEF-WEB-COMPRA-WOMPI y anotado allá). El webhook del bot lo
  // encuentra por wompi_payment_link_id y lo pasa a 'pago_confirmado'.
  const tok = await tokenAdmin(env);
  const p0 = items[0];
  // [CARRITO] con VARIOS productos los campos de siempre llevan un RESUMEN
  // legible ("05 + 12" / "41 + 40", cantidad = total de pares) para que la app
  // y el aviso de WhatsApp del bot sigan mostrando algo útil SIN tocarlos, y el
  // detalle exacto viaja en items_json (lo lee la app para alistar el envío).
  // Con UN solo producto el documento queda BYTE-IDÉNTICO al de antes.
  const generosDistintos = items.some((x) => x.genero !== p0.genero);
  const pedido = {
    cliente_nombre: nombre,
    cliente_wa: celular,             // solo dígitos, con 57 (igual que el bot)
    datos_envio: direccion,
    ref: multi ? items.map((x) => x.ref).join(' + ') : p0.ref,
    talla: multi ? items.map((x) => x.talla).join(' + ') : p0.talla,
    cantidad: multi ? totalPares : p0.cantidad,
    total,
    metodo_pago: 'Wompi',
    estado: 'pago_pendiente',
    canal: 'web',
    // dama / caballero (lo usa el aviso del bot); con géneros mezclados va vacío
    genero: (multi && generosDistintos) ? '' : p0.genero,
    fuente: 'organico',
    creado: new Date().toISOString(),
    wompi_payment_link_id: link.id,
  };
  if (multi) {
    pedido.items_json = JSON.stringify(items);   // detalle exacto (lo lee la app)
    pedido.items_n = items.length;               // nº de referencias distintas
    pedido.items_resumen = resumen;              // "Ref 05 T41 · Ref 12 T40 x2"
  }
  const w = await fetch(FS_BASE + '/tiendas/varman/pedidos', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFs(pedido) }),
  });
  if (!w.ok) throw new Error('crear pedido: HTTP ' + w.status);

  return jsonResp({ ok: true, url: link.url });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // GET /foto/<fid>.jpg → imagen del catálogo (para que el bot la mande por WhatsApp)
    const mFoto = url.pathname.match(/^\/foto\/([A-Za-z0-9]{4,40})(?:\.jpg)?$/);
    if (mFoto) {
      if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('método no permitido', { status: 405 });
      try { return await serveFoto(mFoto[1]); }
      catch (e) { console.error('foto:', e && e.message); return new Response('error', { status: 500 }); }
    }
    if (url.pathname === '/api/comprar') {
      if (request.method !== 'POST') return jsonResp({ error: 'método no permitido' }, 405);
      try {
        return await apiComprar(request, env);
      } catch (e) {
        // nunca tumbar la página por el pago: error genérico y registro en logs
        console.error('api/comprar:', e && e.message);
        return jsonResp({ error: 'no se pudo crear el pago' }, 500);
      }
    }
    if (url.pathname.startsWith('/api/')) return jsonResp({ error: 'no existe' }, 404);
    return env.ASSETS.fetch(request); // todo lo demás: la página estática normal
  },
};
