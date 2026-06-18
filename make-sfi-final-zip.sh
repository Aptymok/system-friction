#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUTDIR="$ROOT/_sfi_exports"
ZIP="$OUTDIR/system-friction-final-$STAMP.zip"
MANIFEST="$OUTDIR/system-friction-final-$STAMP.manifest.txt"
REPORT="$OUTDIR/system-friction-final-$STAMP.report.md"

mkdir -p "$OUTDIR"

cd "$ROOT"

EXCLUDES=(
  "node_modules/*"
  ".next/*"
  ".vercel/*"
  ".turbo/*"
  ".cache/*"
  ".parcel-cache/*"
  ".pytest_cache/*"
  ".mypy_cache/*"
  ".ruff_cache/*"
  "__pycache__/*"
  ".venv/*"
  "venv/*"
  "dist/*"
  "build/*"
  "coverage/*"
  "htmlcov/*"
  ".git/*"
  "_sfi_cleanroom/*"
  "_sfi_exports/*"
  ".env"
  ".env.*"
  "*.log"
  "*.tmp"
  "*.bak"
  "*.tsbuildinfo"
  "*.pyc"
  "*.pyo"
  "*.pem"
  "*.key"
  "*.p12"
  "*.pfx"
  "*.sqlite"
  "*.sqlite3"
  "*.db"
  "*.dump"
)

EXCLUDE_ARGS=()
for item in "${EXCLUDES[@]}"; do
  EXCLUDE_ARGS+=("-x" "$item")
done

zip -r "$ZIP" . "${EXCLUDE_ARGS[@]}"

unzip -l "$ZIP" > "$MANIFEST"

cat > "$REPORT" <<EOF
# System Friction Final ZIP Report

Generated: $(date -Iseconds)
Root: $(pwd)
ZIP: $ZIP
Manifest: $MANIFEST

Excluded by default:
- node_modules
- .next
- .venv / venv
- .git
- _sfi_cleanroom
- .env*
- logs/temp/cache
- private keys
- local database/dump files
EOF

echo "DONE"
echo "ZIP: $ZIP"
echo "MANIFEST: $MANIFEST"
echo "REPORT: $REPORT"
