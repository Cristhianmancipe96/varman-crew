# Guía de instalación — Herramientas de seguridad y calidad (Windows)

> Para el agente `BRIEF-AGENTE-SEGURIDAD-ESTRUCTURA.md`. Instala lo que puedas; el agente
> funciona con lo que haya (si falta una, audita leyendo el código).
>
> **Nota:** los comandos y flags cambian con cada versión. Si algo no corre igual, revisa
> `<herramienta> --help` o el README oficial (los enlazo abajo). Todo esto se instala **una
> vez**; el agente solo las usa.

---

## 0. Base: Node.js (recomendado instalarlo bien)
Tu PC tenía un Node "portátil". Para estas herramientas conviene instalar Node de forma normal:

```
winget install OpenJS.NodeJS.LTS
```

Cierra y reabre la terminal. Verifica: `node --version` y `npm --version`.
(Si lo instalas, puedes borrar `bot_n8n\herramientas\node\`.)

---

## 1. gitleaks — busca secretos (claves, tokens, contraseñas)  ⭐ el más urgente
Detecta credenciales filtradas en el código y en el historial de git. Es un `.exe` suelto.

**Instalar (elige una):**
```
winget install gitleaks.gitleaks
```
o con Scoop: `scoop install gitleaks`
o descarga el `.exe` de: https://github.com/gitleaks/gitleaks/releases

**Usar (desde la carpeta del proyecto):**
```
gitleaks detect --source . -v            # revisa el historial de git
gitleaks detect --source . --no-git -v   # revisa los archivos actuales (sin git)
```

---

## 2. osv-scanner — dependencias con vulnerabilidades conocidas (Google)
Revisa librerías/paquetes contra la base de datos OSV. `.exe` suelto.

**Instalar (elige una):**
```
winget install Google.osv-scanner
```
o `scoop install osv-scanner`
o descarga de: https://github.com/google/osv-scanner/releases

**Usar:**
```
osv-scanner scan source -r .     # escanea toda la carpeta, recursivo
```
(en versiones viejas: `osv-scanner -r .`)

---

## 3. ESLint + plugins de seguridad — código React (app)
Encuentra bugs y patrones inseguros en JavaScript/React. Usa Node (paso 0).

**Instalar (dentro de la carpeta `app\`, una sola vez):**
```
cd app
npm init -y
npm install --save-dev eslint eslint-plugin-security eslint-plugin-react eslint-plugin-react-security
```
- `eslint-plugin-security`: https://www.npmjs.com/package/eslint-plugin-security
- `eslint-plugin-react-security`: https://github.com/snyk-labs/eslint-plugin-react-security

**Usar:**
```
npx eslint app.jsx
```
(El agente crea/ajusta el archivo de config `.eslintrc` la primera vez.)

---

## 4. retire.js — librerías JS viejas con fallos conocidos
Útil porque la app carga React en versión de desarrollo (`app/vendor/*.development.js`).

**Instalar:**
```
npm install -g retire
```
o web: https://retirejs.github.io/retire.js/

**Usar (desde la carpeta del proyecto):**
```
retire --path .
```

---

## Opcionales (más potentes, pero piden más)

### 5. Semgrep — análisis de seguridad (SAST) completo
El más potente, pero **necesita Python o Docker** (en Windows va mejor por Docker o WSL).
- Con Python: `pip install semgrep` → `semgrep --config auto .`
- Con Docker: `docker run --rm -v "%cd%:/src" semgrep/semgrep semgrep --config auto /src`
- Repo: https://github.com/semgrep/semgrep

> Si no tienes Python ni Docker, **sáltalo**: con las 4 de arriba + el análisis del agente ya
> cubres bastante. Instálalo solo si te animas.

### 6. Emulador de Firebase — probar las reglas de Firestore
Para **probar** de verdad las reglas (`app/reglas-firestore.txt`). Necesita **Java**.
```
npm install -g firebase-tools
npm install --save-dev @firebase/rules-unit-testing
```
Docs: https://firebase.google.com/docs/firestore/security/test-rules-emulator

> Sin esto, el agente igual **revisa** las reglas leyéndolas y te propone mejoras; tú las
> publicas en la consola de Firebase.

---

## Orden sugerido de instalación
1. **Node** (paso 0) — habilita ESLint y retire.js.
2. **gitleaks** — lo más urgente (secretos).
3. **osv-scanner**.
4. **ESLint + plugins** y **retire.js**.
5. (Opcional) Semgrep / emulador de Firebase, si algún día pones Python/Docker/Java.

Cuando instales alguna, márcala en `seguridad/BITACORA-SEGURIDAD.md` (sección "Herramientas").
