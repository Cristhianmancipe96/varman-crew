// ============ Simula el evento de Wompi (SANDBOX) hacia un webhook ============
// Arma un evento transaction.updated (APPROVED) firmado con el
// WOMPI_EVENTS_SECRET de PRUEBA del .env del bot (misma firma que valida
// wompi-webhook.js) y lo manda al webhook indicado. Sirve para probar la
// confirmación sin esperar el reenvío real de Wompi.
//
// SOLO sandbox: si el secreto no empieza por "test_", se niega a correr.
//
// Uso:
//   node simular-webhook.js <payment_link_id> <transaction_id> <monto_en_centavos> [url]
//   url por defecto: https://bot.varmancrew.com/webhook/wompi
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const ENV_BOT = path.resolve(__dirname, '..', '..', 'bot_n8n', '.env');
const envBot = {};
fs.readFileSync(ENV_BOT, 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) envBot[m[1]] = m[2].trim();
});
// mismo arreglo que servidor-local.js: el .env tiene el prefijo duplicado
function dedupPrefijo(v, pref) {
  v = String(v || '');
  while (v.indexOf(pref + pref) === 0) v = v.slice(pref.length);
  return v;
}
const secret = dedupPrefijo(envBot.WOMPI_EVENTS_SECRET, 'test_events_');
if (!/^test_/.test(secret)) {
  console.error('⚠ WOMPI_EVENTS_SECRET no es de PRUEBA (test_...). No se simula nada.');
  process.exit(1);
}

const [linkId, txId, monto, url] = process.argv.slice(2);
if (!linkId || !txId || !monto) {
  console.error('Uso: node simular-webhook.js <payment_link_id> <transaction_id> <monto_en_centavos> [url]');
  process.exit(1);
}
const destino = url || 'https://bot.varmancrew.com/webhook/wompi';

const timestamp = Math.floor(Date.now() / 1000);
const tx = {
  id: txId, status: 'APPROVED', amount_in_cents: Number(monto),
  currency: 'COP', payment_link_id: linkId,
};
// misma fórmula que valida el bot: valores de signature.properties + timestamp + secret
const concat = tx.id + tx.status + String(tx.amount_in_cents) + timestamp + secret;
const checksum = crypto.createHash('sha256').update(concat).digest('hex');
const evento = {
  event: 'transaction.updated', environment: 'test',
  data: { transaction: tx }, timestamp,
  signature: { properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'], checksum },
};

fetch(destino, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(evento),
}).then(async (r) => {
  console.log('→', destino);
  console.log('HTTP', r.status, (await r.text()).slice(0, 300));
}).catch((e) => {
  console.error('falló el envío:', e && e.message);
  process.exit(1);
});
