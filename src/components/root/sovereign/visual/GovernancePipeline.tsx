import type { RootRow } from '@/lib/root/sovereign/rootSovereignState';

const STATES = ['draft', 'proposed', 'accepted', 'prepared', 'executed', 'blocked'];

export function GovernancePipeline({ proposals, unavailable = false }: { proposals: RootRow[]; unavailable?: boolean }) {
  try {
    return (
      <div className="rs-pipeline" aria-label="Proposal pipeline">
        {STATES.map((state) => {
          const count = proposals.filter((proposal) => String(proposal.status ?? 'draft').toLowerCase() === state).length;
          return (
            <div key={state}>
              <span>{state.toUpperCase()}</span>
              <strong>{unavailable ? '—' : count}</strong>
            </div>
          );
        })}
      </div>
    );
  } catch (error) {
    console.error('[GovernancePipeline] Error:', error);
    return <div className="rs-pipeline text-red-500">Error al cargar el pipeline de gobernanza</div>;
  }
}