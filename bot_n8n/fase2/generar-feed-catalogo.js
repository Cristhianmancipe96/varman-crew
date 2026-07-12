// ============ Generar el FEED del catálogo nativo de WhatsApp ============
// Lee el catálogo público de Firestore (tiendas/varman/catalogo) y arma el
// archivo CSV que se sube a Meta Commerce Manager (catálogo sobre la WABA).
//   node "fase2\generar-feed-catalogo.js"      (desde bot_n8n\)
// Salida: fase2\feed-catalogo-whatsapp.csv
//
// Columnas Meta requeridas: id, title, description, availability, condition,
// price, link, image_link, brand. El SKU (id) = la ref del catálogo, para que
// el bot mande MPM usando product_retailer_id = ref.
//
// ⚠ Commerce Policy: NO poner logos protagonistas de terceros (Adidas/Nike/LV)
// en las imágenes del feed → riesgo de rechazo del catálogo.
const fs = require('fs');
const path = require('path');

const CAT_URL = 'https://firestore.googleapis.com/v1/projects/varman-crew/databases/(default)/documents/tiendas/varman/catalogo?pageSize=300';
const FOTOS_BASE = process.env.CATALOGO_FOTOS_URL_BASE || 'https://varmancrew.pages.dev/img/';
const TIENDA_URL = 'https://varmancrew.pages.dev/';
const SALIDA = path.join(__dirname, 'feed-catalogo-whatsapp.csv');

function unwrap(v) {
  if (v == null) return null;
  if ('integerValue' in v) return parseInt(v.integerValue, 10);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('stringValue' in v) return v.stringValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(unwrap);
  return null;
}
function fotoPublica(p) {
  const fid = (Array.isArray(p.fotos) && p.fotos[0]) || '';
  return /^p\d{1,4}$/.test(fid) ? FOTOS_BASE + fid + '.jpg' : null; // solo pNNN son públicas
}
function marcaBonita(p) {
  const m = (p.marca || '').trim();
  return m ? m.charAt(0).toUpperCase() + m.slice(1) : 'VarMan Crew';
}
function csvCampo(s) {
  return '"' + String(s == null ? '' : s).replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"';
}

(async () => {
  const r = await fetch(CAT_URL);
  if (!r.ok) { console.error('No pude leer el catálogo:', r.status); process.exit(1); }
  const j = await r.json();
  const items = (j.documents || []).map((d) => {
    const o = {}; for (const k in (d.fields || {})) o[k] = unwrap(d.fields[k]); return o;
  }).filter((o) => o.activo !== false).sort((a, b) => (a.orden || 999) - (b.orden || 999));

  const cols = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand'];
  const filas = [cols.join(',')];
  const sinFoto = [];
  let n = 0;
  for (const p of items) {
    const img = fotoPublica(p);
    if (!img) { sinFoto.push(p.ref); continue; } // Meta exige image_link público
    const cat = ({ deportivas: 'Deportivas', casuales: 'Casuales', urbanas: 'Urbanas' })[p.cat] || (p.cat || '');
    const title = ('Ref ' + p.ref + ' · ' + (marcaBonita(p) !== 'VarMan Crew' ? marcaBonita(p) + ' ' : '') + cat).trim();
    const desc = (p.descripcion || (cat + ' VarMan Crew, tallas 36-45. Envíos a todo Colombia.')).slice(0, 500);
    filas.push([
      csvCampo(p.ref),
      csvCampo(title),
      csvCampo(desc),
      csvCampo('in stock'),
      csvCampo('new'),
      csvCampo((Math.round(Number(p.precio) || 0)) + ' COP'),
      csvCampo(TIENDA_URL + '?ref=' + p.ref),
      csvCampo(img),
      csvCampo(marcaBonita(p))
    ].join(','));
    n++;
  }

  fs.writeFileSync(SALIDA, filas.join('\n') + '\n', 'utf8');
  console.log('OK -> ' + SALIDA + '  (' + n + ' productos)');
  if (sinFoto.length) {
    console.log('\n⚠ ' + sinFoto.length + ' refs SIN foto pública (no van al feed; súbeles una foto pública desde la web):');
    console.log('   ' + sinFoto.join(', '));
  }
})().catch((e) => { console.error('ERROR:', e); process.exit(1); });
