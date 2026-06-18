import { buildScoreFrictionScopeState } from '@/lib/amv/scopes/scorefriction/scorefrictionStateConnector';
import { appendAmvLearning, readAmvThoughts } from '@/lib/amv/learning';
import { appendLogbookEntry } from '@/lib/logbook/query';
import { readWorldSpectVectorSnapshot } from '@/lib/worldspect/vector-store';
import { listScoreFrictionProtoAttractors } from './proto-attractors';
import { listScoreFrictionLongitudinal } from './longitudinal';
import { readScoreFrictionEvidence } from './store';
import { evaluateRegimeWatch } from './regimeWatch';
import type { OperationalCycleInput, OperationalCycleState, ScoreFrictionScope } from './contracts/operationalCycle';

type Row = Record<string, unknown>;

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function str(value: unknown, fallback: string | null = null) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeScope(value: unknown): ScoreFrictionScope {
  const allowed: ScoreFrictionScope[] = ['world', 'culture', 'music', 'writing', 'cinema', 'institution', 'personal', 'project', 'campaign', 'custom'];
  return allowed.includes(value as ScoreFrictionScope) ? value as ScoreFrictionScope : 'culture';
}

export async function buildOperationalCycle(input: Partial<OperationalCycleInput>): Promise<OperationalCycleState> {
  const caseId = str(input.case_id, 'SFI-OP-LOCAL') ?? 'SFI-OP-LOCAL';
  const warnings: string[] = [];
  const [scoreState, worldResult, protoResult, longitudinalResult, evidenceResult, thoughts] = await Promise.all([
    buildScoreFrictionScopeState().catch((error) => {
      warnings.push(error instanceof Error ? error.message : 'scorefriction_state_failed');
      return null;
    }),
    readWorldSpectVectorSnapshot().catch((error) => {
      warnings.push(error instanceof Error ? error.message : 'worldspect_failed');
      return null;
    }),
    listScoreFrictionProtoAttractors(caseId).catch(() => ({ ok: false, data: [] })),
    listScoreFrictionLongitudinal(caseId).catch(() => ({ ok: false, data: [] })),
    readScoreFrictionEvidence(caseId).catch(() => ({ ok: false, entries: [] })),
    readAmvThoughts(caseId),
  ]);

  const snapshot = worldResult?.snapshot ?? null;
  const vectors = rows(record(snapshot).vectors);
  const scope = normalizeScope(input.scope);
  const filtered = vectors.find((vector) => String(vector.domain ?? '').toLowerCase().includes(scope === 'culture' ? 'cultural' : scope)) ?? vectors[0] ?? null;
  const degradationLevel = filtered ? num(filtered.degradation, 1) : 1;
  const weakSignals = vectors
    .filter((vector) => num(vector.persistence) > 0 && num(vector.trust) < 0.55)
    .map((vector) => ({ vector: vector.domain, persistence: vector.persistence, trust: vector.trust, status: num(vector.persistence) > 0.55 ? 'persistent' : 'emergent' }));
  const persistentSignals = vectors
    .filter((vector) => num(vector.persistence) >= 0.45)
    .map((vector) => ({ vector: vector.domain, persistence: vector.persistence, observed_at: vector.observed_at }));
  const previousRegime = null;
  const currentRegime = str(record(snapshot).regime);
  const directionCurrent = num(record(snapshot).nti) > 0.6 ? 'tension rising' : num(record(snapshot).wsi) > 0.55 ? 'field consolidating' : 'low signal';
  const directionProjected = degradationLevel > 0.55 ? 'degradation rising' : directionCurrent;
  const evidence = rows(record(evidenceResult).entries);
  const scoreWarnings = scoreState?.warnings ?? [];
  const supabaseWarningText = scoreWarnings.join(' ').toLowerCase();
  const supabaseOk = !/(service_role|fetch failed|self_signed_cert|self-signed|certificate|tls)/i.test(supabaseWarningText);
  const supabaseWarnings = supabaseOk ? [] : [
    'supabase_degraded: Supabase no esta operativo para esta lectura.',
    'supabase_tls_note: si el entorno usa proxy/certificado corporativo, configurar NODE_EXTRA_CA_CERTS con el certificado CA. No usar NODE_TLS_REJECT_UNAUTHORIZED=0 como solucion permanente.',
  ];
  const state: OperationalCycleState = {
    case_id: caseId,
    objective: str(input.objective),
    twin_state: scoreState,
    world_vector: snapshot,
    filtered_vector: filtered,
    weak_signals: weakSignals,
    persistent_signals: persistentSignals,
    signal_lifetimes: rows(longitudinalResult.data).map((event) => ({ id: event.id, first_seen: event.created_at, last_seen: event.updated_at ?? event.created_at, state: event.status ?? 'observed' })),
    attractors: rows(protoResult.data),
    degradation: {
      level: degradationLevel,
      trend: degradationLevel > 0.55 ? 'rising' : degradationLevel < 0.25 ? 'falling' : 'stable',
      notes: degradationLevel >= 1 ? ['WorldSpectrumVector sin fuente suficiente para este filtro.'] : [],
    },
    regime: {
      world: currentRegime,
      vector: str(filtered?.status) ?? currentRegime,
      previous: previousRegime,
      changed: Boolean(previousRegime && previousRegime !== currentRegime),
    },
    direction: {
      current: directionCurrent,
      projected: directionProjected,
      confidence: filtered ? num(filtered.trust) : null,
    },
    contrast: input.run_contrast ? { evaluated_object: input.evaluated_object ?? null, vector: filtered, status: 'contrast_requested' } : undefined,
    minimal_action: weakSignals.length || degradationLevel > 0.55 ? { action: 'Perturbacion minima con evidencia antes/despues.', scope } : null,
    evidence,
    amv_learning: thoughts,
    technical_state: {
      worldspect_ok: Boolean(worldResult?.ok && snapshot),
      scorefriction_ok: Boolean(scoreState?.ok),
      python_ok: false,
      supabase_ok: supabaseOk,
      fallback_used: worldResult?.status !== 'ACTIVE' || Boolean(scoreState?.warnings?.length),
      saved: evidence.length > 0,
      warnings: [...warnings, ...scoreWarnings, ...supabaseWarnings, ...(worldResult?.status !== 'ACTIVE' ? ['worldspect_degraded_or_bootstrapped'] : [])],
    },
  };
  const watch = evaluateRegimeWatch(state);
  state.alert = {
    active: watch.active,
    severity: watch.severity,
    reason: watch.active ? 'Regime Watch detecto cambio de direccion, degradacion o persistencia acumulada.' : 'Sin alerta temprana activa.',
    window: watch.critical_window,
    action_required: watch.minimal_action,
  };
  return state;
}

export async function persistOperationalCycle(input: OperationalCycleInput) {
  const state = await buildOperationalCycle(input);
  const logEntry = await appendLogbookEntry({
    scope: 'scorefriction',
    visibility: 'root',
    owner_user_id: input.user_id ?? null,
    case_id: input.case_id,
    event_type: 'operational_cycle',
    title: 'ScoreFriction operational cycle',
    summary: `Ciclo ${input.case_id}: ${state.direction.current ?? 'sin direccion'} -> ${state.direction.projected ?? 'sin proyeccion'}.`,
    payload: state,
  });
  const learning = await appendAmvLearning({
    case_id: input.case_id,
    source: 'scorefriction.operational_cycle',
    event_type: 'cycle_observed',
    summary: state.alert?.active ? state.alert.reason : 'el ciclo fue observado y registrado.',
    payload: { state, logbook_id: logEntry.id },
  });
  return { state, logEntry, learning };
}
