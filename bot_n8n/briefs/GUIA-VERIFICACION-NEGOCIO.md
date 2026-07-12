# Guía: Verificación del negocio en Meta (VarMan Crew)

**Para qué sirve:** es lo ÚNICO que falta para publicar la app "VarMan Crew" (App ID 2168913152950288) y que el bot de WhatsApp funcione en producción. Verificada con documentación oficial de Meta (julio 2026).

> ## ⛔ ADVERTENCIA CRÍTICA — LEER PRIMERO
> En la página "Publicar" de la app aparece el portafolio **"VarMan Sneakers and Clothes"** con un botón **"Eliminar"** al lado.
> **NUNCA toques ese botón "Eliminar".** Desconecta el negocio de la app y habría que rehacer la conexión desde cero.
> Los únicos botones que se usan en esta guía son **"Iniciar verificación"** y los de subir documentos.

## Antes de empezar (checklist)
- [ ] Entrar con la cuenta que es **administrador** del portafolio "VarMan Sneakers and Clothes" (ID 166545813059032).
- [ ] Tener **autenticación en dos pasos (2FA)** activada en esa cuenta (Meta la exige al admin que inicia la verificación).
- [ ] Tener a mano en PDF o foto NÍTIDA (escaneo, no foto borrosa):
  - **RUT actualizado** (descargable de la DIAN; si está desactualizado, actualizarlo primero).
  - **Certificado de existencia y representación legal** de la Cámara de Comercio (si hay registro mercantil), expedido hace **menos de 3 meses**.
  - Opcional pero ayuda: recibo de servicios o extracto bancario a nombre del negocio donde se vea **nombre + dirección + teléfono**.
- [ ] Copiar EXACTAMENTE (letra por letra, sin abreviar) el **nombre legal** tal como aparece en el RUT / cámara de comercio, la **dirección** y el **teléfono** que figuran en esos documentos.

## Paso a paso
1. **Abrir el flujo.** Dos caminos válidos (llevan al mismo formulario):
   - Desde la app: developers.facebook.com → app "VarMan Crew" → página **"Publicar"** → botón **"Iniciar verificación"**.
   - Directo: business.facebook.com → **Configuración → Centro de seguridad → Verificación del negocio → "Iniciar verificación"**.
   - Si el botón sale gris: confirmar que la app está conectada al portafolio y que la cuenta tiene 2FA; puede tardar hasta 24 h en habilitarse.
2. **Llenar los datos del negocio.** Nombre legal, dirección, teléfono y sitio web.
   - El nombre legal debe coincidir **carácter por carácter** con el RUT/cámara de comercio (motivo #1 de rechazo).
   - Dirección y teléfono: los mismos que aparecen en los documentos. No usar variantes ("Cra." vs "Carrera" debe ir igual que en el papel).
   - Sitio web: usar la tienda (varmancrew.pages.dev). Debe mostrar el nombre del negocio.
3. **Elegir método de confirmación** (Meta envía un código para probar que el negocio es alcanzable):
   - **Teléfono (SMS, llamada o WhatsApp)** → el más práctico para VarMan; usar un número que se pueda contestar ya mismo.
   - Email con dominio propio → NO aplica si solo hay Gmail (no aceptan correos genéricos como confiables).
   - Verificación de dominio → NO recomendable con subdominios .pages.dev; ignorar esta opción.
4. **Subir documentos.**
   - Para nombre legal: **RUT** o **certificado de cámara de comercio**.
   - Para dirección/teléfono: el documento que los muestre (el certificado de cámara de comercio suele servir para ambos; si no, recibo de servicios o extracto bancario).
   - Legibles, completos (todas las páginas), vigentes, en español (aceptado por Meta).
5. **Ingresar el código de confirmación** que llega por el método elegido y **enviar**.
6. **Esperar.** El estado queda "En revisión". Ver estado en Centro de seguridad. NO reenviar mientras esté en revisión.

## Tiempos típicos
- Aprobación automática: puede ser en **minutos**.
- Lo normal en Latinoamérica: **1 a 3 días hábiles**.
- Máximo oficial: hasta **14 días hábiles**. La respuesta llega por email y notificación en Business Suite.

## Motivos de rechazo más comunes (y cómo evitarlos)
| Motivo | Cómo evitarlo |
|---|---|
| Nombre/dirección/teléfono no coinciden con el documento | Copiar tal cual del RUT/cámara de comercio, sin abreviar ni "corregir" |
| Documento ilegible o incompleto | Escaneo nítido, todas las páginas, PDF de buena calidad |
| Documento vencido o desactualizado | RUT actualizado; certificado de cámara de comercio de <3 meses |
| El documento no muestra dirección/teléfono | Añadir recibo de servicios o extracto bancario que sí los muestre |
| Correo genérico como único contacto | Confirmar por **teléfono/WhatsApp** en vez de email |

**Si rechazan:** leer el motivo exacto en el email de Meta, corregir SOLO eso y reenviar (hay pocos intentos, ~2-3; no reintentar a ciegas).

## Después de aprobada
Volver a la página **"Publicar"** de la app: el requisito de verificación aparecerá cumplido y se podrá pasar la app de modo Desarrollo a **Activo (Live)**. Recordar: no tocar "Eliminar" junto al portafolio, tampoco después de verificar.

---
*Fuentes: developers.facebook.com/docs/development/release/business-verification · Centro de ayuda de Meta para empresas (artículos 2058515294227817 y 1095661473946872) · docs de BSP oficiales (360dialog, respond.io). Julio 2026.*
