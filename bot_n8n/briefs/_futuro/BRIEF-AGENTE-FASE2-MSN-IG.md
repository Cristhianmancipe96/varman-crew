# BRIEF — Agente "Fase 2: Messenger + Instagram" · Bot VarMan Crew

**Fecha:** 5 jul 2026 · **Tipo:** investigación + diseño (NO ejecutar nada)

## Contexto (autocontenido)

VarMan Crew (marca colombiana de calzado) tiene un bot de WhatsApp en n8n
(webhook → parsear → Gemini decide → responder vía Graph API). El dueño quiere que
el MISMO bot atienda también por **Messenger (página de Facebook)** y **DMs de
Instagram**, "dependiendo de por cuál canal le escriban".

Datos claves:
- App de Meta: "VarMan Crew", ID 2168913152950288, conectada al portafolio
  "VarMan Sneakers and Clothes" (id 166545813059032, AÚN SIN verificación de negocio
  — está en proceso). La app está EN MODO DESARROLLO, pendiente de publicar.
- ⚠ REGLA CRÍTICA descubierta hoy: los casos de uso de una app Meta NO SE PUEDEN
  QUITAR una vez agregados, y cada caso de uso suma requisitos de publicación.
  Por eso NO se van a agregar los casos de uso de Messenger/Instagram HASTA que la
  app esté publicada. Tu trabajo es dejar todo INVESTIGADO y DISEÑADO para ese momento.
- El bot actual vive en `C:\Users\cmanc\OneDrive\Escritorio\Proyecto_zapatos\bot_n8n\`
  — puedes LEER `BRIEF_ClaudeCode_bot_n8n.md`, `LEEME-BOT.txt` y `workflows\*.json`
  para entender el patrón. NO MODIFIQUES NADA fuera de tu carpeta.

## Tu tarea

Investigar en fuentes ACTUALIZADAS (2025-2026, developers.facebook.com ante todo) y
escribir un informe-plan en la carpeta nueva:
`C:\Users\cmanc\OneDrive\Escritorio\Proyecto_zapatos\bot_n8n\fase2\BRIEF-MESSENGER-INSTAGRAM.md`

Debe responder con precisión:
1. **Requisitos por canal**: qué permisos exigen hoy Messenger Platform
   (¿pages_messaging?) e Instagram Messaging (¿instagram_manage_messages?), si
   requieren App Review / acceso avanzado / verificación de negocio, y qué necesita
   la cuenta (página de Facebook, cuenta IG profesional vinculada, etc.). El negocio
   YA tiene Instagram y página de Facebook activos.
2. **Webhooks**: qué campos se suscriben por canal, forma del payload de entrada
   (mensajes de texto, adjuntos), y en qué se diferencia del payload de WhatsApp
   (`entry[].changes[].value.messages[]`). ¿Se pueden recibir en el MISMO endpoint o
   conviene un webhook aparte en n8n?
3. **Envío**: endpoints de la Graph API para responder por Messenger y por IG
   (Send API), con ejemplos de curl. ¿Los botones/listas interactivas de WhatsApp
   tienen equivalente (quick replies, generic template)? Mapear: lista de categorías
   → ¿qué componente?; lista de modelos con precio → ¿qué componente (carrusel)?
4. **Tokens**: ¿sirve el token de usuario de sistema que ya se usa para WhatsApp o
   se necesita Page Access Token? ¿Cómo se obtiene y renueva?
5. **Límites y ventanas**: política de 24h de respuesta, etiquetas de mensaje, límites
   del modo desarrollo vs publicado.
6. **Diseño n8n propuesto**: diagrama en texto de cómo extender el bot actual
   (webhook(s) → normalizador de payload por canal → el MISMO nodo de decisión
   Gemini+catálogo → despachador que formatea según canal). Objetivo: un solo cerebro,
   tres canales.
7. **Plan de activación**: checklist ordenado de qué hacer el día que la app esté
   publicada (agregar casos de uso, configurar webhooks, tokens, probar), con
   estimación realista de tiempos (incluyendo App Review si aplica).

## Reglas duras
- Escribe ÚNICAMENTE en `bot_n8n\fase2\` (créala).
- NO agregues casos de uso ni toques nada en Meta (no tienes acceso y no debe hacerse aún).
- NO ejecutes nada contra n8n ni sus archivos.
- Cita TODAS las fuentes con URL al final del informe. Si algo cambió recientemente
  en la plataforma de Meta o hay información contradictoria, dilo explícitamente.
- Español claro; el lector principal no es experto.
