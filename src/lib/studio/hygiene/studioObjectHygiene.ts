export type StudioLifecycleClass =
  | 'ACTIVE'
  | 'CANONICAL'
  | 'HISTORICAL_REFERENCE'
  | 'DEV_TEST'
  | 'DEMO'
  | 'EXPERIMENT'
  | 'DISPOSABLE'
  | 'REVIEW_REQUIRED';

export type StudioMaterializationState =
  | 'BINARY_RETRIEVABLE_BY_REFERENCE'
  | 'IDENTITY_ONLY'
  | 'NOT_MATERIALIZED'
  | 'UNKNOWN';

export type StudioContentIdentity = {
  state: 'VERIFIED_HASH' | 'UNVERIFIED';
  hash: string | null;
  algorithm: 'sha256' | null;
};

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
    : [];
}

export function studioContentHash(metadataValue: unknown): string | null {
  const metadata = record(metadataValue);
  const hygiene = record(metadata.hygiene);
  const declaredIdentity = record(hygiene.contentIdentity);
  const declaredHash = text(declaredIdentity.hash);
  if (declaredHash && /^[0-9a-f]{64}$/i.test(declaredHash)) return declaredHash.toLowerCase();
  const engine = record(metadata.studioAudioEngine);
  const direct = text(engine.checksumSha256) ?? text(metadata.contentHash) ?? text(metadata.checksumSha256);
  if (direct && /^[0-9a-f]{64}$/i.test(direct)) return direct.toLowerCase();
  const idempotency = text(engine.idempotencyKey) ?? text(metadata.idempotencyKey);
  const match = idempotency?.match(/(?:^|:)([0-9a-f]{64})(?::|$)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export function studioMaterializationState(rowValue: unknown): StudioMaterializationState {
  const row = record(rowValue);
  const metadata = record(row.metadata);
  const hygiene = record(metadata.hygiene);
  const declared = text(hygiene.materializationState) as StudioMaterializationState | null;
  if (declared && ['BINARY_RETRIEVABLE_BY_REFERENCE', 'IDENTITY_ONLY', 'NOT_MATERIALIZED', 'UNKNOWN'].includes(declared)) return declared;
  const storageState = text(metadata.storageState)?.toUpperCase() ?? '';
  if (storageState.includes('NOT_MATERIALIZED')) return 'IDENTITY_ONLY';
  if (text(row.source_uri)) return 'BINARY_RETRIEVABLE_BY_REFERENCE';
  if (text(metadata.canonicalState)) return 'IDENTITY_ONLY';
  return 'UNKNOWN';
}

export function studioLifecycleClass(rowValue: unknown): StudioLifecycleClass {
  const row = record(rowValue);
  const metadata = record(row.metadata);
  const hygiene = record(metadata.hygiene);
  const declared = text(hygiene.lifecycleClass) as StudioLifecycleClass | null;
  if (declared && ['ACTIVE', 'CANONICAL', 'HISTORICAL_REFERENCE', 'DEV_TEST', 'DEMO', 'EXPERIMENT', 'DISPOSABLE', 'REVIEW_REQUIRED'].includes(declared)) return declared;
  const title = text(row.title)?.toLowerCase() ?? '';
  if (title.startsWith('debug ')) return 'DEV_TEST';
  if (text(metadata.canonicalState)) return 'CANONICAL';
  if (text(row.status)?.toLowerCase() === 'archived') return 'HISTORICAL_REFERENCE';
  return 'ACTIVE';
}

export function studioContentIdentity(metadataValue: unknown): StudioContentIdentity {
  const hash = studioContentHash(metadataValue);
  return hash
    ? { state: 'VERIFIED_HASH', hash, algorithm: 'sha256' }
    : { state: 'UNVERIFIED', hash: null, algorithm: null };
}

export function studioTraceSemantics(metadataValue: unknown) {
  const metadata = record(metadataValue);
  const hygiene = record(metadata.hygiene);
  const declaredTrace = record(hygiene.trace);
  const synthesis = record(metadata.objectContextSynthesis);
  const traceId = text(declaredTrace.id) ?? text(synthesis.traceId) ?? text(synthesis.evidenceTraceId);
  return traceId
    ? { id: traceId, class: 'TECHNICAL_LINEAGE' as const, epistemicAuthority: 'NONE' as const }
    : null;
}

export function studioOperatorFeedback(metadataValue: unknown) {
  const metadata = record(metadataValue);
  const context = record(metadata.context);
  const feedback = record(context.operatorFeedback);
  return {
    uxFriction: stringList(feedback.uxFriction),
    supportNeed: stringList(feedback.supportNeed),
    notes: stringList(feedback.notes),
  };
}

export function studioCreativeConstraints(metadataValue: unknown) {
  const metadata = record(metadataValue);
  const context = record(metadata.context);
  const constraints = record(context.creativeConstraints);
  return stringList(constraints.prohibitedEffects ?? context.prohibitedEffects);
}

export function buildStudioObjectHygiene(rowValue: unknown) {
  const row = record(rowValue);
  const metadata = record(row.metadata);
  const lifecycleClass = studioLifecycleClass(row);
  const contentIdentity = studioContentIdentity(metadata);
  const materializationState = studioMaterializationState(row);
  const trace = studioTraceSemantics(metadata);
  const operationalVisibility = lifecycleClass === 'ACTIVE' || lifecycleClass === 'CANONICAL'
    ? 'VISIBLE_BY_DEFAULT'
    : 'EXCLUDED_BY_DEFAULT';

  return {
    contract: 'SFI-STUDIO-HYGIENE-1.0',
    lifecycleClass,
    operationalVisibility,
    contentIdentity,
    materializationState,
    canonicalIdentityVerified: Boolean(text(metadata.canonicalState)),
    binaryRetrievable: materializationState === 'BINARY_RETRIEVABLE_BY_REFERENCE',
    trace,
  };
}

function projectedSynthesis(metadata: Row) {
  const synthesis = record(metadata.objectContextSynthesis);
  if (!Object.keys(synthesis).length) return synthesis;
  const { evidenceTraceId: _legacyEvidenceTraceId, ...rest } = synthesis;
  const trace = studioTraceSemantics(metadata);
  return {
    ...rest,
    traceId: trace?.id ?? null,
    traceClass: trace?.class ?? null,
    epistemicAuthority: trace?.epistemicAuthority ?? 'NONE',
    semanticBoundary: 'TRACE_ONLY: technical lineage is not accepted institutional evidence.',
  };
}

export function projectStudioObjectForHumans(rowValue: unknown) {
  const row = record(rowValue);
  const metadata = record(row.metadata);
  return {
    ...row,
    metadata: {
      ...metadata,
      hygiene: buildStudioObjectHygiene(row),
      objectContextSynthesis: projectedSynthesis(metadata),
      context: {
        ...record(metadata.context),
        prohibitedEffects: studioCreativeConstraints(metadata),
        creativeConstraints: { prohibitedEffects: studioCreativeConstraints(metadata) },
        operatorFeedback: studioOperatorFeedback(metadata),
      },
    },
  };
}
