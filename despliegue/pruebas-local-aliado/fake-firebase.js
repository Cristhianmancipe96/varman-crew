// Firebase de mentira, en memoria, SOLO para probar la app en el navegador sin
// tocar la nube. Imita lo que la app usa de Firestore/Auth compat y además hace
// de "reglas": si la sesión es de un LOCAL y la app intenta leer algo que las
// reglas reales le negarían, responde permission-denied y lo anota en
// window.__negados (así se ve si la app del local pide algo que no debe).
(function () {
  var q = new URLSearchParams(location.search);
  var COMO = q.get("como") || "local";
  var CORREOS = { local: "larolastore1@gmail.com", socio: "c.mancipe.96@gmail.com", vendedor: "varmansneakersandclothes@gmail.com" };
  var email = CORREOS[COMO] || COMO;
  var esLocal = email === CORREOS.local;
  var PERMITIDO_LOCAL = { vitrina: "rw", sales: "rw", fotos: "r", products: "w" };

  var store = {};      // path de colección → { id: data }
  var oyentes = {};    // path de colección → [fn]
  window.__store = store;
  window.__negados = [];
  window.__escrituras = [];

  function col(path) { return store[path] || (store[path] = {}); }
  function nombreCol(path) { var p = path.split("/"); return p[p.length - 1]; }
  function negar(op, path) {
    if (!esLocal) return null;
    var n = nombreCol(path);
    if (path.split("/").length === 1) return null; // colección raíz "tiendas": el doc de la tienda se lee
    var perm = PERMITIDO_LOCAL[n] || "";
    if (perm.indexOf(op) !== -1) return null;
    window.__negados.push(op + " " + path);
    var e = new Error("Missing or insufficient permissions. (" + op + " " + path + ")");
    e.code = "permission-denied";
    return e;
  }
  function avisar(path) {
    setTimeout(function () { (oyentes[path] || []).slice().forEach(function (fn) { fn(); }); }, 0);
  }
  function clon(x) { return JSON.parse(JSON.stringify(x)); }
  function docSnap(path, id) {
    var d = col(path)[id];
    return { id: id, exists: d !== undefined, data: function () { return d === undefined ? undefined : clon(d); }, metadata: { fromCache: false } };
  }
  function aplicar(actual, cambios) {
    var out = actual ? clon(actual) : {};
    Object.keys(cambios).forEach(function (k) {
      var v = cambios[k];
      if (v && v.__inc !== undefined) out[k] = (Number(out[k]) || 0) + v.__inc;
      else if (v && v.__del) delete out[k];
      else out[k] = v;
    });
    return out;
  }

  function Query(path, filtros) { this.path = path; this.filtros = filtros || []; }
  Query.prototype.where = function (f, op, v) { return new Query(this.path, this.filtros.concat([[f, op, v]])); };
  Query.prototype._docs = function () {
    var self = this, c = col(this.path);
    return Object.keys(c).filter(function (id) {
      return self.filtros.every(function (fl) { return fl[1] === "==" ? c[id][fl[0]] === fl[2] : true; });
    }).map(function (id) { return docSnap(self.path, id); });
  };
  Query.prototype._snap = function (previos) {
    var docs = this._docs();
    var ids = {}; docs.forEach(function (d) { ids[d.id] = JSON.stringify(d.data()); });
    var cambios = [];
    docs.forEach(function (d) {
      if (!(d.id in previos)) cambios.push({ type: "added", doc: d });
      else if (previos[d.id] !== ids[d.id]) cambios.push({ type: "modified", doc: d });
    });
    Object.keys(previos).forEach(function (id) { if (!(id in ids)) cambios.push({ type: "removed", doc: { id: id, data: function () { return JSON.parse(previos[id]); } } }); });
    return { snap: { docs: docs, empty: docs.length === 0, size: docs.length, forEach: function (fn) { docs.forEach(fn); }, docChanges: function () { return cambios; }, metadata: { fromCache: false } }, ids: ids };
  };
  Query.prototype.onSnapshot = function (ok, err) {
    var self = this;
    // Una consulta de `sales` SIN filtrar por su correo se rechaza entera (como las reglas reales)
    var e = negar("r", this.path);
    if (!e && esLocal && nombreCol(this.path) === "sales" && !this.filtros.some(function (f) { return f[0] === "local" && f[2] === email; })) {
      window.__negados.push("r " + this.path + " (sin filtro por local)");
      e = new Error("permission-denied: sales sin filtro"); e.code = "permission-denied";
    }
    if (e) { setTimeout(function () { err && err(e); }, 0); return function () {}; }
    var previos = {};
    var fn = function () { var r = self._snap(previos); previos = r.ids; ok(r.snap); };
    (oyentes[this.path] = oyentes[this.path] || []).push(fn);
    setTimeout(fn, 30);
    return function () { oyentes[self.path] = (oyentes[self.path] || []).filter(function (x) { return x !== fn; }); };
  };
  Query.prototype.get = function () {
    var e = negar("r", this.path);
    if (e) return Promise.reject(e);
    return Promise.resolve(this._snap({}).snap);
  };

  function Coleccion(path) { Query.call(this, path, []); }
  Coleccion.prototype = Object.create(Query.prototype);
  Coleccion.prototype.doc = function (id) { return new Doc(this.path, String(id === undefined ? "auto" + Math.random().toString(36).slice(2) : id)); };
  Coleccion.prototype.add = function (data) { var d = this.doc(); return d.set(data).then(function () { return d; }); };

  function Doc(path, id) { this.colPath = path; this.id = id; }
  Doc.prototype.collection = function (n) { return new Coleccion(this.colPath + "/" + this.id + "/" + n); };
  Doc.prototype._escribir = function (tipo, data, opts) {
    var e = negar("w", this.colPath);
    if (e) return e;
    var c = col(this.colPath);
    if (tipo === "delete") delete c[this.id];
    else if (tipo === "update") {
      if (c[this.id] === undefined) { var ne = new Error("No document to update: " + this.colPath + "/" + this.id); ne.code = "not-found"; return ne; }
      c[this.id] = aplicar(c[this.id], data);
    } else c[this.id] = opts && opts.merge ? aplicar(c[this.id], data) : aplicar(null, data);
    window.__escrituras.push(tipo + " " + this.colPath + "/" + this.id);
    return null;
  };
  Doc.prototype.set = function (data, opts) { var e = this._escribir("set", data, opts); if (e) return Promise.reject(e); avisar(this.colPath); return Promise.resolve(); };
  Doc.prototype.update = function (data) { var e = this._escribir("update", data); if (e) return Promise.reject(e); avisar(this.colPath); return Promise.resolve(); };
  Doc.prototype.delete = function () { var e = this._escribir("delete"); if (e) return Promise.reject(e); avisar(this.colPath); return Promise.resolve(); };
  Doc.prototype.get = function () { var e = negar("r", this.colPath); return e ? Promise.reject(e) : Promise.resolve(docSnap(this.colPath, this.id)); };
  Doc.prototype.onSnapshot = function (ok, err) {
    var self = this;
    var fn = function () { ok(docSnap(self.colPath, self.id)); };
    (oyentes[this.colPath] = oyentes[this.colPath] || []).push(fn);
    setTimeout(fn, 30);
    return function () { oyentes[self.colPath] = (oyentes[self.colPath] || []).filter(function (x) { return x !== fn; }); };
  };

  function Batch() { this.ops = []; }
  Batch.prototype.set = function (ref, data, opts) { this.ops.push([ref, "set", data, opts]); return this; };
  Batch.prototype.update = function (ref, data) { this.ops.push([ref, "update", data]); return this; };
  Batch.prototype.delete = function (ref) { this.ops.push([ref, "delete"]); return this; };
  Batch.prototype.commit = function () {
    // atómico: si una operación falla, se deshace todo
    var respaldo = JSON.stringify(store), tocadas = {};
    for (var i = 0; i < this.ops.length; i++) {
      var o = this.ops[i];
      var e = o[0]._escribir(o[1], o[2], o[3]);
      // regla real: el stock nunca queda negativo
      if (!e && o[1] === "update" && esLocal) {
        var d = col(o[0].colPath)[o[0].id];
        if (d && Number(d.stock) < 0) { e = new Error("permission-denied: stock negativo"); e.code = "permission-denied"; }
      }
      if (e) { var r = JSON.parse(respaldo); Object.keys(store).forEach(function (k) { delete store[k]; }); Object.keys(r).forEach(function (k) { store[k] = r[k]; }); return Promise.reject(e); }
      tocadas[o[0].colPath] = 1;
    }
    Object.keys(tocadas).forEach(avisar);
    return Promise.resolve();
  };

  var db = {
    collection: function (n) { return new Coleccion(n); },
    batch: function () { return new Batch(); },
    enablePersistence: function () { return Promise.resolve(); },
  };
  var usuario = { email: email, uid: "u1" };
  var authOyentes = [];
  var authObj = {
    onAuthStateChanged: function (fn) { authOyentes.push(fn); setTimeout(function () { fn(usuario); }, 10); return function () {}; },
    signInWithEmailAndPassword: function () { return Promise.resolve({ user: usuario }); },
    signOut: function () { usuario = null; authOyentes.forEach(function (fn) { fn(null); }); return Promise.resolve(); },
  };
  var firestoreFn = function () { return db; };
  firestoreFn.FieldValue = {
    increment: function (n) { return { __inc: n }; },
    delete: function () { return { __del: true }; },
    serverTimestamp: function () { return new Date().toISOString(); },
  };
  window.firebase = { initializeApp: function () {}, firestore: firestoreFn, auth: function () { return authObj; } };

  // ---- Datos de prueba (inventados; nada viene de la nube) ----
  var P = "tiendas/varman/products";
  var semillas = [
    ["VRM051", "ADIDAS SAMBA", "NEGRO", 210000, 120000, { "": 0, 38: 2, 39: 1, 40: 3, 41: 0 }],
    ["VRM060", "PUMA SPEEDCAT BALLET", "ROSADO", 189000, 95000, { 36: 1, 37: 4, 38: 2 }],
    ["VRM012", "NEW BALANCE 530", "BLANCO", 245000, 150000, { 40: 1, 42: 2 }],
    ["VRM099", "NIKE DUNK", "AGOTADO", 260000, 170000, { 39: 0, 40: 0 }],
  ];
  semillas.forEach(function (s) {
    Object.keys(s[5]).forEach(function (t) {
      var id = t === "" ? s[0] : s[0] + "-" + t;
      col(P)[id] = { id: id, referencia: id, modelo: s[1], color: s[2], talla: String(t), precio: s[3], costo: s[4], stock: s[5][t] };
    });
  });
  var hoy = new Date(); var pad = function (x) { return String(x).padStart(2, "0"); };
  var HOY = hoy.getFullYear() + "-" + pad(hoy.getMonth() + 1) + "-" + pad(hoy.getDate());
  var ay = new Date(hoy.getTime() - 86400000); var AYER = ay.getFullYear() + "-" + pad(ay.getMonth() + 1) + "-" + pad(ay.getDate());
  col("tiendas/varman/sales")["s100"] = { id: "s100", productoId: "VRM012-42", fecha: HOY, modelo: "NEW BALANCE 530", talla: "42", precio: 245000, costo: 150000, cantidad: 1, canal: "tienda", origen: "bunker" };
  col("tiendas/varman/sales")["s101"] = { id: "s101", productoId: "VRM060-37", fecha: AYER, modelo: "PUMA SPEEDCAT BALLET", talla: "37", precio: 189000, cantidad: 1, canal: "local", origen: "manual", local: CORREOS.local, localNombre: "La Rola Store", cliente: "" };
  col("tiendas")["varman"] = {};
  // ?vitrina=llena simula que un celular del equipo ya la sincronizó
  if (q.get("vitrina") !== "vacia") {
    Object.keys(col(P)).forEach(function (id) { var p = clon(col(P)[id]); delete p.costo; col("tiendas/varman/vitrina")[id] = p; });
  }
})();
