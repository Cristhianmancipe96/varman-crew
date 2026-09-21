// Prueba las reglas SIN publicarlas: la API firebaserules `projects:test` las
// compila y simula cada caso (solo lectura: no cambia nada en el proyecto).
// Uso: TOKEN=$(gcloud auth print-access-token) node probar_reglas.js
const fs = require("fs");
const txt = fs.readFileSync(require("path").join(__dirname, "..", "..", "app", "reglas-firestore.txt"), "utf8").replace(/\r\n/g, "\n");
const partes = txt.split(/^-{60,}$/m);
const content = partes[1];
if (!content || !content.includes("rules_version")) throw new Error("no encontré el bloque de reglas");

const BASE = "/databases/(default)/documents/tiendas/varman/";
const LOCAL = "larolastore1@gmail.com", SOCIO = "c.mancipe.96@gmail.com", VEND = "varmansneakersandclothes@gmail.com";
const HOY_UTC = "2026-09-21T15:00:00Z";      // 10:00 am en Colombia del 21
const MADRUGADA_UTC = "2026-09-22T03:30:00Z"; // 10:30 pm en Colombia del 21 (ya es 22 en UTC)
const auth = (email) => (email ? { uid: "u-" + email, token: { email } } : null);
const mock = (fn, result) => ({ function: fn, args: [{ anyValue: {} }], result: { value: result } });

const venta = (extra = {}) => ({
  id: "s1", productoId: "VRM001-40", fecha: "2026-09-21", cliente: "", modelo: "X", talla: "40",
  precio: 200000, cantidad: 1, canal: "local", origen: "manual", local: LOCAL, localNombre: "La Rola Store", ...extra,
});
const prod = (stock, extra = {}) => ({ id: "VRM001-40", referencia: "VRM001-40", modelo: "X", color: "", talla: "40", precio: 200000, costo: 120000, stock, ...extra });

const casos = [];
const caso = (nombre, expectation, c) => casos.push({ nombre, tc: { expectation, ...c } });
const req = (email, method, path, time, resourceData) => ({
  auth: auth(email), method, path: BASE + path, time: time || HOY_UTC,
  ...(resourceData ? { resource: { data: resourceData } } : {}),
});

// ---- LOCAL: ventas ----
caso("local crea venta de HOY descontando el par", "ALLOW", {
  request: req(LOCAL, "create", "sales/s1", HOY_UTC, venta()),
  functionMocks: [mock("getAfter", { data: prod(2, { movLocal: "s1" }) })],
});
caso("local crea venta a las 10:30pm Colombia (ya es mañana en UTC)", "ALLOW", {
  request: req(LOCAL, "create", "sales/s1", MADRUGADA_UTC, venta()),
  functionMocks: [mock("getAfter", { data: prod(2, { movLocal: "s1" }) })],
});
caso("local crea venta con fecha de AYER", "DENY", {
  request: req(LOCAL, "create", "sales/s1", HOY_UTC, venta({ fecha: "2026-09-20" })),
  functionMocks: [mock("getAfter", { data: prod(2, { movLocal: "s1" }) })],
});
caso("local crea venta con fecha de MAÑANA", "DENY", {
  request: req(LOCAL, "create", "sales/s1", HOY_UTC, venta({ fecha: "2026-09-22" })),
  functionMocks: [mock("getAfter", { data: prod(2, { movLocal: "s1" }) })],
});
caso("local crea venta SIN descontar el par (producto no tocado)", "DENY", {
  request: req(LOCAL, "create", "sales/s1", HOY_UTC, venta()),
  functionMocks: [mock("getAfter", { data: prod(3) })],
});
caso("local crea venta con campo costo", "DENY", {
  request: req(LOCAL, "create", "sales/s1", HOY_UTC, venta({ costo: 1 })),
  functionMocks: [mock("getAfter", { data: prod(2, { movLocal: "s1" }) })],
});
caso("local crea venta a nombre de OTRO correo", "DENY", {
  request: req(LOCAL, "create", "sales/s1", HOY_UTC, venta({ local: SOCIO })),
  functionMocks: [mock("getAfter", { data: prod(2, { movLocal: "s1" }) })],
});
caso("local crea venta ya anulada", "DENY", {
  request: req(LOCAL, "create", "sales/s1", HOY_UTC, venta({ anulada: true })),
  functionMocks: [mock("getAfter", { data: prod(2, { movLocal: "s1" }) })],
});
caso("local EDITA una venta suya", "DENY", {
  request: req(LOCAL, "update", "sales/s1", HOY_UTC, venta({ precio: 1 })),
  resource: { data: venta() },
});
caso("local lee una venta suya", "ALLOW", { request: req(LOCAL, "get", "sales/s1"), resource: { data: venta() } });
caso("local lee una venta de VarMan", "DENY", { request: req(LOCAL, "get", "sales/s9"), resource: { data: { id: "s9", fecha: "2026-09-21", precio: 1, costo: 1 } } });
caso("local borra venta suya de HOY devolviendo el par", "ALLOW", {
  request: req(LOCAL, "delete", "sales/s1"), resource: { data: venta() },
  functionMocks: [mock("getAfter", { data: prod(3, { movLocal: "s1" }) }), mock("get", { data: prod(2, { movLocal: "s1" }) })],
});
caso("local borra venta suya de hoy SIN devolver el par", "DENY", {
  request: req(LOCAL, "delete", "sales/s1"), resource: { data: venta() },
  functionMocks: [mock("getAfter", { data: prod(2, { movLocal: "s1" }) }), mock("get", { data: prod(2, { movLocal: "s1" }) })],
});
caso("local borra venta suya de AYER", "DENY", {
  request: req(LOCAL, "delete", "sales/s1"), resource: { data: venta({ fecha: "2026-09-20" }) },
  functionMocks: [mock("getAfter", { data: prod(3, { movLocal: "s1" }) }), mock("get", { data: prod(2, { movLocal: "s1" }) })],
});
caso("local borra venta suya que VarMan anuló", "DENY", {
  request: req(LOCAL, "delete", "sales/s1"), resource: { data: venta({ anulada: true }) },
  functionMocks: [mock("getAfter", { data: prod(3, { movLocal: "s1" }) }), mock("get", { data: prod(2, { movLocal: "s1" }) })],
});

// ---- LOCAL: productos / vitrina ----
caso("local LEE products (ahí va el costo)", "DENY", { request: req(LOCAL, "get", "products/VRM001-40"), resource: { data: prod(3) } });
caso("local LISTA products", "DENY", { request: req(LOCAL, "list", "products/VRM001-40"), resource: { data: prod(3) } });
caso("local baja stock 3→2 con venta nueva de 1 par", "ALLOW", {
  request: req(LOCAL, "update", "products/VRM001-40", HOY_UTC, prod(2, { movLocal: "s1" })), resource: { data: prod(3) },
  functionMocks: [mock("exists", false), mock("existsAfter", true), mock("getAfter", { data: venta() })],
});
caso("local baja stock 3→0 con venta de 1 par", "DENY", {
  request: req(LOCAL, "update", "products/VRM001-40", HOY_UTC, prod(0, { movLocal: "s1" })), resource: { data: prod(3) },
  functionMocks: [mock("exists", false), mock("existsAfter", true), mock("getAfter", { data: venta() })],
});
caso("local SUBE stock 3→9 diciendo que es una venta", "DENY", {
  request: req(LOCAL, "update", "products/VRM001-40", HOY_UTC, prod(9, { movLocal: "s1" })), resource: { data: prod(3) },
  functionMocks: [mock("exists", false), mock("existsAfter", true), mock("getAfter", { data: venta() })],
});
caso("local vende 1 par con stock 0 (quedaría -1)", "DENY", {
  request: req(LOCAL, "update", "products/VRM001-40", HOY_UTC, prod(-1, { movLocal: "s1" })), resource: { data: prod(0) },
  functionMocks: [mock("exists", false), mock("existsAfter", true), mock("getAfter", { data: venta() })],
});
caso("local cambia stock SIN venta (la venta no existe ni antes ni después)", "DENY", {
  request: req(LOCAL, "update", "products/VRM001-40", HOY_UTC, prod(2, { movLocal: "s1" })), resource: { data: prod(3) },
  functionMocks: [mock("exists", false), mock("existsAfter", false)],
});
caso("local cambia el PRECIO de un producto", "DENY", {
  request: req(LOCAL, "update", "products/VRM001-40", HOY_UTC, prod(2, { movLocal: "s1", precio: 1 })), resource: { data: prod(3) },
  functionMocks: [mock("exists", false), mock("existsAfter", true), mock("getAfter", { data: venta() })],
});
caso("local devuelve el par 2→3 al borrar su venta", "ALLOW", {
  request: req(LOCAL, "update", "products/VRM001-40", HOY_UTC, prod(3, { movLocal: "s1" })), resource: { data: prod(2, { movLocal: "s1" }) },
  functionMocks: [mock("exists", true), mock("existsAfter", false), mock("get", { data: venta() })],
});
caso("local usa la venta de OTRO para mover stock", "DENY", {
  request: req(LOCAL, "update", "products/VRM001-40", HOY_UTC, prod(2, { movLocal: "s1" })), resource: { data: prod(3) },
  functionMocks: [mock("exists", false), mock("existsAfter", true), mock("getAfter", { data: venta({ local: SOCIO }) })],
});
caso("local borra un producto", "DENY", { request: req(LOCAL, "delete", "products/VRM001-40"), resource: { data: prod(3) } });
caso("local lee la vitrina", "ALLOW", { request: req(LOCAL, "get", "vitrina/VRM001-40"), resource: { data: { id: "VRM001-40", stock: 3 } } });
caso("local lista la vitrina", "ALLOW", { request: req(LOCAL, "list", "vitrina/VRM001-40"), resource: { data: { id: "VRM001-40", stock: 3 } } });
caso("local mueve stock en la vitrina", "ALLOW", {
  request: req(LOCAL, "update", "vitrina/VRM001-40", HOY_UTC, { id: "VRM001-40", precio: 200000, stock: 2 }), resource: { data: { id: "VRM001-40", precio: 200000, stock: 3 } },
});
caso("local cambia el precio en la vitrina", "DENY", {
  request: req(LOCAL, "update", "vitrina/VRM001-40", HOY_UTC, { id: "VRM001-40", precio: 1, stock: 3 }), resource: { data: { id: "VRM001-40", precio: 200000, stock: 3 } },
});
caso("local lee fotos", "ALLOW", { request: req(LOCAL, "get", "fotos/x"), resource: { data: { key: "x", data: "d" } } });

// ---- LOCAL: todo lo demás, bloqueado ----
["pedidos/p1", "gastos/g1", "bunkerVentas/b1", "bunkerProveedores/b1", "conteos/c1", "botConfig/general", "mapaCatalogo/1", "comprobantes/c1", "pedidosOcultos/p1", "listaEspera/l1"].forEach((path) => {
  caso("local lee " + path, "DENY", { request: req(LOCAL, "get", path), resource: { data: { a: 1 } } });
});
caso("local escribe en fotos", "DENY", { request: req(LOCAL, "create", "fotos/x", HOY_UTC, { key: "x", data: "d" }) });
caso("local escribe en el catálogo web", "DENY", { request: req(LOCAL, "update", "catalogo/1", HOY_UTC, { a: 2 }), resource: { data: { a: 1 } } });

// ---- REGRESIÓN: el equipo sigue igual ----
caso("vendedor lee products", "ALLOW", { request: req(VEND, "get", "products/VRM001-40"), resource: { data: prod(3) } });
caso("vendedor escribe products", "ALLOW", { request: req(VEND, "update", "products/VRM001-40", HOY_UTC, prod(5)), resource: { data: prod(3) } });
caso("vendedor escribe la vitrina", "ALLOW", { request: req(VEND, "create", "vitrina/VRM001-40", HOY_UTC, { id: "VRM001-40", stock: 3 }) });
caso("vendedor crea venta normal", "ALLOW", { request: req(VEND, "create", "sales/s2", HOY_UTC, { id: "s2", fecha: "2026-09-01", precio: 1, costo: 1 }) });
caso("vendedor anula una venta", "DENY", { request: req(VEND, "update", "sales/s2", HOY_UTC, { id: "s2", anulada: true }), resource: { data: { id: "s2" } } });
caso("socio anula la venta de un local", "ALLOW", { request: req(SOCIO, "update", "sales/s1", HOY_UTC, venta({ anulada: true })), resource: { data: venta() } });
caso("vendedor lee la caja", "DENY", { request: req(VEND, "get", "gastos/g1"), resource: { data: { a: 1 } } });
caso("socio escribe la caja", "ALLOW", { request: req(SOCIO, "create", "gastos/g1", HOY_UTC, { a: 1 }) });
caso("vendedor lee Búnker", "ALLOW", { request: req(VEND, "get", "bunkerVentas/b1"), resource: { data: { a: 1 } } });
caso("vendedor escribe conteos", "ALLOW", { request: req(VEND, "create", "conteos/c1", HOY_UTC, { a: 1 }) });
caso("vendedor pausa el bot", "DENY", { request: req(VEND, "update", "botConfig/general", HOY_UTC, { pausado: true }), resource: { data: { pausado: false } } });
caso("anónimo lee products", "DENY", { request: req(null, "get", "products/VRM001-40"), resource: { data: prod(3) } });
caso("anónimo lee el catálogo web", "ALLOW", { request: req(null, "get", "catalogo/1"), resource: { data: { a: 1 } } });
caso("desconocido con cuenta lee la vitrina", "DENY", { request: req("otro@gmail.com", "get", "vitrina/x"), resource: { data: { a: 1 } } });

(async () => {
  const body = { source: { files: [{ name: "firestore.rules", content }] }, testSuite: { testCases: casos.map((c) => c.tc) } };
  const r = await fetch("https://firebaserules.googleapis.com/v1/projects/varman-crew:test", {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.TOKEN, "Content-Type": "application/json", "x-goog-user-project": "varman-crew" },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (j.error) { console.log("ERROR API:", JSON.stringify(j.error).slice(0, 800)); process.exit(2); }
  (j.issues || []).forEach((i) => console.log("ISSUE", i.severity, "L" + (i.sourcePosition && i.sourcePosition.line), i.description));
  let ok = 0, mal = 0;
  (j.testResults || []).forEach((t, i) => {
    const bien = t.state === "SUCCESS";
    bien ? ok++ : mal++;
    if (!bien) console.log("FALLA:", casos[i].nombre, "| esperado", casos[i].tc.expectation, "|", JSON.stringify(t.debugMessages || t.errorPosition || "").slice(0, 300));
  });
  console.log("casos:", casos.length, "· OK:", ok, "· FALLAN:", mal);
})();
