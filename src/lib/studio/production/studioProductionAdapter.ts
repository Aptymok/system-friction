import 'server-only';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { readStudioGoldState } from '@/lib/studio/gold/studioGoldAdapter';
import { buildStudioCulturalLens } from './studioCulturalLens';
import { buildStudioHypotheses, type StudioLayerInput } from './hypothesisEngine';
import { buildStudioProductionDegradedState } from './studioProductionDegradedState';
import type {
  EvidenceRef,
  MetricStatus,
  MetricValue,
  StudioFeatureMetric,
  StudioFieldEdge,
  StudioFieldNode,
  StudioObjectType,
  StudioProductionObject,
  StudioProductionSession,
  StudioProductionState,
  StudioReadinessState,
  ViewContract,
} from './studioProductionTypes';
import { clampConfidence, derivedMetric, missingMetric, observedMetric, phase } from './studioContracts';

type Row = Record<string, unknown>;

type StudioStoredState = {
  session: Row | null;
  object: Row | null;
  features: Row[];
  uploads: Row[];
  audio: Row[];
  video: Row[];
  image: Row[];
  text: Row[];
  community: Row[];
  timeCoordinates: Row[];
  hypotheses: Row[];
  interventions: Row[];
  evidenceTraces: Row[];
  archiveEvents: Row[];
  exports: Row[];
  jobs: Row[];
  degraded: string[];
};

function asRecord(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function asRows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function latest(rows: Row[]): Row | null {
  return rows[0] ?? null;
}

function clamp01(value: number | null): number | null {
  if (value === null) return null;
  return Math.max(0, Math.min(1, value > 1 ? value / 100 : value));
}

function readinessFromMetrics(metrics: StudioFeatureMetric[]): StudioReadinessState {
  if (!metrics.length) return 'missing';
  const available = metrics.filter((metric) => metric.value !== null).length;
  if (available === metrics.length) return 'ready';
  return available > 0 ? 'partial' : 'blocked';
}

function inferObjectType(value: unknown): StudioObjectType {
  const type = asString(value).toLowerCase();
  if (['music', 'audio', 'song', 'music_audio'].includes(type)) return 'music';
  if (type === 'video') return 'video';
  if (type === 'image') return 'image';
  if (['text', 'article', 'research', 'text_document'].includes(type)) return 'text';
  if (type === 'community') return 'community';
  if (['time_coordinate', 'time_coordinate_gap', 'civilizational_coordinate'].includes(type)) return 'time_coordinate';
  return 'unknown';
}

async function queryLatestSessionAndObject(ownerId?: string | null, includeLegacy = false): Promise<StudioStoredState> {
  const degraded: string[] = [];
  try {
    const supabase = createServiceSupabaseClient();
    let sessionQuery = supabase
      .from('studio_sessions')
      .select('*');

    if (ownerId) {
      sessionQuery = includeLegacy
        ? sessionQuery.or(`owner_id.eq.${ownerId},owner_id.is.null`)
        : sessionQuery.eq('owner_id', ownerId);
    }

    const { data: session, error: sessionError } = await sessionQuery
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session) return {
      session: null,
      object: null,
      features: [],
      uploads: [],
      audio: [],
      video: [],
      image: [],
      text: [],
      community: [],
      timeCoordinates: [],
      hypotheses: [],
      interventions: [],
      evidenceTraces: [],
      archiveEvents: [],
      exports: [],
      jobs: [],
      degraded,
    };

    const { data: object, error: objectError } = await supabase
      .from('studio_objects')
      .select('*')
      .eq('session_id', asString((session as Row).id))
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (objectError) throw objectError;

    const objectId = asString((object as Row | null)?.id);
    if (!objectId) return {
      session: asRecord(session),
      object: object ? asRecord(object) : null,
      features: [],
      uploads: [],
      audio: [],
      video: [],
      image: [],
      text: [],
      community: [],
      timeCoordinates: [],
      hypotheses: [],
      interventions: [],
      evidenceTraces: [],
      archiveEvents: [],
      exports: [],
      jobs: [],
      degraded,
    };

    const [
      featuresResult,
      uploadsResult,
      audioResult,
      videoResult,
      imageResult,
      textResult,
      communityResult,
      timeCoordinatesResult,
      hypothesesResult,
      interventionsResult,
      evidenceResult,
      archiveResult,
      exportsResult,
      jobsResult,
    ] = await Promise.all([
      supabase.from('studio_object_features').select('*').eq('object_id', objectId).order('created_at', { ascending: false }),
      supabase.from('studio_uploads').select('*').eq('object_id', objectId).order('created_at', { ascending: false }),
      supabase.from('studio_audio_features').select('*').eq('object_id', objectId).order('created_at', { ascending: false }),
      supabase.from('studio_video_features').select('*').eq('object_id', objectId).order('created_at', { ascending: false }),
      supabase.from('studio_image_features').select('*').eq('object_id', objectId).order('created_at', { ascending: false }),
      supabase.from('studio_text_features').select('*').eq('object_id', objectId).order('created_at', { ascending: false }),
      supabase.from('studio_community_features').select('*').eq('object_id', objectId).order('created_at', { ascending: false }),
      supabase.from('studio_time_coordinates').select('*').eq('object_id', objectId).order('created_at', { ascending: false }),
      supabase.from('studio_hypotheses').select('*').eq('object_id', objectId).order('created_at', { ascending: false }),
      supabase.from('studio_interventions').select('*').eq('object_id', objectId).order('created_at', { ascending: false }),
      supabase.from('studio_evidence_traces').select('*').eq('object_id', objectId).order('created_at', { ascending: false }),
      supabase.from('studio_archive_events').select('*').eq('object_id', objectId).order('created_at', { ascending: false }),
      supabase.from('studio_exports').select('*').eq('object_id', objectId).order('created_at', { ascending: false }),
      supabase.from('studio_analysis_jobs').select('*').eq('object_id', objectId).order('created_at', { ascending: false }),
    ]);

    const results = [
      featuresResult,
      uploadsResult,
      audioResult,
      videoResult,
      imageResult,
      textResult,
      communityResult,
      timeCoordinatesResult,
      hypothesesResult,
      interventionsResult,
      evidenceResult,
      archiveResult,
      exportsResult,
      jobsResult,
    ];
    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;

    return {
      session: asRecord(session),
      object: object ? asRecord(object) : null,
      features: asRows(featuresResult.data),
      uploads: asRows(uploadsResult.data),
      audio: asRows(audioResult.data),
      video: asRows(videoResult.data),
      image: asRows(imageResult.data),
      text: asRows(textResult.data),
      community: asRows(communityResult.data),
      timeCoordinates: asRows(timeCoordinatesResult.data),
      hypotheses: asRows(hypothesesResult.data),
      interventions: asRows(interventionsResult.data),
      evidenceTraces: asRows(evidenceResult.data),
      archiveEvents: asRows(archiveResult.data),
      exports: asRows(exportsResult.data),
      jobs: asRows(jobsResult.data),
      degraded,
    };
  } catch (error) {
    degraded.push(error instanceof Error ? error.message : 'studio_tables_unavailable');
    return {
      session: null,
      object: null,
      features: [],
      uploads: [],
      audio: [],
      video: [],
      image: [],
      text: [],
      community: [],
      timeCoordinates: [],
      hypotheses: [],
      interventions: [],
      evidenceTraces: [],
      archiveEvents: [],
      exports: [],
      jobs: [],
      degraded,
    };
  }
}

function sessionFrom(row: Row | null, generatedAt: string): StudioProductionSession {
  if (!row) {
    return {
      id: null,
      title: 'SIN SESION ACTIVA',
      status: 'blocked',
      createdAt: null,
      updatedAt: null,
    };
  }

  return {
    id: asString(row.id, null as unknown as string) || null,
    title: asString(row.title, 'SESION SIN TITULO'),
    status: asString(row.status) === 'archived' ? 'archived' : asString(row.status) === 'draft' ? 'draft' : 'active',
    createdAt: asString(row.created_at, generatedAt),
    updatedAt: asString(row.updated_at, generatedAt),
  };
}

function objectFrom(row: Row | null, session: StudioProductionSession): StudioProductionObject {
  if (!row) {
    return {
      id: null,
      sessionId: session.id,
      title: 'SIN OBJETO CARGADO',
      type: 'unknown',
      sourceUri: null,
      mimeType: null,
      sizeBytes: null,
      status: 'blocked',
      readiness: 'missing',
      uploadedAt: null,
      version: null,
      storageStatus: 'MISSING',
      analysisStatus: 'MISSING',
    };
  }

  const rawStatus = asString(row.status);
  const status = rawStatus === 'ready' ? 'complete' : rawStatus === 'analyzing' ? 'running' : rawStatus === 'failed' ? 'failed' : rawStatus === 'blocked' ? 'blocked' : 'queued';

  return {
    id: asString(row.id) || null,
    sessionId: asString(row.session_id) || session.id,
    title: asString(row.title, 'OBJETO SIN TITULO'),
    type: inferObjectType(row.object_type),
    sourceUri: asString(row.source_uri) || null,
    mimeType: asString(row.mime_type) || null,
    sizeBytes: asNumber(row.size_bytes),
    status,
    readiness: rawStatus === 'ready' ? 'ready' : rawStatus === 'failed' || rawStatus === 'blocked' ? 'blocked' : 'partial',
    uploadedAt: asString(row.created_at) || null,
    version: asString(asRecord(row.metadata).version) || asString(row.updated_at) || null,
    storageStatus: rawStatus ? 'PENDING' : 'MISSING',
    analysisStatus: status === 'complete' ? 'COMPLETE' : status === 'running' ? 'RUNNING' : status === 'failed' ? 'FAILED' : 'PENDING',
  };
}

function metricsFromFeatureRows(rows: Row[]): StudioFeatureMetric[] {
  return rows.map((row) => {
    const numeric = asNumber(row.numeric_value);
    const text = asString(row.text_value) || null;
    const value = numeric ?? text;
    const payload = asRecord(row.payload);
    const key = asString(row.feature_key, asString(row.id, 'feature')) ?? 'feature';
    return {
      id: key,
      label: asString(row.label, key).toUpperCase(),
      value,
      unit: asString(row.unit),
      source: asString(row.source, 'studio_object_features'),
      status: (asString(payload.status) as MetricStatus) || (value === null ? 'MISSING' as const : 'OBSERVED' as const),
      confidence: clampConfidence(row.confidence ?? (value === null ? 0 : 1)),
      explanation: asString(asRecord(row.payload).explanation, 'Persisted Studio object feature row.'),
      evidenceIds: [asString(row.id, key) ?? key],
    };
  });
}

function layerInputsFromMetrics(metrics: StudioFeatureMetric[]): StudioLayerInput[] {
  const realLayerMetrics = metrics.filter((metric) => metric.id.startsWith('layer_') || metric.id.startsWith('stem_'));
  if (!realLayerMetrics.length) return [];
  return realLayerMetrics.map((metric) => ({
    id: metric.id,
    name: metric.label,
    peak: null,
    rms: null,
    clippingRisk: null,
    dynamicRange: null,
    silenceStartSeconds: null,
    silenceEndSeconds: null,
    energySegments: [],
    structureNote: metric.source,
  }));
}

function numberArray(value: unknown): number[] {
  return asArray(value).map((item) => asNumber(item)).filter((item): item is number => item !== null);
}

function waveformValues(value: unknown): number[] {
  return asArray(value).map((item) => {
    if (typeof item === 'number') return item;
    const row = asRecord(item);
    const min = asNumber(row.min);
    const max = asNumber(row.max);
    if (min === null || max === null) return null;
    return Math.max(Math.abs(min), Math.abs(max));
  }).filter((item): item is number => item !== null);
}

function energyValues(value: unknown): number[] {
  return asArray(value).map((item) => {
    if (typeof item === 'number') return item;
    return asNumber(asRecord(item).rms);
  }).filter((item): item is number => item !== null);
}

function metricNumber(metrics: StudioFeatureMetric[], key: string): number | null {
  const value = metrics.find((item) => item.id === key)?.value ?? null;
  return typeof value === 'number' ? value : null;
}

function statusFromUpload(row: Row | null): MetricStatus {
  const status = asString(row?.status);
  if (status === 'stored') return 'OBSERVED';
  if (status === 'degraded') return 'DEGRADED';
  if (status === 'failed') return 'FAILED';
  return 'MISSING';
}

function evidenceFromRows(stored: Awaited<ReturnType<typeof queryLatestSessionAndObject>>, activeObject: StudioProductionObject): EvidenceRef[] {
  const evidence: EvidenceRef[] = [];
  if (activeObject.id) {
    evidence.push({
      id: activeObject.id,
      type: 'studio_object',
      source: 'studio_objects',
      label: activeObject.title,
      observedAt: activeObject.uploadedAt,
      reliability: 1,
      uri: activeObject.sourceUri,
    });
  }
  stored.uploads.forEach((row) => evidence.push({
    id: asString(row.id, `upload-${evidence.length + 1}`) ?? `upload-${evidence.length + 1}`,
    type: 'upload',
    source: 'studio_uploads',
    label: asString(row.storage_path, 'Studio upload') ?? 'Studio upload',
    observedAt: asString(row.created_at),
    reliability: asString(row.status) === 'stored' ? 1 : 0.35,
    uri: asString(row.storage_path),
  }));
  stored.features.forEach((row) => evidence.push({
    id: asString(row.id, `feature-${evidence.length + 1}`) ?? `feature-${evidence.length + 1}`,
    type: 'feature',
    source: asString(row.source, 'studio_object_features') ?? 'studio_object_features',
    label: asString(row.label, asString(row.feature_key, 'Feature')) ?? 'Feature',
    observedAt: asString(row.created_at),
    reliability: clampConfidence(row.confidence ?? 1),
    uri: null,
  }));
  stored.evidenceTraces.forEach((row) => evidence.push({
    id: asString(row.id, `trace-${evidence.length + 1}`) ?? `trace-${evidence.length + 1}`,
    type: 'trace',
    source: asString(row.source, 'studio_evidence_traces') ?? 'studio_evidence_traces',
    label: asString(row.label, 'Evidence trace') ?? 'Evidence trace',
    observedAt: asString(row.created_at),
    reliability: 1,
    uri: null,
  }));
  return evidence;
}

function metricValuesFromState(input: {
  activeObject: StudioProductionObject;
  metrics: StudioFeatureMetric[];
  evidence: EvidenceRef[];
  lens: Awaited<ReturnType<typeof buildStudioCulturalLens>> | null;
  mihmScore: number | null;
  gold: Awaited<ReturnType<typeof readStudioGoldState>>;
  stored: Awaited<ReturnType<typeof queryLatestSessionAndObject>>;
}): MetricValue[] {
  const { activeObject, metrics, evidence, lens, mihmScore, gold, stored } = input;
  const latestUpload = latest(stored.uploads);
  const uploadEvidence = latestUpload ? [asString(latestUpload.id, 'upload') ?? 'upload'] : [];
  const values: MetricValue[] = [
    activeObject.id
      ? observedMetric({
        key: 'active_object',
        label: 'Active Object',
        value: activeObject.title,
        source: 'studio_objects',
        evidenceIds: [activeObject.id],
        confidence: 1,
        observedAt: activeObject.uploadedAt,
        explanation: 'Object row persisted in studio_objects.',
      })
      : missingMetric('active_object', 'Active Object', 'No persisted Studio object is active.', ['studio_object']),
    latestUpload
      ? observedMetric({
        key: 'storage_verified',
        label: 'Storage Verified',
        value: asString(latestUpload.status),
        source: 'studio_uploads',
        evidenceIds: uploadEvidence,
        confidence: asString(latestUpload.status) === 'stored' ? 1 : 0.35,
        observedAt: asString(latestUpload.created_at),
        explanation: 'Latest upload row for the active object.',
      })
      : missingMetric('storage_verified', 'Storage Verified', 'No upload row exists for the active object.', ['studio_uploads']),
    metrics.length
      ? derivedMetric({
        key: 'feature_coverage',
        label: 'Feature Coverage',
        value: `${metrics.filter((metric) => metric.value !== null).length}/${metrics.length}`,
        unit: null,
        source: 'studio_object_features',
        evidenceIds: metrics.flatMap((metric) => metric.evidenceIds),
        confidence: metrics.reduce((sum, metric) => sum + metric.confidence, 0) / metrics.length,
        observedAt: asString(stored.features[0]?.created_at),
        formulaVersion: 'studio.feature_coverage.v1',
        explanation: 'Count of persisted feature rows with numeric or textual values over total persisted feature rows.',
      })
      : missingMetric('feature_coverage', 'Feature Coverage', 'No persisted object feature rows exist.', ['studio_object_features']),
    mihmScore !== null && activeObject.id
      ? derivedMetric({
        key: 'mihm_activation',
        label: 'MIHM Activation',
        value: Number(mihmScore.toFixed(3)),
        unit: null,
        source: 'studioGold.mihmModel',
        evidenceIds: evidence.map((item) => item.id).slice(0, 8),
        confidence: gold.provenance.basedOn.length ? 0.68 : 0.32,
        observedAt: asString((gold as unknown as Row).generatedAt),
        formulaVersion: 'EXISTING_PHASE_1_FORMULAS_UNMODIFIED',
        warnings: ['INTERNAL_SIGNAL_RANKING', 'NOT_EXTERNAL_PREDICTION', 'PROVISIONAL_NO_TRACEABILITY_NO_HISTORICAL_CALIBRATION'],
        explanation: 'Internal MIHM score read from existing Studio Gold adapter without changing formulas.',
      })
      : missingMetric('mihm_activation', 'MIHM Activation', 'MIHM cannot be interpreted for Studio without an active object.', ['active_object']),
    lens
      ? derivedMetric({
        key: 'cultural_resonance',
        label: 'Cultural Resonance',
        value: Number(lens.confidence.toFixed(3)),
        unit: null,
        source: 'buildStudioCulturalLens',
        evidenceIds: lens.domainValues.map((item) => `domain:${item.domain}`),
        confidence: lens.confidence,
        observedAt: lens.observedAt,
        formulaVersion: 'studio.cultural_lens.current',
        warnings: lens.warnings,
        explanation: lens.interpretation,
        status: lens.status === 'degraded' || lens.status === 'thin' ? 'DEGRADED' : 'DERIVED',
      })
      : missingMetric('cultural_resonance', 'Cultural Resonance', 'Cultural Vector evidence is unavailable.', ['world_vector', 'worldspect_snapshots']),
  ];

  metrics.forEach((metric) => values.push(observedMetric({
    key: metric.id,
    label: metric.label,
    value: metric.value,
    unit: metric.unit,
    source: metric.source ?? 'studio_object_features',
    evidenceIds: metric.evidenceIds,
    confidence: metric.confidence,
    observedAt: asString(stored.features.find((row) => asString(row.feature_key) === metric.id)?.created_at),
    explanation: metric.explanation,
  })));

  return values;
}

function phaseStatesFromState(input: {
  activeObject: StudioProductionObject;
  metrics: StudioFeatureMetric[];
  lens: Awaited<ReturnType<typeof buildStudioCulturalLens>> | null;
  hypotheses: ReturnType<typeof buildStudioHypotheses> | null;
  interventions: Row[];
  stored: Awaited<ReturnType<typeof queryLatestSessionAndObject>>;
  exportsRows: Row[];
  archiveRows: Row[];
}): StudioProductionState['phaseStates'] {
  const { activeObject, metrics, lens, hypotheses, interventions, stored, exportsRows, archiveRows } = input;
  const uploadStatus = statusFromUpload(latest(stored.uploads));
  const latestJob = latest(stored.jobs);
  const jobStatus = asString(latestJob?.status);
  const hasMetadata = Boolean(activeObject.mimeType || activeObject.sizeBytes !== null || activeObject.sourceUri);
  const hasFeatures = metrics.some((metric) => metric.value !== null);
  const hasFeatureRows = metrics.length > 0;
  const hasHypotheses = Boolean(hypotheses?.hypotheses.length || stored.hypotheses.length);
  const hasIntervention = interventions.length > 0;
  const hasExports = exportsRows.length > 0;
  const hasReturn = archiveRows.some((row) => asString(row.event_type)?.includes('return'));
  const hasOutcome = archiveRows.some((row) => asString(row.event_type)?.includes('outcome'));
  const hasLearning = archiveRows.some((row) => asString(row.event_type)?.includes('learning'));

  return [
    phase({ key: 'object_received', label: 'OBJECT RECEIVED', status: activeObject.id ? 'OBSERVED' : 'MISSING', progress: activeObject.id ? 1 : null, completedAt: activeObject.uploadedAt, requirements: ['studio_object'] }),
    phase({ key: 'storage_verified', label: 'STORAGE VERIFIED', status: uploadStatus, progress: uploadStatus === 'OBSERVED' ? 1 : null, completedAt: asString(latest(stored.uploads)?.created_at), error: uploadStatus === 'FAILED' ? asString(latest(stored.uploads)?.status) : null, requirements: ['studio_uploads'] }),
    phase({ key: 'metadata_extracted', label: 'METADATA EXTRACTED', status: hasMetadata ? 'OBSERVED' : 'MISSING', progress: hasMetadata ? 1 : null, completedAt: activeObject.uploadedAt, requirements: ['mime_type', 'size_bytes', 'source_uri'] }),
    phase({
      key: 'feature_extraction',
      label: 'FEATURE EXTRACTION',
      status: hasFeatures ? 'COMPLETE' : hasFeatureRows || jobStatus === 'complete' ? 'DEGRADED' : jobStatus === 'running' || jobStatus === 'queued' ? 'RUNNING' : jobStatus === 'failed' || jobStatus === 'blocked' ? 'FAILED' : 'MISSING',
      progress: hasFeatures ? 1 : jobStatus === 'running' ? 0.5 : null,
      error: jobStatus === 'failed' || jobStatus === 'blocked' ? asString(latestJob?.reason, 'feature_extractors_not_connected') : null,
      nextAction: hasFeatures ? null : 'Run analysis job to record blocked or complete status.',
      requirements: ['studio_object_features'],
    }),
    phase({ key: 'mihm_evaluation', label: 'MIHM EVALUATION', status: activeObject.id ? 'DERIVED' : 'MISSING', progress: activeObject.id ? 1 : null, details: 'Existing Phase 1 MIHM formulas are read, not modified.', requirements: ['active_object'] }),
    phase({ key: 'cultural_vector', label: 'CULTURAL VECTOR', status: lens ? (lens.status === 'degraded' || lens.status === 'thin' ? 'DEGRADED' : 'DERIVED') : 'MISSING', progress: lens ? 1 : null, error: lens?.status === 'failed' ? lens.interpretation : null, requirements: ['world_vector', 'cultural_lens'] }),
    phase({ key: 'wsv_timing', label: 'WSV TIMING', status: lens ? (lens.status === 'degraded' || lens.status === 'thin' ? 'DEGRADED' : 'DERIVED') : 'MISSING', progress: lens ? 1 : null, details: lens ? 'Uses existing Studio cultural lens/WorldSpect snapshot adapter; not recalculated by render.' : null, requirements: ['worldspect_snapshots'] }),
    phase({ key: 'hypothesis_generation', label: 'HYPOTHESIS GENERATION', status: hasHypotheses ? 'DERIVED' : 'MISSING', progress: hasHypotheses ? 1 : null, nextAction: hasFeatures ? null : 'Persist feature evidence before generating hypotheses.', requirements: ['feature_evidence'] }),
    phase({ key: 'intervention_design', label: 'INTERVENTION DESIGN', status: hasIntervention ? 'OBSERVED' : hasHypotheses ? 'PENDING' : 'MISSING', progress: hasIntervention ? 1 : null, requirements: ['hypothesis'] }),
    phase({ key: 'report_ready', label: 'REPORT READY', status: hasExports ? 'COMPLETE' : 'MISSING', progress: hasExports ? 1 : null, requirements: ['studio_exports'] }),
    phase({ key: 'return_pending', label: 'RETURN PENDING', status: hasReturn ? 'COMPLETE' : 'MISSING', progress: hasReturn ? 1 : null, requirements: ['return archive event'] }),
    phase({ key: 'outcome_recorded', label: 'OUTCOME RECORDED', status: hasOutcome ? 'COMPLETE' : 'MISSING', progress: hasOutcome ? 1 : null, requirements: ['outcome archive event'] }),
    phase({ key: 'learning_registered', label: 'LEARNING REGISTERED', status: hasLearning ? 'COMPLETE' : 'MISSING', progress: hasLearning ? 1 : null, requirements: ['learning archive event'] }),
  ];
}

function buildViewContracts(input: {
  activeObject: StudioProductionObject;
  metrics: StudioFeatureMetric[];
  lens: Awaited<ReturnType<typeof buildStudioCulturalLens>> | null;
  hypotheses: ReturnType<typeof buildStudioHypotheses> | null;
  stored: Awaited<ReturnType<typeof queryLatestSessionAndObject>>;
}): ViewContract[] {
  const { activeObject, metrics, lens, hypotheses, stored } = input;
  const hasObject = Boolean(activeObject.id);
  const hasAudio = activeObject.mimeType?.startsWith('audio/') || stored.audio.length > 0;
  const hasFeatures = metrics.some((metric) => metric.value !== null);
  const hasLayers = false;
  const hasHypothesis = Boolean(hypotheses?.hypotheses.length || stored.hypotheses.length);
  const hasMemory = stored.archiveEvents.length > 0 || stored.exports.length > 0 || stored.jobs.length > 0;

  return [
    {
      key: 'overview',
      title: 'OVERVIEW',
      purpose: 'Show active object, pipeline, evidence matrix, executive reading, current tension, and next action.',
      inputs: ['studio_object', 'studio_uploads', 'studio_object_features', 'studio_analysis_jobs'],
      outputs: ['phaseStates', 'evidence', 'nextAction'],
      requiredEvidence: ['studio_object'],
      status: hasObject ? 'OBSERVED' : 'MISSING',
      blockedReason: hasObject ? null : 'ACTIVE_OBJECT_REQUIRED',
    },
    {
      key: 'measure',
      title: 'MEASURE',
      purpose: 'Display technical measurements only from persisted features or browser audio analysis.',
      inputs: ['audio file', 'studio_audio_features', 'studio_object_features'],
      outputs: ['audio metrics', 'composition markers', 'mastering technical metrics'],
      requiredEvidence: ['audio evidence or text evidence'],
      status: hasFeatures || hasAudio ? 'OBSERVED' : 'MISSING',
      blockedReason: hasFeatures || hasAudio ? null : 'MEASUREMENT_EVIDENCE_REQUIRED',
    },
    {
      key: 'structure',
      title: 'STRUCTURE',
      purpose: 'Inspect layers, arrangements, mix and graph only when structural evidence exists.',
      inputs: ['stems', 'layers', 'sections', 'channels', 'feature graph'],
      outputs: ['layer table', 'arrangement dependencies', 'mix controls', 'neural graph'],
      requiredEvidence: ['multilayer evidence'],
      status: hasLayers ? 'OBSERVED' : 'MISSING',
      blockedReason: hasLayers ? null : 'MULTILAYER_EVIDENCE_REQUIRED',
    },
    {
      key: 'field',
      title: 'FIELD',
      purpose: 'Separate internal signal, cultural field and world timing without merging metrics.',
      inputs: ['MIHM', 'Cultural Vector', 'WorldSpect snapshot'],
      outputs: ['field tensions', 'hypotheses'],
      requiredEvidence: ['active object', 'field evidence'],
      status: lens || hasObject ? (lens?.status === 'degraded' || lens?.status === 'thin' ? 'DEGRADED' : 'DERIVED') : 'MISSING',
      blockedReason: hasObject ? null : 'ACTIVE_OBJECT_REQUIRED',
    },
    {
      key: 'intervention',
      title: 'INTERVENTION',
      purpose: 'Expose minimum perturbation, simulation availability, verification and outcome registration.',
      inputs: ['hypothesis', 'intervention row', 'simulation endpoint'],
      outputs: ['candidate actions', 'verification window', 'outcome registration'],
      requiredEvidence: ['hypothesis'],
      status: hasHypothesis ? 'PENDING' : 'MISSING',
      blockedReason: hasHypothesis ? null : 'HYPOTHESIS_REQUIRED',
    },
    {
      key: 'memory',
      title: 'MEMORY',
      purpose: 'Show persisted sessions, timeline, archives, versions, deliverables and learning.',
      inputs: ['studio_sessions', 'studio_archive_events', 'studio_exports', 'studio_analysis_jobs'],
      outputs: ['longitudinal table', 'timeline', 'deliverable state'],
      requiredEvidence: ['session or archive rows'],
      status: hasMemory ? 'OBSERVED' : hasObject ? 'PENDING' : 'MISSING',
      blockedReason: hasObject ? null : 'ACTIVE_OBJECT_REQUIRED',
    },
  ];
}

function buildNextAction(activeObject: StudioProductionObject, metrics: StudioFeatureMetric[], stored: Awaited<ReturnType<typeof queryLatestSessionAndObject>>): StudioProductionState['nextAction'] {
  if (!activeObject.id) {
    return {
      code: 'UPLOAD_OBJECT',
      action: 'Cargar objeto',
      reason: 'Studio no tiene objeto activo persistido.',
      requirement: 'audio, imagen, texto, documento, URL o evidencia manual',
      endpoint: null,
      method: null,
      disabledReason: null,
    };
  }
  if (!stored.uploads.length) {
    return {
      code: 'STORAGE_EVIDENCE_MISSING',
      action: 'Verificar storage',
      reason: 'El objeto existe, pero no hay fila en studio_uploads.',
      requirement: 'studio_uploads row',
      endpoint: null,
      method: null,
      disabledReason: 'No existe endpoint de reparacion de storage en Studio.',
    };
  }
  if (!metrics.some((metric) => metric.value !== null)) {
    return {
      code: 'RUN_ANALYSIS',
      action: 'Ejecutar analisis',
      reason: 'No hay features persistidas para el objeto activo.',
      requirement: 'studio_object_features',
      endpoint: `/api/studio/objects/${encodeURIComponent(activeObject.id)}/analyze`,
      method: 'POST',
      disabledReason: null,
    };
  }
  return {
    code: 'NO_ACTION_AVAILABLE',
    action: 'NO_ACTION_AVAILABLE',
    reason: 'No hay accion automatica segura con la evidencia actual.',
    requirement: null,
    endpoint: null,
    method: null,
    disabledReason: 'All available follow-up actions require additional persisted hypotheses or intervention engines.',
  };
}

export async function readStudioProductionState(options: { ownerId?: string | null; includeLegacy?: boolean } = {}): Promise<StudioProductionState> {
  const generatedAt = new Date().toISOString();
  try {
    const [gold, lens, stored] = await Promise.all([
      readStudioGoldState(),
      buildStudioCulturalLens().catch(() => null),
      queryLatestSessionAndObject(options.ownerId, options.includeLegacy ?? false),
    ]);

    const session = sessionFrom(stored.session, generatedAt);
    const activeObject = objectFrom(stored.object, session);
    const uploadStatus = statusFromUpload(latest(stored.uploads));
    const metrics = metricsFromFeatureRows(stored.features);
    const latestJob = latest(stored.jobs);
    const latestJobStatus = asString(latestJob?.status);
    const readiness = activeObject.id ? readinessFromMetrics(metrics) : 'missing';
    const observedFeatureCount = metrics.filter((metric) => metric.value !== null).length;
    const activeObjectWithStatus = {
      ...activeObject,
      readiness,
      storageStatus: uploadStatus,
      analysisStatus: observedFeatureCount > 0
        ? 'COMPLETE' as const
        : latestJobStatus === 'running' || latestJobStatus === 'queued'
          ? 'RUNNING' as const
          : latestJobStatus === 'failed' || latestJobStatus === 'blocked'
            ? 'FAILED' as const
            : activeObject.analysisStatus,
    };
    const layers = metrics.map((metric) => ({
      id: metric.id,
      label: metric.label,
      kind: activeObject.type,
      weight: typeof metric.value === 'number' ? metric.value : null,
      status: metric.status,
    }));

    const layerInputs = layerInputsFromMetrics(metrics);
    const hypotheses = layerInputs.length ? buildStudioHypotheses({ layers: layerInputs, culturalLens: lens }) : null;
    const scoreValues = [gold.mihmModel.individual, gold.mihmModel.group, gold.mihmModel.institutional, gold.mihmModel.systemic, gold.mihmModel.civilizational].filter((value) => Number.isFinite(value));
    const mihmScore = scoreValues.length ? scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length : null;
    const evidence = evidenceFromRows(stored, activeObjectWithStatus);
    const metricValues = metricValuesFromState({ activeObject: activeObjectWithStatus, metrics, evidence, lens, mihmScore, gold, stored });
    const graphNodes: StudioProductionState['objectFeatures']['graph']['nodes'] = [
      activeObjectWithStatus.id ? { id: activeObjectWithStatus.id, label: activeObjectWithStatus.title, layer: 'object', value: null } : null,
      ...metrics.filter((metric) => typeof metric.value === 'number').map((metric) => ({ id: metric.id, label: metric.label, layer: 'feature', value: metric.value as number })),
      lens ? { id: 'cultural-lens', label: 'CULTURAL LENS', layer: 'context', value: lens.confidence } : null,
      activeObjectWithStatus.id && mihmScore !== null ? { id: 'mihm', label: 'MIHM', layer: 'model', value: Number(mihmScore.toFixed(3)) } : null,
    ].filter((item): item is { id: string; label: string; layer: string; value: number | null } => Boolean(item));
    const graphEdges = activeObjectWithStatus.id
      ? graphNodes
        .filter((node) => node.id !== activeObjectWithStatus.id && node.value !== null)
        .map((node) => ({
          from: activeObjectWithStatus.id as string,
          to: node.id,
          weight: typeof node.value === 'number' ? clamp01(node.value) : null,
          source: node.layer === 'feature' ? 'studio_object_features' : node.layer === 'context' ? 'buildStudioCulturalLens' : 'studioGold.mihmModel',
        }))
      : [];
    const phaseStates = phaseStatesFromState({
      activeObject: activeObjectWithStatus,
      metrics,
      lens,
      hypotheses,
      interventions: stored.interventions,
      stored,
      exportsRows: stored.exports,
      archiveRows: stored.archiveEvents,
    });
    const fieldNodes: StudioFieldNode[] = [
      ...metricValues
        .filter((metric) => metric.status !== 'MISSING' && metric.explanation)
        .map((metric) => ({
          id: metric.key,
          label: metric.label,
          type: metric.key === 'active_object' ? 'object' as const : 'metric' as const,
          value: metric.value,
          status: metric.status,
          source: metric.source,
          formulaVersion: metric.formulaVersion,
          confidence: metric.confidence,
          explanation: metric.explanation,
          evidenceIds: metric.evidenceIds,
        })),
      ...evidence.map((item) => ({
        id: `evidence:${item.id}`,
        label: item.label,
        type: 'evidence' as const,
        value: item.type,
        status: 'OBSERVED' as const,
        source: item.source,
        formulaVersion: null,
        confidence: item.reliability,
        explanation: `Evidence reference from ${item.source}.`,
        evidenceIds: [item.id],
      })),
      ...(hypotheses?.hypotheses ?? []).map((item) => ({
        id: `hypothesis:${item.id}`,
        label: item.metric,
        type: 'hypothesis' as const,
        value: item.severity,
        status: 'DERIVED' as const,
        source: item.sources.join(', '),
        formulaVersion: 'mihmThresholds.current',
        confidence: item.dataClass === 'real' ? 0.85 : 0.55,
        explanation: item.statement,
        evidenceIds: item.sources,
      })),
    ];
    const fieldEdges: StudioFieldEdge[] = graphEdges.map((edge) => ({
      from: edge.from,
      to: edge.to,
      relationType: 'explains',
      weight: edge.weight,
      source: edge.source,
      confidence: edge.weight ?? 0,
      explanation: `Relation from active object to ${edge.to} based on ${edge.source}.`,
    }));
    const viewContracts = buildViewContracts({ activeObject: activeObjectWithStatus, metrics, lens, hypotheses, stored });
    const nextAction = buildNextAction(activeObjectWithStatus, metrics, stored);
    const latestAudio = latest(stored.audio);
    const waveform = waveformValues(latestAudio?.waveform);
    const energySegments = energyValues(latestAudio?.energy_segments);
    const hasOperationalGaps = !activeObjectWithStatus.id || !observedFeatureCount || stored.degraded.length > 0 || gold.systemState !== 'nominal';

    return {
      generatedAt,
      systemState: hasOperationalGaps ? 'degraded' : 'nominal',
      session,
      activeObject: activeObjectWithStatus,
      objectFeatures: {
        modality: activeObjectWithStatus.type,
        readiness,
        metrics,
        layers,
        graph: { nodes: graphNodes, edges: graphEdges },
      },
      metricValues,
      phaseStates,
      evidence,
      viewContracts,
      fieldGraph: { nodes: fieldNodes, edges: fieldEdges },
      nextAction,
      audioFeatures: {
        waveform,
        rms: metricNumber(metrics, 'rms_dbfs'),
        peak: metricNumber(metrics, 'peak_dbfs'),
        clippingRisk: metricNumber(metrics, 'clipping_risk'),
        dynamicRange: metricNumber(metrics, 'dynamic_range_db'),
        lufs: metricNumber(metrics, 'lufs_integrated'),
        spectralCentroid: metricNumber(metrics, 'spectral_centroid_hz'),
        frequencyBands: numberArray(latestAudio?.frequency_bands),
        stereoImage: metricNumber(metrics, 'stereo_width'),
        silenceStartSeconds: null,
        silenceEndSeconds: null,
        energySegments,
        stemCorrelation: hypotheses?.correlations.map((item) => ({ a: item.layerA, b: item.layerB, value: item.correlation })) ?? [],
      },
      videoFeatures: {
        shots: asNumber(latest(stored.video)?.shots),
        scenes: asNumber(latest(stored.video)?.scenes),
        motionIntensity: asNumber(latest(stored.video)?.motion_intensity),
        transitionRhythm: asNumber(latest(stored.video)?.transition_rhythm),
        visualMotifs: asArray(latest(stored.video)?.visual_motifs).map(String),
      },
      imageFeatures: {
        dominantColors: asArray(latest(stored.image)?.dominant_colors).map(String),
        textureDensity: asNumber(latest(stored.image)?.texture_density),
        visualEntropy: asNumber(latest(stored.image)?.visual_entropy),
        spatialBalance: asNumber(latest(stored.image)?.spatial_balance),
        symbolicTags: asArray(latest(stored.image)?.symbolic_tags).map(String),
      },
      textFeatures: {
        tokens: asNumber(latest(stored.text)?.tokens),
        sections: asNumber(latest(stored.text)?.sections),
        themes: asArray(latest(stored.text)?.themes).map(String),
        motifs: asArray(latest(stored.text)?.motifs).map(String),
        sentimentArousal: null,
        narrativeArc: numberArray(latest(stored.text)?.narrative_arc),
        semanticDensity: asNumber(latest(stored.text)?.semantic_density),
        symbolicRecurrence: asNumber(latest(stored.text)?.symbolic_recurrence),
      },
      communityFeatures: {
        participantCount: asNumber(latest(stored.community)?.participant_count),
        messageDensity: asNumber(latest(stored.community)?.message_density),
        topicClusters: asArray(latest(stored.community)?.topic_clusters).map(String),
        affectiveTone: asNumber(latest(stored.community)?.affective_tone),
        recurrence: asNumber(latest(stored.community)?.recurrence),
        coherence: asNumber(latest(stored.community)?.coherence),
        friction: asNumber(latest(stored.community)?.friction),
      },
      timeCoordinateFeatures: {
        timeRange: asString(latest(stored.timeCoordinates)?.time_range),
        placeLabel: asString(latest(stored.timeCoordinates)?.place_label),
        semanticAnchors: asArray(latest(stored.timeCoordinates)?.semantic_anchors).map(String),
        historicalVectorTags: asArray(latest(stored.timeCoordinates)?.historical_vector_tags).map(String),
        dominantTensions: asArray(latest(stored.timeCoordinates)?.dominant_tensions).map(String),
        gapDescription: asString(latest(stored.timeCoordinates)?.gap_description),
      },
      culturalLens: lens,
      mihmReport: {
        score: mihmScore === null ? null : Number(mihmScore.toFixed(3)),
        individual: gold.mihmModel.individual || null,
        group: gold.mihmModel.group || null,
        institutional: gold.mihmModel.institutional || null,
        systemic: gold.mihmModel.systemic || null,
        civilizational: gold.mihmModel.civilizational || null,
        source: 'studioGold.mihmModel',
      },
      hypotheses,
      interventions: stored.interventions.map((row) => ({
        id: asString(row.id, 'intervention') ?? 'intervention',
        title: asString(row.title, 'Intervention') ?? 'Intervention',
        state: asString(row.state) === 'complete' ? 'complete' : asString(row.state) === 'running' ? 'running' : asString(row.state) === 'failed' ? 'failed' : asString(row.state) === 'blocked' ? 'blocked' : 'queued',
        scope: 'overview',
        expectedImpact: asNumber(row.expected_impact),
        risk: asNumber(row.risk),
        source: 'studio_interventions',
      })),
      archive: {
        events: stored.archiveEvents.map((row) => ({
          id: asString(row.id, 'archive') ?? 'archive',
          time: asString(row.created_at, generatedAt) ?? generatedAt,
          label: asString(row.label, asString(row.event_type, 'Archive event')) ?? 'Archive event',
          source: asString(row.source, 'studio_archive_events') ?? 'studio_archive_events',
        })),
        evidenceTraceCount: stored.evidenceTraces.length || null,
        integrity: stored.archiveEvents.length || stored.evidenceTraces.length ? 'partial' : 'missing',
      },
      exports: {
        packages: stored.exports.map((row) => ({
          id: asString(row.id, 'export') ?? 'export',
          label: asString(row.label, 'Studio export') ?? 'Studio export',
          state: asString(row.state) === 'complete' ? 'complete' : asString(row.state) === 'running' ? 'running' : asString(row.state) === 'failed' ? 'failed' : asString(row.state) === 'blocked' ? 'blocked' : 'queued',
          url: asString(row.url),
        })),
        signoffReadiness: stored.exports.some((row) => asString(row.state) === 'complete') ? 'ready' : 'missing',
      },
      provenance: {
        basedOn: ['studio_sessions', 'studio_objects', 'studio_uploads', 'studio_object_features', ...(lens ? ['buildStudioCulturalLens'] : []), 'readStudioGoldState'],
        derivedFrom: ['StudioProductionState adapter', 'canonical Studio contracts'],
        limits: [
          ...stored.degraded,
          ...gold.provenance.limits,
          ...(activeObjectWithStatus.id ? [] : ['studio_objects has no active object; Studio remains object-gated']),
          ...(hypotheses ? [] : ['hypothesisEngine not invoked because no usable object feature layer is persisted']),
        ],
      },
      degradedSources: [...stored.degraded, ...gold.provenance.degradedSources],
    };
  } catch (error) {
    return buildStudioProductionDegradedState(error instanceof Error ? error.message : 'studio_production_state_failed');
  }
}
