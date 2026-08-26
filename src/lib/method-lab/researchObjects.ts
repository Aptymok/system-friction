import 'server-only';

import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { recordValue, sha256 } from '@/lib/operational/common';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const METHOD_LAB_RESEARCH_METADATA_KIND = 'METHOD_LAB_RESEARCH_OBJECT';

export type MethodLabResearchObjectClass = 'AUDIT' | 'RESEARCH' | 'SPECIFICATION' | 'DERIVATIVE' | 'CASE';
export type MethodLabResearchEpistemicState = 'OBSERVED' | 'DERIVED' | 'MIXED' | 'NOT_TESTED' | 'FROZEN_CANDIDATE' | 'WITHHELD';
export type MethodLabResearchPublicationState = 'PRIVATE' | 'WORKING' | 'PUBLIC_DERIVATIVE_READY' | 'PROMOTION_REQUESTED' | 'HUB_PUBLISHED' | 'RELEASE_CANDIDATE' | 'RELEASED';
export type MethodLabResearchReturnState = 'NOT_APPLICABLE' | 'PENDING' | 'OBSERVED' | 'VERIFIED';

export type MethodLabFinding = {
  id: string;
  title: string;
  state: 'OBSERVED' | 'DERIVED' | 'INFERRED' | 'UNVERIFIED' | 'CONTRADICTED';
  summary: string;
  evidenceRefs: string[];
};

export type MethodLabResearchObject = {
  objectId: string;
  objectClass: MethodLabResearchObjectClass;
  title: string;
  publicTitle: string;
  objective: string;
  method: string;
  state: string;
  epistemicState: MethodLabResearchEpistemicState;
  returnState: MethodLabResearchReturnState;
  publicationState: MethodLabResearchPublicationState;
  summary: string;
  publicSummary: string;
  confidence: number | null;
  evidenceRefs: string[];
  findings: MethodLabFinding[];
  publicFindings: MethodLabFinding[];
  metrics: Record<string, string | number | boolean | null>;
  publicMetrics: Record<string, string | number | boolean | null>;
  limitations: string[];
  publicLimitations: string[];
  lineage: string[];
  version: string;
  source: 'METHOD_LAB' | 'HUB_BOOTSTRAP' | 'EXTERNAL_AGENT';
  updatedAt: string | null;
};

export type MethodLabResearchState = {
  generatedAt: string;
  sourceOfTruth: 'METHOD_LAB_EVENT_LEDGER';
  publicationRule: string;
  transportRule: string;
  objects: MethodLabResearchObject[];
  warnings: string[];
};

type Row = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()) : [];
}

function finiteConfidence(value: unknown): number | null {
  const candidate = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(candidate) && candidate >= 0 && candidate <= 1 ? candidate : null;
}

function findingList(value: unknown): MethodLabFinding[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const row = recordValue(item);
    const state = text(row.state);
    return {
      id: text(row.id) || `F${String(index + 1).padStart(3, '0')}`,
      title: text(row.title) || 'Untitled finding',
      state: ['OBSERVED', 'DERIVED', 'INFERRED', 'UNVERIFIED', 'CONTRADICTED'].includes(state) ? state as MethodLabFinding['state'] : 'UNVERIFIED',
      summary: text(row.summary),
      evidenceRefs: stringList(row.evidenceRefs),
    };
  });
}

function metricRecord(value: unknown): MethodLabResearchObject['metrics'] {
  const row = recordValue(value);
  return Object.fromEntries(Object.entries(row).filter(([, item]) => ['string', 'number', 'boolean'].includes(typeof item) || item === null)) as MethodLabResearchObject['metrics'];
}

const BOOTSTRAP_OBJECTS: MethodLabResearchObject[] = [
  {
    objectId: 'SFI-A', objectClass: 'RESEARCH', title: 'Individuation as a Measurement Problem', publicTitle: 'Individuation as a Measurement Problem',
    objective: 'Test whether operational identity can be reconstructed from boundary and persistence relations.', method: 'PROTOCOL-A-001', state: 'PROTOCOL_DESIGNED', epistemicState: 'NOT_TESTED', returnState: 'NOT_APPLICABLE', publicationState: 'WORKING',
    summary: 'Protocol designed; empirical execution remains pending.', publicSummary: 'Protocol designed; empirical execution remains pending.', confidence: null, evidenceRefs: [], findings: [], publicFindings: [], metrics: {}, publicMetrics: {}, limitations: ['No empirical result registered.'], publicLimitations: ['No empirical result registered.'], lineage: ['SFI_RESEARCH_HUB:01_INDIVIDUATION'], version: '0.1', source: 'HUB_BOOTSTRAP', updatedAt: null,
  },
  {
    objectId: 'SFI-B', objectClass: 'RESEARCH', title: 'From AI Governance to AI Observability', publicTitle: 'From AI Governance to AI Observability',
    objective: 'Test whether governance artifacts suffice to reconstruct human-AI state transitions.', method: 'PROTOCOL-B-001', state: 'PROTOCOL_DESIGNED', epistemicState: 'NOT_TESTED', returnState: 'NOT_APPLICABLE', publicationState: 'WORKING',
    summary: 'Protocol designed; no empirical result has been registered.', publicSummary: 'Protocol designed; no empirical result has been registered.', confidence: null, evidenceRefs: [], findings: [], publicFindings: [], metrics: {}, publicMetrics: {}, limitations: ['SFI-B requires bounded human-AI workflow episodes.'], publicLimitations: ['SFI-B requires bounded human-AI workflow episodes.'], lineage: ['SFI_RESEARCH_HUB:02_AI_OBSERVABILITY'], version: '0.1', source: 'HUB_BOOTSTRAP', updatedAt: null,
  },
  {
    objectId: 'SFI-C0', objectClass: 'SPECIFICATION', title: 'System Friction Theory — Initial Falsifiable Specification', publicTitle: 'System Friction Theory — Initial Falsifiable Specification',
    objective: 'Preserve prospective falsifiable claims before eligible empirical evaluation.', method: 'PROTOCOL-C0-001', state: 'FROZEN_CANDIDATE', epistemicState: 'FROZEN_CANDIDATE', returnState: 'NOT_APPLICABLE', publicationState: 'WORKING',
    summary: 'Prospective specification; not validated theory.', publicSummary: 'Prospective specification; not validated theory.', confidence: null, evidenceRefs: [], findings: [], publicFindings: [], metrics: {}, publicMetrics: {}, limitations: ['Must not be described as validated theory.'], publicLimitations: ['Must not be described as validated theory.'], lineage: ['SFI_RESEARCH_HUB:03_SYSTEM_FRICTION_THEORY'], version: '0.1', source: 'HUB_BOOTSTRAP', updatedAt: null,
  },
  {
    objectId: 'SFI-C1', objectClass: 'SPECIFICATION', title: 'System Friction Theory — Theoretical Synthesis', publicTitle: 'System Friction Theory — Theoretical Synthesis',
    objective: 'Hold the later theoretical synthesis until prospective and adversarial evidence exists.', method: 'THEORETICAL_SYNTHESIS', state: 'WITHHELD', epistemicState: 'WITHHELD', returnState: 'NOT_APPLICABLE', publicationState: 'PRIVATE',
    summary: 'Withheld theoretical synthesis.', publicSummary: 'Withheld theoretical synthesis.', confidence: null, evidenceRefs: [], findings: [], publicFindings: [], metrics: {}, publicMetrics: {}, limitations: ['Not a public empirical claim.'], publicLimitations: ['Not a public empirical claim.'], lineage: ['SFI_RESEARCH_HUB:03_SYSTEM_FRICTION_THEORY'], version: '0.1', source: 'HUB_BOOTSTRAP', updatedAt: null,
  },
  {
    objectId: 'SFI-CHI27', objectClass: 'DERIVATIVE', title: 'CHI 2027 submission derivative', publicTitle: 'CHI 2027 submission derivative',
    objective: 'Prepare an HCI contribution that stands independently of accepting System Friction Theory.', method: 'VENUE_DERIVATIVE', state: 'CANDIDATE', epistemicState: 'NOT_TESTED', returnState: 'NOT_APPLICABLE', publicationState: 'PRIVATE',
    summary: 'Venue-specific candidate; contribution lock pending.', publicSummary: 'Venue-specific candidate.', confidence: null, evidenceRefs: [], findings: [], publicFindings: [], metrics: {}, publicMetrics: {}, limitations: ['Anonymous review boundary must be preserved.'], publicLimitations: ['Anonymous review boundary must be preserved.'], lineage: ['SFI_RESEARCH_HUB:04_CHI_2027'], version: '0.1', source: 'HUB_BOOTSTRAP', updatedAt: null,
  },
  {
    objectId: 'SFI-AUDIT-0001', objectClass: 'AUDIT', title: 'SFI Audit 0001 — INEGI warranty workflow', publicTitle: 'SFI Audit 0001 — Observability, Authority, and Post-Expiration Recovery in a Public-Sector Warranty Workflow',
    objective: 'Reconstruct a bounded warranty-management workflow and test whether structured state is sufficient to recover operational state, authority, deadlines, interventions and return.', method: 'SFI_AUDIT', state: 'FINDINGS_REGISTERED', epistemicState: 'MIXED', returnState: 'PENDING', publicationState: 'PUBLIC_DERIVATIVE_READY',
    summary: 'Retrolongitudinal reconstruction of 2,458 warranty records. Operational state, deadline regimes, authority gaps, post-expiration latency and timestamp semantic collisions were identified.',
    publicSummary: 'A bounded public-sector warranty workflow was reconstructed from de-identified operational evidence to compare structured system state with recoverable operational state.',
    confidence: 0.92,
    evidenceRefs: ['SFI_AUDIT_0001_MASTER:sha256:8a558e93d515caf70bdfe9a0c12d92dcb1ca33f0c50c8ba90d565275f308ea8f'],
    findings: [
      { id: 'F001', title: 'Structured state is insufficient', state: 'OBSERVED', summary: 'PENDIENTE/CERRADO does not reconstruct the operational trajectory or authority handoffs.', evidenceRefs: [] },
      { id: 'F002', title: 'Unresolved post-expiration backlog', state: 'DERIVED', summary: '36 cases explicitly recorded an expired repair period while remaining operationally open in the observed source.', evidenceRefs: [] },
      { id: 'F003', title: 'Contract clocks are not universal', state: 'OBSERVED', summary: 'Observed warranty traces contain contract-specific 30-day, 20-day and 10-business-day regimes.', evidenceRefs: [] },
      { id: 'F004', title: 'Post-expiration recovery latency', state: 'DERIVED', summary: 'In the temporally valid resolved cohort, median post-expiration resolution latency is approximately 51 days and P90 approximately 120 days.', evidenceRefs: [] },
      { id: 'F005', title: 'Repair timestamp semantic collision', state: 'OBSERVED', summary: 'FECHA_EQUIPO_REPARADO sometimes records delivery of a backup asset rather than definitive repair or replacement.', evidenceRefs: [] },
      { id: 'F006', title: 'Resolution cohorting', state: 'DERIVED', summary: 'Definitive resolutions cluster in visible batches rather than behaving only as independent ticket closures.', evidenceRefs: [] },
    ],
    publicFindings: [
      { id: 'F001', title: 'Structured state is insufficient', state: 'OBSERVED', summary: 'The coarse structured case state does not reconstruct the full operational trajectory or authority handoffs.', evidenceRefs: [] },
      { id: 'F002', title: 'Unresolved post-expiration backlog', state: 'DERIVED', summary: '36 observed cases explicitly recorded an expired repair period while remaining open in the source at observation time.', evidenceRefs: [] },
      { id: 'F003', title: 'Contract clocks are not universal', state: 'OBSERVED', summary: 'Observed traces contain multiple contract-specific temporal regimes rather than one universal deadline.', evidenceRefs: [] },
      { id: 'F004', title: 'Post-expiration recovery latency', state: 'DERIVED', summary: 'In the temporally valid resolved cohort, median post-expiration resolution latency is approximately 51 days and P90 approximately 120 days.', evidenceRefs: [] },
      { id: 'F005', title: 'Repair timestamp semantic collision', state: 'OBSERVED', summary: 'A structured repair timestamp is used for more than one operational event and cannot serve as a canonical resolution clock without disambiguation.', evidenceRefs: [] },
      { id: 'F006', title: 'Resolution cohorting', state: 'DERIVED', summary: 'Definitive resolutions visibly cluster in batches rather than behaving only as independent ticket closures.', evidenceRefs: [] },
    ],
    metrics: { source_records: 2458, expired_open: 36, expired_closed_cohort: 120, temporally_valid_resolved: 112, temporal_exceptions: 8, median_post_expiration_days: 51, p90_post_expiration_days: 119.9, max_post_expiration_days: 206.8, overloaded_repair_timestamp_cases: 28 },
    publicMetrics: { source_records: 2458, expired_open: 36, expired_closed_cohort: 120, temporally_valid_resolved: 112, temporal_exceptions: 8, median_post_expiration_days: 51, p90_post_expiration_days: 119.9, max_post_expiration_days: 206.8, overloaded_repair_timestamp_cases: 28 },
    limitations: ['No raw institutional records may be published.', 'Contractual liability is not established without primary contract and annex evidence.', 'The audit does not validate SFI-B-H01 or System Friction Theory.'],
    publicLimitations: ['No raw institutional records are included.', 'The public derivative does not establish contractual liability.', 'The audit does not validate SFI-B-H01 or System Friction Theory.'],
    lineage: ['MAI', 'POWER_BI_SEMANTIC_MODEL', 'DAX_EXTRACTION', 'CANONICAL_EVENT_RECONSTRUCTION', 'SFI_AUDIT'], version: '1.0.0', source: 'HUB_BOOTSTRAP', updatedAt: '2026-08-26T00:00:00.000Z',
  },
];

export function normalizeMethodLabResearchObject(value: unknown, fallback?: MethodLabResearchObject): MethodLabResearchObject | null {
  const row = recordValue(value);
  const objectId = text(row.objectId) || fallback?.objectId || '';
  if (!objectId) return null;
  const objectClass = text(row.objectClass);
  const epistemicState = text(row.epistemicState);
  const returnState = text(row.returnState);
  const publicationState = text(row.publicationState);
  const source = text(row.source);
  return {
    objectId,
    objectClass: ['AUDIT', 'RESEARCH', 'SPECIFICATION', 'DERIVATIVE', 'CASE'].includes(objectClass) ? objectClass as MethodLabResearchObjectClass : fallback?.objectClass ?? 'CASE',
    title: text(row.title) || fallback?.title || objectId,
    publicTitle: text(row.publicTitle) || fallback?.publicTitle || text(row.title) || objectId,
    objective: text(row.objective) || fallback?.objective || '',
    method: text(row.method) || fallback?.method || 'UNSPECIFIED',
    state: text(row.state) || fallback?.state || 'CAPTURED',
    epistemicState: ['OBSERVED', 'DERIVED', 'MIXED', 'NOT_TESTED', 'FROZEN_CANDIDATE', 'WITHHELD'].includes(epistemicState) ? epistemicState as MethodLabResearchEpistemicState : fallback?.epistemicState ?? 'DERIVED',
    returnState: ['NOT_APPLICABLE', 'PENDING', 'OBSERVED', 'VERIFIED'].includes(returnState) ? returnState as MethodLabResearchReturnState : fallback?.returnState ?? 'NOT_APPLICABLE',
    publicationState: ['PRIVATE', 'WORKING', 'PUBLIC_DERIVATIVE_READY', 'PROMOTION_REQUESTED', 'HUB_PUBLISHED', 'RELEASE_CANDIDATE', 'RELEASED'].includes(publicationState) ? publicationState as MethodLabResearchPublicationState : fallback?.publicationState ?? 'PRIVATE',
    summary: text(row.summary) || fallback?.summary || '',
    publicSummary: text(row.publicSummary) || fallback?.publicSummary || text(row.summary) || '',
    confidence: finiteConfidence(row.confidence) ?? fallback?.confidence ?? null,
    evidenceRefs: stringList(row.evidenceRefs).length ? stringList(row.evidenceRefs) : fallback?.evidenceRefs ?? [],
    findings: Array.isArray(row.findings) ? findingList(row.findings) : fallback?.findings ?? [],
    publicFindings: Array.isArray(row.publicFindings) ? findingList(row.publicFindings) : fallback?.publicFindings ?? [],
    metrics: Object.keys(metricRecord(row.metrics)).length ? metricRecord(row.metrics) : fallback?.metrics ?? {},
    publicMetrics: Object.keys(metricRecord(row.publicMetrics)).length ? metricRecord(row.publicMetrics) : fallback?.publicMetrics ?? {},
    limitations: stringList(row.limitations).length ? stringList(row.limitations) : fallback?.limitations ?? [],
    publicLimitations: stringList(row.publicLimitations).length ? stringList(row.publicLimitations) : fallback?.publicLimitations ?? [],
    lineage: stringList(row.lineage).length ? stringList(row.lineage) : fallback?.lineage ?? [],
    version: text(row.version) || fallback?.version || '0.1.0',
    source: ['METHOD_LAB', 'HUB_BOOTSTRAP', 'EXTERNAL_AGENT'].includes(source) ? source as MethodLabResearchObject['source'] : fallback?.source ?? 'METHOD_LAB',
    updatedAt: text(row.updatedAt) || fallback?.updatedAt || null,
  };
}

function extractResearchObjectFromEvent(event: Row): MethodLabResearchObject | null {
  const payload = recordValue(event.payload);
  const metadata = recordValue(payload.metadata);
  const dedicated = recordValue(payload.researchObject);
  const candidate = text(metadata.kind) === METHOD_LAB_RESEARCH_METADATA_KIND ? recordValue(metadata.researchObject) : dedicated;
  if (!Object.keys(candidate).length) return null;
  return normalizeMethodLabResearchObject({ ...candidate, source: text(candidate.source) || (text(event.event_name) === 'external.method_lab.record.persisted' ? 'EXTERNAL_AGENT' : 'METHOD_LAB'), updatedAt: text(event.occurred_at) || text(event.created_at) || null });
}

export async function readMethodLabResearchState(limit = 500): Promise<MethodLabResearchState> {
  const db = createServiceSupabaseClient();
  const { data, error } = await db.from('epistemic_events')
    .select('id,event_name,payload,lineage,occurred_at,created_at,sequence')
    .in('event_name', ['external.method_lab.record.persisted', 'method_lab.research_object.snapshot.persisted'])
    .order('sequence', { ascending: false })
    .limit(Math.min(Math.max(limit, 20), 1000));

  const objects = new Map(BOOTSTRAP_OBJECTS.map((item) => [item.objectId, item]));
  for (const event of ([...(data ?? [])].reverse()) as Row[]) {
    const candidate = extractResearchObjectFromEvent(event);
    if (!candidate) continue;
    const current = objects.get(candidate.objectId);
    const normalized = normalizeMethodLabResearchObject(candidate, current);
    if (normalized) objects.set(normalized.objectId, normalized);
  }

  return {
    generatedAt: new Date().toISOString(),
    sourceOfTruth: 'METHOD_LAB_EVENT_LEDGER',
    publicationRule: 'Method Lab persists continuously; the Research Hub changes only after an explicit governed promotion.',
    transportRule: 'ChatGPT, Gemini or Claude may persist/update research objects through /api/external/v1/lab and retrieve publication packages through report(objectId).',
    objects: [...objects.values()].sort((a, b) => a.objectId.localeCompare(b.objectId)),
    warnings: error ? [`epistemic_events:${error.message}`] : [],
  };
}

export async function persistMethodLabResearchObject(input: { object: MethodLabResearchObject; actorId: string; refs?: string[] }) {
  const normalized = normalizeMethodLabResearchObject({ ...input.object, source: 'METHOD_LAB', updatedAt: new Date().toISOString() });
  if (!normalized) return { ok: false as const, error: 'invalid_research_object' };
  const lineage = [...new Set([...(input.refs ?? []), ...normalized.evidenceRefs, ...normalized.lineage])];
  return appendEpistemicEvent({
    eventName: 'method_lab.research_object.snapshot.persisted',
    epistemicClass: normalized.epistemicState === 'OBSERVED' ? 'observed' : 'derived',
    confidence: normalized.confidence ?? 0,
    payload: { researchObject: normalized, actorId: input.actorId, objectHash: sha256(normalized), metadataKind: METHOD_LAB_RESEARCH_METADATA_KIND },
    occurredAt: new Date().toISOString(),
    source: { sourceId: 'SYSTEM_FRICTION_INSTITUTE', sourceType: 'operational_runtime' },
    logbookId: 'BR',
    lineage,
    uncertainty: normalized.confidence === null ? 'Research object confidence not explicitly assessed.' : undefined,
  });
}

function safePublicObject(object: MethodLabResearchObject) {
  return {
    objectId: object.objectId,
    objectClass: object.objectClass,
    title: object.publicTitle,
    method: object.method,
    state: object.state,
    epistemicState: object.epistemicState,
    returnState: object.returnState,
    publicationState: object.publicationState,
    summary: object.publicSummary,
    confidence: object.confidence,
    findings: object.publicFindings.map((finding) => ({ id: finding.id, title: finding.title, state: finding.state, summary: finding.summary })),
    metrics: object.publicMetrics,
    limitations: object.publicLimitations,
    lineage: object.lineage.map((item) => `sha256:${sha256(item)}`),
    version: object.version,
  };
}

function markdownFinding(finding: MethodLabFinding) {
  return `## ${finding.id} — ${finding.title}\n\nState: \`${finding.state}\`\n\n${finding.summary || 'No public summary supplied.'}`;
}

export function methodLabResearchHubTarget(object: MethodLabResearchObject) {
  const known: Record<string, string> = {
    'SFI-A': '01_INDIVIDUATION',
    'SFI-B': '02_AI_OBSERVABILITY',
    'SFI-C0': '03_SYSTEM_FRICTION_THEORY',
    'SFI-C1': '03_SYSTEM_FRICTION_THEORY',
    'SFI-CHI27': '04_CHI_2027',
  };
  if (known[object.objectId]) return known[object.objectId];
  if (object.objectClass === 'AUDIT') return `05_AUDITS/${object.objectId}`;
  return `05_RESEARCH_OBJECTS/${object.objectId}`;
}

export function buildMethodLabPublicationPackage(object: MethodLabResearchObject) {
  const publicObject = safePublicObject(object);
  const manifest = {
    schema: 'SFI-METHOD-LAB-RESEARCH-PACKAGE-1.0',
    generatedAt: object.updatedAt ?? `OBJECT_VERSION:${object.version}`,
    sourceOfTruth: 'METHOD_LAB_EVENT_LEDGER',
    promotionRequired: true,
    rawDataIncluded: false,
    object: publicObject,
  };
  const files = [
    {
      path: 'README.md',
      content: `# ${object.publicTitle}\n\n**Object:** ${object.objectId}\n\n**Method:** ${object.method}\n\n**State:** ${object.state}\n\n${object.publicSummary}\n\nThis package is a public derivative generated from Method Lab. Raw restricted evidence is not included.`,
    },
    {
      path: 'FINDINGS.md',
      content: `# Findings — ${object.objectId}\n\n${object.publicFindings.length ? object.publicFindings.map(markdownFinding).join('\n\n') : 'No public findings supplied.'}`,
    },
    {
      path: 'PUBLIC_TRACE.md',
      content: `# SFI / ${object.objectClass} / ${object.objectId}\n\n## Object\n${object.publicTitle}\n\n## Observed state\n${object.state}\n\n## Summary\n${object.publicSummary}\n\n## Return\n${object.returnState}\n\n## Confidence\n${object.confidence ?? 'UNASSESSED'}\n\n## What cannot be asserted\n${object.publicLimitations.map((item) => `- ${item}`).join('\n') || '- No public limitations supplied; release requires review.'}\n\n## Version / lineage\nVersion: ${object.version}\n\n${publicObject.lineage.map((item) => `- ${item}`).join('\n')}`,
    },
    { path: 'METRICS.json', content: JSON.stringify(object.publicMetrics, null, 2) },
    { path: 'PROVENANCE.md', content: `# Provenance — ${object.objectId}\n\n${publicObject.lineage.map((item, index) => `${index + 1}. ${item}`).join('\n') || 'No lineage registered.'}\n\nEvidence references retained by Method Lab: ${object.evidenceRefs.length}. Raw restricted records are not exported.` },
    { path: 'THREATS_TO_VALIDITY.md', content: `# Threats to validity — ${object.objectId}\n\n${object.publicLimitations.map((item) => `- ${item}`).join('\n') || '- No public limitations supplied; release requires review.'}` },
    { path: 'manifest.json', content: JSON.stringify(manifest, null, 2) },
  ].map((file) => ({ ...file, sha256: sha256(file.content) }));
  const packageHash = sha256(files.map((file) => ({ path: file.path, sha256: file.sha256 })));
  return { objectId: object.objectId, version: object.version, packageHash, files, manifest };
}
