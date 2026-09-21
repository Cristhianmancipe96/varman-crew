// Llena tiendas/varman/vitrina = products SIN costo (misma lista cerrada que fichaVitrina en app.jsx).
// Copia los valores tal cual vienen de Firestore (mismo tipo), así la app no encuentra diferencias.
const T = process.env.TOKEN, DRY = process.env.APLICAR !== "si";
const BASE = "https://firestore.googleapis.com/v1/projects/varman-crew/databases/(default)/documents";
const CAMPOS = ["id", "referencia", "modelo", "color", "talla", "precio", "stock"];
const H = { Authorization: "Bearer " + T, "Content-Type": "application/json" };
const listar = async (col) => { let out = [], tok = ""; do { const r = await (await fetch(`${BASE}/tiendas/varman/${col}?pageSize=300${tok ? "&pageToken=" + tok : ""}`, { headers: H })).json(); if (r.error) throw new Error(JSON.stringify(r.error)); out = out.concat(r.documents || []); tok = r.nextPageToken || ""; } while (tok); return out; };
(async () => {
  const prods = await listar("products"), vit = await listar("vitrina");
  console.log("products:", prods.length, "· vitrina antes:", vit.length);
  const writes = prods.map((d) => {
    const id = d.name.split("/").pop(), fields = {};
    CAMPOS.forEach((k) => { if (d.fields && d.fields[k] !== undefined) fields[k] = d.fields[k]; });
    return { update: { name: `projects/varman-crew/databases/(default)/documents/tiendas/varman/vitrina/${id}`, fields } };
  });
  const conCosto = writes.filter((w) => "costo" in w.update.fields).length;
  const conStock = prods.filter((d) => Number((d.fields.stock || {}).integerValue || 0) > 0).length;
  console.log("fichas a escribir:", writes.length, "· con costo (debe ser 0):", conCosto, "· con stock > 0:", conStock);
  console.log("ejemplo:", JSON.stringify(writes[0].update.fields));
  if (DRY) return console.log("SIMULACRO: no se escribió nada.");
  for (let i = 0; i < writes.length; i += 400) {
    const r = await (await fetch(`${BASE}:commit`, { method: "POST", headers: H, body: JSON.stringify({ writes: writes.slice(i, i + 400) }) })).json();
    if (r.error) throw new Error(JSON.stringify(r.error));
    console.log("lote", i / 400 + 1, "ok:", (r.writeResults || []).length);
  }
  const despues = await listar("vitrina");
  console.log("vitrina después:", despues.length, "· alguna con costo:", despues.some((d) => d.fields && d.fields.costo));
})().catch((e) => { console.log("ERROR", e.message.slice(0, 400)); process.exit(1); });
