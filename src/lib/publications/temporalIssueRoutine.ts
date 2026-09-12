import 'server-only';

import { runAmvRuntime } from '@/lib/amv/core/amvRuntime';
import { getPredictiveEngineHealth } from '@/lib/predictive-engine/service';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import type { WorldVectorReport } from '@/lib/world-vector/types';

type Row = Record<string, unknown>;

type MonthWindow = {
  label: string;
  periodStart: string;
  periodEnd: string;
  startIso: string;
  endExclusiveIso: string;
};

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
}

function text(value: unknown, max = 1800) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function number(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function previousCalendarMonth(reference = new Date()): MonthWindow {
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth();
  const start = new Date(Date.UTC(year, month - 1, 1));
  const endExclusive = new Date(Date.UTC(year, month, 1));
  const end = new Date(endExclusive.getTime() - 1);
  const monthName = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(start);
  return {
    label: monthName.charAt(0).toUpperCase() + monthName.slice(1),
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
    startIso: start.toISOString(),
    endExclusiveIso: endExclusive.toISOString(),
  };
}

function compactObservation(row: Row) {
  return {
    id: text(row.id, 120),
    title: text(row.title, 500),
    sourceFamily: text(row.source_family, 120),
    publisher: text(row.publisher, 180),
    observedAt: text(row.observed_at, 120),
    affectedSystems: Array.isArray(row.affected_systems) ? row.affected_systems.slice(0, 12) : [],
    actors: Array.isArray(row.actors) ? row.actors.slice(0, 12) : [],
    confidence: number(row.confidence),
  };
}

function compactHypothesis(row: Row) {
  return {
    id: text(row.id, 120),
    statement: text(row.statement, 1200),
    status: text(row.status, 80),
    initialConfidence: number(row.initial_confidence),
    currentConfidence: number(row.current_confidence),
    expectedSignals: Array.isArray(row.expected_signals) ? row.expected_signals.slice(0, 10) : [],
    contradictionSignals: Array.isArray(row.contradiction_signals) ? row.contradiction_signals.slice(0, 10) : [],
    validationStartsAt: text(row.validation_starts_at, 120),
    validationEndsAt: text(row.validation_ends_at, 120),
    evidenceIds: Array.isArray(row.evidence_ids) ? row.evidence_ids.slice(0, 20) : [],
  };
}

function compactOutcome(row: Row) {
  return {
    id: text(row.id, 120),
    hypothesisId: text(row.hypothesis_id, 120),
    classification: text(row.classification, 100),
    observedOutcome: text(row.observed_outcome, 1200),
    directionalAccuracy: number(row.directional_accuracy),
    sourceCoverage: number(row.source_coverage),
    evaluatedAt: text(row.evaluated_at, 120),
  };
}

function compactInvestigation(row: Row) {
  return {
    id: text(row.id, 120),
    mode: text(row.mode, 120),
    source: text(row.source, 240),
    dataMode: text(row.data_mode, 120),
    systems: Array.isArray(row.systems) ? row.systems.slice(0, 12) : [],
    variables: Array.isArray(row.variables) ? row.variables.slice(0, 12) : [],
    limitations: Array.isArray(row.limitations) ? row.limitations.slice(0, 12) : [],
    recommendations: Array.isArray(row.recommendations) ? row.recommendations.slice(0, 12) : [],
    createdAt: text(row.created_at, 120),
  };
}

function bodyFor(input: {
  window: MonthWindow;
  observations: ReturnType<typeof compactObservation>[];
  hypotheses: ReturnType<typeof compactHypothesis>[];
  outcomes: ReturnType<typeof compactOutcome>[];
  investigations: ReturnType<typeof compactInvestigation>[];
  vane: Awaited<ReturnType<typeof runAmvRuntime>>;
  atlas: Awaited<ReturnType<typeof runAmvRuntime>>;
  predictive: Awaited<ReturnType<typeof getPredictiveEngineHealth>> | null;
  warnings: string[];
}) {
  const lines = [
    `# Notas Temporales — ${input.window.label}`,
    '',
    'Estado: candidato editorial mensual generado por rutina institucional.',
    '',
    '## Corte observado',
    '',
    `- Observaciones públicas incluidas en la ventana: ${input.observations.length}.`,
    `- Hipótesis abiertas/creadas en la ventana: ${input.hypotheses.length}.`,
    `- Retornos de hipótesis evaluados en la ventana: ${input.outcomes.length}.`,
    `- Investigaciones de Method Lab observadas en la ventana: ${input.investigations.length}.`,
    '',
    '## Hipótesis y contraste',
    '',
    ...input.hypotheses.slice(0, 12).map((item) => `- ${item.statement ?? 'Hipótesis sin statement materializado'} [${item.status ?? 'UNKNOWN'}]`),
    '',
    '## RETURN observado',
    '',
    ...input.outcomes.slice(0, 12).map((item) => `- ${item.classification ?? 'UNCLASSIFIED'} — ${item.observedOutcome ?? 'Sin outcome textual materializado.'}`),
    '',
    '## Instrumentos',
    '',
    `- Signal Vane: ${input.vane.ok ? input.vane.response.resultado : `UNAVAILABLE (${input.vane.error})`}`,
    `- Cluster Atlas: ${input.atlas.ok ? input.atlas.response.resultado : `UNAVAILABLE (${input.atlas.error})`}`,
    `- Predictive Engine: ${input.predictive ? 'health contract observado; proyecciones siguen separadas de hechos observados.' : 'health no disponible en esta ejecución.'}`,
    '',
    '## Frontera epistémica',
    '',
    '- OBSERVED, DERIVED, INFERRED, PROJECTED y MISSING permanecen separados.',
    '- Signal Vane y Cluster Atlas leen contexto; no adquieren autoridad de ejecución ni un store propio.',
    '- Predictive Engine produce hipótesis/proyecciones gobernadas y aprende sólo de outcomes admitidos por su contrato.',
    '- Este objeto es un candidato editorial. No modifica por sí mismo el Canonical Object Registry ni demuestra Discovery, PULL o RETURN externo.',
  ];
  if (input.warnings.length) lines.push('', '## Faltantes / degradaciones', '', ...input.warnings.map((warning) => `- ${warning}`));
  return lines.join('\n');
}

async function persistMonthlyCandidate(report: WorldVectorReport) {
  const db = createServiceSupabaseClient();
  const existing = await db
    .from('world_vector_reports')
    .select('*')
    .eq('report_type', report.report_type)
    .eq('target_audience', report.target_audience)
    .eq('period_start', report.period_start)
    .eq('period_end', report.period_end)
    .eq('status', 'draft')
    .limit(1)
    .maybeSingle();
  if (existing.error) return { ok: false as const, error: existing.error.message };
  if (existing.data) return { ok: true as const, persisted: true as const, existing: true as const, data: existing.data as Row };

  const inserted = await db.from('world_vector_reports').insert({
    cycle_id: null,
    report_type: report.report_type,
    target_audience: report.target_audience,
    period_start: report.period_start,
    period_end: report.period_end,
    title: report.title,
    body: report.body,
    json_payload: report.json_payload,
    status: 'draft',
  }).select('*').single();
  if (inserted.error || !inserted.data) return { ok: false as const, error: inserted.error?.message ?? 'temporal_issue_insert_failed' };
  return { ok: true as const, persisted: true as const, existing: false as const, data: inserted.data as Row };
}

export async function runTemporalIssueRoutine(reference = new Date()) {
  const db = createServiceSupabaseClient();
  const window = previousCalendarMonth(reference);
  const [observationsResult, hypothesesResult, outcomesResult, investigationsResult, predictiveResult] = await Promise.all([
    db.from('world_source_observations')
      .select('id,source_family,publisher,title,observed_at,affected_systems,actors,confidence')
      .gte('observed_at', window.startIso).lt('observed_at', window.endExclusiveIso)
      .order('observed_at', { ascending: false }).limit(500),
    db.from('world_hypotheses')
      .select('id,statement,status,initial_confidence,current_confidence,expected_signals,contradiction_signals,validation_starts_at,validation_ends_at,evidence_ids,cutoff_at')
      .gte('cutoff_at', window.startIso).lt('cutoff_at', window.endExclusiveIso)
      .order('cutoff_at', { ascending: false }).limit(200),
    db.from('world_hypothesis_outcomes')
      .select('id,hypothesis_id,classification,observed_outcome,directional_accuracy,source_coverage,evaluated_at')
      .gte('evaluated_at', window.startIso).lt('evaluated_at', window.endExclusiveIso)
      .order('evaluated_at', { ascending: false }).limit(200),
    db.from('sfi_lab_analyses')
      .select('id,mode,source,data_mode,systems,variables,limitations,recommendations,created_at')
      .gte('created_at', window.startIso).lt('created_at', window.endExclusiveIso)
      .order('created_at', { ascending: false }).limit(120),
    getPredictiveEngineHealth().catch(() => null),
  ]);

  const warnings = [
    observationsResult.error && `world_observations:${observationsResult.error.message}`,
    hypothesesResult.error && `world_hypotheses:${hypothesesResult.error.message}`,
    outcomesResult.error && `world_hypothesis_outcomes:${outcomesResult.error.message}`,
    investigationsResult.error && `method_lab:${investigationsResult.error.message}`,
    !predictiveResult && 'predictive_health_unavailable',
  ].filter((value): value is string => Boolean(value));

  const observations = rows(observationsResult.data).map(compactObservation);
  const hypotheses = rows(hypothesesResult.data).map(compactHypothesis);
  const outcomes = rows(outcomesResult.data).map(compactOutcome);
  const investigations = rows(investigationsResult.data).map(compactInvestigation);

  const selectedContext = {
    contract: 'SFI-TEMPORAL-ISSUE-MONTHLY-CONTEXT-1.0',
    period: window,
    observations: observations.slice(0, 80),
    hypotheses: hypotheses.slice(0, 60),
    outcomes: outcomes.slice(0, 60),
    investigations: investigations.slice(0, 40),
    predictiveHealth: predictiveResult,
    epistemicBoundary: 'Context contains source records, governed hypotheses/outcomes, bounded Method Lab records and Predictive health. Instrument readings remain DERIVED/INFERRED and cannot become observed fact by composition.',
  };

  const [vane, atlas] = await Promise.all([
    runAmvRuntime({
      scope: 'signal-vane',
      message: `Lee el corte mensual ${window.label}. Separa señal de ruido, identifica umbrales y conserva cualquier proyección como escenario, no como hecho.`,
      selectedContext,
    }),
    runAmvRuntime({
      scope: 'cluster-atlas',
      message: `Lee el corte mensual ${window.label}. Agrupa patrones persistentes y cambios de régimen posibles sin inferir causalidad ni crear entidades nuevas.`,
      selectedContext,
    }),
  ]);

  const report: WorldVectorReport = {
    title: `Notas Temporales — ${window.label} · candidato mensual`,
    body: bodyFor({ window, observations, hypotheses, outcomes, investigations, vane, atlas, predictive: predictiveResult, warnings }),
    report_type: 'temporal_issue_monthly',
    target_audience: 'repository',
    period_start: window.periodStart,
    period_end: window.periodEnd,
    json_payload: {
      contract: 'SFI-NOTAS-TEMPORALES-MONTHLY-CANDIDATE-1.0',
      generatedAt: new Date().toISOString(),
      window,
      counts: {
        observations: observations.length,
        hypotheses: hypotheses.length,
        outcomes: outcomes.length,
        investigations: investigations.length,
      },
      observations,
      hypotheses,
      outcomes,
      investigations,
      instruments: { signalVane: vane, clusterAtlas: atlas },
      predictiveHealth: predictiveResult,
      warnings,
      authority: {
        publicationCandidate: true,
        canonicalMutation: false,
        externalExecution: false,
        evidencePromotion: false,
      },
    },
  };

  const persistence = await persistMonthlyCandidate(report);
  return {
    ok: persistence.ok && !observationsResult.error,
    contract: 'SFI-AUTONOMOUS-EDITORIAL-ROUTINE-1.0',
    window,
    report,
    persistence,
    vane,
    atlas,
    predictiveHealth: predictiveResult,
    warnings,
    boundary: 'Routine work proceeds founder-away. Canonical publication, constitutional change and material irreversible external action remain governed separately.',
  };
}
