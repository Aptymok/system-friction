import { Menu } from 'lucide-react';
import type { ObservatoryGoldState } from '@/lib/observatory/gold/observatoryGoldState';
import { WorldTensionMapRenderer } from './visual/WorldTensionMapRenderer';

function dec(value: number) {
  return value.toFixed(2);
}

export function ObservatoryMobileConsole({ state, playing }: { state: ObservatoryGoldState; playing: boolean }) {
  const readingUrl = state.dailyReading.fullReadingUrl ?? '/world-vector';

  return (
    <div className="sfi-observatory-gold__mobile-console">
      <header className="sfi-observatory-gold__mobile-header">
        <div><span>SFI / OBSERVATORY</span><strong>OBSERVATORY</strong></div>
        <Menu size={20} strokeWidth={1.5} />
      </header>

      <section className="sfi-observatory-gold__mobile-panel">
        <div className="sfi-observatory-gold__mobile-kicker">WSV / INDICE GLOBAL ACTUAL</div>
        <div className="sfi-observatory-gold__mobile-wsv"><strong>{dec(state.wsv.globalIndex)}</strong><span>/1.00</span></div>
        <div className="sfi-observatory-gold__mobile-quad">
          <span>COHERENCIA <strong>{dec(state.wsv.coherence)}</strong></span>
          <span>RESILIENCIA <strong>{dec(state.wsv.resilience)}</strong></span>
          <span>ALINEACION <strong>{dec(state.wsv.alignment)}</strong></span>
          <span>TENSION <strong>{dec(state.wsv.tension)}</strong></span>
        </div>
      </section>

      <section className="sfi-observatory-gold__mobile-panel">
        <div className="sfi-observatory-gold__mobile-kicker">LECTURA DEL DIA</div>
        <h2>{state.dailyReading.title}</h2>
        <p>{state.dailyReading.summary}</p>
        <a className="sfi-observatory-gold__mobile-action" href={readingUrl}>Ver lectura completa</a>
      </section>

      <section className="sfi-observatory-gold__mobile-panel">
        <div className="sfi-observatory-gold__mobile-kicker">VECTORES</div>
        <div className="sfi-observatory-gold__mobile-vector-row">
          {state.vectors.map((vector) => <span key={vector.id} className={vector.active ? 'active' : ''}>{vector.label.slice(0, 3).toUpperCase()}</span>)}
        </div>
      </section>

      <section className="sfi-observatory-gold__mobile-panel">
        <div className="sfi-observatory-gold__mobile-kicker">MAPA DE TENSIONES</div>
        <div className="sfi-observatory-gold__mobile-map">
          <WorldTensionMapRenderer map={state.globalMap} minimumIntensity={0} tensionType="todas" playing={playing} projectionMode="globe" />
        </div>
      </section>

      <section className="sfi-observatory-gold__mobile-panel">
        <div className="sfi-observatory-gold__mobile-kicker">TENSIONES DESTACADAS</div>
        {state.worldTensions.length ? state.worldTensions.slice(0, 3).map((item) => (
          <div className="sfi-observatory-gold__mobile-row" key={item.rank}>
            <span>{item.rank}</span><em>{item.label}</em><strong>{dec(item.value)}</strong>
          </div>
        )) : <p className="sfi-observatory-gold__empty">SOURCE_UNAVAILABLE</p>}
      </section>

      <section className="sfi-observatory-gold__mobile-panel">
        <div className="sfi-observatory-gold__mobile-kicker">WORLD TIMELINE</div>
        {state.timeline.slice(-3).map((item, index) => (
          <div className="sfi-observatory-gold__mobile-row" key={`${item.time}-${index}`}>
            <span>{item.time}</span><em>{item.title}</em><strong>{item.active ? 'NOW' : ''}</strong>
          </div>
        ))}
      </section>

      <nav className="sfi-observatory-gold__mobile-nav" aria-label="Observatory mobile navigation">
        {[
          ['OBSERVATORY', '/observatory'],
          ['SENALES', '/world-vector'],
          ['MODELOS', '/scorefriction'],
          ['SIMULAR', '/studio'],
          ['PERFIL', '/root'],
        ].map(([item, href]) => <a key={item} href={href}>{item}</a>)}
      </nav>
    </div>
  );
}
