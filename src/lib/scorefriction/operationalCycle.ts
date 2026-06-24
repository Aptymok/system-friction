import { buildScoreFrictionScopeState } from '@/lib/amv/scopes/scorefriction/scorefrictionStateConnector';
import { appendAmvLearning, readAmvThoughts } from '@/lib/amv/learning';
import { appendLogbookEntry } from '@/lib/logbook/query';
import { readWorldSpectVectorSnapshot } from '@/lib/worldspect/vector-store';
import { listScoreFrictionProtoAttractors } from './proto-attractors';
import { listScoreFrictionLongitudinal } from './longitudinal';
import { readScoreFrictionEvidence } from './store';
import { evaluateRegimeWatch } from './regimeWatch';
import type {
  MihmReadout,
  EvaluatedObjectType,
  OperationalCycleInput,
  OperationalCycleState,
  OperationalExperiment,
  PsiReadout,
  ScoreFrictionReadout,
  ScoreFrictionScope,
} from './contracts/operationalCycle';

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

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function round4(value: number) {
  return Number(clamp01(value).toFixed(4));
}

function objectText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (!value) return '';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function detectObjectType(value: unknown): EvaluatedObjectType {
  if (!value) return 'unknown';
  if (typeof value === 'string') return value.trim() ? 'text' : 'unknown';
  const item = record(value);
  const declared = String(item.object_type ?? item.type ?? item.media_type ?? item.mime ?? '').toLowerCase();
  if (/audio|mp3|wav|m4a|flac|ogg/.test(declared)) return 'audio';
  if (/image|png|jpg|jpeg|webp|gif/.test(declared)) return 'image';
  if (/video|mp4|mov|webm/.test(declared)) return 'video';
  if (/document|pdf|docx|markdown|md|txt/.test(declared)) return 'document';
  if (/campaign/.test(declared)) return 'campaign';
  if (typeof item.text === 'string' || typeof item.content === 'string' || typeof item.body === 'string') return 'document';
  if (Array.isArray(item.assets) || Array.isArray(item.posts) || item.campaign) return 'campaign';
  return 'unknown';
}

function objectTypeSupportsLexical(type: EvaluatedObjectType) {
  return type === 'text' || type === 'document' || type === 'campaign';
}

function hasObject(input: Partial<OperationalCycleInput>) {
  return Boolean(objectText(input.evaluated_object).trim() || objectText(input.evidence_input).trim());
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9_]+/i)
    .map((item) => item.trim())
    .filter(Boolean);
}

function lexicalDiversity(tokens: string[]) {
  if (!tokens.length) return 0;
  return new Set(tokens).size / tokens.length;
}

function overlapScore(tokens: string[], vector: Row) {
  const domain = String(vector.domain ?? '').toLowerCase();
  const sourceText = rows(vector.sources).join(' ').toLowerCase();
  const haystack = `${domain} ${sourceText}`;
  const hits = tokens.filter((token) => token.length > 3 && haystack.includes(token)).length;
  return clamp01(hits / Math.max(1, Math.min(tokens.length, 12)));
}

function safeDomain(vector: Row | null) {
  return String(vector?.domain ?? vector?.vector ?? 'WORLD');
}

export function normalizeScope(value: unknown): ScoreFrictionScope {
  const allowed: ScoreFrictionScope[] = ['world', 'culture', 'music', 'writing', 'cinema', 'institution', 'personal', 'project', 'campaign', 'custom'];
  return allowed.includes(value as ScoreFrictionScope) ? value as ScoreFrictionScope : 'culture';
}

function buildWorldContext(snapshot: Row) {
  const vectors = rows(snapshot.vectors);
  const strongest = vectors
    .map((vector) => ({
      domain: String(vector.domain ?? 'UNKNOWN'),
      persistence: num(vector.persistence),
      trust: num(vector.trust),
      degradation: num(vector.degradation),
    }))
    .sort((a, b) => b.persistence - a.persistence)
    .slice(0, 3);

  const regime = str(snapshot.regime, 'sin regimen');
  const wsi = num(snapshot.wsi, 0);
  const nti = num(snapshot.nti, 0);
  const sourceCoverage = num(snapshot.sourceCoverage, 0);
  const list = strongest.map((item) => `${item.domain} persistencia ${item.persistence.toFixed(2)}`).join(', ') || 'sin vectores dominantes';

  return {
    summary: `Hoy el campo mundial esta en regimen ${regime}. WSI ${wsi.toFixed(4)}, NTI ${nti.toFixed(4)}, cobertura ${sourceCoverage.toFixed(2)}. Vectores dominantes: ${list}.`,
    regime,
    wsi,
    nti,
    sourceCoverage,
    strongest_vectors: strongest,
  };
}

function unavailableMihm(reason: string): MihmReadout {
  return {
    available: false,
    reason,
    homeostasis: null,
    friction: null,
    coherence: null,
    degradation: null,
    regime: 'insufficient_object',
    meaning: 'MIHM no se calcula sin objeto. Primero carga texto, audio, imagen descrita, campaÃ±a, canciÃ³n, decisiÃ³n o evidencia concreta.',
  };
}

function unavailablePsi(reason: string): PsiReadout {
  return {
    available: false,
    reason,
    recurrence: null,
    symbolic_identity: null,
    persistence: null,
    signal_life: 'none',
    weak_signal_count: 0,
    meaning: 'PSI no se calcula sin objeto. PSI requiere una seÃ±al observable para medir reapariciÃ³n, identidad simbÃ³lica y vida de seÃ±al.',
  };
}

function unavailableScore(reason: string): ScoreFrictionReadout {
  return {
    available: false,
    reason,
    direction_bias: null,
    attraction: null,
    friction: null,
    perturbation_need: null,
    opportunity: null,
    meaning: 'ScoreFriction no decide intervenciÃ³n sin objeto. Solo puede leer el mundo; no puede decir quÃ© hacer con algo que no existe en la entrada.',
  };
}

function unavailableMihmForType(objectType: EvaluatedObjectType): MihmReadout {
  const reason = `analysis_unavailable_${objectType}`;
  return {
    ...unavailableMihm(reason),
    meaning: `MIHM no esta disponible para objeto tipo ${objectType} sin analizador especifico conectado. No se trata como texto JSON.`,
  };
}

function unavailablePsiForType(objectType: EvaluatedObjectType): PsiReadout {
  const reason = `analysis_unavailable_${objectType}`;
  return {
    ...unavailablePsi(reason),
    meaning: `PSI no esta disponible para objeto tipo ${objectType} sin analizador especifico conectado. No se trata como texto JSON.`,
  };
}

function unavailableScoreForType(objectType: EvaluatedObjectType): ScoreFrictionReadout {
  const reason = `analysis_unavailable_${objectType}`;
  return {
    ...unavailableScore(reason),
    meaning: `ScoreFriction no calcula intervencion para objeto tipo ${objectType} sin analizador especifico conectado. No se trata como texto JSON.`,
  };
}

function buildObjectReadouts(text: string, filtered: Row | null, weakSignals: Row[]): {
  mihm: MihmReadout;
  psi: PsiReadout;
  scorefriction: ScoreFrictionReadout;
} {
  const tokens = tokenize(text);
  const lengthScore = clamp01(tokens.length / 180);
  const diversity = lexicalDiversity(tokens);
  const trust = num(filtered?.trust, 0);
  const persistence = num(filtered?.persistence, 0);
  const vectorDegradation = num(filtered?.degradation, 1);
  const overlap = overlapScore(tokens, filtered ?? {});
  const symbolicIdentity = round4((diversity * 0.45) + (overlap * 0.35) + (lengthScore * 0.2));
  const coherence = round4((symbolicIdentity * 0.45) + (trust * 0.35) + ((1 - vectorDegradation) * 0.2));
  const friction = round4(Math.abs(num(filtered?.value, 0.5) - symbolicIdentity) * 0.55 + vectorDegradation * 0.45);
  const homeostasis = round4((coherence * 0.6) + ((1 - friction) * 0.4));
  const degradation = round4((vectorDegradation * 0.55) + ((1 - coherence) * 0.45));
  const regime = degradation > 0.68 ? 'critical' : degradation > 0.42 ? 'tension' : 'stable';
  const recurrence = round4((persistence * 0.55) + (overlap * 0.25) + (weakSignals.length ? 0.12 : 0));
  const signalLife = recurrence > 0.7 ? 'long' : recurrence > 0.45 ? 'medium' : recurrence > 0.18 ? 'short' : 'none';
  const directionBias = round4(num(filtered?.value, 0) * 0.6 + persistence * 0.4);
  const attraction = round4((coherence * 0.55) + (persistence * 0.45));
  const perturbationNeed = round4((friction * 0.5) + (degradation * 0.35) + ((1 - trust) * 0.15));
  const opportunity = round4((attraction * 0.45) + ((1 - perturbationNeed) * 0.35) + (trust * 0.2));

  return {
    mihm: {
      available: true,
      homeostasis,
      friction,
      coherence,
      degradation,
      regime,
      meaning: `MIHM mide estabilidad interna del objeto contra el vector filtrado. Coherencia ${coherence} indica ${coherence >= 0.62 ? 'buena conversaciÃ³n con el vector' : coherence >= 0.42 ? 'conversaciÃ³n parcial con fricciÃ³n manejable' : 'baja conversaciÃ³n con el vector'}. FricciÃ³n ${friction} indica ${friction > 0.65 ? 'choque alto' : friction > 0.42 ? 'tensiÃ³n media' : 'baja tensiÃ³n'}.`,
    },
    psi: {
      available: true,
      recurrence,
      symbolic_identity: symbolicIdentity,
      persistence: recurrence,
      signal_life: signalLife,
      weak_signal_count: weakSignals.length,
      meaning: `PSI mide si el objeto puede sostener seÃ±al simbÃ³lica. Vida ${signalLife}; identidad ${symbolicIdentity}. No se confirma por intensidad aislada, sino por retorno comparable en snapshots posteriores.`,
    },
    scorefriction: {
      available: true,
      direction_bias: directionBias,
      attraction,
      friction,
      perturbation_need: perturbationNeed,
      opportunity,
      meaning: `ScoreFriction mide si conviene intervenir. Oportunidad ${opportunity}; necesidad de perturbaciÃ³n ${perturbationNeed}. ${opportunity >= 0.58 ? 'Puede abrirse experimento controlado.' : 'No conviene campaÃ±a fuerte; falta confirmaciÃ³n o timing.'}`,
    },
  };
}

function buildExperiment(params: {
  hasObjectInput: boolean;
  caseId: string;
  filtered: Row | null;
  worldContext: ReturnType<typeof buildWorldContext>;
  mihm: MihmReadout;
  psi: PsiReadout;
  scorefriction: ScoreFrictionReadout;
}): OperationalExperiment {
  const vector = safeDomain(params.filtered);
  if (!params.hasObjectInput) {
    return {
      id: `EXP-${Date.now().toString(36)}`,
      vector,
      status: 'blocked_no_object',
      hypothesis: 'No hay objeto evaluado. No se puede inferir impacto, intervenciÃ³n ni campaÃ±a.',
      recommended_surface: null,
      action: 'Carga un objeto o pega evidencia. Puede ser texto, letra, descripciÃ³n de imagen, campaÃ±a, canciÃ³n, decisiÃ³n o reporte.',
      expected_effect: 'Habilitar contraste real objeto vs mundo + vector filtrado.',
      verification_window: 'sin ventana; falta objeto',
      success_condition: 'Exito = el usuario carga un objeto y el sistema calcula MIHM, PSI y ScoreFriction sobre ese objeto.',
      failure_condition: 'Fallo = se intenta recomendar acciÃ³n sin objeto.',
      evidence_required: ['objeto a evaluar', 'contexto/fuente', 'objetivo declarado'],
      confidence: null,
      plain_language: 'No puedo decirte que publiques, esperes o intervengas porque no me diste un objeto. Solo puedo leer el estado del mundo.',
    };
  }

  const opportunity = num(params.scorefriction.opportunity, 0);
  const coherence = num(params.mihm.coherence, 0);
  const recurrence = num(params.psi.persistence, 0);
  const degradation = num(params.mihm.degradation, 1);
  const ready = opportunity >= 0.58 && coherence >= 0.45 && degradation < 0.62;
  return {
    id: `EXP-${Date.now().toString(36)}`,
    vector,
    status: ready ? 'ready_for_test' : 'watch_only',
    hypothesis: `Si el objeto conserva coherencia MIHM ${coherence} y persistencia PSI ${recurrence} contra ${vector}, puede generar seÃ±al emergente sin forzar ruido.`,
    recommended_surface: ready ? 'ScoreFriction / SFI-LAB campaign panel' : 'Evidence Ledger / WorldVector watch',
    action: ready
      ? `Ejecutar experimento pequeÃ±o: publicar una pieza de prueba del objeto en ${vector}, con una tesis, evidencia y pregunta medible.`
      : 'No ejecutar campaÃ±a todavÃ­a. Registrar objeto como evidencia y comparar contra los prÃ³ximos snapshots.',
    expected_effect: ready
      ? 'Detectar si el objeto produce retorno comparable o mejora coherencia del vector filtrado.'
      : 'Evitar ruido hasta que aparezca aceleraciÃ³n, retorno comparable o mejora de coherencia.',
    verification_window: ready ? '48-72 horas' : '3 snapshots o 72 horas',
    success_condition: `Exito = aparece evidencia comparable nueva o ${vector} sube persistencia >= ${(num(params.filtered?.persistence, 0) + 0.05).toFixed(4)} sin aumentar degradaciÃ³n > 0.08.`,
    failure_condition: 'Fallo = no aparece evidencia comparable, aumenta degradaciÃ³n > 0.08, o el objeto pierde coherencia con el vector.',
    evidence_required: ['objeto analizado', 'timestamp', 'fuente/contexto', 'metrica antes', 'metrica despues', 'outcome'],
    confidence: round4((opportunity + coherence + recurrence + (1 - degradation)) / 4),
    plain_language: ready
      ? 'Puedes hacer una prueba pequeÃ±a y medir. No escales campaÃ±a hasta ver retorno.'
      : 'No hagas campaÃ±a fuerte. Guarda evidencia y observa el siguiente cambio real.',
  };
}

function answerAmv(question: string | null, hasObjectInput: boolean, experiment: OperationalExperiment, worldContext: ReturnType<typeof buildWorldContext>) {
  if (!question) {
    return {
      question,
      can_answer: true,
      answer: hasObjectInput
        ? `${experiment.plain_language} AcciÃ³n: ${experiment.action}`
        : 'Lectura disponible: el mundo estÃ¡ observado, pero falta objeto. Carga algo para hacer contraste real.',
    };
  }

  const q = question.toLowerCase();
  if (!hasObjectInput && /(public|hago|accion|intervenir|campana|conviene|impacta|subo|lanzo)/.test(q)) {
    return {
      question,
      can_answer: false,
      answer: 'No puedo responder operaciÃ³n sobre un objeto que no fue cargado. Primero sube o pega el objeto; despuÃ©s calculo MIHM, PSI, ScoreFriction y experimento verificable.',
    };
  }

  return {
    question,
    can_answer: true,
    answer: `${worldContext.summary} ${experiment.plain_language} ${experiment.action}`,
  };
}

function buildReport(state: OperationalCycleState) {
  const exp = state.recommended_experiments?.[0];
  const md = [
    '# ScoreFriction Operational Report',
    '',
    `case_id: ${state.case_id}`,
    `object_presence: ${state.object_presence}`,
    `object_type: ${state.object_type}`,
    `world_regime: ${state.regime.world ?? 'sin datos'}`,
    `filtered_vector: ${safeDomain(record(state.filtered_vector))}`,
    '',
    '## Lectura actual del mundo',
    state.world_context?.summary ?? 'Sin lectura mundial suficiente.',
    '',
    '## MIHM',
    state.mihm?.available ? `homeostasis=${state.mihm.homeostasis}; coherence=${state.mihm.coherence}; friction=${state.mihm.friction}; degradation=${state.mihm.degradation}; regime=${state.mihm.regime}\n\n${state.mihm.meaning}` : state.mihm?.meaning ?? 'MIHM no disponible.',
    '',
    '## PSI',
    state.psi?.available ? `recurrence=${state.psi.recurrence}; symbolic_identity=${state.psi.symbolic_identity}; persistence=${state.psi.persistence}; signal_life=${state.psi.signal_life}\n\n${state.psi.meaning}` : state.psi?.meaning ?? 'PSI no disponible.',
    '',
    '## ScoreFriction',
    state.scorefriction?.available ? `opportunity=${state.scorefriction.opportunity}; perturbation_need=${state.scorefriction.perturbation_need}; attraction=${state.scorefriction.attraction}; friction=${state.scorefriction.friction}\n\n${state.scorefriction.meaning}` : state.scorefriction?.meaning ?? 'ScoreFriction no disponible.',
    '',
    '## Objeto vs mundo + vector filtrado',
    state.object_vs_world?.meaning ?? 'Sin objeto para contrastar.',
    '',
    '## Experimento verificable',
    exp ? [
      `status: ${exp.status}`,
      `hypothesis: ${exp.hypothesis}`,
      `action: ${exp.action}`,
      `window: ${exp.verification_window}`,
      `success_condition: ${exp.success_condition}`,
      `failure_condition: ${exp.failure_condition}`,
      `plain_language: ${exp.plain_language}`,
    ].join('\n') : 'Sin experimento.',
    '',
    '## Claims allowed',
    (state.allowed_claims ?? []).map((claim) => `- ${claim}`).join('\n') || 'Sin claims operativos permitidos.',
    '',
    '## Claims blocked',
    (state.blocked_claims ?? []).map((claim) => `- ${claim}`).join('\n') || 'Sin claims bloqueados registrados.',
    '',
    '## Analyzer availability',
    JSON.stringify(state.analyzer_availability ?? {}, null, 2),
    '',
    '## Warnings / fallbacks',
    state.technical_state.warnings.map((warning) => `- ${warning}`).join('\n') || 'Sin warnings.',
    '',
  ].join('\n');

  return {
    filename: `scorefriction-report-${state.case_id}.md`,
    markdown: md,
  };
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
  const scopeNeedle = scope === 'culture' || scope === 'music' || scope === 'writing' || scope === 'cinema' ? 'cultural' : scope;
  const filtered = vectors.find((vector) => String(vector.domain ?? '').toLowerCase().includes(scopeNeedle)) ?? vectors[0] ?? null;
  const degradationLevel = filtered ? num(filtered.degradation, 1) : 1;
  const weakSignals = vectors
    .filter((vector) => num(vector.persistence) > 0 && num(vector.trust) < 0.55)
    .map((vector) => ({ vector: vector.domain, persistence: vector.persistence, trust: vector.trust, status: num(vector.persistence) > 0.55 ? 'persistent' : 'emergent', sources: vector.sources }));
  const persistentSignals = vectors
    .filter((vector) => num(vector.persistence) >= 0.45)
    .map((vector) => ({ vector: vector.domain, persistence: vector.persistence, observed_at: vector.observed_at, sources: vector.sources }));
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

  const hasObjectInput = hasObject(input);
  const objectType = detectObjectType(input.evaluated_object ?? input.evidence_input);
  const lexicalSupported = objectTypeSupportsLexical(objectType);
  const text = objectText(input.evaluated_object) || objectText(input.evidence_input);
  const worldContext = buildWorldContext(record(snapshot));
  const readouts = hasObjectInput && lexicalSupported
    ? buildObjectReadouts(text, filtered, weakSignals)
    : hasObjectInput ? {
        mihm: unavailableMihmForType(objectType),
        psi: unavailablePsiForType(objectType),
        scorefriction: unavailableScoreForType(objectType),
      } : {
        mihm: unavailableMihm('missing_evaluated_object'),
        psi: unavailablePsi('missing_evaluated_object'),
        scorefriction: unavailableScore('missing_evaluated_object'),
      };
  const analyzerAvailability: OperationalCycleState['analyzer_availability'] = {
    text: lexicalSupported ? 'available' : 'analysis_unavailable',
    audio: objectType === 'audio' ? 'analysis_unavailable' : 'analysis_unavailable',
    image: objectType === 'image' ? 'analysis_unavailable' : 'analysis_unavailable',
    video: objectType === 'video' ? 'analysis_unavailable' : 'analysis_unavailable',
    document: objectType === 'document' && lexicalSupported ? 'available' : 'analysis_unavailable',
    campaign: objectType === 'campaign' && lexicalSupported ? 'available' : 'analysis_unavailable',
  };

  const provisional: OperationalCycleState = {
    case_id: caseId,
    objective: str(input.objective),
    object_presence: hasObjectInput ? 'provided' : 'missing',
    object_type: hasObjectInput ? objectType : 'unknown',
    twin_state: scoreState,
    world_vector: snapshot,
    filtered_vector: filtered,
    weak_signals: weakSignals,
    persistent_signals: persistentSignals,
    signal_lifetimes: rows(longitudinalResult.data).map((event) => ({ id: event.id, first_seen: event.created_at, last_seen: event.updated_at ?? event.created_at, state: event.status ?? 'observed' })),
    attractors: rows(protoResult.data),
    world_context: worldContext,
    mihm: readouts.mihm,
    psi: readouts.psi,
    scorefriction: readouts.scorefriction,
    object_vs_world: {
      available: hasObjectInput,
      verdict: hasObjectInput ? (num(readouts.scorefriction.opportunity, 0) >= 0.58 ? 'testable_opportunity' : 'watch_only') : 'no_object',
      compared_against: { world: worldContext.regime ?? 'WORLD', filtered_vector: safeDomain(filtered) },
      meaning: hasObjectInput
        ? `El objeto fue comparado contra el estado del mundo y el vector ${safeDomain(filtered)} para detectar coherencia, friccion, persistencia y desviacion de direccion.`
        : 'No existe objeto evaluado. Esta pantalla solo puede mostrar lectura del mundo y pedir una entrada concreta.',
    },
    degradation: {
      level: degradationLevel,
      trend: degradationLevel > 0.55 ? 'rising' : degradationLevel < 0.25 ? 'falling' : 'stable',
      notes: degradationLevel >= 1 ? ['WorldSpect sin fuente suficiente para este filtro.'] : [],
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
    contrast: input.run_contrast ? { evaluated_object: hasObjectInput ? input.evaluated_object ?? input.evidence_input : null, vector: filtered, status: hasObjectInput ? 'contrast_completed' : 'blocked_no_object' } : undefined,
    minimal_action: null,
    evidence,
    amv_learning: thoughts,
    analyzer_availability: analyzerAvailability,
    allowed_claims: hasObjectInput && lexicalSupported
      ? ['world reading', 'object lexical contrast', 'MIHM heuristic readout', 'PSI lexical persistence readout', 'bounded experiment proposal']
      : ['world reading', 'evidence gap report'],
    blocked_claims: hasObjectInput
      ? lexicalSupported
        ? ['full user calibration without user/case evidence', 'campaign success prediction']
        : [`${objectType} MIHM/PSI/ScoreFriction without analyzer`, 'campaign/intervention recommendation']
      : ['object contrast', 'intervention recommendation', 'user calibration'],
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

  const experiment = buildExperiment({
    hasObjectInput: hasObjectInput && lexicalSupported,
    caseId,
    filtered,
    worldContext,
    mihm: readouts.mihm,
    psi: readouts.psi,
    scorefriction: readouts.scorefriction,
  });
  provisional.recommended_experiments = [experiment];
  provisional.amv_answer = answerAmv(str(input.user_question), hasObjectInput, experiment, worldContext);
  provisional.formal_report = buildReport(provisional);

  const watch = evaluateRegimeWatch(provisional);
  provisional.alert = {
    active: watch.active,
    severity: hasObjectInput ? watch.severity : 'none',
    reason: hasObjectInput && watch.active ? 'Regime Watch detecto cambio de direccion, degradacion o persistencia acumulada.' : 'Sin alerta operativa; falta objeto o no hay cambio suficiente.',
    window: hasObjectInput ? watch.critical_window : null,
    action_required: hasObjectInput ? watch.minimal_action : 'Cargar objeto para evaluar antes de recomendar acciÃ³n.',
  };

  return provisional;
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
    summary: state.object_presence === 'missing'
      ? `Ciclo ${input.case_id}: lectura mundial sin objeto; no se recomendo intervencion.`
      : `Ciclo ${input.case_id}: ${state.direction.current ?? 'sin direccion'} -> ${state.direction.projected ?? 'sin proyeccion'}.`,
    payload: state,
  });
  const learning = await appendAmvLearning({
    case_id: input.case_id,
    source: 'scorefriction.operational_cycle',
    event_type: state.object_presence === 'missing' ? 'world_reading_without_object' : 'cycle_observed',
    summary: state.amv_answer?.answer ?? 'ciclo observado.',
    payload: { state, logbook_id: logEntry.id },
  });
  return { state, logEntry, learning };
}
