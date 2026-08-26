import 'server-only';

import { runPublicResearch, type PublicResearchSource } from '@/lib/agents/publicResearch';
import { createActionProposal, sha256, stringValue } from '@/lib/operational/common';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export type EvidenceCandidateSource = {
  url: string;
  title: string;
  publisher: string | null;
  snippet: string;
  publishedAt: string | null;
  retrievedAt: string;
  sourceType: 'official' | 'regulator' | 'news' | 'professional' | 'other';
  reliability: number;
  referenceHash: string;
  contentHash: null;
  contentType?: string | null;
  lastModified?: string | null;
};

export type EvidenceCandidateView = {
  id: string;
  parentProposalId: string;
  title: string;
  status: string;
  createdAt: string | null;
  source: EvidenceCandidateSource;
  requestNote: string | null;
  acquisitionProvider: string | null;
  acquisitionOrigin: 'automatic_search' | 'manual_url' | 'external_agent';
};

export type EvidenceSlot = {
  key: string;
  label: string;
  status: 'MISSING' | 'CANDIDATE' | 'ACCEPTED';
  candidateIds: string[];
  acceptedEvidenceIds: string[];
};

export type EvidenceReadiness = {
  state: 'MISSING' | 'REVIEW_REQUIRED' | 'SATISFIED';
  jobId: string;
  owner: 'evidence_hunter' | 'ROOT';
  nextExpectedEvent: 'EVIDENCE_CANDIDATE_ACQUIRED' | 'ROOT_EVIDENCE_DECISION' | 'ROOT_ACCEPT_OR_REJECT_PROPOSAL';
  rootActionRequired: boolean;
  slots: EvidenceSlot[];
  counts: { required: number; accepted: number; candidate: number; missing: number; rejectedCandidates: number };
};

type Row = Record<string, unknown>;

function asRecord(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Row
    : {};
}

function expectedPayload(row: Row) {
  return asRecord(asRecord(row.expected_field_delta).payload);
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function hostname(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function sourceTypeForUrl(url: string): EvidenceCandidateSource['sourceType'] {
  const host = hostname(url).toLowerCase();
  if (/inegi\.org\.mx$|\.gob\.mx$|\.gov\.|\.gov$|banxico\.org\.mx$|condusef\.gob\.mx$|profeco\.gob\.mx$/.test(host)) return 'regulator';
  if (/linkedin\.com|crunchbase\.com/.test(host)) return 'professional';
  if (/reuters|bloomberg|forbes|expansion|eleconomista|elfinanciero|elceo|elpais|milenio|cnn|bbc/.test(host)) return 'news';
  return 'other';
}

function reliabilityFor(sourceType: EvidenceCandidateSource['sourceType']) {
  if (sourceType === 'regulator') return 0.94;
  if (sourceType === 'official') return 0.86;
  if (sourceType === 'news') return 0.76;
  if (sourceType === 'professional') return 0.62;
  return 0.55;
}

function normalizeSource(source: Omit<EvidenceCandidateSource, 'referenceHash' | 'contentHash'>): EvidenceCandidateSource {
  return {
    ...source,
    referenceHash: sha256({
      url: source.url,
      title: source.title,
      publisher: source.publisher,
      publishedAt: source.publishedAt,
      retrievedAt: source.retrievedAt,
    }),
    contentHash: null,
  };
}

function fromPublicResearchSource(source: PublicResearchSource): EvidenceCandidateSource {
  const domainType = sourceTypeForUrl(source.url);
  const sourceType = domainType === 'other' ? source.sourceType : domainType;
  return normalizeSource({
    url: source.url,
    title: source.title,
    publisher: source.publisher,
    snippet: source.snippet,
    publishedAt: source.publishedAt,
    retrievedAt: source.retrievedAt,
    sourceType,
    reliability: domainType === 'other' ? source.reliability : reliabilityFor(sourceType),
  });
}

export async function readGovernedProposal(proposalId: string) {
  const service = createServiceSupabaseClient();
  const result = await service.from('action_proposals').select('*').eq('id', proposalId).maybeSingle();
  if (result.error) return { ok: false as const, error: result.error.message, data: null };
  if (!result.data) return { ok: false as const, error: 'proposal_not_found', data: null };
  return { ok: true as const, data: result.data as Row };
}

export function evidenceCandidateFromRow(rowValue: unknown): EvidenceCandidateView | null {
  const row = asRecord(rowValue);
  const payload = expectedPayload(row);
  const source = asRecord(payload.source);
  const parentProposalId = stringValue(payload.parentProposalId);
  const url = stringValue(source.url);
  if (!parentProposalId || !url) return null;
  const sourceType = stringValue(source.sourceType);
  const acquisitionOrigin = stringValue(payload.acquisitionOrigin);
  return {
    id: String(row.id ?? ''),
    parentProposalId,
    title: stringValue(row.title) ?? stringValue(source.title) ?? 'Evidence candidate',
    status: stringValue(row.status) ?? 'unknown',
    createdAt: stringValue(row.created_at),
    source: {
      url,
      title: (stringValue(source.title) ?? hostname(url)) || url,
      publisher: stringValue(source.publisher),
      snippet: stringValue(source.snippet) ?? '',
      publishedAt: stringValue(source.publishedAt),
      retrievedAt: stringValue(source.retrievedAt) ?? new Date(0).toISOString(),
      sourceType: sourceType === 'official' || sourceType === 'regulator' || sourceType === 'news' || sourceType === 'professional' || sourceType === 'other' ? sourceType : 'other',
      reliability: typeof source.reliability === 'number' && Number.isFinite(source.reliability) ? source.reliability : 0.55,
      referenceHash: stringValue(source.referenceHash) ?? sha256({ url }),
      contentHash: null,
      contentType: stringValue(source.contentType),
      lastModified: stringValue(source.lastModified),
    },
    requestNote: stringValue(payload.requestNote),
    acquisitionProvider: stringValue(payload.acquisitionProvider),
    acquisitionOrigin: acquisitionOrigin === 'manual_url' || acquisitionOrigin === 'external_agent' ? acquisitionOrigin : 'automatic_search',
  };
}

export async function listEvidenceCandidates(parentProposalId: string, limit = 100) {
  const service = createServiceSupabaseClient();
  const boundedLimit = Math.max(1, Math.min(250, limit));
  const result = await service
    .from('action_proposals')
    .select('*')
    .eq('expected_field_delta->>proposalType', 'evidence_candidate')
    .eq('expected_field_delta->payload->>parentProposalId', parentProposalId)
    .order('created_at', { ascending: false })
    .limit(boundedLimit);
  if (result.error) return { ok: false as const, error: result.error.message, candidates: [] as EvidenceCandidateView[] };
  const candidates = (result.data ?? [])
    .map((row) => evidenceCandidateFromRow(row))
    .filter((candidate): candidate is EvidenceCandidateView => Boolean(candidate && candidate.parentProposalId === parentProposalId));
  return { ok: true as const, candidates };
}

export async function readEvidenceCandidate(parentProposalId: string, candidateId: string) {
  const service = createServiceSupabaseClient();
  const result = await service.from('action_proposals').select('*').eq('id', candidateId).maybeSingle();
  if (result.error) return { ok: false as const, error: result.error.message, row: null, candidate: null };
  const candidate = evidenceCandidateFromRow(result.data);
  if (!result.data || !candidate || candidate.parentProposalId !== parentProposalId) {
    return { ok: false as const, error: 'evidence_candidate_not_found', row: null, candidate: null };
  }
  return { ok: true as const, row: result.data as Row, candidate };
}

function explicitSlotDefinitions(parent: Row) {
  const expected = asRecord(parent.expected_field_delta);
  const payload = expectedPayload(parent);
  const raw = payload.evidenceSlots ?? payload.evidence_slots ?? payload.requiredEvidence ?? payload.required_evidence;
  if (!Array.isArray(raw)) return [] as Array<{ key: string; label: string; aliases: string[] }>;
  return raw.flatMap((item, index) => {
    if (typeof item === 'string' && item.trim()) {
      const value = item.trim();
      return [{ key: value.toUpperCase().replace(/[^A-Z0-9]+/g, '_'), label: value, aliases: [value.toLowerCase()] }];
    }
    const entry = asRecord(item);
    const label = stringValue(entry.label) ?? stringValue(entry.title) ?? stringValue(entry.name) ?? stringValue(entry.key);
    if (!label) return [];
    const key = stringValue(entry.key)?.toUpperCase().replace(/[^A-Z0-9]+/g, '_') ?? `EVIDENCE_${index + 1}`;
    const aliases = unique([
      label.toLowerCase(),
      ...(Array.isArray(entry.aliases) ? entry.aliases.filter((value): value is string => typeof value === 'string').map((value) => value.toLowerCase()) : []),
    ]);
    return [{ key, label, aliases }];
  });
}

function inferredSlotDefinitions(parent: Row) {
  const expected = asRecord(parent.expected_field_delta);
  const payload = expectedPayload(parent);
  const blob = [parent.title, parent.description, expected.objective, JSON.stringify(payload)].filter(Boolean).join(' ').toLowerCase();
  const known = [
    { key: 'ENOE', label: 'ENOE', aliases: ['enoe', 'encuesta nacional de ocupación', 'encuesta nacional de ocupacion'] },
    { key: 'DENUE', label: 'DENUE', aliases: ['denue', 'directorio estadístico nacional de unidades económicas', 'directorio estadistico nacional de unidades economicas'] },
    { key: 'EMEC', label: 'EMEC', aliases: ['emec', 'encuesta mensual sobre empresas comerciales'] },
    { key: 'INPC', label: 'INPC', aliases: ['inpc', 'índice nacional de precios al consumidor', 'indice nacional de precios al consumidor'] },
    { key: 'PREREGISTRATION', label: 'Preregistro', aliases: ['preregistro', 'pre-registro', 'preregistration'] },
  ];
  const matched = known.filter((slot) => slot.aliases.some((alias) => blob.includes(alias)));
  if (matched.length) return matched;
  return [{ key: 'PERSISTED_EVIDENCE', label: 'Evidencia persistida vinculada', aliases: ['evidence', 'evidencia'] }];
}

function candidateBlob(candidate: EvidenceCandidateView) {
  return [candidate.title, candidate.source.title, candidate.source.publisher, candidate.source.snippet, candidate.source.url].filter(Boolean).join(' ').toLowerCase();
}

function evidenceBlob(evidence: Row) {
  return [evidence.title, evidence.content, evidence.evidence_type, JSON.stringify(evidence.payload)].filter(Boolean).join(' ').toLowerCase();
}

function matchesSlot(blob: string, slot: { key: string; aliases: string[] }) {
  if (slot.key === 'PERSISTED_EVIDENCE') return true;
  return slot.aliases.some((alias) => blob.includes(alias));
}

async function linkedAcceptedEvidence(parentProposalId: string) {
  const db = createServiceSupabaseClient();
  const result = await db.from('root_evidence_entries').select('id,title,content,evidence_type,payload,created_at').order('created_at', { ascending: false }).limit(250);
  if (result.error) return { rows: [] as Row[], error: result.error.message };
  const rows = (result.data ?? []).filter((item) => JSON.stringify(item.payload ?? {}).includes(parentProposalId));
  return { rows: rows as Row[], error: null };
}

export async function readEvidenceReadiness(parentProposalId: string): Promise<{ ok: boolean; readiness: EvidenceReadiness | null; error?: string }> {
  const [parent, candidates, acceptedEvidence] = await Promise.all([
    readGovernedProposal(parentProposalId),
    listEvidenceCandidates(parentProposalId, 200),
    linkedAcceptedEvidence(parentProposalId),
  ]);
  if (!parent.ok || !parent.data) return { ok: false, readiness: null, error: parent.error };
  if (!candidates.ok) return { ok: false, readiness: null, error: candidates.error };

  const definitions = explicitSlotDefinitions(parent.data);
  const slotsDef = definitions.length ? definitions : inferredSlotDefinitions(parent.data);
  const slots: EvidenceSlot[] = slotsDef.map((definition) => {
    const candidateMatches = candidates.candidates.filter((candidate) => matchesSlot(candidateBlob(candidate), definition));
    const acceptedMatches = acceptedEvidence.rows.filter((evidence) => matchesSlot(evidenceBlob(evidence), definition));
    const acceptedCandidateIds = candidateMatches.filter((candidate) => candidate.status === 'accepted').map((candidate) => candidate.id);
    const acceptedEvidenceIds = unique([
      ...acceptedMatches.map((item) => String(item.id ?? '')).filter(Boolean),
      ...acceptedCandidateIds,
    ]);
    const proposed = candidateMatches.filter((candidate) => candidate.status === 'proposed').map((candidate) => candidate.id);
    return {
      key: definition.key,
      label: definition.label,
      status: acceptedEvidenceIds.length ? 'ACCEPTED' : proposed.length ? 'CANDIDATE' : 'MISSING',
      candidateIds: unique([...proposed, ...acceptedCandidateIds]),
      acceptedEvidenceIds,
    };
  });

  const accepted = slots.filter((slot) => slot.status === 'ACCEPTED').length;
  const candidate = slots.filter((slot) => slot.status === 'CANDIDATE').length;
  const missing = slots.filter((slot) => slot.status === 'MISSING').length;
  const rejectedCandidates = candidates.candidates.filter((item) => item.status === 'rejected').length;
  const state: EvidenceReadiness['state'] = accepted === slots.length
    ? 'SATISFIED'
    : candidate > 0
      ? 'REVIEW_REQUIRED'
      : 'MISSING';
  const readiness: EvidenceReadiness = {
    state,
    jobId: `evidence-acquisition:${parentProposalId}`,
    owner: state === 'MISSING' ? 'evidence_hunter' : 'ROOT',
    nextExpectedEvent: state === 'MISSING'
      ? 'EVIDENCE_CANDIDATE_ACQUIRED'
      : state === 'REVIEW_REQUIRED'
        ? 'ROOT_EVIDENCE_DECISION'
        : 'ROOT_ACCEPT_OR_REJECT_PROPOSAL',
    rootActionRequired: state !== 'MISSING',
    slots,
    counts: { required: slots.length, accepted, candidate, missing, rejectedCandidates },
  };
  return { ok: !acceptedEvidence.error, readiness, ...(acceptedEvidence.error ? { error: acceptedEvidence.error } : {}) };
}

export async function createEvidenceCandidate(input: {
  parentProposalId: string;
  actorId: string;
  source: EvidenceCandidateSource;
  requestNote?: string | null;
  acquisitionProvider?: string | null;
  acquisitionOrigin: EvidenceCandidateView['acquisitionOrigin'];
  queries?: string[];
  warnings?: string[];
}) {
  const parent = await readGovernedProposal(input.parentProposalId);
  if (!parent.ok || !parent.data) return { ok: false as const, error: parent.error };
  const parentStatus = stringValue(parent.data.status);
  if (parentStatus !== 'waiting_evidence' && parentStatus !== 'proposed') {
    return { ok: false as const, error: 'parent_proposal_not_accepting_evidence_candidates' };
  }

  const existing = await listEvidenceCandidates(input.parentProposalId, 200);
  const duplicate = existing.ok
    ? existing.candidates.find((candidate) => candidate.source.url === input.source.url)
    : null;
  if (duplicate) return { ok: true as const, duplicate: true, data: duplicate };

  const created = await createActionProposal({
    proposalType: 'evidence_candidate',
    actorId: input.actorId,
    title: `EVIDENCE · ${input.source.title}`.slice(0, 240),
    objective: `Review this source candidate before persisting it as governed evidence for proposal ${input.parentProposalId}.`,
    status: 'proposed',
    inputVectorHash: input.source.referenceHash,
    contentHash: null,
    payload: {
      parentProposalId: input.parentProposalId,
      requestNote: input.requestNote ?? null,
      source: input.source,
      acquisitionProvider: input.acquisitionProvider ?? null,
      acquisitionOrigin: input.acquisitionOrigin,
      queries: input.queries ?? [],
      warnings: input.warnings ?? [],
      decision_authority: 'root_only',
      human_approval_required: true,
      epistemicBoundary: 'CANDIDATE_ONLY: source retrieval is not evidence acceptance. ROOT must accept before the canonical evidence writer is invoked.',
      identityBoundary: 'referenceHash identifies the source reference envelope; contentHash remains null until byte/content identity is actually observed.',
    },
  });
  if (!created.ok) return created;
  return { ok: true as const, duplicate: false, data: evidenceCandidateFromRow(created.data) };
}

function evidenceSearchQueries(parent: Row, requestNote: string) {
  const expected = asRecord(parent.expected_field_delta);
  const title = stringValue(parent.title) ?? '';
  const objective = stringValue(parent.description) ?? stringValue(expected.objective) ?? '';
  const compact = [title, objective, requestNote].filter(Boolean).join(' ').replace(/\s+/g, ' ').slice(0, 520);
  const queries = [
    `${compact} fuente oficial datos`,
    `${compact} dataset publicación metodología`,
  ];
  if (/inegi|méxico|mexico/i.test(compact)) {
    queries.unshift(
      `site:inegi.org.mx ${compact}`,
      `site:inegi.org.mx ${title} 2026`,
      `site:gob.mx ${compact}`,
    );
  }
  return unique(queries).slice(0, 6);
}

export async function searchEvidenceCandidates(input: {
  parentProposalId: string;
  actorId: string;
  requestNote: string;
}) {
  const parent = await readGovernedProposal(input.parentProposalId);
  if (!parent.ok || !parent.data) return { ok: false as const, error: parent.error, candidates: [], warnings: [] as string[] };
  const queries = evidenceSearchQueries(parent.data, input.requestNote);
  const prompt = [
    'Find public source candidates that could satisfy an SFI governed evidence request.',
    `PROPOSAL=${stringValue(parent.data.title) ?? input.parentProposalId}`,
    `REQUEST=${input.requestNote}`,
    'Prefer primary official/regulator sources, datasets, methodological notes and dated publications.',
    'Return/retrieve candidates only. Do not treat search results, snippets or titles as verified institutional facts.',
    'ROOT will separately accept or reject every candidate before persistence as evidence.',
  ].join('\n');

  const research = await runPublicResearch({
    prompt,
    queries,
    country: 'MX',
    searchLang: 'es',
    timezone: 'America/Mexico_City',
    lookbackDays: 365,
  });

  const ranked = [...research.sources]
    .sort((a, b) => {
      const priority = (source: PublicResearchSource) => source.sourceType === 'regulator' ? 3 : source.sourceType === 'official' ? 2 : 1;
      return priority(b) - priority(a) || b.reliability - a.reliability;
    })
    .slice(0, 8);
  const candidates: EvidenceCandidateView[] = [];
  const warnings = [...research.warnings];
  for (const source of ranked) {
    const created = await createEvidenceCandidate({
      parentProposalId: input.parentProposalId,
      actorId: input.actorId,
      source: fromPublicResearchSource(source),
      requestNote: input.requestNote,
      acquisitionProvider: research.provider,
      acquisitionOrigin: 'automatic_search',
      queries,
      warnings: research.warnings,
    });
    if (created.ok && created.data) candidates.push(created.data);
    else if (!created.ok) warnings.push(`candidate_create_failed:${created.error}`);
  }
  return {
    ok: research.ok || candidates.length > 0,
    provider: research.provider,
    queries,
    candidates,
    warnings: unique(warnings),
  };
}

export async function inspectUrlCandidate(input: {
  parentProposalId: string;
  actorId: string;
  url: string;
  title?: string | null;
  requestNote?: string | null;
  acquisitionOrigin?: EvidenceCandidateView['acquisitionOrigin'];
  acquisitionProvider?: string | null;
}) {
  let parsed: URL;
  try {
    parsed = new URL(input.url);
  } catch {
    return { ok: false as const, error: 'invalid_source_url' };
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) return { ok: false as const, error: 'invalid_source_url_protocol' };

  const sourceType = sourceTypeForUrl(parsed.toString());
  const source = normalizeSource({
    url: parsed.toString(),
    title: input.title?.trim() || parsed.hostname,
    publisher: parsed.hostname.replace(/^www\./, ''),
    snippet: 'URL supplied for governed evidence review. SFI has not fetched, preserved, accepted or verified the referenced content at candidate-intake time.',
    publishedAt: null,
    retrievedAt: new Date().toISOString(),
    sourceType,
    reliability: reliabilityFor(sourceType),
    contentType: null,
    lastModified: null,
  });

  return createEvidenceCandidate({
    parentProposalId: input.parentProposalId,
    actorId: input.actorId,
    source,
    requestNote: input.requestNote ?? null,
    acquisitionProvider: input.acquisitionProvider ?? 'manual_url_reference',
    acquisitionOrigin: input.acquisitionOrigin ?? 'manual_url',
    warnings: ['REFERENCE_ONLY: candidate URL was staged without server-side retrieval; ROOT must inspect the source before acceptance.'],
  });
}
