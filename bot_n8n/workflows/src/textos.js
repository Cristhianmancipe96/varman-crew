// ============ TEXTOS DEL BOT (tono de venta) — EDITAR AQUÍ ============
// TODO el texto que ve el cliente (y los avisos al dueño) vive en este archivo.
// Para cambiar el tono o adaptar el bot a OTRO negocio: editar SOLO este
// archivo y regenerar el workflow con:
//   node workflows\build-v4-pedidos.js
// (el build pega este archivo antes del cerebro dentro del nodo Code).
//
// Los {placeholders} entre llaves se reemplazan en tiempo de ejecución
// (p. ej. {ref}, {precio}, {talla}) — conservarlos al editar los textos.
// *asteriscos* = negrilla en WhatsApp. Los emojis son parte del tono.

const TEXTOS = {
  // --- identidad de la marca ---
  marca: 'VarMan Crew',
  telefonoAtencion: '+57 320 225 0619',

  // --- catálogo: lista de categorías ---
  categoriasHeader: 'VarMan Crew 👟',
  categoriasBody: '¡Hola! Bienvenido a *VarMan Crew*. Estos son nuestros estilos. ¿Cuál quieres ver?',
  categoriasFooter: 'Toca «Ver categorías»',
  categoriasBoton: 'Ver categorías',
  categoriasSeccion: 'Categorías',
  categoriasFilaDesc: '{n} modelos disponibles',

  // --- catálogo: título de cada fila en las listas interactivas ---
  modelosFilaTitulo: 'Referencia {ref}',

  // --- catálogo con FOTOS (v5): tanda de imágenes + lista para elegir ---
  // caption de cada foto: {detalle} es la marca si está registrada; si no, la categoría
  fotoCaption: 'Ref {ref} · {detalle} · {precio}',
  fotosIntroCat: '¡Estos son nuestros {categoria}! 👟 Te muestro {n} de {total}:',
  fotosIntroCatTodos: '¡Estos son nuestros {categoria}! 👟',
  fotosIntroMarca: 'Esto es lo que tenemos de *{marca}* 🔥 Te muestro {n} de {total}:',
  fotosIntroMarcaTodos: 'Esto es lo que tenemos de *{marca}* 🔥',
  eligeListaHeader: 'Elige tu referencia',
  eligeListaBody: '¿Cuál te gustó? Toca «{boton}» y elige la referencia para pedirla 👇',
  eligeListaFooter: 'Envíos a todo el país',
  eligeListaBoton: 'Elegir',
  eligeListaSeccion: 'Referencias',
  verMasFila: 'Ver más ➡️',
  verMasFilaDesc: '{n} modelos más',
  // si una foto no se puede mostrar, la referencia va como línea de texto (fallback)
  fotoFallbackLinea: '• *Ref {ref}* · {detalle} · {precio}',
  fotoFallbackIntro: 'Estas referencias también están disponibles (pídeme la que quieras por su número):',

  // --- catálogo nativo de WhatsApp (v6, flag CATALOGO_NATIVO): MPM ---
  mpmHeader: 'VarMan Crew 👟',
  mpmBody: '¡Estos son nuestros {categoria}! Tócalos para ver fotos y detalles 👇',
  mpmFooter: 'Toca un producto o elige tu referencia',

  // --- búsqueda por marca (v5) ---
  marcaSinResultados: 'De *{marca}* no tengo referencias marcadas todavía 🙈, pero mira todo lo que tenemos:',

  // --- catálogo → link de la WEB (flag BOT_CATALOGO_WEB, brief 2026-07-11) ---
  // El bot NO envía catálogo por WhatsApp (la VM de 1 GB se satura con fotos):
  // en TODOS los puntos de catálogo va UN solo mensaje corto con el link y el
  // cliente elige y compra en la página. {url} = catalogoWebUrl (una sola fuente).
  catalogoWebUrl: 'https://varmancrew.com/#catalogo',
  catalogoWebLink: '¡Con gusto! 👟 Mira todo el catálogo con fotos y precios aquí y elige el tuyo:\n{url}\nCualquier cosa, aquí estoy 😊',
  // cola corta del link para cuando el mensaje YA trae otra respuesta delante
  // (p. ej. pregunta_precio con dispatch v2): todo va en UNA sola burbuja.
  catalogoWebLinkCorto: 'Míralo con fotos y precios aquí y elige el tuyo 👇\n{url}',
  // "cancelar" tras recibir el link (sin pedido en curso): se apaga el
  // seguimiento de compra y se despide con calidez, sin hablar de un pedido.
  catalogoWebCancelado: '¡Listo! 👍 Cuando quieras ver el catálogo de nuevo, escríbeme *hola* y te paso el link de una 😊',
  // seguimiento de compra (~2h después de mandar el link, trigger horario):
  // el bot no puede saber si el cliente compró en la web → PREGUNTA, no asume,
  // y se ofrece a ayudar para intentar cerrar la venta. {nombre} = " Juan" o vacío.
  seguimientoCompraWeb: '¡Hola{nombre}! 👟 ¿Pudiste hacer tu compra en la web? Si algo se te complicó o te quedó alguna duda, escríbeme por aquí y con gusto te ayudo a dejar tu pedido listo 😊\n{url}',
  // --- [CATALOGO-WEB v2] bienvenida conversacional (pedido del dueño 07-12) ---
  // el saludo da la BIENVENIDA y espera la pregunta del cliente; el link solo
  // sale cuando pide catálogo / comprar / precio / una marca.
  catalogoWebBienvenida: '¡Hola! Bienvenido a *VarMan Crew* 👟 Cuéntame, ¿qué modelo o marca buscas, o en qué te puedo ayudar?',
  // pregunta de precio sin texto de Gemini: bienvenida + rango (el link corto va aparte en el código)
  catalogoWebPrecioIntro: '¡Hola, bienvenido a *VarMan Crew*! 👟 Manejamos tenis de la *35 a la 45* entre *$235.000* y *$480.000*, ¡con *envío incluido* a todo el país!',
  // pregunta por una MARCA que SÍ tenemos: se le dice cuántos modelos hay y va al link
  catalogoWebMarca: '¡Claro! De *{marca}* tenemos {n} {palabraModelos} 🔥 Míralos con fotos y precios aquí y elige el tuyo:\n{url}\nDesde la página lo pides de una 😊',
  // marca que NO tenemos: honestidad + link + puerta al asesor (nunca se inventa)
  catalogoWebMarcaSin: 'De *{marca}* no tengo referencias marcadas todavía 🙈, pero mira todo lo que tenemos con fotos y precios aquí:\n{url}\nY si buscas un modelo puntual, cuéntame (o mándame una foto) y un asesor te confirma si te lo conseguimos 📲',
  // pidió una referencia que no existe en el catálogo: honestidad + link + asesor
  catalogoWebRefNoEncontrada: 'Esa referencia no la encuentro en el catálogo 🙈 Mira los modelos disponibles con fotos y precios aquí:\n{url}\nY si buscas algo puntual, cuéntame y un asesor te confirma 📲',

  // --- [E1] modelo que no tenemos → pasar al asesor (flag BOT_FOTO_ASESOR) ---
  // el cliente manda la FOTO del modelo exacto sin pedido en curso (BANCO §3):
  // honestidad + un asesor confirma; la foto se reenvía al 320 por su media_id.
  fotoAsesorCliente: '¡Qué buen modelo! 🔥 Esas puntuales no las tengo ahorita 🙈. Ya le pasé tu foto a un asesor para confirmar si te las conseguimos; en un momento te escriben 📲.',
  fotoAsesorAvisoDueno: '📸 *Cliente busca un modelo (mandó foto; te la reenvío aparte)*\n\nNombre: {cliente}\nWhatsApp: +{wa}\n\nLe dije que un asesor le confirma si lo conseguimos.',
  fotoAsesorFotoCaption: 'Modelo que busca {cliente} (+{wa})',
  // insiste por una marca que quedó sin resultados ("las quiero sí o sí" o
  // vuelve a preguntar por la misma): no repetir el catálogo, pasar al asesor.
  marcaAsesorCliente: 'Esas puntuales no las tengo ahorita 🙈. Ya le pasé el dato a un asesor para confirmar si te las conseguimos; en un momento te escriben 📲.',
  marcaAsesorAvisoDueno: '🔎 *Cliente insiste por una marca que no tenemos*\n\nNombre: {cliente}\nWhatsApp: +{wa}\nMarca: {marca}\nÚltimo mensaje: "{texto}"',

  // --- ref directa desde la web (v5) ---
  refDirectaIntro: '¡Esa está buenísima! 🔥 Aquí te la muestro:',

  // --- flujo de pedido ---
  // (v5, DEPRECADO en v6: reemplazado por fichaCaption + pedirTalla en arrancarPedido)
  eligeReferencia: '¡Buena elección! 🔥\n\nLa *Referencia {ref}* cuesta *{precio}*.\n\n¿Qué talla buscas? Escríbeme el número (manejamos de la 35 a la 45). Si quieres empezar de nuevo, escribe *cancelar*.',
  // v6: ficha al elegir una referencia (de la lista) o al llegar con la ref
  // prellenada (web/anuncios). Foto grande + info completa en un solo mensaje.
  // {info} = marca · categoría · tag (lo que tenga la referencia en el catálogo).
  fichaCaption: '👟 *Ref {ref}*\n{info}\n💵 *{precio}*',
  // [F7] versión corta de la pregunta de talla para ir DENTRO del caption de la
  // ficha (flag BOT_FLUIDEZ_CATALOGO: arranque del pedido en UNA burbuja).
  pedirTallaCorta: '¿Qué *talla* calzas? (de la *35 a la 45*) 👟',
  pedirTalla: '¡Buena elección! 🔥\n\n¿Qué *talla* buscas? Escríbeme el número (manejamos de la *35 a la 45*) 👟.\n\nSi quieres cambiar de referencia o empezar de nuevo, escribe *cancelar*.',
  refNoEncontrada: 'No encontré esa referencia 😅. Escribe *hola* para ver el catálogo de nuevo.',
  tallaAnotada: '¡Talla {talla} anotada! ✅\n\nAhora regálame en un solo mensaje los datos de envío:\n\n*Nombre completo*\n*Dirección*\n*Ciudad*\n*Teléfono de contacto*',
  // cuando el cliente da la talla en nacional/US y la convertimos a europea
  tallaConvertida: '¡Listo! Esa equivale a la *talla {talla}* europea 👟 (la que manejamos). ¡Anotada! ✅\n\nAhora regálame en un solo mensaje los datos de envío:\n\n*Nombre completo*\n*Dirección*\n*Ciudad*\n*Teléfono de contacto*',
  // talla en nacional/US pero sin género: lo pedimos para convertir bien (la
  // conversión cambia según sea hombre o mujer)
  pedirGeneroTalla: 'Para darte la talla europea exacta 👟, dime: esa *{num} {sistema}* ¿es para *hombre* o para *mujer*?',
  // [D1] v2 (flag BOT_TALLAS_V2): el cliente dio el LARGO DEL PIE en cm (p. ej.
  // tras el tip de medición del asistente). La conversión es aproximada y la
  // hace el CÓDIGO; el flujo sigue igual que tallaConvertida (pide los datos).
  tallaDesdeCm: '¡Perfecto! 📏 Esa medida corresponde aprox. a la *talla {talla}* europea 👟 ¡Anotada! ✅\n\nAhora regálame en un solo mensaje los datos de envío:\n\n*Nombre completo*\n*Dirección*\n*Ciudad*\n*Teléfono de contacto*',
  pedirGenero: 'Solo dime si es para *hombre* o para *mujer* 👤 y te confirmo la talla europea 👟.',
  tallaInvalida: 'Manejamos tallas de la *35 a la 45* 👟. Escríbeme solo el número (ej: *40*). Si la usas *nacional* o *US*, dime cuál y para *hombre o mujer* y te confirmo la europea. O escribe *cancelar* para empezar de nuevo.',
  datosIncompletos: 'Creo que faltan datos 🙈. Mándame en un solo mensaje: *nombre completo, dirección, ciudad y teléfono*.',
  // D3 (flag BOT_DATOS_V2): dice EXACTAMENTE qué falta
  datosFaltan: 'Casi listo 🙌 Para el envío me falta: *{faltan}*. Regálame todo en un solo mensaje: *nombre completo, dirección, ciudad y teléfono*.',
  pedidoCancelado: 'Listo, cancelé el pedido 👍. Cuando quieras retomar, escribe *hola* y te muestro el catálogo.',

  // --- pago ---
  pagoBody: '¡Perfecto! 📦 Tu pedido va quedando listo.\n\nTotal a pagar: *{total}*\n\n¿Cómo prefieres pagar?',
  // [F] acuse datos→pago (flag BOT_FLUIDEZ_ACUSE): si reconocimos la ciudad en
  // los datos, el bloque de pago la menciona (se siente leído, no plantilla) y
  // recuerda el gancho de venta "envío incluido".
  pagoBodyAcuse: '¡Listo! 🙌 Envío a *{ciudad}* anotado 📦\n\nTotal a pagar: *{total}* (envío incluido 🚚)\n\n¿Cómo prefieres pagar?',
  // al tocar el botón del método de pago:
  pagoInstruccionesBoton: 'Pagas por *{metodo}* a este número/llave:\n\n👉 {dato}\n\nTotal: *{total}*\n\nCuando hagas el pago, mándame la *foto del comprobante* aquí mismo 📸 y dejamos tu pedido confirmado.',
  // si escribió el método por texto en vez de tocar el botón:
  pagoInstruccionesTexto: 'Pagas por *{metodo}* a este número/llave:\n\n👉 {dato}\n\nTotal: *{total}*\n\nCuando hagas el pago, mándame la *foto del comprobante* aquí mismo 📸.',
  pideComprobante: 'Cuando puedas, mándame la *foto del comprobante* 📸 para confirmar tu pedido. Si quieres cambiar algo, escribe *cancelar*.',
  // pago con QR (v5): solo si existe la variable PAGO_QR_* del método elegido.
  // Van 3 mensajes: (1) imagen del QR, (2) SOLO el dato para copiar fácil, (3) total + comprobante.
  pagoQrCaption: 'Escanea este QR con tu app de {metodo} y pagas de una 📲',
  pagoQrDatoIntro: 'O si prefieres, este es el número/llave de *{metodo}* (mantenlo presionado para copiarlo):',
  pagoQrCierre: 'Total: *{total}*\n\nCuando hagas el pago, mándame la *foto del comprobante* aquí mismo 📸 y dejamos tu pedido confirmado.',

  // --- pago con Wompi (v6, solo si hay llaves): la lista de métodos ---
  // Solo se usa cuando Wompi está configurado (4 métodos → lista, porque los
  // botones de WhatsApp solo permiten 3). Sin Wompi, el bot usa los 3 botones v5.
  pagoHeader: 'Método de pago 💳',
  pagoFooter: 'Elige el que prefieras',
  pagoBoton: 'Ver métodos',
  pagoSeccion: 'Métodos de pago',
  pagoNequiDesc: 'Manual: te paso el número',
  pagoDaviplataDesc: 'Manual: te paso el número',
  pagoBrebDesc: 'Manual: te paso la llave',
  pagoWompiTitulo: 'Tarjeta o PSE',
  pagoWompiDesc: 'Pago automático con link (también Nequi)',
  // contra entrega (v6.3, SOLO Bogotá): alista el pedido sin pago anticipado ni
  // comprobante; el cliente paga al recibir. La opción solo se ofrece si los
  // datos de envío indican Bogotá.
  pagoContraentregaTitulo: 'Contra entrega',
  pagoContraentregaDesc: 'Pagas al recibir (solo Bogotá)',
  contraentregaCliente: '¡Listo! 🛵 Tu pedido de la *Ref {ref}* queda con *pago contra entrega* en Bogotá por *{total}*. Lo alistamos y coordinamos la entrega contigo; pagas cuando lo recibas. ¡Gracias por comprar en VarMan Crew! 👟',
  contraentregaAvisoDueno: '🛵 *NUEVO PEDIDO (CONTRA ENTREGA · Bogotá)*\n\nRef: {ref} · Talla {talla} · Cantidad: {cantidad}\nTotal a cobrar al entregar: {total}\nCliente: {cliente} · +{wa}\nEnvío: {envio}\n\nAlistar y coordinar la entrega. Pedido: {ruta}',
  contraentregaSoloBogota: 'El *pago contra entrega* lo manejamos solo en *Bogotá* 🛵. Para tu ciudad el envío va con pago anticipado 👇',
  // link de pago Wompi
  wompiLinkNombre: 'VarMan Crew · Ref {ref}',
  wompiLinkDesc: 'Pedido Ref {ref} talla {talla} en VarMan Crew',
  wompiLinkCliente: '¡Listo! 💳 Te comparto un *link de pago seguro por Wompi* para que pagues con tarjeta, PSE o Nequi por *{total}*:\n\n👉 {url}\n\nApenas se acredite el pago, tu pedido queda *confirmado automáticamente* y te avisamos por aquí 🎉. Si prefieres otro medio, escribe *cancelar* y volvemos a empezar.',
  wompiAvisoDueno: '🛒 *NUEVO PEDIDO (link Wompi enviado, pago pendiente)*\n\nRef: {ref} · Talla {talla} · Cantidad: {cantidad}\nTotal: {total} por Wompi\nCliente: {cliente} · +{wa}\n\nSe confirmará solo cuando el cliente pague (webhook). Pedido guardado: {ruta}',
  wompiConfirmadoDueno: '✅ *PAGO CONFIRMADO (Wompi)*\n\nRef: {ref} · Talla {talla}{genero}\nTotal: {total}\nCliente: {cliente} · +{wa}\n\nYa puedes alistar el envío. Pedido: {ruta}',
  // mensaje de tranquilidad al CLIENTE cuando el webhook confirma el pago
  wompiConfirmadoCliente: '¡Pago confirmado! ✅🎉\n\nYa recibimos tu pago de la *Ref {ref}* (talla {talla}{genero}) y estamos *alistando tu pedido* con todo el cuidado 📦. Va empacado en su *caja original* y bien protegido para el envío.\n\nApenas salga te compartimos por aquí la *guía de rastreo* para que sigas tu paquete. ¡Gracias por confiar en VarMan Crew! 👟🧡',
  wompiFallo: 'Uy, no pude generar el link de pago en este momento 🙈. Puedes pagar por otro medio 👇',

  // --- [NOMBRE-MODELO] (flag BOT_NOMBRE_MODELO): versiones que muestran el ---
  // NOMBRE del modelo (la marca que se registra desde la app de VarMan) en vez
  // de "Ref NN" en los mensajes al CLIENTE. La ref sigue viajando por dentro
  // (pedido en Firestore, avisos al 320) — solo cambia lo que VE el cliente.
  // Si la ref no tiene marca registrada, el bot cae a los textos de hoy.
  pedidoRecibidoModelo: '¡Pedido recibido! 🎉\n\n*{modelo}* · Talla {talla} · {total}\n\nVamos a verificar tu pago y te confirmamos el envío por aquí mismo. ¡Gracias por comprar en VarMan Crew! 👟',
  contraentregaClienteModelo: '¡Listo! 🛵 Tu pedido de *{modelo}* queda con *pago contra entrega* en Bogotá por *{total}*. Lo alistamos y coordinamos la entrega contigo; pagas cuando lo recibas. ¡Gracias por comprar en VarMan Crew! 👟',
  estadoPedidoInfoModelo: '📦 Tu último pedido:\n\n*{modelo}* · Talla {talla} · {total}\nHecho el {fecha}\n\nEstado: *{estado}*\n\n{explicacion}',
  wompiConfirmadoClienteModelo: '¡Pago confirmado! ✅🎉\n\nYa recibimos tu pago de tus *{modelo}* (talla {talla}{genero}) y estamos *alistando tu pedido* con todo el cuidado 📦. Va empacado en su *caja original* y bien protegido para el envío.\n\nApenas salga te compartimos por aquí la *guía de rastreo* para que sigas tu paquete. ¡Gracias por confiar en VarMan Crew! 👟🧡',

  // --- cierre del pedido ---
  pedidoRecibido: '¡Pedido recibido! 🎉\n\n*Referencia {ref}* · Talla {talla} · {total}\n\nVamos a verificar tu pago y te confirmamos el envío por aquí mismo. ¡Gracias por comprar en VarMan Crew! 👟',
  // {externa} = '' o la línea de avisoExternaLinea (si la ref viene de bodega externa)
  avisoPedidoDueno: '🛒 *NUEVO PEDIDO (por verificar)*\n\nRef: {ref} · Talla {talla} · Cantidad: {cantidad}{externa}\nTotal: {total} por {metodo}\nCliente: {cliente} · +{wa}\nEnvío: {envio}\n\n{comprobante}\nPedido guardado: {ruta}',
  // nota de cantidad al arrancar el pedido si el cliente pidió más de un par
  cantidadNota: '¡De una, *{cantidad} pares*! 🙌 El total sería *{total}*.',
  avisoExternaLinea: '\n🏭 *Ref EXTERNA* — proveedor: {proveedor} (verificar disponibilidad antes de aprobar)',
  avisoComprobanteOk: '📎 Comprobante guardado (visible en la app).',
  avisoComprobanteFallo: '📎 Comprobante en el chat del cliente (no se pudo descargar).',

  // --- carrito abandonado (v5, backlog 10 — UN solo recordatorio por sesión) ---
  // {nombre} llega como " Juan" o vacío (se arma en código por si no hay perfil)
  carritoAbandonado: '¡Hola{nombre}! 👟 Vi que dejaste tu pedido de la *Ref {ref}* talla {talla} a medias. ¿Te ayudo a terminarlo? El total sería *{total}*. Si ya no lo quieres, todo bien — escríbeme *cancelar* y listo.',
  carritoAbandonadoSinTalla: '¡Hola{nombre}! 👟 Vi que dejaste tu pedido de la *Ref {ref}* a medias. ¿Te ayudo a terminarlo? El total sería *{total}*. Si ya no lo quieres, todo bien — escríbeme *cancelar* y listo.',

  // --- reseña post-entrega (v5, backlog 11 — la dispara la app al pasar a entregado) ---
  // {nombre} llega como ", Juan" o vacío
  resenaPedido: '¡Gracias por tu compra{nombre}! 🙌 Esperamos que tus {producto} te encanten.\n\n¿Nos regalas una reseña? Nos ayuda un montón 🧡 → {link}',

  // --- guía de envío (v5, backlog 12 — la dispara la app al guardar la guía) ---
  guiaEnvio: '📦 ¡Tu pedido va en camino!\n\nTransportadora: *{transportadora}*\nGuía: *{guia}*\n\nCualquier cosa nos escribes por aquí 😊',

  // --- lista de espera de stock (v5, backlog 13) ---
  listaEsperaOk: '¡Listo! 📝 Te anoto para avisarte cuando llegue la *Ref {ref}*{talla}. Apenas la tengamos te escribimos por aquí 🙌',
  listaEsperaTallaParte: ' en talla {talla}',
  listaEsperaFaltaRef: '¡Claro que te avisamos! 😊 Solo dime de cuál referencia: escríbeme por ejemplo *"avísame de la ref 05 talla 40"*.',

  // --- [F] fluidez: cambio de modelo a MITAD de pedido (BOT_FLUIDEZ_RECONDUCE) ---
  // casos reales 1 y 3 de CONVERSACIONES-INCOMODAS: hoy el bot repite la
  // plantilla del paso; con el flag responde lo pedido y reencamina.
  cambioRefIntro: '¡Claro que sí! 😊 Cambiamos tu pedido a esta 👇',
  cambioModeloIntro: '¡Claro que sí! 😊 Mira el catálogo y elige el modelo que más te guste 👇',
  // --- [F] anti-repetición (BOT_FLUIDEZ_RECONDUCE): desde la 2ª vez seguida ---
  // que un paso repetiría su plantilla, va una variante BREVE con salidas
  // claras ("catálogo" reencamina, "asesor" hace handoff de verdad).
  reintentoTalla: 'Sigo aquí 🙌 Solo necesito tu *talla* (35 a la 45) 👟. Si prefieres, escribe *catálogo* para ver otros modelos o *asesor* y te atiende una persona.',
  reintentoDatos: 'Para enviarte tu pedido solo me falta en un mensaje: *nombre, dirección, ciudad y teléfono* 🙌 O escribe *asesor* y te ayuda una persona.',
  reintentoPago: 'Elige el método de pago en los botones de arriba 👆 o escribe *asesor* si prefieres que te atienda una persona 🙌',
  reintentoComprobante: 'Apenas tengas la *foto del comprobante* me la mandas por aquí 📸 Si algo se complicó, escribe *asesor* y te ayudamos.',
  // --- [F] "puedo llevar 2" sin la palabra "pares" (caso real 3, BANCO §8) ---
  // cantidad ambigua: se confirma con el gancho del 15% por 2 pares, guiando al
  // formato "2 pares" que el bot entiende; NO se adivina ni se pierde el paso.
  cantidadPregunta: '¡Claro que sí! 🙌 Puedes llevar los pares que quieras — y si llevas *2 pares* te dejo un *15% en todo el pedido* 🔥 Escríbeme *"2 pares"* y te lo anoto.',
  // --- [F] nota de voz / video / sticker (BOT_FLUIDEZ_RECONDUCE) ---
  // el bot no puede escucharlos; en vez del catálogo o la plantilla del paso
  // (hoy), pide el mensaje por texto con calidez. La sesión no se toca.
  mediaNoSoportado: 'Por aquí te leo mejor 🙌 ¿Me lo escribes en un mensajito de texto? Así te ayudo de una 😊',

  // --- handoff a humano ---
  handoffCliente: '¡Claro! Ya le avisé a nuestro equipo 😊. En un momento te escriben desde el +57 320 225 0619.',
  handoffAvisoDueno: '🔔 *Cliente pide atención humana*\n\nNombre: {cliente}\nWhatsApp: +{wa}\nÚltimo mensaje: "{texto}"',

  // --- respuestas generales ---
  otroDefault: 'Con gusto te ayudamos 😊. ¿Quieres ver el catálogo? Escribe *hola* o dime qué necesitas.',
  comprarIntro: 'Mira nuestro catálogo y toca el modelo que buscas 👇',
  // pregunta de precio (flag BOT_DISPATCH_V2): rango de precios cuando el
  // clasificador dice pregunta_precio pero Gemini no dio texto propio.
  precioInfo: 'En *VarMan Crew* manejamos tenis de la *35 a la 45* entre *$235.000* y *$480.000*, ¡con *envío incluido* a todo el país! 👟',
  precioCatalogo: 'Mira el catálogo y elige el que más te guste 👇',
  botPausado: '¡Hola! 🙌 En este momento te estamos atendiendo en persona. Ya te escribimos por aquí en un momento, gracias por la paciencia.',
  errorTecnico: 'Ups, tuvimos un problemita técnico 🙈. Escríbeme *hola* en un momento y seguimos, o si es urgente te atendemos en el +57 320 225 0619.',

  // --- "¿cómo va mi pedido?" (v5) ---
  estadoPedidoInfo: '📦 Tu último pedido:\n\n*Referencia {ref}* · Talla {talla} · {total}\nHecho el {fecha}\n\nEstado: *{estado}*\n\n{explicacion}',
  estadoSinPedidos: 'No encontré pedidos tuyos por aquí 🙈. Si quieres hacer uno, escribe *hola* y te muestro el catálogo 👟.',
  // qué significa cada estado, en palabras del cliente
  estadoExpl_pagado_por_verificar: 'Estamos verificando tu pago; apenas lo confirmemos te avisamos por aquí ✅',
  // v6 (Wompi): pago por link automático
  estadoExpl_pago_pendiente: 'Te enviamos un link de pago; apenas lo pagues, tu pedido se confirma solo y te avisamos ✅',
  estadoExpl_pago_confirmado: '¡Pago confirmado! Estamos alistando tu envío 📦',
  estadoExpl_verificado: '¡Pago confirmado! Estamos alistando tu envío 📦',
  estadoExpl_enviado: '¡Va en camino! 🚚 Pronto te llega.',
  estadoExpl_entregado: 'Ya fue entregado 🎉 ¡Gracias por comprar en VarMan Crew!',
  estadoExpl_cancelado: 'Este pedido quedó cancelado. Si fue un error, escríbenos al +57 320 225 0619.',
  estadoExpl_default: 'Cualquier duda extra te atendemos en el +57 320 225 0619 😊.',

  // --- anti-spam (v5): se envía UNA sola vez al pasarse del límite ---
  antiSpamAviso: 'Me estás escribiendo muy rapidito 🙈 Dame un momentico y seguimos, ¿va?',

  // --- resumen diario al dueño (v5, sale con el barrido de las 3:15am) ---
  resumenDiarioTitulo: '📊 *Resumen VarMan Bot* · {fecha}\n\n💬 Conversaciones (24h): *{conversaciones}*\n🛒 Pedidos nuevos (24h): *{pedidos}*\n{lineasPedidos}\n⚠️ Errores del bot (24h): *{errores}*{lineasErrores}\n\n🧹 Sesiones limpiadas: {sesiones}',
  resumenLineaPedido: '  • Ref {ref} · Talla {talla} · {total} · {estado}\n',
  resumenSinPedidos: '  (ninguno)\n',
  resumenLineaError: '\n  • {origen}: {error}',

  // --- comandos admin (mensajes al dueño / 320) ---
  adminSinPendientes: '📋 No hay pedidos pendientes ahora mismo 🎉',
  adminListaTitulo: '📋 *Últimos {n} pedidos pendientes*\n\n{lineas}',
  adminPausado: '⏸ Bot en *mantenimiento*. A los clientes les responderé: «ya te escribimos». Escribe *activar* para reactivarlo.',
  adminActivo: '▶️ Bot *activo* de nuevo. Los clientes vuelven al flujo normal.',
  adminAyuda: '🛠 *Comandos admin*\n• *pedidos* — últimos 5 pendientes\n• *pausar* — bot en mantenimiento\n• *activar* — reactivar el bot\n\nCualquier otro mensaje tuyo pasa por el flujo normal de cliente (sirve para probar el bot).',

  // --- robustez conversacional (v6, flag BOT_ROBUSTEZ) ---
  // Descripción del paso actual que se le pasa al asistente Gemini para que
  // entienda qué dato se estaba pidiendo cuando el cliente responde libre.
  pasoTalla: 'el bot le pidió al cliente la TALLA (un número del 35 al 45 en europeas) del par que quiere pedir; si el cliente da la talla en nacional o US, o no está seguro, hay que confirmar el sistema (nacional/EUR/US) y si es para hombre o mujer',
  pasoDatos: 'el bot le pidió al cliente sus DATOS DE ENVÍO en un solo mensaje (nombre completo, dirección, ciudad y teléfono de contacto)',
  pasoPago: 'el bot le pidió al cliente que ELIGIERA EL MÉTODO DE PAGO (Nequi, Daviplata o Bre-B) tocando un botón',
  pasoComprobante: 'el bot está esperando que el cliente envíe la FOTO DEL COMPROBANTE de pago para confirmar el pedido'
};

// [E2] Textos de venta más cálidos (flag BOT_TEXTOS_V2, apagado por defecto).
// Sobrescribe SOLO estos textos cuando el flag está ON; con OFF, TEXTOS = hoy.
// Tono del BANCO: colombiano cálido, sin mexicanismos, calidad 1.1 en positivo.
// (Conserva los {placeholders} y las palabras clave que el flujo/tests esperan.)
if (/^(on|1|true|si|s[ií])$/i.test(String($env.BOT_TEXTOS_V2 || '').trim())) {
  TEXTOS.pedirTalla = '¡Excelente elección! 🔥 ¿Qué *talla* calzas? Escríbeme el número (manejamos de la *35 a la 45*) 👟. Si la usas *nacional* o *US*, dime cuál y te confirmo la europea. Para cambiar de referencia, escribe *cancelar*.';
  TEXTOS.tallaAnotada = '¡Perfecto, *talla {talla}* anotada! ✅ Ya casi 🙌 Regálame en un solo mensaje: *Nombre completo · Dirección · Ciudad · Teléfono de contacto* y alistamos tu pedido 📦.';
  // [E2b] bienvenida (BANCO §1, adaptada a la lista de categorías: invita a
  // escribir la MARCA — funciona siempre — y no a mandar foto, para no
  // acoplarla al flag BOT_FOTO_ASESOR) y cierre del pedido con los ganchos de
  // confianza del BANCO §12-13 (caja original, guía de rastreo). Conserva
  // "Pedido recibido" y los {placeholders} que el flujo y los tests esperan.
  TEXTOS.categoriasBody = '¡Hola! Bienvenido a *VarMan Crew* 👟 Cuéntame, ¿qué modelo tienes en la mira? Escríbeme la *marca* que buscas, o mira nuestros estilos aquí abajo 👇';
  TEXTOS.pedidoRecibido = '¡Pedido recibido! 🎉\n\n*Referencia {ref}* · Talla {talla} · {total}\n\nApenas confirmemos tu pago, alistamos tu pedido *en su caja original y bien protegido* 📦 y te paso la *guía de rastreo* por aquí. ¡Gracias por confiar en VarMan Crew! 👟🧡';
  // [NOMBRE-MODELO] la variante con nombre del modelo hereda el mismo tono v2
  TEXTOS.pedidoRecibidoModelo = '¡Pedido recibido! 🎉\n\n*{modelo}* · Talla {talla} · {total}\n\nApenas confirmemos tu pago, alistamos tu pedido *en su caja original y bien protegido* 📦 y te paso la *guía de rastreo* por aquí. ¡Gracias por confiar en VarMan Crew! 👟🧡';
  // [F6] textos de venta con CTA de cierre (resto del ítem E2b): intención de
  // compra, ref directa de la web y re-pedido de datos — siempre UNA pregunta
  // clara y empuje suave a cerrar ("te lo aparto / lo dejamos listo").
  TEXTOS.comprarIntro = '¡De una! 🔥 Mira el catálogo y toca el modelo que te gustó — te lo aparto de una vez 👇';
  TEXTOS.refDirectaIntro = '¡Esa está buenísima! 🔥 Mírala, y si te gusta la apartamos de una 👇';
  TEXTOS.datosIncompletos = 'Ya casi 🙌 Regálame en un solo mensaje: *Nombre completo · Dirección · Ciudad · Teléfono* y dejamos tu pedido listo 📦.';
  TEXTOS.datosFaltan = 'Ya casi 🙌 Solo me falta: *{faltan}*. Mándamelo y dejamos tu pedido listo 📦.';
}

// Prompt de sistema para Gemini (clasificador de intenciones). También es
// "tono de marca": menciona el negocio, el rango de precios y los medios de pago.
const GEMINI_SISTEMA = 'Eres el clasificador de intenciones del bot de WhatsApp de VarMan Crew, una tienda colombiana de zapatos (tenis/sneakers). Analiza el mensaje del cliente y responde SOLO un JSON valido (sin markdown) con esta forma: {"intent":"<una de: saludo|ver_catalogo|buscar_marca|pregunta_precio|comprar|estado_pedido|aviso_stock|hablar_humano|otro>","respuesta":"<respuesta corta y calida en español colombiano, tono vendedor amable, max 2 frases, puede usar 1 emoji>","marca":"<solo si intent es buscar_marca: la marca normalizada en minusculas, corrigiendo ortografia (ej: addidas/las adidas -> adidas, naik -> nike); si no aplica, cadena vacia>","ref":"<solo si intent es aviso_stock y el cliente menciono una referencia: el numero de referencia con 2 digitos (ej: 05); si no, cadena vacia>","talla":"<solo si intent es aviso_stock y el cliente menciono una talla: el numero (ej: 40); si no, cadena vacia>"} Reglas: "saludo": saludos o inicios de conversacion, la respuesta da la bienvenida a VarMan Crew. "ver_catalogo": pide ver zapatos, modelos, catalogo o fotos en general. "buscar_marca": menciona o pregunta por una marca concreta de tenis (adidas, nike, jordan, new balance, puma, reebok, converse, vans, timberland, louis vuitton, etc.), aunque la escriba mal; ademas de la respuesta, devuelve la marca normalizada en el campo "marca". "pregunta_precio": pregunta precios en general o de una categoria. "comprar": ya quiere comprar o pedir algo concreto; si pregunta si puede llevar/comprar VARIOS PARES o cantidades, tambien es "comprar" y en la respuesta dile que SI se puede, con gusto, y que elija la(s) referencia(s). "estado_pedido": pregunta como va, donde esta o cuando llega un pedido/compra que ya hizo. "aviso_stock": pide que le avisen cuando llegue, vuelva o haya de nuevo una talla o referencia agotada; extrae ref y talla si las menciona. "hablar_humano": pide hablar con una persona, asesor o el dueño. "otro": nada de lo anterior (quejas, dudas de envio/pago/producto, etc.), da una respuesta util y ofrece ver el catalogo o hablar con un asesor. CONTEXTO DE LA TIENDA (usalo para responder dudas): tenis de calidad 1.1 (alta gama, lucen espectaculares y aguantan el uso diario). Si preguntan si son originales, responde EN POSITIVO destacando la calidad 1.1 y el precio, SIN repetir que "no son originales" y SIN afirmar que son originales de marca. Tallas de la 35 a la 45 (europeas). Precios entre $235.000 y $480.000 COP con envio incluido. Envios a todo Colombia: 1 a 3 dias habiles en ciudades principales, 2 a 5 en zonas alejadas; si el pago entra antes del mediodia se despacha el mismo dia. Pago contra entrega SOLO en Bogota. Pagos por Nequi/Daviplata/Bre-B o link seguro por Wompi. Somos tienda virtual (sin punto fisico). DESCUENTOS: si piden rebaja puedes ofrecer hasta 10% dando una razon (primera compra, pago hoy, seguir en redes), y 15% si llevan 2 pares; nunca mas de eso. TONO: colombiano calido y cercano, SIN mexicanismos (no uses "te late", "orale", "chido", "que onda"); usa expresiones como "de una", "con gusto", "quedas pilas", "cual te gusta".';

// Clasificador v2 (flag BOT_CLASIF_V2): el MISMO prompt v1 + un bloque de
// ejemplos few-shot (sacados de los casos reales del BANCO). Los ejemplos anclan
// el tono colombiano sin mexicanismos y los casos difíciles: "¿son originales?"
// (calidad 1.1 EN POSITIVO, sin negar ni afirmar autenticidad), "¿tienen Jordan?"
// (buscar_marca), "¿cuánto valen?" (pregunta_precio) y multi-intención (marca +
// precio). Mantiene EXACTA la forma del JSON. Apagado por defecto: con el flag
// OFF el clasificador usa GEMINI_SISTEMA (v1) idéntico a hoy.
const GEMINI_SISTEMA_FEWSHOT = GEMINI_SISTEMA
  + ' EJEMPLOS (few-shot; imita el estilo y respeta EXACTA la forma del JSON, no copies el texto literal):'
  + ' Cliente: "hola buenas" -> {"intent":"saludo","respuesta":"¡Hola! Bienvenido a VarMan Crew 👟 ¿Qué estilo andas buscando?","marca":"","ref":"","talla":""}.'
  + ' Cliente: "esos si son originales?" -> {"intent":"otro","respuesta":"Son calidad 1.1, alta gama: lucen espectaculares y aguantan el uso diario, a muy buen precio 🔥 ¿Te muestro el catálogo?","marca":"","ref":"","talla":""}.'
  + ' Cliente: "tienen Jordan?" -> {"intent":"buscar_marca","respuesta":"¡Claro que sí! Mira las Jordan que tenemos 🔥","marca":"jordan","ref":"","talla":""}.'
  + ' Cliente: "a cuánto valen?" -> {"intent":"pregunta_precio","respuesta":"Van entre $235.000 y $480.000 con envío incluido 👟 ¿Te muestro el catálogo?","marca":"","ref":"","talla":""}.'
  + ' Cliente: "buenas, tienen adidas y a cómo?" -> {"intent":"buscar_marca","respuesta":"¡De una! Te muestro las Adidas; van entre $235.000 y $480.000 con envío incluido 🔥","marca":"adidas","ref":"","talla":""}.'
  + ' Cliente: "me avisan cuando llegue la 40 de la ref 05?" -> {"intent":"aviso_stock","respuesta":"¡Claro! Te aviso apenas llegue 🙌","marca":"","ref":"05","talla":"40"}.';

// Prompt de sistema para el ASISTENTE conversacional (v6, flag BOT_ROBUSTEZ).
// A diferencia de GEMINI_SISTEMA (clasificador cuando NO hay pedido en curso),
// este corre cuando el bot YA está esperando un dato (talla, envío, pago…) y el
// cliente responde en lenguaje libre. Devuelve: si quiere un humano (handoff),
// el dato pedido si lo dio, y una respuesta cálida para preguntas extra o para
// guiar cuando el dato es incorrecto/fuera de lugar.
const GEMINI_ASISTENTE = 'Eres el asistente conversacional del bot de WhatsApp de VarMan Crew, una tienda colombiana de tenis/sneakers. El bot está en medio de un pedido y le pidió un dato al cliente, pero el cliente puede responder en lenguaje libre. Te doy el paso actual y el mensaje del cliente. Responde SOLO un JSON valido (sin markdown) con esta forma: {"handoff": true|false, "dato": "<el dato que pedia el paso si el cliente lo dio, si no cadena vacia>", "respuesta": "<mensaje corto y calido en español colombiano, tono vendedor amable, max 2 frases, max 1 emoji, o cadena vacia>"} Reglas: 1) handoff=true SOLO si el cliente pide claramente hablar con una persona/asesor/humano/dueño, o dice que el bot no le entiende y quiere atencion humana (ej: "quiero hablar con alguien", "me pasas un asesor", "una persona real", "no me estas entendiendo"); en ese caso deja "dato" y "respuesta" vacios. 2) Si el cliente DA el dato que pedia el paso, ponlo en "dato". En el paso de talla, pon el numero 35-45 en "dato" SOLO si el cliente dice que ESA es su talla (ej. "uso la 40", "calzo 38", "la 42"); OJO: si solo PREGUNTA si tienen o hay una talla ("¿tienen la 35?", "¿hay 42?", "manejan la 39?") eso NO es su talla -> deja "dato" vacio y respondele la pregunta en "respuesta". En datos de envio, el "dato" es nombre+direccion+ciudad+telefono. Si ADEMAS de dar el dato pregunta o comenta algo extra (envios, precios, materiales, colores, tiempos), responde ESO breve en "respuesta"; si solo dio el dato sin nada mas, deja "respuesta" vacia. 3) Si el cliente NO da el dato pedido o responde algo fuera de lugar (ej: le piden la talla y dice "no se mi talla", "el rojo", o hace una pregunta), deja "dato" vacio y en "respuesta" ayudalo o aclara con calidez y reencaminalo al dato pedido (ej: si no sabe su talla, dale un tip para medirla y pidele el numero; nunca repitas seco la misma pregunta como robot). Contexto: tallas de la 35 a la 45 (europeas); si el cliente da la talla en nacional o US, conviertela (nacional a europea: dama +1, hombre +2; ej. 39 nacional hombre = 41 europea) o confirma el sistema y el genero antes de fijarla. Tenis calidad 1.1 (si preguntan si son originales, destaca la calidad 1.1 y el precio en positivo, SIN decir que no son originales y SIN afirmar que son originales de marca). Precios entre $235.000 y $480.000 COP con envio incluido. Envios a todo Colombia: 1 a 3 dias habiles en principales, 2 a 5 en alejadas. Pago contra entrega SOLO en Bogota. Pagos por Nequi/Daviplata/Bre-B o link seguro por Wompi. Tienda virtual (sin punto fisico). Descuentos: hasta 10% con razon, 15% por 2 pares. Tono colombiano SIN mexicanismos. No inventes datos que no sabes (ej. si una talla puntual hay en stock): ofrece que un asesor lo confirma.';

// Asistente v2 (flag BOT_ASISTENTE_V2): el MISMO prompt del asistente + reglas
// de VENTA y de mensajes INCOHERENTES (mandato del dueño: fluidez aunque el
// cliente escriba cosas sin sentido, y cerrar la venta). Mantiene EXACTA la
// forma del JSON {handoff,dato,respuesta}. Apagado por defecto: OFF = v1 de hoy.
const GEMINI_ASISTENTE_V2 = GEMINI_ASISTENTE
  + ' REGLAS DE VENTA (v2): 1) Responde PRIMERO lo que el cliente pregunto (UNA idea, maximo 2 frases) y CIERRA SIEMPRE reencaminando al dato del paso con una mini llamada a la accion corta (ej: "¿Te los aparto?", "¿Seguimos con tu talla?", "¿Me pasas los datos y lo dejamos listo?").'
  + ' 2) Si el mensaje NO tiene sentido o no aporta (letras sueltas, "jajaja", stickers, temas ajenos a la compra), NO regañes ni repitas la misma plantilla: responde UNA linea amable con otra formulacion y vuelve a pedir SOLO el dato del paso.'
  + ' 3) GANCHOS de confianza (usa MAXIMO UN gancho por mensaje y solo cuando encaje; no lo repitas si ya salio): el envio va incluido en el precio; te grabo un video de tu pedido con tu nombre antes de enviarlo; en Bogota hay pago contra entrega; el pago por Wompi es seguro (tarjeta, PSE o Nequi).'
  + ' EJEMPLOS (imita el estilo, respeta EXACTA la forma del JSON): Paso talla, cliente: "jajaja no se q poner" -> {"handoff":false,"dato":"","respuesta":"Tranquilo 😊 dime qué número calzas (de la 35 a la 45) y seguimos con tu pedido."}. Paso pago, cliente: "uy muy caro no?" -> {"handoff":false,"dato":"","respuesta":"El envío ya va incluido en el precio 🙌 y por ser tu primera compra te dejo un 10% si cerramos hoy, ¿elegimos el método de pago?"}. Paso datos, cliente: "y si no me sirven?" -> {"handoff":false,"dato":"","respuesta":"Tranquilo, antes de enviar te grabo un video de tu pedido con tu nombre 📦 ¿Me pasas nombre, dirección, ciudad y teléfono y lo dejamos listo?"}.';

// Reemplaza {placeholders} por sus valores: T(TEXTOS.eligeReferencia, { ref: '05', precio: '$250.000' })
function T(plantilla, vars) {
  return String(plantilla).replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars) ? String(vars[k]) : m);
}

// Arma el payload de WhatsApp de una notificación pendiente (backlog 11-12:
// guía de envío y reseña post-entrega, docs de tiendas/varman/
// notificacionesPendientes que escribe la app). Devuelve null si es una
// reseña y no existe LINK_RESENAS_FB (se omite con registro, nunca rompe).
// Vive AQUÍ porque lo usan DOS nodos (el Cerebro y el trigger horario).
function mensajeDeNotificacion(to, x) {
  if (x.tipo === 'guia') {
    return { messaging_product: 'whatsapp', to, type: 'text', text: {
      body: T(TEXTOS.guiaEnvio, { transportadora: x.transportadora || '?', guia: x.guia || '?' })
    } };
  }
  if (x.tipo === 'resena') {
    const link = String($env.LINK_RESENAS_FB || '').trim();
    if (!link) return null;
    const nombre = String(x.cliente_nombre || '').trim();
    return { messaging_product: 'whatsapp', to, type: 'text', text: {
      body: T(TEXTOS.resenaPedido, {
        nombre: nombre ? ', ' + nombre : '',
        producto: x.producto || ('tenis de la Ref ' + (x.ref || '?')),
        link
      })
    } };
  }
  return null;
}
