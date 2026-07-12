# Wompi — pasos de Cristhian (persona natural) · VarMan Crew · 8 jul 2026

Objetivo: crear la cuenta y sacar las **3 llaves** para que el agente del bot conecte el pago
automático (link de pago + webhook de confirmación). Verificado con la interfaz actual de Wompi.

## 1. RUT (gratis, DIAN)
Si no lo tienes actualizado: **dian.gov.co** → sacar/actualizar el RUT como **persona natural con
actividad económica** (ej. comercio al por menor de calzado). Es gratis y online.

## 2. Cuenta bancaria + certificación
Necesitas una **cuenta a tu nombre** para recibir los desembolsos y su **certificación bancaria**
(se descarga desde la app/portal del banco). *(Confirma si tu Nequi te da certificación bancaria;
si no, usa una cuenta de ahorros.)*

## 3. Crear la cuenta en Wompi
- **wompi.co → Crear cuenta** → elige la opción **"Independiente"** (persona natural), no "Empresarial".
- Sube: **RUT + certificación bancaria + documento de identidad**.
- Aprobación estimada: **1–3 días hábiles**.

## 4. Sacar las llaves (cuando aprueben)
- En el panel de Wompi → menú izquierdo **"Desarrolladores"**.
- Copia las **3**: **Llave Pública**, **Llave Privada** y **Llave de Integración / Eventos** (esta
  última es la del **webhook/firma**).
- Para construir y probar SIN cobrar de verdad: activa **"Modo de pruebas"** (botón a la derecha).
  Te da llaves con **"_test"** → el agente arma y prueba con esas primero; luego se cambia a las de producción.

## 5. Pasar las llaves al bot
**Ponlas TÚ mismo en el `.env` de la VM (no las pegues en el chat — la privada y los secretos son
llaves secretas).** Copia las de **sandbox/test** desde el menú **"Desarrollo"**:
- `WOMPI_PUB_KEY` = Llave Pública (`pub_test_...`)
- `WOMPI_PRV_KEY` = Llave Privada (`prv_test_...`)
- `WOMPI_INTEGRITY_SECRET` = Secreto de Integridad (firma del link/transacción)
- `WOMPI_EVENTS_SECRET` = Secreto de Eventos (validar la firma del webhook)
- `WOMPI_ENV` = `test` → `prod` cuando Wompi apruebe producción

El agente del bot conecta: crear link de pago con el total y la ref + webhook que marca el pedido
como `pago_confirmado`. Luego configura la **URL de eventos (webhook)** en Wompi apuntando al bot
(el agente te da esa URL). **Sin llaves, el bot no ofrece Wompi (flag) y sigue igual** — no rompe nada.

> Estado 8 jul: cuenta creada, **en Sandbox** (Wompi validando datos). Con las llaves `_test` ya se
> puede construir y probar; el paso a producción es automático cuando Wompi apruebe.

## Recordatorios
- **Primer desembolso a persona natural: ~30 días** tras la primera venta → Nequi/Daviplata/Bre-B
  siguen de respaldo un tiempo.
- Moneda: **COP**. Empezar en modo pruebas y pasar a producción cuando el flujo esté probado E2E.

*Fuentes: docs.wompi.co (Ambientes y llaves / Referencia API); registro persona natural "Independiente".*
