#!/usr/bin/env bash
# p0-pipeline.sh — genera .p0.json y corre verifyP0 con los últimos de cada dominio
set -euo pipefail

# Ir al directorio del script (para que funcione desde cualquier lado)
cd "$(dirname "$0")"

# 1) Limpieza: evitar duplicados p0.p0.json
rm -f reports/*.p0.p0.json || true

# 2) Asegurar que hay reports de entrada
shopt -s nullglob
inputs=(reports/spectral-analysis-*.json)
if [ ${#inputs[@]} -eq 0 ]; then
  echo "❌ No hay archivos reports/spectral-analysis-*.json"
  exit 1
fi

# 3) Generar todos los .p0.json
node makeP0.js "${inputs[@]}"

# 4) Helper para tomar el último .p0.json por dominio
latest() {
  local pattern="$1"
  ls -t $pattern 2>/dev/null | head -1 || true
}

D="$(latest reports/spectral-analysis-www.dell.com-*.p0.json)"
C="$(latest reports/spectral-analysis-www.cookielaw.org-*.p0.json)"
B="$(latest reports/spectral-analysis-www.bmw.de-*.p0.json)"
R="$(latest reports/spectral-analysis-www.royalcaribbean.com-*.p0.json)"

# 5) Verificación rápida: que existan
missing=()
[[ -z "$D" ]] && missing+=("dell")
[[ -z "$C" ]] && missing+=("cookielaw")
[[ -z "$B" ]] && missing+=("bmw")
[[ -z "$R" ]] && missing+=("royalcaribbean")
if [ ${#missing[@]} -gt 0 ]; then
  echo "❌ Faltan .p0.json para: ${missing[*]}"
  exit 2
fi

# 6) Correr verifyP0
echo
node verifyP0.js "$D" "$C" "$B" "$R"
