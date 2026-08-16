import type { InstitutionalViewState } from '@/lib/sfi/institutionalViewState';
import {
  SfiCinematicSurface,
  type SfiCinematicInsight,
  type SfiCinematicNode,
  type SfiCinematicRelation,
  type SfiCinematicStat,
  type SfiCinematicTimelineItem,
} from './SfiCinematicSurface';

export type InstitutionalCinematicFocus = 'SFI' | 'MIHM' | 'FRICTION' | 'LEDGER';

function metric(value: number | null, digits = 3) {
  return value === null ? 'NO_VALUE' : value.toFixed(digits);
}

function ledgerTone(kind: InstitutionalViewState['ledger'][number]['kind']) {
  if (kind === 'evidence') return 'OBSERVED' as const;
  if (kind === 'prediction') return 'PROJECTED' as const;
  return 'GOVERNED' as const;
}

function fieldForFocus(state: InstitutionalViewState, focus: InstitutionalCinematicFocus): { nodes: SfiCinematicNode[]; relations: SfiCinematicRelation[]; label: string; detail: string } {
  if (focus === 'FRICTION') {
    return {
      nodes: state.friction.nodes.map((node, index) => ({
        id: node.id,
        label: node.label,
        type: 'FRICTION PROXY',
        value: node.value.toFixed(3),
        tone: 'DERIVED',
        selected: index === 0,
      })),
      relations: [],
      label: 'INSTITUTIONAL FRICTION FIELD',
      detail: 'Displayed magnitudes come from the current friction-field read model. No relation, direction or causal mechanism is invented when the model does not persist one.',
    };
  }

  if (focus === 'LEDGER') {
    return {
      nodes: state.ledger.map((item, index) => ({
        id: `${item.kind}:${item.identity}`,
        label: item.title,
        type: item.kind.toUpperCase(),
        status: item.createdAt,
        tone: ledgerTone(item.kind),
        selected: index === 0,
      })),
      relations: [],
      label: 'INSTITUTIONAL LEDGER WINDOW',
      detail: 'The ledger preserves evidence, projection and institutional memory as distinct objects. Absence of a displayed relation does not imply independence.',
    };
  }

  return {
    nodes: state.graph.nodes.map((node, index) => ({
      id: node.id,
      label: node.label,
      type: node.ontologyType,
      status: 'CANONICAL GRAPH',
      tone: 'GOVERNED',
      selected: index === 0,
    })),
    relations: state.graph.edges.map((edge) => ({
      id: edge.id,
      sourceId: edge.source,
      targetId: edge.target,
      label: edge.relation,
      tone: 'GOVERNED',
      strength: null,
    })),
    label: focus === 'MIHM' ? 'MIHM INSTITUTIONAL CONTEXT' : 'SFI INSTITUTIONAL FIELD',
    detail: focus === 'MIHM'
      ? 'MIHM variables are read from the current institutional state. Φ families remain instrument-scoped and are never averaged into a decorative composite.'
      : 'Current canonical graph, institutional state, friction read model and ledger are rendered without granting this view execution or truth authority.',
  };
}

export function InstitutionalCinematicView({
  state,
  focus,
  brand,
  subtitle,
}: {
  state: InstitutionalViewState;
  focus: InstitutionalCinematicFocus;
  brand: string;
  subtitle: string;
}) {
  const field = fieldForFocus(state, focus);
  const insights: SfiCinematicInsight[] = [
    ...state.entityContext.entitySummary.slice(0, 4).map((statement, index) => ({ id: `context:${index}`, tone: 'GOVERNED' as const, statement })),
    { id: 'friction', tone: 'DERIVED', statement: state.friction.summary },
    { id: 'attractor', tone: 'DERIVED', statement: state.attractor.summary },
    ...state.metrics.warnings.slice(0, 5).map((statement, index) => ({ id: `warning:${index}`, tone: 'MISSING' as const, statement })),
  ];
  const timeline: SfiCinematicTimelineItem[] = [
    ...state.ledger.map((item) => ({ id: `${item.kind}:${item.identity}`, at: item.createdAt, label: item.title, type: item.kind.toUpperCase(), tone: ledgerTone(item.kind) })),
    ...state.entityContext.timeline.map((item, index) => ({ id: `context:${index}`, at: null, label: `${item.step} · ${item.value}`, type: 'ENTITY CONTEXT', tone: 'GOVERNED' as const })),
  ];
  const evidenceStats: SfiCinematicStat[] = [
    { label: 'EVIDENCE', value: String(state.metrics.evidenceCount), detail: 'Rows surfaced by the bounded institutional evidence read.', tone: 'OBSERVED' },
    { label: 'PREDICTIONS', value: String(state.metrics.predictionCount), detail: 'Projected entries remain distinct from observations.', tone: 'PROJECTED' },
    { label: 'MEMORY', value: String(state.metrics.memoryCount), detail: 'Persisted institutional memory surfaced by the current view.', tone: 'GOVERNED' },
  ];
  const mihmStats: SfiCinematicStat[] = [
    { label: 'Φ_SFI', value: metric(state.metrics.phiSfi), detail: state.metrics.status, tone: state.metrics.phiSfi === null ? 'MISSING' : 'DERIVED' },
    { label: 'F_S', value: metric(state.metrics.fS), detail: 'Canonical institutional complement when available.', tone: state.metrics.fS === null ? 'MISSING' : 'DERIVED' },
    { label: 'C_FIELD', value: metric(state.metrics.cField), detail: 'Calculated only from available institutional MIHM inputs.', tone: state.metrics.cField === null ? 'MISSING' : 'DERIVED' },
    { label: 'Ψ_MOP-H', value: 'NO_VALUE', detail: 'Session-scoped MOP-H is not promoted into institutional state.', tone: 'MISSING' },
  ];
  const frictionStats: SfiCinematicStat[] = [
    { label: 'TOP FRICTION', value: state.friction.topFriction.toFixed(3), detail: state.friction.summary, tone: 'DERIVED' },
    ...state.friction.nodes.slice(0, 4).map((node) => ({ label: node.label, value: node.value.toFixed(3), detail: node.id, tone: 'DERIVED' as const })),
  ];
  const regimeStats: SfiCinematicStat[] = [
    { label: 'REGIME', value: state.metrics.regime ?? 'MISSING', detail: state.metrics.status, tone: state.metrics.regime ? 'DERIVED' : 'MISSING' },
    { label: 'GRAPH', value: `${state.metrics.graphNodeCount} / ${state.metrics.graphEdgeCount}`, detail: 'canonical nodes / relations', tone: 'GOVERNED' },
    { label: 'ATTRACTOR DISTANCE', value: state.attractor.attractorDistance.toFixed(3), detail: 'Derived scorecard, not direct observation.', tone: 'DERIVED' },
  ];
  const returnStats: SfiCinematicStat[] = [
    { label: 'LEDGER WINDOW', value: String(state.ledger.length), detail: 'Latest surfaced institutional entries.', tone: 'GOVERNED' },
    { label: 'CANONICAL WRITE', value: 'NO', detail: 'Human read surface only.', tone: 'GOVERNED' },
    { label: 'TRUTH AUTHORITY', value: 'NO', detail: 'Governance remains separate from truth.', tone: 'GOVERNED' },
  ];

  return (
    <SfiCinematicSurface
      brand={brand}
      subtitle={subtitle}
      crumbs={[
        { label: 'SCOPE', value: 'INSTITUTIONAL', tone: 'accent' },
        { label: 'FOCUS', value: focus },
        { label: 'STATE', value: state.metrics.status },
        { label: 'REGIME', value: state.metrics.regime ?? 'MISSING' },
      ]}
      integrity={state.metrics.status}
      artifactId={state.entityContext.entityId}
      certificateState="INSTITUTIONAL READ MODEL"
      mode={focus}
      nodes={field.nodes}
      relations={field.relations}
      fieldLabel={field.label}
      fieldDetail={field.detail}
      insights={insights}
      timeline={timeline}
      evidenceStats={evidenceStats}
      mihmStats={mihmStats}
      frictionStats={frictionStats}
      regimeStats={regimeStats}
      returnStats={returnStats}
      actions={[]}
      commands={[]}
      footer={<><span>READ SURFACE · NO AUTOMATIC CANONICAL MUTATION</span><span>RECORD ≠ EVIDENCE · PROJECTION ≠ OBSERVATION · GOVERNANCE ≠ TRUTH</span></>}
    />
  );
}
