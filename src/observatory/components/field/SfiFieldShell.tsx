'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { SfiAsset } from '@/lib/types';
import { inferOperationalReading, type OperationalReading, type SignalKind } from '@/lib/sfi/inference';
import { formatAmvVisibleResponse } from '@/observatory/communication/amvVisibleFormatter';
import {
  buildLowFrictionRoute,
  detectFieldPatterns,
  fieldPatterns,
  formatFieldAmvReading,
  makeBitacoraEntry,
  type BitacoraEntry,
  type BitacoraEventType,
  type FieldMode,
} from '@/observatory/field/patternModel';
import { rankDetectedPatterns, type PatternRankResult } from '@/observatory/field/patternActivation';
import { buildGraphVectorState } from '@/observatory/field/vectorMatrix';
import type { UserSignalVector } from '@/observatory/field/vectorTypes';
import { createObservationSourceDescriptor, type ObservationSourceDescriptor, type ObservationSourceState } from '@/observatory/source/sourceStateTypes';
import {
  getLatestWorldSpectrumSnapshot,
  getConnectedSocialSources,
  getFieldRuntimeStatus,
  ingestReadOnlySocialMetrics,
  persistFieldEvent,
  persistManualSocialPost,
  persistManualSocialReturn,
  persistSfiLogbookEvent,
  persistSocialDraft,
  persistWorldSpectrumSnapshot,
  type PersistenceResult,
} from '@/observatory/persistence/supabaseFieldPersistence';
import { canPersistToSupabase } from '@/observatory/persistence/persistenceGuard';
import {
  shouldPersistFieldEvent,
  shouldPersistManualPost,
  shouldPersistManualReturn,
} from '@/observatory/runtime/deduplicateFieldEvents';
import type { ManualSocialPostInput, ManualSocialReturn } from '@/observatory/social/socialManualReturnTypes';
import type { SocialProvider } from '@/observatory/social/socialOAuthTypes';
import { resolveFieldSurface } from '@/observatory/surface/fieldSurfaceRouter';
import { surfaceNodes } from '@/observatory/surface/surfaceNodes';
import {
  approveSocialDraftContent,
  archiveSocialDraft,
  createSocialDraft,
  requestPublicationConfirmation,
  reviewSocialDraft,
  updateSocialDraftText,
} from '@/observatory/social/socialDraftPipeline';
import type { SocialDraft } from '@/observatory/social/socialDraftTypes';
import { buildWorldSpectReading } from '@/observatory/worldspect/buildWorldSpectReading';
import { detectWorldSpectTriggers } from '@/observatory/worldspect/detectWorldSpectTriggers';
import { worldSpectSymbols } from '@/observatory/worldspect/worldSpectTypes';
import { SfiCognitiveField } from './SfiCognitiveField';
import { FieldRuntimePanel, type FieldRuntimeStatus } from './FieldRuntimePanel';
import { SocialDraftPanel } from './SocialDraftPanel';
import { WorldSpectPanel } from './WorldSpectPanel';
import { getDefaultFieldNodes, type FieldCommandMode, type FieldOntologyNode } from './fieldOntology';
import { AtlasLaboratoryShell } from '@/observatory/components/laboratory/AtlasLaboratoryShell';

type CalendarWindow = {
  label: string;
  starts_at: string;
  ends_at: string;
  execution_bias: string;
  risk: string;
  recommended_action: string;
};

type MediaDraft = {
  id: string;
  platform_target: string;
  content: string;
  status: string;
  created_at: string;
};

type SfiFieldShellProps = {
  nodeId?: string | null;
  assets: SfiAsset[];
  activeAssetId?: string;
  onAssetsChange: (assets: SfiAsset[]) => void;
  onActiveAssetChange: (assetId: string) => void;
  persistenceMode?: 'local_only' | 'supabase';
  localNode?: Record<string, any> | null;
  paywallLinks?: { full: string; report: string };
};

const phases = [
  { label: 'SENAL', node: 'nodo.usuario.intencion' },
  { label: 'ANALISIS', node: 'nodo.aptymok.mihm' },
  { label: 'INTERVENCION', node: 'nodo.aptymok.intervencion' },
  { label: 'SEGUIMIENTO', node: 'nodo.aptymok.bitacora' },
  { label: 'EJECUCION', node: 'nodo.aptymok.calendarizacion' },
];

const localPhases = [
  { label: 'AUDITORIA', node: 'nodo.surface.contenido' },
  { label: 'SIMULACION', node: 'nodo.surface.estabilidad' },
  { label: 'RESULTADO', node: 'nodo.surface.estado' },
  { label: 'ACCION', node: 'nodo.surface.siguiente_paso' },
];

const socialKinds: SignalKind[] = ['campania_redes', 'audio', 'imagen', 'video'];

function textFromRecord(record: Record<string, unknown> | undefined, key: string) {
  const value = record?.[key];
  return typeof value === 'string' ? value : '';
}

function assetName(asset?: SfiAsset | null) {
  return textFromRecord(asset?.target_system, 'name') || asset?.asset_id || 'senal sin nombre';
}

function visibleRegime(regime: string) {
  if (regime === 'HOMEOSTATIC') return 'campo estable';
  if (regime === 'CRITICAL') return 'campo critico';
  return 'campo en transicion';
}

function normalizeCommand(command: string) {
  return command
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function detectIntent(command: string) {
  const text = normalizeCommand(command);
  if (/(publicar|post|copy|pieza|redes)/.test(text)) return 'salida_publica';
  if (/(compliance|cumplimiento|metrica|indicador)/.test(text)) return 'validacion_operativa';
  if (/(nadie decidio|decision|decidir)/.test(text)) return 'decision_implicita';
  if (/(evidencia|origen|fuente|traza)/.test(text)) return 'trazabilidad';
  if (/(no se|incertidumbre|bloqueado|pendiente)/.test(text)) return 'friccion_de_accion';
  return 'observacion';
}

function hasSocialDraftIntent(command: string) {
  const text = normalizeCommand(command);
  return /(publicar|publicacion|post|linkedin|twitter|x\.com|instagram|tiktok|youtube|reddit|campana|campania|redes|copy|reel|pieza)/.test(text);
}

function kindFromCommand(command: string): SignalKind {
  const normalized = command.toLowerCase();
  if (/(red|redes|campana|campaña|copy|reel|post|contenido|marca|audiencia)/.test(normalized)) return 'campania_redes';
  if (/(audio|voz|transcripcion|transcripción)/.test(normalized)) return 'audio';
  if (/(codigo|código|repo|bug|commit|pull request)/.test(normalized)) return 'codigo';
  if (/(url|link|sitio|web)/.test(normalized)) return 'url';
  if (/(documento|pdf|archivo|texto)/.test(normalized)) return 'documento';
  if (/(relacion|relación|persona|equipo|conversacion|conversación)/.test(normalized)) return 'relacional';
  if (/(estrategia|plan|mercado|negocio)/.test(normalized)) return 'estrategia';
  return 'proyecto';
}

function updateCommunicationProfile(current: Record<string, any> | undefined, command: string) {
  const text = normalizeCommand(command);
  const profile = { ...(current || {}) };
  if (/no entiendo|saturado|demasiado|me pierdo|confuso/.test(text)) {
    profile.prefersShortAnswers = true;
    profile.overloadDetectedCount = Number(profile.overloadDetectedCount || 0) + 1;
    profile.preferredActionFormat = profile.preferredActionFormat || 'accion_minima';
  }
  if (/trazabilidad|origen|fuente|por partes|tecnico|tecnica/.test(text)) {
    profile.prefersTechnicalTrace = true;
  }
  const rejected = command.match(/no digas\s+["“']?([^"”']+)/i);
  if (rejected?.[1]) {
    profile.rejectedPhrases = Array.from(new Set([...(profile.rejectedPhrases || []), rejected[1].trim().slice(0, 80)]));
  }
  if (/no entiendo|por que dices|no estoy de acuerdo/.test(text)) {
    profile.lastMisunderstoodTerms = Array.from(new Set([...(profile.lastMisunderstoodTerms || []), command.slice(0, 120)]));
  }
  return profile;
}

function readingFromAsset(asset?: SfiAsset | null): OperationalReading {
  const metadataReading = asset?.metadata?.operational_reading as OperationalReading | undefined;
  if (metadataReading?.phenomenon) return metadataReading;

  return inferOperationalReading({
    kind: (textFromRecord(asset?.metadata, 'signal_kind') as SignalKind) || 'proyecto',
    signal: textFromRecord(asset?.objective, 'observed_signal') || textFromRecord(asset?.objective, 'declaration') || assetName(asset),
    evidenceLabel: textFromRecord(asset?.metadata, 'evidence_name'),
  });
}

function makeDraftAsset(command = ''): SfiAsset {
  const kind = kindFromCommand(command);
  const reading = command.trim()
    ? inferOperationalReading({ kind, signal: command })
    : inferOperationalReading({ kind: 'proyecto', signal: 'Campo inicial sin senal persistida.' });

  return {
    asset_id: 'SFI-FIELD-EMPTY',
    owner_user_id: 'field',
    target_system: {
      name: command.trim().slice(0, 72) || 'campo inicial',
      type: kind,
      source: 'field_shell',
    },
    objective: {
      declaration: reading.nextAction,
      observed_signal: command,
    },
    state_vector: reading.technical,
    current_phase: 'FIELD_EMPTY',
    metadata: {
      source: 'field_shell',
      signal_kind: kind,
      operational_reading: reading,
      eval_asset_active: socialKinds.includes(kind),
      is_writing: Boolean(command.trim()),
      draft_signal_length: command.length,
    },
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  };
}

function assetFromLocalNode(localNode?: Record<string, any> | null, command = ''): SfiAsset {
  if (!localNode?.localNodeId) return makeDraftAsset(command);
  const signal = command || localNode.declaredObjective || localNode.advancementLoop || 'Nodo local calibrado.';
  const reading = inferOperationalReading({ kind: 'proyecto', signal });
  return {
    asset_id: localNode.localNodeId,
    owner_user_id: 'local',
    target_system: {
      name: localNode.declaredObjective || 'nodo local',
      type: localNode.declaredEntityType || 'usuario',
      source: 'local_landing_calibration',
    },
    objective: {
      declaration: localNode.declaredObjective || reading.nextAction,
      observed_signal: signal,
      dailyActivity: localNode.dailyActivity || '',
      recurrentActivity: localNode.recurrentActivity || '',
      advancementLoop: localNode.advancementLoop || '',
    },
    state_vector: reading.technical,
    current_phase: 'LOCAL_PREVIEW',
    metadata: {
      source: 'local_storage',
      operational_reading: reading,
      inferredPattern: localNode.inferredPattern || null,
      cognitiveTwinUxState: localNode.cognitiveTwinUxState || {},
      paymentState: localNode.paymentState || 'anonymous_local',
    },
    created_at: localNode.createdAt || new Date(0).toISOString(),
    updated_at: localNode.updatedAt || localNode.createdAt || new Date(0).toISOString(),
  };
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `${res.status}`);
  return data;
}

export function SfiFieldShell({
  nodeId,
  assets,
  activeAssetId,
  onAssetsChange,
  onActiveAssetChange,
  persistenceMode = 'supabase',
  localNode,
  paywallLinks,
}: SfiFieldShellProps) {
  const activeAsset = assets.find((asset) => asset.asset_id === activeAssetId) || assets[0] || null;
  const [draftCommand, setDraftCommand] = useState('');
  const [phase, setPhase] = useState(0);
  const [activeCommandNode, setActiveCommandNode] = useState('nodo.usuario.intencion');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [fieldMode, setFieldMode] = useState<FieldMode>('SFI');
  const [bitacora, setBitacora] = useState<BitacoraEntry[]>([]);
  const [amvState, setAmvState] = useState<{ status: string; message?: string; reading?: any }>({ status: 'idle' });
  const [mediaDrafts, setMediaDrafts] = useState<MediaDraft[]>([]);
  const [calendar, setCalendar] = useState<CalendarWindow[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [socialPulse, setSocialPulse] = useState<{ active: boolean; score?: number; platform?: string }>({ active: false });
  const [status, setStatus] = useState('');
  const [worldSpectOpen, setWorldSpectOpen] = useState(false);
  const [socialDraft, setSocialDraft] = useState<SocialDraft | null>(null);
  const [socialDraftOpen, setSocialDraftOpen] = useState(false);
  const [autoSocialReturn, setAutoSocialReturn] = useState<{
    status: 'sin_conexion' | 'conectado_read_only' | 'ultima_lectura' | 'metricas_capturadas';
    provider?: SocialProvider;
    lastSyncAt?: string;
    capturedCount?: number;
  }>({ status: 'sin_conexion' });
  const [runtimeStatus, setRuntimeStatus] = useState<FieldRuntimeStatus>({
    persistence: 'unknown',
    lastEvent: null,
    lastError: null,
    worldSpect: 'sin_lectura',
    social: 'unknown',
    realtime: 'no_habilitado',
    duplicatesBlocked: 0,
    latestPersistedEventAt: null,
  });
  const [latestWorldSnapshot, setLatestWorldSnapshot] = useState<Record<string, unknown> | null>(null);
  const lastGraphEventRef = useRef('');
  const lastWorldSpectEventRef = useRef('');
  const socialDraftCommandRef = useRef('');

  const canPersist = canPersistToSupabase({
    authenticated: Boolean(nodeId),
    licenseActive: persistenceMode === 'supabase',
    paymentActive: persistenceMode === 'supabase',
    crossedAccountPaywall: persistenceMode === 'supabase',
  });
  const fieldAsset = activeAsset || (localNode ? assetFromLocalNode(localNode, draftCommand) : makeDraftAsset(draftCommand));
  const reading = useMemo(() => readingFromAsset(activeAsset || fieldAsset), [activeAsset, fieldAsset]);
  const regime = reading.technical.regime;
  const fieldSurface = useMemo(
    () => resolveFieldSurface({
      sfi_local_node: localNode,
      currentCommand: draftCommand || textFromRecord(fieldAsset.objective, 'observed_signal') || textFromRecord(fieldAsset.objective, 'declaration'),
      selectedFieldMode: fieldMode,
      cognitiveTwinUxState: localNode?.cognitiveTwinUxState,
      activeAssetKind: textFromRecord(fieldAsset.target_system, 'type'),
    }),
    [localNode, draftCommand, fieldAsset, fieldMode],
  );
  const allFieldNodes = useMemo(() => {
    const base = getDefaultFieldNodes();
    if (canPersist) return base;
    const visibleLabels = new Set(fieldSurface.visibleNodeIds);
    const surfaceVisible: FieldOntologyNode[] = surfaceNodes
      .filter((surfaceNode) => visibleLabels.has(surfaceNode.id))
      .map((surfaceNode, index) => ({
        id: `nodo.surface.${surfaceNode.labelVisible.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
        type: 'module' as const,
        label: surfaceNode.labelInternal,
        labelVisible: surfaceNode.labelVisible,
        labelInternal: surfaceNode.labelInternal,
        visibility: 'public_surface' as const,
        surfaceTags: [fieldSurface.intentProfile],
        densityLevel: fieldSurface.density,
        description: `${surfaceNode.labelVisible} disponible en vista local.`,
        commandMode: surfaceNode.commandMode,
        linkedComponents: ['SfiCognitiveField'],
        linkedEndpoints: [],
        linkedSfNodes: [],
        activationConditions: ['nodo local', fieldSurface.intentProfile],
        position: { x: 0.18 + (index % 3) * 0.28, y: 0.3 + Math.floor(index / 3) * 0.26 },
      }));
    return [
      ...base.filter((node) => node.type === 'sf' || node.id === 'nodo.usuario.intencion' || node.id === 'nodo.usuario.friccion_recurrente'),
      ...surfaceVisible,
    ];
  }, [canPersist, fieldSurface]);
  const phaseItems = canPersist ? phases : localPhases;
  const activePatterns = useMemo(
    () => detectFieldPatterns({ asset: activeAsset || fieldAsset, reading, selectedNodeId: selectedNode }),
    [activeAsset, fieldAsset, reading, selectedNode],
  );
  const selectedOntologyNode = useMemo(
    () => allFieldNodes.find((node) => node.id === selectedNode || node.id === activeCommandNode) || null,
    [allFieldNodes, selectedNode, activeCommandNode],
  );
  const rankedPatterns = useMemo(
    () => rankDetectedPatterns({
      candidates: activePatterns,
      activeNode: selectedOntologyNode || activeCommandNode,
      fieldMode,
      nodeVariables: selectedOntologyNode?.variables,
      nodePatterns: selectedOntologyNode?.patterns,
      recentEvents,
    }),
    [activePatterns, selectedOntologyNode, activeCommandNode, fieldMode, recentEvents],
  );
  const visiblePatterns = useMemo(
    () => [
      rankedPatterns.primaryPattern?.pattern,
      ...rankedPatterns.secondaryPatterns.map((item) => item.pattern),
    ].filter((pattern): pattern is NonNullable<typeof pattern> => Boolean(pattern)),
    [rankedPatterns],
  );
  const userSignalVector = useMemo<UserSignalVector>(() => {
    const rawCommand = draftCommand
      || textFromRecord(fieldAsset.objective, 'observed_signal')
      || textFromRecord(fieldAsset.objective, 'declaration')
      || '';
    const matchedTerms = [
      ...(rankedPatterns.primaryPattern?.matchedTerms || []),
      ...rankedPatterns.secondaryPatterns.flatMap((item) => item.matchedTerms),
    ];
    return {
      rawCommand,
      normalizedCommand: normalizeCommand(rawCommand),
      fieldMode,
      activeNodeId: selectedOntologyNode?.id || activeCommandNode || null,
      detectedIntent: detectIntent(rawCommand),
      evidencePresent: Boolean(textFromRecord(fieldAsset.metadata, 'evidence_name')),
      matchedTerms,
      timestamp: new Date().toISOString(),
    };
  }, [draftCommand, fieldAsset, fieldMode, selectedOntologyNode, activeCommandNode, rankedPatterns]);
  const graphVectorState = useMemo(
    () => buildGraphVectorState({
      nodes: allFieldNodes,
      patterns: fieldPatterns,
      rankedPatterns,
      activeNode: selectedOntologyNode || activeCommandNode,
      userSignal: userSignalVector,
    }),
    [allFieldNodes, rankedPatterns, selectedOntologyNode, activeCommandNode, userSignalVector],
  );
  const mihmState = useMemo(() => ({
    IHG: reading.technical.IHG,
    NTI_obs: reading.technical.NTI_obs,
    LDI_hours: reading.technical.LDI_hours,
    PHI_SF: reading.technical.PHI_SF,
    regime: reading.technical.regime,
  }), [reading]);
  const worldSpectDetection = useMemo(
    () => detectWorldSpectTriggers({
      command: userSignalVector.rawCommand,
      activeNode: selectedOntologyNode || activeCommandNode,
      fieldMode,
      rankedPatterns,
      mihmState,
      recentEvents,
    }),
    [userSignalVector.rawCommand, selectedOntologyNode, activeCommandNode, fieldMode, rankedPatterns, mihmState, recentEvents],
  );
  const worldSpectReading = useMemo(() => {
    if (!worldSpectDetection.shouldReadWorldSpect || !worldSpectDetection.primaryTrigger) return null;
    return buildWorldSpectReading({
      trigger: worldSpectDetection.primaryTrigger,
      variables: worldSpectDetection.variables,
      rankedPatterns,
      activeNode: selectedOntologyNode || activeCommandNode,
      intent: userSignalVector.detectedIntent,
      mihmState,
      recentEvents,
    });
  }, [worldSpectDetection, rankedPatterns, selectedOntologyNode, activeCommandNode, userSignalVector.detectedIntent, mihmState, recentEvents]);
  const route = useMemo(
    () => buildLowFrictionRoute({ patterns: visiblePatterns, reading }),
    [visiblePatterns, reading],
  );
  const visibleAmv = (
    rawReading: unknown,
    communicationIntent: 'direct' | 'structured' | 'trace' | 'explanation' | 'overload' | 'disagreement' | 'action' | 'system_status' = 'direct',
    command = userSignalVector.rawCommand,
  ) => formatAmvVisibleResponse({
    rawReading,
    communicationIntent,
    userCommand: command,
    activatedPattern: rankedPatterns.primaryPattern?.pattern || null,
    activatedSurface: selectedOntologyNode?.label || activeCommandNode,
    sourceTrace: (typeof rawReading === 'object' && rawReading ? rawReading as Record<string, unknown> : null),
  }).primaryText;

  const appendBitacora = (
    event_type: BitacoraEventType,
    message: string,
    options?: { node_id?: string; pattern_id?: string; trace_payload?: Record<string, unknown> },
  ) => {
    const entry = makeBitacoraEntry({ event_type, message, ...options });
    setBitacora((current) => [entry, ...current].slice(0, 10));
    setRecentEvents((current) => [
      { event_name: event_type.toLowerCase(), event_type, payload: { fragment: message, pattern_id: options?.pattern_id, trace_payload: options?.trace_payload } },
      ...current,
    ].slice(0, 8));

    if (!canPersist) {
      if (typeof window !== 'undefined') {
        const localEvents = JSON.parse(window.localStorage.getItem('sfi_local_events') || '[]') as unknown[];
        window.localStorage.setItem('sfi_local_events', JSON.stringify([
          { event_type, message, node_id: options?.node_id || null, pattern_id: options?.pattern_id || null, trace_payload: options?.trace_payload || {}, createdAt: new Date().toISOString() },
          ...localEvents,
        ].slice(0, 40)));
      }
      setRuntimeStatus((current) => ({
        ...current,
        persistence: 'local_only',
        lastEvent: event_type,
        latestPersistedEventAt: null,
      }));
      return;
    }

    const node_id = options?.node_id || nodeId || undefined;
    const dedupe = shouldPersistFieldEvent({
      event_type,
      message,
      node_id,
      pattern_id: options?.pattern_id,
      trace_payload: options?.trace_payload,
    });
    if (!dedupe.persist) {
      setRuntimeStatus((current) => ({
        ...current,
        lastEvent: `${event_type} bloqueado`,
        duplicatesBlocked: current.duplicatesBlocked + 1,
      }));
      return;
    }

    void persistFieldEvent({
      event_type,
      message,
      node_id,
      trace_payload: options?.trace_payload,
    }).then((result) => {
      setRuntimeStatus((current) => ({
        ...current,
        persistence: result.mode,
        lastEvent: event_type,
        lastError: result.ok ? null : result.error || null,
        latestPersistedEventAt: result.ok ? new Date().toISOString() : current.latestPersistedEventAt,
      }));
    });
    if (activeAsset?.asset_id) {
      void persistSfiLogbookEvent({
        asset_id: activeAsset.asset_id,
        event_type,
        message,
        trace_payload: options?.trace_payload,
      }).then((result) => {
        if (!result.ok) {
          setRuntimeStatus((current) => ({
            ...current,
            persistence: result.mode,
            lastError: result.error || current.lastError,
          }));
        }
      });
    }
  };

  const sourceTrace = (sourceState: ObservationSourceState, descriptor?: ObservationSourceDescriptor) => {
    const sourceDescriptor = descriptor || createObservationSourceDescriptor({ sourceState });
    return {
      sourceState: sourceDescriptor.sourceState,
      confidence: sourceDescriptor.confidence,
      isExternal: sourceDescriptor.isExternal,
      isSimulated: sourceDescriptor.isSimulated,
      timestamp: sourceDescriptor.timestamp,
      sourceUrl: sourceDescriptor.sourceUrl,
      expiresAt: sourceDescriptor.expiresAt,
    };
  };

  const tracePayloadFromRank = (rank: PatternRankResult, command = '') => ({
    primaryPatternId: rank.primaryPattern?.pattern.id || null,
    secondaryPatternIds: rank.secondaryPatterns.map((item) => item.pattern.id),
    hiddenPatternIds: rank.hiddenPatterns.map((item) => item.pattern.id),
    activationScore: rank.activationScore,
    inputExcerpt: command.slice(0, 180),
    activeNode: selectedOntologyNode?.id || activeCommandNode,
    matchedTerms: [
      ...(rank.primaryPattern?.matchedTerms || []),
      ...rank.secondaryPatterns.flatMap((item) => item.matchedTerms),
    ],
    ...sourceTrace('INTERNAL_PATTERN'),
  });

  const tracePayloadFromWorldSpect = () => ({
    triggerId: worldSpectReading?.triggerId || worldSpectDetection.primaryTrigger?.id || null,
    triggerSymbol: worldSpectReading?.triggerSymbol || worldSpectDetection.primaryTrigger?.symbol || null,
    variables: worldSpectReading?.variables || worldSpectDetection.variables,
    symbols: worldSpectReading?.symbols || worldSpectDetection.variables.map((variable) => worldSpectSymbols[variable]),
    source: worldSpectReading?.source || 'local_context',
    activeNode: selectedOntologyNode?.id || activeCommandNode,
    primaryPatternId: rankedPatterns.primaryPattern?.pattern.id || null,
    ...sourceTrace(worldSpectReading?.sourceState || 'LOCAL_CONTEXT', worldSpectReading?.sourceDescriptor),
  });

  const tracePayloadFromSocialDraft = (draft: SocialDraft, descriptor: ObservationSourceDescriptor = draft.sourceDescriptor) => ({
    draftId: draft.id,
    network: draft.network,
    status: draft.status,
    primaryPatternId: rankedPatterns.primaryPattern?.pattern.id || null,
    ...sourceTrace(descriptor.sourceState, descriptor),
  });

  const tracePayloadFromManualPost = (input: ManualSocialPostInput) => ({
    network: input.network,
    externalPostId: input.externalPostId || null,
    postUrl: input.postUrl || null,
    postedAt: input.postedAt,
    ...sourceTrace('LOCAL_CONTEXT'),
  });

  const tracePayloadFromManualReturn = (input: ManualSocialReturn) => ({
    platform: input.platform,
    postId: input.postId || null,
    resonanceScore: input.resonanceScore ?? null,
    engagement: input.engagement,
    capturedAt: input.capturedAt,
    ...sourceTrace('SOCIAL_RETURN', createObservationSourceDescriptor({
      sourceState: 'SOCIAL_RETURN',
      confidence: 'limited',
      isExternal: true,
      isSimulated: false,
      timestamp: input.capturedAt || new Date().toISOString(),
    })),
  });

  const prepareSocialDraft = async (command: string, commandRank = rankedPatterns) => {
    const cleanCommand = command.trim();
    if (socialDraftCommandRef.current === cleanCommand) return socialDraft;
    socialDraftCommandRef.current = cleanCommand;
    const draft = await createSocialDraft({
      text: cleanCommand,
      objective: reading.nextAction,
    });
    setSocialDraft(draft);
    setSocialDraftOpen(true);
    if (canPersist) {
      void persistSocialDraft({
        node_id: nodeId,
        draft,
        fieldMode,
        primaryPatternId: commandRank.primaryPattern?.pattern.id || null,
        secondaryPatternIds: commandRank.secondaryPatterns.map((item) => item.pattern.id),
      });
    }
    appendBitacora('SOCIAL_DRAFT_CREATED', 'Borrador social creado.', {
      pattern_id: commandRank.primaryPattern?.pattern.id,
      trace_payload: tracePayloadFromSocialDraft(draft),
    });

    const reviewed = await reviewSocialDraft(draft, {
      activeNode: selectedOntologyNode || activeCommandNode,
      fieldMode,
      rankedPatterns: commandRank,
      mihmState,
      recentEvents,
      objective: reading.nextAction,
      evidencePresent: userSignalVector.evidencePresent,
      assetState: mihmState,
    });
    setSocialDraft(reviewed);
    if (canPersist) {
      void persistSocialDraft({
        node_id: nodeId,
        draft: reviewed,
        fieldMode,
        primaryPatternId: commandRank.primaryPattern?.pattern.id || null,
        secondaryPatternIds: commandRank.secondaryPatterns.map((item) => item.pattern.id),
      });
    }
    appendBitacora('SOCIAL_DRAFT_MIHM_REVIEWED', 'Borrador revisado por MIHM.', {
      pattern_id: commandRank.primaryPattern?.pattern.id,
      trace_payload: tracePayloadFromSocialDraft(reviewed, reviewed.mihmReview?.sourceDescriptor),
    });
    if (reviewed.worldSpectReview) {
      appendBitacora('SOCIAL_DRAFT_WORLDSPECT_REVIEWED', 'Borrador revisado por WorldSpect.', {
        pattern_id: commandRank.primaryPattern?.pattern.id,
        trace_payload: tracePayloadFromSocialDraft(reviewed, reviewed.worldSpectReview.sourceDescriptor),
      });
      if (canPersist) setWorldSpectOpen(true);
    }
    setAmvState((current) => ({
      ...current,
      status: 'social_draft',
      message: visibleAmv(reviewed.worldSpectReview?.visibleReading || reviewed.mihmReview?.visibleReading || current.message, 'direct'),
      reading: {
        ...(typeof current.reading === 'object' && current.reading ? current.reading : {}),
        socialDraft: reviewed,
      },
    }));
    return reviewed;
  };

  useEffect(() => {
    const key = [
      graphVectorState.primaryPatternId,
      graphVectorState.secondaryPatternIds.join(','),
      graphVectorState.topActivatedNodeIds.join(','),
      graphVectorState.userSignal.detectedIntent,
      graphVectorState.graphLayoutMode,
    ].join('|');
    if (lastGraphEventRef.current === key) return;
    lastGraphEventRef.current = key;
    appendBitacora('GRAPH_VECTOR_STATE_UPDATED', 'Campo vectorial actualizado.', {
      pattern_id: graphVectorState.primaryPatternId || undefined,
      trace_payload: {
        activeNodeId: graphVectorState.userSignal.activeNodeId,
        primaryPatternId: graphVectorState.primaryPatternId,
        secondaryPatternIds: graphVectorState.secondaryPatternIds,
        topActivatedNodeIds: graphVectorState.topActivatedNodeIds,
        userSignalIntent: graphVectorState.userSignal.detectedIntent,
        graphLayoutMode: graphVectorState.graphLayoutMode,
        ...sourceTrace('VECTOR_MATRIX'),
      },
    });
  }, [
    graphVectorState.primaryPatternId,
    graphVectorState.secondaryPatternIds,
    graphVectorState.topActivatedNodeIds,
    graphVectorState.userSignal.activeNodeId,
    graphVectorState.userSignal.detectedIntent,
    graphVectorState.graphLayoutMode,
  ]);

  useEffect(() => {
    const userTriggeredWorldSpectEnabled = false;
    if (!userTriggeredWorldSpectEnabled) return;
    if (!canPersist) return;
    if (!worldSpectReading || !worldSpectDetection.primaryTrigger) return;
    const key = [
      worldSpectReading.triggerId,
      worldSpectReading.variables.join(','),
      rankedPatterns.primaryPattern?.pattern.id || '',
      selectedOntologyNode?.id || activeCommandNode,
      userSignalVector.rawCommand.slice(0, 80),
    ].join('|');
    if (lastWorldSpectEventRef.current === key) return;
    lastWorldSpectEventRef.current = key;

    appendBitacora('WORLD_SPECT_TRIGGER_DETECTED', worldSpectDetection.primaryTrigger.visibleSummary, {
      pattern_id: rankedPatterns.primaryPattern?.pattern.id,
      trace_payload: tracePayloadFromWorldSpect(),
    });
    appendBitacora('WORLD_SPECT_READING_TRIGGERED', worldSpectReading.summary, {
      pattern_id: rankedPatterns.primaryPattern?.pattern.id,
      trace_payload: tracePayloadFromWorldSpect(),
    });
    if (canPersist) {
      void persistWorldSpectrumSnapshot({
        node_id: nodeId,
        active_node_id: selectedOntologyNode?.id || activeCommandNode,
        reading: {
          ...worldSpectReading,
          ts: worldSpectReading.sourceDescriptor.timestamp,
        },
      }).then((result) => {
        setRuntimeStatus((current) => ({
          ...current,
          persistence: result.mode,
          worldSpect: result.ok ? 'medido' : 'local',
          lastError: result.ok ? current.lastError : result.error || current.lastError,
        }));
      });
    }
    if (worldSpectReading.observationWindow) {
      appendBitacora('OBSERVATION_WINDOW_SUGGESTED', worldSpectReading.observationWindow.visibleSummary, {
        pattern_id: rankedPatterns.primaryPattern?.pattern.id,
        trace_payload: {
          ...tracePayloadFromWorldSpect(),
          options: worldSpectReading.observationWindow.options,
        },
      });
    }
    if (canPersist) setWorldSpectOpen(true);
    setAmvState((current) => ({
      ...current,
      status: current.status === 'idle' ? 'worldspect' : current.status,
      message: visibleAmv(`${worldSpectReading.triggerSummary}. ${worldSpectReading.meaning}. ${worldSpectReading.suggestedAction}.`, 'structured'),
      reading: {
        ...(typeof current.reading === 'object' && current.reading ? current.reading : {}),
        worldspect: worldSpectReading,
      },
    }));
    setRecentEvents((current) => [
      { event_name: 'world_spect_reading_triggered', payload: { fragment: worldSpectReading.summary, triggerId: worldSpectReading.triggerId } },
      ...current,
    ].slice(0, 8));
  }, [
    worldSpectReading,
    worldSpectDetection.primaryTrigger,
    rankedPatterns.primaryPattern?.pattern.id,
    selectedOntologyNode,
    activeCommandNode,
    userSignalVector.rawCommand,
    canPersist,
  ]);

  useEffect(() => {
    if (socialDraft || !userSignalVector.rawCommand.trim()) return;
    if (!hasSocialDraftIntent(userSignalVector.rawCommand)) return;
    if (!worldSpectDetection.activeTriggers.some((trigger) => trigger.id === 'TR_PUBLICATION_INTENT' || trigger.id === 'TR_CAMPAIGN_INTENT')) return;
    void prepareSocialDraft(userSignalVector.rawCommand);
  }, [
    socialDraft,
    userSignalVector.rawCommand,
    worldSpectDetection.activeTriggers,
  ]);

  const refreshLoop = async () => {
    if (!canPersist || !nodeId || !activeAsset) {
      setStatus('vista local');
      return;
    }
    try {
      const context = {
        entity: assetName(activeAsset),
        phenomenon: reading.phenomenon,
        anomalies: [reading.risk.label, reading.latency.label],
        ihg: reading.technical.IHG,
        nti: reading.technical.NTI_obs,
        ldi: reading.technical.LDI_hours / 72,
        xi: reading.technical.xi_noise,
        phi: reading.technical.PHI_SF,
        regime: reading.technical.regime,
      };

      const [amv, bitacora, windows, drafts] = await Promise.all([
        fetchJson('/api/liturgia/amv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            node_id: nodeId,
            session_id: activeAsset.asset_id,
            message: `Leer campo activo: ${reading.nextAction}`,
            context,
          }),
        }),
        fetchJson('/api/bitacora/regenerate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ node_id: nodeId, mode: 'operational', asset_id: activeAsset.asset_id }),
        }),
        fetchJson('/api/calendar/phenomenological', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ node_id: nodeId, horizon_days: 7, asset_id: activeAsset.asset_id }),
        }),
        fetchJson(`/api/media/drafts?node_id=${encodeURIComponent(nodeId)}`, { cache: 'no-store' }),
      ]);

      setAmvState({
        status: amv?.status || 'connected_internal',
        message: visibleAmv(formatFieldAmvReading(visiblePatterns.length ? visiblePatterns : fieldPatterns.slice(2, 3), reading), 'direct'),
        reading: amv?.reading,
      });
      setCalendar(Array.isArray(windows?.windows) ? windows.windows : []);
      setMediaDrafts(Array.isArray(drafts?.drafts) ? drafts.drafts : []);
      setRecentEvents([
        { event_name: 'liturgia_amv_internal_response', payload: { message: amv?.message, reading: amv?.reading } },
        { event_name: 'bitacora_regenerated', payload: { fragment: bitacora?.fragment } },
      ]);
      appendBitacora('PATTERN_RANKED', 'Patron principal seleccionado.', {
        pattern_id: rankedPatterns.primaryPattern?.pattern.id,
        trace_payload: tracePayloadFromRank(rankedPatterns),
      });
      appendBitacora('MIHM_ACTIVATED', 'Estabilidad revisada por el campo.', {
        pattern_id: rankedPatterns.primaryPattern?.pattern.id,
        trace_payload: sourceTrace('MIHM_INTERNAL'),
      });
      setStatus('campo sincronizado');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'field_sync_failed');
    }
  };

  useEffect(() => {
    if (!canPersist) return;
    void refreshLoop();
  }, [nodeId, activeAsset?.asset_id, canPersist]);

  useEffect(() => {
    void fetch('/api/worldspect/global', { cache: 'no-store' })
      .then((res) => res.json())
      .then((result) => {
        if (result?.snapshot) {
          setLatestWorldSnapshot(result.snapshot);
          setRuntimeStatus((current) => ({ ...current, worldSpect: 'medido', persistence: canPersist ? current.persistence : 'local_only' }));
          setRecentEvents((current) => [
            { event_name: 'world_spectrum_snapshot_loaded', payload: { fragment: 'WorldSpect // ultima medicion global disponible', snapshot: result.snapshot } },
            ...current,
          ].slice(0, 8));
          return;
        }
        setRuntimeStatus((current) => ({ ...current, worldSpect: 'sin_lectura', persistence: canPersist ? current.persistence : 'local_only' }));
      })
      .catch(() => setRuntimeStatus((current) => ({ ...current, worldSpect: 'sin_lectura', persistence: canPersist ? current.persistence : 'local_only' })));
  }, [canPersist]);

  useEffect(() => {
    if (!canPersist || !nodeId) return;
    void getLatestWorldSpectrumSnapshot({ nodeId }).then((result: PersistenceResult<Record<string, unknown> | null>) => {
      if (result.ok && result.data) {
        setRuntimeStatus((current) => ({ ...current, persistence: result.mode }));
        setRecentEvents((current) => [
          { event_name: 'world_spectrum_snapshot_loaded', payload: { fragment: 'WorldSpect // ultima lectura medida disponible', snapshot: result.data } },
          ...current,
        ].slice(0, 8));
      } else {
        setRuntimeStatus((current) => ({ ...current, worldSpect: current.worldSpect || 'sin_lectura' }));
      }
    });
  }, [nodeId, worldSpectReading, canPersist]);

  useEffect(() => {
    if (!canPersist || !nodeId) {
      setAutoSocialReturn({ status: 'sin_conexion' });
      setRuntimeStatus((current) => ({ ...current, persistence: 'local_only', social: 'read_only_missing_token' }));
      return;
    }
    void getConnectedSocialSources({ node_id: nodeId }).then((result) => {
      const source = result.data?.sources?.find((item) => item.status === 'connected_read_only');
      if (source) {
        setAutoSocialReturn({
          status: 'conectado_read_only',
          provider: source.provider,
        });
        setRuntimeStatus((current) => ({ ...current, social: 'read_only_ready', persistence: result.mode }));
      } else {
        setAutoSocialReturn({ status: 'sin_conexion' });
        setRuntimeStatus((current) => ({ ...current, social: 'read_only_missing_token', persistence: result.mode }));
      }
    });
  }, [nodeId, canPersist]);

  useEffect(() => {
    if (!canPersist || !nodeId) return;
    void getFieldRuntimeStatus({ node_id: nodeId }).then((result) => {
      if (!result.ok || !result.data) return;
      setRuntimeStatus((current) => ({
        ...current,
        persistence: result.mode,
        latestPersistedEventAt: result.data?.latestPersistedEventAt || current.latestPersistedEventAt,
        worldSpect: result.data?.latestWorldSpectrumSnapshot ? 'medido' : current.worldSpect,
        social: result.data?.latestSocialReturnAt
          ? 'manual_return'
          : result.data?.hasReadOnlyTokens
            ? 'read_only_ready'
            : current.social,
      }));
    });
  }, [nodeId, canPersist]);

  useEffect(() => {
    if (!socialPulse.active) return;
    const timer = window.setTimeout(() => setSocialPulse((current) => ({ ...current, active: false })), 5200);
    return () => window.clearTimeout(timer);
  }, [socialPulse.active, socialPulse.score, socialPulse.platform]);

  const createAssetFromCommand = async (command: string, evidence?: File | null) => {
    if (!command.trim()) return false;
    const kind = kindFromCommand(command);
    const nextReading = inferOperationalReading({ kind, signal: command, evidenceLabel: evidence?.name });
    const targetName = command.split(/\n|\.|\?/)[0].replace(/\s+/g, ' ').trim().slice(0, 72) || `senal ${kind}`;

    if (!canPersist) {
      const today = new Date().toISOString().slice(0, 10);
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem('sfi_local_node') : null;
      const local = stored ? JSON.parse(stored) : {};
      const previewUsage = local.previewUsage || {};
      const nextLocal = {
        ...local,
        localNodeId: local.localNodeId || `SFI-LOCAL-${Date.now().toString(36).toUpperCase()}`,
        createdAt: local.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        declaredObjective: local.declaredObjective || command,
        currentStep: 'field',
        inferredPattern: local.inferredPattern || nextReading.phenomenon,
        cognitiveTwinUxState: {
          ...(local.cognitiveTwinUxState || {}),
          lastLocalCommand: command,
          lastScenario: fieldSurface.intentProfile,
          communicationProfile: updateCommunicationProfile(local.cognitiveTwinUxState?.communicationProfile, command),
        },
        previewUsage: {
          ...previewUsage,
          lastPreviewDate: today,
          basalReadingsUsedToday: previewUsage.lastPreviewDate === today ? Math.min((previewUsage.basalReadingsUsedToday || 0) + 1, 1) : 1,
          auditBriefUsedToday: previewUsage.auditBriefUsedToday || 0,
          simulationBriefUsedToday: previewUsage.simulationBriefUsedToday || 0,
        },
        paymentState: 'anonymous_local',
      };
      window.localStorage.setItem('sfi_local_node', JSON.stringify(nextLocal));
      setDraftCommand(command);
      setStatus('vista local actualizada');
      appendBitacora('PATTERN_DETECTED', 'Nodo local actualizado.', { pattern_id: rankedPatterns.primaryPattern?.pattern.id });
      return true;
    }

    const assetResult = await fetchJson('/api/sfi/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_system: { name: targetName, type: kind, source: 'field_command' },
        objective: { declaration: nextReading.nextAction, observed_signal: command.slice(0, 12000) },
        state_vector: nextReading.technical,
        current_phase: 'SIGNAL_ANALYZED',
        metadata: {
          source: 'field_command',
          signal_kind: kind,
          evidence_name: evidence?.name || null,
          operational_reading: nextReading,
          eval_asset_active: socialKinds.includes(kind),
        },
      }),
    });

    const assetId = assetResult.asset.asset_id;
    await fetchJson(`/api/sfi/assets/${encodeURIComponent(assetId)}/measurements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextReading.technical),
    });

    const list = await fetchJson('/api/sfi/assets', { cache: 'no-store' });
    const nextAssets = Array.isArray(list?.assets) ? list.assets : [assetResult.asset];
    onAssetsChange(nextAssets);
    onActiveAssetChange(assetId);
    setDraftCommand('');
    setPhase(1);
    setActiveCommandNode('nodo.aptymok.amv');
    setRecentEvents([{ event_name: 'asset_created_from_field', payload: { fragment: 'AMV // asset generado desde el campo' } }]);
    appendBitacora('PATTERN_DETECTED', 'Senal convertida en asset activo.', { pattern_id: rankedPatterns.primaryPattern?.pattern.id });
    return true;
  };

const handleCommand = async ({ command, mode, node, evidence }: { command: string; mode: FieldCommandMode; node: FieldOntologyNode | null; evidence?: File | null }) => {
  if (canPersist && nodeId && command.trim()) {
    void declareTerminalSignal({
      nodeId,
      content: command,
      context: {
        fieldMode,
        activeNode: node?.id || null,
        commandMode: mode,
        source: 'SfiFieldShell.handleCommand',
      },
    }).then((result) => {
      setRuntimeStatus((current) => ({
        ...current,
        lastEvent: result.ok ? 'SIGNAL_DECLARED' : current.lastEvent,
        lastError: result.ok ? current.lastError : result.error,
        latestPersistedEventAt: result.ok ? new Date().toISOString() : current.latestPersistedEventAt,
      }));
    });
  }

  if (!canPersist) {
    setDraftCommand(command);
    if (/guardar|memoria|calendario|redes|subir archivo|archivo completo|fuente|conectar|historial|proyecto/i.test(command)) {
      requestContinuity('continuidad');
      return true;
    }
    return createAssetFromCommand(command, evidence);
  }

    if (!activeAsset) {
      setDraftCommand(command);
      if (hasSocialDraftIntent(command)) await prepareSocialDraft(command);
      return createAssetFromCommand(command, evidence);
    }

    if (mode === 'project_manager' && /nueva|nuevo|crear|observar|intervenir/i.test(command)) {
      return createAssetFromCommand(command, evidence);
    }

    const candidates = detectFieldPatterns({ asset: activeAsset, reading, command });
    const commandRank = rankDetectedPatterns({
      candidates,
      command,
      activeNode: node,
      fieldMode,
      nodeVariables: node?.variables,
      nodePatterns: node?.patterns,
      recentEvents,
    });
    const pattern = commandRank.primaryPattern?.pattern;
    if (hasSocialDraftIntent(command)) {
      await prepareSocialDraft(command, commandRank);
    }
    if (pattern) {
      appendBitacora('PATTERN_RANKED', 'Patron principal seleccionado.', {
        node_id: node?.id,
        pattern_id: pattern.id,
        trace_payload: tracePayloadFromRank(commandRank, command),
      });
      appendBitacora('PATTERN_DETECTED', pattern.oracion_visible, { node_id: node?.id, pattern_id: pattern.id });
    }
    appendBitacora('ROUTE_SUGGESTED', route.join(' -> '), {
      node_id: node?.id,
      pattern_id: pattern?.id,
      trace_payload: {
        route,
        ...sourceTrace('LOCAL_CONTEXT'),
      },
    });
    setAmvState((current) => ({
      ...current,
      message: visibleAmv(formatFieldAmvReading([
        ...(pattern ? [pattern] : []),
        ...commandRank.secondaryPatterns.map((item) => item.pattern),
      ], reading), undefined, command),
    }));
    setStatus('campo ejecutando');
    return false;
  };

  const handleModeSuggest = (mode: FieldCommandMode) => {
    const index = mode === 'intervention' ? 2 : mode === 'logbook' || mode === 'calendar' || mode === 'social' ? 3 : mode === 'media' ? 4 : phase;
    setPhase(index);
  };

  const requestContinuity = (reason = 'continuidad') => {
    setAmvState((current) => ({
      ...current,
      status: 'paywall',
      message: reason === 'license'
        ? 'Instrumento bloqueado. La ejecucion longitudinal requiere licencia activa.'
        : 'El nodo local llego a su limite. Para conservar memoria, ejecutar acciones y activar modulos longitudinales, crea una cuenta.',
    }));
    setStatus('continuidad bloqueada');
  };

  const atlasRuntimeSummary = `Persistencia ${runtimeStatus.persistence}. Realtime ${runtimeStatus.realtime.replace('_', ' ')}. WorldSpect ${runtimeStatus.worldSpect}. Social ${runtimeStatus.social}.`;
  const atlasInitialCommand = draftCommand
    || textFromRecord(fieldAsset.objective, 'observed_signal')
    || textFromRecord(fieldAsset.objective, 'declaration')
    || '';
  const paywallFullLink = paywallLinks?.full || '';

  return (
    <AtlasLaboratoryShell
      nodeLabel={activeAsset ? assetName(activeAsset) : textFromRecord(fieldAsset.target_system, 'name') || 'Nodo vivo'}
      intentProfile={fieldSurface.intentProfile}
      localNode={localNode}
      canPersist={canPersist}
      latestWorldSnapshot={latestWorldSnapshot}
      runtimeSummary={atlasRuntimeSummary}
      nextAction={reading.nextAction}
      initialCommand={atlasInitialCommand}
      onCommand={async (command) => {
        const node = selectedOntologyNode || allFieldNodes.find((item) => item.id === activeCommandNode) || null;
        await handleCommand({ command, mode: node?.commandMode || 'amv', node });
      }}
      onWorldSpectCategorySelect={(category, detail) => {
        appendBitacora('WORLD_SPECT_CATEGORY_SELECTED', `WorldSpect ${category} activo.`, {
          trace_payload: detail,
        });
      }}
      onContinuityRequest={() => requestContinuity('continuidad')}
    />
  );

  return (
    <main className="field-shell">
      <header className="field-header">
        <div className="brand">SFI</div>
        <div className="header-state">
          <span>{nodeId ? 'nodo activo' : 'sin nodo'}</span>
          <span>{visibleRegime(regime)}</span>
          <span>{activeAsset ? assetName(activeAsset) : 'campo inicial'}</span>
        </div>
        <div className="field-mode-switch" aria-label="Modo del campo">
          {(['SFI', 'CT', 'NODE_CT'] as FieldMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              className={fieldMode === mode ? 'active' : ''}
              onClick={() => {
                setFieldMode(mode);
                appendBitacora('FIELD_MODE_CHANGED', `Modo ${mode} activo.`);
              }}
            >
              {mode}
            </button>
          ))}
        </div>
        {assets.length > 1 && (
          <select value={activeAsset?.asset_id || ''} onChange={(event) => onActiveAssetChange(event.target.value)}>
            {assets.map((asset) => <option key={asset.asset_id} value={asset.asset_id}>{assetName(asset)}</option>)}
          </select>
        )}
      </header>

      <div className="field-stage">
        <SfiCognitiveField
          asset={fieldAsset}
          nodeId={nodeId}
          phase={phase}
          fullScreen
          amvState={amvState}
          operationalReading={reading}
          recentEvents={recentEvents}
          mediaDrafts={mediaDrafts}
          socialPulse={socialPulse}
          activeCommandNode={activeCommandNode}
          selectedNode={selectedNode}
          fieldMode={fieldMode}
          ghostEvents={bitacora}
          patternRank={{
            primaryPatternId: rankedPatterns.primaryPattern?.pattern.id || null,
            secondaryPatternIds: rankedPatterns.secondaryPatterns.map((item) => item.pattern.id),
          }}
          graphVectorState={graphVectorState}
          sfNodes={allFieldNodes}
          moduleNodes={[]}
          twinNodes={[]}
          onNodeSelect={(node) => {
            setSelectedNode(node?.id || null);
            if (node) {
              setFieldMode('NODE_CT');
              appendBitacora('FIELD_MODE_CHANGED', `Nodo ${node.labelVisible || node.label} observado.`, { node_id: node.id });
            }
          }}
          onNodeTap={(node) => {
            if (node.type === 'module') {
              setActiveCommandNode(node.id);
              if (node.id === 'nodo.aptymok.mihm') {
                appendBitacora('MIHM_ACTIVATED', 'Mide que sostiene o rompe el sistema.', {
                  node_id: node.id,
                  pattern_id: 'mihm_estabilidad',
                  trace_payload: sourceTrace('MIHM_INTERNAL'),
                });
              }
            }
          }}
          onFieldEcho={(echo) => setRecentEvents((current) => [{ event_name: 'field_echo', payload: { fragment: echo } }, ...current].slice(0, 8))}
          onModeSuggest={handleModeSuggest}
          onCommandExecute={handleCommand}
        />

        <WorldSpectPanel
          reading={canPersist ? worldSpectReading : null}
          open={worldSpectOpen}
          latestSnapshot={latestWorldSnapshot}
          onToggle={() => {
            const nextOpen = !worldSpectOpen;
            setWorldSpectOpen(nextOpen);
            if (nextOpen && worldSpectReading) {
              appendBitacora('WORLD_SPECT_PANEL_OPENED', 'WorldSpect abierto.', {
                pattern_id: rankedPatterns.primaryPattern?.pattern.id,
                trace_payload: tracePayloadFromWorldSpect(),
              });
            }
          }}
        />

        <FieldRuntimePanel status={runtimeStatus} />

        {!canPersist && amvState.status === 'paywall' && (
          <aside className="local-boundary">
            <p>El nodo local llego a su limite.</p>
            <span>Para conservar memoria, ejecutar acciones y activar modulos longitudinales, crea una cuenta.</span>
            <div>
              <a href="/login">Crear cuenta</a>
              {paywallFullLink ? <a href={paywallFullLink}>Activar licencia</a> : null}
            </div>
          </aside>
        )}

        <SocialDraftPanel
          draft={socialDraft}
          open={socialDraftOpen}
          onReview={async () => {
            if (!socialDraft) return;
            const reviewed = await reviewSocialDraft(socialDraft, {
              activeNode: selectedOntologyNode || activeCommandNode,
              fieldMode,
              rankedPatterns,
              mihmState,
              recentEvents,
              objective: reading.nextAction,
              evidencePresent: userSignalVector.evidencePresent,
              assetState: mihmState,
            });
            setSocialDraft(reviewed);
            if (canPersist) {
              void persistSocialDraft({
                node_id: nodeId,
                draft: reviewed,
                fieldMode,
                primaryPatternId: rankedPatterns.primaryPattern?.pattern.id || null,
                secondaryPatternIds: rankedPatterns.secondaryPatterns.map((item) => item.pattern.id),
              });
            }
            appendBitacora('SOCIAL_DRAFT_MIHM_REVIEWED', 'Borrador revisado por MIHM.', {
              pattern_id: rankedPatterns.primaryPattern?.pattern.id,
              trace_payload: tracePayloadFromSocialDraft(reviewed, reviewed.mihmReview?.sourceDescriptor),
            });
            if (reviewed.worldSpectReview) {
              appendBitacora('SOCIAL_DRAFT_WORLDSPECT_REVIEWED', 'Borrador revisado por WorldSpect.', {
                pattern_id: rankedPatterns.primaryPattern?.pattern.id,
                trace_payload: tracePayloadFromSocialDraft(reviewed, reviewed.worldSpectReview.sourceDescriptor),
              });
            }
          }}
          onApprove={async () => {
            if (!socialDraft) return;
            const approved = await approveSocialDraftContent(socialDraft);
            setSocialDraft(approved);
            if (canPersist) {
              void persistSocialDraft({
                node_id: nodeId,
                draft: approved,
                fieldMode,
                primaryPatternId: rankedPatterns.primaryPattern?.pattern.id || null,
                secondaryPatternIds: rankedPatterns.secondaryPatterns.map((item) => item.pattern.id),
              });
            }
            appendBitacora('SOCIAL_DRAFT_CONTENT_APPROVED', 'Contenido aprobado por humano.', {
              pattern_id: rankedPatterns.primaryPattern?.pattern.id,
              trace_payload: tracePayloadFromSocialDraft(approved, approved.approval?.sourceDescriptor),
            });
          }}
          onRequestConfirmation={() => {
            if (!socialDraft) return;
            const pending = requestPublicationConfirmation(socialDraft);
            setSocialDraft(pending);
            if (canPersist) {
              void persistSocialDraft({
                node_id: nodeId,
                draft: pending,
                fieldMode,
                primaryPatternId: rankedPatterns.primaryPattern?.pattern.id || null,
                secondaryPatternIds: rankedPatterns.secondaryPatterns.map((item) => item.pattern.id),
              });
            }
            appendBitacora('SOCIAL_DRAFT_CONFIRMATION_REQUIRED', 'Confirmacion requerida. Publicacion real deshabilitada.', {
              pattern_id: rankedPatterns.primaryPattern?.pattern.id,
              trace_payload: tracePayloadFromSocialDraft(pending),
            });
          }}
          onArchive={() => {
            if (!socialDraft) return;
            const archived = archiveSocialDraft(socialDraft);
            setSocialDraft(archived);
            if (canPersist) {
              void persistSocialDraft({
                node_id: nodeId,
                draft: archived,
                fieldMode,
                primaryPatternId: rankedPatterns.primaryPattern?.pattern.id || null,
                secondaryPatternIds: rankedPatterns.secondaryPatterns.map((item) => item.pattern.id),
              });
            }
            appendBitacora('SOCIAL_DRAFT_ARCHIVED', 'Borrador archivado.', {
              pattern_id: rankedPatterns.primaryPattern?.pattern.id,
              trace_payload: tracePayloadFromSocialDraft(archived),
            });
          }}
          onTextChange={async (text) => {
            if (!socialDraft) return;
            const updated = await updateSocialDraftText(socialDraft, text);
            setSocialDraft(updated);
            if (canPersist) {
              void persistSocialDraft({
                node_id: nodeId,
                draft: updated,
                fieldMode,
                primaryPatternId: rankedPatterns.primaryPattern?.pattern.id || null,
                secondaryPatternIds: rankedPatterns.secondaryPatterns.map((item) => item.pattern.id),
              });
            }
          }}
          onRecordManualPost={async (input) => {
            if (!canPersist) {
              requestContinuity('continuidad');
              return;
            }
            const dedupe = shouldPersistManualPost(input);
            const result = await persistManualSocialPost({
              node_id: nodeId,
              network: input.network,
              postUrl: input.postUrl || null,
              text: input.postText,
              postedAt: input.postedAt,
              externalPostId: input.externalPostId || null,
              metadata: {
                draftId: socialDraft?.id,
                source: 'manual_field_capture',
              },
            });
            const duplicate = !dedupe.persist || Boolean((result.data as { duplicate?: boolean } | undefined)?.duplicate);
            setRuntimeStatus((current) => ({
              ...current,
              persistence: result.mode,
              social: 'manual_return',
              lastEvent: duplicate ? 'SOCIAL_MANUAL_POST_RECORDED bloqueado' : 'SOCIAL_MANUAL_POST_RECORDED',
              lastError: result.ok ? null : result.error || current.lastError,
              duplicatesBlocked: duplicate ? current.duplicatesBlocked + 1 : current.duplicatesBlocked,
            }));
            if (duplicate) return;
            appendBitacora('SOCIAL_MANUAL_POST_RECORDED', 'Publicacion manual registrada.', {
              pattern_id: rankedPatterns.primaryPattern?.pattern.id,
              trace_payload: tracePayloadFromManualPost(input),
            });
            setAmvState((current) => ({
              ...current,
              status: 'social_manual_post',
              message: 'La publicacion ya existe. Registra metricas cuando aparezcan.',
            }));
          }}
          onRecordManualReturn={async (input) => {
            if (!canPersist) {
              requestContinuity('continuidad');
              return;
            }
            const dedupe = shouldPersistManualReturn(input);
            const result = await persistManualSocialReturn({
              node_id: nodeId,
              manualReturn: input,
            });
            const duplicate = !dedupe.persist || Boolean((result.data as { duplicate?: boolean } | undefined)?.duplicate);
            setRuntimeStatus((current) => ({
              ...current,
              persistence: result.mode,
              social: 'manual_return',
              lastEvent: duplicate ? 'SOCIAL_RETURN_MANUAL_RECORDED bloqueado' : 'SOCIAL_RETURN_MANUAL_RECORDED',
              lastError: result.ok ? null : result.error || current.lastError,
              duplicatesBlocked: duplicate ? current.duplicatesBlocked + 1 : current.duplicatesBlocked,
            }));
            if (duplicate) return;
            appendBitacora('SOCIAL_RETURN_MANUAL_RECORDED', 'Retorno social manual registrado.', {
              pattern_id: rankedPatterns.primaryPattern?.pattern.id,
              trace_payload: tracePayloadFromManualReturn(input),
            });
            setSocialPulse({ active: true, score: input.resonanceScore, platform: input.platform });
            setAmvState((current) => ({
              ...current,
              status: 'social_return_manual',
              message: 'Hay retorno registrado. Actualiza el nodo social.',
            }));
          }}
          autoReturn={autoSocialReturn}
          onIngestReadOnly={async (provider) => {
            if (!canPersist) {
              requestContinuity('continuidad');
              return;
            }
            const result = await ingestReadOnlySocialMetrics({
              node_id: nodeId,
              asset_id: activeAsset?.asset_id || null,
              provider,
            });
            const ingestion = result.data;
            if (!ingestion?.ok) {
              setAutoSocialReturn({ status: 'sin_conexion', provider });
              setRuntimeStatus((current) => ({
                ...current,
                persistence: result.mode,
                social: 'read_only_missing_token',
                lastError: ingestion?.reason || result.error || current.lastError,
              }));
              setAmvState((current) => ({
                ...current,
                status: 'social_read_only_missing',
                message: 'No hay conexion read-only activa. Conecta una fuente o registra retorno manual.',
              }));
              return;
            }
            setAutoSocialReturn({
              status: ingestion.capturedCount ? 'metricas_capturadas' : 'ultima_lectura',
              provider: ingestion.provider,
              lastSyncAt: ingestion.lastSyncAt,
              capturedCount: ingestion.capturedCount,
            });
            setRuntimeStatus((current) => ({
              ...current,
              persistence: result.mode,
              social: 'captured',
              lastEvent: 'SOCIAL_RETURN_CAPTURED',
              lastError: null,
              latestPersistedEventAt: ingestion.lastSyncAt || new Date().toISOString(),
            }));
            appendBitacora('SOCIAL_RETURN_CAPTURED', 'Retorno automatico read-only capturado.', {
              pattern_id: rankedPatterns.primaryPattern?.pattern.id,
              trace_payload: {
                provider: ingestion.provider,
                capturedCount: ingestion.capturedCount,
                lastSyncAt: ingestion.lastSyncAt,
                sourceState: 'SOCIAL_RETURN',
                captureMode: 'oauth_read_only',
                isSimulated: false,
              },
            });
            setSocialPulse({ active: true, platform: ingestion.provider });
            setAmvState((current) => ({
              ...current,
              status: 'social_return_captured',
              message: 'Hay retorno registrado. Actualiza el nodo social.',
            }));
          }}
        />

        <nav className="mode-rail" aria-label="Estados del campo">
          {phaseItems.map((item, index) => (
            <button
              key={item.label}
              type="button"
              className={phase === index ? 'active' : ''}
              onClick={() => {
                setPhase(index);
                setActiveCommandNode(item.node);
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="field-status">{status || (calendar[0] ? calendar[0].label : 'campo en observacion')}</div>
        <div className="route-strip" aria-label="Ruta sugerida">
          {route.map((item, index) => <span key={`${item}-${index}`}>{index + 1}. {item}</span>)}
        </div>
      </div>

      <style jsx>{`
        .field-shell {
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #060605;
          color: #c8c4b8;
        }
        .field-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 20;
          height: 2.35rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          border-bottom: 1px solid rgba(200,169,81,0.08);
          background: rgba(6,6,5,0.72);
          backdrop-filter: blur(14px);
          padding: 0 0.9rem;
          font-family: var(--font-mono), "JetBrains Mono", monospace;
        }
        .brand {
          color: #C8A951;
          font-size: 0.72rem;
          letter-spacing: 0.22em;
          font-weight: 700;
        }
        .header-state {
          display: flex;
          min-width: 0;
          gap: 0.8rem;
          color: rgba(200,196,184,0.34);
          font-size: 0.48rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .header-state span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        select {
          max-width: 18rem;
          border: 1px solid rgba(200,169,81,0.12);
          background: rgba(6,6,5,0.84);
          color: rgba(200,169,81,0.72);
          padding: 0.35rem 0.45rem;
          font: inherit;
          font-size: 0.5rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .field-mode-switch {
          margin-left: auto;
          display: flex;
          gap: 0.25rem;
        }
        .field-mode-switch button {
          border: 1px solid rgba(200,169,81,0.11);
          background: rgba(6,6,5,0.42);
          color: rgba(200,196,184,0.32);
          padding: 0.28rem 0.4rem;
          font: inherit;
          font-size: 0.45rem;
          letter-spacing: 0.14em;
          cursor: pointer;
        }
        .field-mode-switch button.active {
          color: #C8A951;
          border-color: rgba(200,169,81,0.28);
          background: rgba(200,169,81,0.06);
        }
        .field-stage {
          position: fixed;
          inset: 0;
          padding-top: 2.35rem;
        }
        .mode-rail {
          position: absolute;
          left: 0.9rem;
          top: 3.2rem;
          z-index: 6;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          pointer-events: auto;
        }
        .mode-rail button {
          border: 1px solid rgba(200,169,81,0.09);
          background: rgba(6,6,5,0.42);
          color: rgba(200,196,184,0.28);
          backdrop-filter: blur(10px);
          padding: 0.35rem 0.45rem;
          font-family: var(--font-mono), "JetBrains Mono", monospace;
          font-size: 0.43rem;
          letter-spacing: 0.16em;
          text-align: left;
          cursor: pointer;
        }
        .mode-rail button.active {
          border-color: rgba(200,169,81,0.28);
          color: #C8A951;
          background: rgba(200,169,81,0.06);
        }
        .field-status {
          position: absolute;
          right: 1rem;
          bottom: 5.65rem;
          z-index: 5;
          color: rgba(200,196,184,0.26);
          font-family: var(--font-mono), "JetBrains Mono", monospace;
          font-size: 0.5rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .local-boundary {
          position: absolute;
          left: 1rem;
          bottom: 6rem;
          z-index: 8;
          width: min(24rem, calc(100vw - 2rem));
          border: 1px solid rgba(200,169,81,0.12);
          background: rgba(6,6,5,0.58);
          backdrop-filter: blur(14px);
          padding: 0.72rem;
          font-family: var(--font-mono), "JetBrains Mono", monospace;
          pointer-events: auto;
        }
        .local-boundary p {
          margin: 0;
          color: rgba(200,169,81,0.82);
          font-size: 0.58rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .local-boundary span {
          display: block;
          margin-top: 0.35rem;
          color: rgba(200,196,184,0.48);
          font-size: 0.52rem;
          line-height: 1.5;
        }
        .local-boundary div {
          display: flex;
          gap: 0.45rem;
          margin-top: 0.55rem;
        }
        .local-boundary a {
          border: 1px solid rgba(200,169,81,0.18);
          color: rgba(200,169,81,0.82);
          padding: 0.38rem 0.5rem;
          text-decoration: none;
          font-size: 0.48rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .route-strip {
          position: absolute;
          left: 1rem;
          right: 1rem;
          bottom: 4.45rem;
          z-index: 5;
          display: flex;
          justify-content: center;
          gap: 0.6rem;
          color: rgba(200,196,184,0.3);
          font-family: var(--font-mono), "JetBrains Mono", monospace;
          font-size: 0.48rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          pointer-events: none;
        }
        .route-strip span {
          border: 1px solid rgba(200,169,81,0.08);
          background: rgba(6,6,5,0.35);
          padding: 0.28rem 0.42rem;
        }
        @media (max-width: 760px) {
          .header-state span:nth-child(3),
          select,
          .field-mode-switch {
            display: none;
          }
          .route-strip {
            display: none;
          }
          .mode-rail {
            right: 0.9rem;
            left: auto;
            flex-direction: row;
            flex-wrap: wrap;
            max-width: calc(100vw - 1.8rem);
          }
        }
      `}</style>
    </main>
  );
}
