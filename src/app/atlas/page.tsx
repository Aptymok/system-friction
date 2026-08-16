import { SfiCinematicSurface, type SfiCinematicInsight, type SfiCinematicNode, type SfiCinematicRelation, type SfiCinematicStat, type SfiCinematicTimelineItem } from '@/components/sfi/cinematic/SfiCinematicSurface';
import { readInstitutionalViewState } from '@/lib/sfi/institutionalViewState';

export const dynamic = 'force-dynamic';

function metric(value: number | null, digits = 3) {
  return value === null ? 'NO_VALUE' : value.toFixed(digits);
}

export default async function AtlasPage() {
  const state = await readInstitutionalViewState({ entityId: 'atlas', entityType: 'ORGANIZATION', label: 'Atlas institucional' });

  const nodes: SfiCinematicNode[] = state.graph.nodes.map((node, index) => ({
    id: node.id,
    label: node.label,
    type: node.ontologyType,
    status: 'CANONICAL GRAPH',
    tone: 'GOVERNED',
    selected: index === 0,
  }));
  const relations: SfiCinematicRelation[] = state.graph.edges.map((edge) => ({
    id: edge.id,
    sourceId: edge.source,
    targetId: edge.target,
    label: edge.relation,
    tone: 'GOVERNED',
    strength: null,
  }));
  const insights: SfiCinematicInsight[] = [
    ...state.entityContext.entitySummary.slice(0, 5).map((statement, index) => ({ id: `context:${index}`, tone: 'GOVERNED' as const, statement })),
    { id: 'friction-summary', tone: 'DERIVED', statement: state.friction.summary },
    { id: 'attractor-summary', tone: 'DERIVED', statement: state.attractor.summary },
    ...state.metrics.warnings.slice(0, 4).map((statement, index) => ({ id: `warning:${index}`, tone: 'MISSING' as const, statement })),
  ];
  const timeline: SfiCinematicTimelineItem[] = [
    ...state.entityContext.timeline.map((item, index) => ({ id: `context-time:${index}`, at: null, label: `${item.step} · ${item.value}`, type: 'ENTITY CONTEXT', tone: 'GOVERNED' as const })),
    ...state.ledger.map((item) => ({
      id: `${item.kind}:${item.identity}`,
      at: item.createdAt,
      label: item.title,
      type: item.kind.toUpperCase(),
      tone: item.kind === 'prediction' ? 'PROJECTED' as const : item.kind === 'evidence' ? 'OBSERVED' as const : 'GOVERNED' as const,
    })),
  ].slice(0, 20);
  const evidenceStats: SfiCinematicStat[] = [
    { label: 'EVIDENCE', value: String(state.metrics.evidenceCount), detail: 'Latest institutional evidence rows surfaced by the current read model.', tone: 'OBSERVED' },
    { label: 'MEMORY', value: String(state.metrics.memoryCount), detail: 'Persisted institutional memory rows surfaced by the current read model.', tone: 'GOVERNED' },
    { label: 'PREDICTIONS', value: String(state.metrics.predictionCount), detail: 'Projected entries remain distinct from observations.', tone: 'PROJECTED' },
  ];
  const mihmStats: SfiCinematicStat[] = [
    { label: 'Φ_SFI', value: metric(state.metrics.phiSfi), detail: state.metrics.status, tone: state.metrics.phiSfi === null ? 'MISSING' : 'DERIVED' },
    { label: 'F_S', value: metric(state.metrics.fS), detail: 'Canonical institutional friction complement when available.', tone: state.metrics.fS === null ? 'MISSING' : 'DERIVED' },
    { label: 'C_FIELD', value: metric(state.metrics.cField), detail: 'Calculated from current institutional MIHM inputs.', tone: state.metrics.cField === null ? 'MISSING' : 'DERIVED' },
    { label: 'Ψ_MOP-H', value: 'NO_VALUE', detail: 'MOP-H remains session-scoped and is not aggregated into institutional state.', tone: 'MISSING' },
  ];
  const frictionStats: SfiCinematicStat[] = [
    { label: 'TOP FRICTION', value: state.friction.topFriction.toFixed(3), detail: state.friction.summary, tone: 'DERIVED' },
    ...state.friction.nodes.slice(0, 3).map((node) => ({ label: node.label, value: node.value.toFixed(3), detail: node.id, tone: 'DERIVED' as const })),
  ];
  const regimeStats: SfiCinematicStat[] = [
    { label: 'REGIME', value: state.metrics.regime ?? 'MISSING', detail: state.metrics.status, tone: state.metrics.regime ? 'DERIVED' : 'MISSING' },
    { label: 'GRAPH', value: `${state.metrics.graphNodeCount} / ${state.metrics.graphEdgeCount}`, detail: 'canonical nodes / relations', tone: 'GOVERNED' },
    { label: 'ATTRACTOR DISTANCE', value: state.attractor.attractorDistance.toFixed(3), detail: 'Derived attractor scorecard; not an observation.', tone: 'DERIVED' },
  ];

  return (
    <SfiCinematicSurface
      brand="SFI ATLAS"
      subtitle="INSTITUTIONAL RELATIONAL + TEMPORAL MEMORY"
      crumbs={[
        { label: 'SCOPE', value: 'INSTITUTIONAL', tone: 'accent' },
        { label: 'ENTITY', value: state.entityContext.entityId },
        { label: 'GRAPH', value: `${state.metrics.graphNodeCount}N · ${state.metrics.graphEdgeCount}R` },
        { label: 'STATE', value: state.metrics.status },
      ]}
      integrity={state.metrics.status}
      artifactId={state.entityContext.entityId}
      certificateState="INSTITUTIONAL READ MODEL"
      mode="LONGITUDINAL ATLAS"
      nodes={nodes}
      relations={relations}
      fieldLabel="CANONICAL ENTITY FIELD"
      fieldDetail="Atlas reads the institutional graph, ledger, MIHM state, friction field and attractor scorecard. Geometry is navigational; it does not manufacture relation strength or causality."
      insights={insights}
      timeline={timeline}
      evidenceStats={evidenceStats}
      mihmStats={mihmStats}
      frictionStats={frictionStats}
      regimeStats={regimeStats}
      returnStats={[
        { label: 'LEDGER EVENTS', value: String(state.ledger.length), detail: 'Latest evidence, prediction and memory entries available to this view.', tone: 'GOVERNED' },
        { label: 'CANONICAL WRITE', value: 'NO', detail: 'This surface is read-only.', tone: 'GOVERNED' },
      ]}
      actions={[]}
      commands={[]}
      footer={<><span>ATLAS = MEMORY / RELATION / TRAJECTORY · NOT ROOT AUTHORITY</span><span>GRAPH PRESENCE ≠ CAUSALITY · PROJECTION ≠ OBSERVATION</span></>}
    />
  );
}
