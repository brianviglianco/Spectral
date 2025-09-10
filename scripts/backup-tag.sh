#!/usr/bin/env bash
set -euo pipefail
STAMP="$(date +'%Y%m%d-%H%M')"
MSG="${1:-Backup before CI/matrix changes}"
git add .
git commit -m "${MSG}"
git tag "backup-${STAMP}"
git push origin --tags
echo "backup-${STAMP}"
