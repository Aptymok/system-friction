#!/usr/bin/env bash
set -euo pipefail

# SFI -- ADR-005: contrato CognitiveEvent, especializacion minima de SFIEvent con
# logbookId obligatorio. Sin logica de negocio, sin autoridad. Correr desde la raiz
# del repo (system-friction/).

if [ ! -f "package.json" ] || ! grep -q "system-friction-terminal" package.json; then
  echo "Error: corre este script desde la raiz del repo (system-friction/)." >&2
  exit 1
fi

mkdir -p src/lib/sfi/cognitive-runtime

echo "-> Escribiendo src/lib/sfi/cognitive-runtime/cognitiveEvent.ts (nuevo)"
cat > src/lib/sfi/cognitive-runtime/cognitiveEvent.ts <<'SFI_EOF_COGEVENT_9f2a1'
import { randomUUID } from 'crypto';
import type { SFIEvent } from '../../../../packages/events/src/schema';

/**
 * CognitiveEvent — ADR-005.
 *
 * A specialization of SFIEvent<TPayload>, nothing more. Introduces exactly one
 * requirement SFIEvent leaves optional: logbookId is mandatory, because ADR-007
 * gives every cognitive cycle its own logbookId and an event with no cycle
 * identity can't be placed back into its cycle later.
 *
 * No authority. No decision. No business rule. This type exists to carry an
 * observation into the Event Graph with its context intact (logbookId, lineage,
 * source, confidence, occurredAt, payload) — nothing here decides what happens
 * with that observation. That stays with the Runtime (meta_orchestrator and the
 * decide-layer agents), per ADR-001/002.
 */
export type CognitiveEvent<TPayload = unknown> = SFIEvent<TPayload> & {
  logbookId: string;
};

/**
 * Fills the fields that are pure plumbing (eventId, occurredAt) when the caller
 * doesn't already have them. Everything else is passed through unchanged — this
 * is not a place for defaults that shape meaning (epistemicClass, confidence,
 * source are always the caller's to set).
 */
export function createCognitiveEvent<TPayload>(input: {
  eventName: string;
  epistemicClass: SFIEvent<TPayload>['epistemicClass'];
  confidence: number;
  payload: TPayload;
  logbookId: string;
  source?: SFIEvent<TPayload>['source'];
  lineage?: string[];
  uncertainty?: string;
  eventId?: string;
  occurredAt?: string;
  checksum?: string;
}): CognitiveEvent<TPayload> {
  return {
    eventId: input.eventId ?? randomUUID(),
    eventName: input.eventName,
    epistemicClass: input.epistemicClass,
    confidence: input.confidence,
    payload: input.payload,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    source: input.source,
    checksum: input.checksum,
    lineage: input.lineage ?? [],
    uncertainty: input.uncertainty,
    logbookId: input.logbookId,
  };
}

SFI_EOF_COGEVENT_9f2a1

if [ -d "node_modules" ]; then
  echo "-> Verificando boundaries"
  npm run check:boundaries
  echo "-> Verificando tipos"
  npm run typecheck
else
  echo "Aviso: no hay node_modules/ -- corre check:boundaries y typecheck manualmente."
fi

echo ""
echo "Listo. CognitiveEvent<TPayload> = SFIEvent<TPayload> & { logbookId: string }."
echo "Para commitear:"
echo "  git add src/lib/sfi/cognitive-runtime/cognitiveEvent.ts"
echo '  git commit -m "feat(cognitive-runtime): ADR-005 -- CognitiveEvent contract"'
