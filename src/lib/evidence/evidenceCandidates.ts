import 'server-only';

import { runPublicResearch, type PublicResearchSource } from '@/lib/agents/publicResearch';
import { createActionProposal, latestActionProposals, recordValue, sha256, stringValue } from '@/lib/operational/common';
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function expectedPayload(row: Record<string, unknown>) {
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
  if (host) return 'official';
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
    // Search/index results do not prove byte identity. A content hash may only be
    // added by a separate governed preservation/inspection workflow.
    contentHash: null,
  };
}

function fromPublicResearchSource(source: PublicResearchSource): EvidenceCandidateSource {
  return normalizeSource({
    url: source.url,
    title: source.title,
    publisher: source.publisher,
    snippet: source.snippet,
    publishedAt: source.publishedAt,
    retrievedAt: source.retrievedAt,
    sourceType: source.sourceType,
    reliability: source.reliability,
  });
}

export async function readGovernedProposal(proposalId: string) {
  const service = createServiceSupabaseClient();
  const result = await service.from('action_proposals').select('*').eq('id', proposalId).maybeSingle();
  if (result.error) return { ok: false as const, error: result.error.message, data: null };
  if (!result.data) return { ok: false as const, error: 'proposal_not_found', data: null };
  return { ok: true as const, data: result.data as Record<string, unknown> };
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
      title: stringValue(source.title) ?? hostname(url) ?? url,
      publisher: stringValue(source.publisher),
      snippet: stringValue(source.snippet) ?? '',
      publishedAt: stringValue(source.publishedAt),
      retrievedAt: stringValue(source.retrievedAt) ?? new Date(0).toISOString(),
      sourceType: sourceType === 'regulator' || sourceType === 'news' || sourceType === 'professional' || sourceType === 'other' ? sourceType : 'official',
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
  const rows = await latestActionProposals(['evidence_candidate'], Math.max(20, Math.min(250, limit)));
  if (rows.error) return { ok: false as const, error: rows.error, candidates: [] as EvidenceCandidateView[] };
  const candidates = rows.data
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
  return { ok: true as const, row: result.data as Record<string, unknown>, candidate };
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

function evidenceSearchQueries(parent: Record<string, unknown>, requestNote: string) {
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

  let contentType: string | null = null;
  let lastModified: string | null = null;
  let warning: string | null = null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(parsed, {
      method: 'HEAD',
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
      headers: { 'User-Agent': 'SystemFrictionInstitute/1.0 evidence-candidate' },
    });
    contentType = response.headers.get('content-type');
    lastModified = response.headers.get('last-modified');
    if (!response.ok) warning = `source_head_http_${response.status}`;
  } catch (error) {
    warning = `source_head_failed:${error instanceof Error ? error.message : 'unknown'}`;
  } finally {
    clearTimeout(timeout);
  }

  const sourceType = sourceTypeForUrl(parsed.toString());
  const source = normalizeSource({
    url: parsed.toString(),
    title: input.title?.trim() || parsed.hostname,
    publisher: parsed.hostname.replace(/^www\./, ''),
    snippet: 'URL supplied for governed evidence review. Content claims have not been accepted or verified by SFI.',
    publishedAt: null,
    retrievedAt: new Date().toISOString(),
    sourceType,
    reliability: reliabilityFor(sourceType),
    contentType,
    lastModified,
  });

  return createEvidenceCandidate({
    parentProposalId: input.parentProposalId,
    actorId: input.actorId,
    source,
    requestNote: input.requestNote ?? null,
    acquisitionProvider: input.acquisitionProvider ?? 'manual_url_inspection',
    acquisitionOrigin: input.acquisitionOrigin ?? 'manual_url',
    warnings: warning ? [warning] : [],
  });
}
