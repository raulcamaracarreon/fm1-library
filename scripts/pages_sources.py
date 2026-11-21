"""Resuelve paquetes originales alojados en GitHub Pages a partir de manifiestos del autor.

No consulta The Firmware Hub ni guarda el firmware. Comprueba SHA-256 antes de
publicar una URL directa. Otros proyectos pueden añadirse a SOURCES si se
confirma que publican el mismo tipo de manifiesto y se respeta su política.
"""
import hashlib
import json
import re
from datetime import datetime, timezone
from urllib.request import Request, urlopen

# Fuentes originales examinadas en sus repositorios. Nunca adivinar rutas a
# partir del nombre que usa el espejo de The Firmware Hub.
SOURCES = {
    "jiant": {
        "directory": "https://juanjiant-bit.github.io/JIANT/firmware/",
        "manifest": "versions.json",
    },
}
MAX_MANIFEST = 256_000
MAX_PACKAGE = 2_000_000
FILE_NAME = re.compile(r"[A-Za-z0-9_.-]+\.fwsc\Z", re.I)


def read_original(url, limit):
    request = Request(url, headers={
        "User-Agent": "FM1-Library/1.1 (download URL verification; https://github.com/raulcamaracarreon/fm1-library)",
        "Accept": "application/json" if url.endswith(".json") else "application/octet-stream",
    })
    with urlopen(request, timeout=18) as response:
        # No aceptar redirecciones hacia dominios o rutas distintos.
        if response.geturl() != url:
            raise ValueError("Redirección inesperada del servidor original")
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError("Archivo supera el límite de validación")
    return data


def safe_filename(filename):
    return isinstance(filename, str) and FILE_NAME.fullmatch(filename) and filename not in (".", "..")


def manifest_filename(raw, version):
    entries = json.loads(raw.decode("utf-8"))
    if isinstance(entries, dict):
        entries = entries.get("versions", [])
    if not isinstance(entries, list):
        raise ValueError("Formato de versiones no reconocido")
    target = str(version).lower().removeprefix("v")
    matches = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        found_version = str(entry.get("version") or "").lower().removeprefix("v")
        filename = entry.get("file") or entry.get("pkg")
        if found_version == target and safe_filename(filename):
            matches.append(filename)
    # Si hay ambigüedad, mejor no mostrar una descarga directa.
    if len(matches) != 1:
        return None
    return matches[0]


def preserved(previous, current):
    if not isinstance(previous, dict):
        return False
    return (previous.get("version") == current.get("version")
        and previous.get("sha256") == current.get("sha256")
        and previous.get("downloadKind") == "github_pages"
        and previous.get("downloadUrl", "").startswith(SOURCES[current["id"]]["directory"])
        and previous.get("downloadUrl", "").endswith(".fwsc"))


def resolve_pages_downloads(current, previous=None, fetch=read_original, logger=print):
    """Enriquece solo fuentes conocidas. Si falla la red conserva el último enlace
    previamente validado para la MISMA versión y SHA, jamás para otro binario."""
    old = {f["id"]: f for f in (previous or {}).get("firmwares", [])}
    for f in current.get("firmwares", []):
        source = SOURCES.get(f.get("id"))
        if not source:
            continue
        old_f = old.get(f["id"])
        try:
            root = source["directory"]
            raw = fetch(root + source["manifest"], MAX_MANIFEST)
            name = manifest_filename(raw, f["version"])
            if not name:
                raise ValueError("Versión no encontrada o manifiesto ambiguo")
            url = root + name
            package = fetch(url, MAX_PACKAGE)
            digest = hashlib.sha256(package).hexdigest()
            if digest.lower() != f["sha256"].lower():
                raise ValueError("SHA-256 distinto del catálogo: no publicamos enlace")
            f["downloadKind"] = "github_pages"
            f["downloadUrl"] = url
            # Fecha de comprobación informativa; no se cambia si nada más cambió.
            f["downloadVerifiedAt"] = (
                old_f.get("downloadVerifiedAt") if preserved(old_f, f)
                and old_f.get("downloadUrl") == url
                else datetime.now(timezone.utc).date().isoformat()
            )
            logger(f'{f["name"]}: descarga de GitHub Pages comprobada por SHA-256')
        except Exception as exc:
            if preserved(old_f, f):
                for field in ("downloadUrl", "downloadKind", "downloadVerifiedAt"):
                    f[field] = old_f.get(field)
                logger(f'{f["name"]}: fallo de comprobación, se conserva enlace previamente validado: {exc}')
            else:
                for field in ("downloadUrl", "downloadKind", "downloadVerifiedAt"):
                    f.pop(field, None)
                logger(f'{f["name"]}: sin descarga directa verificada: {exc}')
    return current
