import {
  SfiCinematicSurface,
  type SfiCinematicStat,
} from '@/components/sfi/cinematic/SfiCinematicSurface';
import { readInstitutionalViewState } from '@/lib/sfi/institutionalViewState';

export const dynamic = 'force-dynamic';

export default async function MophPage() {
  const state = await readInstitutionalViewState({ entityId: 'moph', entityType: 'STATE', label: 'MOP-H scope boundary' });
  const mihmStats: SfiCinematicStat[] = [
    { label: 'Ψ_MOP-H', value: 'NO_VALUE', detail: 'MOP-H is session/object scoped. No institutional value is persisted in the current canonical read model.', tone: 'MISSING' },
    { label: 'Φ_SFI', value: state.metrics.phiSfi === null ? 'NO_VALUE' : state.metrics.phiSfi.toFixed(3), detail: 'Institutional context only; it is not a substitute for Ψ_MOP-H.', tone: state.metrics.phiSfi === null ? 'MISSING' : 'DERIVED' },
    { label: 'REGIME', value: state.metrics.regime ?? 'MISSING', detail: 'Institutional regime shown only as surrounding context.', tone: state.metrics.regime ? 'DERIVED' : 'MISSING' },
  ];

  return (
    <SfiCinematicSurface
      brand="SFI · MOP-H"
      subtitle="SESSION-SCOPED FIELD / OPPORTUNITY MODEL"
      crumbs={[
        { label: 'SCOPE', value: 'SESSION / OBJECT', tone: 'accent' },
        { label: 'INSTITUTIONAL VALUE', value: 'NOT PROMOTED' },
        { label: 'STATE', value: state.metrics.status },
      ]}
      integrity={state.metrics.status}
      artifactId="moph"
      certificateState="BOUNDARY VIEW"
      mode="FAIL CLOSED"
      nodes={[]}
      relations={[]}
      fieldLabel="NO ACTIVE MOP-H SESSION IN THIS ROUTE"
      fieldDetail="This route no longer evaluates the canonical formula with demonstration constants. A Ψ_MOP-H value must originate in a declared session/object input envelope and preserve its lineage."
      insights={[
        { id: 'scope', tone: 'GOVERNED', statement: 'MOP-H remains session/object scoped and is not aggregated into institutional truth by this view.' },
        { id: 'missing', tone: 'MISSING', statement: 'No persisted session-scoped MOP-H result is supplied to this route, so Ψ_MOP-H remains NO_VALUE.' },
      ]}
      timeline={[]}
      evidenceStats={[
        { label: 'SESSION EVIDENCE', value: 'NO_VALUE', detail: 'Open FIELD or STUDIO within an active object/session to create evidence-bound analysis.', tone: 'MISSING' },
      ]}
      mihmStats={mihmStats}
      frictionStats={[
        { label: 'FRICTION INPUT', value: 'NO_VALUE', detail: 'No session input envelope is bound to this route.', tone: 'MISSING' },
      ]}
      regimeStats={[
        { label: 'INSTITUTIONAL REGIME', value: state.metrics.regime ?? 'MISSING', detail: 'Context only.', tone: state.metrics.regime ? 'DERIVED' : 'MISSING' },
      ]}
      returnStats={[
        { label: 'FORMULA DEMO', value: 'REMOVED', detail: 'No production UI value is calculated from hard-coded example inputs.', tone: 'GOVERNED' },
        { label: 'CANONICAL WRITE', value: 'NO', detail: 'Read/boundary surface only.', tone: 'GOVERNED' },
      ]}
      actions={[]}
      commands={[]}
      footer={<><span>Ψ_MOP-H REQUIRES A REAL SESSION INPUT ENVELOPE</span><span>DEMONSTRATION CONSTANTS ≠ OBSERVED OR DERIVED STATE</span></>}
    />
  );
}
