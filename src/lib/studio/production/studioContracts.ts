export type MetricStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'OBSERVED'
  | 'DERIVED'
  | 'DEGRADED'
  | 'MISSING'
  | 'FAILED'
  | 'COMPLETE'
  | 'EXPERIMENTAL';

export type MetricValue = {
  key: string;
  label: string;
  value: number | string | null;
  unit: string | null;
  status: MetricStatus;
  source: string | null;
  evidenceIds: string[];
  confidence: number;
  observedAt: string | null;
  formulaVersion: string | null;
  warnings: string[];
  explanation: string;
};

export type PhaseState = {
  key: string;
  label: string;
  status: MetricStatus;
  progress: number | null;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  details: string | null;
  nextAction: string | null;
  requirements: string[];
};

export type EvidenceRef = {
  id: string;
  type: string;
  source: string;
  label: string;
  observedAt: string | null;
  reliability: number;
  uri: string | null;
};

export type ViewContract = {
  key: string;
  title: string;
  purpose: string;
  inputs: string[];
  outputs: string[];
  requiredEvidence: string[];
  status: MetricStatus;
  blockedReason: string | null;
};

export type StudioFieldNode = {
  id: string;
  label: string;
  type: 'object' | 'metric' | 'phase' | 'evidence' | 'hypothesis' | 'tension' | 'domain';
  value: number | string | null;
  status: MetricStatus;
  source: string | null;
  formulaVersion: string | null;
  confidence: number;
  explanation: string;
  evidenceIds: string[];
};

export type StudioFieldEdge = {
  from: string;
  to: string;
  relationType: string;
  weight: number | null;
  source: string | null;
  confidence: number;
  explanation: string;
};

export type StudioNextAction = {
  code: string;
  action: string;
  reason: string;
  requirement: string | null;
  endpoint: string | null;
  method: 'GET' | 'POST' | null;
  disabledReason: string | null;
};

export function clampConfidence(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(1, parsed > 1 ? parsed / 100 : parsed));
}

export function missingMetric(key: string, label: string, explanation: string, requirements: string[] = []): MetricValue {
  return {
    key,
    label,
    value: null,
    unit: null,
    status: 'MISSING',
    source: null,
    evidenceIds: [],
    confidence: 0,
    observedAt: null,
    formulaVersion: null,
    warnings: requirements,
    explanation,
  };
}

export function observedMetric(input: {
  key: string;
  label: string;
  value: number | string | null;
  unit?: string | null;
  source: string;
  evidenceIds?: string[];
  confidence?: number | null;
  observedAt?: string | null;
  formulaVersion?: string | null;
  warnings?: string[];
  explanation: string;
}): MetricValue {
  return {
    key: input.key,
    label: input.label,
    value: input.value,
    unit: input.unit ?? null,
    status: input.value === null ? 'MISSING' : 'OBSERVED',
    source: input.value === null ? null : input.source,
    evidenceIds: input.evidenceIds ?? [],
    confidence: clampConfidence(input.confidence ?? (input.value === null ? 0 : 1)),
    observedAt: input.observedAt ?? null,
    formulaVersion: input.formulaVersion ?? null,
    warnings: input.warnings ?? [],
    explanation: input.explanation,
  };
}

export function derivedMetric(input: Omit<Parameters<typeof observedMetric>[0], 'source'> & { source: string; status?: MetricStatus }): MetricValue {
  const metric = observedMetric(input);
  return { ...metric, status: input.value === null ? 'MISSING' : input.status ?? 'DERIVED' };
}

export function phase(input: Partial<PhaseState> & { key: string; label: string; status: MetricStatus }): PhaseState {
  return {
    key: input.key,
    label: input.label,
    status: input.status,
    progress: input.progress ?? null,
    startedAt: input.startedAt ?? null,
    completedAt: input.completedAt ?? null,
    error: input.error ?? null,
    details: input.details ?? null,
    nextAction: input.nextAction ?? null,
    requirements: input.requirements ?? [],
  };
}
