import { Check, ChevronRight, Sun } from 'lucide-react';
import type { ObservatoryGoldState } from '@/lib/observatory/gold/observatoryGoldState';

function dec(value: number) {
  return value.toFixed(2);
}

function dateLabel(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'SOURCE_UNAVAILABLE';
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).toUpperCase();
}

function VectorIcon({ value }: { value: number }) {
  return (
    <svg viewBox="0 0 38 38" className="sfi-observatory-gold__vector-icon" aria-hidden="true">
      <circle cx="19" cy="19" r="15" />
      <circle cx="19" cy="19" r={3 + value * 7} />
      <path d="M19 4v30M4 19h30M8 8l22 22M30 8L8 30" />
    </svg>
  );
}

export function ObservatoryRightRail({ state }: { state: ObservatoryGoldState }) {
  const active = state.vectors.filter((vector) => vector.active).length;
  const readingUrl = state.dailyReading.fullReadingUrl ?? '/world-vector';

  return (
    <aside className="sfi-observatory-gold__right-rail">
      <section className="sfi-observatory-gold__panel sfi-observatory-gold__daily">
        <div className="sfi-observatory-gold__daily-head">
          <div><h2>LECTURA DEL DIA</h2><span>{dateLabel(state.dailyReading.date)}</span></div>
          <Sun size={28} strokeWidth={1.2} />
        </div>
        <h3>{state.dailyReading.title}</h3>
        <p>{state.dailyReading.summary}</p>
        <div className="sfi-observatory-gold__daily-stats">
          <span>INDICE DE TENSION <strong>{dec(state.dailyReading.tensionIndex)}</strong><em>/1.00</em></span>
          <span>ESTABILIDAD <strong>{state.dailyReading.stability.toUpperCase()}</strong></span>
        </div>
        <a className="sfi-observatory-gold__panel-link" href={readingUrl}>VER LECTURA COMPLETA <ChevronRight size={13} /></a>
      </section>

      <section className="sfi-observatory-gold__panel sfi-observatory-gold__vectors">
        <div className="sfi-observatory-gold__panel-title"><h2>VECTORES</h2><span>{active}/{state.vectors.length} ACTIVOS</span></div>
        <div className="sfi-observatory-gold__vector-grid">
          {state.vectors.map((vector) => (
            <div key={vector.id} className={vector.active ? 'active' : ''}>
              <VectorIcon value={vector.value} />
              <span>{vector.label}</span>
              <strong>{dec(vector.value)}</strong>
              {vector.active ? <Check size={13} /> : null}
            </div>
          ))}
        </div>
        <a className="sfi-observatory-gold__panel-link" href="/world-vector">EXPLORAR VECTORES <ChevronRight size={13} /></a>
      </section>
    </aside>
  );
}
