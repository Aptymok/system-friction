import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

/**
 * ROOT Runtime Telemetry Layer.
 *
 * No reemplaza `buildAgenticRootState` (sfiAgents.ts) — ese sigue siendo
 * el cálculo en caliente de proveedores/predicciones/grafo. Esto es la
 * pieza que faltaba: quién es cada entidad formalmente, qué observó,
 * usando qué evidencia, qué patrón detectó, qué propone, y quién debe
 * autorizar el siguiente paso.
 */

export type RootAgentType =
  | 'IDENTITY'
  | 'HYPOTHESIS'
  | 'GOVERNANCE'
  | 'PREDICTION'
  | 'STUDIO_TECHNICAL'
  | 'CULTURAL'
  | 'WORLD_VECTOR'
  | 'COGNITIVE';

export type RootAgentStatus = 'ACTIVE' | 'WAITING' | 'SUPERVISED' | 'MISSING_DATA' | 'DISABLED';
export type RootAgentPermission = 'READ_ONLY' | 'PROPOSE_ONLY' | 'SUPERVISED_EXECUTE';

/**
 * Clasificación honesta de qué es cada entidad. No todo lo que observa
 * o calcula algo es un "agente" con ciclo de vida propio:
 * - agent: toma una entrada, razona, PROPONE una transición/acción.
 * - service: cálculo/consulta de apoyo, sin propuesta propia (proveedores, salud).
 * - pipeline: cadena de pasos encadenados (cultural-lab).
 * - resolver: decide identidad/pertenencia (¿esto ya existe? ¿dónde vive?).
 * - observer: detecta y reporta un patrón, sin proponer una acción.
 */
export type RootEntityKind = 'agent' | 'service' | 'pipeline' | 'resolver' | 'observer';

/**
 * Ciclo de vida real de una entidad activa (no aplica igual a 'service':
 * un servicio de solo lectura vive casi siempre en 'observing' u 'idle').
 */
export type RootLifecycleState =
  | 'created'
  | 'initialized'
  | 'observing'
  | 'idle'
  | 'degraded'
  | 'blocked_missing_data'
  | 'retired';

/**
 * Catálogo de entidades REALES que ya existen en el código — no se
 * inventó ninguna. `entityKind` es deliberadamente conservador: si algo
 * no propone una acción ni tiene ciclo propio, se clasifica como
 * 'service', 'pipeline', 'resolver' u 'observer', no como 'agent'.
 */
export const KNOWN_AGENTS: Array<{
  agentKey: string;
  name: string;
  agentType: RootAgentType;
  entityKind: RootEntityKind;
  capability: string;
  permissions: RootAgentPermission;
  initialStatus: RootAgentStatus;
  initialLifecycle: RootLifecycleState;
  notes: string;
}> = [
  {
    agentKey: 'phenomenon_identity_resolver',
    name: 'Phenomenon Identity Resolver',
    agentType: 'IDENTITY',
    entityKind: 'resolver',
    capability: 'Resuelve si un fenómeno buscado ya existe en PPOI/Studio/Field/Registry, con candidatos por similitud.',
    permissions: 'READ_ONLY',
    initialStatus: 'ACTIVE',
    initialLifecycle: 'observing',
    notes: 'Wireado en /api/ppoi/phenomena (POST). No propone acciones — decide pertenencia/identidad.',
  },
  {
    agentKey: 'phenomenon_hypothesis_view',
    name: 'Phenomenon Hypothesis View',
    agentType: 'HYPOTHESIS',
    entityKind: 'observer',
    capability: 'Consolida en lectura las hipótesis PPOI + Studio + Cultural-lab sobre un fenómeno.',
    permissions: 'READ_ONLY',
    initialStatus: 'ACTIVE',
    initialLifecycle: 'observing',
    notes: 'Wireado en /api/ppoi/phenomena/[id] (GET). Observador CULTURAL siempre bloqueado por falta de datos hasta Fase B.',
  },
  {
    agentKey: 'studio_attractor_agent',
    name: 'Studio Attractor Agent (MOP-H)',
    agentType: 'STUDIO_TECHNICAL',
    entityKind: 'agent',
    capability: 'Declara atractor/objetivo de un objeto de Studio vía MOP-H, propone perturbación mínima y próxima acción.',
    permissions: 'PROPOSE_ONLY',
    initialStatus: 'ACTIVE',
    initialLifecycle: 'observing',
    notes: 'Wireado en /api/studio/objects/[id]/attractor. Propone acción → requiere autorización humana para ejecutarse.',
  },
  {
    agentKey: 'studio_permeability_agent',
    name: 'Studio Permeability Observer',
    agentType: 'STUDIO_TECHNICAL',
    entityKind: 'observer',
    capability: 'Detecta degradación/permeabilidad longitudinal entre ediciones de un objeto de Studio.',
    permissions: 'READ_ONLY',
    initialStatus: 'ACTIVE',
    initialLifecycle: 'observing',
    notes: 'Wireado en /api/studio/objects/[id]/permeability. Reporta patrón, no propone acción por sí mismo (cita el recommendedChange ya existente en mihmThresholds).',
  },
  {
    agentKey: 'studio_field_projection_agent',
    name: 'Studio Field Projection Agent',
    agentType: 'STUDIO_TECHNICAL',
    entityKind: 'agent',
    capability: 'Proyecta un objeto de Studio contra el World Vector — divergencia + ruta correctiva propuesta.',
    permissions: 'PROPOSE_ONLY',
    initialStatus: 'ACTIVE',
    initialLifecycle: 'observing',
    notes: 'Ya existía antes de esta sesión: /api/studio/objects/[id]/project.',
  },
  {
    agentKey: 'cultural_lab_pipeline',
    name: 'Cultural Lab Pipeline (8 pasos)',
    agentType: 'CULTURAL',
    entityKind: 'pipeline',
    capability: 'worldSpectrum → MIHM → emergencia → proyección → intervención → simulación → implementación → narrativa.',
    permissions: 'PROPOSE_ONLY',
    initialStatus: 'MISSING_DATA',
    initialLifecycle: 'blocked_missing_data',
    notes: 'No persiste resultados en base de datos. interventionAgent usa plantillas, no datos reales. Es una cadena de pasos (pipeline), no un agente con ciclo propio. Pendiente Fase B.',
  },
  {
    agentKey: 'prediction_registry_agent',
    name: 'Prediction Registry Service',
    agentType: 'PREDICTION',
    entityKind: 'service',
    capability: 'Salud y listado del registro de predicciones.',
    permissions: 'READ_ONLY',
    initialStatus: 'ACTIVE',
    initialLifecycle: 'idle',
    notes: 'Ya existía: getPredictionRegistryHealth/listPredictionEntries. Es un servicio de consulta, no un agente.',
  },
  {
    agentKey: 'world_vector_agent',
    name: 'World Vector Service',
    agentType: 'WORLD_VECTOR',
    entityKind: 'service',
    capability: 'Estado del vector cultural mundial.',
    permissions: 'READ_ONLY',
    initialStatus: 'ACTIVE',
    initialLifecycle: 'idle',
    notes: 'Ya existía: runWorldVectorAgent. Pese al nombre en código, funciona como servicio de estado, no como agente con ciclo propio.',
  },
  {
    agentKey: 'governance_agent',
    name: 'Governance Agent',
    agentType: 'GOVERNANCE',
    entityKind: 'agent',
    capability: 'Cola de aprobación de acciones (mutations, self-reconstruction).',
    permissions: 'SUPERVISED_EXECUTE',
    initialStatus: 'SUPERVISED',
    initialLifecycle: 'idle',
    notes: 'Ya existía: /api/root/governance, /api/root/mutations/[id]/close, self-reconstruction/*. Autonomía intencionalmente apagada — permanece supervisado.',
  },
  {
    agentKey: 'cognitive_twin_agent',
    name: 'Cognitive Twin Service',
    agentType: 'COGNITIVE',
    entityKind: 'service',
    capability: 'Modelo cognitivo del fundador para operaciones de ROOT.',
    permissions: 'READ_ONLY',
    initialStatus: 'ACTIVE',
    initialLifecycle: 'idle',
    notes: 'Ya existía: runCognitiveTwinAgent. Es un servicio de contexto, no un agente con propuestas propias.',
  },
];

export async function ensureAgentRegistrySeeded() {
  const client = createServiceSupabaseClient();

  for (const agent of KNOWN_AGENTS) {
    const { data: existing } = await client
      .from('root_agents')
      .select('id, entity_kind')
      .eq('agent_key', agent.agentKey)
      .maybeSingle();

    if (existing) {
      // Reclasificación: si ya existía de una siembra anterior sin
      // entity_kind correcto (todo 'service' por default), corregirlo
      // no borra su historial de status/last_run — solo actualiza la
      // clasificación y metadata descriptiva.
      if (!existing.entity_kind || existing.entity_kind === 'service') {
        await client
          .from('root_agents')
          .update({
            entity_kind: agent.entityKind,
            agent_type: agent.agentType,
            capability: agent.capability,
            permissions: agent.permissions,
            notes: agent.notes,
            updated_at: new Date().toISOString(),
          })
          .eq('agent_key', agent.agentKey);
      }
      continue;
    }

    await client.from('root_agents').insert({
      agent_key: agent.agentKey,
      name: agent.name,
      agent_type: agent.agentType,
      entity_kind: agent.entityKind,
      capability: agent.capability,
      status: agent.initialStatus,
      lifecycle_state: agent.initialLifecycle,
      permissions: agent.permissions,
      notes: agent.notes,
    });
  }
}

export type RecordObservationInput = {
  agentKey: string;
  signal: string;
  confidence?: number | null;
  phenomenonId?: string | null;
  linked?: Array<{ type: string; id: string }>;
  action?: string;
  /** Observation Trace mínimo: */
  evidenceUsed?: Array<{ type: string; id: string; note?: string }>;
  patternDetected?: string | null;
  proposedAction?: string | null;
  /** true si proposedAction requiere aprobación humana antes de ejecutarse. */
  awaitingAuthorization?: boolean;
};

/**
 * Registra un evento de observación con trazabilidad completa Y actualiza
 * el ciclo de vida del agente. Si algo falla al escribir, el fallo mismo
 * queda registrado en root_telemetry_incidents — no desaparece en
 * silencio, y nunca tumba el flujo principal que lo generó.
 */
export async function recordObservationEvent(input: RecordObservationInput) {
  const client = createServiceSupabaseClient();
  const now = new Date().toISOString();

  const { error: eventError } = await client.from('root_observation_events').insert({
    agent_key: input.agentKey,
    observed_at: now,
    phenomenon_id: input.phenomenonId ?? null,
    signal: input.signal,
    confidence: input.confidence ?? null,
    linked: input.linked ?? [],
    action: input.proposedAction ?? input.action ?? 'none',
    evidence_used: input.evidenceUsed ?? [],
    pattern_detected: input.patternDetected ?? null,
    proposed_action: input.proposedAction ?? null,
    awaiting_authorization: Boolean(input.awaitingAuthorization),
  });

  if (eventError) {
    await client.from('root_telemetry_incidents').insert({
      kind: 'write_error',
      agent_key: input.agentKey,
      detail: eventError.message,
    }).then(undefined, () => undefined);
    return { ok: false as const, error: eventError.message };
  }

  await client
    .from('root_agents')
    .update({
      last_run_at: now,
      last_observation_at: now,
      last_confidence: input.confidence ?? null,
      status: 'ACTIVE',
      lifecycle_state: 'observing',
      updated_at: now,
    })
    .eq('agent_key', input.agentKey);

  return { ok: true as const };
}

export type TelemetryIntegrity = {
  estadoPipeline: 'saludable' | 'degradado' | 'desconocido';
  ultimaSincronizacion: string | null;
  minutosDesdeUltimoEvento: number | null;
  erroresEscritura24h: number;
  brechaDeSincronizacion: boolean;
  resumen: string;
};

const SYNC_GAP_MINUTES_THRESHOLD = 24 * 60; // sin ningún evento en 24h → posible brecha

export async function getTelemetryIntegrity(): Promise<TelemetryIntegrity> {
  const client = createServiceSupabaseClient();

  const [{ data: lastEvent }, { data: incidents }] = await Promise.all([
    client
      .from('root_observation_events')
      .select('observed_at')
      .order('observed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from('root_telemetry_incidents')
      .select('id, kind, occurred_at')
      .gte('occurred_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const erroresEscritura24h = (incidents ?? []).filter((i) => i.kind === 'write_error').length;

  if (!lastEvent) {
    return {
      estadoPipeline: 'desconocido',
      ultimaSincronizacion: null,
      minutosDesdeUltimoEvento: null,
      erroresEscritura24h,
      brechaDeSincronizacion: false,
      resumen: 'Todavía no se ha registrado ningún evento de observación — no hay línea base para medir integridad.',
    };
  }

  const minutosDesdeUltimoEvento = Math.round(
    (Date.now() - new Date(lastEvent.observed_at as string).getTime()) / 60000,
  );
  const brechaDeSincronizacion = minutosDesdeUltimoEvento > SYNC_GAP_MINUTES_THRESHOLD;

  const estadoPipeline: TelemetryIntegrity['estadoPipeline'] =
    erroresEscritura24h > 0 || brechaDeSincronizacion ? 'degradado' : 'saludable';

  const resumen =
    estadoPipeline === 'saludable'
      ? 'El pipeline de telemetría está escribiendo eventos sin errores recientes.'
      : brechaDeSincronizacion
        ? `Ningún agente ha reportado un evento en ${minutosDesdeUltimoEvento} minutos — posible brecha de sincronización.`
        : `${erroresEscritura24h} error(es) de escritura en las últimas 24h.`;

  return {
    estadoPipeline,
    ultimaSincronizacion: lastEvent.observed_at as string,
    minutosDesdeUltimoEvento,
    erroresEscritura24h,
    brechaDeSincronizacion,
    resumen,
  };
}

export type RootTelemetryCore = {
  generatedAt: string;
  agents: Array<{
    agentKey: string;
    name: string;
    agentType: RootAgentType;
    entityKind: RootEntityKind;
    status: RootAgentStatus;
    lifecycleState: RootLifecycleState;
    permissions: RootAgentPermission;
    capability: string;
    lastRunAt: string | null;
    lastObservationAt: string | null;
    lastConfidence: number | null;
    notes: string | null;
  }>;
  recentEvents: Array<{
    id: string;
    agentKey: string;
    observedAt: string;
    phenomenonId: string | null;
    signal: string;
    confidence: number | null;
    linked: unknown;
    action: string;
    evidenceUsed: unknown;
    patternDetected: string | null;
    proposedAction: string | null;
    awaitingAuthorization: boolean;
    authorizedBy: string | null;
    authorizedAt: string | null;
  }>;
  dynamics: {
    agentesActivos: number;
    agentesTotal: number;
    eventosUltimas24h: number;
    eventosDia_anterior: number;
    aceleracionEvidencia: 'creciendo' | 'estable' | 'desacelerando' | 'sin_datos';
    confianzaPromedio24h: number | null;
    propuestasEsperandoAutorizacion: number;
  };
  integrity: TelemetryIntegrity;
  health: {
    estado: 'operacional' | 'degradado';
    razon: string;
  };
};

export async function getRootTelemetryCore(): Promise<RootTelemetryCore> {
  await ensureAgentRegistrySeeded();

  const client = createServiceSupabaseClient();

  const [{ data: agents }, { data: recentEvents }, integrity] = await Promise.all([
    client.from('root_agents').select('*').order('name', { ascending: true }),
    client
      .from('root_observation_events')
      .select('id, agent_key, observed_at, phenomenon_id, signal, confidence, linked, action, evidence_used, pattern_detected, proposed_action, awaiting_authorization, authorized_by, authorized_at')
      .order('observed_at', { ascending: false })
      .limit(50),
    getTelemetryIntegrity(),
  ]);

  const now = Date.now();
  const last24h = (recentEvents ?? []).filter(
    (e) => now - new Date(e.observed_at as string).getTime() <= 24 * 60 * 60 * 1000,
  );
  const previous24h = (recentEvents ?? []).filter((e) => {
    const age = now - new Date(e.observed_at as string).getTime();
    return age > 24 * 60 * 60 * 1000 && age <= 48 * 60 * 60 * 1000;
  });

  let aceleracion: RootTelemetryCore['dynamics']['aceleracionEvidencia'] = 'sin_datos';
  if (last24h.length || previous24h.length) {
    if (last24h.length > previous24h.length) aceleracion = 'creciendo';
    else if (last24h.length < previous24h.length) aceleracion = 'desacelerando';
    else aceleracion = 'estable';
  }

  const confidences = last24h
    .map((e) => e.confidence as number | null)
    .filter((c): c is number => typeof c === 'number');
  const confianzaPromedio24h = confidences.length
    ? Number((confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(2))
    : null;

  const agentesTotal = agents?.length ?? 0;
  const agentesActivos = (agents ?? []).filter((a) => a.status === 'ACTIVE').length;
  const missingData = (agents ?? []).filter((a) => a.status === 'MISSING_DATA').length;
  const propuestasEsperandoAutorizacion = (recentEvents ?? []).filter((e) => e.awaiting_authorization).length;

  return {
    generatedAt: new Date().toISOString(),
    agents: (agents ?? []).map((a) => ({
      agentKey: a.agent_key,
      name: a.name,
      agentType: a.agent_type,
      entityKind: (a.entity_kind ?? 'service') as RootEntityKind,
      status: a.status,
      lifecycleState: (a.lifecycle_state ?? 'created') as RootLifecycleState,
      permissions: a.permissions,
      capability: a.capability,
      lastRunAt: a.last_run_at,
      lastObservationAt: a.last_observation_at,
      lastConfidence: a.last_confidence,
      notes: a.notes,
    })),
    recentEvents: (recentEvents ?? []).map((e) => ({
      id: e.id as string,
      agentKey: e.agent_key as string,
      observedAt: e.observed_at as string,
      phenomenonId: e.phenomenon_id as string | null,
      signal: e.signal as string,
      confidence: e.confidence as number | null,
      linked: e.linked,
      action: e.action as string,
      evidenceUsed: e.evidence_used,
      patternDetected: e.pattern_detected as string | null,
      proposedAction: e.proposed_action as string | null,
      awaitingAuthorization: Boolean(e.awaiting_authorization),
      authorizedBy: e.authorized_by as string | null,
      authorizedAt: e.authorized_at as string | null,
    })),
    dynamics: {
      agentesActivos,
      agentesTotal,
      eventosUltimas24h: last24h.length,
      eventosDia_anterior: previous24h.length,
      aceleracionEvidencia: aceleracion,
      confianzaPromedio24h,
      propuestasEsperandoAutorizacion,
    },
    integrity,
    health: {
      estado: missingData > 0 || integrity.estadoPipeline === 'degradado' ? 'degradado' : 'operacional',
      razon:
        integrity.estadoPipeline === 'degradado'
          ? integrity.resumen
          : missingData > 0
            ? `${missingData} entidad(es) sin datos reales todavía (ver notes).`
            : 'Todos los agentes registrados tienen datos o están correctamente marcados como supervisados.',
    },
  };
}
