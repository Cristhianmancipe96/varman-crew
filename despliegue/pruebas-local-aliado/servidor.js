// Sirve la carpeta REAL app/ del repo, pero cambiando Firebase por el de mentira
// (fake-firebase.js) y sin service worker. No toca ningún archivo del repo.
const http = require("http"), fs = require("fs"), path = require("path");
const APP = path.join(__dirname, "..", "..", "app").split(path.sep).join("/");
const AQUI = __dirname;
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".jsx": "text/javascript; charset=utf-8", ".json": "application/json", ".png": "image/png" };
http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const enviar = (buf, tipo) => { res.writeHead(200, { "Content-Type": tipo, "Cache-Control": "no-store" }); res.end(buf); };
  if (url === "/" || url === "/index.html") {
    let html = fs.readFileSync(path.join(APP, "index.html"), "utf8");
    html = html.replace(/<script src="https:\/\/www\.gstatic\.com[^>]*><\/script>\s*/g, "");
    html = html.replace('<script src="vendor/babel.min.js"></script>', '<script src="vendor/babel.min.js"></script>\n  <script src="/fake-firebase.js"></script>');
    html = html.replace(/if \("serviceWorker" in navigator\)/, "if (false)");
    return enviar(html, TIPOS[".html"]);
  }
  if (url === "/fake-firebase.js") return enviar(fs.readFileSync(path.join(AQUI, "fake-firebase.js")), TIPOS[".js"]);
  const f = path.join(APP, url);
  if (!f.replace(/\\/g, "/").startsWith(APP) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("no"); }
  enviar(fs.readFileSync(f), TIPOS[path.extname(f)] || "application/octet-stream");
}).listen(8077, () => console.log("prueba en http://localhost:8077"));
