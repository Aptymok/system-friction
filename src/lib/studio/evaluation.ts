import { buildScoreFrictionAudioFallbackVector } from '@/lib/scorefriction/evidence-vector-mapper';
import { evaluateScoreFrictionCase, evaluateScoreFrictionObservation } from '@/lib/scorefriction/store';
import { findCulturalWaveCase } from '@/lib/scorefriction/cultural-wave-cases';
import { buildWorldSpectState } from '@/lib/worldspect/worldspectStateBuilder';

export type StudioObjectKind = 'melody' | 'beat' | 'loop' | 'demo' | 'REM618' | 'reference' | 'client_note' | 'instagram_signal';
export type StudioReportMode = 'real_engine' | 'local_audio_features' | 'local_heuristic' | 'manual_signal' | 'blocked_safe_contract' | 'source_unavailable';
export type StudioFinalState = 'continue' | 'finish_this_week' | 'publish' | 'sell_pitch' | 'collaborate' | 'revise' | 'archive' | 'kill' | 'decision_required';

export type StudioAudioMetadata = {
  fileName?: string | null;
  size?: number | null;
  mime?: string | null;
  duration?: number | null;
};

export type StudioAudioFeatures = {
  sampleRate?: number | null;
  channelCount?: number | null;
  duration?: number | null;
  peak?: number | null;
  rms?: number | null;
  clippingRisk?: number | null;
  silenceStartSeconds?: number | null;
  silenceEndSeconds?: number | null;
  energySegments?: number[];
  dynamicRange?: number | null;
  structureNote?: string | null;
  extractionMode?: 'web_audio' | 'metadata_only' | 'not_available';
};

export type StudioEvaluateInput = {
  object_id: string;
  object_kind: StudioObjectKind;
  project: {
    title: string;
    referenceGenre?: string;
    currentState?: string;
    deadline?: string;
    notes?: string;
    instagramSignal?: string;
  };
  audio_metadata?: StudioAudioMetadata | null;
  audio_features?: StudioAudioFeatures | null;
};

export type StudioPerturbation = {
  title: string;
  why_it_matters: string;
  required_evidence: string;
  exact_action: string;
  suggested_duration: string;
  deadline: string;
  success_condition: string;
  failure_condition: string;
  expected_field_effect: string;
  decision_unlocked: StudioFinalState;
};

type Section<T> = T & {
  mode: StudioReportMode;
  human: string;
  limits: string[];
};

export type StudioEvaluationReport = {
  mihm: Section<{
    json: {
      engine: 'MIHM';
      mode: 'real' | 'heuristic' | 'blocked';
      object_id: string;
      object_kind: StudioObjectKind;
      inputs: {
        audio_metadata: StudioAudioMetadata;
        audio_features: StudioAudioFeatures;
        project_metadata: StudioEvaluateInput['project'];
        notes: string;
      };
      metrics: {
        IHG: number | null;
        NTI_obs: number | null;
        LDI_hours: number | null;
        PHI_SF: number | null;
        xi_noise: number | null;
        coherence: number | null;
        tension: number | null;
        latency: number | null;
      };
      regime: 'homeostatic' | 'transition' | 'critical' | 'blocked' | 'unknown';
      interpretation: string;
      limits: string[];
    };
  }>;
  worldspect: Section<{
    current_world_summary: string;
    current_tensions: string[];
    degraded_sources: string[];
    object_relation: string;
    perturbation_potential: string;
    source_state: string;
  }>;
  culturalVector: Section<{
    cultural_fit: string;
    cultural_contrast: string;
    audience_hypothesis: string;
    attention_friction_hypothesis: string;
    instagram_reel_potential: string;
    rem618_relation: string;
    placement: 'public' | 'private' | 'client-facing' | 'experimental' | 'archived';
    cultural_risk: string;
    cultural_opportunity: string;
    scorefriction: unknown;
  }>;
  musicEvaluation: Section<{
    identity: string;
    emotional_direction: string;
    genre_reference_proximity: string;
    hook_analysis: string;
    rhythm_beat_analysis: string;
    melodic_analysis: string;
    arrangement_status: string;
    mix_risk: string;
    low_end_risk: string;
    loudness_export_risk: string;
    structure_energy_evolution: string;
    duration_form_classification: string;
    release_readiness: string;
    portfolio_value: string;
    client_acquisition_value: string;
    instagram_reel_value: string;
    rem618_continuity_value: string;
    known: string[];
    unknown: string[];
    missing_evidence: string[];
  }>;
  conclusion: Section<{
    answers: string[];
    json: {
      final_recommendation: StudioFinalState;
      confidence: number;
      next_decision_date: string | null;
      required_evidence_before_closure: string[];
      changes_required: string[];
      do_not_change: string[];
      publication_window: string;
      client_use: string;
      rem618_relation: string;
      portfolio_relation: string;
    };
  }>;
  perturbations: StudioPerturbation[];
  raw: Record<string, unknown>;
};

export type StudioEvaluateResponse = {
  ok: true;
  mode: 'real' | 'partial' | 'blocked';
  report: StudioEvaluationReport;
  blocked: Array<{ section: string; reason: string }>;
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function n(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value: number) {
  return Number(value.toFixed(4));
}

function text(input: StudioEvaluateInput) {
  return [
    input.project.title,
    input.project.referenceGenre,
    input.project.currentState,
    input.project.deadline,
    input.project.notes,
    input.project.instagramSignal,
    input.audio_metadata?.fileName,
  ].filter(Boolean).join(' ').toLowerCase();
}

function daysFromNow(days: number) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

function caseForInput(input: StudioEvaluateInput) {
  const raw = text(input);
  if (/tiktok|reel|viral|gesture|drop|loop/.test(raw)) return 'CW-010';
  if (/soundcloud|underground|perifer|experimental/.test(raw)) return 'CW-009';
  if (/nostalgia|retro|synth|digital|memoria/.test(raw)) return 'CW-002';
  if (/calma|ambient|low|baja carga|minimal/.test(raw)) return 'CW-003';
  if (/barrio|local|territorio|mx|mex/.test(raw)) return 'CW-007';
  if (/romance|amor|vinculo|vulner/.test(raw)) return 'CW-008';
  if (/ansiedad|futuro|epic|epica|tension/.test(raw)) return 'CW-005';
  if (/reggaeton|urbano|perreo|808/.test(raw)) return 'CW-001';
  return 'CW-009';
}

function inferObjectShape(input: StudioEvaluateInput) {
  const raw = text(input);
  const duration = n(input.audio_features?.duration ?? input.audio_metadata?.duration, 0);
  const energy = n(input.audio_features?.rms, 0);
  const peak = n(input.audio_features?.peak, 0);
  const isRem = input.object_kind === 'REM618' || /rem618|rem 618|618/.test(raw);
  const isSignal = input.object_kind === 'instagram_signal' || /instagram|reel|post|story/.test(raw);
  const isClient = input.object_kind === 'client_note' || /cliente|pitch|prospect|beat pack|vender/.test(raw);
  const isShort = duration > 0 && duration <= 45;
  const hasBeat = /beat|drum|bateria|batería|kick|snare|808|groove|ritmo/.test(raw);
  const hasHook = /hook|coro|riff|motivo|lead|melodia|melodía|drop/.test(raw);
  const urgent = /hoy|semana|deadline|publicar|release|entregar/.test(raw) || Boolean(input.project.deadline);
  return { raw, duration, energy, peak, isRem, isSignal, isClient, isShort, hasBeat, hasHook, urgent };
}

function buildMihm(input: StudioEvaluateInput, scorefriction: unknown): StudioEvaluationReport['mihm'] {
  const shape = inferObjectShape(input);
  const features = input.audio_features ?? {};
  const metadata = input.audio_metadata ?? {};
  const hasFeatures = features.extractionMode === 'web_audio';
  const hasAudio = Boolean(metadata.fileName || features.duration);
  const rms = n(features.rms, NaN);
  const dynamicRange = n(features.dynamicRange, NaN);
  const clipping = n(features.clippingRisk, NaN);
  const silenceStart = n(features.silenceStartSeconds, 0);
  const duration = n(features.duration ?? metadata.duration, 0);
  const scoreData = scorefriction && typeof scorefriction === 'object' ? scorefriction as Record<string, unknown> : {};
  const vectors = scoreData.data && typeof scoreData.data === 'object' ? (scoreData.data as Record<string, unknown>).vectors as Record<string, unknown> | undefined : undefined;
  const acoustic = vectors?.acoustic_vector && typeof vectors.acoustic_vector === 'object' ? vectors.acoustic_vector as Record<string, unknown> : {};
  const mihmVector = vectors?.mihm_cultural_vector && typeof vectors.mihm_cultural_vector === 'object' ? vectors.mihm_cultural_vector as Record<string, unknown> : {};

  const coherence = hasFeatures
    ? clamp01((shape.hasHook ? 0.22 : 0.08) + (shape.hasBeat ? 0.18 : 0.06) + (duration > 20 ? 0.16 : 0.04) + (Number.isFinite(rms) ? rms * 0.34 : 0.1))
    : null;
  const tension = hasFeatures
    ? clamp01((Number.isFinite(clipping) ? clipping * 0.34 : 0.12) + (Number.isFinite(dynamicRange) ? (1 - dynamicRange) * 0.26 : 0.14) + (shape.urgent ? 0.2 : 0.08))
    : null;
  const latency = hasFeatures ? clamp01((silenceStart / Math.max(1, duration)) + (shape.hasHook ? 0.05 : 0.26)) : null;
  const ihg = n(mihmVector.IHG_C ?? acoustic.harmonic_stability, NaN);
  const nti = n(mihmVector.NTI_C ?? acoustic.density, NaN);
  const phi = coherence !== null && tension !== null ? clamp01((coherence + (1 - tension)) / 2) : null;
  const regime = !hasAudio
    ? 'blocked'
    : phi === null
      ? 'unknown'
      : phi < 0.33
        ? 'critical'
        : phi < 0.58
          ? 'transition'
          : 'homeostatic';
  const limits = [
    ...(hasFeatures ? [] : ['audio_feature_extraction_not_available_or_not_decodable']),
    'MIHM full numeric engine not invoked with private binary; Studio used safe metadata/features and ScoreFriction vectors only.',
  ];
  const interpretation = hasAudio
    ? `MIHM Studio lee ${regime}. Coherencia ${coherence ?? 'null'}, tension ${tension ?? 'null'}, latencia ${latency ?? 'null'}. La decision depende de evidencia audible y contraste cultural.`
    : 'MIHM bloqueado: no hay audio ni metadata suficiente para cerrar una tarea.';

  return {
    mode: hasFeatures ? 'local_audio_features' : 'local_heuristic',
    human: interpretation,
    limits,
    json: {
      engine: 'MIHM',
      mode: hasFeatures ? 'heuristic' : hasAudio ? 'heuristic' : 'blocked',
      object_id: input.object_id,
      object_kind: input.object_kind,
      inputs: {
        audio_metadata: metadata,
        audio_features: features,
        project_metadata: input.project,
        notes: input.project.notes ?? '',
      },
      metrics: {
        IHG: Number.isFinite(ihg) ? round(clamp01(ihg)) : null,
        NTI_obs: Number.isFinite(nti) ? round(clamp01(nti)) : null,
        LDI_hours: input.project.deadline ? 24 : null,
        PHI_SF: phi === null ? null : round(phi),
        xi_noise: Number.isFinite(clipping) ? round(clipping) : null,
        coherence: coherence === null ? null : round(coherence),
        tension: tension === null ? null : round(tension),
        latency: latency === null ? null : round(latency),
      },
      regime,
      interpretation,
      limits,
    },
  };
}

async function buildWorldSpect(input: StudioEvaluateInput): Promise<{ section: StudioEvaluationReport['worldspect']; raw: unknown; blocked: Array<{ section: string; reason: string }> }> {
  const blocked: Array<{ section: string; reason: string }> = [];
  try {
    const state = await buildWorldSpectState();
    const shape = inferObjectShape(input);
    const live = state.source_state === 'observed' || state.source_state === 'degraded';
    if (!live) blocked.push({ section: 'worldspect', reason: 'worldspect_live_source_blocked' });
    const pressures = state.dominant_external_pressures.length ? state.dominant_external_pressures : ['not_available'];
    const objectRelation = live
      ? `${input.project.title || input.object_kind} ${shape.isShort || shape.isSignal ? 'fits short attention pressure' : 'needs edited proof form'} under ${state.time_window}.`
      : 'worldspect_live_source_blocked: current world state unavailable; no live fit claim.';
    return {
      raw: state,
      blocked,
      section: {
        mode: live ? 'real_engine' : 'source_unavailable',
        human: `${state.relevance_to_sfi} Para este objeto: ${objectRelation}`,
        limits: state.warnings,
        current_world_summary: `source_state=${state.source_state}; confidence=${state.confidence}; territory=${state.territory}; window=${state.time_window}.`,
        current_tensions: pressures,
        degraded_sources: state.degraded_sources,
        object_relation: objectRelation,
        perturbation_potential: shape.hasHook || shape.isShort ? 'Puede introducir perturbacion corta si se prueba con evidencia de respuesta.' : 'Necesita forma audible antes de introducir perturbacion cultural.',
        source_state: state.source_state,
      },
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'worldspect_live_source_blocked';
    blocked.push({ section: 'worldspect', reason });
    return {
      raw: { error: reason },
      blocked,
      section: {
        mode: 'source_unavailable',
        human: `worldspect_live_source_blocked: ${reason}`,
        limits: [reason],
        current_world_summary: 'not_available',
        current_tensions: ['not_available'],
        degraded_sources: ['worldspect_live_source_blocked'],
        object_relation: 'No live WorldSpect fit claim.',
        perturbation_potential: 'blocked until WorldSpect source is available.',
        source_state: 'missing',
      },
    };
  }
}

function buildCultural(input: StudioEvaluateInput, culturalCase: Awaited<ReturnType<typeof evaluateScoreFrictionCase>>, scorefriction: unknown): StudioEvaluationReport['culturalVector'] {
  const shape = inferObjectShape(input);
  const found = findCulturalWaveCase(caseForInput(input));
  const caseName = culturalCase?.case_name ?? found?.name ?? 'not_available';
  const interpretation = culturalCase?.interpretation ?? (found ? {
    phenomenon: found.phenomenon,
    friction: found.friction,
    proposal: found.hypothesis,
    producerBrief: `${found.prototypeHint.bpm} ${found.prototypeHint.rhythm}`,
  } : null);
  const placement: StudioEvaluationReport['culturalVector']['placement'] = shape.isClient ? 'client-facing' : shape.isRem ? 'experimental' : shape.isSignal ? 'public' : shape.duration > 70 ? 'private' : 'experimental';
  const limits = culturalCase ? [] : ['cultural_vector_real_source_blocked'];

  return {
    mode: culturalCase ? 'real_engine' : 'local_heuristic',
    human: `Cultural Vector contrasta con ${caseName}. ${interpretation && typeof interpretation === 'object' ? String((interpretation as Record<string, unknown>).proposal ?? '') : 'Sin caso cultural real disponible.'}`,
    limits,
    cultural_fit: shape.isShort || shape.hasHook ? 'fit operativo para prueba corta' : 'fit pendiente de forma/hook',
    cultural_contrast: interpretation && typeof interpretation === 'object' ? String((interpretation as Record<string, unknown>).friction ?? 'not_available') : 'cultural_vector_real_source_blocked',
    audience_hypothesis: shape.isClient ? 'prospecto/productor/artista que necesita base concreta' : shape.isRem ? 'audiencia REM618 y escucha de continuidad' : 'microaudiencia de prueba en reel/SoundCloud',
    attention_friction_hypothesis: shape.isShort ? 'baja friccion de entrada; medir retencion' : 'friccion alta si no se extrae fragmento fuerte',
    instagram_reel_potential: shape.isSignal || shape.isShort || shape.hasHook ? 'probar 12-20 segundos con caption funcional' : 'bloqueado hasta aislar motivo',
    rem618_relation: shape.isRem ? 'continuidad REM618 presente; separar de portfolio productor antes de publicar.' : 'no depende de REM618; puede vivir como portfolio/productor.',
    placement,
    cultural_risk: shape.peak > 0.98 ? 'riesgo tecnico de clipping reduce confianza cultural' : shape.hasHook ? 'riesgo manejable; falta evidencia externa' : 'riesgo de indiferenciacion',
    cultural_opportunity: interpretation && typeof interpretation === 'object' ? String((interpretation as Record<string, unknown>).producerBrief ?? 'prueba corta medible') : 'local heuristic: prueba corta medible',
    scorefriction,
  };
}

function buildMusic(input: StudioEvaluateInput): StudioEvaluationReport['musicEvaluation'] {
  const shape = inferObjectShape(input);
  const f = input.audio_features ?? {};
  const hasFeatures = f.extractionMode === 'web_audio';
  const duration = n(f.duration ?? input.audio_metadata?.duration, 0);
  const peak = n(f.peak, NaN);
  const rms = n(f.rms, NaN);
  const dynamicRange = n(f.dynamicRange, NaN);
  const segments = Array.isArray(f.energySegments) ? f.energySegments : [];
  const rising = segments.length > 2 && segments[segments.length - 1] > segments[0] + 0.06;
  const known = [
    input.audio_metadata?.fileName ? `archivo=${input.audio_metadata.fileName}` : '',
    duration ? `duration=${round(duration)}s` : '',
    hasFeatures ? `sampleRate=${f.sampleRate}; channels=${f.channelCount}` : '',
    Number.isFinite(peak) ? `peak=${round(peak)}` : '',
    Number.isFinite(rms) ? `rms=${round(rms)}` : '',
  ].filter(Boolean);
  const unknown = [
    'BPM real no medido sin beat tracker.',
    'Tonalidad y progresion armonica no medidas.',
    'Letra/melodia exacta no transcrita.',
  ];
  const missing = [
    ...(hasFeatures ? [] : ['audio decodable para peak/RMS/segmentos']),
    'referencia A/B',
    'timestamp del hook',
    'evidencia de respuesta externa',
  ];

  return {
    mode: hasFeatures ? 'local_audio_features' : 'local_heuristic',
    human: `${input.project.title || input.object_kind}: ${duration ? `${round(duration)}s` : 'duracion no disponible'}, ${shape.hasHook ? 'hook declarado' : 'hook no confirmado'}, ${shape.hasBeat ? 'ritmo declarado' : 'ritmo no confirmado'}.`,
    limits: hasFeatures ? ['No deep MIR: BPM/key/stems unavailable.'] : ['audio_features_not_available'],
    identity: shape.isSignal ? 'senal manual de Instagram' : shape.isClient ? 'nota de cliente/prospecto' : shape.isRem ? 'fragmento REM618' : shape.isShort ? 'loop o idea corta' : 'demo o pieza en desarrollo',
    emotional_direction: /oscuro|dark|triste|melanc/.test(shape.raw) ? 'oscura/melancolica' : /club|dance|perreo|energia|energía/.test(shape.raw) ? 'corporal/energetica' : 'no declarada; requiere referencia emocional',
    genre_reference_proximity: input.project.referenceGenre || 'sin referencia declarada',
    hook_analysis: shape.hasHook || shape.isShort ? 'hay candidato a hook; aislar 12-20 segundos' : 'hook no confirmado; crear o identificar motivo',
    rhythm_beat_analysis: shape.hasBeat ? 'intencion ritmica declarada; confirmar con bounce' : 'ritmo no descrito; falta evidencia de pulso',
    melodic_analysis: /melod|lead|riff|motivo/.test(shape.raw) ? 'motivo melodico declarado' : 'claridad melodica no demostrada',
    arrangement_status: duration > 100 ? 'forma extensa; revisar energia por secciones' : duration > 35 ? 'forma media; puede ser demo corto' : 'forma corta; sirve para prueba de hook',
    mix_risk: Number.isFinite(peak) && peak > 0.98 ? 'alto: posible clipping' : Number.isFinite(rms) && rms < 0.04 ? 'alto: energia baja o silencio' : 'medio: falta escucha A/B',
    low_end_risk: /808|sub|bass|bajo|low/.test(shape.raw) ? 'alto: revisar low-end contra referencia' : 'no declarado; medir en mezcla',
    loudness_export_risk: Number.isFinite(peak) && peak > 0.98 ? 'export puede distorsionar' : 'no medido a nivel LUFS',
    structure_energy_evolution: f.structureNote || (rising ? 'energia sube por segmentos' : segments.length ? 'energia estable o descendente por segmentos' : 'estructura no medida'),
    duration_form_classification: duration <= 0 ? 'unknown' : duration <= 20 ? 'micro loop' : duration <= 45 ? 'proof loop' : duration <= 110 ? 'demo corto' : 'demo/forma larga',
    release_readiness: shape.hasHook && hasFeatures && !(Number.isFinite(peak) && peak > 0.98) ? 'prueba publica posible despues de referencia A/B' : 'no listo; requiere evidencia o correccion',
    portfolio_value: input.audio_metadata?.fileName ? 'puede entrar a portfolio si se exporta prueba limpia' : 'bloqueado sin audio',
    client_acquisition_value: shape.isClient || input.project.referenceGenre ? 'usable para pitch si existe fragmento exportable' : 'requiere posicionamiento y destinatario',
    instagram_reel_value: shape.isShort || shape.hasHook ? 'alto para prueba corta' : 'medio/bajo hasta aislar motivo',
    rem618_continuity_value: shape.isRem ? 'alto, pero debe etiquetarse separado de portfolio de productor' : 'independiente de REM618',
    known,
    unknown,
    missing_evidence: missing,
  };
}

function buildPerturbations(input: StudioEvaluateInput, music: StudioEvaluationReport['musicEvaluation'], conclusion: StudioEvaluationReport['conclusion']['json']): StudioPerturbation[] {
  const deadline = input.project.deadline || daysFromNow(2);
  const base: StudioPerturbation[] = [
    {
      title: 'Export 30-second proof loop',
      why_it_matters: 'Sin prueba audible no hay cierre ni venta.',
      required_evidence: 'Bounce o metadata verificable del fragmento exportado.',
      exact_action: 'Exporta 30 segundos con el motivo mas fuerte.',
      suggested_duration: '30 minutos',
      deadline,
      success_condition: 'Existe un archivo o registro manual con nombre y timestamp.',
      failure_condition: 'La idea sigue como intencion.',
      expected_field_effect: 'Reduce ambiguedad y habilita evaluacion externa.',
      decision_unlocked: 'continue',
    },
    {
      title: 'Isolate strongest 12-20 seconds',
      why_it_matters: 'Instagram y clientes deciden rapido.',
      required_evidence: 'Timestamp o captura del fragmento elegido.',
      exact_action: 'Marca el tramo exacto que sostiene el hook o drop.',
      suggested_duration: '15 minutos',
      deadline,
      success_condition: 'Hay tramo seleccionado y razon breve.',
      failure_condition: 'No se encuentra punto fuerte.',
      expected_field_effect: 'Convierte energia difusa en unidad publicable.',
      decision_unlocked: 'publish',
    },
    {
      title: 'A/B against one reference',
      why_it_matters: 'El genero no se decide por intencion.',
      required_evidence: 'Referencia y nota A/B.',
      exact_action: `Compara contra ${input.project.referenceGenre || 'una referencia concreta'}: low-end, hook, densidad y entrada.`,
      suggested_duration: '20 minutos',
      deadline,
      success_condition: 'Se define que copiar, evitar o transformar.',
      failure_condition: 'No hay criterio externo.',
      expected_field_effect: 'Aumenta coherencia y reduce riesgo de mezcla.',
      decision_unlocked: 'revise',
    },
    {
      title: 'Fix or confirm low-end',
      why_it_matters: music.low_end_risk,
      required_evidence: 'Nota A/B, captura de medidor o bounce corregido.',
      exact_action: 'Revisa sub/bajo/kick contra referencia en volumen bajo.',
      suggested_duration: '25 minutos',
      deadline,
      success_condition: 'Low-end no tapa hook ni clippea.',
      failure_condition: 'Graves dominan o desaparecen.',
      expected_field_effect: 'Reduce riesgo tecnico antes de publicar o vender.',
      decision_unlocked: 'finish_this_week',
    },
    {
      title: 'Prepare producer pitch',
      why_it_matters: 'El material debe presionar portfolio, cliente o archivo.',
      required_evidence: 'Draft de mensaje y destinatario manual.',
      exact_action: 'Escribe un pitch de 3 lineas y define a quien se manda.',
      suggested_duration: '20 minutos',
      deadline,
      success_condition: 'Hay mensaje listo y evidencia de envio manual.',
      failure_condition: 'No existe uso externo concreto.',
      expected_field_effect: 'Convierte potencial musical en presion comercial.',
      decision_unlocked: 'sell_pitch',
    },
  ];
  if (/rem618|618/i.test(`${input.project.title} ${input.project.notes}`)) {
    base.push({
      title: 'Separate REM618 continuity from producer portfolio',
      why_it_matters: 'REM618 debe preservar continuidad sin encerrar todo el output.',
      required_evidence: 'Etiqueta de carril: REM618, portfolio, cliente, experimento o release candidate.',
      exact_action: 'Decide el carril de esta pieza y escribe una razon.',
      suggested_duration: '10 minutos',
      deadline,
      success_condition: 'La pieza tiene carril definido.',
      failure_condition: 'Queda en tal vez infinito.',
      expected_field_effect: 'Evita que REM618 absorba todo el material.',
      decision_unlocked: 'continue',
    });
  }
  if (conclusion.final_recommendation === 'archive' || conclusion.final_recommendation === 'kill') {
    base.push({
      title: 'Archive weak fragment',
      why_it_matters: 'No todo fragmento merece consumir campo operativo.',
      required_evidence: 'Razon de archivo o kill registrada.',
      exact_action: 'Escribe por que no sigue y que aprendizaje queda.',
      suggested_duration: '8 minutos',
      deadline,
      success_condition: 'La idea sale del ciclo activo.',
      failure_condition: 'Regresa sin nueva evidencia.',
      expected_field_effect: 'Libera atencion para material con mejor evidencia.',
      decision_unlocked: conclusion.final_recommendation,
    });
  }
  return base.slice(0, 7);
}

function buildConclusion(input: StudioEvaluateInput, mihm: StudioEvaluationReport['mihm'], music: StudioEvaluationReport['musicEvaluation']): StudioEvaluationReport['conclusion'] {
  const shape = inferObjectShape(input);
  const hasAudio = Boolean(input.audio_metadata?.fileName || input.audio_features?.duration);
  const peak = n(input.audio_features?.peak, NaN);
  const confidence = clamp01((hasAudio ? 0.22 : 0) + (input.audio_features?.extractionMode === 'web_audio' ? 0.28 : 0.08) + (shape.hasHook ? 0.18 : 0.04) + (input.project.referenceGenre ? 0.14 : 0.02) + (shape.urgent ? 0.12 : 0.05));
  const recommendation: StudioFinalState = !hasAudio
    ? 'decision_required'
    : Number.isFinite(peak) && peak > 0.99
      ? 'revise'
      : shape.isClient
        ? 'sell_pitch'
        : shape.hasHook && shape.isShort
          ? 'publish'
          : shape.urgent
            ? 'finish_this_week'
            : confidence < 0.36
              ? 'archive'
              : 'continue';
  const nextDate = input.project.deadline || daysFromNow(recommendation === 'finish_this_week' ? 7 : 2);
  const changes = [
    ...(shape.hasHook ? ['aislar mejor tramo 12-20 segundos'] : ['crear o confirmar hook']),
    ...(Number.isFinite(peak) && peak > 0.98 ? ['bajar ganancia y revisar clipping'] : []),
    'hacer A/B contra una referencia',
  ];
  const doNotChange = [
    ...(shape.isRem ? ['continuidad REM618 que ya identifica la pieza'] : []),
    ...(shape.hasBeat ? ['pulso principal antes de comparar contra referencia'] : []),
  ];
  const json = {
    final_recommendation: recommendation,
    confidence: round(confidence),
    next_decision_date: nextDate || null,
    required_evidence_before_closure: music.missing_evidence,
    changes_required: changes,
    do_not_change: doNotChange,
    publication_window: recommendation === 'publish' ? '24-48h despues de exportar prueba limpia' : 'sin ventana publica hasta evidencia minima',
    client_use: recommendation === 'sell_pitch' ? 'preparar beat pack/pitch manual' : 'usar como portfolio solo con fragmento exportable',
    rem618_relation: shape.isRem ? 'continuidad REM618 presente; separar carril antes de publicar' : 'no depende de REM618',
    portfolio_relation: hasAudio ? 'candidato a portfolio si pasa referencia A/B' : 'bloqueado sin audio',
  };
  const answers = [
    `Que es: ${music.identity}.`,
    `Vale continuar: ${['continue', 'finish_this_week', 'publish', 'sell_pitch', 'collaborate'].includes(recommendation) ? 'si, con evidencia' : recommendation === 'decision_required' ? 'no se decide sin evidencia' : 'no como activo principal'}.`,
    `Esta listo: ${recommendation === 'publish' ? 'casi; falta export limpio y evidencia' : 'no completamente'}.`,
    `Editar o dejar: ${changes.join('; ')}.`,
    `No cambiar: ${doNotChange.join('; ') || 'no hay elemento protegido confirmado'}.`,
    `Fecha siguiente: ${json.next_decision_date ?? 'null'}.`,
    `Estado recomendado: ${recommendation}.`,
  ];

  return {
    mode: 'local_heuristic',
    human: answers.join(' '),
    limits: ['Final recommendation uses safe Studio report inputs; no persistent attractor/task closure is claimed.'],
    answers,
    json,
  };
}

export async function buildStudioEvaluationReport(input: StudioEvaluateInput): Promise<StudioEvaluateResponse> {
  const blocked: Array<{ section: string; reason: string }> = [];
  const caseId = caseForInput(input);
  const fallbackVector = input.audio_metadata?.fileName
    ? buildScoreFrictionAudioFallbackVector({
      fileName: input.audio_metadata.fileName,
      mimeType: input.audio_metadata.mime || 'application/octet-stream',
      fileSizeBytes: input.audio_metadata.size || 0,
      sourceName: 'studio_local_metadata',
      evidenceType: 'audio_metadata',
      audioMetadata: { ...input.audio_metadata, ...input.audio_features },
    })
    : null;

  const scorefriction = await evaluateScoreFrictionObservation({
    case_id: caseId,
    source_name: 'studio_local_metadata',
    evidence_type: input.object_kind === 'instagram_signal' ? 'community_observation' : 'audio_metadata',
    reliability_score: input.audio_features?.extractionMode === 'web_audio' ? 0.68 : 0.44,
    raw_payload: {
      type: 'studio_music_object',
      object_id: input.object_id,
      object_kind: input.object_kind,
      title: input.project.title,
      notes: input.project.notes,
      referenceGenre: input.project.referenceGenre,
      audioMetadata: input.audio_metadata,
      audioFeatures: input.audio_features,
      instagramSignal: input.project.instagramSignal,
    },
    vector_overrides: fallbackVector ? { acoustic_vector: fallbackVector.acoustic_vector } : undefined,
  }).catch((error) => {
    blocked.push({ section: 'scorefriction', reason: error instanceof Error ? error.message : 'scorefriction_evaluation_failed' });
    return { ok: false, error: 'scorefriction_evaluation_failed' };
  });

  const culturalCase = await evaluateScoreFrictionCase(caseId).catch((error) => {
    blocked.push({ section: 'culturalVector', reason: error instanceof Error ? error.message : 'cultural_vector_real_source_blocked' });
    return null;
  });
  const world = await buildWorldSpect(input);
  blocked.push(...world.blocked);
  if (!culturalCase) blocked.push({ section: 'culturalVector', reason: 'cultural_vector_real_source_blocked' });

  const mihm = buildMihm(input, scorefriction);
  const culturalVector = buildCultural(input, culturalCase, scorefriction);
  const musicEvaluation = buildMusic(input);
  const conclusion = buildConclusion(input, mihm, musicEvaluation);
  const perturbations = buildPerturbations(input, musicEvaluation, conclusion.json);
  const report: StudioEvaluationReport = {
    mihm,
    worldspect: world.section,
    culturalVector,
    musicEvaluation,
    conclusion,
    perturbations,
    raw: {
      case_id: caseId,
      scorefriction,
      cultural_case: culturalCase,
      worldspect: world.raw,
      fallback_vector: fallbackVector,
      modes: {
        mihm: mihm.mode,
        worldspect: world.section.mode,
        culturalVector: culturalVector.mode,
        musicEvaluation: musicEvaluation.mode,
        conclusion: conclusion.mode,
      },
    },
  };

  const hasReal = [world.section.mode, culturalVector.mode].includes('real_engine');
  const allBlocked = blocked.length >= 3 && !hasReal && mihm.json.mode === 'blocked';
  return {
    ok: true,
    mode: allBlocked ? 'blocked' : hasReal ? 'partial' : 'partial',
    report,
    blocked,
  };
}
