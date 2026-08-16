# Plan de marketing — 2 meses (16 jul → 15 sep 2026) · VarMan Crew

**Modo de trabajo elegido por el dueño (12 jul):** probar semana a semana e ir escalando.
**Presupuesto:** 15–20k COP/día en Meta (≈450–600k/mes; ~0,9–1,2M los 2 meses) + TikTok
Promote opcional (montos chicos, solo sobre videos que ya despegaron).
**Contenido orgánico:** 2 videos/semana (1 video → TikTok @varmansnk + Reel IG + FB) + historias.
**Arranque de pauta:** jueves 16 jul — CONDICIONADO a que la Semana 0 esté completa.

> Reemplaza como plan operativo a `CALENDARIO-CONTENIDO-JUL.md` (fechas vencidas). Los demás
> docs de `web/marketing/` siguen vigentes como material: textos de anuncios, guiones,
> guía técnica de Meta y estilo de marca.

---

## 1. Resumen ejecutivo (60 segundos)

Tres apuestas para estos 2 meses:
1. **Una sola campaña de Mensajes (click-to-WhatsApp al bot)** con 3 creativos — toda la
   plata a un solo lugar hasta que los datos digan otra cosa.
2. **Un ritual semanal de 30 minutos (los jueves)** que decide con datos: mantener, rotar
   creativo, o subir +20%. Ese ritual ES la estrategia de "probar e ir escalando".
3. **La web como segundo cerrador de ventas:** el bot manda al catálogo web y el cliente
   puede pagar ahí mismo con Wompi — hay que llevarlo a producción en el mes 1.

Resultado esperado al 15 sep: saber **cuánto cuesta un pedido**, cuál anuncio/creativo lo
trae, y un presupuesto mes 3 basado en margen real, no en intuición.

## 2. Lo que cambió desde el plan original (por qué esta reforma)

| Antes (plan 7-8 jul) | Ahora (realidad 12 jul) |
|---|---|
| Crear cuenta TikTok @varmancrew | ✅ Ya existe **@varmansnk** — usar esa, no crear nada |
| Sin precios → anuncios sin precio | ✅ Precios en la app → se puede probar "Desde $XXX.XXX" |
| Un solo camino: anuncio → bot → pedido | **Dos caminos:** bot por WhatsApp + compra directa web (Wompi) |
| Bot mandaba fotos de catálogo | Bot manda **link del catálogo web** (`BOT_CATALOGO_WEB` ON) |
| 3-4 videos/semana | **2 videos/semana** (sostenible para 1 persona) |
| Plan de 3 semanas de julio | **8 semanas** con revisión y decisión cada jueves |

## 3. El embudo completo (AARRR simplificado)

- **Adquisición** — pauta Meta (Mensajes) + orgánico TikTok/IG/FB (2 videos/semana).
- **Activación** — el mensaje prellenado del anuncio cae al bot; el bot responde y manda el
  link del catálogo; en la web el cliente ve precios y puede COMPRAR con Wompi.
- **Retención** — seguimiento automático ~2h del bot ("¿pudiste comprar?"); carrito
  abandonado (flag existente); responder todo DM/comentario.
- **Referidos** — pedir reseña de FB a cada comprador contento (FB tiene 0 reseñas);
  videos "POV empacando TU pedido" = prueba social.
- **Ingresos** — la única cuenta que importa: `plata gastada ÷ pedidos verificados en la
  app = costo por pedido`, comparado contra el margen del par.

## 4. SEMANA 0 (13–15 jul) — sin esto NO se enciende nada

Regla del plan original que sigue viva: cada clic pagado que cae en un bot a medias es
plata perdida. Antes del jueves 16:

- [ ] **Subir CW2 + flags** a la VM (`bot-varman-PARA-SUBIR-...json` del Escritorio +
      `BOT_FOTO_ASESOR=on`, `BOT_NOMBRE_MODELO=on` + `--force-recreate` + reimportar).
- [ ] **Probar el bot E2E:** hola → catálogo → precio → marca → una compra completa.
- [ ] **Probar la atribución `fuente`:** simular/verificar que un chat que entra por
      anuncio deja la fuente en el pedido (único termómetro de qué anuncio VENDE).
- [ ] **CORTE verificado:** botón WhatsApp de la página de FB, bio de TikTok @varmansnk,
      bio de IG y links de la web → todos al número del bot (304), no al 320.
- [ ] **Cuenta publicitaria:** método de pago cargado; WABA vinculada al negocio.
- [ ] **Elegir las fotos** de los 3 anuncios (on-feet con medias blancas; sin logos de
      terceros protagonistas; nunca tipo LV).

**Si el 15 jul algo de esto falta → la pauta se corre los días que haga falta.** El 16 es
la meta, no una promesa a Meta.

## 5. MES 1 (16 jul – 12 ago) — descubrir qué vende

**Estructura fija:** 1 campaña Mensajes → 1 conjunto (presupuesto aquí: 15k/día) →
3 anuncios: D1 (deportivas), C1 (casuales), U1 (urbanas). Reservas: D2/C2/U2.

| Semana | Fechas | Qué pasa | Decisión del jueves |
|---|---|---|---|
| **S1** | 16–22 jul | Pauta ON (16 jul). Aprendizaje de Meta: **no tocar nada**. Mirar 1 vez/día sin editar. | **Jue 23:** 1ª revisión — costo/conversación por anuncio, CTR, frecuencia, pedidos por fuente. Rotar a reserva SOLO el anuncio que pasó umbrales. |
| **S2** | 23–29 jul | Correr con los ajustes. Poner variables Wompi en Cloudflare + probar compra web en sandbox. | **Jue 30:** ¿algún video orgánico despegó? → Promote (monto chico). ¿Costo/pedido < margen? → subir a 18k/día. |
| **S3** | 30 jul–5 ago | Escalado prudente. Si sandbox web OK → **Wompi a producción** (llaves prod + webhook + compra real chica). | **Jue 6:** revisar si el anuncio ganador aguanta la subida; frecuencia >3 → refrescar foto. |
| **S4** | 6–12 ago | Consolidar. Preparar el corte de cuentas del mes. | **Jue 13: BALANCE MES 1** — costo por conversación, costo por pedido, anuncio ganador, margen. Con eso se decide el mes 2. |

**Umbrales (de la guía técnica, siguen vigentes):**
- Costo/conversación: <3.000 excelente · 3–6.000 normal · >8.000 sostenido = cambiar la FOTO.
- CTR >1% bien; <0,6% la foto no llama. Frecuencia >3 = rotar creativo.
- Subidas de presupuesto: **+20% máximo, 1 vez por semana**, solo si costo/pedido < margen.

## 6. MES 2 (13 ago – 15 sep) — escalar lo que demostró vender

El contenido exacto lo dicta el balance del mes 1. El menú de decisiones:

| Si pasó esto en mes 1… | …entonces en mes 2 |
|---|---|
| Costo/pedido < margen (rentable) | Subir el ganador hasta 20k/día (+20% semanal). Creativo nuevo del mismo estilo con "Desde $XXX.XXX" (probar CON precio vs SIN precio). |
| Rentable y estable 2+ semanas | Considerar 2ª campaña de **Tráfico** a varmancrew.com (8–10k/día) con plata NUEVA — nunca quitándole a Mensajes. Ahora la web cierra ventas sola (Wompi), el tráfico vale más que antes. |
| Costo/pedido ≈ margen (tablas) | No escalar. Rotar creativos (fotos nuevas, mismo texto ganador) y probar 1 variable por semana: foto → precio en texto → audiencia. |
| Costo/conversación bien pero 0 pedidos | El problema no es el anuncio, es el cierre: revisar conversaciones del bot, precios vs competencia, o fricción de talla/envío. Pausar pauta si hace falta — no pagar por chats que no cierran. |
| Un video orgánico explotó | Promote + remake del formato cada semana; el orgánico puede bajar el costo total. |

Semanas S5–S8 mantienen el mismo ritual: **jueves = revisión de 30 min + UNA decisión**
(20, 27 ago · 3, 10 sep). Cierre ~15 sep: balance de los 2 meses → plan mes 3 con datos.

## 7. Contenido orgánico — 2 videos/semana × 8 semanas

Máquina simple: **martes y domingo video** (los mejores horarios ya vistos), historias los
demás días, responder todo comentario/DM. 16 videos en total:

- **S1–S3:** rodar los 6 guiones existentes (D-V1, C-V1, U-V1, D-V2, C-V2, U-V2) —
  `TEXTOS-TIKTOK-REELS.md`. Audio de tendencia elegido EL MISMO día de grabar.
- **S4–S8:** remakes del formato que mejor funcionó (otro par, mismo guion), POV empacando
  pedidos REALES (ya debería haber), y 1 trend nuevo por semana. Cierre: "lo que más nos
  pidieron" con los pares top.
- CTA siempre: "escríbenos por WhatsApp" + link en bio (al bot). Marca de agua siempre.
- Captions de feed 1-3 disponibles para posts de foto los días sin video.

## 8. Presupuesto de los 2 meses

| Rubro | Mes 1 | Mes 2 | Total |
|---|---|---|---|
| Meta Mensajes | 15k/día → 18k si rentable (~470–520k) | hasta 20k/día (~560–600k) | ~1,0–1,1M |
| TikTok Promote (opcional) | 0–50k | 0–100k | 0–150k |
| Tráfico web (opcional, solo con plata nueva) | 0 | 0–250k | 0–250k |
| **Total pauta** | **~470–570k** | **~560–950k** | **~1,0–1,5M COP** |

La cifra final de cada subida la apruebas tú en la revisión del jueves. Contenido orgánico:
$0 (tu tiempo: ~2 grabaciones/semana).

## 9. Riesgos y decisiones abiertas

1. **`fuente` sin probar** — si no queda grabada, volamos a ciegas sobre qué anuncio vende.
   Probar en Semana 0 (bloqueante).
2. **Logos de terceros en creativos** — riesgo de rechazo/baneo de la cuenta publicitaria.
   Primera campaña con modelos sin branding visible (recomendación PM; decisión tuya).
3. **Wompi producción** — sin esto la web no cierra ventas sola; meta: semana 3.
4. **VM de 1 GB** — si la pauta multiplica chats, vigilar carga de la VM la primera semana.
5. **16 jul es apretado** — elegiste mantenerlo; si Semana 0 no cierra el 15, se corre
   (regla no negociable: no se paga tráfico hacia un bot sin probar).

---

*Plan reformado por el PM (Cowork) el 2026-07-12 con las decisiones del dueño: 15–20k/día ·
arranque 16 jul · probar semana a semana y escalar · 2 videos/semana. Insumos en
`research.md`; material operativo en `web/marketing/` (textos, guiones, guía Meta, estilo).*
