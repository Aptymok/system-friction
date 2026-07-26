import type { AMVReading, AMVReadingKind } from './amvReading';
import { createCognitiveEvent, type CognitiveEvent } from './cognitiveEvent';

/**
 * PhenomenonRelay (ADR-001/004/005) -- the only bridge between AMV and the
 * Cognitive Runtime. Pure translation: AMVReading -> CognitiveEvent<AMVReading>.
 *
 * What this deliberately does NOT do:
 * - Does not decide anything (no risk/route/opportunity logic -- that is
 *   risk_agent / opportunity_agent / meta_orchestrator, per ADR-001/002).
 * - Does not persist anything (does not call appendEpistemicEvent -- per
 *   ADR-002/003, only the Runtime writes institutional memory; this function
 *   returns a value, the caller decides whether and how to persist it).
 * - Is not an agent (ADR-003 corollary: no `emits` entry in registry.ts, no
 *   authorityLevel, no contract). It is a function, not a cognitive unit.
 *
 * logbookId is a required parameter, not generated here -- it belongs to the
 * active cognitive cycle (ADR-007), which this function has no way to know on
 * its own and must not invent one for.
 */

const AMV_READING_EVENT_NAMES: Record<AMVReadingKind, string> = {
  evidence_assessment: 'SFI_AMV_EVIDENCE_ASSESSMENT_RELAYED',
  graph_state: 'SFI_AMV_GRAPH_STATE_RELAYED',
};

/**
 * Neither live AMVReading shape carries a calibrated confidence number today:
 * AmvEvidenceAgentResult (evidenceAgent) drops the source evidence's own optional
 * `confidence` field entirely, and AmvGraphState (amvGraphBuilder) never had one.
 * This is an explicit, documented placeholder -- neutral, not a judgment call --
 * not a scoring formula invented here. Giving AMV readings a real confidence
 * number is separate future work (surfacing evidence's own confidence through
 * evaluateAmvEvidence, or reality_calibration scoring it after the fact), not
 * something a pure relay should compute.
 */
const UNCALIBRATED_CONFIDENCE_PLACEHOLDER = 0.5;

export function relayPhenomenonReading(reading: AMVReading, logbookId: string): CognitiveEvent<AMVReading> {
  return createCognitiveEvent<AMVReading>({
    eventName: AMV_READING_EVENT_NAMES[reading.kind],
    epistemicClass: 'derived',
    confidence: UNCALIBRATED_CONFIDENCE_PLACEHOLDER,
    payload: reading,
    logbookId,
    source: { sourceId: 'AMV', sourceType: reading.producedBy },
    lineage: ['amv', reading.scope, reading.producedBy],
  });
}