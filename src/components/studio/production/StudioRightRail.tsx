import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';

function value(value: number | null, suffix = '') {
  return value === null ? 'SIN DATO' : `${value.toFixed(2)}${suffix}`;
}

export function StudioRightRail({ state }: { state: StudioProductionState }) {
  const hypotheses = state.hypotheses?.hypotheses.slice(0, 4) ?? [];

  return (
    <aside className="sfi-production__right-rail">
      <section>
        <span>WSV / CULTURAL LENS</span>
        <strong>{value(state.culturalLens?.confidence ?? null)}</strong>
        <p>{state.culturalLens?.interpretation ?? 'CULTURAL_LENS_UNAVAILABLE'}</p>
      </section>
      <section>
        <span>MIHM REPORT</span>
        <strong>{value(state.mihmReport.score)}</strong>
        <p>{state.mihmReport.source}</p>
      </section>
      <section>
        <span>HYPOTHESES</span>
        {hypotheses.length ? hypotheses.map((item) => (
          <a key={item.id} href="/api/studio/hypotheses/build">
            <b>{item.severity.toUpperCase()}</b>
            <p>{item.statement}</p>
          </a>
        )) : <p>BLOCKED_UNTIL_OBJECT_FEATURES_EXIST</p>}
      </section>
      <section>
        <span>INTERVENTIONS</span>
        {state.interventions.length ? state.interventions.map((item) => (
          <a key={item.id} href="/api/studio/interventions/simulate">
            <b>{item.state.toUpperCase()}</b>
            <p>{item.title}</p>
          </a>
        )) : <p>NO_VERIFIED_INTERVENTION_QUEUE</p>}
      </section>
    </aside>
  );
}
