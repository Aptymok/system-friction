import type { ObservatoryGoldState } from '@/lib/observatory/gold/observatoryGoldState';

type Props = {
  state: ObservatoryGoldState;
  minimumIntensity: number;
  tensionType: string;
  region: string;
  onMinimumIntensityChange: (value: number) => void;
  onTensionTypeChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onReset: () => void;
};

function dec(value: number) {
  return value.toFixed(2);
}

function trendGlyph(trend?: 'up' | 'down' | 'stable') {
  if (trend === 'up') return '^';
  if (trend === 'down') return 'v';
  return '-';
}

function MiniMap({ state }: { state: ObservatoryGoldState }) {
  return (
    <svg viewBox="0 0 280 126" className="sfi-observatory-gold__mini-map" aria-hidden="true">
      <path d="M12 50 C42 28 75 30 105 42 C138 54 155 23 193 32 C232 41 250 57 268 48" />
      <path d="M38 84 C64 70 92 80 122 88 C160 100 182 79 216 86 C238 91 250 101 270 95" />
      {state.globalMap.nodes.slice(0, 9).map((node) => {
        const x = ((node.lon + 180) / 360) * 260 + 10;
        const y = ((90 - node.lat) / 180) * 106 + 10;
        return <circle key={node.id} cx={x} cy={y} r={4 + node.intensity * 10}><title>{`${node.label}: ${dec(node.intensity)}`}</title></circle>;
      })}
    </svg>
  );
}

export function ObservatoryBottomTensions({
  state,
  minimumIntensity,
  tensionType,
  region,
  onMinimumIntensityChange,
  onTensionTypeChange,
  onRegionChange,
  onReset,
}: Props) {
  return (
    <section className="sfi-observatory-gold__bottom-grid">
      <article className="sfi-observatory-gold__panel">
        <h2>TENSIONES DEL MUNDO</h2>
        <p>TOP 5 POR INTENSIDAD</p>
        <div className="sfi-observatory-gold__rank-list">
          {state.worldTensions.length ? state.worldTensions.map((item) => (
            <div key={`${item.rank}-${item.label}`}>
              <span>{item.rank}</span>
              <em>{item.label}</em>
              <strong>{dec(item.value)}</strong>
            </div>
          )) : <p className="sfi-observatory-gold__empty">SOURCE_UNAVAILABLE</p>}
        </div>
        <a className="sfi-observatory-gold__panel-link" href="/world-vector">VER TODAS LAS TENSIONES</a>
      </article>

      <article className="sfi-observatory-gold__panel sfi-observatory-gold__regional">
        <h2>MAPA DE TENSIONES</h2>
        <p>VISTA POR REGIONES</p>
        <MiniMap state={state} />
        <div className="sfi-observatory-gold__regional-list">
          {state.regionalTensions.map((item) => (
            <div key={item.region} title={`${item.region}: ${dec(item.value)} / ${item.trend ?? 'stable'}`}>
              <span>{item.region}</span>
              <strong>{dec(item.value)} {trendGlyph(item.trend)}</strong>
            </div>
          ))}
        </div>
      </article>

      <article className="sfi-observatory-gold__panel sfi-observatory-gold__filters">
        <h2>FILTROS DE MAPA</h2>
        <label>
          <span>INTENSIDAD MINIMA</span>
          <strong>{dec(minimumIntensity)}</strong>
          <input type="range" min="0" max="1" step="0.05" value={minimumIntensity} onChange={(event) => onMinimumIntensityChange(Number(event.target.value))} />
        </label>
        <label>
          <span>TIPO DE TENSION</span>
          <select value={tensionType} onChange={(event) => onTensionTypeChange(event.target.value)}>
            <option value="todas">TODAS</option>
            <option value="cultural">CULTURAL</option>
            <option value="tech">TEC</option>
            <option value="geo">GEO</option>
            <option value="economy">ECO</option>
            <option value="climate">CLIMA</option>
          </select>
        </label>
        <label>
          <span>REGION</span>
          <select value={region} onChange={(event) => onRegionChange(event.target.value)}>
            <option value="todas">TODAS</option>
            {state.regionalTensions.map((item) => <option key={item.region} value={item.region}>{item.region.toUpperCase()}</option>)}
          </select>
        </label>
        <button type="button" onClick={onReset}>REINICIAR FILTROS</button>
      </article>
    </section>
  );
}
