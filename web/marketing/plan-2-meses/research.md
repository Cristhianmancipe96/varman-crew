# Research — Plan de marketing 2 meses · VarMan Crew (INIT, 2026-07-12)

> Insumo del plan reformado. Fuente: ESTADO-VARMAN.md + los 8 docs de `web/marketing/` +
> reporte del dueño (12 jul). El plan final vive en esta carpeta.

## Cliente
- **Negocio:** VarMan Crew — tienda de zapatos (sneakers deportivas/casuales/urbanas),
  Colombia, envíos nacionales, contra entrega solo Bogotá.
- **Tipo:** D2C local, bootstrapped, equipo = 1 persona (Cristhian, el dueño) + PM (Cowork)
  + agentes de Claude Code para código.
- **Etapa:** sistema completo EN PRODUCCIÓN, fase de lanzamiento supervisado. Ventas aún
  incipientes (pauta paga nunca encendida).

## El sistema de venta (esto cambió DESPUÉS del plan original — clave para la reforma)
El plan original (7-8 jul) asumía un solo camino: anuncio → chat del bot → pedido.
Hoy hay **DOS caminos de conversión**:
1. **WhatsApp bot** (+57 304 291 6972): atiende, arma pedido, cobra por link Wompi/Nequi.
   Con `BOT_CATALOGO_WEB` ON, el bot ya NO manda fotos: manda el link del catálogo web.
2. **Compra directa en la web** (varmancrew.com): botón Comprar → talla → pago Wompi →
   el webhook del bot confirma y avisa. Probado E2E en sandbox; faltan variables de
   Cloudflare + re-subir + pasar a producción de Wompi.

## Activos listos (reusar, no rehacer)
- 6 anuncios click-to-WhatsApp (D1/D2, C1/C2, U1/U2) + 3 de tráfico (W1-W3) — `TEXTOS-ANUNCIOS.md`.
- 6 guiones de video 9:16 + 3 captions de feed — `TEXTOS-TIKTOK-REELS.md`.
- Guía técnica Meta Ads completa (config, métricas, umbrales) — `GUIA-PRIMERA-CAMPANA.md` y
  `GUIA-PASO-A-PASO-CAMPANAS-2026-07-08.md`.
- Auditoría de estilo de marca — `ESTILO-MARCA-REDES.md` (naranja, marca de agua, on-feet,
  ⚠️ riesgo de logos de terceros en pauta paga; nunca tipo LV).
- Calendario jul (8-31) — `CALENDARIO-CONTENIDO-JUL.md` (las fechas ya vencieron en parte).

## Estado de prerequisitos (reporte del dueño, 12 jul)
| Prerequisito | Estado |
|---|---|
| Cuenta TikTok | ✅ Ya existe: **@varmansnk** (verificado en la web; NO crear @varmancrew) |
| Precios en la app | ✅ Establecidos → ya se puede pautar con "Desde $XXX.XXX" |
| Atribución `fuente` (referral) | ⚠️ Bot en producción, **falta probar** que quede en el pedido |
| Audios de tendencia | Pendiente por diseño (se eligen el día de grabar) |
| Checklist Meta | Pendiente — sesión con el dueño en pantalla |
| CORTE (web → número del bot) | Por verificar en vivo (botones y bios) |
| CW2 + flags nuevos en la VM | Pendiente del dueño (bloquea calidad del bot pre-pauta) |
| Compra web Wompi | Falta: 3 variables Cloudflare + re-subir + prueba sandbox |

## Restricciones (reglas de la casa)
- El dueño decide presupuesto y ejecuta la pauta; el PM propone y acompaña pantalla a pantalla.
- Solo material REAL del producto (ni stock ni IA fotorrealista).
- Sin logos de terceros protagonistas en pauta; NUNCA producto tipo LV.
- Carga realista: máx 1 video/día; 1 video → 3 plataformas.
- Métrica real = plata gastada ÷ pedidos verificados en la app (por eso importa `fuente`).

## Incógnitas de intake (preguntadas al dueño el 12 jul)
1. Presupuesto mensual de pauta para los 2 meses.
2. Fecha real de arranque de la pauta (la original, 16 jul, depende de subir CW2 + probar).
3. Meta principal: ¿vender ya, aprender qué vende, o testear→escalar?
4. Ritmo de contenido orgánico sostenible.
