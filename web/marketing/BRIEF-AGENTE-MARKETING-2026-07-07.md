# BRIEF — Agente de Marketing · FB + IG + TikTok · 7 jul 2026

**Cambio de alcance decidido por Cristhian (7 jul):** las campañas ya NO son "web + WhatsApp"
como canales, sino por PLATAFORMA: **Facebook, Instagram y TikTok**. Este brief reemplaza el
enfoque de canales de `GUIA-PRIMERA-CAMPANA.md` (esa guía sigue vigente como manual TÉCNICO
de Meta Ads: presupuestos, métricas, segmentación — no re-escribirla, referenciarla).

**Rol del agente:** preparar y lanzar las campañas DE LA MANO con Cristhian (él no tiene
experiencia en pauta). Nada se publica sin que él lo apruebe y lo ejecute viendo la pantalla.
Formato de trabajo: sesiones cortas, un paso a la vez, explicando qué se hace y por qué.

---

## 1. Realidad investigada (7 jul 2026) — esto define la estrategia

| Plataforma | Mínimo pauta | Veredicto para VarMan |
|---|---|---|
| Facebook + Instagram (Meta Ads, una sola campaña sirve ambas) | desde ~15.000 COP/día | ✅ Canal PAGO principal desde el 16 jul |
| TikTok Ads Manager | ~50.000 COP/día campaña · ~20.000 COP/día por grupo | ⚠️ Caro para la prueba inicial |
| TikTok orgánico + botón "Promote" | $0 (Promote: montos chicos, solo amplifica videos que YA funcionan) | ✅ Canal ORGÁNICO desde YA |

Conclusión del auditor: **Meta con plata, TikTok con contenido.** TikTok Ads formal solo en
semana 3-4, cuando Meta ya haya enseñado cuánto cuesta una conversación y haya videos
orgánicos ganadores para impulsar (Spark Ads/Promote — lo menos riesgoso según los casos
estudiados). En TikTok las fotos no sirven: TODO es video 9:16 de 10-20 seg.

## 2. Plan por plataforma

### Facebook + Instagram (pauta paga — arranca 16 jul, post-CORTE)
- UNA campaña "Mensajes" (click-to-WhatsApp al bot) con ubicaciones automáticas
  Advantage+ → cubre feed, stories y reels de FB **e** IG a la vez. No crear campañas
  separadas por plataforma (divide presupuesto y ninguna aprende).
- 3 anuncios (D1, C1, U1 de `TEXTOS-ANUNCIOS.md` — ya listos, reusar). D2/C2/U2 de reserva.
- Presupuesto: 15-20.000 COP/día × 7 días sin tocar. Métricas y umbrales: sección 5 de la guía.
- Campaña de tráfico a varmancrew.com: semana 2, solo si sobra presupuesto.

### Instagram orgánico (desde ya)
- Reels = el MISMO video que se haga para TikTok (crear una vez, publicar en ambos).
- Bio con link a varmancrew.com y WhatsApp; historias con llegadas/envíos reales.

### TikTok (orgánico desde ya, pauta después)
- Crear cuenta de negocio @varmancrew (si no existe) — la abre Cristhian, el agente guía.
- Ritmo: 3-4 videos/semana. Formatos probados en tiendas de sneakers: unboxing/llegada de
  mercancía, POV "empacando tu pedido", talla y textura en mano (cámara cerca), trends de
  audio adaptados, "3 formas de combinar estos tenis".
- Regla Promote: solo impulsar un video que YA despegó orgánicamente (amplifica señal, no
  la crea). Ads Manager formal: decisión en semana 3-4 con datos de Meta en mano.

### Calendario integrado
- **Ya → 13 jul:** cuenta TikTok + primeros 3 videos + reels espejo en IG.
- **14-15 jul:** EL CORTE + lanzamiento orgánico coordinado (las 3 plataformas anuncian "ya
  puedes pedir por WhatsApp").
- **16 jul:** pauta Meta ON (checklist sección 0 de la guía debe estar 100%).
- **23 jul:** revisión semana 1 con Cristhian → rotar anuncios, decidir campaña de tráfico.
- **~30 jul:** decisión TikTok pago (Promote sobre el mejor video, o Ads Manager si el
  presupuesto total sube a ≥50k/día).

## 3. Entregables del agente (en esta carpeta)
1. `TEXTOS-TIKTOK-REELS.md` — guiones de los primeros 6 videos (gancho primeros 2 seg,
   texto en pantalla, CTA a WhatsApp/link en bio) + 3 captions IG.
2. `CALENDARIO-CONTENIDO-JUL.md` — qué se publica cada día del 8 al 31 jul, por plataforma.
3. Checklist de creación de la campaña Meta actualizado (con Cristhian en pantalla, 16 jul).
4. Al terminar: nota corta `NOTA-AGENTE-MKT-<fecha>.md` con lo hecho y pendientes.

## 4. Reglas que NO se negocian
- La pauta paga NO arranca antes de EL CORTE (~14 jul) ni con el checklist de la guía incompleto.
- Sin precios en anuncios hasta que Cristhian confirme precios reales en la app.
- Fotos/videos: solo material REAL de los tenis (nada de stock ni IA fotorrealista de producto).
- Presupuesto final lo define Cristhian; el agente propone, no gasta.
- Los anuncios click-to-WhatsApp usarán el número del bot (+57 304 291 6972) SOLO después
  del corte; no escribir números en los textos.

## 5. Mejora pedida al bot (coordinar con Agente Bot, no ejecutar aquí)
Los webhooks de click-to-WhatsApp traen el objeto `referral` (qué anuncio trajo al cliente).
Pedir que el bot lo guarde en el pedido (campo `fuente`) → sabremos qué anuncio VENDE, no
solo cuál genera chats. Registrado en `bot_n8n/briefs/CAMBIOS-PEDIDOS.md` si aplica.

*Brief generado por Cowork (PM) el 2026-07-07. Fuentes de la investigación: mínimos TikTok
(webhexup.com, consolidaciondigital.com, ads.tiktok.com), estrategia Spark/Promote
(shopify.com, hootsuite.com, stackmatix.com).*
