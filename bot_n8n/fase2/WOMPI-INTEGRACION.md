# Wompi — integración técnica (link de pago + webhook) · VarMan Crew · v6

> Cómo el bot cobra automático con Wompi. **Aditivo y con flag:** sin las llaves
> en el `.env`, el método Wompi NO aparece y el bot cobra igual que la v5
> (Nequi/Daviplata/Bre-B con comprobante). Pasos NO técnicos de Cristhian (sacar
> RUT, crear cuenta, llaves): `fase2/WOMPI-PASOS-CRISTHIAN.md`.

## Qué hace
1. En el paso de pago, si Wompi está configurado, el bot muestra los métodos en
   una **lista** con una 4ª opción: *"Tarjeta / PSE / Nequi (Wompi)"* (los
   botones de WhatsApp solo permiten 3 → por eso lista cuando hay 4).
2. Al elegir Wompi, el bot **crea un link de pago** (API Wompi) por el total y la
   ref, guarda el pedido en estado `pago_pendiente` y le manda el link al cliente.
3. Cuando el cliente paga, Wompi llama al **webhook** `/webhook/wompi`. El bot
   **verifica la firma** del evento y, si el pago quedó `APPROVED`, pasa el pedido
   a `pago_confirmado` y le avisa al 320. **Sin comprobante manual.**

## Variables `.env` (placeholders — las llena Cristhian)
| Variable | Qué es | Ejemplo |
|---|---|---|
| `WOMPI_PUB_KEY` | Llave pública | `pub_test_...` / `pub_prod_...` |
| `WOMPI_PRV_KEY` | Llave privada (crea el link, va como Bearer) | `prv_test_...` / `prv_prod_...` |
| `WOMPI_EVENTS_SECRET` | Secreto de **Eventos** (firma del webhook) | `test_events_...` |
| `WOMPI_ENV` | `test` (sandbox) o `prod` (producción) | `test` |

**Flag:** el método Wompi solo se ofrece si `WOMPI_PUB_KEY` **y** `WOMPI_PRV_KEY`
están presentes. El webhook solo procesa si `WOMPI_EVENTS_SECRET` está presente.
Falta cualquiera → el bot se comporta EXACTO como la v5.

## Endpoints usados
- **Crear link:** `POST https://{sandbox|production}.wompi.co/v1/payment_links`
  con `Authorization: Bearer <WOMPI_PRV_KEY>`. Body: `name`, `description`,
  `single_use:true`, `collect_shipping:false`, `currency:"COP"`,
  `amount_in_cents` (= total × 100). Respuesta: `data.id`.
  URL de pago que se envía al cliente: `https://checkout.wompi.co/l/<data.id>`.
- **Webhook (lo llama Wompi):** `POST https://bot.varmancrew.com/webhook/wompi`.
  Registrar esta URL en el panel Wompi → Desarrolladores → URL de eventos.

## Verificación de la firma del webhook (implementada)
Wompi manda en cada evento `signature.properties` (lista de campos),
`signature.checksum` y `timestamp`. El bot calcula:

```
concat = valores de signature.properties (en orden, tomados de data.*)
       + timestamp
       + WOMPI_EVENTS_SECRET
checksum_calculado = SHA256(concat)   // hex
```

y lo compara (case-insensitive) con `signature.checksum`. Si no coincide, el
evento se **descarta** (posible suplantación) y queda un registro en
`tiendas/varman/botErrores` (`origen: wompi-webhook-firma`). El código es
genérico: recorre `signature.properties` tal como los mande Wompi.

## Mapeo de estados Wompi → pedido
| Transacción Wompi | Pedido (`estado`) | Acción del bot |
|---|---|---|
| link creado, aún sin pagar | `pago_pendiente` | manda el link; avisa al 320 (pendiente) |
| `APPROVED` | `pago_confirmado` | avisa al 320 (pago confirmado); listo para envío |
| `DECLINED` / `VOIDED` / `ERROR` / `PENDING` | se queda `pago_pendiente` | no cambia nada (el 320 hace seguimiento) |

- **Idempotente:** si Wompi reintenta el evento y el pedido ya está
  `pago_confirmado`, el bot no vuelve a avisar.
- Campos nuevos que el bot escribe en el pedido: `wompi_payment_link_id`
  (al crear), `wompi_transaction_id` y `wompi_status` (al confirmar). Ver el
  contrato en `briefs/CAMBIOS-PEDIDOS.md` (sección v6).

## Pasos manuales de Cristhian (resumen; detalle en WOMPI-PASOS-CRISTHIAN.md)
1. Sacar/actualizar **RUT** gratis en la DIAN (persona natural con actividad económica).
2. Crear cuenta en **wompi.co** → "Independiente" (persona natural) + certificación bancaria.
3. Panel Wompi → **Desarrolladores** → copiar las 3 llaves. Activar **Modo de pruebas** primero.
4. Pegar las llaves en el `.env` de la VM (`nano ~/varman-bot/.env`) y `docker compose up -d`.
5. En el panel Wompi, registrar la **URL de eventos**: `https://bot.varmancrew.com/webhook/wompi`.
6. Probar en `test` con las tarjetas de prueba de Wompi; cuando funcione E2E, cambiar
   a las llaves `_prod` y `WOMPI_ENV=prod`.

> ⚠ **Primer desembolso a persona natural: ~30 días** tras la primera venta.
> Por eso Nequi/Daviplata/Bre-B siguen de respaldo (conviven; no se quita nada).

## Cómo probarlo (offline, ya cubierto en tests)
`node tests/test-offline-v4.js` — sección 19: lista con Wompi, creación de link
(mock), pedido `pago_pendiente`, webhook con firma válida → `pago_confirmado`,
idempotencia y **rechazo de firma inválida**. Con las 4 variables vacías, todo
el flujo de pago se comporta como v5 (secciones 1–17 en verde).

## Rollback
Todo vive detrás del flag: para desactivar Wompi basta **borrar/comentar** las
variables `WOMPI_*` del `.env` y `docker compose up -d`. El workflow no cambia y
el bot vuelve al pago v5. (El nodo del webhook queda inerte sin el secreto.)
