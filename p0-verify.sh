#!/usr/bin/env bash
set -euo pipefail

# Verifica SOLO *.json.p0.json (los *.p0.json huérfanos se ignoran)
echo "P0 VERIFICATION SUMMARY"
echo "=================================================="
node verifyP0.js
