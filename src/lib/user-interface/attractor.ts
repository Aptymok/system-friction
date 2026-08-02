import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import type { MiniMophInput } from '@/lib/user-interface/phenotype';

export type AttractorCode =
  | 'AVOIDANCE'
  | 'VALIDATION'
  | 'CONTROL'
  | 'OVERLOAD'
  | 'RECURRENCE'
  | 'COHERENCE';

export type AttractorDescriptor = {
  code: AttractorCode;
  label: string;
  summary: string;
  objective: string;
  direction: string;
  confidence: number;
};

export type EvidenceAssessment = {
  status: 'ACCEPTED' | 'PARTIAL' | 'OBSERVED_NOT_INTEGRATED' | 'REJECTED';
  relevance: number;
  traceability: number;
  confidence: number;
  reason: string;
  nextAction: string;
  metrics: Array<{
    key: string;
    label: string;
    value: number;
    status: 'DERIVED_PROXY';
    source: string;
    confidence: number;
    formulaVersion: string;
    canonicalCalibration: false;
  }>;
};

type Row = Record<string, unknown>;
type MophResult = {
  friction_reading?: string;
  conversion_break?: string;
  minimal_perturbation?: string;
  risk?: string;
  confidence?: number;
};

const MIHM_EVIDENCE_VERSION = 'USER_OBSERVATORY_MIHM_EVIDENCE_PROXY_V1';

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function normalized(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function tokens(value: string) {
  return new Set(
    normalized(value)
      .split(/[^a-z0-9]+/)
      .filter((item) => item.length >= 4)
      .slice(0, 300),
  );
}

function overlap(left: string, right: string) {
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const item of a) if (b.has(item)) shared += 1;
  return shared / Math.max(1, Math.min(a.size, b.size));
}

function scoreMatches(value: string, patterns: RegExp[]) {
  return patterns.reduce((score, pattern) => score + (pattern.test(value) ? 1 : 0), 0);
}

function classifyAttractor(value: string): AttractorCode {
  const source = normalized(value);
  const scores: Record<AttractorCode, number> = {
    AVOIDANCE: scoreMatches(source, [/evit/, /pospon/, /miedo/, /bloque/, /huir/, /no quiero/, /paraliz/]),
    VALIDATION: scoreMatches(source, [/valid/, /aprob/, /reconoc/, /acept/, /opinion/, /respuesta/, /atencion/]),
    CONTROL: scoreMatches(source, [/control/, /certeza/, /predec/, /asegurar/, /perfect/, /orden/, /garanti/]),
    OVERLOAD: scoreMatches(source, [/satur/, /agot/, /demasiad/, /carga/, /presion/, /abrum/, /urgenc/]),
    RECURRENCE: scoreMatches(source, [/repet/, /vuelve/, /retorn/, /ciclo/, /otra vez/, /insist/, /rumi/]),
    COHERENCE: scoreMatches(source, [/direccion/, /decidir/, /mover/, /cambio/, /objetivo/, /aline/, /continu/]) + 0.5,
  };
  return (Object.entries(scores) as Array<[AttractorCode, number]>)
    .sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'COHERENCE';
}

function labelFor(code: AttractorCode) {
  const labels: Record<AttractorCode, string> = {
    AVOIDANCE: 'Atractor de evitación',
    VALIDATION: 'Atractor de validación',
    CONTROL: 'Atractor de control',
    OVERLOAD: 'Atractor de saturación',
    RECURRENCE: 'Atractor de recurrencia',
    COHERENCE: 'Atractor de coherencia y dirección',
  };
  return labels[code];
}

function summaryFor(code: AttractorCode, objective: string) {
  const target = objective || 'una dirección observable y sostenida';
  const summaries: Record<AttractorCode, string> = {
    AVOIDANCE: `El campo tiende a conservar distancia frente a la acción necesaria. La dirección declarada es avanzar hacia ${target}.`,
    VALIDATION: `El campo concentra movimiento alrededor de señales externas de aceptación. La dirección declarada es sostener ${target} sin depender de confirmación inmediata.`,
    CONTROL: `El campo busca reducir incertidumbre antes de permitir movimiento. La dirección declarada es aproximarse a ${target} mediante decisiones reversibles.`,
    OVERLOAD: `El campo acumula señales y obligaciones hasta perder capacidad de conversión. La dirección declarada es recuperar trayectoria hacia ${target}.`,
    RECURRENCE: `El campo vuelve a una secuencia conocida incluso cuando no produce avance. La dirección declarada es desplazar la repetición hacia ${target}.`,
    COHERENCE: `El campo requiere alinear intención, evidencia y acción. La dirección declarada es consolidar ${target} como trayectoria observable.`,
  };
  return summaries[code];
}

function directionFor(code: AttractorCode) {
  const directions: Record<AttractorCode, string> = {
    AVOIDANCE: 'reducir distancia entre reconocimiento y acción',
    VALIDATION: 'desplazar la decisión desde aprobación externa hacia evidencia propia',
    CONTROL: 'convertir incertidumbre en una prueba pequeña y reversible',
    OVERLOAD: 'reducir variables simultáneas y recuperar una secuencia ejecutable',
    RECURRENCE: 'interrumpir una repetición y observar una alternativa verificable',
    COHERENCE: 'alinear intención, evidencia y movimiento sostenido',
  };
  return directions[code];
}

function perturbationFor(code: AttractorCode, repeatedContext: string) {
  const context = repeatedContext || 'el contexto donde el patrón aparece con mayor frecuencia';
  const instructions: Record<AttractorCode, string> = {
    AVOIDANCE: `Cuando el patrón aparezca en ${context}, registra la primera acción evitada y ejecuta sólo su versión reversible de menos de diez minutos.`,
    VALIDATION: `Cuando el patrón aparezca en ${context}, retrasa veinte minutos la búsqueda de confirmación y registra qué evidencia propia ya existía.`,
    CONTROL: `Cuando el patrón aparezca en ${context}, elige una variable controlable, fija una prueba de 72 horas y evita modificar cualquier otra.`,
    OVERLOAD: `Cuando el patrón aparezca en ${context}, elimina temporalmente una obligación no crítica y ejecuta una sola acción de avance.`,
    RECURRENCE: `Cuando el patrón aparezca en ${context}, sustituye una respuesta habitual por una acción distinta, pequeña y reversible, y registra el efecto.`,
    COHERENCE: `Cuando el patrón aparezca en ${context}, escribe la siguiente acción observable y ejecútala antes de añadir otra explicación.`,
  };
  return {
    title: 'Perturbación mínima del campo',
    instruction: instructions[code],
    verificationWindow: '72h',
    reversible: true,
    externalExecutionRequiresApproval: true,
  };
}

export function deriveInitialAttractor(input: MiniMophInput, result: MophResult): AttractorDescriptor {
  const source = [
    input.stuckSystem,
    input.objective,
    input.attempts,
    input.evidence,
    input.consequence,
    result.friction_reading,
    result.conversion_break,
  ].filter(Boolean).join(' ');
  const code = classifyAttractor(source);
  const objective = input.objective || 'movimiento verificable fuera del patrón actual';
  const baseConfidence = typeof result.confidence === 'number' ? result.confidence : 0.42;
  return {
    code,
    label: labelFor(code),
    summary: summaryFor(code, objective),
    objective,
    direction: directionFor(code),
    confidence: clamp01(Math.min(0.72, baseConfidence * 0.72 + 0.18)),
  };
}

export function calibrationPrompts() {
  return [
    'Cuando vuelva a aparecer el pensamiento, impulso o tensión central',
    'Cuando notes que tu dirección cambia, se detiene o se desvía',
    'Cuando una situación aumente o reduzca claramente la tensión',
  ];
}

export async function createInitialAttractor(input: {
  ownerId: string;
  caseId: string;
  mophRunId: string;
  descriptor: AttractorDescriptor;
  sourceInput: MiniMophInput;
  result: MophResult;
}) {
  const service = createServiceSupabaseClient();
  const hypothesis = {
    statement: `El patrón ${input.descriptor.code} organiza la fricción declarada y condiciona el movimiento hacia el objetivo.`,
    expectedSignal: 'Repetición contextual consistente durante la ventana inicial de 72 horas.',
    disclosure: 'internal_only',
  };
  const { data, error } = await service
    .from('sfi_user_attractors')
    .upsert({
      owner_id: input.ownerId,
      case_id: input.caseId,
      moph_run_id: input.mophRunId,
      status: 'CALIBRATING',
      code: input.descriptor.code,
      label: input.descriptor.label,
      summary: input.descriptor.summary,
      objective: input.descriptor.objective,
      direction: input.descriptor.direction,
      confidence: input.descriptor.confidence,
      initial_payload: {
        source: 'mini_moph',
        input: input.sourceInput,
        risk: input.result.risk ?? null,
      },
      internal_hypothesis: hypothesis,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'owner_id,case_id' })
    .select('id,status,code,label,objective,direction,confidence')
    .single();
  if (error || !data) throw new Error(`INITIAL_ATTRACTOR_PERSISTENCE_FAILED: ${error?.message ?? 'missing_row'}`);
  return data as Row;
}

export async function attachCalibrationWindow(ownerId: string, attractorId: string, windowId: string) {
  const service = createServiceSupabaseClient();
  const { error } = await service
    .from('sfi_user_attractors')
    .update({ source_window_id: windowId, updated_at: new Date().toISOString() })
    .eq('id', attractorId)
    .eq('owner_id', ownerId);
  if (error) throw new Error(`ATTRACTOR_WINDOW_LINK_FAILED: ${error.message}`);
}

function mostFrequent(values: string[]) {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? '';
}

export async function finalizeAttractorFromWindow(ownerId: string, windowId: string) {
  const service = createServiceSupabaseClient();
  const { data: windowRow, error: windowError } = await service
    .from('field_participant_windows')
    .select('*')
    .eq('id', windowId)
    .eq('owner_id', ownerId)
    .single();
  if (windowError || !windowRow) throw new Error(`ATTRACTOR_WINDOW_READ_FAILED: ${windowError?.message ?? 'missing_window'}`);
  if (windowRow.status !== 'CLOSED') throw new Error('ATTRACTOR_WINDOW_NOT_CLOSED');
  if (!windowRow.attractor_id) throw new Error('ATTRACTOR_WINDOW_NOT_LINKED');

  const [{ data: attractor, error: attractorError }, { data: marks, error: marksError }] = await Promise.all([
    service.from('sfi_user_attractors').select('*').eq('id', windowRow.attractor_id).eq('owner_id', ownerId).single(),
    service.from('field_participant_marks').select('*').eq('window_id', windowId).eq('owner_id', ownerId).order('moment_at'),
  ]);
  if (attractorError || !attractor) throw new Error(`ATTRACTOR_READ_FAILED: ${attractorError?.message ?? 'missing_attractor'}`);
  if (marksError) throw new Error(`ATTRACTOR_MARKS_READ_FAILED: ${marksError.message}`);

  const markRows = (marks ?? []) as Row[];
  const reflection = [
    windowRow.reflection_what_changed,
    windowRow.reflection_what_noticed,
    windowRow.reflection_what_avoided,
    windowRow.reflection_what_was_mine,
    windowRow.reflection_what_was_not_mine,
    windowRow.reflection_needed_today,
  ].map(text).join(' ');
  const markText = markRows.map((mark) => [
    mark.trigger_text,
    mark.activity,
    mark.location_context,
    mark.social_context,
    mark.thought_after,
    mark.feeling_after,
    mark.action_after,
    mark.note,
  ].map(text).join(' ')).join(' ');
  const initialCode = text(attractor.code) as AttractorCode;
  const classified = classifyAttractor(`${markText} ${reflection}`);
  const code = markRows.length >= 3 ? classified : initialCode;
  const repeatedContext = mostFrequent(markRows.map((mark) => text(mark.activity) || text(mark.location_context)));
  const completedContextFields = markRows.reduce((count, mark) => count + [
    mark.trigger_text,
    mark.activity,
    mark.location_context,
    mark.thought_after,
    mark.feeling_after,
  ].filter((value) => text(value)).length, 0);
  const contextCoverage = markRows.length ? completedContextFields / (markRows.length * 5) : 0;
  const confidence = clamp01(0.46 + Math.min(0.24, markRows.length * 0.035) + contextCoverage * 0.18);
  const descriptor: AttractorDescriptor = {
    code,
    label: labelFor(code),
    summary: summaryFor(code, text(attractor.objective)),
    objective: text(attractor.objective),
    direction: directionFor(code),
    confidence,
  };
  const perturbation = perturbationFor(code, repeatedContext);
  const hypothesis = {
    statement: `El atractor ${code} predice que el patrón reaparecerá bajo contextos equivalentes a ${repeatedContext || 'los registrados durante la calibración'}.`,
    expectedSignal: 'Cambio observable después de una perturbación mínima reversible.',
    evidenceWindow: '72h',
    disclosure: 'internal_only',
  };

  const declaredAt = new Date().toISOString();
  const { error: updateError } = await service
    .from('sfi_user_attractors')
    .update({
      status: 'DECLARED',
      code: descriptor.code,
      label: descriptor.label,
      summary: descriptor.summary,
      direction: descriptor.direction,
      confidence: descriptor.confidence,
      final_payload: {
        markCount: markRows.length,
        repeatedContext,
        contextCoverage,
        reflectionCaptured: true,
      },
      perturbation,
      internal_hypothesis: hypothesis,
      declared_at: declaredAt,
      updated_at: declaredAt,
    })
    .eq('id', attractor.id)
    .eq('owner_id', ownerId);
  if (updateError) throw new Error(`ATTRACTOR_DECLARE_FAILED: ${updateError.message}`);

  const { data: centralNode, error: centralError } = await service
    .from('sfi_user_graph_nodes')
    .insert({
      owner_id: ownerId,
      case_id: attractor.case_id,
      attractor_id: attractor.id,
      node_type: 'attractor',
      label: descriptor.label,
      summary: descriptor.summary,
      weight: descriptor.confidence,
      is_central: true,
      source_type: 'attractor_declaration',
      source_id: attractor.id,
      metadata: { objective: descriptor.objective, direction: descriptor.direction },
      observed_at: declaredAt,
    })
    .select('id')
    .single();
  if (centralError || !centralNode) throw new Error(`ATTRACTOR_NODE_CREATE_FAILED: ${centralError?.message ?? 'missing_node'}`);

  for (const mark of markRows) {
    const { data: markNode, error: markNodeError } = await service
      .from('sfi_user_graph_nodes')
      .insert({
        owner_id: ownerId,
        case_id: attractor.case_id,
        attractor_id: attractor.id,
        node_type: 'mark',
        label: text(mark.trigger_text) || `Marca día ${String(mark.day_number ?? '')}`,
        summary: text(mark.thought_after) || text(mark.note) || null,
        weight: clamp01((Number(mark.intensity) || 3) / 5),
        source_type: 'field_participant_mark',
        source_id: String(mark.id),
        metadata: {
          activity: mark.activity ?? null,
          location: mark.location_context ?? null,
          feelingAfter: mark.feeling_after ?? null,
          actionAfter: mark.action_after ?? null,
        },
        observed_at: mark.moment_at,
      })
      .select('id')
      .single();
    if (markNodeError || !markNode) continue;
    await service.from('sfi_user_graph_edges').insert({
      owner_id: ownerId,
      case_id: attractor.case_id,
      attractor_id: attractor.id,
      source_node_id: markNode.id,
      target_node_id: centralNode.id,
      relation: 'calibrates_attractor',
      strength: clamp01((Number(mark.intensity) || 3) / 5),
      direction: 'contextual',
      curvature: 0,
      metadata: { windowId },
    });
  }

  const { data: hypothesisRow } = await service.from('field_hypotheses').insert({
    case_id: attractor.case_id,
    owner_id: ownerId,
    statement: hypothesis.statement,
    target: descriptor.objective,
    expected_signal: hypothesis.expectedSignal,
    verification_window: '72h',
    confidence: descriptor.confidence,
    status: 'PENDING',
    evidence_ids: [],
  }).select('id').single();

  let interventionId: string | null = null;
  if (hypothesisRow?.id) {
    const { data: intervention } = await service.from('field_interventions').insert({
      case_id: attractor.case_id,
      owner_id: ownerId,
      hypothesis_id: hypothesisRow.id,
      minimum_change: perturbation.instruction,
      prohibited_effects: ['multiple simultaneous variables', 'irreversible external action without approval'],
      status: 'PENDING',
      evidence_ids: [],
    }).select('id').single();
    interventionId = intervention?.id ?? null;
  }

  await Promise.all([
    service.from('field_cases').update({
      declared_attractor: descriptor.label,
      status: 'ATTRACTOR_DECLARED',
      updated_at: declaredAt,
      metadata: {
        ...(attractor.initial_payload && typeof attractor.initial_payload === 'object' ? attractor.initial_payload : {}),
        attractorId: attractor.id,
        attractorConfidence: descriptor.confidence,
      },
    }).eq('id', attractor.case_id).eq('owner_id', ownerId),
    service.from('field_participant_windows').update({ graph_seeded_at: declaredAt }).eq('id', windowId).eq('owner_id', ownerId),
  ]);

  return {
    attractorId: String(attractor.id),
    caseId: String(attractor.case_id),
    descriptor,
    perturbation: { ...perturbation, interventionId },
    graphSeeded: true,
  };
}

export function deriveEvidenceAssessment(input: {
  attractor: AttractorDescriptor;
  note: string;
  source: string;
  hasFile: boolean;
  reliability: number;
}) : EvidenceAssessment {
  const relevance = clamp01(
    overlap(`${input.note} ${input.source}`, `${input.attractor.label} ${input.attractor.summary} ${input.attractor.objective}`) * 0.72
      + (input.note.trim().length >= 40 ? 0.18 : 0.05)
      + (input.hasFile ? 0.1 : 0),
  );
  const traceability = clamp01(
    (input.source.trim() ? 0.32 : 0.08)
      + (input.note.trim().length >= 24 ? 0.28 : 0.08)
      + (input.hasFile ? 0.25 : 0)
      + clamp01(input.reliability) * 0.15,
  );
  const confidence = clamp01(relevance * 0.55 + traceability * 0.45);
  const status: EvidenceAssessment['status'] = confidence >= 0.66
    ? 'ACCEPTED'
    : confidence >= 0.46
      ? 'PARTIAL'
      : confidence >= 0.25
        ? 'OBSERVED_NOT_INTEGRATED'
        : 'REJECTED';
  const reason = status === 'ACCEPTED'
    ? 'La evidencia es trazable y mantiene relación suficiente con el atractor y la trayectoria observada.'
    : status === 'PARTIAL'
      ? 'La evidencia aporta señal, pero requiere una observación comparable o mayor trazabilidad.'
      : status === 'OBSERVED_NOT_INTEGRATED'
        ? 'La evidencia se conserva como evento, pero todavía no modifica el atractor ni la trayectoria.'
        : 'La evidencia no tiene trazabilidad o relación suficiente con el caso activo.';
  const nextAction = status === 'ACCEPTED'
    ? 'Sostener la perturbación vigente y registrar el siguiente efecto comparable.'
    : status === 'PARTIAL'
      ? 'Añadir contexto temporal y una segunda observación antes de cambiar la perturbación.'
      : 'Conservar el evento y continuar la observación sin modificar el campo.';
  return {
    status,
    relevance,
    traceability,
    confidence,
    reason,
    nextAction,
    metrics: [
      { key: 'E_rel', label: 'Relevancia respecto del atractor', value: relevance, status: 'DERIVED_PROXY', source: 'evidence + declared attractor', confidence, formulaVersion: MIHM_EVIDENCE_VERSION, canonicalCalibration: false },
      { key: 'E_tr', label: 'Trazabilidad de evidencia', value: traceability, status: 'DERIVED_PROXY', source: 'source + note + artifact + reliability', confidence, formulaVersion: MIHM_EVIDENCE_VERSION, canonicalCalibration: false },
      { key: 'Phi_e', label: 'Flujo de coherencia de evidencia', value: confidence, status: 'DERIVED_PROXY', source: 'relevance + traceability', confidence, formulaVersion: MIHM_EVIDENCE_VERSION, canonicalCalibration: false },
    ],
  };
}
