// ============ LOG DE ERRORES DE ENVÍO (salida de error de "Enviar a WhatsApp") ============
// El nodo "Enviar a WhatsApp" tiene retryOnFail (2 intentos). Si aun así falla,
// el item cae por la salida de error y este nodo lo registra en
// tiendas/varman/botErrores. Nunca lanza: un fallo aquí no debe tumbar nada.
const H = this.helpers;
const crypto = require('crypto');
const FS_BASE = 'https://firestore.googleapis.com/v1/projects/varman-crew/databases/(default)/documents';

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function tokenAdmin() {
  const sa = JSON.parse(Buffer.from($env.FIREBASE_SA_B64, 'base64').toString('utf8'));
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600
  }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(header + '.' + claims);
  const jwt = header + '.' + claims + '.' + b64url(signer.sign(sa.private_key));
  const r = await H.httpRequest({
    method: 'POST', url: 'https://oauth2.googleapis.com/token',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt,
    timeout: 15000, json: true
  });
  return r.access_token;
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

const out = [];
try {
  const tok = await tokenAdmin();
  for (const item of $input.all()) {
    const j = item.json || {};
    const err = j.error || {};
    const registro = {
      fecha: new Date().toISOString(),
      origen: 'Enviar a WhatsApp',
      error: String(err.message || err.description || JSON.stringify(err)).slice(0, 800),
      wa_id: String(j.to || ''),
      contexto: 'tipo=' + String(j.type || '?')
    };
    try {
      await H.httpRequest({ method: 'POST', url: FS_BASE + '/tiendas/varman/botErrores',
        headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
        body: { fields: toFs(registro) }, json: true, timeout: 15000 });
      out.push({ json: { registrado: true, wa_id: registro.wa_id, error: registro.error } });
    } catch (e) {
      out.push({ json: { registrado: false, motivo: String(e.message || e) } });
    }
  }
} catch (e) {
  out.push({ json: { registrado: false, motivo: 'sin token admin: ' + String(e.message || e) } });
}
return out.length ? out : [{ json: { registrado: false, motivo: 'sin items' } }];
