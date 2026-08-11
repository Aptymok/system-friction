import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { runReportAgent } from '@/lib/agents/sfiAgents';
import { runNoKeyProspectRadar } from '@/lib/agents/noKeyProspectRadar';
import { buildWorldVectorOperationalState } from '@/lib/world-vector/operationalState';
import { readObservedSfiCognitiveRuntime } from '@/lib/sfi/cognitive-runtime/observedRuntime';
import { readContinuityDashboard } from '@/lib/continuity/runtime';
import { readInstitutionalAttractor, refreshInstitutionalAttractorTrajectory } from '@/lib/institution/institutionalAttractor';

export type ScheduledReportKey = 'world_daily' | 'world_weekly' | 'internal_daily' | 'prospect_weekly' | 'attractor_daily';

type Row = Record<string, unknown>;
type ReportEnvelope = {
  ok: boolean;
  type: string;
  title: string;
  body: string;
  evidence: string[];
  provider: string;
  warnings: string[];
  trace: Record<string, unknown>;
  approval_queue: Record<string, unknown>;
};

type ScheduledResult = {
  key: ScheduledReportKey;
  taskId: string;
  state: 'GENERATED' | 'SKIPPED_EXISTING' | 'FAILED';
  reportId: string | null;
  error: string | null;
};

function rec(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}
function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))];
}
function mexicoDateKey(date = new Date()) {
  const values = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => values.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
function isoWeekKey(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  const target = new Date(date);
  const day = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / 604_800_000);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
function taskId(key: ScheduledReportKey, dateKey: string, weekKey: string) {
  return `scheduled-report:${key}:${key.includes('weekly') ? weekKey : dateKey}`;
}
function scheduleCadence(key: ScheduledReportKey) {
  return key.includes('weekly') ? 'weekly' as const : 'daily' as const;
}

async function persistScheduledReport(input: {
  key: ScheduledReportKey;
  dateKey: string;
  weekKey: string;
  title: string;
  output: ReportEnvelope;
  extraInput?: Record<string, unknown>;
}) {
  const db = createServiceSupabaseClient();
  const id = taskId(input.key, input.dateKey, input.weekKey);
  const existing = await db.from('sfi_cognitive_twin_runs')
    .select('id,status,created_at')
    .eq('role', 'report_agent')
    .eq('task_id', id)
    .maybeSingle();
  if (existing.error) throw new Error(`scheduled_report_lookup_failed:${existing.error.message}`);
  if (existing.data?.id) return { id: String(existing.data.id), skipped: true };

  const startedAt = new Date().toISOString();
  const inserted = await db.from('sfi_cognitive_twin_runs').insert({
    task_id: id,
    contract_version: 'report-agent-scheduled-v1',
    provider: input.output.provider || null,
    model: null,
    role: 'report_agent',
    status: input.output.ok && !input.output.provider.startsWith('degraded:') && !input.output.provider.startsWith('blocked:') ? 'READY' : 'BLOCKED',
    objective: input.title,
    input_snapshot: {
      reportType: input.output.type,
      scheduleKey: input.key,
      schedule: {
        key: input.key,
        cadence: scheduleCadence(input.key),
        period: input.key.includes('weekly') ? input.weekKey : input.dateKey,
        timezone: 'America/Mexico_City',
        generatedBy: 'continuity-report-cron',
      },
      ...input.extraInput,
    },
    output_envelope: input.output,
    evidence_refs: input.output.evidence,
    limitations: input.output.warnings,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
  }).select('id').single();
  if (inserted.error || !inserted.data?.id) throw new Error(`scheduled_report_persistence_failed:${inserted.error?.message ?? 'unknown'}`);
  return { id: String(inserted.data.id), skipped: false };
}

function internalEnvelope(input: {
  runtime: Awaited<ReturnType<typeof readObservedSfiCognitiveRuntime>>;
  continuity: Awaited<ReturnType<typeof readContinuityDashboard>>;
  attractor: Awaited<ReturnType<typeof readInstitutionalAttractor>>;
  dateKey: string;
}): ReportEnvelope {
  const operational = input.runtime.agents.filter((agent) => agent.status === 'operational');
  const degraded = input.runtime.agents.filter((agent) => agent.status === 'degraded');
  const missing = input.runtime.agents.filter((agent) => agent.status === 'missing');
  const gated = input.runtime.agents.filter((agent) => agent.status === 'gated');
  const latestTrajectory = rec(input.attractor.latestTrajectory);
  const body = [
    `SFI · REPORTE INTERNO DIARIO · ${input.dateKey}`,
    '',
    'RUNTIME COGNITIVO',
    input.runtime.summary,
    `Operativos: ${operational.length}; gated: ${gated.length}; degradados: ${degraded.length}; missing: ${missing.length}.`,
    degraded.length ? `Degradados: ${degraded.map((agent) => `${agent.id} [${agent.evidence.missingTables.join(', ') || 'dependencia parcial'}]`).join(' · ')}` : 'Sin agentes degradados declarados.',
    missing.length ? `Sin soporte suficiente: ${missing.map((agent) => agent.id).join(', ')}` : 'Sin agentes missing declarados.',
    '',
    'CONTINUIDAD INSTITUCIONAL',
    `Modo: ${text(rec(input.continuity.state).mode, 'UNKNOWN')}. Incidentes abiertos: ${input.continuity.incidents.length}. Decisiones pendientes: ${input.continuity.decisions.length}.`,
    '',
    'ATRACTOR INSTITUCIONAL',
    `Cobertura de evidencia: ${text(latestTrajectory.evidence_coverage, 'MISSING')}. Esto es cobertura de dimensiones con evidencia/contradicción; NO es porcentaje de cumplimiento del atractor.`,
    `Dimensiones soportadas: ${strings(latestTrajectory.supported_dimensions).join(', ') || 'ninguna observada'}.`,
    `Dimensiones faltantes: ${strings(latestTrajectory.missing_dimensions).join(', ') || 'ninguna declarada'}.`,
    `Dimensiones contradichas/conflictivas: ${strings(latestTrajectory.contradicted_dimensions).join(', ') || 'ninguna declarada'}.`,
    '',
    'SIGUIENTE LECTURA',
    degraded.length || missing.length
      ? 'Primero reconciliar dependencias/contratos del runtime; no elevar capacidad por presencia de código.'
      : 'Runtime sin degradación estructural observada en esta lectura; continuar con retorno, calibración y gobernanza.',
  ].join('\n');
  return {
    ok: true,
    type: 'internal_daily',
    title: `SFI interno · ${input.dateKey}`,
    body,
    evidence: unique([
      ...input.runtime.eventGraph.recentEvents.slice(0, 30).map((event) => event.eventId),
      ...strings(latestTrajectory.evidence_refs),
    ]),
    provider: 'deterministic:sfi-internal-observer',
    warnings: unique([...input.runtime.eventGraph.warnings.map(String), ...input.continuity.errors.map(String), ...input.attractor.warnings]),
    trace: {
      runtimeSchema: input.runtime.schemaVersion,
      continuityRuns: input.continuity.runs.length,
      attractorSnapshot: latestTrajectory.id ?? null,
    },
    approval_queue: {},
  };
}

function attractorEnvelope(input: {
  refresh: Awaited<ReturnType<typeof refreshInstitutionalAttractorTrajectory>>;
  attractor: Awaited<ReturnType<typeof readInstitutionalAttractor>>;
  world: Awaited<ReturnType<typeof buildWorldVectorOperationalState>>;
  dateKey: string;
}): ReportEnvelope {
  const latest = rec(input.attractor.latestTrajectory);
  const dimensions = rec(latest.dimension_state);
  const dimensionLines = Object.entries(dimensions).map(([key, value]) => {
    const state = rec(value);
    return `- ${key}: ${text(state.status, 'MISSING')} · soporte ${text(state.observedCount, '0')} · contradicción ${text(state.contradictionCount, '0')}`;
  });
  const attractorRecord = rec(input.attractor.attractor);
  const attractorVector = rec(attractorRecord.vector);
  const body = [
    `SFI · ATRACTOR DECLARADO / EVIDENCIA / MUNDO · ${input.dateKey}`,
    '',
    `Atractor: ${input.refresh.attractorKey}`,
    `Estado deseado declarado: ${text(attractorVector.desiredState, 'MISSING · no se recuperó desiredState del atractor persistido')}.`,
    `Cobertura de evidencia: ${input.refresh.evidenceCoverage}. NO equivale a cumplimiento ni proximidad porcentual al atractor.`,
    '',
    'DIMENSIONES',
    ...(dimensionLines.length ? dimensionLines : ['- MISSING · no hay dimension_state persistido.']),
    '',
    'MUNDO ACTUAL',
    `World Vector status: ${input.world.today.observation.status}.`,
    `Señal dominante: ${input.world.today.observation.dominant_signal ?? 'MISSING'}.`,
    `Interpretación: ${input.world.today.observation.interpretation}.`,
    '',
    'LECTURA DE TRAYECTORIA',
    input.refresh.contradictedDimensions.length
      ? `Hay contradicción/conflicto en: ${input.refresh.contradictedDimensions.join(', ')}.`
      : 'No hay dimensiones contradichas en el snapshot generado.',
    input.refresh.missingDimensions.length
      ? `Falta evidencia explícita para: ${input.refresh.missingDimensions.join(', ')}.`
      : 'Todas las dimensiones tienen al menos evidencia o contradicción persistida; eso no prueba attainment.',
    '',
    'REGLA',
    'Este reporte compara el atractor declarado contra evidencia persistida y contexto mundial. No convierte intención en evidencia, cobertura en éxito ni correlación en causalidad.',
  ].join('\n');
  return {
    ok: input.refresh.ok,
    type: 'attractor_progress',
    title: `Atractor declarado · evidencia + mundo · ${input.dateKey}`,
    body,
    evidence: unique([
      ...input.refresh.dimensions.flatMap((dimension) => [...dimension.evidenceRefs, ...dimension.contradictionRefs]),
      ...strings(latest.evidence_refs),
      input.world.today.observation.source_snapshot_id ?? null,
    ]),
    provider: 'deterministic:institutional-attractor-observer',
    warnings: unique([...input.refresh.warnings, ...input.attractor.warnings, ...input.world.agent_audit.blocked]),
    trace: {
      attractorKey: input.refresh.attractorKey,
      trajectoryObservedAt: input.refresh.observedAt,
      worldSnapshot: input.world.today.observation.source_snapshot_id ?? null,
    },
    approval_queue: {},
  };
}

function prospectEnvelope(report: Awaited<ReturnType<typeof runNoKeyProspectRadar>>, weekKey: string): ReportEnvelope {
  const candidates = report.candidates.length
    ? report.candidates.map((candidate) => `- ${candidate.company} · ${candidate.sector} · confidence ${candidate.confidence}: ${candidate.reason}`).join('\n')
    : '- MISSING · no se recuperaron candidatos verificables.';
  const body = [
    `SFI · PROSPECT RADAR SEMANAL · ${weekKey}`,
    '',
    'CANDIDATOS',
    candidates,
    '',
    `Candidato principal: ${report.company.name}`,
    `Dolor observado/provisional: ${report.observedPain.statement}`,
    `Encaje SFI: ${report.sfiFit.offerId} · ${report.sfiFit.offerName} · ${report.sfiFit.offerStatus}`,
    `Ventana proyectada: ${report.criticalWindow.startDate} → ${report.criticalWindow.endDate}.`,
    `Contacto verificable: ${report.contact.verified ? 'sí' : 'no'}.`,
    '',
    'LÍMITE',
    'Este reporte descubre señales públicas y candidatos. No autoriza contacto, no afirma causalidad y no convierte titulares en dolor institucional confirmado.',
  ].join('\n');
  return {
    ok: true,
    type: 'prospect_scan',
    title: `Prospect Radar · ${weekKey}`,
    body,
    evidence: unique(report.sources.map((source) => source.url)),
    provider: report.researchProvider,
    warnings: unique([...report.warnings, ...report.limitations]),
    trace: { runId: report.runId, queryPlan: report.queryPlan, confidence: report.confidence },
    approval_queue: {
      approval_required: true,
      action: 'review_before_contact',
      status: 'queued_for_approval',
      reason: 'External contact remains founder-governed.',
    },
  };
}

async function rootActorId() {
  const db = createServiceSupabaseClient();
  const result = await db.from('profiles').select('user_id,role').eq('role', 'root').limit(1).maybeSingle();
  return result.error ? null : text(rec(result.data).user_id) || null;
}

async function ensure(input: {
  key: ScheduledReportKey;
  dateKey: string;
  weekKey: string;
  title: string;
  generate: () => Promise<ReportEnvelope>;
  extraInput?: Record<string, unknown>;
}): Promise<ScheduledResult> {
  const id = taskId(input.key, input.dateKey, input.weekKey);
  try {
    const db = createServiceSupabaseClient();
    const existing = await db.from('sfi_cognitive_twin_runs').select('id').eq('role', 'report_agent').eq('task_id', id).maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data?.id) return { key: input.key, taskId: id, state: 'SKIPPED_EXISTING', reportId: String(existing.data.id), error: null };
    const output = await input.generate();
    const persisted = await persistScheduledReport({ ...input, output });
    return { key: input.key, taskId: id, state: persisted.skipped ? 'SKIPPED_EXISTING' : 'GENERATED', reportId: persisted.id, error: null };
  } catch (error) {
    return { key: input.key, taskId: id, state: 'FAILED', reportId: null, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function runScheduledAgentReportCycle() {
  const dateKey = mexicoDateKey();
  const weekKey = isoWeekKey(dateKey);
  const results: ScheduledResult[] = [];

  results.push(await ensure({
    key: 'world_daily', dateKey, weekKey, title: `Mundo · reporte diario · ${dateKey}`,
    generate: async () => {
      const report = await runReportAgent({ type: 'world_vector_internal', subject: `WORLD DAILY ${dateKey} · describe sólo evidencia disponible y tensiones actuales; separa observado, inferido y proyectado.` });
      return { ...report, type: 'world_daily', title: `Mundo · reporte diario · ${dateKey}` };
    },
  }));

  results.push(await ensure({
    key: 'internal_daily', dateKey, weekKey, title: `SFI interno · ${dateKey}`,
    generate: async () => {
      const [runtime, continuity, attractor] = await Promise.all([
        readObservedSfiCognitiveRuntime(),
        readContinuityDashboard(),
        readInstitutionalAttractor(),
      ]);
      return internalEnvelope({ runtime, continuity, attractor, dateKey });
    },
  }));

  results.push(await ensure({
    key: 'attractor_daily', dateKey, weekKey, title: `Atractor declarado · evidencia + mundo · ${dateKey}`,
    generate: async () => {
      const refresh = await refreshInstitutionalAttractorTrajectory();
      const [attractor, world] = await Promise.all([readInstitutionalAttractor(), buildWorldVectorOperationalState()]);
      return attractorEnvelope({ refresh, attractor, world, dateKey });
    },
  }));

  results.push(await ensure({
    key: 'world_weekly', dateKey, weekKey, title: `Mundo · reporte semanal · ${weekKey}`,
    generate: async () => {
      const report = await runReportAgent({ type: 'world_vector_internal', subject: `WORLD WEEKLY ${weekKey} · sintetiza trayectoria de la semana usando sólo estado/evidencia disponible; identifica tensiones persistentes, cambios, contradicciones y qué observar la próxima semana.` });
      return { ...report, type: 'world_weekly', title: `Mundo · reporte semanal · ${weekKey}` };
    },
  }));

  results.push(await ensure({
    key: 'prospect_weekly', dateKey, weekKey, title: `Prospect Radar · ${weekKey}`,
    generate: async () => {
      const actorId = await rootActorId();
      if (!actorId) {
        return {
          ok: false,
          type: 'prospect_scan',
          title: `Prospect Radar · ${weekKey}`,
          body: 'BLOCKED · no existe un actor ROOT persistido que pueda atribuir la corrida de Prospect Radar. No se fabrica identidad de ejecución.',
          evidence: [],
          provider: 'blocked:no-root-actor',
          warnings: ['root_actor_missing_for_prospect_radar'],
          trace: { weekKey },
          approval_queue: {},
        } satisfies ReportEnvelope;
      }
      const report = await runNoKeyProspectRadar({ mode: 'discover', region: 'Mexico', lookbackDays: 30, maxCandidates: 3, allowProvisionalOffers: false }, actorId);
      return prospectEnvelope(report, weekKey);
    },
  }));

  return {
    ok: results.every((result) => result.state !== 'FAILED'),
    dateKey,
    weekKey,
    generated: results.filter((result) => result.state === 'GENERATED').length,
    skipped: results.filter((result) => result.state === 'SKIPPED_EXISTING').length,
    failed: results.filter((result) => result.state === 'FAILED').length,
    results,
  };
}
