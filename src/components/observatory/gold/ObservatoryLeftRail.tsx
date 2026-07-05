import type { ObservatoryGoldState } from '@/lib/observatory/gold/observatoryGoldState';

function dec(value: number) {
  return value.toFixed(2);
}

function Spark({ value, tension }: { value: number; tension: number }) {
  const points = Array.from({ length: 28 }, (_, index) => {
    const x = (index / 27) * 138;
    const wave = Math.sin(index * 0.7 + tension * 4) * (7 + tension * 13);
    const y = 28 - value * 18 + wave;
    return `${x.toFixed(1)},${Math.max(4, Math.min(48, y)).toFixed(1)}`;
  }).join(' ');
  return <svg viewBox="0 0 138 52" className="sfi-observatory-gold__spark"><polyline points={points} /></svg>;
}

export function ObservatoryLeftRail({ state }: { state: ObservatoryGoldState }) {
  return (
    <aside className="sfi-observatory-gold__left-rail">
      <section className="sfi-observatory-gold__panel sfi-observatory-gold__wsv-panel">
        <div className="sfi-observatory-gold__panel-title"><h2>WORLD SPECTRUM VECTOR</h2><span>WSV</span></div>
        <div className="sfi-observatory-gold__wsv-readout">
          <div><span>WSV</span><strong>{dec(state.wsv.globalIndex)}</strong><em>/1.00</em></div>
          <Spark value={state.wsv.globalIndex} tension={state.wsv.tension} />
        </div>
        <div className="sfi-observatory-gold__quad">
          <span>COHERENCIA <strong>{dec(state.wsv.coherence)}</strong></span>
          <span>RESILIENCIA <strong>{dec(state.wsv.resilience)}</strong></span>
          <span>ALINEACION <strong>{dec(state.wsv.alignment)}</strong></span>
          <span>TENSION <strong>{dec(state.wsv.tension)}</strong></span>
        </div>
      </section>

      <section className="sfi-observatory-gold__panel sfi-observatory-gold__meaning">
        <h2>{state.explanation.title}</h2>
        <p>{state.explanation.body}</p>
        {state.explanation.methodologyAvailable
          ? <a className="sfi-observatory-gold__panel-link" href="/world-vector">VER METODOLOGIA COMPLETA</a>
          : <button type="button" disabled>METODOLOGIA NO DISPONIBLE</button>}
      </section>

      <section className="sfi-observatory-gold__panel">
        <div className="sfi-observatory-gold__panel-title"><h2>SENALES DESTACADAS</h2><span>TOP 5</span></div>
        <div className="sfi-observatory-gold__signal-list">
          {state.highlightedSignals.length ? state.highlightedSignals.slice(0, 5).map((signal, index) => (
            <div key={`${signal.time}-${signal.label}-${index}`}>
              <span>{signal.time}</span>
              <em>{signal.label}</em>
              <strong>{signal.domain.toUpperCase()}</strong>
            </div>
          )) : <p className="sfi-observatory-gold__empty">SOURCE_UNAVAILABLE</p>}
        </div>
      </section>
    </aside>
  );
}
