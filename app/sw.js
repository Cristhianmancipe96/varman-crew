// Service worker de VarMan: habilita "Instalar app" y soporte sin conexión.
const CACHE = "varman-v1";
const CORE = [
  "./",
  "./index.html",
  "./app.jsx",
  "./manifest.json",
  "./icon.png",
  "./vendor/react.development.js",
  "./vendor/react-dom.development.js",
  "./vendor/babel.min.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  // Solo manejamos archivos de la propia app. Firebase/Google van directo a la red.
  if (new URL(req.url).origin !== location.origin) return;
  // Red primero (para recibir actualizaciones); si no hay internet, usa la caché.
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((m) => m || caches.match("./index.html")))
  );
});
