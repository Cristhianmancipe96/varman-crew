# Guía de la primera campaña en Meta Ads — VarMan Crew

**Para quién es esta guía:** Cristhian, sin experiencia previa en pauta. Todo se
hace desde el celular o el computador en https://adsmanager.facebook.com con la
cuenta de la página de Facebook de VarMan.

**Cuándo:** la pauta arranca el **16 de julio**, es decir DESPUÉS de EL CORTE
(14 jul). Antes de crear nada, verificar el checklist de abajo.

---

## 0. Checklist antes de gastar un peso

- [ ] EL CORTE hecho: el FAB y los botones de la web abren el número del bot.
- [ ] El bot responde bien a un pedido completo de prueba (catálogo → talla → pago → confirmación).
- [ ] Los cambios de la web están publicados en Cloudflare Pages (incluida la sección "¿Cómo comprar?").
- [ ] Fotos y precios reales cargados en la pestaña Tienda de la app.
- [ ] Método de pago agregado en el Administrador de Anuncios (tarjeta débito/crédito; Meta cobra en COP).
- [ ] La página de Facebook tiene el WhatsApp del bot conectado (Configuración de la página → WhatsApp).

Si algo de esto falta, **no lanzar todavía**: cada clic pagado que llegue a un
bot caído o a un catálogo sin precios es plata perdida.

## 1. ¿Objetivo "Mensajes" o "Tráfico"? — los dos, pero así

| | Campaña de MENSAJES (click-to-WhatsApp) | Campaña de TRÁFICO (a la web) |
|---|---|---|
| Qué hace | El anuncio abre directo un chat de WhatsApp | El anuncio abre varmancrew.pages.dev |
| Para qué sirve | **Vender ya** — el cliente cae directo al bot | Que conozcan la marca y el catálogo |
| Costo por resultado | Más caro por clic, pero cada clic es una conversación | Clics baratos, pero venden menos directo |
| Cuándo usarla | **Desde el día 1** | Semana 2 en adelante, o si sobra presupuesto |

**Recomendación: empezar SOLO con Mensajes.** El sistema completo (web → WhatsApp
→ bot → pedido en la app) está optimizado para esa ruta. La campaña de tráfico se
agrega después, cuando ya se sepa cuánto cuesta una conversación.

## 2. Estructura de la campaña (la más simple que funciona)

```
Campaña: "VarMan — Mensajes WhatsApp" (objetivo: Interacción → WhatsApp)
└── 1 solo conjunto de anuncios (presupuesto aquí)
    ├── Anuncio D1 (deportivas)  ← textos en TEXTOS-ANUNCIOS.md
    ├── Anuncio C1 (casuales)
    └── Anuncio U1 (urbanas)
```

- **3 anuncios en el mismo conjunto**: Meta reparte el presupuesto solo y aprende
  cuál funciona. No crear 3 campañas separadas — divide el presupuesto y ninguna aprende.
- Los anuncios D2, C2, U2 y los de tráfico quedan de **reserva**: se usan en la
  semana 2 para reemplazar al que peor funcione o cuando el anuncio se "canse"
  (frecuencia > 3, ver sección 5).

## 3. Presupuesto

- **15.000–20.000 COP por día**, puesto a nivel del conjunto de anuncios.
- Mínimo **7 días seguidos sin tocar nada**. Los primeros 3-4 días Meta está en
  "fase de aprendizaje" y los números bailan — no apagar, no editar, no subir ni
  bajar presupuesto en esos días (cada edición reinicia el aprendizaje).
- Total de la prueba: ~105.000–140.000 COP la primera semana. Ese es el costo de
  saber qué anuncio vende y cuánto cuesta cada conversación.
- No usar "duración limitada con presupuesto total" todavía; presupuesto diario
  es más fácil de controlar y de apagar.

## 4. Segmentación

- **Ubicación:** Colombia (todo el país — los envíos son nacionales). Si los
  primeros pedidos se concentran en ciertas ciudades, luego se puede acotar.
- **Edad:** 18–40.
- **Género:** todos (los datos dirán si conviene separar).
- **Intereses** (escribirlos en "segmentación detallada", agregar los que Meta
  sugiera parecidos): Sneakers · Zapatillas deportivas · Nike · Adidas · Jordan
  (marca) · Streetwear · Moda urbana · Compras en línea.
- Dejar activada la opción de Meta de ampliar la segmentación si cree que puede
  conseguir resultados más baratos (Advantage). Con presupuestos chicos, ayuda.
- **Idioma:** español. **Ubicaciones de anuncio:** automáticas (feed + historias
  + reels de Facebook e Instagram).

## 5. Qué mirar la primera semana (y qué hacer)

Entrar 1 vez al día al Administrador de Anuncios (no cada hora — los números por
hora no dicen nada). Columnas que importan, en este orden:

1. **Conversaciones con mensajes iniciadas** — la métrica reina. Es la cantidad
   de gente que abrió el chat Y escribió.
2. **Costo por conversación iniciada** = lo gastado ÷ conversaciones.
   - Menos de **3.000 COP**: excelente, dejar correr.
   - Entre **3.000 y 6.000 COP**: normal para empezar; a fin de semana, apagar el
     anuncio más caro de los 3 y probar uno de reserva.
   - Más de **8.000 COP** sostenido tras 4-5 días: algo falla — casi siempre la
     foto (probar otra foto real antes que cambiar el texto).
3. **CTR (todos)** — % de gente que ve el anuncio y hace clic. Arriba de 1% está
   bien; abajo de 0,6%, la foto no llama la atención.
4. **Frecuencia** — cuántas veces vio el anuncio la misma persona. Si pasa de 3,
   la gente ya se cansó: rotar al anuncio de reserva de esa categoría.
5. **CPM** solo como referencia (costo por 1.000 impresiones, en Colombia suele
   estar entre 8.000 y 25.000 COP). No se controla directo; si está altísimo,
   suele bajar solo al salir de la fase de aprendizaje.

**Lo que NO se mide en Meta:** cuántas conversaciones terminaron en pedido. Eso
se ve en la pestaña Pedidos de la app. La cuenta de verdad al final de la semana:
`plata gastada ÷ pedidos verificados = costo por pedido`. Si un pedido deja más
ganancia que su costo de pauta, la campaña es rentable — subir presupuesto de a
poco (máx +20% cada vez, y esperar 2-3 días entre subidas).

## 6. Errores de novato que evitar

1. Editar la campaña a diario "para mejorarla" → reinicia el aprendizaje eterno.
2. Presupuesto repartido en muchas campañas chiquitas → ninguna aprende.
3. Poner texto encima de las fotos del anuncio → Meta muestra menos el anuncio.
4. Responder tarde: si el bot está caído, el cliente pagado se enfría en minutos.
5. Pautar "Me gusta de la página" — likes no son ventas.
6. Prometer en el anuncio lo que no hay (tallas/referencias agotadas): revisar
   stock en la app antes de elegir qué categoría pautar.

---

*Guía generada por el Agente 3 (ronda 2, 2026-07-06). Textos listos para copiar
en `TEXTOS-ANUNCIOS.md`. Benchmarks de costos en COP son orientativos para
Colombia a mitad de 2026; la referencia real será la primera semana propia.*
