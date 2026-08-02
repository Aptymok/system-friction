import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { getCanonicalOffers, getOfferById, matchSfiOffer, type SfiOffer } from './sfiServiceCatalog';
import { runPublicResearch, type PublicResearchResult, type PublicResearchSource } from './publicResearch';

export type ProspectRadarInput = {
  mode?: 'discover' | 'investigate';
  company?: string;
  sector?: string;
  region?: string;
  painFocus?: string;
  lookbackDays?: number;
  maxCandidates?: number;
  allowProvisionalOffers?: boolean;
};

export type ProspectRadarReport = {
  runId: string;
  generatedAt: string;
  researchProvider: string;
  queryPlan: string[];
  candidates: Array<{
    company: string;
    sector: string;
    reason: string;
    confidence: number;
    sourceUrls: string[];
  }>;
  company: {
    name: string;
    sector: string;
    region: string;
    website: string | null;
  };
  observedPain: {
    statement: string;
    affectedGroups: string[];
    observedSince: string | null;
    severity: 'low' | 'medium' | 'high' | 'critical' | 'unknown';
    evidenceUrls: string[];
    counterEvidence: string[];
  };
  causalChain: Array<{
    cause: string;
    epistemicStatus: 'observed' | 'source_claim' | 'inferred' | 'projected';
    evidenceUrls: string[];
  }>;
  criticalWindow: {
    kind: 'projected_threshold_window';
    observedAt: string;
    startDate: string;
    endDate: string;
    horizonDays: number;
    threshold: string;
    triggers: string[];
    counterSignals: string[];
    confidence: number;
    collapseAssessment: 'not_assessable' | 'elevated_risk_only' | 'explicit_source_supported';
    caveat: string;
  };
  sfiFit: {
    eligible: boolean;
    offerId: string;
    offerName: string;
    offerStatus: string;
    problemSfiAddresses: string;
    whySfi: string;
    uniqueCombination: string;
    alternatives: string[];
    confidence: number;
  };
  contact: {
    name: string | null;
    role: string;
    whyThisRole: string;
    channelType: 'official_email' | 'official_form' | 'official_profile' | 'company_page' | 'not_verified';
    channel: string | null;
    sourceUrl: string | null;
    verified: boolean;
    caveat: string | null;
  };
  email: {
    subject: string;
    body: string;
  };
  proposal: {
    title: string;
    executiveSummary: string;
    objectives: string[];
    scope: string[];
    deliverables: string[];
    timelineDays: number;
    assumptions: string[];
    exclusions: string[];
    finalDocumentMarkdown: string;
  };
  sources: PublicResearchSource[];
  confidence: number;
  epistemicStatus: 'projected_not_validated';
  limitations: string[];
  warnings: string[];
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function optionalText(value: unknown) {
  const result = text(value);
  return result || null;
}

function number01(value: unknown, fallback = 0) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : fallback;
}

function integer(value: unknown, fallback: number, min: number, max: number) {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function strings(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => text(item)).filter(Boolean);
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function safeJson(value: string): JsonRecord | null {
  const candidates = [
    value.trim(),
    value.match(/```json\s*([\s\S]*?)```/i)?.[1]?.trim() ?? '',
    value.slice(value.indexOf('{'), value.lastIndexOf('}') + 1),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as JsonRecord;
    } catch {
      // Continue to the next extraction strategy.
    }
  }
  return null;
}

function isoDate(value: unknown) {
  const candidate = text(value);
  if (!candidate) return null;
  const date = new Date(candidate);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dateDiffDays(start: string, end: string) {
  const delta = new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime();
  return Math.max(1, Math.round(delta / 86_400_000));
}

function sourceUrls(value: unknown, sources: PublicResearchSource[]) {
  const known = new Set(sources.map((source) => source.url));
  return unique(strings(value).filter((url) => known.has(url)));
}

function sourceByUrl(url: string | null, sources: PublicResearchSource[]) {
  return url ? sources.find((source) => source.url === url) ?? null : null;
}

function evidenceConfidence(sources: PublicResearchSource[]) {
  if (!sources.length) return 0;
  const reliability = sources.reduce((sum, source) => sum + source.reliability, 0) / sources.length;
  const domains = new Set(sources.map((source) => source.publisher).filter(Boolean)).size;
  const types = new Set(sources.map((source) => source.sourceType)).size;
  const official = sources.some((source) => source.sourceType === 'official' || source.sourceType === 'regulator');
  const independent = sources.some((source) => source.sourceType === 'news');
  return number01(
    0.18
      + Math.min(0.22, sources.length * 0.035)
      + Math.min(0.16, domains * 0.03)
      + Math.min(0.12, types * 0.04)
      + reliability * 0.22
      + (official ? 0.05 : 0)
      + (independent ? 0.05 : 0),
  );
}

function searchQueries(input: Required<Pick<ProspectRadarInput, 'mode' | 'region' | 'lookbackDays'>> & ProspectRadarInput) {
  const year = new Date().getUTCFullYear();
  const company = text(input.company);
  const sector = text(input.sector, 'empresas');
  const region = text(input.region, 'México');
  const pain = text(input.painFocus, 'fricción operativa clientes empleados regulación continuidad');
  if (company) {
    return unique([
      `${company} ${region} problemas actuales ${year} operaciones clientes`,
      `${company} ${region} quejas fallas retrasos regulación ${year}`,
      `${company} resultados estrategia crecimiento rentabilidad ${year} official`,
      `${company} leadership operations customer experience contact official`,
      `${company} ${pain} últimos ${input.lookbackDays} días`,
      `site:gob.mx ${company} OR site:profeco.gob.mx ${company}`,
    ]);
  }
  return unique([
    `${region} empresas problemas operativos actuales ${year} clientes empleados`,
    `${region} ${sector} quejas regulación fallas servicio ${year}`,
    `${region} empresas crisis logística atención clientes crecimiento ${year}`,
    `${region} ${pain} empresas últimos ${input.lookbackDays} días`,
    `${region} compañías expansión rápida fricción operacional ${year}`,
  ]);
}

function researchPrompt(input: Required<Pick<ProspectRadarInput, 'mode' | 'region' | 'lookbackDays' | 'maxCandidates'>> & ProspectRadarInput, offers: readonly SfiOffer[]) {
  const today = new Date().toISOString().slice(0, 10);
  const offerContext = offers.map((offer) => ({
    id: offer.id,
    name: offer.name,
    status: offer.status,
    problem_classes: offer.problemClasses,
    signals: offer.observableSignals,
    method: offer.method,
    deliverables: offer.deliverables,
    exclusions: offer.exclusions,
    unique_combination: offer.uniqueCombination,
  }));

  return `You are SFI Autonomous Prospect Radar. Today is ${today}.

MISSION
Search current public Internet evidence and identify an evidence-backed organizational pain that SFI can legitimately address. ${input.company ? `Deeply investigate ${input.company}.` : `Discover and rank up to ${input.maxCandidates} companies in ${input.region}.`} Focus on ${input.sector || 'any sector'} and ${input.painFocus || 'current pain affecting customers, employees, operations, trust, governance or continuity'} within approximately the last ${input.lookbackDays} days.

EPISTEMIC RULES
- Use at least 3 relevant public sources when available, preferably one official/regulatory source and one independent source.
- Distinguish observed fact, source claim, inference and projection.
- Include counterevidence and positive signals. Do not manufacture a crisis.
- Do not claim that SFI is the only provider in the market. Explain the specific combination SFI contributes.
- Never invent a person, title, email address, phone number, URL, date or source.
- A contact is verified only when a public source explicitly supports the name/role/channel.
- Do not infer email patterns. If no direct verified channel exists, use an official contact form/company page or mark not_verified.
- Do not predict collapse as certainty. Estimate a projected threshold/intervention window. Set collapse_assessment=not_assessable unless explicit public evidence supports elevated structural risk.
- The final email must be diagnostic and non-accusatory. It must reference public evidence cautiously and request a conversation, not claim privileged knowledge.

SFI_OFFER_CATALOG=${JSON.stringify(offerContext)}

RETURN ONE VALID JSON OBJECT WITH THIS EXACT SHAPE:
{
  "candidates":[{"company":"","sector":"","reason":"","confidence":0.0,"source_urls":[""]}],
  "company":{"name":"","sector":"","region":"","website":null},
  "observed_pain":{"statement":"","affected_groups":[""],"observed_since":null,"severity":"low|medium|high|critical|unknown","evidence_urls":[""],"counter_evidence":[""]},
  "causal_chain":[{"cause":"","epistemic_status":"observed|source_claim|inferred|projected","evidence_urls":[""]}],
  "critical_window":{"start_date":"YYYY-MM-DD","end_date":"YYYY-MM-DD","threshold":"","triggers":[""],"counter_signals":[""],"confidence":0.0,"collapse_assessment":"not_assessable|elevated_risk_only|explicit_source_supported"},
  "sfi_fit":{"eligible":true,"offer_id":"SFI-DR01|MOP-H-PILOT","problem_sfi_addresses":"","why_sfi":"","alternatives":[""],"confidence":0.0},
  "contact":{"name":null,"role":"","why_this_role":"","channel_type":"official_email|official_form|official_profile|company_page|not_verified","channel":null,"source_url":null},
  "proposal":{"title":"","executive_summary":"","objectives":[""],"scope":[""],"deliverables":[""],"timeline_days":28,"assumptions":[""],"exclusions":[""]},
  "email":{"subject":"","body":""},
  "overall_confidence":0.0,
  "limitations":[""]
}`;
}

function selectOffer(modelFit: JsonRecord, pain: string, allowProvisionalOffers: boolean) {
  const requested = getOfferById(text(modelFit.offer_id));
  if (requested && (allowProvisionalOffers || requested.status === 'canonical_public')) return requested;
  return matchSfiOffer(pain, allowProvisionalOffers).offer ?? getCanonicalOffers()[0];
}

function buildDocument(input: {
  company: ProspectRadarReport['company'];
  pain: ProspectRadarReport['observedPain'];
  causalChain: ProspectRadarReport['causalChain'];
  window: ProspectRadarReport['criticalWindow'];
  fit: ProspectRadarReport['sfiFit'];
  contact: ProspectRadarReport['contact'];
  proposal: Omit<ProspectRadarReport['proposal'], 'finalDocumentMarkdown'>;
  confidence: number;
  sources: PublicResearchSource[];
}) {
  const sourceLines = input.sources.map((source) => `- [${source.title}](${source.url}) · ${source.sourceType} · reliability ${source.reliability.toFixed(2)}`);
  return `# ${input.proposal.title}\n\n## Empresa observada\n${input.company.name} · ${input.company.sector} · ${input.company.region}\n\n## Dolor observado\n${input.pain.statement}\n\nAfecta a: ${input.pain.affectedGroups.join(', ') || 'no determinado'}\n\n## Cadena causal provisional\n${input.causalChain.map((item) => `- **${item.epistemicStatus}:** ${item.cause}`).join('\n')}\n\n## Ventana proyectada de oportunidad\n- Observada: ${input.window.observedAt}\n- Inicio: ${input.window.startDate}\n- Fin: ${input.window.endDate}\n- Horizonte: ${input.window.horizonDays} días\n- Umbral: ${input.window.threshold}\n- Confianza: ${(input.window.confidence * 100).toFixed(0)}%\n- Evaluación de colapso: ${input.window.collapseAssessment}\n\n${input.window.caveat}\n\n## Encaje SFI\n**${input.fit.offerId} · ${input.fit.offerName}**\n\n${input.fit.problemSfiAddresses}\n\n${input.fit.whySfi}\n\n${input.fit.uniqueCombination}\n\n## Objetivos\n${input.proposal.objectives.map((item) => `- ${item}`).join('\n')}\n\n## Alcance\n${input.proposal.scope.map((item) => `- ${item}`).join('\n')}\n\n## Entregables\n${input.proposal.deliverables.map((item) => `- ${item}`).join('\n')}\n\n## Duración\n${input.proposal.timelineDays} días\n\n## Supuestos\n${input.proposal.assumptions.map((item) => `- ${item}`).join('\n')}\n\n## Exclusiones\n${input.proposal.exclusions.map((item) => `- ${item}`).join('\n')}\n\n## Destinatario sugerido\n${input.contact.name ?? 'Nombre no verificado'} · ${input.contact.role}\n\nMotivo: ${input.contact.whyThisRole}\n\nCanal público: ${input.contact.channel ?? 'no verificado'}\n\n## Confianza global\n${(input.confidence * 100).toFixed(0)}% · projected_not_validated\n\n## Fuentes públicas\n${sourceLines.join('\n')}\n`;
}

function verifiedContact(modelContact: JsonRecord, sources: PublicResearchSource[]): ProspectRadarReport['contact'] {
  const sourceUrlCandidate = optionalText(modelContact.source_url);
  const source = sourceByUrl(sourceUrlCandidate, sources);
  const channelType = text(modelContact.channel_type, 'not_verified') as ProspectRadarReport['contact']['channelType'];
  let channel = optionalText(modelContact.channel);
  let verified = Boolean(source && channel && channelType !== 'not_verified');
  const emailMatch = channel?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
  if (emailMatch) {
    const sourceText = sources.map((item) => `${item.url}\n${item.title}\n${item.snippet}`).join('\n').toLowerCase();
    if (!sourceText.includes(emailMatch.toLowerCase())) {
      channel = source?.url ?? null;
      verified = Boolean(source);
    }
  }
  if (channel && /^https?:\/\//i.test(channel) && !sources.some((item) => item.url === channel) && channel !== source?.url) {
    channel = source?.url ?? null;
    verified = Boolean(source);
  }
  return {
    name: optionalText(modelContact.name),
    role: text(modelContact.role, 'Responsable de operaciones, experiencia o transformación'),
    whyThisRole: text(modelContact.why_this_role, 'El rol debe poseer autoridad sobre la fricción observada y capacidad para autorizar un diagnóstico delimitado.'),
    channelType: verified ? channelType : source ? 'company_page' : 'not_verified',
    channel: verified ? channel : source?.url ?? null,
    sourceUrl: source?.url ?? null,
    verified,
    caveat: verified ? null : 'No se encontró un canal directo verificable. No inferir correo; usar únicamente el canal corporativo público.',
  };
}

async function persistRunStart(input: ProspectRadarInput, actorId: string, queries: string[]) {
  try {
    const service = createServiceSupabaseClient();
    const inserted = await service.from('prospect_research_runs').insert({
      mode: input.mode ?? (input.company ? 'investigate' : 'discover'),
      company_seed: optionalText(input.company),
      sector: optionalText(input.sector),
      region: text(input.region, 'Mexico'),
      pain_focus: optionalText(input.painFocus),
      lookback_days: integer(input.lookbackDays, 120, 7, 730),
      status: 'running',
      query_plan: queries,
      created_by: actorId,
    }).select('id').single();
    if (!inserted.error && inserted.data?.id) return { runId: String(inserted.data.id), persisted: true, warning: null };
    return { runId: crypto.randomUUID(), persisted: false, warning: `prospect_run_not_persisted:${inserted.error?.message ?? 'unknown'}` };
  } catch (error) {
    return { runId: crypto.randomUUID(), persisted: false, warning: `prospect_run_not_persisted:${error instanceof Error ? error.message : 'unknown'}` };
  }
}

function parsePublishedAt(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

async function persistResult(runId: string, actorId: string, report: ProspectRadarReport, research: PublicResearchResult, persisted: boolean) {
  if (!persisted) return ['prospect_radar_schema_not_applied_or_unavailable'];
  const service = createServiceSupabaseClient();
  const sourceRows = report.sources.map((source) => ({
    run_id: runId,
    source_key: source.id,
    url: source.url,
    title: source.title,
    publisher: source.publisher,
    snippet: source.snippet,
    published_at: parsePublishedAt(source.publishedAt),
    published_at_raw: source.publishedAt,
    retrieved_at: source.retrievedAt,
    source_type: source.sourceType,
    reliability: source.reliability,
  }));
  const sourceInsert = sourceRows.length ? await service.from('prospect_research_sources').upsert(sourceRows, { onConflict: 'run_id,url' }) : { error: null };
  const reportInsert = await service.from('prospect_opportunity_reports').upsert({
    run_id: runId,
    company_name: report.company.name,
    sector: report.company.sector,
    region: report.company.region,
    pain_statement: report.observedPain.statement,
    causal_hypothesis: report.causalChain,
    critical_window: report.criticalWindow,
    sfi_fit: report.sfiFit,
    contact: report.contact,
    email_draft: report.email,
    proposal_document: report.proposal.finalDocumentMarkdown,
    confidence: report.confidence,
    epistemic_status: report.epistemicStatus,
    payload: { candidates: report.candidates, limitations: report.limitations, actorId },
  }, { onConflict: 'run_id' });
  const runUpdate = await service.from('prospect_research_runs').update({
    search_provider: research.provider,
    status: research.ok ? 'completed' : 'blocked',
    warnings: report.warnings,
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', runId);
  return [
    sourceInsert.error ? `prospect_sources_persist_failed:${sourceInsert.error.message}` : '',
    reportInsert.error ? `prospect_report_persist_failed:${reportInsert.error.message}` : '',
    runUpdate.error ? `prospect_run_close_failed:${runUpdate.error.message}` : '',
  ].filter(Boolean);
}

export async function runAutonomousProspectRadar(rawInput: ProspectRadarInput, actorId: string): Promise<ProspectRadarReport> {
  const mode = rawInput.mode ?? (rawInput.company ? 'investigate' : 'discover');
  const input = {
    ...rawInput,
    mode,
    region: text(rawInput.region, 'Mexico'),
    lookbackDays: integer(rawInput.lookbackDays, 120, 7, 730),
    maxCandidates: integer(rawInput.maxCandidates, 3, 1, 5),
  };
  const queries = searchQueries(input);
  const run = await persistRunStart(input, actorId, queries);
  const offers = rawInput.allowProvisionalOffers ? getCanonicalOffers().concat([]) : getCanonicalOffers();
  const prompt = researchPrompt(input, rawInput.allowProvisionalOffers ? [] : offers);
  const research = await runPublicResearch({ prompt, queries, country: 'MX', searchLang: 'es', timezone: 'America/Mexico_City' });
  const model = safeJson(research.answer) ?? {};
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const companyModel = asRecord(model.company);
  const painModel = asRecord(model.observed_pain);
  const fitModel = asRecord(model.sfi_fit);
  const windowModel = asRecord(model.critical_window);
  const proposalModel = asRecord(model.proposal);
  const emailModel = asRecord(model.email);
  const sources = research.sources;
  const evidenceScore = evidenceConfidence(sources);
  const painStatement = text(painModel.statement, research.ok ? 'La investigación no produjo una formulación estructurada del dolor.' : 'Investigación pública bloqueada por falta de proveedor de búsqueda.');
  const offer = selectOffer(fitModel, painStatement, Boolean(rawInput.allowProvisionalOffers));
  const modelStart = isoDate(windowModel.start_date) ?? today;
  let modelEnd = isoDate(windowModel.end_date) ?? addDays(now, 45).toISOString().slice(0, 10);
  if (new Date(`${modelEnd}T00:00:00Z`).getTime() <= new Date(`${modelStart}T00:00:00Z`).getTime()) modelEnd = addDays(new Date(`${modelStart}T00:00:00Z`), 45).toISOString().slice(0, 10);
  if (dateDiffDays(modelStart, modelEnd) > 365) modelEnd = addDays(new Date(`${modelStart}T00:00:00Z`), 180).toISOString().slice(0, 10);
  const overallModelConfidence = number01(model.overall_confidence, evidenceScore);
  const overallConfidence = number01(Math.min(overallModelConfidence || evidenceScore, evidenceScore || overallModelConfidence));
  const candidates = (Array.isArray(model.candidates) ? model.candidates : []).slice(0, input.maxCandidates).map((candidateValue) => {
    const candidate = asRecord(candidateValue);
    return {
      company: text(candidate.company),
      sector: text(candidate.sector, 'unknown'),
      reason: text(candidate.reason),
      confidence: number01(candidate.confidence),
      sourceUrls: sourceUrls(candidate.source_urls, sources),
    };
  }).filter((candidate) => candidate.company);
  const company = {
    name: text(companyModel.name, text(rawInput.company, candidates[0]?.company ?? 'NO_VERIFIED_COMPANY')),
    sector: text(companyModel.sector, text(rawInput.sector, candidates[0]?.sector ?? 'unknown')),
    region: text(companyModel.region, input.region),
    website: optionalText(companyModel.website),
  };
  const observedPain: ProspectRadarReport['observedPain'] = {
    statement: painStatement,
    affectedGroups: strings(painModel.affected_groups),
    observedSince: isoDate(painModel.observed_since),
    severity: ['low', 'medium', 'high', 'critical', 'unknown'].includes(text(painModel.severity)) ? text(painModel.severity) as ProspectRadarReport['observedPain']['severity'] : 'unknown',
    evidenceUrls: sourceUrls(painModel.evidence_urls, sources),
    counterEvidence: strings(painModel.counter_evidence),
  };
  const causalChain: ProspectRadarReport['causalChain'] = (Array.isArray(model.causal_chain) ? model.causal_chain : []).map((itemValue) => {
    const item = asRecord(itemValue);
    const status = text(item.epistemic_status, 'inferred');
    return {
      cause: text(item.cause),
      epistemicStatus: ['observed', 'source_claim', 'inferred', 'projected'].includes(status) ? status as ProspectRadarReport['causalChain'][number]['epistemicStatus'] : 'inferred',
      evidenceUrls: sourceUrls(item.evidence_urls, sources),
    };
  }).filter((item) => item.cause);
  const collapseAssessment = ['not_assessable', 'elevated_risk_only', 'explicit_source_supported'].includes(text(windowModel.collapse_assessment))
    ? text(windowModel.collapse_assessment) as ProspectRadarReport['criticalWindow']['collapseAssessment']
    : 'not_assessable';
  const criticalWindow: ProspectRadarReport['criticalWindow'] = {
    kind: 'projected_threshold_window',
    observedAt: today,
    startDate: modelStart,
    endDate: modelEnd,
    horizonDays: dateDiffDays(modelStart, modelEnd),
    threshold: text(windowModel.threshold, 'Momento en que la fricción observada puede consolidarse y reducir la reversibilidad de una intervención diagnóstica.'),
    triggers: strings(windowModel.triggers),
    counterSignals: strings(windowModel.counter_signals),
    confidence: number01(Math.min(number01(windowModel.confidence, overallConfidence), evidenceScore || overallConfidence)),
    collapseAssessment,
    caveat: 'Ventana proyectada, no pronóstico históricamente validado. Indica cuándo conviene verificar e intervenir antes de que el patrón pierda reversibilidad; no afirma quiebra ni colapso corporativo.',
  };
  const sfiFit: ProspectRadarReport['sfiFit'] = {
    eligible: Boolean(fitModel.eligible) && sources.length >= offer.minimumEvidenceSources,
    offerId: offer.id,
    offerName: offer.name,
    offerStatus: offer.status,
    problemSfiAddresses: text(fitModel.problem_sfi_addresses, painStatement),
    whySfi: text(fitModel.why_sfi, `SFI puede convertir señales públicas fragmentadas en una hipótesis trazable, una intervención mínima y una ventana de retorno gobernada mediante ${offer.id}.`),
    uniqueCombination: offer.uniqueCombination,
    alternatives: strings(fitModel.alternatives),
    confidence: number01(Math.min(number01(fitModel.confidence, overallConfidence), overallConfidence)),
  };
  const contact = verifiedContact(asRecord(model.contact), sources);
  const proposalBase = {
    title: text(proposalModel.title, `${offer.id} · Lectura de fricción para ${company.name}`),
    executiveSummary: text(proposalModel.executive_summary, `Propuesta de diagnóstico delimitado para verificar la fricción observada en ${company.name}, distinguir causas de síntomas y diseñar una intervención mínima con retorno observable.`),
    objectives: strings(proposalModel.objectives).length ? strings(proposalModel.objectives) : ['Consolidar evidencia pública y evidencia interna autorizada.', 'Distinguir recurrencias, causas y contraevidencia.', 'Definir una intervención mínima y una ventana verificable de retorno.'],
    scope: strings(proposalModel.scope).length ? strings(proposalModel.scope) : offer.method,
    deliverables: strings(proposalModel.deliverables).length ? strings(proposalModel.deliverables) : offer.deliverables,
    timelineDays: integer(proposalModel.timeline_days, offer.defaultDurationDays, 3, 120),
    assumptions: strings(proposalModel.assumptions).length ? strings(proposalModel.assumptions) : ['La empresa autoriza una conversación exploratoria y comparte sólo evidencia acordada.', 'Las afirmaciones públicas se tratarán como contexto, no como diagnóstico definitivo.'],
    exclusions: unique([...offer.exclusions, ...strings(proposalModel.exclusions)]),
  };
  const email = {
    subject: text(emailModel.subject, `${company.name}: propuesta de diagnóstico de fricción ${offer.id}`),
    body: text(emailModel.body, `Hola${contact.name ? ` ${contact.name}` : ''},\n\nAl revisar información pública reciente sobre ${company.name}, observamos señales que podrían corresponder a una fricción entre ${observedPain.statement.toLowerCase()} Esto no constituye un diagnóstico ni supone acceso a información interna.\n\nSFI propone una conversación breve para determinar si un ${offer.name} puede ayudar a consolidar evidencia, distinguir causas de síntomas y definir una intervención mínima con retorno verificable.\n\nLa ventana observada para verificar esta hipótesis es ${criticalWindow.startDate}–${criticalWindow.endDate}, con confianza ${(criticalWindow.confidence * 100).toFixed(0)}%.\n\nAdjunto una nota ejecutiva basada únicamente en fuentes públicas.\n\nSaludos,\nSystem Friction Institute`),
  };
  const reportWithoutDocument = {
    company,
    pain: observedPain,
    causalChain,
    window: criticalWindow,
    fit: sfiFit,
    contact,
    proposal: proposalBase,
    confidence: overallConfidence,
    sources,
  };
  const report: ProspectRadarReport = {
    runId: run.runId,
    generatedAt: new Date().toISOString(),
    researchProvider: research.provider,
    queryPlan: queries,
    candidates,
    company,
    observedPain,
    causalChain,
    criticalWindow,
    sfiFit,
    contact,
    email,
    proposal: {
      ...proposalBase,
      finalDocumentMarkdown: buildDocument(reportWithoutDocument),
    },
    sources,
    confidence: overallConfidence,
    epistemicStatus: 'projected_not_validated',
    limitations: unique([
      ...strings(model.limitations),
      'La investigación usa únicamente información pública y puede contener omisiones o afirmaciones controvertidas.',
      'La ventana crítica es una proyección operativa sin calibración histórica suficiente para predecir colapso.',
      'La identidad y el canal del destinatario deben confirmarse antes de enviar cualquier mensaje.',
      'La exclusividad absoluta de SFI frente a todo proveedor no está demostrada; se documenta una combinación metodológica específica.',
    ]),
    warnings: unique([...research.warnings, run.warning ?? '', research.ok ? '' : 'PUBLIC_RESEARCH_BLOCKED']),
  };
  const persistenceWarnings = await persistResult(run.runId, actorId, report, research, run.persisted);
  report.warnings = unique([...report.warnings, ...persistenceWarnings]);
  return report;
}
