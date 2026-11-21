#!/usr/bin/env python3
"""Actualiza una instantánea estática de The Firmware Hub (máximo una lectura diaria).

Uso en GitHub Actions: python scripts/update_catalog.py
Uso sin red, para crear el primer snapshot: python scripts/update_catalog.py --from-file fuente.json

Atribución: Firmware list: The Firmware Hub – https://thefirmwarehub.com
Compilación del catálogo CC BY 4.0. No se reproducen descripciones ni imágenes de autores.
"""
import argparse
import json
import os
from pathlib import Path
import re
import sys
import urllib.request

BASE = Path(__file__).resolve().parent.parent
OUT = BASE / 'public'
SOURCE = 'https://thefirmwarehub.com/catalog.json'


def external_url(url):
    return str(url) if isinstance(url, str) and url.startswith('https://') else ''


def normalize(data):
    if not isinstance(data, dict) or not isinstance(data.get('firmwares'), list):
        raise ValueError('El catálogo no tiene el campo firmwares esperado.')
    source_list = data['firmwares']
    if len(source_list) < 100:
        raise ValueError('El catálogo contiene pocos registros; no se publicará una captura incompleta.')
    records = []
    seen_ids = set()
    for f in source_list:
        ident = str(f.get('id') or '').strip()
        if not ident or ident in seen_ids:
            raise ValueError(f'ID duplicado o vacío: {ident}')
        seen_ids.add(ident)
        repo = str(f.get('repo') or '').strip()
        pkg = str(f.get('pkg') or '').strip()
        sha = str(f.get('sha256') or '').lower()
        if not re.fullmatch(r'[\w.\-]+/[\w.\-]+', repo):
            raise ValueError(f'Repositorio inválido para {ident}: {repo}')
        if not pkg.endswith('.fwsc'):
            raise ValueError(f'Paquete inválido para {ident}: {pkg}')
        if not re.fullmatch('[a-f0-9]{64}', sha):
            raise ValueError(f'SHA-256 inválido para {ident}')
        kind = f.get('kind') or 'other'
        kind = ', '.join(map(str, kind)) if isinstance(kind, list) else str(kind)
        asset = str(f.get('asset') or '').split(' ')[0]
        if not asset.isdecimal(): asset = ''
        release = external_url(f.get('release')) or f'https://github.com/{repo}/releases'
        tag = str(f.get('tag') or '').strip()
        # La URL del paquete espejo no se distribuye: el Hub pide descargar del creador.
        records.append({
            'id': ident,
            'name': str(f.get('name') or ident),
            'version': str(f.get('version') or '—'),
            'author': str(f.get('author') or 'No indicado'),
            'category': kind,
            'date': str(f.get('date') or ''),
            'beta': bool(f.get('beta')),
            'chip': str(f.get('chip') or 'unknown'),
            'pkgFile': pkg.rsplit('/', 1)[-1],
            'sha256': sha,
            'repo': f'https://github.com/{repo}',
            'repoSlug': repo,
            'release': release,
            'tag': tag,
            'assetId': asset,
            'play': external_url(f.get('play')),
            'editor': external_url(f.get('editor')),
        })
    stock = data.get('stock')
    if isinstance(stock, dict) and str(stock.get('pkg', '')).endswith('.fwsc'):
        records.append({
            'id': 'mvave-original-v15', 'name': 'FM-1 original (V15)',
            'version': '15', 'author': 'M-VAVE', 'category': 'official',
            'date': '', 'beta': False, 'chip': 'any',
            'pkgFile': stock['pkg'].rsplit('/', 1)[-1],
            'sha256': str(stock.get('sha256') or '').lower(),
            'repo': 'https://github.com/m-vave/fm1_open',
            'repoSlug': 'm-vave/fm1_open',
            'release': external_url(stock.get('source')) or 'https://github.com/m-vave/fm1_open',
            'tag': '', 'assetId': '', 'play': '', 'editor': '',
        })
    records.sort(key=lambda f: (f['name'].casefold(), f['id']))
    return {
        'sourceUpdated': str(data.get('updated') or ''),
        'sourceUrl': SOURCE,
        'attribution': 'Firmware list: The Firmware Hub – https://thefirmwarehub.com',
        'license': 'CC BY 4.0',
        'note': 'Catálogo adaptado: solo metadatos técnicos; sin textos ni imágenes originales de los autores.',
        'firmwares': records,
    }


def changes(previous, current):
    before = {r['id']: r for r in previous.get('firmwares', [])} if isinstance(previous, dict) else {}
    after = {r['id']: r for r in current['firmwares']}
    newest = [k for k in after if k not in before]
    upgraded = [k for k in after if k in before and (
        after[k]['version'] != before[k].get('version') or after[k]['sha256'] != before[k].get('sha256'))]
    removed = [k for k in before if k not in after]
    return {'sourceUpdated': current['sourceUpdated'], 'new': newest, 'updated': upgraded, 'removed': removed}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--from-file', help='Leer JSON local sin tocar la red (para inicialización o pruebas)')
    args = ap.parse_args()
    if args.from_file:
        raw = Path(args.from_file).read_bytes()
    else:
        repo = os.environ.get('GITHUB_REPOSITORY', 'local/FM1-directory')
        agent = f'FM1-Catalogo-NETLIFY/1.0 (daily update; https://github.com/{repo})'
        req = urllib.request.Request(SOURCE, headers={
            'User-Agent': agent, 'Accept': 'application/json'})
        with urllib.request.urlopen(req, timeout=35) as r:
            raw = r.read(6_000_000)
    parsed = json.loads(raw.decode('utf-8'))
    current = normalize(parsed)
    OUT.mkdir(parents=True, exist_ok=True)
    catalog_path = OUT / 'catalog.json'
    old = json.loads(catalog_path.read_text(encoding='utf-8')) if catalog_path.exists() else {}
    delta = changes(old, current) if old else {'sourceUpdated': current['sourceUpdated'], 'new': [], 'updated': [], 'removed': []}
    # No modificar los archivos en el repo si las entradas son idénticas,
    # aunque el servidor fuente haya actualizado solo su sello de tiempo.
    if old.get('firmwares') == current['firmwares']:
        print(f'Sin cambios en los {len(current["firmwares"])} firmwares; fecha fuente {current["sourceUpdated"]}.')
        return
    catalog_path.write_text(json.dumps(current, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (OUT / 'changes.json').write_text(json.dumps(delta, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Actualizado: {len(current["firmwares"])} firmwares; +{len(delta["new"])} nuevos, '
          f'~{len(delta["updated"])} versiones, -{len(delta["removed"])} retirados.')


if __name__ == '__main__':
    try: main()
    except Exception as exc:
        print(f'ERROR: no se actualiza el catálogo: {exc}', file=sys.stderr)
        sys.exit(1)
