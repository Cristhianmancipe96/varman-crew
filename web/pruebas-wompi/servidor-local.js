// ============ Servidor LOCAL de pruebas — compra web con Wompi (SANDBOX) ============
// Sirve web\publicar en http://localhost:8788 y ejecuta _worker.js igual que lo
// haría Cloudflare Pages, tomando las llaves de PRUEBA del .env del bot (no las
// copia a ningún archivo: solo las carga en memoria).
//
// SOLO corre en sandbox: si la llave no es prv_test_..., se niega a arrancar.
//
// Uso (desde esta carpeta):
//   ..\..\bot_n8n\herramientas\node\node.exe servidor-local.js
const fs = require('fs'), path = require('path'), http = require('http');
const { pathToFileURL } = require('url');

const RAIZ = path.resolve(__dirname, '..', 'publicar');
const ENV_BOT = path.resolve(__dirname, '..', '..', 'bot_n8n', '.env');
const PUERTO = 8788;

function leerEnv(archivo) {
  const out = {};
  fs.readFileSync(archivo, 'utf8').split(/\r?\n/).forEach((l) => {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  });
  return out;
}
const envBot = leerEnv(ENV_BOT);
// ⚠ Hallazgo 2026-07-11: en el .env del bot las llaves Wompi quedaron con el
// prefijo PEGADO DOS VECES (pub_test_pub_test_..., etc.). Aquí se corrige en
// memoria; el .env lo arregla el dueño (anotado en NOTA-WEB-COMPRA-WOMPI).
function dedupPrefijo(v, pref) {
  v = String(v || '');
  while (v.indexOf(pref + pref) === 0) v = v.slice(pref.length);
  return v;
}
const env = {
  WOMPI_PRV_KEY: dedupPrefijo(envBot.WOMPI_PRV_KEY, 'prv_test_'),
  WOMPI_ENV: 'test', // SIEMPRE sandbox en local, sin importar el .env
  FIREBASE_SA_B64: envBot.FIREBASE_SA_B64 || '',
};
if (!/^prv_test_/.test(env.WOMPI_PRV_KEY)) {
  console.error('⚠ WOMPI_PRV_KEY del .env del bot no es de PRUEBA (prv_test_...).');
  console.error('  Este servidor solo funciona en sandbox. No arranca.');
  process.exit(1);
}
if (!env.FIREBASE_SA_B64) {
  console.error('⚠ Falta FIREBASE_SA_B64 en el .env del bot.');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4',
  '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon',
  '.json': 'application/json',
};
const ASSETS = {
  async fetch(request) {
    const u = new URL(request.url);
    let p = decodeURIComponent(u.pathname);
    if (p === '/' || p === '') p = '/index.html';
    const archivo = path.resolve(path.join(RAIZ, p));
    if (!archivo.startsWith(RAIZ)) return new Response('no', { status: 403 });
    try {
      const data = fs.readFileSync(archivo);
      const tipo = MIME[path.extname(archivo).toLowerCase()] || 'application/octet-stream';
      return new Response(data, { headers: { 'Content-Type': tipo } });
    } catch (e) {
      return new Response('404 — no existe ' + p, { status: 404 });
    }
  },
};

(async () => {
  const worker = (await import(pathToFileURL(path.join(RAIZ, '_worker.js')).href)).default;
  http.createServer(async (req, res) => {
    try {
      const trozos = [];
      await new Promise((ok) => { req.on('data', (c) => trozos.push(c)); req.on('end', ok); });
      const cuerpo = Buffer.concat(trozos);
      const request = new Request('http://localhost:' + PUERTO + req.url, {
        method: req.method,
        headers: req.headers,
        body: req.method === 'GET' || req.method === 'HEAD' ? undefined : cuerpo,
      });
      const r = await worker.fetch(request, { ...env, ASSETS }, {});
      res.writeHead(r.status, Object.fromEntries(r.headers));
      res.end(Buffer.from(await r.arrayBuffer()));
    } catch (e) {
      console.error('error sirviendo', req.url, '—', e && e.message);
      res.writeHead(500);
      res.end('error');
    }
  }).listen(PUERTO, () => {
    console.log('✅ Pruebas SANDBOX en http://localhost:' + PUERTO);
    console.log('   (la página lee el catálogo real; el pago usa Wompi sandbox)');
  });
})();
