import { runPublicResearch, type PublicResearchSource } from '@/lib/agents/publicResearch';
import { appendEpistemicEvent } from '@/lib/events/eventStore';

export const SFI_EVIDENCE_REQUIREMENT_RESOLVER_CONTRACT = 'SFI-EVIDENCE-REQUIREMENT-RESOLVER-1.0' as const;
export type SfiWebEvidencePolicy = 'WEB_REQUIRED' | 'WEB_OPTIONAL' | 'WEB_NOT_REQUIRED' | 'WEB_FORBIDDEN' | 'WEB_ALREADY_SUFFICIENT';

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function explicitPolicy(value: unknown): SfiWebEvidencePolicy | null {
  const candidate = text(value)?.toUpperCase();
  return candidate === 'WEB_REQUIRED' || candidate === 'WEB_OPTIONAL' || candidate === 'WEB_NOT_REQUIRED' || candidate === 'WEB_FORBIDDEN' || candidate === 'WEB_ALREADY_SUFFICIENT'
    ? candidate
    : null;
}

function buildQueries(input: Row) {
  const signal = row(input.signal);
  const context = row(input.context);
  const base = [text(input.question), text(input.objective), text(signal.name), text(input.declaredFunction), text(input.systemType)]
    .filter((value): value is string => Boolean(value));
  const explicit = Array.isArray(context.webQueries)
    ? context.webQueries.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
    : [];
  const queries = [...explicit, base.join(' ')].filter(Boolean);
  if (base.length >= 2) queries.push(`${base[0]} ${base.at(-1)}`);
  return [...new Set(queries.map((value) => value.replace(/\s+/g, ' ').trim()).filter(Boolean))].slice(0, 5);
}

export function resolveUniversalEvidenceRequirements(inputValue: unknown) {
  const input = row(inputValue);
  const signal = row(input.signal);
  const context = row(input.context);
  const kind = (text(signal.kind) ?? 'unknown').toLowerCase();
  const blob = [input.question, input.objective, input.declaredFunction, input.systemType, JSON.stringify(context)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const explicit = explicitPolicy(context.webPolicy) ?? explicitPolicy(context.externalEvidencePolicy);
  const privacyBlocksWeb = context.webForbidden === true || /confidential only|private only|sin internet|no internet|no web|offline only/.test(blob);
  const dynamicExternal = /latest|current|actual|hoy|mercad|market|law|legal|regulat|precio|price|compet|benchmark|trend|tendenc|public|social|release|lanzamiento|geopolit|world|mundo|extern|industry|sector|norma|standard|sla/.test(blob);
  const strictlyInternal = ['dataset', 'csv', 'json', 'document', 'code', 'api_response'].includes(kind)
    && /internal|interno|dataset|archivo|file|registros|tickets|mesa de ayuda|repository|repo/.test(blob)
    && !dynamicExternal;

  let webPolicy: SfiWebEvidencePolicy;
  if (explicit) webPolicy = explicit;
  else if (privacyBlocksWeb) webPolicy = 'WEB_FORBIDDEN';
  else if (kind === 'web_page' || kind === 'url') webPolicy = dynamicExternal ? 'WEB_OPTIONAL' : 'WEB_ALREADY_SUFFICIENT';
  else if (dynamicExternal) webPolicy = 'WEB_REQUIRED';
  else if (strictlyInternal) webPolicy = 'WEB_NOT_REQUIRED';
  else webPolicy = 'WEB_OPTIONAL';

  const requiredSourceCount = webPolicy === 'WEB_REQUIRED' ? 2 : 0;
  const lookbackDays = /today|hoy|current|actual|latest|últim|ultima|recent/.test(blob) ? 30 : 180;
  return {
    contract: SFI_EVIDENCE_REQUIREMENT_RESOLVER_CONTRACT,
    webPolicy,
    requiredSourceCount,
    queries: buildQueries(input),
    lookbackDays,
    blockingIfUnavailable: webPolicy === 'WEB_REQUIRED',
    lanes: {
      INTERNAL: true,
      USER: true,
      FILE: Boolean(text(signal.assetRef) || ['dataset', 'csv', 'json', 'document', 'image', 'audio', 'video'].includes(kind)),
      WEB: webPolicy !== 'WEB_FORBIDDEN' && webPolicy !== 'WEB_NOT_REQUIRED',
      WORLD: dynamicExternal,
    },
    epistemicBoundary: 'Retrieval produces SOURCE candidates/source claims. It does not itself create accepted evidence, truth, authorization or canonical state.',
  };
}

export type UniversalWebEvidenceAcquisition = {
  attempted: boolean;
  satisfied: boolean;
  policy: SfiWebEvidencePolicy;
  provider: string | null;
  sources: PublicResearchSource[];
  warnings: string[];
  queries: string[];
  eventId: string | null;
};

export async function acquireUniversalWebEvidence(inputValue: unknown, actorId: string, tenantId: string, cycleKey: string): Promise<UniversalWebEvidenceAcquisition> {
  const requirement = resolveUniversalEvidenceRequirements(inputValue);
  if (requirement.webPolicy === 'WEB_FORBIDDEN' || requirement.webPolicy === 'WEB_NOT_REQUIRED' || requirement.webPolicy === 'WEB_ALREADY_SUFFICIENT') {
    return {
      attempted: false,
      satisfied: requirement.webPolicy !== 'WEB_REQUIRED',
      policy: requirement.webPolicy,
      provider: null,
      sources: [],
      warnings: [],
      queries: requirement.queries,
      eventId: null,
    };
  }

  if (!requirement.queries.length) {
    return {
      attempted: false,
      satisfied: requirement.webPolicy !== 'WEB_REQUIRED',
      policy: requirement.webPolicy,
      provider: null,
      sources: [],
      warnings: ['WEB_QUERY_PLAN_EMPTY'],
      queries: [],
      eventId: null,
    };
  }

  const result = await runPublicResearch({
    prompt: `Retrieve public sources relevant to this SFI case. Do not treat source claims as verified facts. CASE=${JSON.stringify(inputValue)}`,
    queries: requirement.queries,
    lookbackDays: requirement.lookbackDays,
  });
  const satisfied = result.sources.length >= requirement.requiredSourceCount;
  const event = await appendEpistemicEvent({
    eventName: 'SFI_UNIVERSAL_WEB_EVIDENCE_ACQUIRED',
    epistemicClass: 'imported',
    confidence: satisfied ? 0.8 : 0.4,
    payload: {
      actorId,
      tenantId,
      cycleKey,
      policy: requirement.webPolicy,
      requiredSourceCount: requirement.requiredSourceCount,
      provider: result.provider,
      queries: result.queries,
      warnings: result.warnings,
      sources: result.sources.map((source) => ({
        id: source.id,
        url: source.url,
        title: source.title,
        publisher: source.publisher,
        snippet: source.snippet,
        publishedAt: source.publishedAt,
        retrievedAt: source.retrievedAt,
        sourceType: source.sourceType,
        reliability: source.reliability,
        epistemicClass: 'SOURCE_CLAIM',
      })),
      sourceCount: result.sources.length,
      satisfied,
      epistemicBoundary: 'Search results and snippets are imported source claims. Original-source verification and acceptance remain separate.',
    },
    occurredAt: new Date().toISOString(),
    source: { sourceId: 'universal_evidence_acquisition', sourceType: 'public_research' },
    logbookId: `universal-evidence:${cycleKey}`,
    lineage: result.sources.map((source) => source.url),
  });

  return {
    attempted: true,
    satisfied,
    policy: requirement.webPolicy,
    provider: result.provider,
    sources: result.sources,
    warnings: result.warnings,
    queries: result.queries,
    eventId: event.ok ? String(event.data.event_id ?? '') : null,
  };
}
