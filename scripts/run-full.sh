#!/usr/bin/env bash
set -euo pipefail
URL="${1:-}"
[[ -z "$URL" ]] && { echo "Uso: $0 <url>"; exit 1; }
ROOT="$(cd "$(dirname "$0")/.."; pwd)"
REG="$ROOT/config/regions.full.ran.json"
[[ ! -f "$REG" ]] && { echo "No existe $REG"; exit 1; }
node "$ROOT/src/tools/runRANMatrix.js" "$URL" "$REG"
