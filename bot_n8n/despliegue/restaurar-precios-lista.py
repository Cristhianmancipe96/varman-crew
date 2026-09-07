# -*- coding: utf-8 -*-
"""
Vuelve al precio de LISTA las referencias que quedaron con el precio rebajado
de la promo (orden del dueno, 7-sep-2026: "no quiero nada de promos").

Regla: para cada doc de tiendas/varman/catalogo con precioAntes > precio:
    precio      <- precioAntes
    precioAntes <- (se borra)
Los que no tienen precioAntes, o lo tienen vacio o <= precio, no se tocan.

Por defecto es SIMULACRO (no escribe nada). Solo escribe con --aplicar.
Escribe por la API REST con updateMask (solo esos dos campos) usando el token
de gcloud, como la carga del Bunker del 12-ago. NO usa credenciales de archivo.

    python restaurar-precios-lista.py            -> lista lo que cambiaria
    python restaurar-precios-lista.py --aplicar  -> lo cambia (pide el token)

Antes de aplicar deja un respaldo JSON del catalogo completo al lado.
"""
import json, sys, subprocess, urllib.request, urllib.parse, datetime, os

BASE = 'https://firestore.googleapis.com/v1/projects/varman-crew/databases/(default)/documents'
COL = BASE + '/tiendas/varman/catalogo'
GCLOUD = r'C:\Users\andre\dev\gcloud-sdk\google-cloud-sdk\bin\gcloud.cmd'
APLICAR = '--aplicar' in sys.argv


def leer(url, token=None):
    req = urllib.request.Request(url)
    if token:
        req.add_header('Authorization', 'Bearer ' + token)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode('utf-8'))


def valor(f):
    if not f:
        return None
    for k in ('integerValue', 'doubleValue', 'stringValue', 'booleanValue'):
        if k in f:
            return f[k]
    return None


def numero(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


# 1. catalogo completo (lectura publica, igual que la web)
docs = []
token_pag = ''
while True:
    url = COL + '?pageSize=300' + ('&pageToken=' + urllib.parse.quote(token_pag) if token_pag else '')
    d = leer(url)
    docs += d.get('documents', [])
    token_pag = d.get('nextPageToken', '')
    if not token_pag:
        break

cambios = []
for x in docs:
    f = x.get('fields', {})
    p = numero(valor(f.get('precio')))
    a = numero(valor(f.get('precioAntes')))
    if p is None or a is None or a <= p:
        continue
    cambios.append({
        'name': x['name'], 'ref': valor(f.get('ref')), 'marca': valor(f.get('marca')) or '',
        'precio': int(p), 'lista': int(a), 'pct': round((1 - p / a) * 100)
    })

print('docs en el catalogo: %d | con precio rebajado: %d' % (len(docs), len(cambios)))
for c in sorted(cambios, key=lambda c: str(c['ref'])):
    print('  ref %s | %-30s | %s -> %s (-%d%%)' % (c['ref'], c['marca'][:30], c['precio'], c['lista'], c['pct']))

if not APLICAR:
    print('\nSIMULACRO: no se escribio nada. Para aplicar: --aplicar')
    sys.exit(0)

if not cambios:
    print('nada que cambiar')
    sys.exit(0)

# 2. respaldo del catalogo completo ANTES de tocar nada
hoy = datetime.datetime.now().strftime('%Y-%m-%d_%H%M')
aqui = os.path.dirname(os.path.abspath(__file__))
respaldo = os.path.join(aqui, 'catalogo-ANTES-de-restaurar-precios-%s.json' % hoy)
with open(respaldo, 'w', encoding='utf-8') as fh:
    json.dump({'documents': docs}, fh, ensure_ascii=False, indent=1)
print('\nrespaldo del catalogo: %s' % respaldo)

# 3. token de gcloud (cuenta del dueno, proyecto varman-crew)
token = subprocess.check_output([GCLOUD, 'auth', 'print-access-token'], text=True).strip()

# 4. PATCH doc por doc con updateMask: solo precio y precioAntes
ok = 0
for c in cambios:
    url = 'https://firestore.googleapis.com/v1/' + c['name'] \
        + '?updateMask.fieldPaths=precio&updateMask.fieldPaths=precioAntes'
    body = json.dumps({'fields': {'precio': {'integerValue': str(c['lista'])}}}).encode('utf-8')
    req = urllib.request.Request(url, data=body, method='PATCH')
    req.add_header('Authorization', 'Bearer ' + token)
    req.add_header('Content-Type', 'application/json')
    with urllib.request.urlopen(req, timeout=60) as r:
        r.read()
    ok += 1
    print('  OK ref %s -> %s' % (c['ref'], c['lista']))
print('\nlisto: %d referencias al precio de lista, precioAntes borrado' % ok)

# 5. verificacion: releer y contar
d = leer(COL + '?pageSize=300')
quedan = 0
for x in d.get('documents', []):
    f = x.get('fields', {})
    p = numero(valor(f.get('precio')))
    a = numero(valor(f.get('precioAntes')))
    if p is not None and a is not None and a > p:
        quedan += 1
print('verificacion: referencias con precio rebajado que quedan = %d (debe ser 0)' % quedan)
