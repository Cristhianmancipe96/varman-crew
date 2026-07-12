// ============ COMPRA WEB con Wompi — función de Cloudflare Pages ============
// (2026-07-11, BRIEF-WEB-COMPRA-WOMPI · Opción A elegida por el dueño)
//
// Este archivo es un "Pages Function" en modo avanzado (_worker.js): funciona
// con el deploy de siempre (arrastrar web\publicar a Cloudflare Pages). Todo
// lo que NO sea /api/... se sirve como archivo estático normal (env.ASSETS).
//
// POST /api/comprar  { ref, talla, cantidad, nombre, celular, direccion }
//   1. Valida los datos y lee el PRECIO REAL del catálogo público de Firestore
//      (nunca se confía en el precio que mande el navegador).
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
const TALLAS_DEF = '35-45';      // por defecto hombre/unisex (colombiano)
const TALLAS_DEF_DAMA = '34-41'; // por defecto dama (CO; EU 35-42)

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

// ---- lee la referencia en el catálogo PÚBLICO (misma lectura que hace la web) ----
async function refDeCatalogo(ref) {
  const r = await fetch(FS_BASE + '/tiendas/varman/catalogo?pageSize=300');
  if (!r.ok) throw new Error('catalogo: HTTP ' + r.status);
  const j = await r.json();
  const prods = (j.documents || []).map(fromFs).filter(Boolean);
  return prods.find((p) => String(p.ref) === String(ref) && p.activo !== false) || null;
}

// ---- crea el link de pago (misma llamada que crearLinkWompi del bot) ----
async function crearLinkWompi(env, datos, totalCOP, redirectUrl) {
  const base = String(env.WOMPI_ENV || 'test').toLowerCase() === 'prod'
    ? 'https://production.wompi.co/v1' : 'https://sandbox.wompi.co/v1';
  const r = await fetch(base + '/payment_links', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + env.WOMPI_PRV_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'VarMan Crew · Ref ' + datos.ref + ' · talla ' + datos.talla,
      description: 'Compra en varmancrew.com — Ref ' + datos.ref + ', talla ' + datos.talla +
        (datos.cantidad > 1 ? ', ' + datos.cantidad + ' pares' : ''),
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

  const ref = String(b.ref || '').trim();
  const talla = String(b.talla || '').trim();
  const cantidad = Math.round(Number(b.cantidad) || 0);
  const nombre = String(b.nombre || '').trim().slice(0, 80);
  const celular = String(b.celular || '').replace(/\D/g, '');
  const direccion = String(b.direccion || '').trim().slice(0, 400);

  if (!/^\d{1,4}$/.test(ref)) return jsonResp({ error: 'referencia inválida' }, 400);
  if (cantidad < 1 || cantidad > 5) return jsonResp({ error: 'cantidad inválida' }, 400);
  if (nombre.length < 2) return jsonResp({ error: 'falta el nombre' }, 400);
  // Colombia estricto (57 + celular de 10 empezando por 3); otros países:
  // prefijo + número, entre 8 y 15 dígitos en total (formato E.164 sin '+')
  const esColombia = celular.indexOf('57') === 0 && celular.length === 12;
  if (esColombia && !/^573\d{9}$/.test(celular)) return jsonResp({ error: 'WhatsApp inválido (57 + 10 dígitos)' }, 400);
  if (!/^\d{8,15}$/.test(celular)) return jsonResp({ error: 'WhatsApp inválido' }, 400);
  if (direccion.length < 5) return jsonResp({ error: 'falta la dirección' }, 400);

  // Precio y tallas REALES desde el catálogo (nunca del navegador)
  const prod = await refDeCatalogo(ref);
  if (!prod) return jsonResp({ error: 'la referencia ya no está disponible' }, 400);
  const esDama = String(prod.genero || '').toLowerCase() === 'dama';
  const tallasOk = expandTallas(prod.tallas) || expandTallas(esDama ? TALLAS_DEF_DAMA : TALLAS_DEF);
  if (tallasOk.indexOf(talla) === -1) return jsonResp({ error: 'talla no disponible' }, 400);
  const precio = Math.round(Number(prod.precio) || 0);
  if (precio < 1000) return jsonResp({ error: 'precio del catálogo inválido' }, 500);
  const total = precio * cantidad;

  // 1º el link de pago; 2º el pedido. Si el pedido falla NO se devuelve la URL
  // (el link single_use queda huérfano y nadie lo paga: inofensivo).
  const redirectUrl = (esLocal ? origin : (ORIGENES_OK.indexOf(origin) !== -1 ? origin : ORIGENES_OK[0])) + '/?compra=gracias';
  const link = await crearLinkWompi(env, { ref, talla, cantidad }, total, redirectUrl);

  // Esquema CONGELADO del pedido (CAMBIOS-PEDIDOS.md; canal 'web' autorizado
  // por BRIEF-WEB-COMPRA-WOMPI y anotado allá). El webhook del bot lo
  // encuentra por wompi_payment_link_id y lo pasa a 'pago_confirmado'.
  const tok = await tokenAdmin(env);
  const pedido = {
    cliente_nombre: nombre,
    cliente_wa: celular,             // solo dígitos, con 57 (igual que el bot)
    datos_envio: direccion,
    ref, talla,
    cantidad, total,
    metodo_pago: 'Wompi',
    estado: 'pago_pendiente',
    canal: 'web',
    fuente: 'organico',
    creado: new Date().toISOString(),
    wompi_payment_link_id: link.id,
  };
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
