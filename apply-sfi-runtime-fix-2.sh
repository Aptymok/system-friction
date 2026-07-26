#!/usr/bin/env bash
set -euo pipefail

# SFI -- housekeeping fix #2: runtime.ts tenia un segundo 'field_events' hardcodeado
# que el fix anterior (registry.ts) no tocaba. No rompia nada (fallback con field_cases
# lo enmascaraba) pero es la misma clase de defecto. Correr desde la raiz del repo.

if [ ! -f "package.json" ] || ! grep -q "system-friction-terminal" package.json; then
  echo "Error: corre este script desde la raiz del repo (system-friction/)." >&2
  exit 1
fi

TARGET="src/lib/sfi/cognitive-runtime/runtime.ts"

if [ ! -f "$TARGET" ]; then
  echo "Error: no encuentro $TARGET -- ¿corriste primero apply-sfi-operation-0.sh?" >&2
  exit 1
fi

if ! grep -q "probes.get('field_events')" "$TARGET"; then
  echo "Ya esta corregido -- no hay nada que hacer."
  exit 0
fi

sed -i.bak "s/probes.get('field_cases')?.ok || probes.get('field_events')?.ok/probes.get('field_cases')?.ok || probes.get('field_moph_runs')?.ok/" "$TARGET"
rm -f "${TARGET}.bak"

echo "-> Corregido: $TARGET"
grep -n "field_moph_runs" "$TARGET" | head -3

if [ -d "node_modules" ]; then
  echo "-> Verificando tipos"
  npm run typecheck
else
  echo "Aviso: no hay node_modules/ -- corre 'npm run typecheck' manualmente para confirmar."
fi
