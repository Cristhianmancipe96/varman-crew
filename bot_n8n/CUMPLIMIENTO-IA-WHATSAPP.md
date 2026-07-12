# Cumplimiento — IA de terceros en WhatsApp (Gemini) · VarMan Crew

**Fecha:** 8 jul 2026 · **Estado:** VarMan CUMPLE. Un único cambio pendiente (no urgente).

## Resumen (¿nos afecta la prohibición de Meta?)
**No.** Meta actualizó los términos de la *WhatsApp Business Solution* (oct 2025; vigentes para
todos desde el **15 ene 2026**) y **solo prohíben a proveedores cuya funcionalidad PRINCIPAL es la
IA** — asistentes de propósito general vendidos *a través* de WhatsApp (OpenAI/ChatGPT, Perplexity,
Copilot, Luzia).

VarMan Crew vende **zapatos**; el bot con Gemini es una **función auxiliar** de atención al cliente
y seguimiento de pedidos. Meta permite explícitamente este uso (su propio ejemplo: "una empresa de
viajes con un bot de atención"). → **El bot puede operar con Gemini sin cambios y se puede lanzar.**

## El único to-do real de cumplimiento (hacerlo cuando el bot mueva volumen)
Los términos prohíben que los **datos de las conversaciones** (Business Solution Data) se usen para
**crear, entrenar o mejorar modelos de IA de terceros** (se permite fine-tune solo para uso propio).

- **Riesgo:** el **tier GRATIS de Gemini** que se usa hoy (`GEMINI_API_KEY` nivel gratuito, cuenta
  varmansneakersandclothes) puede usar los prompts para mejorar los productos de Google.
- **Solución:** migrar al **Gemini API de PAGO** (Google AI paid tier / Vertex AI), donde Google
  **no** entrena con tus datos. Alternativamente, verificar la gobernanza de datos de la key actual.
- **Cuándo:** no bloquea el lanzamiento; hacerlo cuando haya volumen/ingresos (ya estaba previsto
  migrar a Gemini de pago por límites de cuota — ahora hay además una razón de cumplimiento).

### Pasos para migrar a Gemini de pago (cuando toque)
1. En Google AI Studio / Google Cloud (cuenta del negocio), habilitar facturación en el proyecto
   `gen-lang-client-0648993591` (o el que corresponda) y activar el tier de pago de la Gemini API.
2. Confirmar en los términos del tier de pago que **los datos no se usan para entrenar** (Vertex AI
   y el paid tier lo garantizan).
3. Reemplazar `GEMINI_API_KEY` en el `.env` de la VM por la key de pago → `docker compose up -d`.
4. Probar un pedido completo (que el flujo Gemini siga igual) y vigilar `botErrores`.

## Buenas prácticas ya aplicadas
- **Aviso en la web:** `web/publicar/privacidad.html` (sección WhatsApp y Meta) ya declara que se usa
  un asistente automatizado con IA de un proveedor externo y que se puede pedir hablar con una persona.
- **Handoff a humano:** el bot ya permite pasar a atención humana (comando/opción "asesor").

## Contexto regulatorio (no afecta la operación de VarMan)
Brasil (CADE) suspendió la política el 12 ene 2026 y la Comisión Europea abrió objeciones a Meta por
competencia (feb 2026). En Colombia los términos aplican tal cual, pero VarMan está en la categoría
permitida de todos modos.

## Fuentes
- WhatsApp Business Solution Terms — whatsapp.com/legal/business-solution-terms
- TechCrunch (18 oct 2025) — "WhatsApp changes its terms to bar general-purpose chatbots"
- Alibaba Cloud — "WhatsApp AI chatbot policy 2026: what businesses need to know"
