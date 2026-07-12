# GUÍA — Desplegar el paquete de FLUIDEZ + VENTA · VarMan Crew · 2026-07-11

> **Para Cristhian.** Todo lo de abajo ya está construido en `workflows/bot-varman.json`,
> probado con la batería offline (**227 PASS · 0 FAIL**) y **APAGADO por defecto**:
> si subes el JSON sin tocar el `.env`, el bot se comporta EXACTO como hoy.
> Cada flag se enciende agregando la línea al `.env` de la VM y **reiniciando n8n**
> (los nodos leen `$env` al arrancar). Para revertir un flag: quitar la línea y
> reiniciar — no hay que tocar el JSON.

## Qué hace cada flag (lo nuevo de fluidez/venta)

| Flag | Qué enciende | Corrida |
|------|--------------|---------|
| `BOT_FLUIDEZ_RECONDUCE=on` | Cambio de modelo a mitad de pedido ("quiero la Ref 06" re-arranca; "otro modelo"/"catálogo" → catálogo cálido) · anti-repetición (2ª vez que repetiría la plantilla → variante breve con salidas *catálogo*/*asesor*) · "¿tienen nike?" a mitad de pedido → muestra la marca · "puedo llevar 2" → confirma con el 15% por 2 pares · nota de voz/sticker → "te leo mejor, ¿me lo escribes?" | F1, F3, F8, F9, F10 |
| `BOT_FLUIDEZ_CATALOGO=on` | Catálogo compacto: 3 fotos + UNA lista (antes hasta 8 burbujas) · arranque del pedido en UNA burbuja (ficha con la pregunta de talla en el caption) | F2, F7 |
| `BOT_FLUIDEZ_ACUSE=on` | El bloque de pago acusa la ciudad ("Envío a *Cali* anotado 📦 … envío incluido") | F5 |
| `BOT_ASISTENTE_V2=on` | Asistente Gemini vendedor: responde lo preguntado + CTA de cierre, maneja mensajes incoherentes, ganchos del BANCO (máx 1). **Requiere `BOT_ROBUSTEZ=on`** | F4 |
| `BOT_TEXTOS_V2=on` | Copy cálido con CTA: bienvenida, pedirTalla/tallaAnotada, comprarIntro, refDirectaIntro, datos, cierre del pedido | 7, 12, F6 |

Previos del loop general (también OFF por defecto): `BOT_ROBUSTEZ` (asistente a
mitad de flujo), `BOT_CLASIF_V2` (few-shot clasificador), `BOT_DISPATCH_V2` (sin
dead-ends), `BOT_MARCA_NORM` (typos de marca), `BOT_DATOS_V2` (valida envío),
`BOT_TALLAS_V2` (tallas: plurales, 9.5 US, pie en cm), `BOT_FOTO_ASESOR` (foto de
un modelo → asesor con reenvío al 320).

## Orden de encendido sugerido (progresivo; también puedes encender todo junto)

1. **Comprensión (base IA):** `BOT_ROBUSTEZ` + `BOT_CLASIF_V2` + `BOT_DISPATCH_V2`
   + `BOT_MARCA_NORM`.
2. **Fluidez:** `BOT_FLUIDEZ_RECONDUCE` + `BOT_FLUIDEZ_CATALOGO` + `BOT_FLUIDEZ_ACUSE`.
3. **Venta:** `BOT_TEXTOS_V2` + `BOT_ASISTENTE_V2` + `BOT_FOTO_ASESOR`.
4. **Captura fina:** `BOT_DATOS_V2` + `BOT_TALLAS_V2`.

## Prueba rápida desde tu 320 (5 min, tras encender)
1. "hola" → bienvenida cálida + categorías. Elige una categoría → 3 fotos + 1 lista.
2. Elige una ref → UNA burbuja con ficha + pregunta de talla.
3. Escribe "mmm no sé" dos veces → la 2ª debe ser la variante breve con salidas.
4. "¿tienen nike?" a mitad del pedido → fotos de nike.
5. "quiero la Ref 06" a mitad del pedido → cambia la ficha.
6. Talla → datos con tu ciudad → el bloque de pago debe nombrarla.
7. Manda una foto de un tenis SIN pedido en curso → respuesta de asesor + te llega
   la foto reenviada al 320.
8. Manda una *nota de voz* → "Por aquí te leo mejor 🙌 ¿me lo escribes?" (y el
   pedido no se pierde). Escribe "Puedo llevar 2" en el paso talla → te confirma
   con el 15% por 2 pares.
9. "cancelar" al final para limpiar.

## Si algo se ve raro
Apaga SOLO el flag sospechoso (quita la línea del .env + reinicia n8n) — el resto
sigue funcionando. Detalle por mejora y cómo revertir el código: bitácora
`briefs/BITACORA-MEJORAS.md` (filas F1–F8) y `notas-mejoras/NOTA-FLUIDEZ-*.md`.
