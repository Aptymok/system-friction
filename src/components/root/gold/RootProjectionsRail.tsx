'use client';

import { CheckCircle2, Circle } from 'lucide-react';
import { useState } from 'react';
import type { RootGovernanceState } from '@/lib/root/gold/rootGovernanceState';

function pct(value: number | null) {
  return value === null ? 'NULL' : value.toFixed(2);
}

export function RootProjectionsRail({ state }: { state: RootGovernanceState }) {
  const [tab, setTab] = useState<'hipotesis' | 'calibracion'>('hipotesis');
  return (
    <aside className="sfi-root-gold__right-rail">
      <section className="sfi-root-gold__panel">
        <div className="sfi-root-gold__panel-title"><h2>PROYECCIONES</h2><span>{tab.toUpperCase()}</span></div>
        <div className="sfi-root-gold__tabs">
          <button className={tab === 'hipotesis' ? 'active' : ''} onClick={() => setTab('hipotesis')}>HIPOTESIS</button>
          <button className={tab === 'calibracion' ? 'active' : ''} onClick={() => setTab('calibracion')}>CALIBRACION</button>
        </div>
        {tab === 'hipotesis' ? (
          <div className="sfi-root-gold__projection-list">
            {state.projections.activeHypotheses.length ? state.projections.activeHypotheses.map((item) => (
              <div key={item.id}><span>{item.id}</span><em>{item.label}</em><strong>{pct(item.probability)}</strong></div>
            )) : <p className="sfi-root-gold__empty">SOURCE_UNAVAILABLE</p>}
          </div>
        ) : (
          <div className="sfi-root-gold__projection-list">
            {state.projections.recentCalibrations.length ? state.projections.recentCalibrations.map((item) => (
              <div key={item.id}><span>{item.completed ? <CheckCircle2 size={13} /> : <Circle size={13} />}</span><em>{item.label}</em><strong>{item.time.slice(0, 10)}</strong></div>
            )) : <p className="sfi-root-gold__empty">SOURCE_UNAVAILABLE</p>}
          </div>
        )}
      </section>
      <section className="sfi-root-gold__panel sfi-root-gold__provenance">
        <div className="sfi-root-gold__panel-title"><h2>PROVENIENCIA</h2><span>{state.provenance.degradedSources.length ? 'DEGRADED' : 'LIVE'}</span></div>
        <p>{state.provenance.basedOn.slice(0, 5).join(' / ')}</p>
        {state.provenance.limits.slice(0, 4).map((limit) => <p key={limit}>LIMIT: {limit}</p>)}
      </section>
    </aside>
  );
}
