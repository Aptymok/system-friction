'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { StudioFieldViewState } from '@/lib/studio/field/studioFieldViewTypes';
import type { MetricValue, StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import {
  SfiCinematicSurface,
  type SfiCinematicInsight,
  type SfiCinematicNode,
  type SfiCinematicRelation,
  type SfiCinematicStat,
  type SfiCinematicTimelineItem,
  type SfiEpistemicTone,
} from '@/components/sfi/cinematic/SfiCinematicSurface';
import { StudioDirectIngestion } from './StudioDirectIngestion';

function toneFromMetric(metric: MetricValue): SfiEpistemicTone {
  const status = String(metric.status).toUpperCase();
  if (status === 'OBSERVED') return 'OBSERVED';
  if (status === 'DERIVED' || status === 'CALIBRATED') return 'DERIVED';
  if (status.includes('MISSING') || status.includes('REQUIRES') || status.includes('INSUFFICIENT')) return 'MISSING';
  if (status.includes('FAILED') || status.includes('DEGRADED')) return 'CONTRADICTED';
  return 'GOVERNED';
}

function toneFromEpistemic(value: unknown): SfiEpistemicTone {
  const normalized = String(value ?? '').toUpperCase();
  if (normalized === 'OBSERVED') return 'OBSERVED';
  if (normalized === 'DERIVED') return 'DERIVED';
  if (normalized === 'INFERENCE' || normalized === 'INFERRED') return 'INFERRED';
  if (normalized === 'PROJECTED') return 'PROJECTED';
  if (normalized === 'SIMULATED') return 'SIMULATED';
  if (normalized.includes('CONTRAD')) return 'CONTRADICTED';
  if (normalized.includes('MISSING')) return 'MISSING';
  return 'GOVERNED';
}

function valueText(value: number | string | null | undefined, unit?: string | null) {
  if (value === null || value === undefined || value === '') return '—';
  const rendered = typeof value === 'number' ? Number(value.toFixed(3)).toString() : String(value);
  return unit ? `${rendered} ${unit}` : rendered;
}

function eventTone(type: string): SfiEpistemicTone {
  const value = type.toUpperCase();
  if (value.includes('HYPOTHESIS')) return 'INFERRED';
  if (value.includes('INTERVENTION')) return 'GOVERNED';
  if (value.includes('ANALYSIS')) return 'DERIVED';
  if (value.includes('EVIDENCE') || value.includes('UPLOADED') || value.includes('CREATED')) return 'OBSERVED';
  return 'GOVERNED';
}

function latestProject(fieldState: StudioFieldViewState) {
  return fieldState.field.nodes.find((node) => node.kind === 'project') ?? null;
}

function parentNode(fieldState: StudioFieldViewState, objectId: string | null) {
  if (!objectId) return null;
  const object = fieldState.objects.find((item) => item.id === objectId);
  if (!object?.fieldNodeId) return null;
  return fieldState.field.nodes.find((node) => node.id === object.fieldNodeId) ?? null;
}

export function StudioCinematicWorkspace({ state, fieldState, identity }: { state: StudioProductionState; fieldState: StudioFieldViewState; identity: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const activeObjectId = state.activeObject.id;
  const activeParent = parentNode(fieldState, activeObjectId);
  const project = activeParent?.kind === 'project' ? activeParent : latestProject(fieldState);

  const nodes = useMemo<SfiCinematicNode[]>(() => {
    const result: SfiCinematicNode[] = [];
    if (fieldState.field.attractor) result.push({ id: fieldState.field.attractor.id, label: fieldState.field.attractor.label, type: 'ATTRACTOR', tone: 'INFERRED', status: 'DECLARED' });
    for (const node of fieldState.field.nodes) result.push({ id: node.id, label: node.label, type: node.kind.toUpperCase(), tone: 'GOVERNED', status: node.parentId ? 'RELATED' : 'ROOT' });
    for (const object of fieldState.objects) result.push({ id: `object:${object.id}`, label: object.title, type: object.modality?.toUpperCase() || 'OBJECT', tone: object.id === activeObjectId ? 'OBSERVED' : 'DERIVED', status: object.status, selected: object.id === activeObjectId, parentId: object.fieldNodeId });
    return result;
  }, [fieldState, activeObjectId]);

  const relations = useMemo<SfiCinematicRelation[]>(() => {
    const result = fieldState.field.edges.map((edge) => ({ id: edge.id, sourceId: edge.sourceId, targetId: edge.targetId, label: edge.relationType, tone: edge.relationType === 'INFLUENCES' ? 'INFERRED' as const : 'GOVERNED' as const, strength: null }));
    for (const object of fieldState.objects) {
      const source = object.fieldNodeId ?? fieldState.field.attractor?.id;
      if (source) result.push({ id: `contains:${object.id}`, sourceId: source, targetId: `object:${object.id}`, label: 'CONTAINS', tone: 'GOVERNED', strength: null });
    }
    return result;
  }, [fieldState]);

  const timeline = useMemo<SfiCinematicTimelineItem[]>(() => fieldState.timeline.map((event) => ({ id: event.id, at: event.at, label: event.label, type: event.type, tone: eventTone(event.type) })), [fieldState.timeline]);

  const evidenceStats = useMemo<SfiCinematicStat[]>(() => {
    const observed = state.metricValues.filter((metric) => toneFromMetric(metric) === 'OBSERVED').length;
    const derived = state.metricValues.filter((metric) => toneFromMetric(metric) === 'DERIVED').length;
    const missing = state.metricValues.filter((metric) => toneFromMetric(metric) === 'MISSING').length;
    return [
      { label: 'EVIDENCE REFS', value: String(state.evidence.length), tone: 'OBSERVED' },
      { label: 'OBSERVED METRICS', value: String(observed), tone: 'OBSERVED' },
      { label: 'DERIVED METRICS', value: String(derived), tone: 'DERIVED' },
      { label: 'UNRESOLVED', value: String(missing), tone: missing ? 'MISSING' : 'GOVERNED' },
      { label: 'SOURCE HEALTH', value: state.degradedSources.length ? 'DEGRADED' : 'NOMINAL', detail: state.degradedSources.slice(0, 2).join(' · ') || null, tone: state.degradedSources.length ? 'CONTRADICTED' : 'GOVERNED' },
    ];
  }, [state]);

  const mihmStats = useMemo<SfiCinematicStat[]>(() => {
    const source = state.mihmReport;
    const values: Array<[string, number | null]> = [['SCORE', source.score], ['INDIVIDUAL', source.individual], ['GROUP', source.group], ['INSTITUTIONAL', source.institutional], ['SYSTEMIC', source.systemic], ['CIVILIZATIONAL', source.civilizational]];
    return values.map(([label, value]) => ({ label, value: value === null ? '—' : value.toFixed(3), detail: value === null ? 'NO VALUE' : source.source, tone: value === null ? 'MISSING' : 'DERIVED' }));
  }, [state.mihmReport]);

  const frictionStats = useMemo<SfiCinematicStat[]>(() => {
    const communityFriction = state.communityFeatures.friction;
    const contradictionCount = state.metricValues.filter((metric) => String(metric.status).toUpperCase().includes('FAILED') || String(metric.status).toUpperCase().includes('DEGRADED')).length;
    return [
      { label: 'COMMUNITY FRICTION', value: communityFriction === null ? '—' : communityFriction.toFixed(3), detail: communityFriction === null ? 'NO GROUNDED VALUE' : 'community feature', tone: communityFriction === null ? 'MISSING' : 'DERIVED' },
      { label: 'CONTRADICTIONS / FAILURES', value: String(contradictionCount), tone: contradictionCount ? 'CONTRADICTED' : 'GOVERNED' },
      { label: 'DIMENSION EXCHANGE', value: '—', detail: 'NO FORMAL EXCHANGE CONTRACT RESULT', tone: 'MISSING' },
    ];
  }, [state]);

  const regimeStats = useMemo<SfiCinematicStat[]>(() => [
    { label: 'TRAJECTORY EVENTS', value: String(fieldState.timeline.length), tone: fieldState.timeline.length ? 'OBSERVED' : 'MISSING' },
    { label: 'REGIME STATE', value: 'UNRESOLVED', detail: 'No persisted regime assessment', tone: 'MISSING' },
    { label: 'ATTRACTOR', value: fieldState.field.attractor ? 'DECLARED' : 'MISSING', detail: fieldState.field.attractor?.label ?? null, tone: fieldState.field.attractor ? 'INFERRED' : 'MISSING' },
    { label: 'WORLD VECTOR', value: fieldState.world?.status?.toUpperCase() ?? 'UNAVAILABLE', detail: fieldState.world?.dominant_signal ?? null, tone: fieldState.world ? 'DERIVED' : 'MISSING' },
  ], [fieldState]);

  const returnStats = useMemo<SfiCinematicStat[]>(() => [
    { label: 'ARTIFACT ID', value: activeObjectId ?? 'NO OBJECT', tone: activeObjectId ? 'GOVERNED' : 'MISSING' },
    { label: 'MOPS CERTIFICATE', value: 'NOT ISSUED', detail: 'Certificate requires Artifact Identity record', tone: 'MISSING' },
    { label: 'ARCHIVE EVENTS', value: String(state.archive.events.length), tone: state.archive.events.length ? 'OBSERVED' : 'MISSING' },
    { label: 'EXPORT READINESS', value: state.exports.signoffReadiness.toUpperCase(), tone: state.exports.signoffReadiness === 'ready' ? 'GOVERNED' : 'MISSING' },
  ], [state, activeObjectId]);

  const insights = useMemo<SfiCinematicInsight[]>(() => {
    const result: SfiCinematicInsight[] = [];
    for (const metric of state.metricValues.slice(0, 28)) {
      if (metric.value === null || metric.value === undefined) continue;
      result.push({ id: `metric:${metric.key}`, tone: toneFromMetric(metric), statement: `${metric.label}: ${valueText(metric.value, metric.unit)}.`, evidenceCount: metric.evidenceIds.length, at: metric.observedAt ?? null });
    }
    for (const suggestion of state.suggestions.slice(0, 8)) result.push({ id: `suggestion:${suggestion.id}`, tone: 'INFERRED', statement: suggestion.suggestion, evidenceCount: suggestion.evidenceRequired.length, at: suggestion.createdAt });
    for (const intervention of state.interventions.slice(0, 5)) result.push({ id: `intervention:${intervention.id}`, tone: intervention.state === 'complete' ? 'GOVERNED' : 'PROJECTED', statement: `${intervention.title} · ${intervention.state.toUpperCase()}.`, evidenceCount: 0 });
    return result;
  }, [state]);

  async function cognitive(action: 'analyze' | 'generate_hypothesis' | 'verify') {
    if (!activeObjectId || busy) return;
    setBusy(action); setMessage(null);
    try {
      const response = await fetch(`/api/studio/objects/${encodeURIComponent(activeObjectId)}/cognitive`, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.ok === false) throw new Error(String(body?.details ?? body?.error ?? `HTTP ${response.status}`));
      setMessage(String(body?.result?.summary ?? `${action} complete`));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally { setBusy(null); }
  }

  function action(id: string) {
    if (id === 'observe') void cognitive('analyze');
    else if (id === 'propose') void cognitive('generate_hypothesis');
    else if (id === 'trace') void cognitive('verify');
    else if (id === 'simulate') setMessage('La simulación se envía a Method Lab cuando exista un protocolo y datos de entrada declarados.');
    else if (id === 'certify') setMessage('MOPS Certification permanece bloqueado hasta existir un SFI Artifact Identity persistido.');
    else setMessage(`${id.toUpperCase()} preparado sobre el scope activo; no se ejecutó ninguna acción externa.`);
  }

  function command(value: string) {
    const normalized = value.toLowerCase();
    if (normalized.includes('hipótesis') || normalized.includes('propón') || normalized.includes('propon')) void cognitive('generate_hypothesis');
    else if (normalized.includes('verifica') || normalized.includes('traza')) void cognitive('verify');
    else if (normalized.includes('analiza') || normalized.includes('observa')) void cognitive('analyze');
    else setMessage(`Comando registrado sobre ${state.activeObject.title}; requiere un adaptador de acción explícito para ejecutar: ${value}`);
  }

  const crumbs = [
    { label: 'ATTRACTOR', value: fieldState.field.attractor?.label ?? 'DEFINE ATTRACTOR', tone: fieldState.field.attractor ? 'default' as const : 'muted' as const },
    { label: 'PROJECT', value: project?.label ?? 'DEFINE PROJECT', tone: project ? 'default' as const : 'muted' as const },
    { label: 'NODE', value: activeParent?.label ?? 'DEFINE NODE', tone: activeParent ? 'default' as const : 'muted' as const },
    { label: 'OBJECT', value: state.activeObject.title || 'LOAD OBJECT', tone: activeObjectId ? 'accent' as const : 'muted' as const },
    { label: 'MANIFESTATION', value: 'NO MANIFESTATION', tone: 'muted' as const },
  ];

  return (
    <SfiCinematicSurface
      brand="SFI STUDIO"
      subtitle={`SYSTEM FRICTION INSTITUTE · ${identity.split('@')[0].toUpperCase()}`}
      crumbs={crumbs}
      timeWindow={state.session.updatedAt ? new Date(state.session.updatedAt).toLocaleDateString('es-MX') : 'CURRENT'}
      integrity={state.archive.integrity.toUpperCase()}
      artifactId={activeObjectId ?? null}
      certificateState="NOT ISSUED"
      mode="ANALYSIS"
      generatedAt={state.generatedAt}
      nodes={nodes}
      relations={relations}
      fieldLabel={activeObjectId ? `${state.activeObject.title} · MULTISCALE FIELD` : fieldState.session?.title ?? 'STUDIO FIELD'}
      fieldDetail={`${nodes.length} scopes/objects · ${relations.length} persisted relations`}
      insights={insights}
      timeline={timeline}
      evidenceStats={evidenceStats}
      mihmStats={mihmStats}
      frictionStats={frictionStats}
      regimeStats={regimeStats}
      returnStats={returnStats}
      commands={['analiza el objeto activo', 'traza lineage', 'genera hipótesis', 'contrasta con el nodo', 'envía prueba a Method Lab', 'prepara MOPS']}
      actions={[
        { id: 'observe', label: busy === 'analyze' ? 'RUNNING' : 'OBSERVE', disabled: !activeObjectId || Boolean(busy) },
        { id: 'contrast', label: 'CONTRAST' },
        { id: 'trace', label: busy === 'verify' ? 'RUNNING' : 'TRACE', disabled: !activeObjectId || Boolean(busy) },
        { id: 'simulate', label: 'LAB' },
        { id: 'propose', label: busy === 'generate_hypothesis' ? 'RUNNING' : 'PROPOSE', disabled: !activeObjectId || Boolean(busy) },
        { id: 'certify', label: 'CERTIFY' },
      ]}
      onAction={action}
      onCommand={command}
      onNodeSelect={(nodeId) => {
        if (!nodeId.startsWith('object:')) return;
        const objectId = nodeId.slice('object:'.length);
        if (objectId && objectId !== activeObjectId) window.location.assign(`/studio?objectId=${encodeURIComponent(objectId)}`);
      }}
      toolbar={<>
        <button type="button" onClick={() => router.refresh()}>REFRESH</button>
        <a href="/method-lab" className="sfi-cine-link">METHOD LAB</a>
      </>}
      fieldOverlay={<div className="sfi-cine-overlay-card"><StudioDirectIngestion sessionId={fieldState.session?.id ?? null} fieldNodeId={activeParent?.id ?? project?.id ?? null} compact />{message ? <p>{message}</p> : null}</div>}
      footer={<><span>OBJECT → EVIDENCE → MODEL → PROJECTION → GOVERNED RETURN</span><span>ROOT WRITE: NO · CT READ: BOUNDED · LAB RESULT: SIMULATED</span></>}
    />
  );
}
