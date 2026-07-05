import 'server-only';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { readStudioGoldState } from '@/lib/studio/gold/studioGoldAdapter';
import { buildStudioCulturalLens } from './studioCulturalLens';
import { buildStudioHypotheses, type StudioLayerInput } from './hypothesisEngine';
import { buildStudioProductionDegradedState } from './studioProductionDegradedState';
import type {
  StudioFeatureMetric,
  StudioObjectType,
  StudioProductionObject,
  StudioProductionSession,
  StudioProductionState,
  StudioReadinessState,
} from './studioProductionTypes';

type Row = Record<string, unknown>;

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

async function queryLatestSessionAndObject() {
  const degraded: string[] = [];
  try {
    const supabase = createServiceSupabaseClient();
    const { data: session, error: sessionError } = await supabase
      .from('studio_sessions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session) return { session: null, object: null, features: [], degraded };

    const { data: object, error: objectError } = await supabase
      .from('studio_objects')
      .select('*')
      .eq('session_id', asString((session as Row).id))
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (objectError) throw objectError;

    const objectId = asString((object as Row | null)?.id);
    const { data: features, error: featureError } = objectId
      ? await supabase.from('studio_object_features').select('*').eq('object_id', objectId)
      : { data: [], error: null };

    if (featureError) throw featureError;
    return { session: asRecord(session), object: object ? asRecord(object) : null, features: asRows(features), degraded };
  } catch (error) {
    degraded.push(error instanceof Error ? error.message : 'studio_tables_unavailable');
    return { session: null, object: null, features: [], degraded };
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
      status: 'blocked',
      readiness: 'missing',
      uploadedAt: null,
    };
  }

  return {
    id: asString(row.id) || null,
    sessionId: asString(row.session_id) || session.id,
    title: asString(row.title, 'OBJETO SIN TITULO'),
    type: inferObjectType(row.object_type),
    sourceUri: asString(row.source_uri) || null,
    mimeType: asString(row.mime_type) || null,
    status: asString(row.status) === 'ready' ? 'complete' : asString(row.status) === 'analyzing' ? 'running' : 'queued',
    readiness: asString(row.status) === 'ready' ? 'ready' : 'partial',
    uploadedAt: asString(row.created_at) || null,
  };
}

function metricsFromFeatureRows(rows: Row[], gold: Awaited<ReturnType<typeof readStudioGoldState>>): StudioFeatureMetric[] {
  const persisted = rows.map((row) => ({
    id: asString(row.feature_key, asString(row.id, 'feature')),
    label: asString(row.label, asString(row.feature_key, 'FEATURE')).toUpperCase(),
    value: clamp01(asNumber(row.numeric_value)),
    unit: asString(row.unit) || undefined,
    source: 'studio_object_features',
    status: asNumber(row.numeric_value) === null ? 'blocked' as const : 'ready' as const,
  }));

  if (persisted.length) return persisted;

  return [
    {
      id: 'coherence',
      label: 'COHERENCIA DEL OBJETO',
      value: clamp01(gold.culturalWave.coherenceGlobal),
      source: 'studioGold.culturalWave.coherenceGlobal',
      status: gold.activeCase.id ? 'partial' : 'missing',
    },
    {
      id: 'entropy',
      label: 'TENSION / ENTROPIA',
      value: clamp01(gold.culturalWave.culturalEntropy),
      source: 'studioGold.culturalWave.culturalEntropy',
      status: gold.activeCase.id ? 'partial' : 'missing',
    },
    {
      id: 'symbolic_density',
      label: 'DENSIDAD SIMBOLICA',
      value: clamp01(gold.culturalWave.symbolicDensity),
      source: 'studioGold.culturalWave.symbolicDensity',
      status: gold.activeCase.id ? 'partial' : 'missing',
    },
    {
      id: 'plasticity',
      label: 'PLASTICIDAD',
      value: clamp01(gold.culturalWave.plasticity),
      source: 'studioGold.culturalWave.plasticity',
      status: gold.activeCase.id ? 'partial' : 'missing',
    },
  ];
}

function layerInputsFromMetrics(metrics: StudioFeatureMetric[]): StudioLayerInput[] {
  if (!metrics.some((metric) => metric.value !== null)) return [];
  return metrics.slice(0, 5).map((metric, index) => {
    const value = metric.value ?? 0;
    return {
      id: metric.id,
      name: metric.label,
      peak: value,
      rms: value * 0.72,
      clippingRisk: metric.id.includes('entropy') ? value : null,
      dynamicRange: metric.id.includes('plasticity') ? value : null,
      silenceStartSeconds: null,
      silenceEndSeconds: null,
      energySegments: Array.from({ length: 12 }, (_, segment) => Number(Math.max(0, Math.min(1, value * (0.72 + ((segment + index) % 5) * 0.07))).toFixed(3))),
      structureNote: metric.source,
    };
  });
}

export async function readStudioProductionState(): Promise<StudioProductionState> {
  const generatedAt = new Date().toISOString();
  try {
    const [gold, lens, stored] = await Promise.all([
      readStudioGoldState(),
      buildStudioCulturalLens().catch(() => null),
      queryLatestSessionAndObject(),
    ]);

    const session = sessionFrom(stored.session, generatedAt);
    const activeObject = objectFrom(stored.object, session);
    const metrics = metricsFromFeatureRows(stored.features, gold);
    const readiness = activeObject.id ? readinessFromMetrics(metrics) : 'missing';
    const layers = metrics.map((metric) => ({
      id: metric.id,
      label: metric.label,
      kind: activeObject.type,
      weight: metric.value,
      status: metric.status,
    }));
    const graphNodes = [
      activeObject.id ? { id: activeObject.id, label: activeObject.title, layer: 'object', value: readiness === 'ready' ? 1 : readiness === 'partial' ? 0.5 : null } : null,
      ...metrics.map((metric) => ({ id: metric.id, label: metric.label, layer: 'feature', value: metric.value })),
      { id: 'cultural-lens', label: 'CULTURAL LENS', layer: 'context', value: lens?.confidence ?? null },
      { id: 'mihm', label: 'MIHM', layer: 'model', value: gold.objectEvaluation.measurements.find((item) => item.id === 'mihm-systemic')?.value ?? gold.mihmModel.systemic },
      { id: 'archive', label: 'ARCHIVE', layer: 'memory', value: gold.provenance.basedOn.length ? Math.min(1, gold.provenance.basedOn.length / 8) : null },
    ].filter((item): item is { id: string; label: string; layer: string; value: number | null } => Boolean(item));

    const graphEdges = graphNodes.slice(1).map((node) => ({
      from: graphNodes[0]?.id ?? 'object',
      to: node.id,
      weight: node.value,
      source: node.layer === 'feature' ? 'studio_object_features' : 'derived_state_link',
    }));

    const layerInputs = layerInputsFromMetrics(metrics);
    const hypotheses = layerInputs.length ? buildStudioHypotheses({ layers: layerInputs, culturalLens: lens }) : null;
    const scoreValues = [gold.mihmModel.individual, gold.mihmModel.group, gold.mihmModel.institutional, gold.mihmModel.systemic, gold.mihmModel.civilizational].filter((value) => Number.isFinite(value));
    const mihmScore = scoreValues.length ? scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length : null;

    return {
      generatedAt,
      systemState: stored.degraded.length || gold.systemState !== 'nominal' || !activeObject.id ? 'degraded' : 'nominal',
      session,
      activeObject: { ...activeObject, readiness },
      objectFeatures: {
        modality: activeObject.type,
        readiness,
        metrics,
        layers,
        graph: { nodes: graphNodes, edges: graphEdges },
      },
      audioFeatures: {
        waveform: gold.longitudinalTracking[0]?.series ?? [],
        rms: metrics.find((item) => item.id === 'rms')?.value ?? null,
        peak: metrics.find((item) => item.id === 'peak')?.value ?? null,
        clippingRisk: metrics.find((item) => item.id === 'clippingRisk')?.value ?? null,
        dynamicRange: metrics.find((item) => item.id === 'dynamicRange')?.value ?? null,
        lufs: metrics.find((item) => item.id === 'lufs')?.value ?? null,
        spectralCentroid: metrics.find((item) => item.id === 'spectralCentroid')?.value ?? null,
        frequencyBands: gold.keyObservables.map((item) => item.value).filter((value) => Number.isFinite(value)),
        stereoImage: null,
        silenceStartSeconds: null,
        silenceEndSeconds: null,
        energySegments: gold.culturalWave.points.map((point) => point.amplitude).slice(0, 48),
        stemCorrelation: hypotheses?.correlations.map((item) => ({ a: item.layerA, b: item.layerB, value: item.correlation })) ?? [],
      },
      videoFeatures: { shots: null, scenes: null, motionIntensity: null, transitionRhythm: null, visualMotifs: [] },
      imageFeatures: { dominantColors: [], textureDensity: null, visualEntropy: null, spatialBalance: null, symbolicTags: [] },
      textFeatures: {
        tokens: null,
        sections: null,
        themes: lens?.domainValues.map((item) => item.domain) ?? [],
        motifs: gold.persistentSignals.map((item) => item.label),
        sentimentArousal: null,
        narrativeArc: gold.longitudinalTracking[0]?.series ?? [],
        semanticDensity: gold.culturalWave.symbolicDensity || null,
        symbolicRecurrence: gold.culturalWave.coherenceGlobal || null,
      },
      communityFeatures: {
        participantCount: null,
        messageDensity: null,
        topicClusters: lens?.trends.map((item) => item.domain) ?? [],
        affectiveTone: gold.wsvLens.cultural || null,
        recurrence: gold.culturalWave.coherenceGlobal || null,
        coherence: gold.culturalWave.coherenceGlobal || null,
        friction: gold.culturalWave.culturalEntropy || null,
      },
      timeCoordinateFeatures: {
        timeRange: null,
        placeLabel: null,
        semanticAnchors: lens?.domainValues.map((item) => item.domain) ?? [],
        historicalVectorTags: lens?.trends.map((item) => `${item.domain}:${item.direction}`) ?? [],
        dominantTensions: gold.persistentSignals.map((item) => item.label),
        gapDescription: activeObject.type === 'time_coordinate' ? gold.synthesis.implication : null,
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
      interventions: gold.pmv.state === 'blocked' ? [] : [{
        id: gold.pmv.id,
        title: gold.pmv.hypothesis,
        state: gold.pmv.state === 'complete' ? 'complete' : gold.pmv.state === 'running' ? 'running' : 'queued',
        scope: 'overview',
        expectedImpact: gold.pmv.expectedImpact,
        risk: gold.pmv.intensity === 'high' ? 0.72 : gold.pmv.intensity === 'medium' ? 0.44 : 0.22,
        source: 'studioGold.pmv',
      }],
      archive: {
        events: gold.provenance.basedOn.map((source, index) => ({ id: `source-${index + 1}`, time: generatedAt, label: source, source })),
        evidenceTraceCount: gold.activeCase.signals || null,
        integrity: gold.provenance.basedOn.length ? 'partial' : 'missing',
      },
      exports: {
        packages: [],
        signoffReadiness: activeObject.id && hypotheses ? 'partial' : 'missing',
      },
      provenance: {
        basedOn: ['readStudioGoldState', ...(lens ? ['buildStudioCulturalLens'] : []), ...gold.provenance.basedOn],
        derivedFrom: ['StudioProductionState adapter'],
        limits: [
          ...stored.degraded,
          ...gold.provenance.limits,
          ...(activeObject.id ? [] : ['studio_objects has no active object; Studio remains object-gated']),
          ...(hypotheses ? [] : ['hypothesisEngine not invoked because no usable object feature layer is persisted']),
        ],
      },
      degradedSources: [...stored.degraded, ...gold.provenance.degradedSources],
    };
  } catch (error) {
    return buildStudioProductionDegradedState(error instanceof Error ? error.message : 'studio_production_state_failed');
  }
}
