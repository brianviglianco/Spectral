#!/usr/bin/env bash
# Empaqueta TODOS los reports encontrados.
# Uso:
#   bash scripts/make-forensic-all.sh
#   INCLUDE_P0=1 bash scripts/make-forensic-all.sh   # incluye *.p0.json

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ZIP_TOOL="$ROOT/scripts/forensicZip.js"
OUT_DIR="$ROOT/reports/forensic"

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

GLOBS=( "$ROOT/reports/spectral-analysis-"*.json )
if [[ "${INCLUDE_P0:-0}" == "1" ]]; then
  GLOBS+=( "$ROOT/reports/spectral-analysis-"*.json.p0.json )
fi

# Si el glob no matchea, bash 3.2 deja el literal; filtramos con -f
for f in "${GLOBS[@]}"; do
  [[ -f "$f" ]] || continue
  echo "[ALL] Pack -> $f"
  node "$ZIP_TOOL" "$f"
done

echo "DONE (ALL)"
