# Nota AGENTE 3 — Ronda 2 · Web + marketing · 2026-07-06

Trabajo del brief `bot_n8n\briefs\BRIEF-RONDA2-2026-07-06.md` (AGENTE 3).
Se tocó SOLO: `web\publicar\index.html`, `web\marketing\` (nueva) y
`plantilla\01-web.md`. NO se tocó `publicar\img\`, ni `privacidad.html`, ni el
número de WhatsApp (sigue siendo el humano hasta EL CORTE, 14 jul).

## 1. Sección "¿Cómo comprar?" (publicar\index.html) — HECHA

- Nueva sección `id="como-comprar"`, entre CONTACTO y el footer: 4 pasos en
  tarjetas (elige en el catálogo → pide por WhatsApp → paga Nequi/Daviplata/
  Bre-B → te llega a toda Colombia), con iconos Tabler ya cargados en la página
  (sin CDNs nuevos, la CSP no cambió).
- Coherente con el diseño actual: usa las mismas variables CSS (`--surf-*`,
  `--brand`, espaciado 8dp), el patrón `s-label`/`s-title` (hereda la barra
  naranja y su animación) y una entrada GSAP igual a la de las stats.
- **WhatsApp:** el paso 2 es un enlace real a wa.me que se arma desde
  `var WHATSAPP_NUMERO` en el mismo IIFE del FAB (texto: "quiero hacer un
  pedido"). El número sigue viviendo en UN solo lugar; **el checklist de EL
  CORTE de la ronda 1 no cambia** (misma línea, mismos 2 archivos). El paso 1
  enlaza a `#catalogo`; los pasos 3 y 4 no son clicables.
- Responsive: 4 columnas en escritorio, 2 en tablet (≤1024px), 1 en móvil (≤560px).

**Verificado en navegador local** (servidor estático sobre `publicar\`):
- La sección existe con sus 4 pasos, encima del footer; sin errores de consola.
- Paso 2 armado correcto: `wa.me/573202250619?text=...quiero hacer un pedido`
  (número actual intacto); FAB y formulario siguen funcionando igual.
- Grid verificado por CSS computado: 4×283px escritorio, 1×327px en 375px.
- Animación verificada: los 4 pasos llegan a opacity 1 al hacer scroll. (Ojo si
  alguien re-verifica igual: el panel de preview congela requestAnimationFrame,
  así que las animaciones GSAP de TODA la página parecen no correr y los
  screenshots se cuelgan; hubo que avanzar el ticker de GSAP a mano. En un
  navegador normal no pasa.)

## 2. Kit de pauta (web\marketing\) — HECHO

- `TEXTOS-ANUNCIOS.md`: 6 anuncios click-to-WhatsApp (2 por categoría:
  deportivas/casuales/urbanas, cada uno con gancho + texto principal + título +
  botón, listos para copiar en Meta Ads) y 3 anuncios de tráfico a la web.
  Sin precios a propósito (los precios reales aún no están cargados) y sin
  números de WhatsApp escritos (el anuncio usa el número conectado a la página
  de Facebook — que el 16 jul ya será el del bot).
- `GUIA-PRIMERA-CAMPANA.md`: checklist previo al gasto, mensajes vs tráfico
  (recomendación: solo Mensajes al inicio), estructura de 1 campaña / 1 conjunto
  / 3 anuncios, presupuesto 15-20k COP/día × 7 días sin tocar, segmentación
  Colombia 18-40 + intereses sneakers, y qué métricas mirar la primera semana
  con umbrales de acción (costo por conversación, CTR, frecuencia) + errores de
  novato.

## 3. plantilla\01-web.md — HECHO

Documentada la capa web para replicación: qué es genérico (design system por
variables, toda la maquinaria JS, estructura), qué está hardcodeado de VarMan
(tabla de cadenas de búsqueda en index.html + privacidad.html), las 11 variables
que un negocio nuevo debe definir, montaje de cero en 10 pasos con tiempos
(~medio día) y operación posterior. Nota: `generar-web.ps1` quedó documentado
como legacy (no se replica).

## Pendientes / recordatorios

1. **Deploy pendiente:** los cambios de index.html (ronda 1 + esta sección) son
   locales. Publicar antes de la pauta (16 jul): arrastrar `web\publicar` a
   Cloudflare Pages → proyecto varmancrew → verificar el sitio y /privacidad.
2. El checklist de EL CORTE de `NOTA-AGENTE3-2026-07-06.md` sigue vigente tal
   cual (esta ronda no agregó puntos de cambio de número).
3. Cuando estén los precios reales, se puede añadir "Desde $XXX.XXX" a los
   textos de anuncio (instrucción incluida en TEXTOS-ANUNCIOS.md).
