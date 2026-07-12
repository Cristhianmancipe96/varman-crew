// React, ReactDOM y Babel se cargan desde la carpeta vendor/ (ver index.html).
// Por eso aquí usamos el React global en vez de "import".
const { useState, useEffect, useRef } = React;

// ============================================================
// VARMAN CREW — Inventario inteligente v2
// Mejoras v2:
//  · Guardado robusto (window.storage + respaldo localStorage)
//  · Registrar venta manual (sin foto)
//  · Confirmación antes de eliminar productos
//  · Exportar inventario y ventas a CSV (abre en Excel)
//  · Logo de VarMan: toca el cuadro "VC" de la cabecera y sube
//    "logo naranja.png" — queda guardado dentro de la app
// ============================================================

const FONT_LINK =
  "https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,75,500..900&family=Inter:wght@400;500;600;700;800&display=swap";

const C = {
  bg: "#F4F4F2",
  card: "#FFFFFF",
  ink: "#101012",
  ink2: "#3A3A3E",
  muted: "#7E7E85",
  line: "#E8E8E5",
  accent: "#FF5A1F",
  accentSoft: "#FFF0E9",
  green: "#0E8A4D",
  greenSoft: "#E8F6EE",
  red: "#D7320F",
  redSoft: "#FDEDE8",
};

const STORAGE_KEY = "varman-tienda-v1";

// ---------- Firebase: sincronización en la nube (compartida entre celulares) ----------
// La config de Firebase web es pública por diseño; la seguridad va por las reglas
// de Firestore. Todos los dispositivos del equipo comparten el mismo espacio "TIENDA".
const firebaseConfig = {
  apiKey: "AIzaSyAXBMaIEcgxywp_JVVQgmpPUyscCJGC6Sg",
  authDomain: "varman-crew.firebaseapp.com",
  projectId: "varman-crew",
  storageBucket: "varman-crew.firebasestorage.app",
  messagingSenderId: "295709808500",
  appId: "1:295709808500:web:657236dec171dc23eefe21",
};
const TIENDA = "varman"; // espacio de trabajo compartido del equipo

let db = null;
let auth = null;
try {
  if (typeof firebase !== "undefined" && firebase.initializeApp) {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    // Funciona offline y sincroniza al volver la conexión
    try { db.enablePersistence({ synchronizeTabs: true }); } catch (e) {}
    if (firebase.auth) auth = firebase.auth();
  }
} catch (e) {
  console.warn("Firebase no disponible, la app sigue en modo local:", e && e.message);
}

// Traduce los códigos de error de login a mensajes claros
function authErrMsg(code) {
  const m = {
    "auth/invalid-email": "El correo no es válido.",
    "auth/user-disabled": "Este usuario está deshabilitado.",
    "auth/user-not-found": "No existe una cuenta con ese correo.",
    "auth/wrong-password": "Contraseña incorrecta.",
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/too-many-requests": "Demasiados intentos. Espera un momento.",
    "auth/network-request-failed": "Sin conexión. Revisa tu internet.",
  };
  return m[code] || "No se pudo iniciar sesión. Intenta de nuevo.";
}

const fbReady = () => !!db;
const colRef = (name) => db.collection("tiendas").doc(TIENDA).collection(name);
const metaRef = () => db.collection("tiendas").doc(TIENDA);

// Escribe en la nube SOLO lo que cambió entre dos listas (no pisa lo de los demás)
async function fbSyncList(name, oldArr, newArr) {
  if (!db) return;
  const oldById = {};
  (oldArr || []).forEach((x) => { if (x && x.id != null) oldById[x.id] = x; });
  const newById = {};
  (newArr || []).forEach((x) => { if (x && x.id != null) newById[x.id] = x; });
  const ops = [];
  Object.keys(newById).forEach((id) => {
    const o = oldById[id], n = newById[id];
    if (!o || JSON.stringify(o) !== JSON.stringify(n)) ops.push(colRef(name).doc(String(id)).set(n));
  });
  Object.keys(oldById).forEach((id) => {
    if (!newById[id]) ops.push(colRef(name).doc(String(id)).delete());
  });
  try { await Promise.all(ops); } catch (e) { console.warn("Error sincronizando " + name + ":", e && e.message); }
}

// ---------- Lectura de fotos del cuaderno (IA) ----------
// IMPORTANTE (seguridad): el análisis NO debe llamar a api.anthropic.com
// directamente desde el navegador, porque:
//   1) La API key quedaría visible para cualquiera que abra la app.
//   2) El navegador bloquea esa llamada (CORS).
// Por eso se llama a TU propio servidor (un "proxy" mínimo) que guarda la
// key en secreto y reenvía la petición a Anthropic. Cambia esta URL por la
// de tu servidor cuando lo tengas listo.
const SCAN_API_URL = "/api/analizar-cuaderno";

// ---------- Guardado robusto: window.storage y respaldo en localStorage ----------
const store = {
  async get(key) {
    try {
      if (typeof window !== "undefined" && window.storage) {
        const r = await window.storage.get(key);
        if (r && r.value) return r.value;
      }
    } catch (e) {}
    try {
      const v = window.localStorage.getItem(key);
      if (v) return v;
    } catch (e) {}
    return null;
  },
  async set(key, value) {
    let ok = false;
    try {
      if (typeof window !== "undefined" && window.storage) {
        await window.storage.set(key, value);
        ok = true;
      }
    } catch (e) {}
    try {
      window.localStorage.setItem(key, value);
      ok = true;
    } catch (e) {}
    return ok;
  },
};

const display = (size, color = C.ink) => ({
  fontFamily: "'Archivo', system-ui, sans-serif",
  fontWeight: 900,
  fontStretch: "75%",
  letterSpacing: "0.01em",
  fontSize: size,
  color,
  lineHeight: 1.05,
});

const eyebrow = (color = C.muted) => ({
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color,
});

const cardStyle = (extra = {}) => ({
  background: C.card,
  borderRadius: 18,
  boxShadow: "0 1px 2px rgba(16,16,18,.05), 0 8px 24px rgba(16,16,18,.06)",
  ...extra,
});

const fmt = (n) => "$" + (Number(n) || 0).toLocaleString("es-CO");

// Fecha de HOY en hora LOCAL (Colombia, UTC-5), NO en UTC.
// Antes se usaba new Date().toISOString() que de noche daba la fecha del día
// siguiente y registraba las ventas con fecha equivocada.
const hoyLocal = () => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};

const emptyProduct = () => ({
  id: "p" + Date.now() + Math.floor(Math.random() * 999),
  referencia: "",
  modelo: "",
  color: "",
  talla: "",
  stock: 0,
  costo: "",
  precio: "",
});

// Tallas EUR estándar de la tienda
const TALLAS = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45];

// ---------- Pedidos del bot de WhatsApp ----------
// Los pedidos los CREA el bot (bot_n8n\workflows\bot-whatsapp-v4-pedidos.json)
// en la colección "pedidos". El esquema lo define el bot y está CONGELADO:
// cualquier cambio se pide por escrito en bot_n8n\briefs\CAMBIOS-PEDIDOS.md.
// El bot solo escribe los estados iniciales; la app gestiona el resto:
//   nuevo / pagado_por_verificar → verificado → enviado → entregado (+ cancelado)
// La app SOLO modifica "estado", "notas" y "actualizado"; los demás campos son
// del bot y no se tocan.
const ESTADOS_PEDIDO = {
  nuevo: { label: "Nuevo", color: "#B45309", soft: "#FEF3C7", siguiente: "verificado", accion: "✓ Pago verificado" },
  pagado_por_verificar: { label: "Pago por verificar", color: "#B45309", soft: "#FEF3C7", siguiente: "verificado", accion: "✓ Pago verificado" },
  // Estados Wompi (v6, CAMBIOS-PEDIDOS.md): el link se envió pero el cliente aún
  // no paga (pago_pendiente) → el webhook confirma el pago (pago_confirmado,
  // equivale a "verificado": pago OK, listo para alistar el envío).
  pago_pendiente: { label: "Pendiente de pago", color: "#8A6D00", soft: "#FDF6DE", siguiente: "verificado", accion: "✓ Pago verificado" },
  pago_confirmado: { label: "Pago confirmado", color: "#0B69C7", soft: "#E7F1FC", siguiente: "enviado", accion: "📦 Marcar como enviado" },
  verificado: { label: "Verificado", color: "#0B69C7", soft: "#E7F1FC", siguiente: "enviado", accion: "📦 Marcar como enviado" },
  enviado: { label: "Enviado", color: "#6D3FC0", soft: "#F1EAFB", siguiente: "entregado", accion: "🏁 Marcar como entregado" },
  entregado: { label: "Entregado", color: C.green, soft: C.greenSoft, siguiente: null },
  cancelado: { label: "Cancelado", color: C.red, soft: C.redSoft, siguiente: null },
};

// El bot hoy escribe el literal "pagado (por verificar)" (con espacios); el
// contrato dice "pagado_por_verificar". Se toleran AMBOS mientras el Agente 1
// lo corrige (anotado en CAMBIOS-PEDIDOS.md). Cualquier valor desconocido se
// trata como "nuevo" para que el pedido nunca se pierda de la vista.
const normEstadoPedido = (e) => {
  const s = String(e || "").toLowerCase().trim();
  if (ESTADOS_PEDIDO[s]) return s;
  if (s.indexOf("pagado") === 0) return "pagado_por_verificar";
  return "nuevo";
};

// "2026-07-06T15:04:05.000Z" → "domingo 6 jul 2026, 10:04 a. m." (hora local)
function fmtFechaPedido(iso) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso || "";
    const pad = (n) => String(n).padStart(2, "0");
    return (
      formatDate(d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate())) +
      ", " + d.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })
    );
  } catch (e) {
    return iso || "";
  }
}

// Fecha para el Excel de pedidos: "2026-07-06T15:04:05.000Z" → "2026-07-06 10:04"
// (hora local; con este formato la columna ordena bien en la hoja de cálculo)
function fechaExportPedido(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso || "";
  const pad = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

// Teléfono para el Excel: con espacios para que Excel lo trate como TEXTO.
// Un número de 12 dígitos seguidos (573202250619) lo mostraría como "5,73E+11".
function telExportPedido(wa) {
  const d = String(wa || "").replace(/\D/g, "");
  if (!d) return "";
  return d.length > 10 ? d.slice(0, d.length - 10) + " " + d.slice(-10, -7) + " " + d.slice(-7) : d;
}

// ---------- Caja de los socios (cierre de caja: gastos + estado de cuenta) ----------
// SOLO estos correos ven la pestaña Caja. Además de esconderla aquí, las
// reglas de Firestore bloquean la colección "gastos" para cualquier otro
// usuario (el vendedor no puede leerla ni por medios técnicos).
const SOCIOS_CAJA = ["c.mancipe.96@gmail.com", "andresvargasm91@gmail.com"];

// Saldo REAL verificado por los socios en su Excel al cierre del 22/06/2026.
// Todo lo anterior a esa fecha ya quedó cuadrado dentro de este número: el
// saldo de ese día SIEMPRE da este valor, y el saldo de hoy solo se mueve
// con los movimientos nuevos (posteriores al ancla).
const ANCLA_CAJA = { fecha: "2026-06-22", saldo: 2548119 };

const GASTOS_KEY = "varman-gastos-v1";

const CATS_GASTO = [
  { id: "arriendo", label: "Arriendo" },
  { id: "nomina", label: "Nómina" },
  { id: "pauta", label: "Publicidad (Meta)" },
  { id: "banco", label: "Banco / cuota" },
  { id: "compra", label: "Compra inventario" },
  { id: "otro", label: "Otro" },
];

// Categorías para INGRESOS adicionales (plata que entra a la caja y no es venta)
const CATS_INGRESO = [
  { id: "aporte", label: "Aporte de socios" },
  { id: "prestamo", label: "Préstamo" },
  { id: "otro", label: "Otro ingreso" },
];

// Gastos históricos del Excel de cierre de caja (27/05 → 22/06/2026).
// Ids fijos para que el sembrado a la nube sea idempotente (nunca duplica).
const GASTOS_INICIALES = [
  { id: "g-seed-01", fecha: "2026-05-27", desc: "PAGO ARRIENDO BODEGA", monto: 600000, categoria: "arriendo" },
  { id: "g-seed-02", fecha: "2026-06-01", desc: "PAGO NOMINA MARTIN", monto: 500000, categoria: "nomina" },
  { id: "g-seed-03", fecha: "2026-06-04", desc: "PAGO CAMPAÑA META", monto: 52346, categoria: "pauta" },
  { id: "g-seed-04", fecha: "2026-06-05", desc: "PAGO CAMPAÑA META", monto: 66619, categoria: "pauta" },
  { id: "g-seed-05", fecha: "2026-06-06", desc: "PAGO CAMPAÑA META", monto: 21856, categoria: "pauta" },
  { id: "g-seed-06", fecha: "2026-06-07", desc: "PAGO CAMPAÑA META", monto: 44627, categoria: "pauta" },
  { id: "g-seed-07", fecha: "2026-06-09", desc: "PAGO CAMPAÑA META", monto: 120038, categoria: "pauta" },
  { id: "g-seed-08", fecha: "2026-06-13", desc: "COMPRA ADIDAS MAGMA AZUL", monto: 2160000, categoria: "compra" },
  { id: "g-seed-09", fecha: "2026-06-13", desc: "COMPRA ADIDAS MAGMA GRIS", monto: 2160000, categoria: "compra" },
  { id: "g-seed-10", fecha: "2026-06-13", desc: "COMPRA ADIDAS MAGMA NEGRA", monto: 2160000, categoria: "compra" },
  { id: "g-seed-11", fecha: "2026-06-13", desc: "PAGO CUOTA BANCO", monto: 3000000, categoria: "banco" },
  { id: "g-seed-12", fecha: "2026-06-16", desc: "PAGO NOMINA MARTIN", monto: 500000, categoria: "nomina" },
  { id: "g-seed-13", fecha: "2026-06-20", desc: "COMPRA REEBOK CLASSIC CAFE", monto: 1840000, categoria: "compra" },
  { id: "g-seed-14", fecha: "2026-06-20", desc: "COMPRA REEBOK CLASSIC AZUL", monto: 1760000, categoria: "compra" },
  { id: "g-seed-15", fecha: "2026-06-20", desc: "COMPRA REEBOK CLASSIC GRIS", monto: 1840000, categoria: "compra" },
  // Del Excel de COMPRAS del usuario (2026-07-04). Las tres primeras son
  // anteriores al ancla (22/06): completan el historial pero no mueven el
  // saldo de hoy. La Jordan 3 (25/06) es POSTERIOR al ancla: sin ella la
  // caja mostraría $4.560.000 de más.
  { id: "g-seed-16", fecha: "2026-05-08", desc: "COMPRA ADIDAS BOUNCE AZUL BLANCO", monto: 240000, categoria: "compra" },
  { id: "g-seed-17", fecha: "2026-05-21", desc: "COMPRA ADIDAS EQT BEIGE VERDE NARANJA", monto: 2040000, categoria: "compra" },
  { id: "g-seed-18", fecha: "2026-05-21", desc: "COMPRA ADIDAS EQT CAFE AZUL", monto: 2040000, categoria: "compra" },
  { id: "g-seed-19", fecha: "2026-06-25", desc: "COMPRA JORDAN 3 LEVIS BEIGE", monto: 4560000, categoria: "compra" },
];

// ---------- Fotos del catálogo ----------
// Una foto por MODELO + COLOR (se ve igual en todas las tallas de ese modelo).
// La clave junta modelo y color normalizados para que "Nike  Air" y "nike air"
// se traten igual.
const normTxt = (s) => (s || "").toString().toLowerCase().replace(/\s+/g, " ").trim();
const fotoKey = (modelo, color) => normTxt(modelo) + "|" + normTxt(color);

// Comprime y redimensiona una imagen a un dataURL liviano (JPEG) para que el
// catálogo no se ponga lento ni se llene el almacenamiento del navegador.
function comprimirImagen(file, maxLado = 520, calidad = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const r = Math.min(1, maxLado / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * r));
        canvas.height = Math.max(1, Math.round(img.height * r));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", calidad));
      };
      img.onerror = () => reject(new Error("imagen ilegible"));
      img.src = ev.target.result;
    };
    reader.onerror = () => reject(new Error("archivo ilegible"));
    reader.readAsDataURL(file);
  });
}

// Guardado de fotos en IndexedDB (mucho más espacio que localStorage). Solo se
// guardan las fotos YA ASIGNADAS a un producto, no las 200+ de la carpeta.
// Si IndexedDB no está disponible (ej. abrir el index.html con file://), cae a
// localStorage como respaldo.
const FOTO_DB = "varman-fotos-db";
const FOTO_STORE = "fotos";
const FOTO_LS = "varman-fotos-respaldo";
function idbAbrir() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("sin IndexedDB"));
    const req = indexedDB.open(FOTO_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(FOTO_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
const photoDB = {
  async all() {
    try {
      const db = await idbAbrir();
      return await new Promise((resolve, reject) => {
        const out = {};
        const req = db.transaction(FOTO_STORE, "readonly").objectStore(FOTO_STORE).openCursor();
        req.onsuccess = () => {
          const cur = req.result;
          if (cur) { out[cur.key] = cur.value; cur.continue(); } else resolve(out);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      try { return JSON.parse(window.localStorage.getItem(FOTO_LS) || "{}"); } catch (_) { return {}; }
    }
  },
  async set(key, val) {
    try {
      const db = await idbAbrir();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(FOTO_STORE, "readwrite");
        tx.objectStore(FOTO_STORE).put(val, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      return true;
    } catch (e) {
      try {
        const m = JSON.parse(window.localStorage.getItem(FOTO_LS) || "{}");
        m[key] = val; window.localStorage.setItem(FOTO_LS, JSON.stringify(m));
        return true;
      } catch (_) { return false; }
    }
  },
  async del(key) {
    try {
      const db = await idbAbrir();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(FOTO_STORE, "readwrite");
        tx.objectStore(FOTO_STORE).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      return true;
    } catch (e) {
      try {
        const m = JSON.parse(window.localStorage.getItem(FOTO_LS) || "{}");
        delete m[key]; window.localStorage.setItem(FOTO_LS, JSON.stringify(m));
        return true;
      } catch (_) { return false; }
    }
  },
};

// ---------- Exportar CSV (compatible con Excel en español) ----------
function downloadCSV(rows, filename) {
  // Sanitiza cada celda. Si un texto empieza por = + - @ (o tab), Excel/Sheets
  // podría interpretarlo como fórmula → se antepone ' para neutralizarlo.
  // Los números (incluidos negativos como una ganancia en pérdida) se dejan
  // intactos para que sigan siendo números en la hoja de cálculo.
  const sanitize = (c) => {
    let s = String(c == null ? "" : c);
    const esNumero = /^-?\d+(?:[.,]\d+)?$/.test(s.trim());
    if (!esNumero && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const csv = rows.map((r) => r.map(sanitize).join(";")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }); // ﻿ = BOM para que Excel abra bien las tildes
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Intenta leer un JSON aunque venga con texto/backticks alrededor
function safeParseJSON(text) {
  if (!text) return null;
  const clean = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch (e) {}
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(clean.slice(start, end + 1));
    } catch (e) {}
  }
  return null;
}

// ============================================================
// App principal
// ============================================================
// ============================================================
// Pantalla de inicio de sesión (solo para el equipo)
// ============================================================
function Login({ onSubmit, error, busy }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const darkInput = { background: "rgba(255,255,255,.06)", border: "1.5px solid rgba(255,255,255,.14)", color: "#fff" };
  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(130% 90% at 50% -10%, #1D1D26 0%, #0F0F13 60%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Inter, system-ui, sans-serif" }}>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(email, pass); }} style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={display(30, "#fff")}>VARMAN <span style={{ color: C.accent }}>CREW</span></div>
          <div style={{ color: "rgba(255,255,255,.55)", fontSize: 13, marginTop: 6, fontWeight: 600 }}>Control de bodega</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <input type="email" inputMode="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" style={inputStyle(darkInput)} />
        </div>
        <div style={{ marginBottom: 14, position: "relative" }}>
          <input type={show ? "text" : "password"} autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Contraseña" style={inputStyle({ ...darkInput, paddingRight: 62 })} />
          <button type="button" onClick={() => setShow(!show)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "rgba(255,255,255,.6)", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 6 }}>{show ? "Ocultar" : "Ver"}</button>
        </div>
        {error && (
          <div style={{ background: "rgba(255,90,31,.14)", border: "1px solid rgba(255,90,31,.3)", color: "#FF9A6B", borderRadius: 10, padding: "10px 12px", fontSize: 13, marginBottom: 14, fontWeight: 600 }}>{error}</div>
        )}
        <button type="submit" disabled={busy} style={btnPrimary({ width: "100%", padding: "15px", fontSize: 15, opacity: busy ? 0.6 : 1 })}>
          {busy ? "Entrando…" : "Entrar"}
        </button>
        <div style={{ color: "rgba(255,255,255,.4)", fontSize: 11.5, textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>
          Acceso solo para el equipo de VarMan.
        </div>
      </form>
    </div>
  );
}

function VarmanApp() {
  const [tab, setTab] = useState("inventario");
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [logo, setLogo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [lowOnly, setLowOnly] = useState(false); // ver solo tallas por agotarse
  const [fotos, setFotos] = useState({}); // { "modelo|color": dataURL }
  const [gastos, setGastos] = useState([]); // caja de los socios (gastos + compras)
  const [pedidos, setPedidos] = useState([]); // pedidos que crea el bot de WhatsApp
  // Pedidos ocultados por un socio (de prueba, duplicados…): vive aquí (y no
  // solo dentro de la pestaña Pedidos) para que el contador "N nuevos" de la
  // navegación tampoco los cuente. Ver ocultarPedido/mostrarPedido en Pedidos.
  const [ocultosPedidos, setOcultosPedidos] = useState({});

  // ---------- Sesión (login del equipo) ----------
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!auth); // si no hay Firebase, no se exige login
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    if (!auth) return;
    const unsub = auth.onAuthStateChanged((u) => { setUser(u); setAuthReady(true); });
    return () => unsub();
  }, []);

  const doLogin = async (email, pass) => {
    if (!auth) return;
    setAuthBusy(true);
    setAuthError("");
    try {
      await auth.signInWithEmailAndPassword((email || "").trim(), pass || "");
    } catch (e) {
      setAuthError(authErrMsg(e && e.code));
    }
    setAuthBusy(false);
  };

  const doLogout = async () => {
    if (auth) { try { await auth.signOut(); } catch (e) {} }
  };

  // La pestaña Caja solo existe para los socios (correos en SOCIOS_CAJA).
  // Sin Firebase (modo local de prueba) se muestra para poder revisarla.
  const esSocio = !auth || !!(user && SOCIOS_CAJA.indexOf((user.email || "").toLowerCase()) !== -1);

  // ---------- Instalar la app en el celular (PWA) ----------
  const [installEvt, setInstallEvt] = useState(null);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [iosNeedsSafari, setIosNeedsSafari] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      window.navigator.standalone;
    if (standalone) { setInstalled(true); return; }
    const onBIP = (e) => { e.preventDefault(); setInstallEvt(e); };
    const onInstalled = () => { setInstalled(true); setInstallEvt(null); };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    const ua = navigator.userAgent || "";
    if (/iphone|ipad|ipod/i.test(ua)) {
      setShowIOSHelp(true);
      if (/crios|fxios|edgios/i.test(ua)) setIosNeedsSafari(true); // Chrome/otros en iPhone no instalan
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const doInstall = async () => {
    if (!installEvt) return;
    installEvt.prompt();
    try { await installEvt.userChoice; } catch (e) {}
    setInstallEvt(null);
  };

  useEffect(() => {
    if (typeof document !== "undefined" && !document.getElementById("varman-font")) {
      const l = document.createElement("link");
      l.id = "varman-font";
      l.rel = "stylesheet";
      l.href = FONT_LINK;
      document.head.appendChild(l);
    }
    if (typeof document !== "undefined" && !document.getElementById("varman-css")) {
      const s = document.createElement("style");
      s.id = "varman-css";
      s.textContent = `
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        button { transition: transform .12s ease, opacity .12s ease, background .15s ease; }
        button:active { transform: scale(.96); }
        input, select { transition: border-color .15s ease, box-shadow .15s ease; }
        input:focus, select:focus { border-color: ${C.ink} !important; box-shadow: 0 0 0 3px rgba(16,16,18,.08); }
        @keyframes vmFadeUp { from { opacity:0; transform: translateY(8px);} to { opacity:1; transform:none;} }
        @keyframes vmSheet { from { opacity:0; transform:scale(0.98);} to { opacity:1; transform:none;} }
        @keyframes vmPulse { 0%,100% { opacity:1;} 50% { opacity:.45;} }
        @keyframes vmGrowX { from { transform: scaleX(0);} to { transform: scaleX(1);} }
        @keyframes vmDraw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        @keyframes vmRise { from { opacity:0; transform: translateY(12px);} to { opacity:1; transform:none;} }
        @keyframes vmHalo { 0% { opacity:.55; transform: scale(.6);} 70%,100% { opacity:0; transform: scale(2.6);} }
        .vm-fade { animation: vmFadeUp .3s ease both; }
        @media (prefers-reduced-motion: reduce) { *, .vm-fade { animation: none !important; transition: none !important; } }
      `;
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => {
    // Con login activo, esperar a tener sesión antes de cargar/sincronizar
    if (auth && !user) return;
    let unsubP, unsubS, unsubM, unsubF, unsubG, unsubPed, unsubOcultos, localData = null;
    (async () => {
      // 1) Cache local: muestra algo al instante y sirve de respaldo offline
      try {
        const raw = await store.get(STORAGE_KEY);
        if (raw) {
          localData = JSON.parse(raw);
          setProducts(localData.products || []);
          setSales(localData.sales || []);
          setLogo(localData.logo || null);
        }
      } catch (e) {
        /* primera vez: sin datos */
      }
      try {
        const f = await photoDB.all();
        if (f) setFotos(f);
      } catch (e) {
        /* sin fotos aún */
      }

      // Caja: los gastos solo se cargan en los dispositivos de los socios
      if (esSocio) {
        try {
          const rawG = await store.get(GASTOS_KEY);
          if (rawG) setGastos(JSON.parse(rawG) || []);
          else if (!fbReady()) setGastos(GASTOS_INICIALES); // modo local: datos del Excel
        } catch (e) {
          /* sin gastos aún */
        }
      }

      // 2) Sin Firebase (sin internet o no cargó): queda en modo local
      if (!fbReady()) { setLoading(false); return; }

      // 3) Tiempo real desde la nube — suscribir YA (no bloquear con escrituras).
      //    Si la nube está vacía (primer arranque) no pisamos lo local; el
      //    sembrado de abajo la llena.
      unsubP = colRef("products").onSnapshot((snap) => {
        if (!snap.empty) setProducts(snap.docs.map((d) => d.data()));
        setLoading(false);
      }, (err) => { console.warn("Firestore products:", err && err.message); setLoading(false); });

      unsubS = colRef("sales").onSnapshot((snap) => {
        if (!snap.empty) setSales(snap.docs.map((d) => d.data()));
      }, (err) => console.warn("Firestore sales:", err && err.message));

      unsubM = metaRef().onSnapshot((doc) => {
        const d = doc.data();
        if (d && Object.prototype.hasOwnProperty.call(d, "logo")) setLogo(d.logo || null);
      });

      // Fotos del catálogo desde la nube (para que se vean en TODOS los celulares).
      // Cada doc: { key: "modelo|color", data: <dataURL> }. Se cachean en photoDB
      // para verlas también sin internet.
      unsubF = colRef("fotos").onSnapshot((snap) => {
        setFotos((prev) => {
          const next = { ...prev };
          snap.docChanges().forEach((ch) => {
            const x = ch.doc.data();
            const k = (x && x.key) || decodeURIComponent(ch.doc.id);
            if (ch.type === "removed") {
              delete next[k];
              photoDB.del(k);
            } else if (x && x.data) {
              next[k] = x.data;
              photoDB.set(k, x.data);
            }
          });
          return next;
        });
      }, (err) => console.warn("Firestore fotos:", err && err.message));

      // Caja de los socios: SOLO ellos se suscriben (las reglas de Firestore
      // rechazarían a cualquier otro usuario de todas formas).
      if (esSocio) {
        unsubG = colRef("gastos").onSnapshot((snap) => {
          if (!snap.empty) setGastos(snap.docs.map((d) => d.data()));
        }, (err) => console.warn("Firestore gastos:", err && err.message));
      }

      // Pedidos del bot de WhatsApp: los ven socios Y vendedor (a diferencia
      // de la Caja). El bot los crea con id automático de Firestore, por eso
      // el id del documento viaja aparte en "_id".
      unsubPed = colRef("pedidos").onSnapshot((snap) => {
        setPedidos(snap.docs.map((d) => ({ _id: d.id, ...d.data() })));
      }, (err) => console.warn("Firestore pedidos:", err && err.message));

      unsubOcultos = colRef("pedidosOcultos").onSnapshot((snap) => {
        const m = {};
        snap.forEach((d) => { m[d.id] = d.data(); });
        setOcultosPedidos(m);
      }, (err) => console.warn("Firestore pedidosOcultos:", err && err.message));

      // 4) Sembrar la nube la PRIMERA vez, en segundo plano (idempotente: usa el
      //    id como nombre del documento, así re-subir nunca duplica).
      const seedIfEmpty = async (name, items) => {
        if (!items || !items.length) return;
        const snap = await colRef(name).get();
        if (snap.empty) await Promise.all(items.map((x) => colRef(name).doc(String(x.id)).set(x)));
      };
      (async () => {
        try {
          await seedIfEmpty("products", localData && localData.products);
          await seedIfEmpty("sales", localData && localData.sales);
          // Gastos del Excel de cierre (solo la primera vez, solo socios)
          if (esSocio) await seedIfEmpty("gastos", GASTOS_INICIALES);
          if (localData && localData.logo) {
            const m = await metaRef().get();
            if (!m.exists || !(m.data() && "logo" in m.data())) await metaRef().set({ logo: localData.logo }, { merge: true });
          }
          // Subir a la nube las fotos que solo estaban guardadas en este celular
          // (las que la nube todavía no tiene). Así las fotos asignadas antes de
          // esta versión también aparecen en los demás dispositivos.
          const localFotos = await photoDB.all();
          const fkeys = Object.keys(localFotos || {});
          if (fkeys.length) {
            const fsnap = await colRef("fotos").get();
            const enNube = new Set(fsnap.docs.map((d) => {
              const x = d.data();
              return (x && x.key) || decodeURIComponent(d.id);
            }));
            const faltan = fkeys.filter((k) => !enNube.has(k));
            if (faltan.length) await Promise.all(faltan.map((k) => colRef("fotos").doc(encodeURIComponent(k)).set({ key: k, data: localFotos[k] })));
          }
        } catch (e) { console.warn("Error subiendo datos iniciales:", e && e.message); }
      })();
    })();
    return () => { unsubP && unsubP(); unsubS && unsubS(); unsubM && unsubM(); unsubF && unsubF(); unsubG && unsubG(); unsubPed && unsubPed(); unsubOcultos && unsubOcultos(); };
  }, [user]);

  // Asignar / quitar foto a un grupo modelo+color.
  // Se guarda en este celular (photoDB) Y en la nube (Firestore) para que la
  // foto aparezca en todos los dispositivos del equipo.
  const asignarFoto = async (key, dataUrl) => {
    setFotos((prev) => ({ ...prev, [key]: dataUrl }));
    const ok = await photoDB.set(key, dataUrl);
    if (!ok) showToast("No se pudo guardar la foto.", true);
    if (fbReady()) {
      try { await colRef("fotos").doc(encodeURIComponent(key)).set({ key, data: dataUrl }); }
      catch (e) { console.warn("Error subiendo foto:", e && e.message); }
    }
  };
  const quitarFoto = async (key) => {
    setFotos((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    await photoDB.del(key);
    if (fbReady()) {
      try { await colRef("fotos").doc(encodeURIComponent(key)).delete(); }
      catch (e) { console.warn("Error borrando foto:", e && e.message); }
    }
  };

  const persist = async (nextProducts, nextSales, nextLogo = logo) => {
    const prevProducts = products, prevSales = sales, prevLogo = logo;
    setProducts(nextProducts);
    setSales(nextSales);
    // Respaldo local siempre (offline / exportar)
    store.set(STORAGE_KEY, JSON.stringify({ products: nextProducts, sales: nextSales, logo: nextLogo }));
    // Nube: enviar solo lo que cambió
    if (fbReady()) {
      fbSyncList("products", prevProducts, nextProducts);
      fbSyncList("sales", prevSales, nextSales);
      if (nextLogo !== prevLogo) metaRef().set({ logo: nextLogo }, { merge: true });
    }
  };

  // Guardar los gastos de la caja (respaldo local + nube; solo socios)
  const persistGastos = (nextGastos) => {
    const prevGastos = gastos;
    setGastos(nextGastos);
    store.set(GASTOS_KEY, JSON.stringify(nextGastos));
    if (fbReady()) fbSyncList("gastos", prevGastos, nextGastos);
  };

  const addGasto = (g) => {
    persistGastos([
      ...gastos,
      {
        id: "g" + Date.now() + Math.floor(Math.random() * 999),
        // tipo "ingreso" = plata que ENTRA a la caja (aporte, préstamo, etc.);
        // todo lo demás (incluidos los registros viejos sin tipo) es gasto.
        tipo: g.tipo === "ingreso" ? "ingreso" : "gasto",
        fecha: g.fecha || hoyLocal(),
        desc: ((g.desc || "").trim() || "GASTO").toUpperCase(),
        monto: Math.round(Number(g.monto) || 0),
        categoria: g.categoria || "otro",
        auto: !!g.auto,
      },
    ]);
  };

  // Actualiza un pedido del bot. La app SOLO escribe estado/notas (+ fecha de
  // actualización); el resto de campos son del bot (contrato en
  // bot_n8n\briefs\CAMBIOS-PEDIDOS.md). No se espera la promesa: con la
  // persistencia offline el cambio se ve al instante y sube al volver la red.
  const actualizarPedido = (id, cambios) => {
    if (!fbReady()) {
      showToast("Sin conexión con la nube: no se pudo guardar.", true);
      return false;
    }
    colRef("pedidos").doc(String(id))
      .set({ ...cambios, actualizado: new Date().toISOString() }, { merge: true })
      .catch((e) => {
        console.warn("Error actualizando pedido:", e && e.message);
        showToast("No se pudo guardar el cambio del pedido.", true);
      });
    return true;
  };

  // (El logo se muestra en la cabecera como imagen fija; ya no se sube desde la app.)

  const showToast = (msg, isError) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3200);
  };

  // métricas
  // Las ventas ANULADAS (marcadas desde la pestaña Ventas por un socio) siguen
  // guardadas para el historial, pero no cuentan en ningún número del negocio.
  const ventasValidas = sales.filter((s) => !s.anulada);
  const totalPares = products.reduce((a, p) => a + (Number(p.stock) || 0), 0);
  const valorCosto = products.reduce((a, p) => a + (Number(p.stock) || 0) * (Number(p.costo) || 0), 0);
  const hoy = hoyLocal();
  const ventasHoy = ventasValidas.filter((s) => s.fecha === hoy);
  const totalHoy = ventasHoy.reduce((a, s) => a + (Number(s.precio) || 0) * (Number(s.cantidad) || 1), 0);
  const gananciaHoy = ventasHoy.reduce((a, s) => a + ((Number(s.precio) || 0) - (Number(s.costo) || 0)) * (Number(s.cantidad) || 1), 0);
  const paresVendidosHoy = ventasHoy.reduce((a, s) => a + (Number(s.cantidad) || 1), 0);
  // Por agotarse: 2 pares o menos (incluye agotados y último par)
  const agotados = products.filter((p) => (Number(p.stock) || 0) <= 2).length;
  // Pedidos del bot sin gestionar todavía (badge en la pestaña Pedidos).
  // pago_confirmado cuenta (Wompi ya cobró: hay que alistar el envío);
  // pago_pendiente NO cuenta (el cliente aún no paga, no hay nada que hacer).
  const pedidosNuevos = pedidos.filter((p) => {
    if (ocultosPedidos[String(p._id)]) return false;
    const e = normEstadoPedido(p.estado);
    return e === "nuevo" || e === "pagado_por_verificar" || e === "pago_confirmado";
  }).length;

  // ---------- Puerta de sesión ----------
  if (auth && !authReady) {
    return (
      <div style={{ minHeight: "100vh", background: "#0F0F13", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.5)", fontFamily: "Inter, system-ui, sans-serif", fontSize: 14 }}>
        Cargando…
      </div>
    );
  }
  if (auth && !user) {
    return <Login onSubmit={doLogin} error={authError} busy={authBusy} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "Inter, system-ui, sans-serif", color: C.ink, paddingBottom: 110 }}>
      {/* ---------- Banner: instalar la app ---------- */}
      {!installed && installEvt && (
        <div style={{ background: C.ink, color: "#fff", padding: "10px 14px", paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>📲 Instala VarMan en tu celular</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={doInstall} style={btnPrimary({ padding: "8px 14px", borderRadius: 10, fontSize: 12.5 })}>Instalar</button>
            <button onClick={() => setInstallEvt(null)} aria-label="Cerrar" style={{ background: "transparent", border: "none", color: "rgba(255,255,255,.6)", fontSize: 20, lineHeight: 1, cursor: "pointer", padding: "0 4px" }}>×</button>
          </div>
        </div>
      )}
      {!installed && !installEvt && showIOSHelp && (
        <div style={{ background: C.ink, color: "#fff", padding: "10px 14px", paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>
            {iosNeedsSafari
              ? <>📲 Para instalar, abre esta página en <b>Safari</b> (Chrome en iPhone no permite instalar apps)</>
              : <>📲 Para instalar: toca <b>Compartir</b> → <b>Agregar a inicio</b></>}
          </span>
          <button onClick={() => setShowIOSHelp(false)} aria-label="Cerrar" style={{ background: "transparent", border: "none", color: "rgba(255,255,255,.6)", fontSize: 20, lineHeight: 1, cursor: "pointer", padding: "0 4px" }}>×</button>
        </div>
      )}

      {/* ---------- Cabecera ---------- */}
      {/* En iPhone la app instalada se mete debajo de la barra de estado (notch);
          env(safe-area-inset-top) baja la cabecera para que quede cómoda de tocar. */}
      <header style={{ padding: "18px 20px 0", paddingTop: "calc(env(safe-area-inset-top, 0px) + 26px)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={eyebrow()}>control de bodega</div>
          {logo ? (
            <img
              src={logo}
              alt="VarMan Crew"
              style={{ height: 42, display: "block", marginTop: 3, maxWidth: 220, objectFit: "contain" }}
            />
          ) : (
            <div style={display(26)}>
              VARMAN <span style={{ color: C.accent }}>CREW</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {auth && user && (
            <button
              onClick={doLogout}
              title="Cerrar sesión"
              style={{
                height: 42, borderRadius: 12, background: C.card, color: C.ink2,
                border: `1.5px solid ${C.line}`, padding: "0 13px", cursor: "pointer",
                fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 12.5,
              }}
            >
              Salir
            </button>
          )}
          {/* Logo de la marca (solo decorativo) */}
          <div
            style={{
              width: 42, height: 42, borderRadius: 14, background: C.ink,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 0, overflow: "hidden",
            }}
          >
            {logo ? (
              <img src={logo} alt="VarMan Crew" style={{ width: "100%", height: "100%", objectFit: "contain", background: "#fff" }} />
            ) : (
              <img src="icon.png" alt="VarMan Crew" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
          </div>
        </div>
      </header>

      {/* ---------- Panel del día (firma visual) ---------- */}
      {/* En la pestaña Caja se oculta: allí el protagonista es el saldo en caja */}
      {tab !== "caja" && (
      <div style={{ padding: "14px 16px 0" }}>
        <div
          className="vm-fade"
          style={{
            background: "linear-gradient(135deg, #131316 0%, #1E1E23 100%)",
            borderRadius: 22,
            padding: "18px 18px 16px",
            color: "#fff",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 14px 34px rgba(16,16,18,.28)",
          }}
        >
          {/* marca de agua */}
          <div style={{ position: "absolute", right: -14, top: -22, ...display(110, "rgba(255,255,255,.045)"), pointerEvents: "none" }}>VC</div>
          <div style={eyebrow("rgba(255,255,255,.55)")}>ventas de hoy</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
            <span style={display(34, "#fff")}>{fmt(totalHoy)}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#5BD692" }}>+{fmt(gananciaHoy)} ganancia</span>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <MiniStat label="Pares vendidos" value={paresVendidosHoy} />
            <MiniStat label="Pares en stock" value={totalPares} />
            <MiniStat
              label="Por agotarse"
              value={agotados}
              warn={agotados > 0}
              onClick={agotados > 0 ? () => { setLowOnly(true); setTab("inventario"); } : undefined}
            />
          </div>
        </div>
      </div>
      )}

      {/* ---------- Contenido ---------- */}
      {loading ? (
        <div style={{ padding: 16 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ ...cardStyle({ height: 84, marginBottom: 10 }), animation: "vmPulse 1.4s ease infinite" }} />
          ))}
        </div>
      ) : (
        <>
          {tab === "inventario" && (
            <Inventario
              products={products}
              sales={sales}
              persist={persist}
              showToast={showToast}
              valorCosto={valorCosto}
              lowOnly={lowOnly}
              setLowOnly={setLowOnly}
              fotos={fotos}
              asignarFoto={asignarFoto}
              quitarFoto={quitarFoto}
              registrarCompra={esSocio ? addGasto : null}
            />
          )}
          {(tab === "ventas" || tab === "ventas-nueva") && (
            <Ventas
              products={products}
              sales={sales}
              persist={persist}
              showToast={showToast}
              autoOpen={tab === "ventas-nueva"}
              onAutoOpened={() => setTab("ventas")}
              fotos={fotos}
              esSocio={esSocio}
              userEmail={user ? user.email || "" : ""}
            />
          )}
          {tab === "pedidos" && (
            <Pedidos pedidos={pedidos} products={products} actualizarPedido={actualizarPedido} showToast={showToast} esSocio={esSocio} userEmail={user ? user.email || "" : ""} ocultosPedidos={ocultosPedidos} />
          )}
          {/* Stats y Caja reciben solo las ventas válidas: las anuladas no suman */}
          {tab === "stats" && <Estadisticas products={products} sales={ventasValidas} />}
          {tab === "tienda" && <TiendaWeb showToast={showToast} products={products} />}
          {tab === "caja" && esSocio && (
            <Caja sales={ventasValidas} gastos={gastos} persistGastos={persistGastos} addGasto={addGasto} showToast={showToast} />
          )}
        </>
      )}

      {/* ---------- Navegación flotante ---------- */}
      <nav
        style={{
          position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: esSocio ? 6 : 8, zIndex: 50,
        }}
      >
        {/* Con la pestaña Pedidos los botones se compactan un poco para que
            las 6 pestañas de los socios (5 del vendedor) quepan en el celular */}
        {[
          { id: "inventario", label: "Inventario", icon: IconBox },
          { id: "ventas", label: "Ventas", icon: IconChart },
          { id: "pedidos", label: "Pedidos", icon: IconBag, badge: pedidosNuevos },
          { id: "stats", label: "Stats", icon: IconStats },
          { id: "tienda", label: "Tienda", icon: IconStore },
          ...(esSocio ? [{ id: "caja", label: "Caja", icon: IconCash }] : []),
        ].map((t) => {
          const active = tab === t.id;
          const Icon = t.icon;
          const lado = esSocio ? 46 : 50;
          return (
            <button
              key={t.id}
              onClick={() => { setLowOnly(false); setTab(t.id); }}
              aria-label={t.label + (t.badge ? " (" + t.badge + " nuevos)" : "")}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                background: active ? C.accent : C.ink,
                color: "#fff", border: "none", cursor: "pointer",
                borderRadius: 999, height: lado, padding: active ? (esSocio ? "0 12px" : "0 16px") : 0,
                width: active ? "auto" : lado, justifyContent: "center",
                fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13,
                position: "relative",
                boxShadow: active
                  ? "0 8px 22px rgba(255,90,31,.45)"
                  : "0 8px 22px rgba(16,16,18,.3)",
              }}
            >
              <Icon />
              {active && <span>{t.label}</span>}
              {!!t.badge && (
                <span style={{
                  position: "absolute", top: -4, right: -3, minWidth: 19, height: 19,
                  borderRadius: 99, background: C.red, color: "#fff",
                  border: `2px solid ${C.bg}`, fontSize: 10.5, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "0 4px", lineHeight: 1,
                }}>
                  {t.badge > 99 ? "99+" : t.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ---------- Toast ---------- */}
      {toast && (
        <div
          className="vm-fade"
          style={{
            position: "fixed", bottom: 86, left: "50%", transform: "translateX(-50%)",
            background: toast.isError ? C.red : C.ink, color: "#fff",
            padding: "11px 18px", borderRadius: 14, fontSize: 13.5, fontWeight: 600,
            zIndex: 99, maxWidth: "88%", textAlign: "center",
            boxShadow: "0 10px 26px rgba(16,16,18,.3)",
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, warn, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      style={{
        flex: 1, background: "rgba(255,255,255,.07)", borderRadius: 12, padding: "9px 10px",
        border: onClick ? "1.5px solid rgba(255,138,92,.45)" : "none",
        cursor: onClick ? "pointer" : "default", textAlign: "left",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div style={display(17, warn ? "#FF8A5C" : "#fff")}>{value}</div>
      <div style={{ fontSize: 9.5, color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2, fontWeight: 600 }}>
        {label}{onClick ? " →" : ""}
      </div>
    </Tag>
  );
}

// ============================================================
// Inventario
// ============================================================
function Inventario({ products, sales, persist, showToast, valorCosto, lowOnly, setLowOnly, fotos, asignarFoto, quitarFoto, registrarCompra }) {
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showFotos, setShowFotos] = useState(false);
  const [draft, setDraft] = useState(emptyProduct());
  const [tallasQty, setTallasQty] = useState({}); // cantidad por talla al crear
  const [descontarCaja, setDescontarCaja] = useState(true); // la compra sale de la caja de los socios
  const [editingId, setEditingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [actionProduct, setActionProduct] = useState(null); // producto tocado (menú editar/eliminar)
  const confirmTimer = useRef(null);

  // Abrir el formulario para EDITAR un producto ya existente (mismo form que al crear)
  const startEdit = (p) => {
    setDraft({
      id: p.id,
      referencia: p.referencia || "",
      modelo: p.modelo || "",
      color: p.color || "",
      talla: p.talla != null ? String(p.talla) : "",
      stock: Number(p.stock) || 0,
      costo: p.costo != null ? p.costo : "",
      precio: p.precio != null ? p.precio : "",
    });
    setTallasQty({});
    setEditingId(p.id);
    setShowForm(true);
  };

  // Cuando se activa el filtro "por agotarse", limpiar el buscador
  useEffect(() => {
    if (lowOnly) setQ("");
  }, [lowOnly]);

  const filtered = products
    .filter((p) =>
      (p.referencia + " " + p.modelo + " " + p.color + " " + p.talla).toLowerCase().includes(q.toLowerCase())
    )
    .filter((p) => !lowOnly || (Number(p.stock) || 0) <= 2)
    .sort((a, b) => (lowOnly ? (Number(a.stock) || 0) - (Number(b.stock) || 0) : 0));

  const adjustStock = (id, delta) => {
    persist(
      products.map((p) => (p.id === id ? { ...p, stock: Math.max(0, (Number(p.stock) || 0) + delta) } : p)),
      sales
    );
  };

  // Eliminar con confirmación: primer toque pregunta, segundo toque borra
  const askDelete = (id) => {
    if (confirmId === id) {
      clearTimeout(confirmTimer.current);
      setConfirmId(null);
      persist(products.filter((x) => x.id !== id), sales);
      showToast("Producto eliminado.");
      return;
    }
    setConfirmId(id);
    clearTimeout(confirmTimer.current);
    confirmTimer.current = setTimeout(() => setConfirmId(null), 3500);
  };

  const saveDraft = () => {
    const normTxt = (s) => (s || "").toString().toLowerCase().replace(/\s+/g, " ").trim();

    // ── Edición: comportamiento normal (una sola talla) ──
    if (editingId) {
      if (!draft.modelo.trim() || !draft.talla.toString().trim()) {
        showToast("El modelo y la talla son obligatorios.", true);
        return;
      }
      persist(products.map((p) => (p.id === editingId ? { ...draft, id: editingId } : p)), sales);
      setShowForm(false);
      setDraft(emptyProduct());
      setEditingId(null);
      showToast("Producto actualizado.");
      return;
    }

    // ── Nuevo: crear una sub-referencia por cada talla con cantidad ──
    if (!draft.modelo.trim()) {
      showToast("El modelo es obligatorio.", true);
      return;
    }
    const conCantidad = TALLAS.filter((t) => Number(tallasQty[t]) > 0);
    if (conCantidad.length === 0) {
      showToast("Ingresa la cantidad de al menos una talla.", true);
      return;
    }
    let next = [...products];
    let creadas = 0, sumadas = 0;
    conCantidad.forEach((t) => {
      const qty = Number(tallasQty[t]);
      const subref = draft.referencia.trim() ? draft.referencia.trim() + "-" + t : "";
      const existente = next.find(
        (p) =>
          normTxt(p.modelo) === normTxt(draft.modelo) &&
          normTxt(p.color) === normTxt(draft.color) &&
          String(p.talla) === String(t)
      );
      if (existente) {
        // Ya hay esta talla en bodega → sumar stock en vez de duplicar
        next = next.map((p) =>
          p.id === existente.id
            ? {
                ...p,
                stock: (Number(p.stock) || 0) + qty,
                referencia: p.referencia || subref,
                costo: draft.costo !== "" ? draft.costo : p.costo,
                precio: draft.precio !== "" ? draft.precio : p.precio,
              }
            : p
        );
        sumadas++;
      } else {
        next.push({
          id: "p" + Date.now() + Math.floor(Math.random() * 9999) + "t" + t,
          referencia: subref,
          modelo: draft.modelo,
          color: draft.color,
          talla: String(t),
          stock: qty,
          costo: draft.costo,
          precio: draft.precio,
        });
        creadas++;
      }
    });
    persist(next, sales);

    // Descontar la compra de la caja de los socios (si la casilla está activa):
    // se registra un gasto automático de pares × costo, sin anotarlo a mano.
    const costoUnit = Number(draft.costo) || 0;
    const paresTot = conCantidad.reduce((a, t) => a + Number(tallasQty[t]), 0);
    let compraMsg = "";
    if (registrarCompra && descontarCaja && costoUnit > 0) {
      registrarCompra({
        desc: "COMPRA " + draft.modelo + (draft.color ? " " + draft.color : ""),
        monto: paresTot * costoUnit,
        categoria: "compra",
        auto: true,
      });
      compraMsg = fmt(paresTot * costoUnit) + " descontados de caja";
    } else if (registrarCompra && descontarCaja) {
      compraMsg = "sin costo: no se descontó de caja";
    }

    setShowForm(false);
    setDraft(emptyProduct());
    setTallasQty({});
    const partes = [];
    if (creadas) partes.push(`${creadas} talla${creadas > 1 ? "s" : ""} nueva${creadas > 1 ? "s" : ""}`);
    if (sumadas) partes.push(`stock sumado en ${sumadas}`);
    if (compraMsg) partes.push(compraMsg);
    showToast(partes.join(" · ") + " ✓");
  };

  const exportInventario = () => {
    if (products.length === 0) {
      showToast("No hay productos para exportar.", true);
      return;
    }
    const rows = [
      ["Referencia", "Modelo", "Color", "Talla", "Stock", "Costo", "Precio"],
      ...products.map((p) => [p.referencia, p.modelo, p.color, p.talla, p.stock, p.costo, p.precio]),
    ];
    downloadCSV(rows, "varman-inventario-" + hoyLocal() + ".csv");
    showToast("Inventario exportado ✓");
  };

  const margen = (p) => {
    const c = Number(p.costo) || 0, v = Number(p.precio) || 0;
    return c && v ? Math.round(((v - c) / v) * 100) : null;
  };

  return (
    <div style={{ padding: "16px 16px 0" }} className="vm-fade">
      {lowOnly && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
          background: C.accentSoft, border: `1.5px solid ${C.accent}`, borderRadius: 14,
          padding: "11px 14px", marginBottom: 12,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#A33A12" }}>
            ⚠ Mostrando solo tallas por agotarse (2 pares o menos)
          </div>
          <button onClick={() => setLowOnly(false)} style={btnGhost({ padding: "7px 12px", borderRadius: 10, fontSize: 12, flexShrink: 0 })}>
            Ver todo
          </button>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "0 4px", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={display(19)}>{lowOnly ? "Por agotarse" : "Inventario"}</div>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginTop: 2 }}>Valor a costo: {fmt(valorCosto)}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowFotos(true)} style={btnGhost({ padding: "8px 12px", borderRadius: 11, fontSize: 12 })}>
            📷 Fotos
          </button>
          <BotonExportar onClick={exportInventario} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: C.muted }}>
            <IconSearch />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar modelo, talla, referencia…"
            style={inputStyle({ paddingLeft: 38, borderRadius: 14 })}
          />
        </div>
        <button
          onClick={() => { setDraft(emptyProduct()); setTallasQty({}); setEditingId(null); setDescontarCaja(true); setShowForm(true); }}
          style={btnPrimary({ borderRadius: 14, padding: "0 16px" })}
        >
          + Agregar
        </button>
      </div>

      {filtered.length === 0 && (
        <EmptyState
          icon={<IconBox big />}
          title={products.length === 0 ? "Tu bodega está vacía" : "Sin resultados"}
          text={products.length === 0
            ? "Agrega tu primer modelo con el botón + Agregar."
            : "Ningún producto coincide con la búsqueda."}
        />
      )}

      {filtered.map((p) => {
        const m = margen(p);
        const foto = fotos[fotoKey(p.modelo, p.color)];
        const stockN = Number(p.stock) || 0;
        const low = stockN <= 1;          // rojo: agotado o último par
        const lowWarn = stockN === 2;     // naranja: por agotarse
        const confirming = confirmId === p.id;
        return (
          <div
            key={p.id}
            onClick={() => { setConfirmId(null); setActionProduct(p); }}
            style={cardStyle({ padding: 14, marginBottom: 10, cursor: "pointer" })}
          >
            <div style={{ display: "flex", gap: 12 }}>
              {/* Foto del modelo (si tiene) con la talla encima; si no, medallón */}
              {foto ? (
                <div
                  onClick={(e) => { e.stopPropagation(); setShowFotos(true); }}
                  title="Ver/cambiar fotos del catálogo"
                  style={{
                    width: 52, height: 52, borderRadius: 14, flexShrink: 0, position: "relative",
                    overflow: "hidden", cursor: "pointer", background: C.bg,
                    border: low ? `1.5px solid ${C.red}` : `1px solid ${C.line}`,
                  }}
                >
                  <img src={foto} alt={p.modelo} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  <span
                    style={{
                      position: "absolute", left: 0, bottom: 0, right: 0,
                      background: low ? "rgba(215,50,15,.9)" : "rgba(16,16,18,.72)", color: "#fff",
                      fontSize: 11, fontWeight: 800, textAlign: "center", lineHeight: "15px",
                    }}
                  >
                    {p.talla}
                  </span>
                </div>
              ) : (
                <div
                  onClick={(e) => { e.stopPropagation(); setShowFotos(true); }}
                  title="Agregar foto a este modelo"
                  style={{
                    width: 52, height: 52, borderRadius: 14, flexShrink: 0, cursor: "pointer",
                    background: low ? C.redSoft : C.bg,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.1em", color: low ? C.red : C.muted }}>{p.talla ? "TALLA" : "REF"}</span>
                  <span style={display(p.talla ? 19 : 15, low ? C.red : C.ink)}>{p.talla || ((p.referencia || "").replace(/^[^0-9]+/, "") || "—")}</span>
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.modelo}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{fmt(p.precio)}</div>
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2, display: "flex", justifyContent: "space-between" }}>
                  <span>
                    {p.color && <>{p.color} · </>}
                    {p.referencia && <>Ref {p.referencia}</>}
                  </span>
                  <span>
                    costo {fmt(p.costo)}
                    {m !== null && (
                      <span style={{ marginLeft: 6, background: C.greenSoft, color: C.green, fontWeight: 700, fontSize: 11, padding: "2px 7px", borderRadius: 99 }}>
                        {m}%
                      </span>
                    )}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", background: C.bg, borderRadius: 12, padding: "8px 14px" }}>
                    <span style={{ ...display(16, low ? C.red : C.ink), textAlign: "center" }}>
                      {p.stock}
                      <span style={{ fontSize: 9, fontWeight: 700, color: C.muted, marginLeft: 3, letterSpacing: "0.06em" }}>PARES</span>
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {low && (
                      <span style={{ fontSize: 10, background: C.red, color: "#fff", padding: "3px 9px", borderRadius: 99, fontWeight: 800, letterSpacing: "0.04em" }}>
                        {stockN === 0 ? "AGOTADO" : "ÚLTIMO PAR"}
                      </span>
                    )}
                    {lowWarn && (
                      <span style={{ fontSize: 10, background: C.accent, color: "#fff", padding: "3px 9px", borderRadius: 99, fontWeight: 800, letterSpacing: "0.04em" }}>
                        POR AGOTARSE
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {showForm && (
        <Sheet title={editingId ? "Editar producto" : "Nuevo producto"} onClose={() => { setShowForm(false); setEditingId(null); }}>
          <Field label="Modelo *">
            <input value={draft.modelo} onChange={(e) => setDraft({ ...draft, modelo: e.target.value })} placeholder="Ej: Nike Air Force 1" style={inputStyle()} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Color">
              <input value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} placeholder="Blanco" style={inputStyle()} />
            </Field>
            <Field label="Referencia base">
              <input value={draft.referencia} onChange={(e) => setDraft({ ...draft, referencia: e.target.value })} placeholder="AF1-BL" style={inputStyle()} />
            </Field>
            {editingId && (
              <Field label="Talla *">
                <input value={draft.talla} onChange={(e) => setDraft({ ...draft, talla: e.target.value })} placeholder="40" style={inputStyle()} />
              </Field>
            )}
            {editingId && (
              <Field label="Stock">
                <input type="number" min="0" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) })} style={inputStyle()} />
              </Field>
            )}
            <Field label="Costo de compra">
              <input type="number" min="0" value={draft.costo} onChange={(e) => setDraft({ ...draft, costo: e.target.value })} placeholder="120000" style={inputStyle()} />
            </Field>
            <Field label="Precio de venta">
              <input type="number" min="0" value={draft.precio} onChange={(e) => setDraft({ ...draft, precio: e.target.value })} placeholder="200000" style={inputStyle()} />
            </Field>
          </div>

          {!editingId && (
            <Field label="Cantidad por talla (36–45) *">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                {TALLAS.map((t) => {
                  const tiene = Number(tallasQty[t]) > 0;
                  return (
                    <div
                      key={t}
                      style={{
                        background: tiene ? C.accentSoft : C.card,
                        border: `1.5px solid ${tiene ? C.accent : C.line}`,
                        borderRadius: 12, padding: "8px 6px 6px", textAlign: "center",
                        transition: "border-color .15s ease, background .15s ease",
                      }}
                    >
                      <div style={{ ...eyebrow(tiene ? C.accent : C.muted), fontSize: 10, marginBottom: 4 }}>Talla {t}</div>
                      <input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={tallasQty[t] || ""}
                        placeholder="0"
                        onChange={(e) => setTallasQty({ ...tallasQty, [t]: e.target.value })}
                        style={inputStyle({ padding: "8px 4px", textAlign: "center", fontWeight: 800, border: "none", background: "transparent" })}
                      />
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 6, lineHeight: 1.45 }}>
                Se crea una sub-referencia por talla (ej. {draft.referencia.trim() ? draft.referencia.trim() + "-40" : "AF1-BL-40"}).
                Si la talla ya existe en bodega, la cantidad se suma al stock.
              </div>
            </Field>
          )}

          {/* Casilla "descontar de caja": solo la ven los socios al CREAR */}
          {!editingId && registrarCompra && (() => {
            const paresTot = TALLAS.reduce((a, t) => a + (Number(tallasQty[t]) || 0), 0);
            const monto = paresTot * (Number(draft.costo) || 0);
            return (
              <div
                onClick={() => setDescontarCaja(!descontarCaja)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                  background: descontarCaja ? C.greenSoft : C.card,
                  border: `1.5px solid ${descontarCaja ? C.green : C.line}`,
                  borderRadius: 12, padding: "11px 13px", marginTop: 4,
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                  background: descontarCaja ? C.green : C.card,
                  border: `1.5px solid ${descontarCaja ? C.green : C.line}`,
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 900,
                }}>{descontarCaja ? "✓" : ""}</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.45 }}>
                  <b>Descontar la compra de la caja</b>
                  <span style={{ color: C.muted }}>
                    {" — "}
                    {monto > 0
                      ? `se registra un gasto de ${fmt(monto)} (${paresTot} par${paresTot === 1 ? "" : "es"} × ${fmt(draft.costo)})`
                      : "escribe el costo y las cantidades para calcularlo"}
                  </span>
                </div>
              </div>
            );
          })()}
          <button onClick={saveDraft} style={btnPrimary({ width: "100%", marginTop: 14, padding: "15px", fontSize: 15 })}>
            {editingId
              ? "Guardar cambios"
              : (() => {
                  const total = TALLAS.reduce((a, t) => a + (Number(tallasQty[t]) || 0), 0);
                  return total > 0
                    ? `Agregar ${total} par${total > 1 ? "es" : ""} al inventario`
                    : "Agregar al inventario";
                })()}
          </button>
        </Sheet>
      )}

      {showFotos && (
        <FotosManager
          products={products}
          fotos={fotos}
          asignarFoto={asignarFoto}
          quitarFoto={quitarFoto}
          showToast={showToast}
          onClose={() => setShowFotos(false)}
        />
      )}

      {actionProduct && (() => {
        const p = actionProduct;
        return (
          <Sheet title="Producto" onClose={() => { setActionProduct(null); setConfirmId(null); }}>
            <div style={{ background: C.card, border: `1.5px solid ${C.line}`, borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{p.modelo}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 5, lineHeight: 1.6 }}>
                {p.color ? <>{p.color} · </> : null}{p.talla ? <>Talla {p.talla} · </> : null}{p.referencia ? <>Ref {p.referencia}</> : null}<br />
                <b style={{ color: C.ink }}>{p.stock} par{(Number(p.stock) || 0) === 1 ? "" : "es"}</b> en stock · precio {fmt(p.precio)} · costo {fmt(p.costo)}
              </div>
            </div>
            <button onClick={() => { const prod = actionProduct; setActionProduct(null); setConfirmId(null); startEdit(prod); }} style={btnPrimary({ width: "100%", padding: "14px", fontSize: 15, marginBottom: 10 })}>
              ✏️  Editar producto
            </button>
            {confirmId === p.id ? (
              <button
                onClick={() => {
                  persist(products.filter((x) => x.id !== p.id), sales);
                  showToast("Producto eliminado.");
                  setActionProduct(null);
                  setConfirmId(null);
                }}
                style={{ width: "100%", padding: "14px", fontSize: 15, borderRadius: 13, border: "none", background: C.red, color: "#fff", fontWeight: 800, fontFamily: "Inter, sans-serif", cursor: "pointer" }}
              >
                Sí, eliminar producto
              </button>
            ) : (
              <button onClick={() => setConfirmId(p.id)} style={btnGhost({ width: "100%", padding: "14px", fontSize: 15, color: C.red, border: `1.5px solid ${C.redSoft}` })}>
                🗑️  Eliminar producto
              </button>
            )}
          </Sheet>
        );
      })()}
    </div>
  );
}

// ============================================================
// Gestor de fotos del catálogo
// ============================================================
function FotosManager({ products, fotos, asignarFoto, quitarFoto, showToast, onClose }) {
  const [pool, setPool] = useState([]);      // fotos de la carpeta cargadas en esta sesión
  const [cargando, setCargando] = useState(false);
  const [progreso, setProgreso] = useState({ hechas: 0, total: 0 });
  const [pickKey, setPickKey] = useState(null); // grupo modelo+color que está eligiendo foto
  const [busca, setBusca] = useState("");
  const fileRef = useRef(null);

  // Grupos únicos modelo+color del inventario
  const grupos = [];
  const vistos = new Set();
  products.forEach((p) => {
    const key = fotoKey(p.modelo, p.color);
    if (!vistos.has(key)) {
      vistos.add(key);
      grupos.push({ key, modelo: p.modelo, color: p.color });
    }
  });
  const gruposFiltrados = grupos.filter((g) =>
    (g.modelo + " " + (g.color || "")).toLowerCase().includes(busca.toLowerCase())
  );
  const conFoto = grupos.filter((g) => fotos[g.key]).length;

  const onArchivos = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setCargando(true);
    setProgreso({ hechas: 0, total: files.length });
    const nuevas = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const data = await comprimirImagen(files[i]);
        nuevas.push({ id: files[i].name + "-" + i + "-" + Date.now(), name: files[i].name, data });
      } catch (_) { /* salta imágenes ilegibles */ }
      setProgreso({ hechas: i + 1, total: files.length });
    }
    setPool((prev) => [...prev, ...nuevas]);
    setCargando(false);
    showToast(`${nuevas.length} foto${nuevas.length === 1 ? "" : "s"} cargada${nuevas.length === 1 ? "" : "s"} ✓`);
    e.target.value = "";
  };

  const elegirFoto = (data) => {
    if (!pickKey) return;
    asignarFoto(pickKey, data);
    setPickKey(null);
    showToast("Foto asignada ✓");
  };

  const grupoActivo = pickKey ? grupos.find((g) => g.key === pickKey) : null;

  return (
    <Sheet title="Fotos del catálogo" onClose={onClose}>
      {/* Cargar la carpeta de fotos */}
      <div style={cardStyle({ padding: 14, marginBottom: 12 })}>
        <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.5, marginBottom: 10 }}>
          Carga las fotos de tu carpeta (puedes seleccionar muchas a la vez). Se
          guardan livianas y luego se las asignas a cada modelo. Quedan{" "}
          <b>{pool.length}</b> foto{pool.length === 1 ? "" : "s"} listas para asignar.
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onArchivos}
          style={{ display: "none" }}
        />
        <button
          onClick={() => fileRef.current && fileRef.current.click()}
          disabled={cargando}
          style={btnPrimary({ width: "100%", padding: "13px", opacity: cargando ? 0.6 : 1 })}
        >
          {cargando
            ? `Procesando ${progreso.hechas}/${progreso.total}…`
            : pool.length > 0
            ? "+ Cargar más fotos"
            : "Cargar fotos de la carpeta"}
        </button>
      </div>

      {/* Asignación por modelo+color */}
      {grupos.length === 0 ? (
        <EmptyState
          icon={<IconBox big />}
          title="Aún no hay productos"
          text="Primero agrega modelos al inventario; luego podrás ponerles foto."
        />
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "2px 4px 8px" }}>
            <div style={display(15)}>Tus modelos</div>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{conFoto}/{grupos.length} con foto</div>
          </div>
          {grupos.length > 6 && (
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar modelo…"
              style={inputStyle({ borderRadius: 12, marginBottom: 10 })}
            />
          )}
          {gruposFiltrados.map((g) => {
            const foto = fotos[g.key];
            return (
              <div key={g.key} style={cardStyle({ padding: 10, marginBottom: 8, display: "flex", gap: 12, alignItems: "center" })}>
                <div style={{ width: 56, height: 56, borderRadius: 12, flexShrink: 0, overflow: "hidden", background: C.bg, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {foto
                    ? <img src={foto} alt={g.modelo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: 22 }}>📷</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.modelo || "(sin modelo)"}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{g.color || "sin color"}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {foto && (
                    <button onClick={() => quitarFoto(g.key)} style={btnGhost({ padding: "8px 10px", borderRadius: 10, fontSize: 12 })} title="Quitar foto">✕</button>
                  )}
                  <button onClick={() => setPickKey(g.key)} style={btnPrimary({ padding: "9px 12px", fontSize: 12.5 })}>
                    {foto ? "Cambiar" : "Elegir foto"}
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Selector: galería de fotos cargadas para elegir una */}
      {pickKey && (
        <Sheet
          title={grupoActivo ? `Foto para ${grupoActivo.modelo || "modelo"}` : "Elegir foto"}
          onClose={() => setPickKey(null)}
        >
          {pool.length === 0 ? (
            <EmptyState
              icon={<span style={{ fontSize: 24 }}>📷</span>}
              title="No hay fotos cargadas"
              text="Cierra esta ventana y usa “Cargar fotos de la carpeta” primero."
            />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {pool.map((ph) => (
                <button
                  key={ph.id}
                  onClick={() => elegirFoto(ph.data)}
                  style={{ padding: 0, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden", cursor: "pointer", aspectRatio: "1 / 1", background: C.bg }}
                >
                  <img src={ph.data} alt={ph.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </button>
              ))}
            </div>
          )}
        </Sheet>
      )}
    </Sheet>
  );
}

// ============================================================
// Escanear cuaderno
// ============================================================
function Escanear({ products, sales, persist, showToast, setTab }) {
  const [imgPreview, setImgPreview] = useState(null);
  const [imgB64, setImgB64] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [detected, setDetected] = useState(null);
  const fileRef = useRef(null);

  const onFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1568;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          const r = Math.min(MAX / width, MAX / height);
          width = Math.round(width * r);
          height = Math.round(height * r);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        setImgPreview(dataUrl);
        setImgB64(dataUrl.split(",")[1]);
        setDetected(null);
      };
      img.onerror = () => showToast("No se pudo leer esa imagen.", true);
      img.src = ev.target.result;
    };
    reader.onerror = () => showToast("No se pudo abrir el archivo.", true);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const analyze = async () => {
    if (!imgB64) return;
    setAnalyzing(true);
    setDetected(null);

    const inventarioResumen = products
      .map((p) => `${p.referencia || "-"} | ${p.modelo} | ${p.color || "-"} | talla ${p.talla} | precio ${p.precio}`)
      .join("\n");

    const prompt = `Esta es la foto de un cuaderno donde se anotan a mano las ventas diarias de una tienda de zapatos en Colombia.

Tu tarea: leer la página y extraer TODAS las ventas que encuentres.

Para ayudarte a identificar productos, este es el inventario actual de la tienda (referencia | modelo | color | talla | precio):
${inventarioResumen || "(inventario vacío, extrae lo que veas en el cuaderno)"}

Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin backticks de markdown, con esta estructura exacta:
{
  "ventas": [
    {
      "fecha": "YYYY-MM-DD o null si no aparece",
      "cliente": "nombre del cliente o null",
      "modelo": "modelo del zapato tal como se lee",
      "talla": "talla tal como se lee",
      "precio": numero sin puntos ni símbolos (si dice 180 y los precios del inventario son de seis cifras, interpreta como 180000),
      "canal": "WhatsApp/Instagram/tienda/null si no se indica",
      "nota": "cualquier dato adicional legible o null"
    }
  ],
  "advertencias": ["lista de cosas que no pudiste leer bien o dudas"]
}

Si la imagen no parece un registro de ventas, devuelve {"ventas": [], "advertencias": ["descripción de lo que ves"]}.`;

    // Corta la espera si el internet está muy lento (evita que se quede colgado)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch(SCAN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imgB64 } },
                { type: "text", text: prompt },
              ],
            },
          ],
        }),
      });
      if (!response.ok) {
        const detalle = await response.text().catch(() => "");
        console.error("Error del servidor de análisis:", response.status, detalle);
        showToast(`No se pudo analizar (error ${response.status}). Revisa el servidor.`, true);
        return;
      }
      const data = await response.json();
      const text = (data.content || []).map((i) => i.text || "").join("\n");
      const parsed = safeParseJSON(text);
      if (!parsed) {
        showToast("No entendí la respuesta. Intenta con otra foto o mejor luz.", true);
        return;
      }
      const hoy = hoyLocal();
      const ventas = (parsed.ventas || []).map((v, i) => ({
        ...v,
        _id: "d" + Date.now() + i,
        fecha: v.fecha || hoy,
        precio: Number(v.precio) || 0,
        incluir: true,
        productoId: matchProduct(v, products),
      }));
      setDetected({ ventas, advertencias: parsed.advertencias || [] });
      if (ventas.length === 0) showToast("No se detectaron ventas en la foto.", true);
    } catch (err) {
      if (err && err.name === "AbortError") {
        showToast("La lectura tardó demasiado (internet lento). Intenta de nuevo.", true);
      } else {
        console.error(err);
        showToast("No pude leer la foto. Revisa tu conexión e intenta de nuevo.", true);
      }
    } finally {
      clearTimeout(timeout);
      setAnalyzing(false);
    }
  };

  const updateDetected = (id, field, value) => {
    setDetected((d) => ({
      ...d,
      ventas: d.ventas.map((v) => (v._id === id ? { ...v, [field]: value } : v)),
    }));
  };

  const confirm = () => {
    const toAdd = detected.ventas.filter((v) => v.incluir);
    if (toAdd.length === 0) {
      showToast("No hay ventas seleccionadas.", true);
      return;
    }
    let nextProducts = [...products];
    const nextSales = [...sales];
    toAdd.forEach((v) => {
      let costo = 0;
      if (v.productoId) {
        nextProducts = nextProducts.map((p) => {
          if (p.id === v.productoId) {
            costo = Number(p.costo) || 0;
            return { ...p, stock: Math.max(0, (Number(p.stock) || 0) - 1) };
          }
          return p;
        });
      }
      nextSales.push({
        id: "s" + Date.now() + Math.floor(Math.random() * 999),
        fecha: v.fecha,
        cliente: v.cliente || "",
        modelo: v.modelo,
        talla: v.talla,
        precio: Number(v.precio) || 0,
        cantidad: 1,
        costo,
        canal: v.canal || "",
        origen: "foto",
      });
    });
    persist(nextProducts, nextSales);
    setDetected(null);
    setImgPreview(null);
    setImgB64(null);
    showToast(`${toAdd.length} venta${toAdd.length > 1 ? "s" : ""} registrada${toAdd.length > 1 ? "s" : ""} y stock descontado ✓`);
    setTab("ventas");
  };

  return (
    <div style={{ padding: "16px 16px 0" }} className="vm-fade">
      <div style={{ padding: "0 4px", marginBottom: 10 }}>
        <div style={display(19)}>Registrar ventas</div>
        <p style={{ fontSize: 13, color: C.muted, margin: "4px 0 0", lineHeight: 1.5 }}>
          Escanea la página del cuaderno con una foto, o registra la venta a mano — las dos llegan al mismo historial.
        </p>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />

      {!imgPreview && (
        <button
          onClick={() => fileRef.current && fileRef.current.click()}
          style={{
            width: "100%", border: `2px dashed ${C.line}`, background: C.card, borderRadius: 20,
            padding: "44px 20px", cursor: "pointer", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 12, color: C.ink,
          }}
        >
          <span style={{ width: 64, height: 64, borderRadius: 20, background: C.accentSoft, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IconCam big />
          </span>
          <span style={{ fontWeight: 800, fontSize: 16, fontFamily: "Inter" }}>Tomar o subir foto</span>
          <span style={{ fontSize: 12.5, color: C.muted }}>Buena luz y la página completa en el encuadre</span>
        </button>
      )}

      {imgPreview && (
        <div style={cardStyle({ padding: 12 })}>
          <img src={imgPreview} alt="Página del cuaderno" style={{ width: "100%", borderRadius: 12, display: "block" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={() => fileRef.current && fileRef.current.click()} style={btnGhost({ flex: 1, padding: "13px" })}>
              Otra foto
            </button>
            <button onClick={analyze} disabled={analyzing} style={btnPrimary({ flex: 2, padding: "13px", opacity: analyzing ? 0.65 : 1 })}>
              {analyzing ? "Leyendo el cuaderno…" : "Leer ventas de la foto"}
            </button>
          </div>
        </div>
      )}

      {detected && detected.ventas.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ ...display(16), padding: "0 4px", marginBottom: 8 }}>
            Revisa lo detectado <span style={{ color: C.accent }}>({detected.ventas.length})</span>
          </div>
          {detected.advertencias.length > 0 && (
            <div style={{ background: C.accentSoft, color: "#A33A12", borderRadius: 12, padding: "10px 14px", fontSize: 12.5, marginBottom: 10, lineHeight: 1.45 }}>
              ⚠ {detected.advertencias.join(" · ")}
            </div>
          )}
          {detected.ventas.map((v) => (
            <div key={v._id} style={cardStyle({ padding: 14, marginBottom: 10, opacity: v.incluir ? 1 : 0.5 })}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={v.incluir}
                    onChange={(e) => updateDetected(v._id, "incluir", e.target.checked)}
                    style={{ width: 19, height: 19, accentColor: C.accent }}
                  />
                  Registrar esta venta
                </label>
                <span style={{ fontSize: 11.5, color: C.muted, fontWeight: 600 }}>{v.fecha}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
                <input value={v.modelo || ""} onChange={(e) => updateDetected(v._id, "modelo", e.target.value)} placeholder="Modelo" style={inputStyle()} />
                <input value={v.talla || ""} onChange={(e) => updateDetected(v._id, "talla", e.target.value)} placeholder="Talla" style={inputStyle()} />
                <input type="number" value={v.precio} onChange={(e) => updateDetected(v._id, "precio", e.target.value)} placeholder="Precio" style={inputStyle()} />
                <input value={v.cliente || ""} onChange={(e) => updateDetected(v._id, "cliente", e.target.value)} placeholder="Cliente" style={inputStyle()} />
              </div>
              <select
                value={v.productoId || ""}
                onChange={(e) => updateDetected(v._id, "productoId", e.target.value || null)}
                style={inputStyle({ width: "100%", marginTop: 8 })}
              >
                <option value="">No descontar de inventario</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.modelo} {p.color} · talla {p.talla} (stock {p.stock})
                  </option>
                ))}
              </select>
            </div>
          ))}
          <button onClick={confirm} style={btnPrimary({ width: "100%", padding: "16px", fontSize: 15.5 })}>
            ✓ Confirmar y descontar stock
          </button>
        </div>
      )}
    </div>
  );
}

function matchProduct(v, products) {
  const norm = (s) => (s || "").toString().toLowerCase().replace(/\s+/g, " ").trim();
  const vm = norm(v.modelo);
  const vt = norm(v.talla);
  let best = null, bestScore = 0;
  products.forEach((p) => {
    let score = 0;
    const pm = norm(p.modelo + " " + p.color);
    if (vm && pm.includes(vm)) score += 2;
    else if (vm && vm.split(" ").some((w) => w.length > 2 && pm.includes(w))) score += 1;
    if (vt && norm(p.talla) === vt) score += 2;
    if ((Number(p.stock) || 0) > 0) score += 0.5;
    if (score > bestScore) { bestScore = score; best = p.id; }
  });
  return bestScore >= 2.5 ? best : null;
}

// ============================================================
// Ventas
// ============================================================
const emptySale = () => ({
  productoId: "",
  modelo: "",
  talla: "",
  precio: "",
  cantidad: 1,
  cliente: "",
  canal: "",
});

function Ventas({ products, sales, persist, showToast, autoOpen, onAutoOpened, fotos = {}, esSocio = false, userEmail = "" }) {
  // Foto del catálogo para diferenciar referencias con nombres parecidos
  const fotoDe = (modelo, color) => fotos[fotoKey(modelo, color)] || null;
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(emptySale());
  const [pq, setPq] = useState(""); // búsqueda de referencia en bodega
  const [showSug, setShowSug] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState(null); // venta que se está editando
  const [confirmDelId, setConfirmDelId] = useState(null); // venta pendiente de confirmar borrado
  const [actionSale, setActionSale] = useState(null); // venta seleccionada (menú editar/eliminar)
  const [motivoAnular, setMotivoAnular] = useState(""); // "" = selector de anular cerrado
  const [verFecha, setVerFecha] = useState(hoyLocal()); // día que se está viendo (por defecto hoy)
  const userPickedDate = useRef(false); // true cuando el usuario ya eligió una fecha a mano

  // Si HOY no tiene ventas pero sí hay ventas anteriores, abrir en el día más
  // reciente con ventas (para no mostrar una pantalla vacía). En cuanto el
  // usuario elige una fecha a mano, se respeta su elección.
  useEffect(() => {
    if (userPickedDate.current) return;
    const hoy = hoyLocal();
    if (sales.some((s) => s.fecha === hoy)) return; // hay ventas hoy → quedarse en hoy
    let latest = "";
    sales.forEach((s) => { if (s.fecha && s.fecha > latest) latest = s.fecha; });
    if (latest && latest !== verFecha) setVerFecha(latest);
  }, [sales]);

  // Referencias en bodega que coinciden con lo escrito (por inicial o cualquier parte)
  const norm = (s) => (s || "").toString().toLowerCase().trim();
  const sugerencias = !pq.trim()
    ? []
    : products
        .filter((p) => (Number(p.stock) || 0) > 0)
        .filter((p) => {
          const texto = norm(p.referencia + " " + p.modelo + " " + p.color + " " + p.talla);
          return norm(pq).split(/\s+/).every((w) => texto.includes(w));
        });

  // Agrupar por modelo+color: una tarjeta por referencia con chips de talla
  const grupos = [];
  sugerencias.forEach((p) => {
    const clave = norm(p.modelo) + "|" + norm(p.color);
    let g = grupos.find((x) => x.clave === clave);
    if (!g) {
      g = {
        clave,
        modelo: p.modelo,
        color: p.color,
        refBase: (p.referencia || "").replace(/-\d+$/, ""),
        precio: p.precio,
        tallas: [],
      };
      grupos.push(g);
    }
    g.tallas.push(p);
  });
  grupos.forEach((g) => g.tallas.sort((a, b) => Number(a.talla) - Number(b.talla)));

  // Si vienen desde "registrar a mano" en Escanear, abrir el formulario directo
  useEffect(() => {
    if (autoOpen) {
      setEditingSaleId(null);
      setDraft(emptySale());
      setPq("");
      setShowSug(true);
      setShowForm(true);
      onAutoOpened && onAutoOpened();
    }
  }, [autoOpen]);

  const byDate = {};
  [...sales]
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    .forEach((s) => {
      byDate[s.fecha] = byDate[s.fecha] || [];
      byDate[s.fecha].push(s);
    });

  // Solo se muestran las ventas del día seleccionado (por defecto, hoy).
  const ventasDia = byDate[verFecha] || [];
  // Suma o resta días a una fecha "YYYY-MM-DD" en hora local.
  const shiftFecha = (iso, n) => {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d + n);
    const p = (x) => String(x).padStart(2, "0");
    return dt.getFullYear() + "-" + p(dt.getMonth() + 1) + "-" + p(dt.getDate());
  };

  // Al elegir producto del inventario, autocompletar modelo/talla/precio
  const pickProduct = (id) => {
    const p = products.find((x) => x.id === id);
    if (p) {
      setDraft({ ...draft, productoId: id, modelo: p.modelo, talla: p.talla, precio: p.precio });
    } else {
      setDraft({ ...draft, productoId: "" });
    }
    setPq("");
    setShowSug(false);
  };

  // Abrir el formulario para EDITAR una venta existente
  const startEdit = (s) => {
    setConfirmDelId(null);
    setEditingSaleId(s.id);
    setDraft({
      productoId: s.productoId || "",
      modelo: s.modelo || "",
      talla: s.talla || "",
      precio: s.precio !== undefined ? s.precio : "",
      cantidad: Number(s.cantidad) || 1,
      cliente: s.cliente || "",
      canal: s.canal || "",
      fecha: s.fecha || hoyLocal(),
    });
    setPq("");
    setShowSug(false);
    setShowForm(true);
  };

  // De qué referencia de bodega salió el par de una venta (para devolver stock).
  // Ventas nuevas: traen productoId ("" = venta libre, que no descontó stock).
  // Ventas viejas (sin el dato): se busca la referencia por nombre de modelo
  // (y talla, si ambas la tienen) — los modelos del inventario son únicos.
  const productoDeVenta = (s) => {
    if (s.productoId) return products.find((p) => p.id === s.productoId) || null;
    if (s.productoId === undefined) {
      const candidatas = products.filter(
        (p) =>
          norm(p.modelo) === norm(s.modelo) &&
          (!norm(s.talla) || !norm(p.talla) || norm(p.talla) === norm(s.talla))
      );
      if (candidatas.length === 1) return candidatas[0];
    }
    return null;
  };
  const conStockDevuelto = (s) => {
    const prod = productoDeVenta(s);
    if (!prod) return { nextProducts: products, devolvio: false };
    return {
      nextProducts: products.map((p) =>
        p.id === prod.id ? { ...p, stock: (Number(p.stock) || 0) + (Number(s.cantidad) || 1) } : p
      ),
      devolvio: true,
    };
  };

  // Borrar una venta (devuelve el stock si había descontado de una referencia).
  // Una venta ANULADA ya devolvió su stock al anularse: borrarla no lo devuelve
  // otra vez (si no, el inventario quedaría inflado).
  const deleteSale = (s) => {
    const { nextProducts, devolvio } = s.anulada ? { nextProducts: products, devolvio: false } : conStockDevuelto(s);
    persist(nextProducts, sales.filter((x) => x.id !== s.id));
    setConfirmDelId(null);
    showToast(devolvio ? "Venta eliminada y stock devuelto ✓" : "Venta eliminada ✓");
  };

  // Anular una venta TERMINADA sin borrarla (solo socios): repone el stock,
  // marca quién/cuándo/por qué. Queda en el historial pero no suma en ningún
  // número (ventas del día, stats, caja).
  const anularVenta = (s, motivo) => {
    const { nextProducts, devolvio } = conStockDevuelto(s);
    const nextSales = sales.map((x) =>
      x.id === s.id
        ? {
            ...x,
            anulada: true,
            anulada_fecha: new Date().toISOString(),
            anulada_por: userEmail || "socio",
            anulada_motivo: motivo,
          }
        : x
    );
    persist(nextProducts, nextSales);
    setMotivoAnular("");
    showToast(devolvio ? "Venta anulada y stock repuesto ✓" : "Venta anulada ✓ (era venta libre: no había stock que reponer)");
  };

  const saveSale = () => {
    if (!draft.modelo.trim() || !Number(draft.precio)) {
      showToast("El modelo y el precio son obligatorios.", true);
      return;
    }
    if (!draft.canal) {
      showToast("Elige el medio de venta (WhatsApp, Tienda, etc.).", true);
      return;
    }
    const cantidad = Math.max(1, Math.floor(Number(draft.cantidad) || 1));

    // ── Edición: solo actualiza los datos de la venta (no recalcula stock) ──
    if (editingSaleId) {
      const nextSales = sales.map((s) =>
        s.id === editingSaleId
          ? {
              ...s,
              modelo: draft.modelo,
              talla: draft.talla,
              precio: Number(draft.precio) || 0,
              cantidad,
              cliente: draft.cliente || "",
              canal: draft.canal || "",
              fecha: draft.fecha || s.fecha,
            }
          : s
      );
      persist(products, nextSales);
      setShowForm(false);
      setDraft(emptySale());
      setEditingSaleId(null);
      showToast("Venta actualizada ✓");
      return;
    }

    let costo = 0;
    let nextProducts = [...products];
    if (draft.productoId) {
      const prod = products.find((p) => p.id === draft.productoId);
      const stockDisp = Number(prod && prod.stock) || 0;
      if (cantidad > stockDisp) {
        showToast(`Solo hay ${stockDisp} par${stockDisp === 1 ? "" : "es"} en stock.`, true);
        return;
      }
      nextProducts = nextProducts.map((p) => {
        if (p.id === draft.productoId) {
          costo = Number(p.costo) || 0;
          return { ...p, stock: Math.max(0, (Number(p.stock) || 0) - cantidad) };
        }
        return p;
      });
    }
    const nextSales = [
      ...sales,
      {
        id: "s" + Date.now() + Math.floor(Math.random() * 999),
        // Guardar de qué referencia salió el par: sin esto, al borrar la venta
        // no se sabe a cuál producto devolverle el stock. "" = venta libre.
        productoId: draft.productoId || "",
        fecha: hoyLocal(),
        cliente: draft.cliente || "",
        modelo: draft.modelo,
        talla: draft.talla,
        precio: Number(draft.precio) || 0,
        cantidad,
        costo,
        canal: draft.canal || "",
        origen: "manual",
      },
    ];
    persist(nextProducts, nextSales);
    setShowForm(false);
    setDraft(emptySale());
    showToast(
      draft.productoId
        ? `Venta registrada · ${cantidad} par${cantidad === 1 ? "" : "es"} descontado${cantidad === 1 ? "" : "s"} ✓`
        : "Venta registrada ✓"
    );
  };

  const exportVentas = () => {
    if (sales.length === 0) {
      showToast("No hay ventas para exportar.", true);
      return;
    }
    const rows = [
      ["Fecha", "Modelo", "Talla", "Cliente", "Canal", "Pares", "Precio unit.", "Costo unit.", "Total", "Ganancia", "Origen", "Estado"],
      ...[...sales]
        .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
        .map((s) => {
          const cant = Number(s.cantidad) || 1;
          const precio = Number(s.precio) || 0;
          const costo = Number(s.costo) || 0;
          return [
            s.fecha, s.modelo, s.talla, s.cliente, s.canal,
            cant, precio, costo, precio * cant, (precio - costo) * cant,
            s.origen === "foto" ? "desde foto" : "manual",
            s.anulada ? "ANULADA (" + (s.anulada_motivo || "sin motivo") + ")" : "activa",
          ];
        }),
    ];
    downloadCSV(rows, "varman-ventas-" + hoyLocal() + ".csv");
    showToast("Ventas exportadas ✓");
  };

  return (
    <div style={{ padding: "16px 16px 0" }} className="vm-fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px", marginBottom: 10 }}>
        <div style={display(19)}>Ventas</div>
        <div style={{ display: "flex", gap: 6 }}>
          <BotonExportar onClick={exportVentas} />
          <button onClick={() => { setEditingSaleId(null); setDraft(emptySale()); setPq(""); setShowSug(true); setShowForm(true); }} style={btnPrimary({ padding: "8px 14px", borderRadius: 11, fontSize: 12.5 })}>
            + Venta
          </button>
        </div>
      </div>

      {/* Selector de día: flechas para moverse día a día + calendario para elegir cualquier fecha */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "0 4px" }}>
        <button onClick={() => { userPickedDate.current = true; setVerFecha(shiftFecha(verFecha, -1)); }} aria-label="Día anterior" style={btnGhost({ padding: "10px 14px", borderRadius: 12, fontSize: 17, lineHeight: 1 })}>‹</button>
        <input
          type="date"
          value={verFecha}
          max={hoyLocal()}
          onChange={(e) => { if (e.target.value) { userPickedDate.current = true; setVerFecha(e.target.value); } }}
          style={inputStyle({ borderRadius: 12, textAlign: "center", fontWeight: 700, flex: 1 })}
        />
        <button
          onClick={() => { userPickedDate.current = true; setVerFecha(shiftFecha(verFecha, 1)); }}
          disabled={verFecha >= hoyLocal()}
          aria-label="Día siguiente"
          style={btnGhost({ padding: "10px 14px", borderRadius: 12, fontSize: 17, lineHeight: 1, opacity: verFecha >= hoyLocal() ? 0.4 : 1 })}
        >›</button>
        {verFecha !== hoyLocal() && (
          <button onClick={() => { userPickedDate.current = true; setVerFecha(hoyLocal()); }} style={btnPrimary({ padding: "10px 14px", borderRadius: 12, fontSize: 12.5 })}>Hoy</button>
        )}
      </div>

      {(() => {
        const list = ventasDia;
        // las anuladas se muestran (historial) pero no suman en los totales
        const validas = list.filter((s) => !s.anulada);
        const total = validas.reduce((a, s) => a + (Number(s.precio) || 0) * (Number(s.cantidad) || 1), 0);
        const ganancia = validas.reduce((a, s) => a + ((Number(s.precio) || 0) - (Number(s.costo) || 0)) * (Number(s.cantidad) || 1), 0);
        const esHoy = verFecha === hoyLocal();
        return (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, padding: "0 4px" }}>
              <div style={{ ...eyebrow(C.ink2), fontSize: 11.5 }}>{formatDate(verFecha)}{esHoy ? " · hoy" : ""}</div>
              {list.length > 0 && (
                <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>
                  {validas.length} venta{validas.length !== 1 ? "s" : ""} · <b style={{ color: C.ink }}>{fmt(total)}</b>{" "}
                  <span style={{ background: C.greenSoft, color: C.green, fontWeight: 700, fontSize: 11, padding: "2px 7px", borderRadius: 99, marginLeft: 4 }}>
                    +{fmt(ganancia)}
                  </span>
                </div>
              )}
            </div>
            {list.length === 0 ? (
              <EmptyState
                icon={<IconChart big />}
                title={esHoy ? "Aún no hay ventas hoy" : "Sin ventas ese día"}
                text={esHoy ? "Registra una venta con el botón + Venta." : "Elige otra fecha con el calendario o vuelve a Hoy."}
              />
            ) : (
            <div style={cardStyle({ overflow: "hidden" })}>
              {list.map((s, i) => (
                <div
                  key={s.id}
                  onClick={() => setActionSale(s)}
                  style={{
                    padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center",
                    borderTop: i > 0 ? `1px solid ${C.line}` : "none", cursor: "pointer",
                    opacity: s.anulada ? 0.55 : 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                    {(() => {
                      const foto = fotoDe(s.modelo, s.color);
                      // Miniatura de la referencia (misma foto del inventario). La talla
                      // se muestra como distintivo sobre la foto; si no hay foto, el
                      // recuadro muestra la talla centrada como antes.
                      return (
                        <div
                          style={{
                            width: 38, height: 38, borderRadius: 11, background: C.bg, flexShrink: 0,
                            position: "relative", overflow: "hidden",
                            display: "flex", alignItems: "center", justifyContent: "center", ...display(13),
                          }}
                        >
                          {foto ? (
                            <>
                              <img src={foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              {s.talla && (
                                <span style={{ position: "absolute", right: 0, bottom: 0, background: "rgba(16,16,18,.78)", color: "#fff", fontSize: 9, fontWeight: 800, padding: "1px 4px", borderTopLeftRadius: 7, lineHeight: 1.3 }}>
                                  {s.talla}
                                </span>
                              )}
                            </>
                          ) : (
                            s.talla || <span style={{ fontSize: 16 }}>👟</span>
                          )}
                        </div>
                      );
                    })()}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: s.anulada ? "line-through" : "none" }}>
                        {s.modelo}
                      </div>
                      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>
                        {s.anulada && (
                          <span style={{ background: C.redSoft, color: C.red, fontWeight: 800, fontSize: 9.5, padding: "1px 6px", borderRadius: 99, marginRight: 5, letterSpacing: "0.04em" }}>
                            ANULADA{s.anulada_motivo ? " · " + s.anulada_motivo : ""}
                          </span>
                        )}
                        {(Number(s.cantidad) || 1) > 1 && <>{s.cantidad} pares × {fmt(s.precio)} · </>}
                        {s.cliente && <>{s.cliente} · </>}
                        {s.canal && <>{s.canal} · </>}
                        {s.origen === "foto" ? "desde foto" : "manual"}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 14.5, textDecoration: s.anulada ? "line-through" : "none" }}>{fmt((Number(s.precio) || 0) * (Number(s.cantidad) || 1))}</div>
                    <span style={{ color: C.muted, fontSize: 18, lineHeight: 1 }}>›</span>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        );
      })()}

      {showForm && (
        <Sheet title={editingSaleId ? "Editar venta" : "Registrar venta"} onClose={() => { setShowForm(false); setEditingSaleId(null); }}>
          <Field label="Referencia de bodega">
            {draft.productoId ? (
              (() => {
                const p = products.find((x) => x.id === draft.productoId);
                const fotoSel = p ? fotoDe(p.modelo, p.color) : null;
                return (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                    background: C.greenSoft, border: `1.5px solid ${C.green}`, borderRadius: 12, padding: "10px 13px",
                  }}>
                    {fotoSel && (
                      <img src={fotoSel} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", flexShrink: 0, border: `1px solid ${C.line}` }} />
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p ? `${p.modelo}${p.color ? " " + p.color : ""}` : "Producto"}
                      </div>
                      <div style={{ fontSize: 11.5, color: C.green, fontWeight: 700, marginTop: 1 }}>
                        {p && p.referencia ? `Ref ${p.referencia} · ` : ""}talla {p ? p.talla : ""} · stock {p ? p.stock : ""} → se descontarán {Math.max(1, Math.floor(Number(draft.cantidad) || 1))} par{Math.max(1, Math.floor(Number(draft.cantidad) || 1)) === 1 ? "" : "es"}
                      </div>
                    </div>
                    <button onClick={() => pickProduct("")} style={btnGhost({ padding: "7px 11px", borderRadius: 10, fontSize: 12, flexShrink: 0 })}>
                      Quitar
                    </button>
                  </div>
                );
              })()
            ) : (
              <div>
                <input
                  value={pq}
                  onChange={(e) => { setPq(e.target.value); setShowSug(true); }}
                  onFocus={() => setShowSug(true)}
                  placeholder="Escribe la referencia, modelo o talla…"
                  style={inputStyle()}
                />
                {showSug && pq.trim() !== "" && (
                  <div style={{
                    marginTop: 6, background: C.card, border: `1.5px solid ${C.line}`, borderRadius: 12,
                    maxHeight: 280, overflowY: "auto",
                  }}>
                    {sugerencias.length === 0 && (
                      <div style={{ padding: "12px 13px", fontSize: 12.5, color: C.muted }}>
                        {products.length === 0
                          ? "No hay productos en bodega. Será una venta libre."
                          : "Ninguna referencia en stock coincide. Puedes seguir como venta libre."}
                      </div>
                    )}
                    {grupos.map((g, i) => {
                      const foto = fotoDe(g.modelo, g.color);
                      return (
                        <div
                          key={g.clave}
                          style={{ padding: "11px 13px", borderTop: i > 0 ? `1px solid ${C.line}` : "none", display: "flex", gap: 10 }}
                        >
                          {/* Foto del inventario para reconocer el zapato de una */}
                          {foto ? (
                            <img src={foto} alt="" style={{ width: 54, height: 54, borderRadius: 11, objectFit: "cover", flexShrink: 0, border: `1px solid ${C.line}`, background: C.bg }} />
                          ) : (
                            <div style={{ width: 54, height: 54, borderRadius: 11, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0, border: `1px solid ${C.line}` }}>👟</div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                              <div style={{ fontWeight: 700, fontSize: 13.5, color: C.ink, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {g.refBase && (
                                  <span style={{ background: C.accentSoft, color: C.accent, fontWeight: 800, fontSize: 10.5, padding: "2px 7px", borderRadius: 99, marginRight: 6 }}>
                                    {g.refBase}
                                  </span>
                                )}
                                {g.modelo}{g.color ? " " + g.color : ""}
                              </div>
                              <span style={{ fontSize: 11.5, color: C.muted, fontWeight: 600, flexShrink: 0 }}>{fmt(g.precio)}</span>
                            </div>
                            <div style={{ ...eyebrow(C.muted), fontSize: 9.5, margin: "7px 0 5px" }}>Toca la talla que se vendió</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {g.tallas.map((p) => (
                                <button
                                  key={p.id}
                                  onClick={() => pickProduct(p.id)}
                                  style={{
                                    border: `1.5px solid ${C.line}`, background: C.bg, borderRadius: 10,
                                    padding: "7px 10px", cursor: "pointer", fontFamily: "Inter, sans-serif",
                                    display: "flex", flexDirection: "column", alignItems: "center", gap: 1, minWidth: 52,
                                  }}
                                >
                                  <span style={{ ...display(15), lineHeight: 1 }}>{p.talla || "—"}</span>
                                  <span style={{ fontSize: 9, fontWeight: 700, color: Number(p.stock) <= 1 ? C.red : C.muted, letterSpacing: "0.04em" }}>
                                    {p.stock} {Number(p.stock) === 1 ? "PAR" : "PARES"}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>
                  Si no eliges una referencia, será una venta libre (no descuenta stock).
                </div>
              </div>
            )}
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
            <Field label="Modelo *">
              <input value={draft.modelo} onChange={(e) => setDraft({ ...draft, modelo: e.target.value })} placeholder="Nike Air Force 1" style={inputStyle()} />
            </Field>
            <Field label="Talla">
              <input value={draft.talla} onChange={(e) => setDraft({ ...draft, talla: e.target.value })} placeholder="40" style={inputStyle()} />
            </Field>
            <Field label="Precio de venta *">
              <input type="number" min="0" value={draft.precio} onChange={(e) => setDraft({ ...draft, precio: e.target.value })} placeholder="200000" style={inputStyle()} />
            </Field>
            <Field label="Cliente">
              <input value={draft.cliente} onChange={(e) => setDraft({ ...draft, cliente: e.target.value })} placeholder="Nombre" style={inputStyle()} />
            </Field>
          </div>
          {(() => {
            const prodSel = draft.productoId ? products.find((p) => p.id === draft.productoId) : null;
            const stockDisp = prodSel ? Number(prodSel.stock) || 0 : null;
            const cant = Math.max(1, Math.floor(Number(draft.cantidad) || 1));
            const unit = Number(draft.precio) || 0;
            return (
              <Field label="Pares vendidos *">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", background: C.bg, borderRadius: 12, padding: 3 }}>
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, cantidad: Math.max(1, cant - 1) })}
                      style={btnStep()}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      inputMode="numeric"
                      value={draft.cantidad}
                      onChange={(e) => setDraft({ ...draft, cantidad: e.target.value })}
                      style={inputStyle({ width: 56, textAlign: "center", fontWeight: 800, border: "none", background: "transparent", padding: "8px 4px" })}
                    />
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, cantidad: stockDisp ? Math.min(stockDisp, cant + 1) : cant + 1 })}
                      style={btnStep()}
                    >
                      +
                    </button>
                  </div>
                  <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.4 }}>
                    <div>Total: <b style={{ color: C.ink }}>{fmt(unit * cant)}</b></div>
                    {stockDisp !== null && <div>Quedan {stockDisp} par{stockDisp === 1 ? "" : "es"} en stock</div>}
                  </div>
                </div>
              </Field>
            );
          })()}
          <Field label="Medio de venta *">
            <select value={draft.canal} onChange={(e) => setDraft({ ...draft, canal: e.target.value })} style={inputStyle()}>
              <option value="">Elige el medio de venta…</option>
              <option value="tienda">Tienda</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Instagram">Instagram</option>
            </select>
          </Field>
          {editingSaleId && (
            <Field label="Fecha de la venta">
              <input type="date" value={draft.fecha || ""} onChange={(e) => setDraft({ ...draft, fecha: e.target.value })} style={inputStyle()} />
            </Field>
          )}
          <button onClick={saveSale} style={btnPrimary({ width: "100%", marginTop: 14, padding: "15px", fontSize: 15 })}>
            {editingSaleId ? "Guardar cambios" : "✓ Registrar venta"}
          </button>
          {editingSaleId && (
            <div style={{ fontSize: 11, color: C.muted, marginTop: 8, textAlign: "center", lineHeight: 1.4 }}>
              Editar no recalcula el stock. Para devolver pares al inventario, borra la venta (eso sí devuelve el stock).
            </div>
          )}
        </Sheet>
      )}

      {actionSale && (
        <Sheet title={actionSale.anulada ? "Venta anulada" : "Venta"} onClose={() => { setActionSale(null); setConfirmDelId(null); setMotivoAnular(""); }}>
          <div style={{ background: C.card, border: `1.5px solid ${C.line}`, borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 16, textDecoration: actionSale.anulada ? "line-through" : "none" }}>{actionSale.modelo}</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 5, lineHeight: 1.6 }}>
              {actionSale.talla ? <>Talla {actionSale.talla} · </> : null}
              {Number(actionSale.cantidad) || 1} par{(Number(actionSale.cantidad) || 1) === 1 ? "" : "es"} · <b style={{ color: C.ink }}>{fmt((Number(actionSale.precio) || 0) * (Number(actionSale.cantidad) || 1))}</b><br />
              {actionSale.cliente ? <>{actionSale.cliente} · </> : null}{actionSale.canal || "sin medio de venta"}<br />
              {formatDate(actionSale.fecha)}
            </div>
            {actionSale.anulada && (
              <div style={{ fontSize: 12, color: C.red, marginTop: 8, fontWeight: 700, lineHeight: 1.5 }}>
                ⛔ Anulada ({actionSale.anulada_motivo || "sin motivo"})
                {actionSale.anulada_por ? <> por {actionSale.anulada_por}</> : null}
                {actionSale.anulada_fecha ? <> el {formatDate(String(actionSale.anulada_fecha).slice(0, 10))}</> : null}.
                <span style={{ color: C.muted, fontWeight: 600 }}> El stock ya fue repuesto; esta venta no suma en los números.</span>
              </div>
            )}
          </div>
          {!actionSale.anulada && (
            <button onClick={() => { const s = actionSale; setActionSale(null); setConfirmDelId(null); setMotivoAnular(""); startEdit(s); }} style={btnPrimary({ width: "100%", padding: "14px", fontSize: 15, marginBottom: 10 })}>
              ✏️  Editar venta
            </button>
          )}
          {/* Anular (solo socios, mismo criterio que la Caja): repone stock y
              deja la venta en el historial marcada con fecha, quién y motivo */}
          {!actionSale.anulada && esSocio && (
            motivoAnular ? (
              <div style={{ background: C.card, border: `1.5px solid ${C.redSoft}`, borderRadius: 14, padding: "13px 14px", marginBottom: 10 }}>
                <Field label="Motivo de la anulación">
                  <select value={motivoAnular} onChange={(e) => setMotivoAnular(e.target.value)} style={inputStyle()}>
                    <option value="prueba">Prueba</option>
                    <option value="devolución">Devolución</option>
                    <option value="error">Error</option>
                  </select>
                </Field>
                <button onClick={() => { anularVenta(actionSale, motivoAnular); setActionSale(null); }} style={{ width: "100%", padding: "13px", fontSize: 14.5, borderRadius: 13, border: "none", background: C.red, color: "#fff", fontWeight: 800, fontFamily: "Inter, sans-serif", cursor: "pointer" }}>
                  Sí, anular (repone el stock)
                </button>
                <button onClick={() => setMotivoAnular("")} style={btnGhost({ width: "100%", padding: "11px", fontSize: 13, marginTop: 8 })}>
                  Mejor no
                </button>
              </div>
            ) : (
              <button onClick={() => { setConfirmDelId(null); setMotivoAnular("prueba"); }} style={btnGhost({ width: "100%", padding: "14px", fontSize: 15, color: C.red, border: `1.5px solid ${C.redSoft}`, marginBottom: 10 })}>
                ⛔ Anular venta (queda en el historial)
              </button>
            )
          )}
          {confirmDelId === actionSale.id ? (
            <button onClick={() => { deleteSale(actionSale); setActionSale(null); }} style={{ width: "100%", padding: "14px", fontSize: 15, borderRadius: 13, border: "none", background: C.red, color: "#fff", fontWeight: 800, fontFamily: "Inter, sans-serif", cursor: "pointer" }}>
              {actionSale.anulada ? "Sí, eliminar del historial (no devuelve stock otra vez)" : "Sí, eliminar (devuelve el stock)"}
            </button>
          ) : (
            <button onClick={() => { setMotivoAnular(""); setConfirmDelId(actionSale.id); }} style={btnGhost({ width: "100%", padding: "14px", fontSize: 15, color: C.red, border: `1.5px solid ${C.redSoft}` })}>
              🗑️  Eliminar venta
            </button>
          )}
        </Sheet>
      )}
    </div>
  );
}

function formatDate(iso) {
  try {
    const [y, m, d] = iso.split("-").map(Number);
    const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    const dt = new Date(y, m - 1, d);
    return `${dias[dt.getDay()]} ${d} ${meses[m - 1]} ${y}`;
  } catch {
    return iso;
  }
}

// ============================================================
// Componentes compartidos
// ============================================================
// Número que "cuenta" de 0 al valor al aparecer (respeta reduced-motion)
function CountUp({ value, format, duration = 950 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const reduced = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !value) {
      setN(value || 0);
      return;
    }
    let raf, start = null;
    const tick = (t) => {
      if (start == null) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setN(value);
    };
    raf = requestAnimationFrame(tick);
    return () => raf && cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{format ? format(n) : Math.round(n)}</>;
}

// ============================================================
// Estadísticas
// ============================================================
function Estadisticas({ products, sales }) {
  const num = (x) => Number(x) || 0;
  const qty = (s) => num(s.cantidad) || 1;

  // ============================================================
  // El dashboard tiene DOS bloques:
  //   1. VENTAS DEL PERIODO — todo lo que depende del filtro de fechas:
  //      KPIs, línea de ventas por día, top modelos, torta por marca, canales.
  //   2. LA BODEGA HOY — foto actual del inventario (no depende del filtro):
  //      patrimonio, ritmo de venta / duración de la bodega y plata parada.
  // ============================================================

  // ---- Periodo seleccionado (filtro de fechas) ----
  const [periodo, setPeriodo] = useState("mes");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const pad2 = (n) => String(n).padStart(2, "0");
  const ymd = (d) => d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  const hoyISO = ymd(new Date());
  const [rDesde, rHasta, rLabel] = (() => {
    const now = new Date();
    if (periodo === "hoy") return [hoyISO, hoyISO, "Hoy"];
    if (periodo === "mes") return [ymd(new Date(now.getFullYear(), now.getMonth(), 1)), hoyISO, "Este mes"];
    if (periodo === "mesPasado")
      return [ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)), ymd(new Date(now.getFullYear(), now.getMonth(), 0)), "Mes pasado"];
    if (periodo === "custom") {
      const f = desde || hoyISO, t = hasta || hoyISO;
      return f <= t ? [f, t, "Personalizado"] : [t, f, "Personalizado"];
    }
    const f = new Date(now); f.setDate(f.getDate() - 6);
    return [ymd(f), hoyISO, "Últimos 7 días"];
  })();
  const salesR = sales.filter((s) => s.fecha && s.fecha >= rDesde && s.fecha <= rHasta);

  // Fecha de la venta más reciente (para sugerir un periodo con datos cuando el
  // periodo elegido está vacío, p. ej. si las ventas cargadas son de meses atrás).
  let ultimaVenta = "";
  sales.forEach((s) => { if (s.fecha && s.fecha > ultimaVenta) ultimaVenta = s.fecha; });
  const irAUltimaVenta = () => {
    if (!ultimaVenta) return;
    const [y, m] = ultimaVenta.split("-").map(Number);
    setDesde(y + "-" + pad2(m) + "-01");
    setHasta(ymd(new Date(y, m, 0))); // último día de ese mes
    setPeriodo("custom");
  };

  // ---- KPIs del periodo ----
  const totalVendido = salesR.reduce((a, s) => a + num(s.precio) * qty(s), 0);
  const gananciaHist = salesR.reduce((a, s) => a + (num(s.precio) - num(s.costo)) * qty(s), 0);
  const paresVendidos = salesR.reduce((a, s) => a + qty(s), 0);
  const margenPct = totalVendido > 0 ? Math.round((gananciaHist / totalVendido) * 100) : 0;
  const promPar = paresVendidos > 0 ? Math.round(totalVendido / paresVendidos) : 0;

  // ---- Cubetas de la gráfica (día si el rango es corto, semana o mes si es largo) ----
  const meses3 = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const dDesde = new Date(rDesde + "T12:00:00");
  const dHasta = new Date(rHasta + "T12:00:00");
  const numDias = Math.max(1, Math.round((dHasta - dDesde) / 86400000) + 1);
  const dias = [];
  if (numDias <= 31) {
    for (let i = 0; i < numDias; i++) {
      const d = new Date(dDesde); d.setDate(d.getDate() + i);
      const iso = ymd(d);
      const total = salesR.filter((s) => s.fecha === iso).reduce((a, s) => a + num(s.precio) * qty(s), 0);
      dias.push({ total, label: String(d.getDate()), esHoy: iso === hoyISO });
    }
  } else if (numDias <= 92) {
    for (let i = 0; i < numDias; i += 7) {
      const start = new Date(dDesde); start.setDate(start.getDate() + i);
      const end = new Date(start); end.setDate(end.getDate() + 6);
      const sIso = ymd(start), eIso = ymd(end > dHasta ? dHasta : end);
      const total = salesR.filter((s) => s.fecha >= sIso && s.fecha <= eIso).reduce((a, s) => a + num(s.precio) * qty(s), 0);
      dias.push({ total, label: start.getDate() + "/" + pad2(start.getMonth() + 1), esHoy: false });
    }
  } else {
    let cur = new Date(dDesde.getFullYear(), dDesde.getMonth(), 1);
    while (cur <= dHasta) {
      const y = cur.getFullYear(), m = cur.getMonth();
      const total = salesR.filter((s) => { const sd = new Date(s.fecha + "T12:00:00"); return sd.getFullYear() === y && sd.getMonth() === m; }).reduce((a, s) => a + num(s.precio) * qty(s), 0);
      dias.push({ total, label: meses3[m], esHoy: false });
      cur = new Date(y, m + 1, 1);
    }
  }
  const maxDia = Math.max(1, ...dias.map((x) => x.total));

  // ---- Top modelos vendidos (pares y plata del periodo) ----
  const modelos = {};
  salesR.forEach((s) => {
    const m = s.modelo || "—";
    if (!modelos[m]) modelos[m] = { pares: 0, plata: 0 };
    modelos[m].pares += qty(s);
    modelos[m].plata += num(s.precio) * qty(s);
  });
  const topModelos = Object.entries(modelos)
    .map(([k, v]) => ({ modelo: k, pares: v.pares, plata: v.plata }))
    .sort((a, b) => b.pares - a.pares || b.plata - a.plata)
    .slice(0, 5);
  const maxModelo = Math.max(1, ...topModelos.map((x) => x.pares));

  // ---- Ingresos por marca (torta) ----
  const marcaDe = (modelo) => {
    const M = (modelo || "").toUpperCase().trim();
    if (M.indexOf("NEW BALANCE") === 0) return "NEW BALANCE";
    if (M.indexOf("LOUIS VUITTON") === 0) return "LOUIS V.";
    return M.split(" ")[0] || "OTRAS";
  };
  const marcasMap = {};
  salesR.forEach((s) => {
    const m = marcaDe(s.modelo);
    marcasMap[m] = (marcasMap[m] || 0) + num(s.precio) * qty(s);
  });
  let marcasArr = Object.entries(marcasMap).map(([k, v]) => ({ marca: k, total: v })).sort((a, b) => b.total - a.total);
  if (marcasArr.length > 5) {
    const resto = marcasArr.slice(4).reduce((a, x) => a + x.total, 0);
    marcasArr = marcasArr.slice(0, 4).concat([{ marca: "Otras", total: resto }]);
  }
  const totalMarcas = marcasArr.reduce((a, x) => a + x.total, 0);
  const DONA_COLORS = [C.accent, "#2BD576", "#6E8BFF", "#E1306C", "#FFC53D"];

  // ---- Canales de venta (solo ventas que tienen canal registrado) ----
  const canales = {};
  salesR.forEach((s) => {
    if (!s.canal) return;
    canales[s.canal] = (canales[s.canal] || 0) + num(s.precio) * qty(s);
  });
  const canalArr = Object.entries(canales).map(([k, v]) => ({ canal: k, total: v })).sort((a, b) => b.total - a.total);

  // ---- La bodega HOY (no depende del periodo) ----
  const totalPares = products.reduce((a, p) => a + num(p.stock), 0);
  const numRefs = products.length;
  const valorCosto = products.reduce((a, p) => a + num(p.stock) * num(p.costo), 0);
  const valorVenta = products.reduce((a, p) => a + num(p.stock) * num(p.precio), 0);
  const gananciaPotencial = valorVenta - valorCosto;
  const agotados = products.filter((p) => num(p.stock) <= 2).length;
  const costPct = valorVenta > 0 ? (valorCosto / valorVenta) * 100 : 0;
  const profitPct = valorVenta > 0 ? 100 - costPct : 0;

  // Ritmo de venta del periodo elegido → cuánto dura la bodega a ese ritmo.
  // En calzado lo sano es vender toda la bodega cada 2–3 meses (rotar 4–6 veces al año).
  const ritmoDia = numDias > 0 ? paresVendidos / numDias : 0;
  const diasBodega = ritmoDia > 0 ? Math.round(totalPares / ritmoDia) : null;
  const rotacionColor = diasBodega == null ? "#FF6B6B" : diasBodega <= 95 ? "#2BD576" : diasBodega <= 180 ? "#FFC53D" : "#FF6B6B";
  const rotacionTexto = diasBodega == null ? "Sin ventas en el periodo elegido" : diasBodega <= 95 ? "Ritmo sano (lo ideal: venderla en 2–3 meses)" : diasBodega <= 180 ? "Ritmo lento — empuja los que no rotan" : "Muy lento — hay mucha plata quieta";

  // Plata parada: referencias CON stock que no venden ni un par hace 30+ días.
  const hace30 = ymd(new Date(Date.now() - 30 * 86400000));
  const vendidoReciente = {};
  sales.forEach((s) => { if (s.fecha && s.fecha >= hace30) vendidoReciente[s.modelo] = true; });
  const paradas = products
    .filter((p) => num(p.stock) > 0 && !vendidoReciente[p.modelo])
    .map((p) => ({ id: p.id, referencia: p.referencia, modelo: p.modelo, stock: num(p.stock), plata: num(p.stock) * num(p.costo) }))
    .sort((a, b) => b.plata - a.plata);
  const paradasTop = paradas.slice(0, 5);
  const plataParadaTotal = paradas.reduce((a, x) => a + x.plata, 0);
  const maxParada = Math.max(1, ...paradasTop.map((x) => x.plata));

  const vacio = products.length === 0 && sales.length === 0;

  const compact = (n) => {
    n = Number(n) || 0;
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + "M";
    if (n >= 1000) return "$" + Math.round(n / 1000) + "k";
    return "$" + n;
  };

  // Paleta oscura del panel de estadísticas
  const D = {
    ink: "#FFFFFF",
    ink2: "rgba(255,255,255,.66)",
    muted: "rgba(255,255,255,.5)",
    line: "rgba(255,255,255,.11)",
    track: "rgba(255,255,255,.08)",
    green: "#2BD576",
    dot: "#15151B",
  };
  const GLOW = "0 0 10px rgba(255,90,31,.5)";

  const canalColor = (name) => {
    const k = (name || "").toLowerCase();
    if (k.includes("whats")) return "#25D366";
    if (k.includes("insta")) return "#E1306C";
    if (k.includes("tienda")) return "#6E8BFF";
    return "rgba(255,255,255,.32)";
  };

  // Catmull-Rom → Bézier para una línea suave
  const smoothPath = (p) => {
    if (p.length < 2) return "";
    let d = "M " + p[0][0].toFixed(1) + " " + p[0][1].toFixed(1);
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += " C " + c1x.toFixed(1) + " " + c1y.toFixed(1) + " " + c2x.toFixed(1) + " " + c2y.toFixed(1) + " " + p2[0].toFixed(1) + " " + p2[1].toFixed(1);
    }
    return d;
  };

  const sectionHead = (title, right) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
      <div style={{ fontSize: 15.5, fontWeight: 800, color: D.ink, fontFamily: "Inter, sans-serif", letterSpacing: "-0.01em" }}>{title}</div>
      {right != null && <div style={{ fontSize: 12, color: D.ink2, fontWeight: 600 }}>{right}</div>}
    </div>
  );

  const hbar = (val, max, i, color) => (
    <div style={{ flex: 1, background: D.track, borderRadius: 99, height: 13 }}>
      <div style={{
        width: Math.max(val > 0 ? 5 : 0, (val / max) * 100) + "%", height: "100%", borderRadius: 99,
        background: color || `linear-gradient(90deg, ${C.accent}, #FF8A5C)`,
        boxShadow: val > 0 && !color ? GLOW : "none",
        transformOrigin: "left", animation: "vmGrowX .7s cubic-bezier(.2,.8,.2,1) both", animationDelay: (i * 0.05) + "s",
      }} />
    </div>
  );

  // Tarjeta de KPI (bloque 1)
  const kpiCard = (label, valor, opts = {}) => (
    <div style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: "12px 13px" }}>
      <div style={{ fontSize: 10.5, color: D.ink2, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</div>
      <div style={{ ...display(20, opts.color || D.ink), marginTop: 5, textShadow: opts.glow || "none" }}>{valor}</div>
      {opts.sub ? <div style={{ fontSize: 11, color: D.muted, fontWeight: 600, marginTop: 3 }}>{opts.sub}</div> : null}
    </div>
  );

  // Divisor grande entre los dos bloques del dashboard
  const bloque = (titulo, sub) => (
    <div style={{ margin: "26px 0 16px" }}>
      <div style={{ height: 2, background: "linear-gradient(90deg, rgba(255,90,31,.55), rgba(255,255,255,.06))", borderRadius: 2, marginBottom: 14 }} />
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: C.accent }}>{titulo}</div>
      {sub ? <div style={{ fontSize: 12, color: D.muted, fontWeight: 600, marginTop: 3 }}>{sub}</div> : null}
    </div>
  );

  // Geometría de la gráfica de línea (plano cartesiano)
  const VBW = 340, VBH = 168, padL = 6, padR = 6, padT = 22, padB = 30;
  const innerW = VBW - padL - padR, innerH = VBH - padT - padB, baseY = padT + innerH;
  const npts = dias.length;
  const pts = dias.map((d, i) => [padL + (npts > 1 ? i / (npts - 1) : 0.5) * innerW, padT + (1 - d.total / maxDia) * innerH]);
  const lastPt = pts[pts.length - 1] || [padL, baseY];
  const linePath = npts >= 2 ? smoothPath(pts) : "";
  const areaPath = npts >= 2 ? linePath + " L " + lastPt[0].toFixed(1) + " " + baseY + " L " + pts[0][0].toFixed(1) + " " + baseY + " Z" : "";

  return (
    <div className="vm-fade" style={{ padding: "14px 14px 0" }}>
      <div
        style={{
          borderRadius: 26, padding: "20px 16px 22px",
          background: "radial-gradient(135% 95% at 50% -10%, #1D1D26 0%, #101015 60%)",
          border: "1px solid rgba(255,255,255,.07)",
          boxShadow: "0 24px 60px rgba(0,0,0,.42)",
          color: D.ink,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
          <div style={display(22, D.ink)}>Estadísticas</div>
          <div style={{ fontSize: 11, color: D.muted, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>en vivo</div>
        </div>

        {vacio ? (
          <div style={{ textAlign: "center", padding: "30px 16px" }}>
            <div style={{ width: 58, height: 58, borderRadius: 18, background: "rgba(255,255,255,.06)", color: D.ink2, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <IconStats big />
            </div>
            <div style={{ fontWeight: 800, fontSize: 15.5, marginBottom: 5, color: D.ink }}>Aún no hay datos</div>
            <div style={{ fontSize: 13, color: D.ink2, lineHeight: 1.5 }}>Agrega productos y registra ventas para ver tus estadísticas con gráficas.</div>
          </div>
        ) : (
          <>
            {/* ================= BLOQUE 1 · VENTAS DEL PERIODO ================= */}

            {/* Selector de periodo */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[["hoy", "Hoy"], ["7d", "7 días"], ["mes", "Este mes"], ["mesPasado", "Mes pasado"], ["custom", "Personalizado"]].map(([k, lbl]) => (
                  <button
                    key={k}
                    onClick={() => setPeriodo(k)}
                    style={{
                      padding: "7px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif",
                      border: periodo === k ? `1.5px solid ${C.accent}` : "1.5px solid rgba(255,255,255,.16)",
                      background: periodo === k ? C.accent : "transparent",
                      color: periodo === k ? "#fff" : D.ink2,
                    }}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
              {periodo === "custom" && (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={inputStyle({ background: "rgba(255,255,255,.06)", border: "1.5px solid rgba(255,255,255,.16)", color: "#fff", padding: "9px 10px", fontSize: 13, colorScheme: "dark" })} />
                  <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={inputStyle({ background: "rgba(255,255,255,.06)", border: "1.5px solid rgba(255,255,255,.16)", color: "#fff", padding: "9px 10px", fontSize: 13, colorScheme: "dark" })} />
                </div>
              )}
              {salesR.length === 0 && ultimaVenta && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 10, background: "rgba(255,255,255,.06)", border: "1.5px solid rgba(255,255,255,.16)", borderRadius: 12, padding: "10px 12px" }}>
                  <div style={{ fontSize: 12, color: D.ink2, fontWeight: 600, lineHeight: 1.4 }}>
                    No hay ventas en este periodo.<br />Tu venta más reciente fue el <b style={{ color: "#fff" }}>{formatDate(ultimaVenta)}</b>.
                  </div>
                  <button onClick={irAUltimaVenta} style={btnPrimary({ padding: "9px 13px", borderRadius: 10, fontSize: 12, flexShrink: 0 })}>Ver</button>
                </div>
              )}
            </div>

            {/* KPIs del periodo — los 4 números que resumen el negocio */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
              {kpiCard("Ingresos", <CountUp value={totalVendido} format={(x) => fmt(Math.round(x))} />)}
              {kpiCard("Ganancia", <CountUp value={gananciaHist} format={(x) => fmt(Math.round(x))} />, { color: D.green, glow: "0 0 16px rgba(43,213,118,.3)", sub: "margen " + margenPct + "%" })}
              {kpiCard("Pares vendidos", <CountUp value={paresVendidos} format={(x) => String(Math.round(x))} />, { sub: salesR.length + " ventas" })}
              {kpiCard("Promedio por par", <CountUp value={promPar} format={(x) => fmt(Math.round(x))} />)}
            </div>

            {/* Plano cartesiano: ventas en el tiempo */}
            <div style={{ borderTop: `1px solid ${D.line}`, paddingTop: 18, marginBottom: 22 }}>
              {sectionHead("Ventas en el tiempo", rLabel)}
              <svg viewBox={`0 0 ${VBW} ${VBH}`} width="100%" style={{ display: "block", overflow: "visible" }}>
                <defs>
                  <linearGradient id="vmArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.accent} stopOpacity="0.34" />
                    <stop offset="100%" stopColor={C.accent} stopOpacity="0" />
                  </linearGradient>
                  <filter id="vmLineGlow" x="-30%" y="-50%" width="160%" height="200%">
                    <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor={C.accent} floodOpacity="0.6" />
                  </filter>
                </defs>
                {[0, 0.5, 1].map((g, i) => {
                  const y = padT + g * innerH;
                  return <line key={i} x1={padL} y1={y} x2={VBW - padR} y2={y} stroke={D.line} strokeWidth="1" />;
                })}
                {areaPath && <path d={areaPath} fill="url(#vmArea)" />}
                {linePath && (
                  <path
                    d={linePath} fill="none" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    filter="url(#vmLineGlow)" pathLength="1" strokeDasharray="1"
                    style={{ animation: "vmDraw 1.1s cubic-bezier(.2,.8,.2,1) .1s both" }}
                  />
                )}
                {npts >= 1 && dias[npts - 1].esHoy && dias[npts - 1].total > 0 && (
                  <circle cx={lastPt[0]} cy={lastPt[1]} r="5" fill={C.accent}
                    style={{ transformBox: "fill-box", transformOrigin: "center", animation: "vmHalo 2s ease-out infinite" }} />
                )}
                {pts.map((p, i) => (dias[i].total > 0 ? (
                  <circle key={i} cx={p[0]} cy={p[1]} r={dias[i].esHoy ? 4.8 : (npts > 20 ? 1.8 : 2.8)}
                    fill={dias[i].esHoy ? C.accent : D.dot} stroke={C.accent} strokeWidth={dias[i].esHoy ? 2.5 : 1.6}
                    filter={dias[i].esHoy ? "url(#vmLineGlow)" : undefined} />
                ) : null))}
                {dias[npts - 1] && dias[npts - 1].total > 0 && (
                  <text x={lastPt[0]} y={lastPt[1] - 11} textAnchor="end" fontSize="12.5" fontWeight="800" fill={C.accent} fontFamily="Inter, sans-serif">{compact(dias[npts - 1].total)}</text>
                )}
                {pts.map((p, i) => {
                  const step = Math.max(1, Math.ceil(npts / 8));
                  if (!(npts <= 12 || i % step === 0 || i === npts - 1)) return null;
                  return (
                    <text key={"l" + i} x={p[0]} y={VBH - 8} textAnchor="middle" fontSize="11" fontWeight="700"
                      fill={dias[i].esHoy ? C.accent : D.muted} fontFamily="Inter, sans-serif">{dias[i].label}</text>
                  );
                })}
              </svg>
              {totalVendido === 0 && (
                <div style={{ textAlign: "center", color: D.muted, fontSize: 12.5, marginTop: 4 }}>Sin ventas en este periodo</div>
              )}
            </div>

            {/* Barras: top modelos vendidos → qué reponer primero */}
            {topModelos.length > 0 && (
              <div style={{ borderTop: `1px solid ${D.line}`, paddingTop: 18, marginBottom: 22 }}>
                {sectionHead("Los que más venden", "para reponer primero")}
                {topModelos.map((m, i) => (
                  <div key={m.modelo} style={{ marginBottom: i === topModelos.length - 1 ? 0 : 13 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, gap: 8 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: D.ink, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <span style={{ display: "inline-block", width: 18, color: i === 0 ? C.accent : D.muted, fontWeight: 800 }}>{i + 1}</span>{m.modelo}
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 800, color: D.ink, flexShrink: 0 }}>
                        {m.pares}<span style={{ fontSize: 10, color: D.muted, fontWeight: 700, margin: "0 3px" }}>pares ·</span><span style={{ color: D.ink2 }}>{compact(m.plata)}</span>
                      </div>
                    </div>
                    {hbar(m.pares, maxModelo, i)}
                  </div>
                ))}
              </div>
            )}

            {/* Torta: qué marcas dejan la plata */}
            {totalMarcas > 0 && (
              <div style={{ borderTop: `1px solid ${D.line}`, paddingTop: 18, marginBottom: 4 }}>
                {sectionHead("Ingresos por marca", rLabel)}
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  <svg viewBox="0 0 100 100" width="126" height="126" style={{ flexShrink: 0 }}>
                    {(() => {
                      const R = 38, CIRC = 2 * Math.PI * R;
                      let acc = 0;
                      return marcasArr.map((m, i) => {
                        const frac = m.total / totalMarcas;
                        const seg = (
                          <circle key={m.marca} cx="50" cy="50" r={R} fill="none"
                            stroke={DONA_COLORS[i % DONA_COLORS.length]} strokeWidth="15"
                            strokeDasharray={(frac * CIRC).toFixed(2) + " " + ((1 - frac) * CIRC).toFixed(2)}
                            strokeDashoffset={((0.25 - acc) * CIRC).toFixed(2)} />
                        );
                        acc += frac;
                        return seg;
                      });
                    })()}
                    <text x="50" y="48" textAnchor="middle" fontSize="14" fontWeight="800" fill={D.ink} fontFamily="Inter, sans-serif">
                      {Math.round((marcasArr[0].total / totalMarcas) * 100) + "%"}
                    </text>
                    <text x="50" y="60" textAnchor="middle" fontSize="7" fontWeight="700" fill={D.muted} fontFamily="Inter, sans-serif">
                      {marcasArr[0].marca}
                    </text>
                  </svg>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {marcasArr.map((m, i) => (
                      <div key={m.marca} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: i === marcasArr.length - 1 ? 0 : 8 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 3, background: DONA_COLORS[i % DONA_COLORS.length], flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: D.ink2, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.marca}</span>
                        <span style={{ fontSize: 12, color: D.ink, fontWeight: 800 }}>{Math.round((m.total / totalMarcas) * 100)}%</span>
                        <span style={{ fontSize: 11, color: D.muted, fontWeight: 600, width: 46, textAlign: "right" }}>{compact(m.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Canales de venta (solo cuando las ventas traen canal registrado) */}
            {canalArr.length > 0 && (() => {
              const totCanal = canalArr.reduce((a, c) => a + c.total, 0) || 1;
              return (
                <div style={{ borderTop: `1px solid ${D.line}`, paddingTop: 18, marginTop: 18 }}>
                  {sectionHead("Canales de venta")}
                  <div style={{ height: 22, borderRadius: 8, overflow: "hidden", marginBottom: 12, background: D.track }}>
                    <div style={{ display: "flex", height: "100%", transformOrigin: "left", animation: "vmGrowX .8s cubic-bezier(.2,.8,.2,1) both" }}>
                      {canalArr.map((c) => (
                        <div key={c.canal} style={{ width: (c.total / totCanal * 100) + "%", background: canalColor(c.canal) }} />
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px" }}>
                    {canalArr.map((c) => (
                      <div key={c.canal} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 3, background: canalColor(c.canal), flexShrink: 0 }} />
                        <span style={{ color: D.ink2, fontWeight: 600 }}>{c.canal}</span>
                        <span style={{ color: D.ink, fontWeight: 800 }}>{Math.round(c.total / totCanal * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ================= BLOQUE 2 · LA BODEGA HOY ================= */}
            {bloque("La bodega hoy", "Foto actual del inventario — no depende del periodo de arriba")}

            {/* Patrimonio en bodega */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontSize: 12.5, color: D.ink2, fontWeight: 700 }}>Patrimonio en bodega</div>
                <div style={{ fontSize: 12, color: D.muted, fontWeight: 600 }}>{numRefs} refs · {totalPares} pares</div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginTop: 6 }}>
                <span style={{ ...display(34, D.ink), textShadow: "0 0 30px rgba(255,90,31,.28)" }}>
                  <CountUp value={valorVenta} format={(x) => fmt(Math.round(x))} />
                </span>
                <span style={{ fontSize: 12, color: D.ink2, fontWeight: 600 }}>si se vende todo</span>
              </div>
              <div style={{ height: 24, borderRadius: 8, overflow: "hidden", marginTop: 14, background: D.track }}>
                <div style={{ display: "flex", height: "100%", transformOrigin: "left", animation: "vmGrowX .8s cubic-bezier(.2,.8,.2,1) both" }}>
                  <div style={{ width: costPct + "%", background: "rgba(255,255,255,.16)" }} />
                  <div style={{ width: profitPct + "%", background: `linear-gradient(90deg, ${D.green}, #4FE695)`, boxShadow: "0 0 14px rgba(43,213,118,.5)" }} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12.5 }}>
                <span style={{ color: D.ink2 }}><b style={{ color: D.ink }}>Costo</b> {fmt(valorCosto)}</span>
                <span style={{ color: D.green, fontWeight: 800, textShadow: "0 0 16px rgba(43,213,118,.35)" }}>+{fmt(gananciaPotencial)} ganancia</span>
              </div>
              {agotados > 0 && (
                <div style={{ marginTop: 13, fontSize: 12.5, fontWeight: 700, color: "#FF9A6B", background: "rgba(255,90,31,.12)", border: "1px solid rgba(255,90,31,.28)", borderRadius: 10, padding: "9px 12px" }}>
                  ⚠ {agotados} {agotados === 1 ? "referencia está" : "referencias están"} por agotarse
                </div>
              )}
            </div>

            {/* Rotación: cuánto dura la bodega al ritmo actual */}
            {totalPares > 0 && (
              <div style={{ borderTop: `1px solid ${D.line}`, paddingTop: 18, marginBottom: 22 }}>
                {sectionHead("Rotación", ritmoDia > 0 ? ritmoDia.toFixed(1).replace(".", ",") + " pares/día" : null)}
                <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
                  <span style={display(30, rotacionColor)}>{diasBodega == null ? "—" : "~" + diasBodega + " días"}</span>
                  {diasBodega != null && <span style={{ fontSize: 12, color: D.ink2, fontWeight: 600 }}>para vender toda la bodega</span>}
                </div>
                <div style={{ fontSize: 12, color: rotacionColor, fontWeight: 700, marginTop: 6 }}>{rotacionTexto}</div>
              </div>
            )}

            {/* Barras: plata parada — dónde está quieto el dinero */}
            {paradasTop.length > 0 && (
              <div style={{ borderTop: `1px solid ${D.line}`, paddingTop: 18 }}>
                {sectionHead("Plata parada", compact(plataParadaTotal) + " quietos")}
                <div style={{ fontSize: 12, color: D.muted, fontWeight: 600, marginBottom: 13, lineHeight: 1.45 }}>
                  Referencias con stock que no venden ni un par hace más de 30 días. Candidatas a promoción o rebaja.
                </div>
                {paradasTop.map((p, i) => (
                  <div key={p.id} style={{ marginBottom: i === paradasTop.length - 1 ? 0 : 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, gap: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: D.ink, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.referencia ? <span style={{ color: "#FFC53D", fontWeight: 800, marginRight: 6 }}>{p.referencia}</span> : null}{p.modelo}
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 800, color: D.ink, flexShrink: 0 }}>
                        {p.stock}<span style={{ fontSize: 10, color: D.muted, fontWeight: 700, margin: "0 3px" }}>pares ·</span><span style={{ color: D.ink2 }}>{compact(p.plata)}</span>
                      </div>
                    </div>
                    {hbar(p.plata, maxParada, i, "linear-gradient(90deg, #FFC53D, #FFD97A)")}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Tienda web — catálogo público de https://varmancrew.com
// ============================================================
// La página web LEE estas dos colecciones de Firestore (los clientes solo
// pueden verlas, nunca cambiarlas; escribir requiere iniciar sesión aquí):
//   tiendas/varman/catalogo      → categoría, precio, etiqueta, orden, visible
//   tiendas/varman/catalogoFotos → fotos comprimidas (dataURL JPEG)
// Todo lo que se guarda en esta pestaña queda publicado en la página.
//
// ENLACE OPCIONAL catálogo ↔ inventario (2026-07-06, ronda 2): cada referencia
// puede llevar "refInventario" (una VRM del inventario). Si está lleno, la
// pestaña Pedidos muestra el stock real de esa VRM en el detalle del pedido.
// VACÍO = comportamiento de siempre (verificar stock a mano). La página web
// ignora este campo. Decisión documentada en
// bot_n8n\briefs\DECISION-CATALOGO-INVENTARIO.md (opción no invasiva).

const CATS_TIENDA = [
  { id: "deportivas", label: "Deportivas" },
  { id: "casuales", label: "Casuales" },
  { id: "urbanas", label: "Urbanas" },
];
const catTiendaLabel = (id) => {
  const c = CATS_TIENDA.find((x) => x.id === id);
  return c ? c.label : id || "";
};
const precioTienda = (n) => "$" + (Number(n) || 0).toLocaleString("es-CO");

function TiendaWeb({ showToast, products }) {
  const [items, setItems] = useState(null);       // null = cargando
  const [fotosCat, setFotosCat] = useState({});   // { fid: dataURL }
  const [filtro, setFiltro] = useState("todos");
  const [sheet, setSheet] = useState(null);       // { draft, esNuevo }
  const [confirmDel, setConfirmDel] = useState(false);
  const [progreso, setProgreso] = useState(null); // texto de avance al guardar/importar
  const fileRef = useRef(null);
  const pedidas = useRef({});                     // fotos ya pedidas a la nube
  // 5-bis: mapa catálogo↔inventario (colección PRIVADA mapaCatalogo, doc por
  // ref) y nombres de bodegas externas reutilizables (colección proveedores)
  const [mapa, setMapa] = useState({});           // { ref: docMapa }
  const [proveedores, setProveedores] = useState([]); // nombres ordenados

  // Referencias únicas del inventario (VRM001-080) para el enlace opcional.
  // En "products" cada referencia se repite por talla; aquí se agrupa y se
  // etiqueta con el modelo y el color para reconocerla fácil en el selector.
  const refsInventario = (() => {
    const map = {};
    (products || []).forEach((p) => {
      const r = String(p.referencia || "").trim();
      if (r && !map[r]) map[r] = { ref: r, modelo: p.modelo || "", color: p.color || "" };
    });
    return Object.keys(map).map((k) => map[k])
      .sort((a, b) => a.ref.localeCompare(b.ref, "es", { numeric: true }));
  })();

  // --- Escuchar el catálogo publicado ---
  useEffect(() => {
    if (!fbReady()) { setItems([]); return; }
    const unsub = colRef("catalogo").onSnapshot(
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push(d.data()));
        arr.sort((a, b) => (a.orden || 0) - (b.orden || 0) || String(a.ref || "").localeCompare(String(b.ref || "")));
        setItems(arr);
      },
      (err) => { console.warn("catalogo:", err && err.message); setItems([]); }
    );
    return () => unsub();
  }, []);

  // --- 5-bis: escuchar el mapa catálogo↔inventario y los proveedores ---
  useEffect(() => {
    if (!fbReady()) return;
    const u1 = colRef("mapaCatalogo").onSnapshot(
      (snap) => {
        const m = {};
        snap.forEach((d) => { const x = d.data(); m[String(x.ref || d.id)] = x; });
        setMapa(m);
      },
      (err) => console.warn("mapaCatalogo:", err && err.message)
    );
    const u2 = colRef("proveedores").onSnapshot(
      (snap) => {
        const arr = [];
        snap.forEach((d) => { const n = (d.data().nombre || "").trim(); if (n) arr.push(n); });
        setProveedores(arr.sort((a, b) => a.localeCompare(b, "es")));
      },
      (err) => console.warn("proveedores:", err && err.message)
    );
    return () => { u1(); u2(); };
  }, []);

  // --- Traer una foto de la nube (Firestore la deja cacheada para offline) ---
  const pedirFoto = (fid) => {
    if (!fid || pedidas.current[fid] || !fbReady()) return;
    pedidas.current[fid] = true;
    colRef("catalogoFotos").doc(fid).get()
      .then((d) => setFotosCat((m) => ({ ...m, [fid]: d.exists ? d.data().data : "" })))
      .catch(() => { pedidas.current[fid] = false; });
  };
  useEffect(() => { (items || []).forEach((p) => pedirFoto((p.fotos || [])[0])); }, [items]);
  useEffect(() => { if (sheet) (sheet.draft.fotos || []).forEach((f) => { if (!f.data) pedirFoto(f.fid); }); }, [sheet]);

  // --- Importar las referencias que hoy están fijas en la página (una sola vez) ---
  const importarSeed = async () => {
    if (!fbReady()) return showToast("Sin conexión con la nube.", true);
    try {
      setProgreso("Descargando catálogo actual…");
      const r = await fetch("seed-catalogo.json");
      if (!r.ok) throw new Error("no encontré seed-catalogo.json");
      const seed = await r.json();
      const fids = Object.keys(seed.fotos || {});
      for (let i = 0; i < fids.length; i += 6) {
        const grupo = fids.slice(i, i + 6);
        await Promise.all(grupo.map((fid) => colRef("catalogoFotos").doc(fid).set({ data: seed.fotos[fid] })));
        setProgreso("Subiendo fotos… " + Math.min(i + grupo.length, fids.length) + "/" + fids.length);
      }
      setProgreso("Publicando referencias…");
      const prods = seed.products || [];
      for (let i = 0; i < prods.length; i += 10) {
        await Promise.all(prods.slice(i, i + 10).map((p) => colRef("catalogo").doc(p.id).set(p)));
      }
      setProgreso(null);
      showToast("Catálogo conectado: " + prods.length + " referencias ✓");
    } catch (e) {
      setProgreso(null);
      showToast("Error importando: " + (e && e.message), true);
    }
  };

  // --- Abrir para editar / crear ---
  // 5-bis: el borrador de la sección "Inventario" sale del mapa (mapaCatalogo);
  // si la ref aún no tiene mapa pero sí el enlace viejo de un solo código
  // (refInventario, ronda 2), ese código arranca ya elegido.
  const invDe = (p) => {
    const m = mapa[String(p.ref || "")];
    if (m) return { codigosInv: (m.codigosInv || []).slice(), proveedor: m.proveedor || "", nota: m.nota || "" };
    return { codigosInv: p.refInventario ? [p.refInventario] : [], proveedor: "", nota: "" };
  };
  const abrirEditar = (p) => {
    setConfirmDel(false);
    setSheet({
      esNuevo: false,
      draft: { ...p, precio: String(p.precio || ""), fotos: (p.fotos || []).map((fid) => ({ fid })), quitadas: [], inv: invDe(p) },
    });
  };
  const abrirNueva = () => {
    const nums = (items || []).map((p) => parseInt(p.ref, 10) || 0);
    const ref = String(Math.max(0, ...nums) + 1).padStart(2, "0");
    const minOrden = (items || []).reduce((mn, p) => Math.min(mn, p.orden || 0), 1);
    setConfirmDel(false);
    setSheet({
      esNuevo: true,
      draft: { id: "c" + ref, ref, cat: "deportivas", precio: "", tag: "Nuevo", orden: minOrden - 1, activo: true, refInventario: "", marca: "", genero: "", tallas: "", fotos: [], quitadas: [], inv: { codigosInv: [], proveedor: "", nota: "" } },
    });
  };

  // --- Añadir fotos (se comprimen antes de subir) ---
  const onFotoFile = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length || !sheet) return;
    try {
      const nuevas = [];
      for (const f of files) {
        const data = await comprimirImagen(f, 800, 0.72);
        nuevas.push({ fid: "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), data });
      }
      setSheet((s) => (s ? { ...s, draft: { ...s.draft, fotos: [...s.draft.fotos, ...nuevas] } } : s));
    } catch (err) {
      showToast("No pude leer esa imagen.", true);
    }
  };
  const quitarFotoDraft = (i) =>
    setSheet((s) => {
      const fotos = s.draft.fotos.slice();
      const out = fotos.splice(i, 1)[0];
      // si la foto ya estaba en la nube, se borra al guardar
      const quitadas = out.data ? s.draft.quitadas : [...s.draft.quitadas, out.fid];
      return { ...s, draft: { ...s.draft, fotos, quitadas } };
    });
  const hacerPrincipal = (i) =>
    setSheet((s) => {
      const fotos = s.draft.fotos.slice();
      const f = fotos.splice(i, 1)[0];
      fotos.unshift(f);
      return { ...s, draft: { ...s.draft, fotos } };
    });

  // --- Guardar cambios en la nube ---
  const guardar = async () => {
    if (!sheet || progreso) return;
    const d = sheet.draft;
    const precio = Number(String(d.precio).replace(/[^\d]/g, ""));
    if (!precio) return showToast("Escribe el precio.", true);
    if (!d.fotos.length) return showToast("Añade al menos una foto.", true);
    if (!fbReady()) return showToast("Sin conexión con la nube.", true);
    try {
      setProgreso("Guardando…");
      const nuevas = d.fotos.filter((f) => f.data);
      for (let i = 0; i < nuevas.length; i += 4) {
        await Promise.all(nuevas.slice(i, i + 4).map((f) => colRef("catalogoFotos").doc(f.fid).set({ data: f.data })));
      }
      // 5-bis: mapa catálogo↔inventario. tipo se deriva de lo que llenó:
      // códigos VRM = propia · proveedor = externa · ambos = mixta · nada = sin mapa
      const inv = d.inv || { codigosInv: [], proveedor: "", nota: "" };
      const codigos = (inv.codigosInv || []).map((c) => String(c).trim()).filter(Boolean);
      const proveedor = (inv.proveedor || "").trim();
      const tipoMapa = codigos.length && proveedor ? "mixta" : codigos.length ? "propia" : proveedor ? "externa" : "";
      await colRef("catalogo").doc(d.id).set({
        id: d.id, ref: d.ref, cat: d.cat, precio, tag: d.tag || "",
        orden: d.orden || 0, activo: d.activo !== false, fotos: d.fotos.map((f) => f.fid),
        // Compatibilidad ronda 2: refInventario = primer código propio (los
        // pedidos viejos y cualquier código que aún lo lea siguen andando)
        refInventario: codigos[0] || "",
        // Marca de la referencia (la usa el bot de WhatsApp para responder
        // "¿tienen adidas?" con fotos). Vacía = el bot no la ofrece por marca.
        marca: (d.marca || "").trim(),
        // Género (dama/caballero): lo usa la PÁGINA WEB como filtro para el
        // cliente. Vacío = unisex (se muestra en ambos filtros).
        genero: (d.genero || "").trim(),
        // Tallas disponibles que ofrece la web al comprar (ej. "35-45" o
        // "38,39,40"). Vacío = la web ofrece 35-45.
        tallas: (d.tallas || "").trim(),
      });
      if (tipoMapa) {
        await colRef("mapaCatalogo").doc(String(d.ref)).set({
          ref: String(d.ref), tipo: tipoMapa, codigosInv: codigos,
          proveedor: proveedor || null, nota: (inv.nota || "").trim(),
        });
      } else {
        await colRef("mapaCatalogo").doc(String(d.ref)).delete().catch(() => {});
      }
      // nombre de bodega externa nuevo → queda guardado para reutilizarlo
      if (proveedor && !proveedores.some((n) => n.toLowerCase() === proveedor.toLowerCase())) {
        const pid = proveedor.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "p" + Date.now();
        await colRef("proveedores").doc(pid).set({ nombre: proveedor, creado: new Date().toISOString() });
      }
      await Promise.all(d.quitadas.map((fid) => colRef("catalogoFotos").doc(fid).delete().catch(() => {})));
      nuevas.forEach((f) => { pedidas.current[f.fid] = true; });
      setFotosCat((m) => {
        const n = { ...m };
        nuevas.forEach((f) => { n[f.fid] = f.data; });
        return n;
      });
      setProgreso(null);
      setSheet(null);
      showToast(sheet.esNuevo ? "Referencia publicada en la página ✓" : "Cambios publicados en la página ✓");
    } catch (e) {
      setProgreso(null);
      showToast("No se pudo guardar: " + (e && e.message), true);
    }
  };

  // --- Eliminar referencia de la página ---
  const eliminar = async () => {
    if (!sheet || sheet.esNuevo || progreso) return;
    const d = sheet.draft;
    try {
      setProgreso("Eliminando…");
      await colRef("catalogo").doc(d.id).delete();
      await colRef("mapaCatalogo").doc(String(d.ref)).delete().catch(() => {});
      await Promise.all(d.fotos.filter((f) => !f.data).map((f) => colRef("catalogoFotos").doc(f.fid).delete().catch(() => {})));
      setProgreso(null);
      setSheet(null);
      showToast("Referencia eliminada de la página.");
    } catch (e) {
      setProgreso(null);
      showToast("No se pudo eliminar: " + (e && e.message), true);
    }
  };

  // --- Ocultar/mostrar sin borrar ---
  const toggleActivo = (p) => {
    if (!fbReady()) return;
    colRef("catalogo").doc(p.id).set({ ...p, activo: p.activo === false })
      .then(() => showToast(p.activo === false ? "Ya se ve en la página ✓" : "Oculta de la página (sigue guardada aquí)"))
      .catch(() => showToast("No se pudo cambiar.", true));
  };

  const lista = (items || []).filter((p) => filtro === "todos" || p.cat === filtro);
  const visibles = (items || []).filter((p) => p.activo !== false).length;

  return (
    <div style={{ padding: 16 }} className="vm-fade">
      {/* Encabezado */}
      <div style={cardStyle({ padding: "16px 18px", marginBottom: 12 })}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div>
            <div style={eyebrow()}>catálogo público</div>
            <div style={display(21)}>
              PÁGINA <span style={{ color: C.accent }}>WEB</span>
            </div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>
              {items === null
                ? "Conectando con la nube…"
                : visibles + (visibles === 1 ? " referencia visible" : " referencias visibles") + " en la tienda"}
            </div>
          </div>
          <a
            href="https://varmancrew.com"
            target="_blank"
            rel="noreferrer"
            style={btnGhost({ textDecoration: "none", whiteSpace: "nowrap", textAlign: "center" })}
          >
            Ver página ↗
          </a>
        </div>
      </div>

      {items === null ? (
        <div style={{ ...cardStyle({ height: 120 }), animation: "vmPulse 1.4s ease infinite" }} />
      ) : !fbReady() ? (
        <EmptyState
          icon={<IconStore big />}
          title="Sin conexión con la nube"
          text="Este dispositivo no pudo conectarse a Firebase. Revisa tu internet y vuelve a abrir la app."
        />
      ) : items.length === 0 ? (
        <div style={cardStyle({ padding: "32px 22px", textAlign: "center" })}>
          <div style={{ width: 60, height: 60, borderRadius: 18, background: C.accentSoft, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <IconStore big />
          </div>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>Conecta tu catálogo</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 16 }}>
            La página ya tiene sus referencias, pero todavía están "fijas".
            Impórtalas una sola vez y desde aquí podrás cambiar precios y fotos,
            agregar o quitar zapatos.
          </div>
          <button onClick={importarSeed} disabled={!!progreso} style={btnPrimary({ width: "100%", padding: 14, fontSize: 15, opacity: progreso ? 0.7 : 1 })}>
            {progreso || "Importar catálogo actual"}
          </button>
        </div>
      ) : (
        <>
          {/* Filtros por categoría */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {[{ id: "todos", label: "Todas" }].concat(CATS_TIENDA).map((c) => {
              const on = filtro === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setFiltro(c.id)}
                  style={btnGhost({
                    padding: "8px 14px", borderRadius: 99, fontSize: 12.5,
                    background: on ? C.ink : C.card, color: on ? "#fff" : C.ink,
                    border: `1.5px solid ${on ? C.ink : C.line}`,
                  })}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          <button onClick={abrirNueva} style={btnPrimary({ width: "100%", padding: 14, fontSize: 15, marginBottom: 12 })}>
            + Nueva referencia
          </button>

          {lista.length === 0 ? (
            <EmptyState icon={<IconStore big />} title="Nada en esta categoría" text="Agrega una referencia nueva o cambia el filtro." />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {lista.map((p) => {
                const src = fotosCat[(p.fotos || [])[0]];
                const oculta = p.activo === false;
                return (
                  <div
                    key={p.id}
                    onClick={() => abrirEditar(p)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") abrirEditar(p); }}
                    style={cardStyle({ padding: 0, overflow: "hidden", cursor: "pointer", opacity: oculta ? 0.6 : 1 })}
                  >
                    <div style={{ width: "100%", aspectRatio: "1 / 1", background: C.bg, position: "relative" }}>
                      {src ? (
                        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      ) : null}
                      {p.tag ? (
                        <div style={{ position: "absolute", top: 8, left: 8, background: C.ink, color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 99 }}>
                          {p.tag}
                        </div>
                      ) : null}
                      {oculta ? (
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(244,244,242,.55)", fontWeight: 800, fontSize: 12, color: C.ink2, letterSpacing: ".1em" }}>
                          OCULTA
                        </div>
                      ) : null}
                    </div>
                    <div style={{ padding: "10px 12px 12px" }}>
                      <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>
                        Ref {p.ref} · {catTiendaLabel(p.cat)}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 3 }}>
                        <div style={{ fontWeight: 800, fontSize: 15 }}>{precioTienda(p.precio)}</div>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleActivo(p); }}
                          title={oculta ? "Mostrar en la página" : "Ocultar de la página"}
                          aria-label={oculta ? "Mostrar en la página" : "Ocultar de la página"}
                          style={btnIcon(false)}
                        >
                          {oculta ? <IconEyeOff /> : <IconEye />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Aviso de avance (importación) */}
      {progreso && !sheet && (
        <div style={{ position: "fixed", bottom: 86, left: "50%", transform: "translateX(-50%)", background: C.ink, color: "#fff", padding: "11px 18px", borderRadius: 14, fontSize: 13.5, fontWeight: 600, zIndex: 99, maxWidth: "88%", textAlign: "center" }}>
          {progreso}
        </div>
      )}

      {/* Hoja de edición / creación */}
      {sheet && (
        <Sheet
          title={sheet.esNuevo ? "Nueva referencia" : "Referencia " + sheet.draft.ref}
          onClose={() => { if (!progreso) { setSheet(null); setConfirmDel(false); } }}
        >
          <Field label="Fotos (la primera es la principal)">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {sheet.draft.fotos.map((f, i) => {
                const src = f.data || fotosCat[f.fid];
                return (
                  <div
                    key={f.fid}
                    style={{ position: "relative", width: 86, height: 86, borderRadius: 12, overflow: "hidden", background: C.bg, border: i === 0 ? `2px solid ${C.accent}` : `1.5px solid ${C.line}` }}
                  >
                    {src ? (
                      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: C.muted }}>…</div>
                    )}
                    <button
                      onClick={() => quitarFotoDraft(i)}
                      aria-label="Quitar esta foto"
                      style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 8, border: "none", background: "rgba(16,16,18,.72)", color: "#fff", fontSize: 12, lineHeight: 1, cursor: "pointer", padding: 0 }}
                    >
                      ✕
                    </button>
                    {i === 0 ? (
                      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "rgba(255,90,31,.92)", color: "#fff", fontSize: 9, fontWeight: 800, textAlign: "center", padding: "3px 0", textTransform: "uppercase", letterSpacing: ".06em" }}>
                        Principal
                      </div>
                    ) : (
                      <button
                        onClick={() => hacerPrincipal(i)}
                        style={{ position: "absolute", left: 0, right: 0, bottom: 0, border: "none", background: "rgba(16,16,18,.62)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "3px 0", cursor: "pointer" }}
                      >
                        Hacer principal
                      </button>
                    )}
                  </div>
                );
              })}
              <button
                onClick={() => fileRef.current && fileRef.current.click()}
                aria-label="Añadir fotos"
                style={{ width: 86, height: 86, borderRadius: 12, border: `2px dashed ${C.line}`, background: C.card, color: C.muted, fontSize: 24, cursor: "pointer" }}
              >
                +
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={onFotoFile} style={{ display: "none" }} />
          </Field>

          <Field label="Precio de venta (COP)">
            <input
              type="number"
              min="0"
              value={sheet.draft.precio}
              onChange={(e) => setSheet((s) => ({ ...s, draft: { ...s.draft, precio: e.target.value } }))}
              placeholder="299900"
              style={inputStyle()}
            />
            {sheet.draft.precio ? (
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                En la página se verá: <b style={{ color: C.ink }}>{precioTienda(String(sheet.draft.precio).replace(/[^\d]/g, ""))} COP</b>
              </div>
            ) : null}
          </Field>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <Field label="Categoría">
                <select
                  value={sheet.draft.cat}
                  onChange={(e) => setSheet((s) => ({ ...s, draft: { ...s.draft, cat: e.target.value } }))}
                  style={inputStyle()}
                >
                  {CATS_TIENDA.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Etiqueta">
                <select
                  value={sheet.draft.tag || ""}
                  onChange={(e) => setSheet((s) => ({ ...s, draft: { ...s.draft, tag: e.target.value } }))}
                  style={inputStyle()}
                >
                  <option value="">Sin etiqueta</option>
                  <option value="Nuevo">Nuevo</option>
                  <option value="Popular">Popular</option>
                </select>
              </Field>
            </div>
          </div>

          <Field label="Marca (opcional — la usa el bot de WhatsApp)">
            <input
              value={sheet.draft.marca || ""}
              onChange={(e) => setSheet((s) => ({ ...s, draft: { ...s.draft, marca: e.target.value } }))}
              placeholder="Adidas, Nike, Jordan, New Balance…"
              list="vm-marcas"
              style={inputStyle()}
            />
            <datalist id="vm-marcas">
              {["Adidas", "Nike", "Jordan", "New Balance", "Puma", "Reebok", "Converse", "Vans", "Timberland", "Louis Vuitton"].map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
              Si la llenas, cuando un cliente pregunte "¿tienen adidas?" el bot le
              muestra estas referencias con foto. Vacía = no aparece por marca.
            </div>
          </Field>

          {/* Compra web (Wompi): género = filtro Dama/Caballero que ve el
              cliente en varmancrew.com; tallas = las que la web ofrece al
              comprar. Ninguno afecta al bot ni al inventario. */}
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <Field label="Género (filtro de la página web)">
                <select
                  value={sheet.draft.genero || ""}
                  onChange={(e) => setSheet((s) => ({ ...s, draft: { ...s.draft, genero: e.target.value } }))}
                  style={inputStyle()}
                >
                  <option value="">Unisex (sale en ambos)</option>
                  <option value="dama">Dama</option>
                  <option value="caballero">Caballero</option>
                </select>
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Tallas en la web">
                <input
                  value={sheet.draft.tallas || ""}
                  onChange={(e) => setSheet((s) => ({ ...s, draft: { ...s.draft, tallas: e.target.value } }))}
                  placeholder="35-45 (o 38,39,40)"
                  style={inputStyle()}
                />
              </Field>
            </div>
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: -6, marginBottom: 10, lineHeight: 1.5 }}>
            Los usa la página web: el cliente filtra por Dama/Caballero (cada
            tarjeta toma su color) y elige la talla al comprar. Tallas vacío =
            la web ofrece 35–45 (dama: 34–41, que es EU 35–42).
          </div>

          {/* 5-bis: de dónde sale esta referencia — bodega propia (códigos VRM,
              pueden ser varios) y/o bodega externa (proveedor reutilizable).
              Reemplaza al selector único de la ronda 2 (refInventario). */}
          <Field label="Inventario — ¿de dónde sale esta referencia?">
            <div style={{ background: C.card, border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "11px 13px" }}>
              <div style={{ ...eyebrow(C.muted), fontSize: 9.5, marginBottom: 6 }}>Bodega propia · códigos VRM (puede tener varios)</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {(sheet.draft.inv.codigosInv || []).map((c) => {
                  const r = refsInventario.find((x) => x.ref === c);
                  return (
                    <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.greenSoft, color: C.green, fontWeight: 800, fontSize: 11.5, padding: "5px 9px", borderRadius: 99 }}>
                      {c}{r && r.modelo ? " · " + r.modelo : " (ya no está en el inventario)"}
                      <button
                        onClick={() => setSheet((s) => ({ ...s, draft: { ...s.draft, inv: { ...s.draft.inv, codigosInv: (s.draft.inv.codigosInv || []).filter((x) => x !== c) } } }))}
                        aria-label={"Quitar " + c}
                        style={{ border: "none", background: "transparent", color: C.green, cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0 }}
                      >
                        ✕
                      </button>
                    </span>
                  );
                })}
                {!(sheet.draft.inv.codigosInv || []).length && (
                  <span style={{ fontSize: 12, color: C.muted }}>Sin códigos propios.</span>
                )}
              </div>
              <select
                value=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  setSheet((s) => (s.draft.inv.codigosInv || []).includes(v) ? s : ({ ...s, draft: { ...s.draft, inv: { ...s.draft.inv, codigosInv: [...(s.draft.inv.codigosInv || []), v] } } }));
                }}
                style={inputStyle()}
              >
                <option value="">+ Añadir código del inventario…</option>
                {refsInventario.filter((r) => !(sheet.draft.inv.codigosInv || []).includes(r.ref)).map((r) => (
                  <option key={r.ref} value={r.ref}>
                    {r.ref}{r.modelo ? " — " + r.modelo : ""}{r.color ? " (" + r.color + ")" : ""}
                  </option>
                ))}
              </select>

              <div style={{ ...eyebrow(C.muted), fontSize: 9.5, margin: "12px 0 6px" }}>Bodega externa · proveedor</div>
              <input
                value={sheet.draft.inv.proveedor || ""}
                onChange={(e) => setSheet((s) => ({ ...s, draft: { ...s.draft, inv: { ...s.draft.inv, proveedor: e.target.value } } }))}
                placeholder="Escribe un nombre nuevo o elige uno ya usado…"
                list="vm-proveedores"
                style={inputStyle()}
              />
              <datalist id="vm-proveedores">
                {proveedores.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              <input
                value={sheet.draft.inv.nota || ""}
                onChange={(e) => setSheet((s) => ({ ...s, draft: { ...s.draft, inv: { ...s.draft.inv, nota: e.target.value } } }))}
                placeholder="Nota (opcional): contacto del proveedor, condiciones…"
                style={inputStyle({ marginTop: 6 })}
              />
              {(() => {
                const nCod = (sheet.draft.inv.codigosInv || []).filter(Boolean).length;
                const prov = (sheet.draft.inv.proveedor || "").trim();
                const tipo = nCod && prov ? "MIXTA (propia + externa)" : nCod ? "PROPIA" : prov ? "EXTERNA 🏭" : null;
                return (
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
                    {tipo ? (
                      <>Quedará como <b style={{ color: C.ink }}>{tipo}</b>. La pestaña Pedidos mostrará
                      {nCod ? " el stock real de sus códigos" : ""}{nCod && prov ? " y" : ""}
                      {prov ? <> el aviso "verificar con <b>{prov}</b>"</> : ""}; el bot le dirá a
                      Cristhian de dónde pedirla en cada pedido nuevo.</>
                    ) : (
                      <>Vacío = sin asociar: el stock se verifica a mano, como siempre. Puedes llenarlo poco a poco.</>
                    )}
                  </div>
                );
              })()}
            </div>
          </Field>

          <Field label="Visibilidad">
            <button
              onClick={() => setSheet((s) => ({ ...s, draft: { ...s.draft, activo: s.draft.activo === false } }))}
              style={btnGhost({
                width: "100%", padding: 12, textAlign: "left",
                background: sheet.draft.activo !== false ? C.greenSoft : C.card,
                border: `1.5px solid ${sheet.draft.activo !== false ? C.green : C.line}`,
                color: sheet.draft.activo !== false ? C.green : C.muted,
              })}
            >
              {sheet.draft.activo !== false ? "✓ Visible en la página" : "Oculta — no se muestra a los clientes"}
            </button>
          </Field>

          <button onClick={guardar} disabled={!!progreso} style={btnPrimary({ width: "100%", padding: 14, fontSize: 15, marginTop: 6, opacity: progreso ? 0.7 : 1 })}>
            {progreso || (sheet.esNuevo ? "Publicar en la página" : "Guardar y publicar")}
          </button>

          {!sheet.esNuevo &&
            (confirmDel ? (
              <button
                onClick={eliminar}
                style={{ width: "100%", padding: 14, fontSize: 15, borderRadius: 13, border: "none", background: C.red, color: "#fff", fontWeight: 800, fontFamily: "Inter, sans-serif", cursor: "pointer", marginTop: 10 }}
              >
                Sí, eliminar de la página
              </button>
            ) : (
              <button
                onClick={() => setConfirmDel(true)}
                style={btnGhost({ width: "100%", padding: 14, fontSize: 15, color: C.red, border: `1.5px solid ${C.redSoft}`, marginTop: 10 })}
              >
                🗑️  Eliminar referencia
              </button>
            ))}
        </Sheet>
      )}
    </div>
  );
}

// ============================================================
// CAJA — cierre de caja de los socios (solo correos en SOCIOS_CAJA)
// Junta las ventas de la app (entradas, agrupadas por día como
// "INGRESO POR VENTAS") con los gastos registrados aquí (salidas)
// → estado de cuenta con saldo corrido + ganancia bruta y neta.
// ============================================================
const emptyGasto = () => ({ fecha: hoyLocal(), desc: "", monto: "", categoria: "otro", tipo: "gasto" });

// Atajos para los gastos de siempre (un toque llena el formulario)
const ATAJOS_GASTO = [
  { label: "🏠 Arriendo", desc: "PAGO ARRIENDO BODEGA", monto: 600000, categoria: "arriendo" },
  { label: "👷 Nómina Martín", desc: "PAGO NOMINA MARTIN", monto: 500000, categoria: "nomina" },
  { label: "🏦 Cuota banco", desc: "PAGO CUOTA BANCO", monto: 3000000, categoria: "banco" },
  { label: "📣 Pauta Meta", desc: "PAGO CAMPAÑA META", monto: "", categoria: "pauta" },
];

function Caja({ sales, gastos, persistGastos, addGasto, showToast }) {
  const num = (x) => Number(x) || 0;
  const qty = (s) => num(s.cantidad) || 1;
  // fmt con signo bonito para saldos negativos: −$1.000 en vez de $-1.000
  const fmtS = (n) => (n < 0 ? "−" + fmt(-n) : fmt(n));

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(emptyGasto());
  const [editingId, setEditingId] = useState(null);
  const [actionGasto, setActionGasto] = useState(null); // gasto tocado (menú editar/eliminar)
  const [confirmDel, setConfirmDel] = useState(false);
  const [periodo, setPeriodo] = useState("mes");
  const [mostrar, setMostrar] = useState(30);

  // ---- Movimientos: ventas por día (entradas) + gastos (salidas) ----
  const ventasDia = {};
  sales.forEach((s) => {
    if (s.fecha) ventasDia[s.fecha] = (ventasDia[s.fecha] || 0) + num(s.precio) * qty(s);
  });
  const movs = [];
  Object.keys(ventasDia).forEach((f) =>
    movs.push({ tipo: "venta", fecha: f, desc: "INGRESO POR VENTAS", entrada: ventasDia[f], salida: 0 })
  );
  gastos.forEach((g) => {
    const esIngreso = g.tipo === "ingreso"; // registros viejos sin tipo = gasto
    movs.push({
      tipo: "gasto", // "gasto" aquí = registro manual (se puede editar/eliminar)
      fecha: g.fecha || "",
      desc: g.desc || (esIngreso ? "INGRESO" : "GASTO"),
      entrada: esIngreso ? num(g.monto) : 0,
      salida: esIngreso ? 0 : num(g.monto),
      gasto: g,
    });
  });
  movs.sort((a, b) =>
    a.fecha !== b.fecha ? (a.fecha < b.fecha ? -1 : 1) : a.tipo === b.tipo ? 0 : a.tipo === "venta" ? -1 : 1
  );

  // ---- Saldo inicial: se calcula AL REVÉS desde el ancla (el saldo real que
  // los socios verificaron en su Excel el 22/06/2026). Así el saldo de ese día
  // siempre da $2.548.119 aunque se editen ventas viejas, y el saldo de hoy
  // solo se mueve con los movimientos nuevos. ----
  let entHasta = 0, salHasta = 0;
  movs.forEach((m) => {
    if (m.fecha && m.fecha <= ANCLA_CAJA.fecha) { entHasta += m.entrada; salHasta += m.salida; }
  });
  const saldoInicial = ANCLA_CAJA.saldo - entHasta + salHasta;

  let corriente = saldoInicial;
  const filas = movs.map((m) => { corriente += m.entrada - m.salida; return { ...m, total: corriente }; });
  const saldoCaja = corriente;
  const filasDesc = [...filas].reverse(); // lo más reciente arriba

  // ---- Indicadores del periodo elegido ----
  const pad2 = (n) => String(n).padStart(2, "0");
  const ymd = (d) => d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  const hoyISO = hoyLocal();
  const now = new Date();
  const [rDesde, rHasta] =
    periodo === "mes"
      ? [ymd(new Date(now.getFullYear(), now.getMonth(), 1)), hoyISO]
      : periodo === "mesPasado"
        ? [ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)), ymd(new Date(now.getFullYear(), now.getMonth(), 0))]
        : ["0000-00-00", "9999-99-99"];
  const enR = (f) => f && f >= rDesde && f <= rHasta;

  const salesR = sales.filter((s) => enR(s.fecha));
  const ventasP = salesR.reduce((a, s) => a + num(s.precio) * qty(s), 0);
  const brutaP = salesR.reduce((a, s) => a + (num(s.precio) - num(s.costo)) * qty(s), 0);
  const gastosR = gastos.filter((g) => enR(g.fecha));
  const soloGastosR = gastosR.filter((g) => g.tipo !== "ingreso");
  const gastosOpP = soloGastosR.filter((g) => g.categoria !== "compra").reduce((a, g) => a + num(g.monto), 0);
  const comprasP = soloGastosR.filter((g) => g.categoria === "compra").reduce((a, g) => a + num(g.monto), 0);
  // Ingresos adicionales (aportes, préstamos…): suman a la caja pero NO son
  // ganancia del negocio, por eso van aparte de las ventas y de la neta.
  const otrosIngP = gastosR.filter((g) => g.tipo === "ingreso").reduce((a, g) => a + num(g.monto), 0);
  const netaP = brutaP - gastosOpP;

  // El estado de cuenta se filtra con el MISMO periodo de los indicadores.
  // El saldo de cada fila sigue siendo el acumulado real de toda la historia.
  const filasR = filasDesc.filter((m) => enR(m.fecha));

  // ---- Acciones ----
  const abrirNuevo = (tipo) => { setDraft({ ...emptyGasto(), tipo: tipo || "gasto" }); setEditingId(null); setShowForm(true); };
  const abrirEditar = (g) => {
    setDraft({
      fecha: g.fecha || hoyLocal(),
      desc: g.desc || "",
      monto: g.monto != null ? g.monto : "",
      categoria: g.categoria || "otro",
      tipo: g.tipo === "ingreso" ? "ingreso" : "gasto",
    });
    setEditingId(g.id);
    setActionGasto(null);
    setShowForm(true);
  };
  const guardarGasto = () => {
    const monto = Math.round(Number(draft.monto) || 0);
    if (!draft.desc.trim() || monto <= 0) {
      showToast("Escribe la descripción y un monto mayor a 0.", true);
      return;
    }
    const esIngreso = draft.tipo === "ingreso";
    const esViejo = (draft.fecha || "") <= ANCLA_CAJA.fecha;
    if (editingId) {
      persistGastos(gastos.map((g) => (g.id === editingId
        ? { ...g, tipo: draft.tipo, fecha: draft.fecha || g.fecha, desc: draft.desc.trim().toUpperCase(), monto, categoria: draft.categoria }
        : g)));
    } else {
      addGasto({ tipo: draft.tipo, fecha: draft.fecha, desc: draft.desc, monto, categoria: draft.categoria });
    }
    showToast(
      esViejo
        ? "Guardado. Ojo: hasta el 22/06/2026 la caja ya está cuadrada, este movimiento viejo no cambia el saldo de hoy."
        : editingId
          ? (esIngreso ? "Ingreso actualizado ✓" : "Gasto actualizado ✓")
          : (esIngreso ? "Ingreso registrado: +" : "Gasto registrado: ") + fmt(monto) + " ✓",
      esViejo
    );
    setShowForm(false);
    setDraft(emptyGasto());
    setEditingId(null);
  };
  const eliminarGasto = (g) => {
    persistGastos(gastos.filter((x) => x.id !== g.id));
    setActionGasto(null);
    setConfirmDel(false);
    showToast(g.tipo === "ingreso" ? "Ingreso eliminado ✓" : "Gasto eliminado ✓");
  };
  const exportCaja = () => {
    const rows = [
      ["Fecha", "Descripción", "Entrada", "Salida", "Total"],
      ["", "SALDO INICIAL", "", "", saldoInicial],
      ...filas.map((m) => [m.fecha, m.desc, m.entrada || "", m.salida || "", m.total]),
    ];
    downloadCSV(rows, "varman-caja-" + hoyLocal() + ".csv");
    showToast("Estado de cuenta exportado ✓");
  };

  return (
    <div style={{ padding: "16px 16px 0" }} className="vm-fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "0 4px", gap: 8 }}>
        <div>
          <div style={display(19)}>Caja</div>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginTop: 2 }}>Solo socios · ventas y gastos conectados</div>
        </div>
        <BotonExportar onClick={exportCaja} />
      </div>

      {/* ---- Saldo en caja (el número que importa para comprar) ---- */}
      <div style={{
        background: "linear-gradient(135deg, #131316 0%, #1E1E23 100%)",
        borderRadius: 22, padding: "18px 18px 16px", color: "#fff",
        boxShadow: "0 14px 34px rgba(16,16,18,.28)", marginBottom: 14,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: -8, top: -26, ...display(110, "rgba(255,255,255,.045)"), pointerEvents: "none" }}>$</div>
        <div style={eyebrow("rgba(255,255,255,.55)")}>saldo en caja</div>
        <div style={{ ...display(34, "#fff"), marginTop: 4 }}>
          <CountUp value={saldoCaja} format={fmtS} />
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)", marginTop: 6, fontWeight: 600 }}>
          Disponible para compras y gastos
        </div>
      </div>

      {/* ---- Periodo de los indicadores ---- */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {[["mes", "Este mes"], ["mesPasado", "Mes pasado"], ["todo", "Todo"]].map(([id, label]) => (
          <button key={id} onClick={() => { setPeriodo(id); setMostrar(30); }} style={{
            flex: 1, padding: "9px 0", borderRadius: 11, cursor: "pointer",
            fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 12.5,
            border: `1.5px solid ${periodo === id ? C.ink : C.line}`,
            background: periodo === id ? C.ink : C.card,
            color: periodo === id ? "#fff" : C.ink2,
          }}>{label}</button>
        ))}
      </div>

      {/* ---- KPIs ---- */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div style={cardStyle({ padding: "13px 14px" })}>
          <div style={eyebrow()}>Ventas</div>
          <div style={{ ...display(20), marginTop: 4 }}>{fmt(ventasP)}</div>
          {otrosIngP > 0 && (
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginTop: 2 }}>+ {fmt(otrosIngP)} en otros ingresos</div>
          )}
        </div>
        <div style={cardStyle({ padding: "13px 14px" })}>
          <div style={eyebrow()}>Ganancia bruta</div>
          <div style={{ ...display(20, C.green), marginTop: 4 }}>{fmt(brutaP)}</div>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginTop: 2 }}>ventas − costo de los pares</div>
        </div>
        <div style={cardStyle({ padding: "13px 14px" })}>
          <div style={eyebrow()}>Gastos</div>
          <div style={{ ...display(20, C.red), marginTop: 4 }}>{fmt(gastosOpP)}</div>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginTop: 2 }}>+ {fmt(comprasP)} en compras de inventario</div>
        </div>
        <div style={cardStyle({ padding: "13px 14px" })}>
          <div style={eyebrow()}>Ganancia neta</div>
          <div style={{ ...display(20, netaP >= 0 ? C.green : C.red), marginTop: 4 }}>{netaP < 0 ? "−" + fmt(-netaP) : fmt(netaP)}</div>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginTop: 2 }}>bruta − gastos</div>
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, padding: "0 4px", marginBottom: 12 }}>
        Las compras de inventario salen de la caja pero no restan ganancia: el costo del par se
        descuenta cuando se vende (así no se cobra dos veces). Los ingresos adicionales
        (aportes, préstamos…) suman a la caja pero no cuentan como ganancia.
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button onClick={() => abrirNuevo("gasto")} style={btnPrimary({ flex: 1, padding: "15px 8px", fontSize: 14.5 })}>
          + Agregar gasto
        </button>
        <button
          onClick={() => abrirNuevo("ingreso")}
          style={btnPrimary({ flex: 1, padding: "15px 8px", fontSize: 14.5, background: C.green, boxShadow: "0 6px 16px rgba(14,138,77,.32)" })}
        >
          + Agregar ingreso
        </button>
      </div>

      {/* ---- Estado de cuenta (como el Excel, lo más reciente arriba) ---- */}
      <div style={{ ...eyebrow(C.ink2), padding: "0 4px", marginBottom: 8 }}>Estado de cuenta</div>
      {filasR.length === 0 && (
        <EmptyState
          icon={<IconCash big />}
          title="Sin movimientos"
          text={periodo === "todo"
            ? "Registra un gasto o una venta y aparecerá aquí."
            : 'No hay movimientos en este periodo. Toca "Todo" para ver el historial completo.'}
        />
      )}
      {filasR.slice(0, mostrar).map((m) => (
        <div
          key={m.tipo === "gasto" ? m.gasto.id : "v" + m.fecha}
          onClick={m.tipo === "gasto" ? () => { setConfirmDel(false); setActionGasto(m.gasto); } : undefined}
          style={cardStyle({ padding: "12px 14px", marginBottom: 8, cursor: m.tipo === "gasto" ? "pointer" : "default", display: "flex", alignItems: "center", gap: 10 })}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {m.desc}
              {m.tipo === "gasto" && m.gasto.auto && (
                <span style={{ marginLeft: 6, background: C.accentSoft, color: C.accent, fontWeight: 800, fontSize: 9.5, padding: "2px 7px", borderRadius: 99, letterSpacing: "0.05em" }}>AUTO</span>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2, fontWeight: 600 }}>{formatDate(m.fecha)}</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14.5, color: m.entrada ? C.green : C.red }}>
              {m.entrada ? "+" + fmt(m.entrada) : "−" + fmt(m.salida)}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2, fontWeight: 600 }}>saldo {fmtS(m.total)}</div>
          </div>
        </div>
      ))}
      {filasR.length > mostrar ? (
        <button onClick={() => setMostrar(mostrar + 60)} style={btnGhost({ width: "100%", padding: "12px", marginBottom: 8 })}>
          Ver movimientos anteriores ({filasR.length - mostrar} más)
        </button>
      ) : periodo === "todo" ? (
        <div style={{
          background: C.bg, border: `1.5px dashed ${C.line}`, borderRadius: 18,
          padding: "12px 14px", marginBottom: 8,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13.5, color: C.ink2 }}>SALDO INICIAL</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2, fontWeight: 600 }}>antes del primer movimiento registrado</div>
          </div>
          <div style={{ fontWeight: 800, fontSize: 14.5 }}>{fmtS(saldoInicial)}</div>
        </div>
      ) : null}
      <div style={{ height: 8 }} />

      {/* ---- Formulario de gasto (crear / editar) ---- */}
      {showForm && (
        <Sheet
          title={editingId
            ? (draft.tipo === "ingreso" ? "Editar ingreso" : "Editar gasto")
            : (draft.tipo === "ingreso" ? "Nuevo ingreso" : "Nuevo gasto")}
          onClose={() => { setShowForm(false); setEditingId(null); }}
        >
          {/* Tipo: sale plata (gasto) o entra plata (ingreso) */}
          <Field label="Tipo de movimiento">
            <div style={{ display: "flex", gap: 6 }}>
              {[["gasto", "💸 Gasto (sale)"], ["ingreso", "💰 Ingreso (entra)"]].map(([id, label]) => {
                const on = draft.tipo === id;
                const color = id === "ingreso" ? C.green : C.red;
                return (
                  <button key={id} onClick={() => setDraft({ ...draft, tipo: id, categoria: "otro" })} style={{
                    flex: 1, padding: "10px 0", borderRadius: 11, cursor: "pointer",
                    fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 12.5,
                    border: `1.5px solid ${on ? color : C.line}`,
                    background: on ? (id === "ingreso" ? C.greenSoft : C.redSoft) : C.card,
                    color: on ? color : C.ink2,
                  }}>{label}</button>
                );
              })}
            </div>
          </Field>
          {!editingId && draft.tipo === "gasto" && (
            <Field label="Gastos frecuentes">
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {ATAJOS_GASTO.map((a) => (
                  <button
                    key={a.label}
                    onClick={() => setDraft({ ...draft, desc: a.desc, monto: a.monto, categoria: a.categoria })}
                    style={btnGhost({ padding: "8px 11px", borderRadius: 99, fontSize: 12 })}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </Field>
          )}
          <Field label="Descripción *">
            <input
              value={draft.desc}
              onChange={(e) => setDraft({ ...draft, desc: e.target.value })}
              placeholder={draft.tipo === "ingreso" ? "Ej: APORTE SOCIOS" : "Ej: PAGO ARRIENDO BODEGA"}
              style={inputStyle()}
            />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Monto *">
              <input type="number" min="0" inputMode="numeric" value={draft.monto} onChange={(e) => setDraft({ ...draft, monto: e.target.value })} placeholder="600000" style={inputStyle()} />
            </Field>
            <Field label="Fecha">
              <input type="date" value={draft.fecha} onChange={(e) => setDraft({ ...draft, fecha: e.target.value })} style={inputStyle()} />
            </Field>
          </div>
          <Field label="Categoría">
            <select value={draft.categoria} onChange={(e) => setDraft({ ...draft, categoria: e.target.value })} style={inputStyle()}>
              {(draft.tipo === "ingreso" ? CATS_INGRESO : CATS_GASTO).map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </Field>
          {draft.tipo === "gasto" && draft.categoria === "compra" && (
            <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, marginBottom: 4 }}>
              💡 Si agregas la referencia desde Inventario, la compra se descuenta de la caja automáticamente (no la anotes dos veces).
            </div>
          )}
          <button
            onClick={guardarGasto}
            style={btnPrimary({
              width: "100%", marginTop: 12, padding: "15px", fontSize: 15,
              ...(draft.tipo === "ingreso" ? { background: C.green, boxShadow: "0 6px 16px rgba(14,138,77,.32)" } : {}),
            })}
          >
            {editingId ? "Guardar cambios" : draft.tipo === "ingreso" ? "Registrar ingreso" : "Registrar gasto"}
          </button>
        </Sheet>
      )}

      {/* ---- Menú del movimiento tocado: editar / eliminar ---- */}
      {actionGasto && (() => {
        const esIng = actionGasto.tipo === "ingreso";
        const palabra = esIng ? "ingreso" : "gasto";
        const cats = esIng ? CATS_INGRESO : CATS_GASTO;
        return (
          <Sheet title={esIng ? "Ingreso" : "Gasto"} onClose={() => { setActionGasto(null); setConfirmDel(false); }}>
            <div style={{ background: C.card, border: `1.5px solid ${C.line}`, borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{actionGasto.desc}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 5, lineHeight: 1.6 }}>
                {formatDate(actionGasto.fecha)} · {(cats.find((c) => c.id === actionGasto.categoria) || {}).label || "Otro"}<br />
                <b style={{ color: esIng ? C.green : C.red }}>{esIng ? "+" : "−"}{fmt(actionGasto.monto)}</b>
              </div>
            </div>
            <button onClick={() => abrirEditar(actionGasto)} style={btnPrimary({ width: "100%", padding: "14px", fontSize: 15, marginBottom: 10 })}>
              ✏️  Editar {palabra}
            </button>
            {confirmDel ? (
              <button
                onClick={() => eliminarGasto(actionGasto)}
                style={{ width: "100%", padding: "14px", fontSize: 15, borderRadius: 13, border: "none", background: C.red, color: "#fff", fontWeight: 800, fontFamily: "Inter, sans-serif", cursor: "pointer" }}
              >
                Sí, eliminar {palabra}
              </button>
            ) : (
              <button onClick={() => setConfirmDel(true)} style={btnGhost({ width: "100%", padding: "14px", fontSize: 15, color: C.red, border: `1.5px solid ${C.redSoft}` })}>
                🗑️  Eliminar {palabra}
              </button>
            )}
          </Sheet>
        );
      })()}
    </div>
  );
}

// ============================================================
// PEDIDOS — pedidos que crea el bot de WhatsApp (Fase 1).
// Visible para socios Y vendedor (a diferencia de la Caja).
// Flujo: nuevo / pagado_por_verificar → verificado → enviado →
// entregado (+ cancelado). La app solo cambia estado y notas.
// ============================================================
const FILTROS_PEDIDO = [
  ["pendientes", "Por verificar"],
  ["verificado", "Verificados"],
  ["enviado", "Enviados"],
  ["entregado", "Entregados"],
  ["cancelado", "Cancelados"],
  ["todos", "Todos"],
];

function BadgeEstadoPedido({ estado }) {
  const E = ESTADOS_PEDIDO[normEstadoPedido(estado)];
  return (
    <span style={{
      background: E.soft, color: E.color, fontWeight: 800, fontSize: 10.5,
      padding: "3px 9px", borderRadius: 99, letterSpacing: "0.04em",
      textTransform: "uppercase", whiteSpace: "nowrap",
    }}>
      {E.label}
    </span>
  );
}

function Pedidos({ pedidos, products, actualizarPedido, showToast, esSocio = false, userEmail = "", ocultosPedidos }) {
  const [filtro, setFiltro] = useState("pendientes");
  const [selId, setSelId] = useState(null); // id del pedido abierto en detalle
  const [nota, setNota] = useState("");
  const [guiaDraft, setGuiaDraft] = useState({ guia: "", transportadora: "" }); // backlog 12
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmOcultar, setConfirmOcultar] = useState(false);
  const [mostrar, setMostrar] = useState(30);
  // Comprobante del pedido abierto: { id, estado: "cargando"|"ok"|"no", src }
  const [comp, setComp] = useState(null);

  // Enlace catálogo ↔ inventario: desde 5-bis vive en la colección privada
  // mapaCatalogo (varios códigos VRM y/o bodega externa por referencia); el
  // refInventario de la ronda 2 queda como respaldo. Se escucha solo mientras
  // esta pestaña está abierta (los docs son livianos: las fotos van aparte).
  const [catalogo, setCatalogo] = useState([]);
  const [mapa, setMapa] = useState({});
  const [espera, setEspera] = useState([]);       // lista de espera de stock (backlog 13)
  const [verEspera, setVerEspera] = useState(false);
  // Pedidos ocultados por un socio (de prueba, duplicados, etc.): se guardan en
  // una colección aparte para NO tocar el documento del pedido, que es del bot
  // (contrato en bot_n8n\briefs\CAMBIOS-PEDIDOS.md). Ocultar es reversible. El
  // mapa lo escucha el componente App (para que el contador de la navegación
  // también los excluya); aquí solo se usa y se escribe.
  const ocultos = ocultosPedidos || {};
  useEffect(() => {
    if (!fbReady()) return;
    const unsub = colRef("catalogo").onSnapshot(
      (snap) => setCatalogo(snap.docs.map((d) => d.data())),
      (err) => console.warn("Firestore catalogo (pedidos):", err && err.message)
    );
    const u2 = colRef("mapaCatalogo").onSnapshot(
      (snap) => {
        const m = {};
        snap.forEach((d) => { const x = d.data(); m[String(x.ref || d.id)] = x; });
        setMapa(m);
      },
      (err) => console.warn("mapaCatalogo (pedidos):", err && err.message)
    );
    const u3 = colRef("listaEspera").onSnapshot(
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ _id: d.id, ...d.data() }));
        arr.sort((a, b) => (b.creado || "").localeCompare(a.creado || ""));
        setEspera(arr);
      },
      (err) => console.warn("listaEspera:", err && err.message)
    );
    return () => { unsub(); u2(); u3(); };
  }, []);

  const ocultarPedido = (p) => {
    if (!fbReady()) { showToast("Sin conexión con la nube: no se pudo guardar.", true); return; }
    colRef("pedidosOcultos").doc(String(p._id)).set({
      motivo: "prueba",
      ocultado_por: userEmail || "",
      ocultado_en: new Date().toISOString(),
    }).catch((e) => {
      console.warn("Error ocultando pedido:", e && e.message);
      showToast("No se pudo ocultar el pedido.", true);
    });
    setConfirmOcultar(false);
    setSelId(null);
    showToast("Pedido ocultado ✓");
  };

  const mostrarPedido = (p) => {
    if (!fbReady()) { showToast("Sin conexión con la nube: no se pudo guardar.", true); return; }
    colRef("pedidosOcultos").doc(String(p._id)).delete().catch((e) => {
      console.warn("Error mostrando pedido:", e && e.message);
      showToast("No se pudo restaurar el pedido.", true);
    });
    showToast("Pedido visible de nuevo ✓");
  };

  // Asociación de inventario de un pedido (5-bis): códigos propios y/o
  // proveedor externo. null = sin asociar (verificar a mano, como siempre).
  const mapaDe = (p) => {
    const m = mapa[String(p.ref || "")];
    if (m && ((m.codigosInv || []).length || m.proveedor)) return m;
    const item = catalogo.find((c) => String(c.ref) === String(p.ref || ""));
    if (item && item.refInventario) return { tipo: "propia", codigosInv: [item.refInventario], proveedor: null };
    return null;
  };

  // Stock real de un pedido sumando TODOS los códigos VRM asociados.
  // Devuelve null si no hay códigos propios.
  const stockPedido = (p) => {
    const m = mapaDe(p);
    const codigos = (m && m.codigosInv) || [];
    if (!codigos.length) return null;
    const delRef = (products || []).filter((x) => codigos.some((c) => normTxt(x.referencia) === normTxt(c)));
    const conTalla = delRef.filter((x) => String(x.talla) === String(p.talla));
    // Datos migrados del Excel: algunos VRM entraron como UN doc con el stock
    // total y la talla vacía (anotado en DECISION-CATALOGO-INVENTARIO.md).
    // Si no existe la talla pedida pero sí hay stock sin talla, se muestra el
    // total con la aclaración, en vez de un "0 pares" engañoso.
    const etiqueta = codigos.join(" + ");
    if (!conTalla.length) {
      const total = delRef
        .filter((x) => !String(x.talla == null ? "" : x.talla).trim())
        .reduce((a, x) => a + (Number(x.stock) || 0), 0);
      if (total > 0) return { refInv: etiqueta, pares: total, sinTallas: true };
    }
    const pares = conTalla.reduce((a, x) => a + (Number(x.stock) || 0), 0);
    return { refInv: etiqueta, pares };
  };

  // Exportar TODOS los pedidos a Excel (mismo botón verde de Inventario/Ventas)
  const exportPedidos = () => {
    if (pedidos.length === 0) {
      showToast("No hay pedidos para exportar.", true);
      return;
    }
    const rows = [
      ["Fecha", "Cliente", "Teléfono", "Referencia", "Talla", "Total", "Método de pago", "Estado", "Fuente", "Nota interna"],
      ...[...pedidos]
        .sort((a, b) => (b.creado || "").localeCompare(a.creado || ""))
        .map((p) => [
          fechaExportPedido(p.creado),
          p.cliente_nombre || "",
          telExportPedido(p.cliente_wa),
          p.ref || "",
          p.talla || "",
          Number(p.total) || 0,
          p.metodo_pago || "",
          ESTADOS_PEDIDO[normEstadoPedido(p.estado)].label,
          p.fuente || "",
          p.notas || "",
        ]),
    ];
    downloadCSV(rows, "varman-pedidos-" + hoyLocal() + ".csv");
    showToast("Pedidos exportados ✓");
  };

  // Más reciente arriba ("creado" es ISO: ordena bien como texto)
  const orden = [...pedidos].sort((a, b) => (b.creado || "").localeCompare(a.creado || ""));
  const esPendiente = (p) => {
    const e = normEstadoPedido(p.estado);
    // pago_confirmado: Wompi ya cobró, falta alistarlo (misma urgencia que nuevo).
    // pago_pendiente NO es pendiente: el cliente todavía no paga.
    return e === "nuevo" || e === "pagado_por_verificar" || e === "pago_confirmado";
  };
  const lista = orden.filter((p) => {
    if (filtro === "ocultos") return !!ocultos[String(p._id)];
    if (ocultos[String(p._id)]) return false; // ocultos no aparecen en ningún otro filtro
    return filtro === "todos" ? true : filtro === "pendientes" ? esPendiente(p) : normEstadoPedido(p.estado) === filtro;
  });
  const pendientes = orden.filter((p) => esPendiente(p) && !ocultos[String(p._id)]).length;
  const filtros = esSocio && Object.keys(ocultos).length
    ? [...FILTROS_PEDIDO, ["ocultos", "Ocultos (" + Object.keys(ocultos).length + ")"]]
    : FILTROS_PEDIDO;

  // El detalle se deriva de la lista (no de una copia) para que los cambios
  // en tiempo real de Firestore se vean con la hoja abierta.
  const abierto = selId ? pedidos.find((p) => p._id === selId) : null;

  const abrir = (p) => {
    setSelId(p._id);
    setNota(p.notas || "");
    setGuiaDraft({ guia: p.guia || "", transportadora: p.transportadora || "" });
    setConfirmCancel(false);
    // La foto del comprobante vive en su propia colección para no inflar la
    // lista de pedidos (respuesta del Agente 1 en CAMBIOS-PEDIDOS.md):
    // tiendas/varman/comprobantes/{idPedido}. Se descarga SOLO al abrir el
    // detalle. Si comprobante_guardado es false, el doc no existe (la descarga
    // desde Meta falló) y se muestra el aviso con el media_id.
    if (p.comprobante_guardado && fbReady()) {
      setComp({ id: p._id, estado: "cargando" });
      colRef("comprobantes").doc(String(p._id)).get()
        .then((d) => {
          const x = d.exists ? d.data() : null;
          if (x && x.b64) setComp({ id: p._id, estado: "ok", src: "data:" + (x.mime || "image/jpeg") + ";base64," + x.b64 });
          else setComp({ id: p._id, estado: "no" });
        })
        .catch(() => setComp({ id: p._id, estado: "no" }));
    } else {
      setComp({ id: p._id, estado: "no" });
    }
  };
  const cerrar = () => { setSelId(null); setConfirmCancel(false); setConfirmOcultar(false); setComp(null); };

  // backlog 11-12: la app NO habla con Meta — deja el aviso en
  // tiendas/varman/notificacionesPendientes y el BOT lo envía (con su trigger
  // horario si la ventana de 24h está abierta, o apenas el cliente vuelva a
  // escribir). Contrato documentado en bot_n8n\briefs\CAMBIOS-PEDIDOS.md.
  const encolarNotificacion = (p, tipo, extra) => {
    if (!fbReady()) return;
    const item = catalogo.find((c) => String(c.ref) === String(p.ref || ""));
    const marca = item && item.marca ? String(item.marca).trim() : "";
    colRef("notificacionesPendientes").add(Object.assign({
      tipo,
      pedido_id: String(p._id),
      cliente_wa: String(p.cliente_wa || "").replace(/\D/g, ""),
      cliente_nombre: p.cliente_nombre || "",
      ref: String(p.ref || ""),
      producto: (marca || "tenis") + " de la Ref " + (p.ref || "?"),
      estado: "pendiente",
      creado: new Date().toISOString(),
    }, extra || {})).catch((e) => console.warn("notificacion:", e && e.message));
  };

  const cambiarEstado = (p, nuevo) => {
    if (actualizarPedido(p._id, { estado: nuevo })) {
      showToast("Pedido → " + ESTADOS_PEDIDO[nuevo].label + " ✓", nuevo === "cancelado");
      // al ENTREGAR: el bot le pide la reseña al cliente (backlog 11)
      if (nuevo === "entregado") encolarNotificacion(p, "resena");
    }
    setConfirmCancel(false);
  };

  return (
    <div style={{ padding: "16px 16px 0" }} className="vm-fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "0 4px", gap: 8 }}>
        <div>
          <div style={display(19)}>Pedidos</div>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginTop: 2 }}>
            {pendientes > 0 ? pendientes + " por verificar · llegan solos del bot de WhatsApp" : "llegan solos del bot de WhatsApp"}
          </div>
        </div>
        <BotonExportar onClick={exportPedidos} />
      </div>

      {/* Recordatorio Fase 1: el catálogo web (01-33) no es el inventario
          (VRM001-080). Desde la ronda 2 cada referencia puede enlazarse con su
          VRM en la pestaña Tienda (campo "refInventario"): si está enlazada,
          el detalle del pedido muestra el stock real; si no, se verifica a
          mano como siempre. (bot_n8n\briefs\DECISION-CATALOGO-INVENTARIO.md) */}
      <div style={{
        background: C.accentSoft, border: `1.5px solid rgba(255,90,31,.25)`, borderRadius: 14,
        padding: "10px 13px", fontSize: 12, color: C.ink2, lineHeight: 1.5, marginBottom: 12, fontWeight: 600,
      }}>
        ⚠️ La <b>referencia del pedido es la del catálogo web (01-33)</b>. Antes de
        verificar un pago revisa que haya stock en esa talla: si la referencia está
        enlazada en la pestaña Tienda, el detalle del pedido te muestra el stock
        real; si no, revísalo a mano.
      </div>

      {/* ---- Lista de espera de stock (backlog 13): el bot anota a quien pide
           "avísame cuando llegue la talla X de la ref Y". El aviso es MANUAL:
           tocar 💬 abre el chat del cliente, se le escribe y se marca ✓. ---- */}
      {(() => {
        const esperando = espera.filter((x) => x.estado === "esperando");
        if (!esperando.length) return null;
        return (
          <div style={cardStyle({ padding: "12px 14px", marginBottom: 12 })}>
            <button
              onClick={() => setVerEspera(!verEspera)}
              style={{ width: "100%", border: "none", background: "transparent", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: 0, fontFamily: "Inter, sans-serif" }}
            >
              <span style={{ fontWeight: 800, fontSize: 13.5, color: C.ink }}>
                🔔 Lista de espera ({esperando.length})
              </span>
              <span style={{ color: C.muted, fontSize: 15 }}>{verEspera ? "▴" : "▾"}</span>
            </button>
            {verEspera && esperando.map((x, i) => {
              const wa = String(x.cliente_wa || "").replace(/\D/g, "");
              return (
                <div key={x._id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0 2px", borderTop: i > 0 ? `1px solid ${C.line}` : "none", marginTop: i > 0 ? 8 : 6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {x.cliente_nombre || "(sin nombre)"} · Ref {x.ref}{x.talla ? " · talla " + x.talla : " (cualquier talla)"}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 1, fontWeight: 600 }}>{fmtFechaPedido(x.creado)}</div>
                  </div>
                  {wa && (
                    <a href={"https://wa.me/" + wa} target="_blank" rel="noopener noreferrer" aria-label="Escribirle al cliente" style={btnGhost({ padding: "8px 11px", borderRadius: 10, textDecoration: "none", fontSize: 13 })}>
                      💬
                    </a>
                  )}
                  <button
                    onClick={() => {
                      colRef("listaEspera").doc(x._id).set({ estado: "avisado", avisado: new Date().toISOString() }, { merge: true })
                        .then(() => showToast("Marcado como avisado ✓"))
                        .catch(() => showToast("No se pudo marcar.", true));
                    }}
                    style={btnGhost({ padding: "8px 11px", borderRadius: 10, fontSize: 12, color: C.green, border: `1.5px solid ${C.greenSoft}` })}
                  >
                    ✓ Ya avisé
                  </button>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ---- Filtro por estado ---- */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 6, marginBottom: 8 }}>
        {filtros.map(([id, label]) => (
          <button key={id} onClick={() => { setFiltro(id); setMostrar(30); }} style={{
            padding: "9px 13px", borderRadius: 99, cursor: "pointer", whiteSpace: "nowrap",
            fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 12.5, flexShrink: 0,
            border: `1.5px solid ${filtro === id ? C.ink : C.line}`,
            background: filtro === id ? C.ink : C.card,
            color: filtro === id ? "#fff" : C.ink2,
          }}>
            {label}{id === "pendientes" && pendientes > 0 ? " (" + pendientes + ")" : ""}
          </button>
        ))}
      </div>

      {/* ---- Lista ---- */}
      {lista.length === 0 && (
        <EmptyState
          icon={<IconBag big />}
          title={pedidos.length === 0 ? "Sin pedidos todavía" : "Nada en este filtro"}
          text={pedidos.length === 0
            ? "Cuando un cliente complete una compra con el bot de WhatsApp, el pedido aparecerá aquí solo."
            : 'Toca "Todos" para ver el historial completo.'}
        />
      )}
      {lista.slice(0, mostrar).map((p) => (
        <div
          key={p._id}
          onClick={() => abrir(p)}
          style={cardStyle({ padding: "13px 14px", marginBottom: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 })}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.cliente_nombre || "(sin nombre)"}
            </div>
            <div style={{ fontSize: 12, color: C.ink2, marginTop: 3, fontWeight: 700 }}>
              Ref {p.ref || "?"} · Talla {p.talla || "?"}{p.metodo_pago ? " · " + p.metodo_pago : ""}
            </div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2, fontWeight: 600 }}>{fmtFechaPedido(p.creado)}</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <div style={{ fontWeight: 800, fontSize: 14.5 }}>{fmt(p.total)}</div>
            <BadgeEstadoPedido estado={p.estado} />
          </div>
        </div>
      ))}
      {lista.length > mostrar && (
        <button onClick={() => setMostrar(mostrar + 60)} style={btnGhost({ width: "100%", padding: "12px", marginBottom: 8 })}>
          Ver pedidos anteriores ({lista.length - mostrar} más)
        </button>
      )}
      <div style={{ height: 8 }} />

      {/* ---- Detalle del pedido ---- */}
      {abierto && (() => {
        const e = normEstadoPedido(abierto.estado);
        const E = ESTADOS_PEDIDO[e];
        const wa = String(abierto.cliente_wa || "").replace(/\D/g, "");
        return (
          <Sheet title={"Pedido · Ref " + (abierto.ref || "?")} onClose={cerrar}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <BadgeEstadoPedido estado={abierto.estado} />
              <div style={{ fontSize: 11.5, color: C.muted, fontWeight: 600 }}>{fmtFechaPedido(abierto.creado)}</div>
            </div>

            <div style={{ background: C.card, border: `1.5px solid ${C.line}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{abierto.cliente_nombre || "(sin nombre)"}</div>
              <div style={{ fontSize: 13, color: C.ink2, marginTop: 6, lineHeight: 1.7 }}>
                <b>Referencia {abierto.ref || "?"}</b> · Talla {abierto.talla || "?"}{abierto.genero ? " · " + (abierto.genero.charAt(0).toUpperCase() + abierto.genero.slice(1)) : ""} · {Number(abierto.cantidad) || 1} par
                <br />
                Total: <b>{fmt(abierto.total)}</b>{abierto.metodo_pago ? <> por <b>{abierto.metodo_pago}</b></> : null}
              </div>
              {/* Canal (solo lectura): los pedidos del bot no traen el campo;
                  'web' = compra pagada por Wompi directo en varmancrew.com */}
              {String(abierto.canal || "") === "web" ? (
                <div style={{ fontSize: 11.5, marginTop: 6, fontWeight: 700, color: "#0B69C7" }}>
                  🌐 Compra hecha en la página web
                </div>
              ) : null}
              {/* Atribución de pauta (solo lectura, la escribe el bot):
                  "ctwa:<id>" = llegó de un anuncio click-to-WhatsApp */}
              {(() => {
                const f = String(abierto.fuente || "");
                if (!f) return null; // pedidos anteriores al campo: no se muestra nada
                const esAnuncio = f.indexOf("ctwa:") === 0;
                return (
                  <div style={{ fontSize: 11.5, marginTop: 6, fontWeight: 700, color: esAnuncio ? "#6E8BFF" : C.muted }}>
                    {esAnuncio ? <>📣 Vino de un anuncio · id {f.slice(5)}</> : <>🌱 Cliente orgánico (llegó solo)</>}
                  </div>
                );
              })()}
              {(() => {
                // 5-bis: de dónde sale la referencia — stock real de los
                // códigos propios y/o aviso de bodega externa; sin asociación,
                // el aviso de siempre (verificar a mano).
                const m = mapaDe(abierto);
                const st = stockPedido(abierto);
                const externa = m && m.proveedor ? (
                  <div style={{ fontSize: 11.5, marginTop: 6, fontWeight: 700, color: "#7C3AED" }}>
                    🏭 Externa: {m.proveedor} — verificar disponibilidad{m.nota ? <span style={{ color: C.muted, fontWeight: 600 }}> · {m.nota}</span> : null}
                  </div>
                ) : null;
                let propia = null;
                if (st) {
                  propia = st.sinTallas ? (
                    <div style={{ fontSize: 11.5, marginTop: 6, fontWeight: 700, color: "#B45309" }}>
                      📦 Inventario {st.refInv}: {st.pares} par{st.pares === 1 ? "" : "es"} en total
                      <span style={{ color: C.muted, fontWeight: 600 }}> (sin tallas separadas en el inventario) — confirma la talla {abierto.talla || "?"} a mano.</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 11.5, marginTop: 6, fontWeight: 700, color: st.pares > 0 ? C.green : C.red }}>
                      📦 Inventario {st.refInv} · talla {abierto.talla || "?"}: {st.pares} par{st.pares === 1 ? "" : "es"} en stock
                      <span style={{ color: C.muted, fontWeight: 600 }}> — confirma igual antes de aprobar.</span>
                    </div>
                  );
                }
                if (!propia && !externa) {
                  return (
                    <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6, fontWeight: 600 }}>
                      Ref del catálogo web: verifica el stock a mano (no cruza con el inventario).
                    </div>
                  );
                }
                return (<>{propia}{externa}</>);
              })()}
            </div>

            <Field label="Datos de envío (como los escribió el cliente)">
              <div style={{ background: C.card, border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "11px 13px", fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {abierto.datos_envio || "(sin datos)"}
              </div>
            </Field>

            <Field label="Comprobante de pago">
              {comp && comp.id === abierto._id && comp.estado === "ok" ? (
                <img
                  src={comp.src}
                  alt="Comprobante de pago"
                  style={{ width: "100%", borderRadius: 12, border: `1.5px solid ${C.line}`, display: "block" }}
                />
              ) : comp && comp.id === abierto._id && comp.estado === "cargando" ? (
                <div style={{ fontSize: 12.5, color: C.muted, fontWeight: 600, padding: "10px 0", animation: "vmPulse 1.4s ease infinite" }}>
                  Descargando comprobante…
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, fontWeight: 600 }}>
                  📸 La foto está en el chat de WhatsApp del cliente (también llegó el aviso al 320).
                  {abierto.comprobante_media_id ? <><br />ID en Meta: <span style={{ wordBreak: "break-all" }}>{abierto.comprobante_media_id}</span></> : null}
                </div>
              )}
            </Field>

            {wa && (
              <a
                href={"https://wa.me/" + wa}
                target="_blank"
                rel="noopener noreferrer"
                style={btnGhost({ display: "block", textAlign: "center", textDecoration: "none", marginBottom: 10, padding: "13px" })}
              >
                💬 Escribirle al cliente (+{wa})
              </a>
            )}

            <Field label="Nota interna (solo la ve el equipo)">
              <textarea
                value={nota}
                onChange={(ev) => setNota(ev.target.value)}
                rows={2}
                placeholder="Ej: guía de envío 1234, cliente pide entrega en la tarde…"
                style={inputStyle({ resize: "vertical", fontFamily: "Inter, sans-serif", minHeight: 54 })}
              />
            </Field>
            {nota !== (abierto.notas || "") && (
              <button
                onClick={() => { if (actualizarPedido(abierto._id, { notas: nota })) showToast("Nota guardada ✓"); }}
                style={btnGhost({ width: "100%", padding: "12px", marginBottom: 10 })}
              >
                Guardar nota
              </button>
            )}

            {/* ---- Guía de envío (backlog 12): al guardarla, el BOT le avisa
                 al cliente "tu pedido va en camino" (por eso el botón lo dice
                 explícito). Visible desde que el pago está verificado. ---- */}
            {(e === "verificado" || e === "enviado" || e === "entregado") && (
              <Field label="Guía de envío (al guardar, el bot le avisa al cliente)">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input
                    value={guiaDraft.transportadora}
                    onChange={(ev) => setGuiaDraft({ ...guiaDraft, transportadora: ev.target.value })}
                    placeholder="Transportadora (Servientrega…)"
                    style={inputStyle()}
                  />
                  <input
                    value={guiaDraft.guia}
                    onChange={(ev) => setGuiaDraft({ ...guiaDraft, guia: ev.target.value })}
                    placeholder="Número de guía"
                    style={inputStyle()}
                  />
                </div>
                {(guiaDraft.guia.trim() && guiaDraft.transportadora.trim() &&
                  (guiaDraft.guia !== (abierto.guia || "") || guiaDraft.transportadora !== (abierto.transportadora || ""))) ? (
                  <button
                    onClick={() => {
                      const g = { guia: guiaDraft.guia.trim(), transportadora: guiaDraft.transportadora.trim() };
                      if (actualizarPedido(abierto._id, g)) {
                        encolarNotificacion(abierto, "guia", g);
                        showToast("Guía guardada — el bot le avisa al cliente ✓");
                      }
                    }}
                    style={btnPrimary({ width: "100%", padding: "12px", marginTop: 8 })}
                  >
                    📦 Guardar guía y avisar al cliente
                  </button>
                ) : abierto.guia ? (
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6, fontWeight: 600 }}>
                    Guía guardada: {abierto.transportadora || "?"} · {abierto.guia} (el aviso al cliente ya quedó en cola).
                  </div>
                ) : null}
              </Field>
            )}

            {/* ---- Avanzar el pedido ---- */}
            {E.siguiente && (
              <button
                onClick={() => cambiarEstado(abierto, E.siguiente)}
                style={btnPrimary({
                  width: "100%", padding: "15px", fontSize: 15, marginTop: 4, marginBottom: 10,
                  ...(E.siguiente === "entregado" ? { background: C.green, boxShadow: "0 6px 16px rgba(14,138,77,.32)" } : {}),
                })}
              >
                {E.accion}
              </button>
            )}
            {e !== "cancelado" && e !== "entregado" && (
              confirmCancel ? (
                <button
                  onClick={() => cambiarEstado(abierto, "cancelado")}
                  style={{ width: "100%", padding: "14px", fontSize: 15, borderRadius: 13, border: "none", background: C.red, color: "#fff", fontWeight: 800, fontFamily: "Inter, sans-serif", cursor: "pointer" }}
                >
                  Sí, cancelar pedido
                </button>
              ) : (
                <button onClick={() => setConfirmCancel(true)} style={btnGhost({ width: "100%", padding: "14px", fontSize: 15, color: C.red, border: `1.5px solid ${C.redSoft}` })}>
                  ✕ Cancelar pedido
                </button>
              )
            )}

            {/* ---- Ocultar (pedidos de prueba/duplicados): solo socios. No
                 borra ni toca el documento del pedido (es del bot) — se guarda
                 aparte en "pedidosOcultos" y es reversible con "Mostrar de
                 nuevo". No es lo mismo que "Cancelar": cancelar es un estado
                 real del pedido; ocultar es solo para que no estorbe en la
                 lista. ---- */}
            {esSocio && (
              ocultos[String(abierto._id)] ? (
                <button onClick={() => mostrarPedido(abierto)} style={btnGhost({ width: "100%", padding: "14px", fontSize: 15, marginTop: 10 })}>
                  👁️ Mostrar de nuevo (estaba oculto)
                </button>
              ) : confirmOcultar ? (
                <button
                  onClick={() => ocultarPedido(abierto)}
                  style={{ width: "100%", padding: "14px", fontSize: 15, borderRadius: 13, border: "none", background: C.ink, color: "#fff", fontWeight: 800, fontFamily: "Inter, sans-serif", cursor: "pointer", marginTop: 10 }}
                >
                  Sí, ocultar pedido (no lo borra)
                </button>
              ) : (
                <button onClick={() => setConfirmOcultar(true)} style={btnGhost({ width: "100%", padding: "14px", fontSize: 15, color: C.muted, marginTop: 10 })}>
                  🙈 Ocultar pedido (de prueba)
                </button>
              )
            )}
          </Sheet>
        );
      })()}
    </div>
  );
}

function Sheet({ title, children, onClose }) {
  // Se renderiza con un portal a document.body para que el fondo oscuro cubra
  // TODA la pantalla (incluidos los botones flotantes) y no quede encerrado
  // dentro de contenedores con animación/transform.
  return ReactDOM.createPortal(
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(16,16,18,.5)", zIndex: 100,
        overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "24px 16px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.bg, width: "100%", maxWidth: 540, margin: "0 auto", borderRadius: 22,
          padding: "16px 18px 24px",
          animation: "vmSheet .26s ease both",
          boxShadow: "0 24px 60px rgba(16,16,18,.4)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={display(20)}>{title}</div>
          <button onClick={onClose} style={btnGhost({ padding: "8px 14px", borderRadius: 12 })}>Cerrar</button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

function EmptyState({ icon, title, text }) {
  return (
    <div style={cardStyle({ padding: "38px 24px", textAlign: "center" })}>
      <div style={{ width: 60, height: 60, borderRadius: 18, background: C.bg, color: C.muted, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
        {icon}
      </div>
      <div style={{ fontWeight: 800, fontSize: 15.5, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ ...eyebrow(C.ink2), marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle = (extra = {}) => ({
  border: `1.5px solid ${C.line}`,
  borderRadius: 12,
  padding: "12px 13px",
  fontSize: 15,
  fontFamily: "Inter, sans-serif",
  background: C.card,
  color: C.ink,
  outline: "none",
  width: "100%",
  appearance: "none",
  WebkitAppearance: "none",
  ...extra,
});

const btnPrimary = (extra = {}) => ({
  background: C.accent,
  color: "#fff",
  border: "none",
  borderRadius: 13,
  padding: "12px 16px",
  fontFamily: "Inter, sans-serif",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "0 6px 16px rgba(255,90,31,.32)",
  ...extra,
});

const btnGhost = (extra = {}) => ({
  background: C.card,
  color: C.ink,
  border: `1.5px solid ${C.line}`,
  borderRadius: 13,
  padding: "10px 14px",
  fontFamily: "Inter, sans-serif",
  fontWeight: 700,
  fontSize: 13.5,
  cursor: "pointer",
  ...extra,
});

const btnStep = () => ({
  width: 34,
  height: 34,
  borderRadius: 10,
  border: "none",
  background: C.card,
  boxShadow: "0 1px 3px rgba(16,16,18,.12)",
  fontSize: 18,
  fontWeight: 800,
  cursor: "pointer",
  color: C.ink,
  lineHeight: 1,
});

const btnIcon = (danger) => ({
  width: 34,
  height: 34,
  borderRadius: 10,
  border: "none",
  background: danger ? C.redSoft : C.bg,
  color: danger ? C.red : C.ink2,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

// ---------- Iconos SVG ----------
const svgP = (big) => ({ width: big ? 28 : 18, height: big ? 28 : 18, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" });

function IconBox({ big }) {
  return (
    <svg viewBox="0 0 24 24" {...svgP(big)}>
      <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
      <path d="M3 8l9 5 9-5" />
      <path d="M12 13v8" />
    </svg>
  );
}
function IconCam({ big }) {
  return (
    <svg viewBox="0 0 24 24" {...svgP(big)}>
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
function IconChart({ big }) {
  return (
    <svg viewBox="0 0 24 24" {...svgP(big)}>
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 3 3 5-6" />
    </svg>
  );
}
function IconStats({ big }) {
  return (
    <svg viewBox="0 0 24 24" {...svgP(big)}>
      <path d="M3 3v18h18" />
      <path d="M7 16v-4" />
      <path d="M12 16V8" />
      <path d="M17 16v-6" />
    </svg>
  );
}
function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" }}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

// Botón de exportar: verde estilo Excel, con icono de descarga y texto claro.
// El archivo que baja es un CSV que Excel abre directo.
function BotonExportar({ onClick }) {
  return (
    <button
      onClick={onClick}
      title="Descargar en Excel"
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: C.greenSoft, color: C.green,
        border: `1.5px solid ${C.green}`, borderRadius: 11,
        padding: "8px 13px", fontFamily: "Inter, sans-serif",
        fontWeight: 800, fontSize: 12, cursor: "pointer",
      }}
    >
      <IconDownload />
      Exportar Excel
    </button>
  );
}

function IconCash({ big }) {
  return (
    <svg viewBox="0 0 24 24" style={svgP(big)}>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <circle cx="12" cy="12" r="2.7" />
      <path d="M6.2 9.2h.01M17.8 14.8h.01" />
    </svg>
  );
}

function IconStore({ big }) {
  return (
    <svg viewBox="0 0 24 24" {...svgP(big)}>
      <path d="M4 10v10h16V10" />
      <path d="M2 10l2-6h16l2 6" />
      <path d="M2 10a2.5 2.5 0 005 0 2.5 2.5 0 005 0 2.5 2.5 0 005 0 2.5 2.5 0 005 0" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}
function IconBag({ big }) {
  return (
    <svg viewBox="0 0 24 24" {...svgP(big)}>
      <path d="M6 7h12l1.2 13H4.8L6 7z" />
      <path d="M9 10V6a3 3 0 016 0v4" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg viewBox="0 0 24 24" {...svgP()}>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconEyeOff() {
  return (
    <svg viewBox="0 0 24 24" {...svgP()}>
      <path d="M17.94 17.94A10.94 10.94 0 0112 19c-7 0-11-7-11-7a20.3 20.3 0 015.06-5.94" />
      <path d="M9.9 4.24A10.94 10.94 0 0112 5c7 0 11 7 11 7a20.4 20.4 0 01-3.22 4.2" />
      <path d="M14.12 14.12a3 3 0 11-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" {...svgP()}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}
function IconEdit() {
  return (
    <svg viewBox="0 0 24 24" {...svgP()}>
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" {...svgP()}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    </svg>
  );
}

// ---------- Montaje de la app en el navegador ----------
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<VarmanApp />);
