#!/usr/bin/env bash
set -euo pipefail

# SFI -- ADR-004: contrato AMVReading, acotado a los dos modulos vivos de la
# Understanding Layer (evidenceAgent, amvGraphBuilder). Solo tipos, sin logica de
# traduccion todavia (eso es PhenomenonRelay, pendiente). Correr desde la raiz del
# repo (system-friction/).

if [ ! -f "package.json" ] || ! grep -q "system-friction-terminal" package.json; then
  echo "Error: corre este script desde la raiz del repo (system-friction/)." >&2
  exit 1
fi

mkdir -p src/lib/sfi/cognitive-runtime

echo "-> Escribiendo src/lib/sfi/cognitive-runtime/amvReading.ts (nuevo)"
cat > src/lib/sfi/cognitive-runtime/amvReading.ts <<'SFI_EOF_AMVREADING_9f2a1'
import type { AmvEvidenceAgentResult } from '@/lib/amv/agents/evidenceAgent';
import type { AmvGraphState } from '@/lib/amv/core/amvGraphTypes';

/**
 * AMVReading — ADR-004.
 *
 * Envelope-only contract. Does not alter, extend, or duplicate AMV's own result
 * types (AmvEvidenceAgentResult, AmvGraphState) — it wraps them as-is with common
 * fields PhenomenonRelay needs to translate a reading into a CognitiveEvent.
 *
 * Scope, per ADR-001/IMPLEMENTATION-NOTES: limited to the two Understanding Layer
 * modules confirmed live today (exported via src/lib/amv/agents/index.ts or with
 * their own route). `cluster-atlasAgent` and `signal-vaneAgent` are real files with
 * a defined conceptual role (evidence clustering / signal-gradient detection) but
 * are not exported by the barrel and have no callers — not included here. Adding
 * them is a matter of extending this union, once someone wires them into a live
 * path; it does not require reopening ADR-001/004.
 *
 * AMVReading never carries authority. Per ADR-002, nothing in this type is ever
 * written to institutional memory directly by AMV — only PhenomenonRelay, on the
 * Runtime side, decides what becomes a CognitiveEvent.
 */
export type AMVReadingKind = 'evidence_assessment' | 'graph_state';

type AMVReadingEnvelope<Kind extends AMVReadingKind> = {
  kind: Kind;
  scope: string;
  producedAt: string;
};

export type AMVEvidenceAssessmentReading = AMVReadingEnvelope<'evidence_assessment'> & {
  producedBy: 'evidenceAgent';
  result: AmvEvidenceAgentResult;
};

export type AMVGraphStateReading = AMVReadingEnvelope<'graph_state'> & {
  producedBy: 'amvGraphBuilder';
  result: AmvGraphState;
};

export type AMVReading = AMVEvidenceAssessmentReading | AMVGraphStateReading;

export function wrapEvidenceReading(scope: string, result: AmvEvidenceAgentResult): AMVEvidenceAssessmentReading {
  return { kind: 'evidence_assessment', scope, producedAt: new Date().toISOString(), producedBy: 'evidenceAgent', result };
}

export function wrapGraphReading(scope: string, result: AmvGraphState): AMVGraphStateReading {
  return { kind: 'graph_state', scope, producedAt: new Date().toISOString(), producedBy: 'amvGraphBuilder', result };
}

SFI_EOF_AMVREADING_9f2a1

if [ -d "node_modules" ]; then
  echo "-> Verificando boundaries"
  npm run check:boundaries
  echo "-> Verificando tipos"
  npm run typecheck
else
  echo "Aviso: no hay node_modules/ -- corre check:boundaries y typecheck manualmente."
fi

echo ""
echo "Listo. AMVReading declarado, cero logica de traduccion todavia."
echo "Para commitear:"
echo "  git add src/lib/sfi/cognitive-runtime/amvReading.ts"
echo "  git commit -m \"feat(cognitive-runtime): ADR-004 -- AMVReading contract\""
