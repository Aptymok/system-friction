import type { StudioGoldState } from '@/lib/studio/gold/studioGoldState';

const intensityLabel = {
  low: 'BAJA',
  medium: 'MEDIA',
  high: 'ALTA',
};

const trendGlyph = {
  up: '↑',
  down: '↓',
  stable: '→',
};

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function metric(value: number) {
  return value.toFixed(2);
}

export function StudioLeftRail({ state }: { state: StudioGoldState }) {
  return (
    <aside className="sfi-studio-gold__left-rail">
      <section className="sfi-studio-gold__panel sfi-studio-gold__active-case">
        <div className="sfi-studio-gold__panel-title">
          <h2>CASO ACTIVO</h2>
          <button type="button">VER TODOS</button>
        </div>
        <p className="sfi-studio-gold__eyebrow">{state.activeCase.id ?? 'SIN ID OPERATIVO'}</p>
        <h3>{state.activeCase.title}</h3>
        <div className="sfi-studio-gold__case-meta">
          <span>ID: {state.activeCase.id ?? 'N/A'}</span>
          <span>FASE: {state.activeCase.phase}</span>
        </div>
        <div className="sfi-studio-gold__case-stats">
          <div><strong>{pct(state.activeCase.progress)}</strong><span>PROGRESO</span></div>
          <div><strong>{state.activeCase.signals}</strong><span>SENALES</span></div>
          <div><strong>{state.activeCase.activeDays}</strong><span>DIAS ACTIVOS</span></div>
        </div>
        <div className="sfi-studio-gold__hypothesis">
          <span>HIPOTESIS CENTRAL</span>
          <p>{state.activeCase.hypothesis}</p>
        </div>
      </section>

      <section className="sfi-studio-gold__panel">
        <div className="sfi-studio-gold__panel-title">
          <h2>OBSERVABLES CLAVE</h2>
          <button type="button">VER TODOS</button>
        </div>
        <div className="sfi-studio-gold__list">
          {state.keyObservables.length ? state.keyObservables.map((item) => (
            <div className="sfi-studio-gold__row" key={item.id}>
              <span>{item.id}</span>
              <em>{item.label}</em>
              <strong>{metric(item.value)}</strong>
            </div>
          )) : <p className="sfi-studio-gold__empty">Sin observables activos.</p>}
        </div>
      </section>

      <section className="sfi-studio-gold__panel sfi-studio-gold__signals">
        <div className="sfi-studio-gold__panel-title">
          <h2>SENALES PERSISTENTES</h2>
          <button type="button">VER TODOS</button>
        </div>
        <div className="sfi-studio-gold__list">
          {state.persistentSignals.length ? state.persistentSignals.map((signal) => (
            <div className="sfi-studio-gold__row" key={signal.id}>
              <span>{signal.id}</span>
              <em>{signal.label}</em>
              <strong>{intensityLabel[signal.intensity]} {trendGlyph[signal.trend ?? 'stable']}</strong>
            </div>
          )) : <p className="sfi-studio-gold__empty">Sin senales persistentes confirmadas.</p>}
        </div>
        <div className="sfi-studio-gold__total">
          <span>TOTAL ACTIVAS</span>
          <strong>{state.persistentSignals.length}</strong>
        </div>
      </section>
    </aside>
  );
}
