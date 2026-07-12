# BITÁCORA DE SEGURIDAD + ESTRUCTURA — VarMan Crew (web y app)

> Memoria del agente de seguridad entre corridas. Cada vuelta es una sesión nueva sin memoria:
> el agente SIEMPRE lee esto primero y lo actualiza al terminar. Brief:
> `seguridad/BRIEF-AGENTE-SEGURIDAD-ESTRUCTURA.md`.
>
> Modo: **seguridad primero, estructura con cuidado.** Una cosa por corrida, verificable y
> reversible, **el dueño despliega.** Prioridad:
> **secretos > reglas Firestore > deps/librerías > código (XSS) > estructura.**

---

## ⚙️ Herramientas (estado)
Marca aquí cuáles están instaladas (ver `seguridad/GUIA-HERRAMIENTAS-SEGURIDAD.md`):
- [ ] gitleaks (secretos)
- [ ] osv-scanner (dependencias)
- [ ] ESLint + eslint-plugin-security + eslint-plugin-react-security (código React)
- [ ] retire.js (librerías JS viejas)
- [ ] (opcional) Semgrep — necesita Python/Docker
- [ ] (opcional) emulador de Firebase — necesita Java

> Si una no está, el agente audita **leyendo el código** igual, y anota qué herramienta
> automatizaría ese chequeo.

---

## ▶️ Próximas (cola priorizada)

**Tier S — Seguridad (va primero):**
1. **[S1] Secretos en el repo** — con gitleaks (o revisión), confirmar que `bot_n8n/credenciales/`,
   `.env`, `clave backup vm.txt` y toda llave estén en `.gitignore` y **no** en el historial de
   git. Si algo se filtró: documentar **rotación** (lo hace el dueño). Solo reportar; no editar
   `bot_n8n/`.
2. **[S2] Reglas de Firestore** (`app/reglas-firestore.txt`) — revisar accesos demasiado
   abiertos (`if true`), aplicar menor privilegio por colección. Proponer reglas endurecidas
   (el dueño las publica en Firebase).
3. **[S3] React en modo desarrollo en producción** (`app/vendor/react*.development.js`) — pasar a
   las builds de producción (más rápido, no filtra detalles internos).
4. **[S4] XSS / inyección** — buscar `dangerouslySetInnerHTML`, `innerHTML`, `eval`, HTML armado
   con datos del usuario; validar/sanear.
5. **[S5] Cabeceras de la web** (`web/publicar/_headers`) — revisar CSP, HSTS, X-Content-Type, etc.

**Tier Q — Estructura/calidad (SOLO con red de seguridad):**
1. **[Q0] Crear la red de seguridad** de la app (chequeo de humo: sintaxis + flujos clave). Es el
   pre-requisito de todo refactor. Ver §5 del brief.
2. **[Q1] Modularizar `app.jsx`** (~250 KB, un solo archivo) poco a poco: extraer componentes sin
   cambiar comportamiento, verificando en cada paso.
3. **[Q2] Limpieza** — código muerto/duplicado, nombres, `npx eslint` en verde.

> Cuando la cola baje, repóblala con lo que arrojen las herramientas y con la revisión del código.

---

## ✅ Hechas (lo nuevo arriba)
_(Aún ninguna. Una fila por corrida: # · fecha · qué · archivo(s) · cómo se probó · nota · acción
pendiente del dueño si la hay.)_

| # | Fecha | Cambio | Tier | Archivos | Verificación | Nota | Acción dueño |
|---|-------|--------|------|----------|--------------|------|--------------|
| — | —     | —      | —    | —        | —            | —    | —            |

---

## 🗑️ Ideas descartadas
| Fecha | Idea | Motivo |
|-------|------|--------|
| —     | —    | —      |

---

## 📌 Para el dueño (acciones que solo Cristhian puede hacer)
El agente acumula aquí lo que requiere al dueño (rotar una clave, publicar reglas de Firestore,
re-desplegar la web/app). Revísalo cada tanto.
- _(vacío por ahora)_
