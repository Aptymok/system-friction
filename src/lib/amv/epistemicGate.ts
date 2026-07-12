import 'server-only';

export type AmvObjectClass =
  | 'music'
  | 'article'
  | 'social_post'
  | 'website'
  | 'institution'
  | 'company'
  | 'ai_response'
  | 'historical_event'
  | 'cultural_signal'
  | 'person'
  | 'organization'
  | 'movement'
  | 'other';

export type AmvPredictionGate = {
  objectClass: AmvObjectClass;
  consent: {
    required: boolean;
    documented: boolean;
    evidenceId: string | null;
    evidenceNote: string | null;
  };
  phase1: {
    state: 'COMPLETE' | 'PARTIAL' | 'BLOCKED';
    mihmStatus: string;
    coreCoverage: number;
  };
  phase2: {
    state: 'COMPLETE' | 'PARTIAL' | 'BLOCKED';
    fieldCoverage: number;
    worldConfidence: number;
    evidenceCount: number;
    externalEvidenceCount: number;
    externalEvidenceCoverage: number;
    missingExternalKeys: string[];
    missingDimensions: string[];
  };
  state: 'READY_PROVISIONAL' | 'EXPERIMENTAL_INSUFFICIENT_EVIDENCE' | 'CONSENT_REQUIRED';
  blockers: string[];
  epistemicLabel: 'PROVISIONAL_NO_HISTORICAL_CALIBRATION' | 'EXPERIMENTAL_INSUFFICIENT_EVIDENCE' | 'CONSENT_REQUIRED';
};

type GateInput = {
  objectType: unknown;
  metadata: unknown;
  mihmStatus: string;
  mihmCoreCoverage: number;
  fieldCoverage: number;
  worldConfidence: number;
  evidenceIds: string[];
  missingDimensions: string[];
  externalEvidenceCount?: number;
  externalEvidenceCoverage?: number;
  missingExternalKeys?: string[];
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function clamp01(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0;
}

export function normalizeAmvObjectClass(value: unknown): AmvObjectClass {
  const raw = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['music', 'audio', 'song', 'track'].includes(raw)) return 'music';
  if (['article', 'text', 'essay', 'medium_post', 'publication'].includes(raw)) return 'article';
  if (['social_post', 'instagram', 'tiktok', 'reel', 'short_video'].includes(raw)) return 'social_post';
  if (['website', 'site', 'web'].includes(raw)) return 'website';
  if (['institution', 'institute'].includes(raw)) return 'institution';
  if (['company', 'brand', 'business'].includes(raw)) return 'company';
  if (['ai_response', 'llm_response', 'model_response'].includes(raw)) return 'ai_response';
  if (['historical_event', 'event', 'world_event'].includes(raw)) return 'historical_event';
  if (['cultural_signal', 'signal', 'cultural_object'].includes(raw)) return 'cultural_signal';
  if (['person', 'individual', 'human'].includes(raw)) return 'person';
  if (['organization', 'organisation'].includes(raw)) return 'organization';
  if (['movement', 'cultural_movement', 'social_movement'].includes(raw)) return 'movement';
  return 'other';
}

export function readAmvConsent(metadataValue: unknown, objectClass: AmvObjectClass) {
  const metadata = record(metadataValue);
  const consent = record(metadata.amvConsent ?? metadata.consent);
  const required = objectClass === 'person' || objectClass === 'organization' || objectClass === 'movement';
  const evidenceId = text(consent.evidenceId ?? consent.evidence_id);
  const evidenceNote = text(consent.evidenceNote ?? consent.evidence_note);
  const documented = consent.documented === true && Boolean(evidenceNote);
  return { required, documented, evidenceId, evidenceNote };
}

export function buildAmvPredictionGate(input: GateInput): AmvPredictionGate {
  const objectClass = normalizeAmvObjectClass(input.objectType);
  const consent = readAmvConsent(input.metadata, objectClass);
  const coreCoverage = clamp01(input.mihmCoreCoverage);
  const fieldCoverage = clamp01(input.fieldCoverage);
  const worldConfidence = clamp01(input.worldConfidence);
  const evidenceCount = Array.from(new Set(input.evidenceIds.filter(Boolean))).length;
  const externalEvidenceCount = Math.max(0, Number(input.externalEvidenceCount ?? 0));
  const externalEvidenceCoverage = clamp01(input.externalEvidenceCoverage ?? 0);
  const missingExternalKeys = Array.from(new Set((input.missingExternalKeys ?? []).filter(Boolean)));
  const missingDimensions = Array.from(new Set(input.missingDimensions.filter(Boolean)));

  const phase1Complete = input.mihmStatus === 'VALID' && coreCoverage >= 0.999;
  const phase1State: AmvPredictionGate['phase1']['state'] = phase1Complete
    ? 'COMPLETE'
    : coreCoverage > 0
      ? 'PARTIAL'
      : 'BLOCKED';

  const phase2Complete = fieldCoverage >= 0.667
    && worldConfidence >= 0.25
    && evidenceCount > 0
    && externalEvidenceCount > 0
    && externalEvidenceCoverage >= 0.999;
  const phase2State: AmvPredictionGate['phase2']['state'] = phase2Complete
    ? 'COMPLETE'
    : fieldCoverage > 0 || evidenceCount > 0 || externalEvidenceCount > 0
      ? 'PARTIAL'
      : 'BLOCKED';

  const blockers: string[] = [];
  if (consent.required && !consent.documented) blockers.push('CONSENT_EVIDENCE_REQUIRED');
  if (!phase1Complete) blockers.push('PHASE_1_INTERNAL_SIGNAL_INCOMPLETE');
  if (!phase2Complete) blockers.push('PHASE_2_EXTERNAL_EVIDENCE_INCOMPLETE');
  if (!externalEvidenceCount) blockers.push('NO_EXTERNAL_EVIDENCE_OBSERVATIONS');
  if (missingExternalKeys.length) blockers.push(...missingExternalKeys.map((item) => `MISSING_EXTERNAL_EVIDENCE:${item}`));
  if (missingDimensions.length) blockers.push(...missingDimensions.map((item) => `MISSING_DIMENSION:${item}`));

  const state: AmvPredictionGate['state'] = consent.required && !consent.documented
    ? 'CONSENT_REQUIRED'
    : phase1Complete && phase2Complete
      ? 'READY_PROVISIONAL'
      : 'EXPERIMENTAL_INSUFFICIENT_EVIDENCE';

  return {
    objectClass,
    consent,
    phase1: {
      state: phase1State,
      mihmStatus: input.mihmStatus,
      coreCoverage,
    },
    phase2: {
      state: phase2State,
      fieldCoverage,
      worldConfidence,
      evidenceCount,
      externalEvidenceCount,
      externalEvidenceCoverage,
      missingExternalKeys,
      missingDimensions,
    },
    state,
    blockers,
    epistemicLabel: state === 'READY_PROVISIONAL'
      ? 'PROVISIONAL_NO_HISTORICAL_CALIBRATION'
      : state,
  };
}

export class AmvEpistemicGateError extends Error {
  readonly code: AmvPredictionGate['state'];
  readonly gate: AmvPredictionGate;

  constructor(gate: AmvPredictionGate) {
    super(`${gate.state}:${gate.blockers.join(',') || 'gate_closed'}`);
    this.name = 'AmvEpistemicGateError';
    this.code = gate.state;
    this.gate = gate;
  }
}

export function assertAmvPredictionGate(gate: AmvPredictionGate): void {
  if (gate.state !== 'READY_PROVISIONAL') throw new AmvEpistemicGateError(gate);
}
