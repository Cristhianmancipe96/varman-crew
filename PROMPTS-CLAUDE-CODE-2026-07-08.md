# Prompts para Claude Code — 8 jul 2026 (2 agentes en paralelo)

Abre **dos sesiones/terminales** de Claude Code en la carpeta `Proyecto_zapatos` y pega un
prompt en cada una. No chocan: uno trabaja en `web/` y el otro en `bot_n8n/`.

---

## 🌐 Agente WEB  (terminal 1)

```
Eres el Agente WEB de VarMan Crew. Lee COMPLETO tu brief y síguelo al pie de la letra:
web/briefs/BRIEF-AGENTE-WEB-2026-07-08.md

Trabaja SOLO en web/publicar/ (y web/assets/ si hace falta). NO toques app/, bot_n8n/ ni los workflows.

Objetivo: dejar la tienda lista para PUBLICAR A PRODUCCIÓN apuntando al número del bot
(573042916972), con la sección de métodos de pago (QR con fallback si aún no existe la imagen) y
todo verificado en local. El número ya está puesto: NO lo cambies. NO toques privacidad.html (queda
en el 320 a propósito).

Al terminar deja web/NOTA-AGENTE-WEB-2026-07-08.md con: qué cambiaste, el checklist de puesta en
producción (incluida la prueba de recepción del 304 con un número de la lista de prueba) y la
verificación. Antes de empezar, confírmame en 2 líneas tu plan.
```

---

## 🤖 Agente V6 / FASE 2  (terminal 2)

```
Eres el Agente V6/FASE2 de VarMan Crew. Lee COMPLETO tu brief y síguelo:
bot_n8n/briefs/BRIEF-AGENTE-V6-FASE2-2026-07-08.md

Trabaja SOLO en bot_n8n/ (workflows, fase2/, .env, tests). NO toques web/publicar/ ni app/app.jsx.

Objetivo (en orden): (0) dejar la v5 lista/desplegable; (1) PRIORIDAD — robustez conversacional:
el bot entiende lenguaje libre en CUALQUIER turno → (a) handoff a humano en cualquier momento sin
frase exacta; (b) manejar datos adicionales (varias intenciones en un mismo mensaje); (c) manejar
datos incorrectos/fuera de lugar respondiendo a lo que el cliente realmente dice; (2) Wompi (link de
pago + webhook, placeholders de llaves); (3) catálogo nativo de WhatsApp hasta donde se pueda sin
Meta. Todo ADITIVO, con flags (si falta una variable el bot se comporta IDÉNTICO a la v5), rollback
en 1 comando y tests offline en verde.

Regla de oro: NO romper el flujo de pedido actual. El deploy lo hace Cristhian; el orden es primero
la v5 en la VM, verificar salud 7/7 y probar, y SOLO después las mejoras.

Al terminar deja bot_n8n/NOTA-AGENTE-V6-FASE2-2026-07-08.md + los runbooks y docs que pide el brief.
Antes de empezar, confírmame en 2 líneas tu plan.
```

---

### Notas
- Los dos briefs viven en la carpeta de su componente (`web/briefs/` y `bot_n8n/briefs/`) para que
  cada agente lo encuentre fácil. Los briefs viejos quedaron en `bot_n8n/briefs/_archivo/` (cumplidos)
  y `_futuro/` (pausados: Deploy/QA, Messenger/IG).
- Tú te encargas de: generar los QR, los deploys (web a Cloudflare, app, y bot a la VM), pegar las
  reglas de Firestore y las llaves de Wompi. Los agentes dejan todo listo y con el paso a paso.
