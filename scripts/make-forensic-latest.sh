#!/usr/bin/env bash
# Empaqueta SOLO el último report por dominio.
# Uso:
#   bash scripts/make-forensic-latest.sh
#   INCLUDE_P0=1 bash scripts/make-forensic-latest.sh  # usa *.p0.json

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ZIP_TOOL="$ROOT/scripts/forensicZip.mjs"
OUT_DIR="$ROOT/reports/forensic"
EXT=".json"
[[ "${INCLUDE_P0:-0}" == "1" ]] && EXT=".json.p0.json"

# Asegurar herramienta
if [[ ! -f "$ZIP_TOOL" ]]; then
  if [[ -f "$ROOT/src/tools/forensicZip.js" ]]; then
    mkdir -p "$ROOT/scripts"
    cp "$ROOT/src/tools/forensicZip.js" "$ZIP_TOOL"
  else
    echo "ERROR: no encuentro forensicZip.js" >&2
    exit 1
  fi
fi

mkdir -p "$OUT_DIR"

# Listado de hosts único (compatible con bash 3.2)
HOSTS=$(ls "$ROOT"/reports/spectral-analysis-*"$EXT" 2>/dev/null \
  | sed -E 's|^.*/spectral-analysis-([^ ]+)-.*|\1|' | sort -u)

if [[ -z "${HOSTS// }" ]]; then
  echo "No hay inputs con extensión $EXT"
  exit 0
fi

for host in $HOSTS; do
  last=$(ls -1t "$ROOT"/reports/spectral-analysis-"$host"-*"$EXT" | head -1)
  [[ -n "$last" && -f "$last" ]] || continue
  echo "[LATEST] $host -> $last"
  node "$ZIP_TOOL" "$last"
done

echo "DONE (LATEST)"
