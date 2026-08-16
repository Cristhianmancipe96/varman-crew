// ============ BUZÓN · guardar el mensaje y salir (flag BOT_BUZON) ============
// (decisión del dueño, 16-ago-2026) El cliente casi nunca escribe una sola vez:
// manda "hola", luego la foto, luego "cuánto vale" en menos de un minuto. Hoy
// cada uno de esos mensajes arranca su propia ejecución EN PARALELO y el bot
// contesta atropellado — o peor: el barrido de julio encontró 25 de 113 chats
// donde el cliente escribió hasta 6 veces y recibió UNA sola respuesta, que
// desde su lado se ve igual que si el bot estuviera caído.
//
// Este nodo va entre "Parsear mensaje" y "Leer catalogo (Firestore)":
//   - Con BOT_BUZON OFF: devuelve los items TAL CUAL. Comportamiento idéntico
//     al de hoy, byte por byte. El nodo existe pero es transparente.
//   - Con BOT_BUZON ON: guarda cada mensaje en tiendas/varman/botBuzon y
//     devuelve [] — la ejecución TERMINA aquí y libera su memoria. Nadie se
//     queda esperando en la VM (esa es la diferencia con el candado de 2 min
//     que había antes, que dejaba la ejecución viva y se comía la RAM).
//   El que junta y responde es "Buzon recoger (cada minuto)".
//
// UN DOCUMENTO POR MENSAJE, con el message_id de Meta dentro del id:
// crear con documentId es atómico (409 si ya existe), así que no hay carrera
// entre dos mensajes simultáneos Y de paso salen gratis los reenvíos de Meta
// (el mismo webhook repetido no se guarda dos veces). Guardar el array entero
// en un solo doc habría sido leer-modificar-escribir: la falla madre del 25-jul.
//
// No lleva textos.js pegado: no usa ni una frase, y son 256 KB por nodo.
const H = this.helpers;
const crypto = require('crypto');
const FS_BASE = 'https://firestore.googleapis.com/v1/projects/varman-crew/databases/(default)/documents';

const FLAG_BUZON = /^(on|1|true|si|s[ií])$/i.test(String($env.BOT_BUZON || '').trim());
// Flag apagado: transparente. Ni toca Firestore ni cambia nada.
if (!FLAG_BUZON) return $input.all();

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

const items = $input.all();
// Pasan derecho al Cerebro, SIN tocar el buzón:
//  - items SIN wa_id: los avisos de envío fallido que emite "Parsear mensaje"
//    con BOT_LOG_FALLOS. El Cerebro los registra en botErrores.
//  - items CON buzon_juntados: son los paquetes YA JUNTADOS que entrega el
//    reloj (v11.3) por el webhook. Volver a guardarlos armaría un bucle
//    infinito: guardar → madurar → entregar → guardar → ...
const esBundle = (it) => Number(((it.json || {}).buzon_juntados) || 0) > 0;
const pasanDerecho = items.filter((it) => !((it.json || {}).wa_id) || esBundle(it));
const deCliente = items.filter((it) => !!((it.json || {}).wa_id) && !esBundle(it));

if (!deCliente.length) return pasanDerecho;

let tok;
try {
  tok = await tokenAdmin();
} catch (e) {
  // Si Firestore no responde, NO se pierde el mensaje: sigue por el camino
  // de siempre y el cliente recibe su respuesta. Peor un turno atropellado
  // que un cliente en silencio.
  return items;
}

const ahora = new Date().toISOString();
const guardados = [];
for (const it of deCliente) {
  const j = it.json || {};
  const wa = String(j.wa_id).replace(/\D/g, '');
  // id = número + message_id de Meta. Sanitizado y recortado al límite de
  // Firestore (1500 bytes; 200 caracteres sobra y va holgado).
  const idMsg = String(j.message_id || ('sin-id-' + Date.now())).replace(/[^A-Za-z0-9_-]/g, '_');
  const docId = (wa + '__' + idMsg).slice(0, 200);
  try {
    await H.httpRequest({
      method: 'POST',
      url: FS_BASE + '/tiendas/varman/botBuzon?documentId=' + encodeURIComponent(docId),
      headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
      body: { fields: {
        wa: { stringValue: wa },
        recibidoAt: { stringValue: ahora },
        // el item completo de "Parsear mensaje", tal cual, para que el
        // recolector pueda reconstruirlo sin perder un solo campo
        payload: { stringValue: JSON.stringify(j).slice(0, 60000) }
      } },
      json: true, timeout: 15000
    });
    guardados.push(docId);
  } catch (e) {
    const yaEstaba = /409|ALREADY_EXISTS|already exists/i.test(String((e && e.message) || e));
    // 409 = Meta reenvió el mismo webhook. Ya estaba guardado: no es un error.
    if (yaEstaba) continue;
    // Cualquier otro fallo: este mensaje sigue por el camino de siempre para
    // que el cliente no se quede sin respuesta.
    pasanDerecho.push(it);
  }
}

// Los guardados NO siguen: los recoge el trigger del minuto cuando maduren.
return pasanDerecho;
