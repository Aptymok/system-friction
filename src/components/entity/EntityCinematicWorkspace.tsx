import Link from 'next/link';
import type { EntityContext } from '@/core/contracts';
import {
  SfiCinematicSurface,
  type SfiCinematicInsight,
  type SfiCinematicNode,
  type SfiCinematicRelation,
  type SfiCinematicStat,
  type SfiCinematicTimelineItem,
  type SfiEpistemicTone,
} from '@/components/sfi/cinematic/SfiCinematicSurface';
import type { EntityViewReadResult } from '@/lib/entity/readEntityContextView';

function toneForSourceType(sourceType: string): SfiEpistemicTone {
  if (/observation/i.test(sourceType)) return 'OBSERVED';
  if (/prediction/i.test(sourceType)) return 'PROJECTED';
  if (/simulation/i.test(sourceType)) return 'SIMULATED';
  return 'GOVERNED';
}

function uniqueRelatedIds(context: EntityContext) {
  const ids = new Set<string>();
  for (const relation of context.relationships) {
    if (relation.sourceId !== context.entity.entityId) ids.add(relation.sourceId);
    if (relation.targetId !== context.entity.entityId) ids.add(relation.targetId);
  }
  return [...ids];
}

function entityNodes(context: EntityContext): SfiCinematicNode[] {
  const related = uniqueRelatedIds(context);
  return [
    {
      id: context.entity.entityId,
      label: context.entity.label,
      type: context.entity.type,
      status: context.entity.sourceTable ?? 'INSTITUTIONAL ENTITY',
      value: typeof context.entity.confidence === 'number' ? `conf ${context.entity.confidence.toFixed(3)}` : null,
      tone: 'GOVERNED',
      selected: true,
    },
    ...related.slice(0, 28).map((id) => ({
      id,
      label: id,
      type: 'RELATED ENTITY',
      status: 'ONTOLOGY RESOLVED',
      tone: 'DERIVED' as const,
    })),
  ];
}

function entityRelations(context: EntityContext): SfiCinematicRelation[] {
  return context.relationships.slice(0, 80).map((relation, index) => ({
    id: `${relation.sourceId}:${relation.relationType}:${relation.targetId}:${index}`,
    sourceId: relation.sourceId,
    targetId: relation.targetId,
    label: relation.relationType,
    tone: 'DERIVED',
    strength: Number.isFinite(relation.weight) ? relation.weight : null,
  }));
}

function entityInsights(context: EntityContext): SfiCinematicInsight[] {
  return [
    ...context.observations.slice(0, 5).map((item) => ({ id: `obs:${item.id}`, tone: 'OBSERVED' as const, statement: `Observation · ${item.source}`, evidenceCount: 0, at: item.observedAt })),
    ...context.evidence.slice(0, 5).map((item) => ({ id: `evidence:${item.id}`, tone: 'GOVERNED' as const, statement: `Evidence assessment · ${item.assessment}`, evidenceCount: item.observationIds.length, at: item.createdAt })),
    ...context.predictions.slice(0, 5).map((item, index) => ({ id: `prediction:${item.id ?? index}`, tone: 'PROJECTED' as const, statement: item.statement, evidenceCount: item.verification?.evidenceIds.length ?? 0, at: item.verification?.verifiedAt ?? null })),
    ...context.decisions.slice(0, 4).map((item) => ({ id: `decision:${item.id}`, tone: 'GOVERNED' as const, statement: `${item.decision} · ${item.reason}`, at: item.timestamp })),
    ...context.limitations.slice(0, 6).map((item, index) => ({ id: `limit:${index}:${item.code}`, tone: item.severity === 'ERROR' ? 'CONTRADICTED' as const : 'MISSING' as const, statement: `${item.code} · ${item.message}` })),
  ];
}

function entityTimeline(context: EntityContext): SfiCinematicTimelineItem[] {
  return context.trajectory.timeline.map((point, index) => ({
    id: `${point.sourceType}:${point.sourceEntityId}:${index}`,
    at: point.timestamp,
    label: point.sourceEntityId,
    type: point.sourceType,
    tone: toneForSourceType(point.sourceType),
  }));
}

export function EntityCinematicWorkspace({
  result,
}: {
  result: Extract<EntityViewReadResult, { ok: true }>['result'];
}) {
  const context = result.context!;
  const evidenceStats: SfiCinematicStat[] = [
    { label: 'OBSERVATIONS', value: String(context.observations.length), detail: 'Direct observation records linked to the entity.', tone: 'OBSERVED' },
    { label: 'EVIDENCE', value: String(context.evidence.length), detail: 'Evidence assessments remain distinct from observations.', tone: 'GOVERNED' },
    { label: 'PREDICTIONS', value: String(context.predictions.length), detail: 'Projected statements; verification is shown only when linked.', tone: 'PROJECTED' },
    { label: 'MEMORY', value: String(context.memory.length), detail: 'Institutional memory linked by the entity resolver.', tone: 'GOVERNED' },
  ];
  const mihmStats: SfiCinematicStat[] = [
    { label: 'Φ_SFI', value: 'NO_VALUE', detail: 'Entity context does not inherit institutional MIHM state automatically.', tone: 'MISSING' },
    { label: 'ENTITY CONF.', value: typeof context.entity.confidence === 'number' ? context.entity.confidence.toFixed(3) : 'NO_VALUE', detail: 'Resolver confidence when explicitly available.', tone: typeof context.entity.confidence === 'number' ? 'DERIVED' : 'MISSING' },
    { label: 'CONTEXT COVERAGE', value: result.contextCompleteness.score.toFixed(3), detail: `${result.contextCompleteness.sectionsPresent.length}/${result.contextCompleteness.sectionsApplicable.length} applicable sections`, tone: 'DERIVED' },
  ];
  const frictionStats: SfiCinematicStat[] = [
    { label: 'FRICTION', value: 'NO_VALUE', detail: 'No entity-local friction is inferred from graph density or missing relations.', tone: 'MISSING' },
    { label: 'RELATIONS', value: String(context.relationships.length), detail: 'Ontology-valid relations from configured sources.', tone: 'DERIVED' },
    { label: 'REJECTED ONTOLOGY', value: String(result.ontologyViolationsRejected), detail: 'Rejected during context materialization.', tone: result.ontologyViolationsRejected ? 'CONTRADICTED' : 'GOVERNED' },
  ];
  const regimeStats: SfiCinematicStat[] = [
    { label: 'TRAJECTORY', value: context.trajectory.status, detail: context.trajectory.trajectoryKind ?? 'institutional_record_timeline', tone: context.trajectory.status === 'OPERATIONAL' ? 'DERIVED' : 'MISSING' },
    { label: 'VELOCITY', value: Number.isFinite(context.trajectory.velocity) ? `${context.trajectory.velocity.toFixed(3)} ${context.trajectory.velocityUnit}` : 'NO_VALUE', detail: context.trajectory.projectionMethod, tone: Number.isFinite(context.trajectory.velocity) ? 'DERIVED' : 'MISSING' },
    { label: 'GOVERNANCE', value: context.governance.status, detail: `${context.governance.decisions.length} decisions`, tone: 'GOVERNED' },
  ];
  const returnStats: SfiCinematicStat[] = [
    { label: 'PROVENANCE', value: String(context.provenance.length), detail: 'Source bindings used by the current entity read.', tone: 'GOVERNED' },
    { label: 'LIMITATIONS', value: String(context.limitations.length), detail: 'Explicit read limitations.', tone: context.limitations.length ? 'MISSING' : 'GOVERNED' },
    { label: 'CANONICAL WRITE', value: 'NO', detail: 'Entity page is an internal observation surface.', tone: 'GOVERNED' },
  ];

  return (
    <SfiCinematicSurface
      brand="SFI ENTITY"
      subtitle="INTERNAL ENTITY CONTEXT · RELATION · TRAJECTORY"
      crumbs={[
        { label: 'TYPE', value: context.entity.type, tone: 'accent' },
        { label: 'ENTITY', value: context.entity.entityId },
        { label: 'RESOLVER', value: result.resolverUsed ?? 'NONE' },
        { label: 'STATUS', value: context.trajectory.status },
      ]}
      integrity={context.trajectory.status}
      artifactId={context.entity.entityId}
      certificateState="ENTITY CONTEXT READ"
      mode="INTERNAL OBSERVATION"
      generatedAt={result.generatedAt}
      nodes={entityNodes(context)}
      relations={entityRelations(context)}
      fieldLabel={context.entity.label}
      fieldDetail="Relations are rendered from the ontology-valid entity context. Relation weight is a stored/derived graph value; it is not promoted to causal strength."
      insights={entityInsights(context)}
      timeline={entityTimeline(context)}
      evidenceStats={evidenceStats}
      mihmStats={mihmStats}
      frictionStats={frictionStats}
      regimeStats={regimeStats}
      returnStats={returnStats}
      actions={[]}
      commands={[]}
      toolbar={<Link className="sfi-cine-link" href="/atlas">ATLAS</Link>}
      footer={<><span>FOUNDER / AUTHORIZED INTERNAL READ</span><span>RELATION ≠ CAUSALITY · EVIDENCE ≠ OBSERVATION · VIEW ≠ CANONICAL WRITE</span></>}
    />
  );
}

export function EntityCinematicFailure({ id, result }: { id: string; result: EntityViewReadResult }) {
  const failure = result.ok
    ? {
        code: 'CONTEXT_UNAVAILABLE',
        status: 500,
        message: 'The entity resolver returned a successful envelope without a materializable context. No narrative reconstruction is produced.',
        result: result.result,
      }
    : result;
  const correctedType = failure.result?.resolvedEntityType ?? null;
  return (
    <SfiCinematicSurface
      brand="SFI ENTITY"
      subtitle="INTERNAL ENTITY CONTEXT"
      crumbs={[
        { label: 'ENTITY', value: id, tone: 'accent' },
        { label: 'STATUS', value: failure.code },
        { label: 'HTTP', value: String(failure.status) },
      ]}
      integrity="BLOCKED"
      artifactId={id}
      certificateState="NO CONTEXT"
      mode="FAIL CLOSED"
      generatedAt={failure.result?.generatedAt ?? null}
      nodes={[]}
      relations={[]}
      fieldLabel="ENTITY CONTEXT UNAVAILABLE"
      fieldDetail="No narrative reconstruction is produced when identity, authorization, ontology resolution or context materialization fails."
      insights={[{ id: 'failure', tone: failure.code === 'TYPE_MISMATCH' ? 'CONTRADICTED' : 'MISSING', statement: failure.message }]}
      timeline={[]}
      evidenceStats={[{ label: 'SOURCES', value: String(failure.result?.sourcesConsulted.length ?? 0), tone: 'GOVERNED' }]}
      mihmStats={[{ label: 'Φ_SFI', value: 'NO_VALUE', detail: 'Unavailable entity context is not backfilled from institutional state.', tone: 'MISSING' }]}
      frictionStats={[]}
      regimeStats={[{ label: 'ENTITY TYPE', value: correctedType ?? 'UNRESOLVED', tone: correctedType ? 'CONTRADICTED' : 'MISSING' }]}
      returnStats={[{ label: 'CANONICAL WRITE', value: 'NO', tone: 'GOVERNED' }]}
      actions={[]}
      commands={[]}
      fieldOverlay={correctedType ? <div className="sfi-case-notice"><span>TYPE MISMATCH</span><p>The resolver found {correctedType}. Open the corrected context without mutating the original record.</p><Link className="sfi-cine-link" href={`/entity/${encodeURIComponent(id)}?entityType=${encodeURIComponent(correctedType)}`}>OPEN {correctedType}</Link></div> : null}
      footer={<><span>FAIL CLOSED · NO CONTEXT FABRICATION</span><span>TYPE HINT ≠ RESOLVED ONTOLOGY</span></>}
    />
  );
}
