import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { matchSfiOffer } from './sfiServiceCatalog';
import { runNoKeyNewsFeeds, type NoKeyFeedResult } from './noKeyNewsFeeds';
import type { ProspectRadarInput, ProspectRadarReport } from './autonomousProspectRadar';
import type { PublicResearchSource } from './publicResearch';

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => text(item)).filter(Boolean) : [];
}

function number01(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback;
}

function integer(value: unknown, fallback: number, min: number, max: number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.round(parsed))) : fallback;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function sourceType(url: string, title: string): PublicResearchSource['sourceType'] {
  const value = `${host(url)} ${title}`.toLowerCase();
  if (/\.gob\.mx|\.gov\.|profeco|condusef|sec\.gov|regulad|commission|authority/.test(value)) return 'regulator';
  if (/newsroom|news-room|investor|press|about|blog/.test(value)) return 'official';
  if (/linkedin\.com|crunchbase\.com/.test(value)) return 'professional';
  return 'news';
}

function reliability(type: PublicResearchSource['sourceType']) {
  if (type === 'regulator') return 0.94;
  if (type === 'official') return 0.86;
  if (type === 'news') return 0.72;
  if (type === 'professional') return 0.60;
  return 0.52;
}

function normalizeSources(results: NoKeyFeedResult[]): PublicResearchSource[] {
  return results.slice(0, 40).map((result, index) => {
    const title = text(result.title, host(result.url));
    const type = sourceType(result.url, title);
    return {
      id: `RSS-${String(index + 1).padStart(2, '0')}`,
      url: result.url,
      title,
      publisher: host(result.url) || null,
      snippet: text(result.snippet, title).slice(0, 1600),
      publishedAt: text(result.publishedAt) || null,
      retrievedAt: new Date().toISOString(),
      sourceType: type,
      reliability: reliability(type),
    };
  });
}

function safeJson(value: string) {
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
      // Try the next extraction form.
    }
  }
  return null;
}

function queryPlan(input: ProspectRadarInput) {
  const company = text(input.company);
  const region = text(input.region, 'México');
  const sector = text(input.sector, 'empresas');
  const pain = text(input.painFocus, 'problemas operativos clientes empleados regulación confianza');
  const year = new Date().getUTCFullYear();
  if (company) {
    return unique([
      `${company} ${region} problemas actuales operaciones clientes ${year}`,
      `${company} quejas fallas retrasos regulación resultados ${year}`,
      `${company} liderazgo operaciones experiencia cliente contacto oficial`,
    ]);
  }
  return unique([
    `${region} ${sector} problemas operativos actuales clientes empleados ${year}`,
    `${region} empresas quejas fallas servicio regulación ${year}`,
    `${region} ${pain} empresas ${year}`,
  ]);
}

function isoDate(value: unknown) {
  const candidate = text(value);
  if (!candidate) return null;
  const parsed = new Date(candidate);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : null;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function inferCandidate(title: string) {
  const candidate = title.split(/\s[-–—|:]\s/)[0]?.trim() ?? '';
  return candidate.length >= 2 && candidate.length <= 80 ? candidate : '';
}

function deterministicModel(input: ProspectRadarInput, sources: PublicResearchSource[]): JsonRecord {
  const suppliedCompany = text(input.company);
  const inferred = unique(sources.map((source) => inferCandidate(source.title)).filter(Boolean)).slice(0, 3);
  const company = suppliedCompany || inferred[0] || 'NO_VERIFIED_COMPANY';
  const today = new Date();
  const confidence = Math.min(0.52, 0.14 + sources.length * 0.025);
  const evidenceUrls = sources.slice(0, 10).map((source) => source.url);
  return {
    candidates: (suppliedCompany ? [suppliedCompany] : inferred).map((name) => ({
      company: name,
      sector: text(input.sector, 'unknown'),
      reason: 'Aparece en fuentes públicas recientes que requieren revisión y clasificación humana.',
      confidence,
      source_urls: evidenceUrls,
    })),
    company: { name: company, sector: text(input.sector, 'unknown'), region: text(input.region, 'México'), website: null },
    observed_pain: {
      statement: sources.length
        ? `Se recuperaron ${sources.length} referencias públicas relacionadas con ${company}; todavía deben clasificarse para confirmar una fricción organizacional específica.`
        : 'No fue posible recuperar referencias públicas suficientes en esta ejecución.',
      affected_groups: [],
      observed_since: sources.find((source) => source.publishedAt)?.publishedAt ?? null,
      severity: 'unknown',
      evidence_urls: evidenceUrls,
      counter_evidence: ['Sin interpretación local completa, los titulares no demuestran por sí solos un problema institucional.'],
    },
    causal_chain: sources.slice(0, 6).map((source) => ({
      cause: `${source.publisher ?? 'Fuente pública'} publicó: ${source.title}`,
      epistemic_status: 'source_claim',
      evidence_urls: [source.url],
    })),
    critical_window: {
      start_date: today.toISOString().slice(0, 10),
      end_date: addDays(today, 45).toISOString().slice(0, 10),
      threshold: 'Periodo provisional para verificar persistencia, causalidad y reversibilidad antes de proponer intervención.',
      triggers: [],
      counter_signals: ['No afirmar colapso ni causalidad a partir de titulares agregados.'],
      confidence,
      collapse_assessment: 'not_assessable',
    },
    sfi_fit: {
      eligible: sources.length >= 3,
      offer_id: 'SFI-DR01',
      problem_sfi_addresses: 'Normalizar evidencia pública, separar afirmaciones de hechos y construir una hipótesis verificable.',
      why_sfi: 'SFI conecta evidencia, lectura longitudinal, intervención mínima y retorno observado.',
      alternatives: ['Investigación humana adicional', 'Consultoría operativa convencional'],
      confidence,
    },
    contact: {
      name: null,
      role: 'Responsable de operaciones, experiencia, riesgo o transformación',
      why_this_role: 'Debe validar la señal y autorizar un diagnóstico delimitado.',
      channel_type: 'not_verified',
      channel: null,
      source_url: null,
    },
    proposal: {
      title: `Lectura pública preliminar SFI para ${company}`,
      executive_summary: 'Revisión preliminar basada en fuentes públicas; requiere validación antes de contacto.',
      objectives: ['Validar la señal', 'Normalizar evidencia', 'Definir una hipótesis verificable'],
      scope: ['Revisión pública', 'Mapa de fricción', 'Diseño de perturbación mínima'],
      deliverables: ['Dossier de evidencia', 'Lectura SFI-DR01 preliminar', 'Ventana de verificación'],
      timeline_days: 28,
      assumptions: ['La organización facilitará evidencia directa si acepta conversar'],
      exclusions: ['Auditoría legal o financiera', 'Afirmación determinista de colapso'],
    },
    email: {
      subject: `Conversación diagnóstica sobre señales públicas relacionadas con ${company}`,
      body: `Hola. SFI identificó referencias públicas relacionadas con ${company}. Antes de formular conclusiones, proponemos una conversación breve para validar si corresponden a una fricción operativa real. No se afirma información privada ni se ha realizado contacto automático.`,
    },
    overall_confidence: confidence,
    limitations: ['Síntesis determinista sin Ollama disponible.', 'Revisar cada publicación original antes de uso externo.'],
  };
}

async function ollamaModel(input: ProspectRadarInput, sources: PublicResearchSource[]) {
  const base = process.env.OLLAMA_BASE_URL ?? process.env.OLLAMA_URL ?? process.env.OLLAMA_HOST;
  if (!base) return { model: null as JsonRecord | null, warning: 'OLLAMA_NOT_CONFIGURED: deterministic synthesis used' };
  const model = process.env.OLLAMA_MODEL ?? 'qwen3.6:latest';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        stream: false,
        format: 'json',
        options: { temperature: 0.1 },
        messages: [
          {
            role: 'system',
            content: 'Eres el Prospect Radar de SFI. Usa únicamente las fuentes suministradas. Separa hechos observados, afirmaciones de fuentes, inferencias y proyecciones. No inventes personas, correos, fechas, empresas ni URLs. No afirmes colapso. Devuelve sólo JSON válido.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              mission: input.company ? `Investigar ${input.company}` : 'Descubrir hasta tres empresas con dolor público actual',
              input,
              required_shape: {
                candidates: [{ company: '', sector: '', reason: '', confidence: 0, source_urls: [''] }],
                company: { name: '', sector: '', region: '', website: null },
                observed_pain: { statement: '', affected_groups: [''], observed_since: null, severity: 'unknown', evidence_urls: [''], counter_evidence: [''] },
                causal_chain: [{ cause: '', epistemic_status: 'source_claim', evidence_urls: [''] }],
                critical_window: { start_date: 'YYYY-MM-DD', end_date: 'YYYY-MM-DD', threshold: '', triggers: [''], counter_signals: [''], confidence: 0, collapse_assessment: 'not_assessable' },
                sfi_fit: { eligible: true, offer_id: 'SFI-DR01', problem_sfi_addresses: '', why_sfi: '', alternatives: [''], confidence: 0 },
                contact: { name: null, role: '', why_this_role: '', channel_type: 'not_verified', channel: null, source_url: null },
                proposal: { title: '', executive_summary: '', objectives: [''], scope: [''], deliverables: [''], timeline_days: 28, assumptions: [''], exclusions: [''] },
                email: { subject: '', body: '' },
                overall_confidence: 0,
                limitations: [''],
              },
              sources: sources.map((source) => ({ id: source.id, title: source.title, url: source.url, publisher: source.publisher, publishedAt: source.publishedAt, snippet: source.snippet })),
            }),
          },
        ],
      }),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json || typeof json !== 'object') throw new Error(`ollama_http_${response.status}`);
    const content = text(asRecord(asRecord(json).message).content);
    return { model: safeJson(content), warning: content ? null : 'OLLAMA_EMPTY_RESULT: deterministic synthesis used' };
  } catch (error) {
    return { model: null, warning: `OLLAMA_FAILED:${error instanceof Error ? error.message : 'unknown'}` };
  } finally {
    clearTimeout(timeout);
  }
}

function sourceUrls(value: unknown, sources: PublicResearchSource[]) {
  const allowed = new Set(sources.map((source) => source.url));
  return unique(stringArray(value).filter((url) => allowed.has(url)));
}

function reportFromModel(input: ProspectRadarInput, model: JsonRecord, sources: PublicResearchSource[], queries: string[], warnings: string[], runId: string): ProspectRadarReport {
  const companyModel = asRecord(model.company);
  const painModel = asRecord(model.observed_pain);
  const windowModel = asRecord(model.critical_window);
  const fitModel = asRecord(model.sfi_fit);
  const contactModel = asRecord(model.contact);
  const proposalModel = asRecord(model.proposal);
  const emailModel = asRecord(model.email);
  const today = new Date();
  const startDate = isoDate(windowModel.start_date) ?? today.toISOString().slice(0, 10);
  const endDate = isoDate(windowModel.end_date) ?? addDays(today, 45).toISOString().slice(0, 10);
  const pain = text(painModel.statement, 'No se formuló una fricción verificable.');
  const offer = matchSfiOffer(`${pain} ${text(fitModel.problem_sfi_addresses)}`, Boolean(input.allowProvisionalOffers)).offer;
  const confidence = Math.min(number01(model.overall_confidence, 0.2), Math.min(0.82, 0.15 + sources.length * 0.035));
  const company = {
    name: text(companyModel.name, text(input.company, 'NO_VERIFIED_COMPANY')),
    sector: text(companyModel.sector, text(input.sector, 'unknown')),
    region: text(companyModel.region, text(input.region, 'México')),
    website: text(companyModel.website) || null,
  };
  const candidates = (Array.isArray(model.candidates) ? model.candidates : []).slice(0, integer(input.maxCandidates, 3, 1, 5)).map((value) => {
    const item = asRecord(value);
    return {
      company: text(item.company),
      sector: text(item.sector, 'unknown'),
      reason: text(item.reason),
      confidence: number01(item.confidence),
      sourceUrls: sourceUrls(item.source_urls, sources),
    };
  }).filter((item) => item.company);
  const causalChain = (Array.isArray(model.causal_chain) ? model.causal_chain : []).map((value) => {
    const item = asRecord(value);
    const status = text(item.epistemic_status, 'source_claim');
    return {
      cause: text(item.cause),
      epistemicStatus: ['observed', 'source_claim', 'inferred', 'projected'].includes(status) ? status as ProspectRadarReport['causalChain'][number]['epistemicStatus'] : 'source_claim',
      evidenceUrls: sourceUrls(item.evidence_urls, sources),
    };
  }).filter((item) => item.cause);
  const contactSource = sources.find((source) => source.url === text(contactModel.source_url));
  const contactChannel = text(contactModel.channel);
  const contactVerified = Boolean(contactSource && contactChannel && (contactChannel === contactSource.url || contactSource.snippet.toLowerCase().includes(contactChannel.toLowerCase())));
  const proposalBase = {
    title: text(proposalModel.title, `Lectura pública preliminar SFI para ${company.name}`),
    executiveSummary: text(proposalModel.executive_summary, pain),
    objectives: stringArray(proposalModel.objectives),
    scope: stringArray(proposalModel.scope),
    deliverables: stringArray(proposalModel.deliverables),
    timelineDays: integer(proposalModel.timeline_days, offer.defaultDurationDays, 1, 180),
    assumptions: stringArray(proposalModel.assumptions),
    exclusions: unique([...offer.exclusions, ...stringArray(proposalModel.exclusions)]),
  };
  const report: ProspectRadarReport = {
    runId,
    generatedAt: new Date().toISOString(),
    researchProvider: 'public_rss_no_key',
    queryPlan: queries,
    candidates,
    company,
    observedPain: {
      statement: pain,
      affectedGroups: stringArray(painModel.affected_groups),
      observedSince: isoDate(painModel.observed_since),
      severity: ['low', 'medium', 'high', 'critical', 'unknown'].includes(text(painModel.severity)) ? text(painModel.severity) as ProspectRadarReport['observedPain']['severity'] : 'unknown',
      evidenceUrls: sourceUrls(painModel.evidence_urls, sources),
      counterEvidence: stringArray(painModel.counter_evidence),
    },
    causalChain,
    criticalWindow: {
      kind: 'projected_threshold_window',
      observedAt: today.toISOString().slice(0, 10),
      startDate,
      endDate,
      horizonDays: Math.max(1, Math.round((new Date(`${endDate}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime()) / 86_400_000)),
      threshold: text(windowModel.threshold, 'Ventana provisional para verificar persistencia y reversibilidad.'),
      triggers: stringArray(windowModel.triggers),
      counterSignals: stringArray(windowModel.counter_signals),
      confidence: number01(windowModel.confidence, confidence),
      collapseAssessment: ['not_assessable', 'elevated_risk_only', 'explicit_source_supported'].includes(text(windowModel.collapse_assessment)) ? text(windowModel.collapse_assessment) as ProspectRadarReport['criticalWindow']['collapseAssessment'] : 'not_assessable',
      caveat: 'Proyección no validada. No representa una fecha de colapso ni una predicción históricamente calibrada.',
    },
    sfiFit: {
      eligible: sources.length >= offer.minimumEvidenceSources,
      offerId: offer.id,
      offerName: offer.name,
      offerStatus: offer.status,
      problemSfiAddresses: text(fitModel.problem_sfi_addresses, pain),
      whySfi: text(fitModel.why_sfi, offer.uniqueCombination),
      uniqueCombination: offer.uniqueCombination,
      alternatives: stringArray(fitModel.alternatives),
      confidence: number01(fitModel.confidence, confidence),
    },
    contact: {
      name: text(contactModel.name) || null,
      role: text(contactModel.role, 'Responsable de operaciones, experiencia, riesgo o transformación'),
      whyThisRole: text(contactModel.why_this_role, 'Debe validar la señal y autorizar un diagnóstico delimitado.'),
      channelType: contactVerified ? (text(contactModel.channel_type, 'company_page') as ProspectRadarReport['contact']['channelType']) : 'not_verified',
      channel: contactVerified ? contactChannel : null,
      sourceUrl: contactVerified ? contactSource?.url ?? null : null,
      verified: contactVerified,
      caveat: contactVerified ? null : 'No se encontró un canal directo verificable. No inferir correos ni nombres.',
    },
    email: {
      subject: text(emailModel.subject, `Conversación diagnóstica sobre señales públicas relacionadas con ${company.name}`),
      body: text(emailModel.body, 'SFI propone validar las señales públicas antes de formular una conclusión o intervención.'),
    },
    proposal: {
      ...proposalBase,
      finalDocumentMarkdown: `# ${proposalBase.title}\n\n## Empresa\n${company.name}\n\n## Dolor observado\n${pain}\n\n## Encaje SFI\n${offer.id} · ${offer.name}\n\n## Ventana proyectada\n${startDate} → ${endDate}\n\n## Fuentes\n${sources.map((source) => `- [${source.title}](${source.url})`).join('\n')}\n\n## Confianza\n${Math.round(confidence * 100)}% · projected_not_validated\n`,
    },
    sources,
    confidence,
    epistemicStatus: 'projected_not_validated',
    limitations: unique([...stringArray(model.limitations), 'Fuentes recuperadas mediante RSS públicos sin llave.', 'Revisar cada publicación original antes de contacto externo.']),
    warnings: unique(warnings),
  };
  return report;
}

async function persistReport(report: ProspectRadarReport, input: ProspectRadarInput, actorId: string) {
  try {
    const service = createServiceSupabaseClient();
    const run = await service.from('prospect_research_runs').insert({
      mode: input.mode ?? (input.company ? 'investigate' : 'discover'),
      company_seed: text(input.company) || null,
      sector: text(input.sector) || null,
      region: text(input.region, 'Mexico'),
      pain_focus: text(input.painFocus) || null,
      lookback_days: integer(input.lookbackDays, 120, 7, 730),
      status: 'completed',
      search_provider: report.researchProvider,
      query_plan: report.queryPlan,
      warnings: report.warnings,
      created_by: actorId,
      completed_at: new Date().toISOString(),
    }).select('id').single();
    if (run.error || !run.data?.id) return;
    report.runId = String(run.data.id);
    if (report.sources.length) {
      await service.from('prospect_research_sources').upsert(report.sources.map((source) => ({
        run_id: report.runId,
        source_key: source.id,
        url: source.url,
        title: source.title,
        publisher: source.publisher,
        snippet: source.snippet,
        published_at_raw: source.publishedAt,
        retrieved_at: source.retrievedAt,
        source_type: source.sourceType,
        reliability: source.reliability,
      })), { onConflict: 'run_id,url' });
    }
    await service.from('prospect_opportunity_reports').upsert({
      run_id: report.runId,
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
  } catch {
    report.warnings = unique([...report.warnings, 'prospect_radar_persistence_unavailable']);
  }
}

export async function runNoKeyProspectRadar(input: ProspectRadarInput, actorId: string): Promise<ProspectRadarReport> {
  const queries = queryPlan(input);
  const feed = await runNoKeyNewsFeeds(queries);
  const sources = normalizeSources(feed.results);
  const ollama = await ollamaModel(input, sources);
  const model = ollama.model ?? deterministicModel(input, sources);
  const warnings = unique([
    ...feed.warnings,
    ollama.warning ?? '',
    'NO_KEY_MODE: Bing News RSS and Google News RSS used; keyed search providers disabled',
    sources.length ? '' : 'NO_PUBLIC_SOURCES_RECOVERED: refine company, sector or pain focus',
  ]);
  const report = reportFromModel(input, model, sources, queries, warnings, crypto.randomUUID());
  await persistReport(report, input, actorId);
  return report;
}
