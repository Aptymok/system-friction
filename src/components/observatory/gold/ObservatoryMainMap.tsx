import { Maximize2, Pause, Play } from 'lucide-react';
import type { ObservatoryGoldState } from '@/lib/observatory/gold/observatoryGoldState';
import { WorldTensionMapRenderer } from './visual/WorldTensionMapRenderer';

type Props = {
  state: ObservatoryGoldState;
  viewMode: 'mapa' | 'red';
  playing: boolean;
  onViewModeChange: (mode: 'mapa' | 'red') => void;
  onTogglePlay: () => void;
};

export function ObservatoryMainMap({ state, viewMode, playing, onViewModeChange, onTogglePlay }: Props) {
  return (
    <main className="sfi-observatory-gold__main-map sfi-observatory-gold__panel">
      <div className="sfi-observatory-gold__map-head">
        <div><h1>OBSERVATORIO GLOBAL</h1><p>MAPA DE TENSIONES EN TIEMPO REAL</p></div>
        <div className="sfi-observatory-gold__map-controls">
          <span>VISTA:</span>
          <button type="button" className={viewMode === 'mapa' ? 'active' : ''} onClick={() => onViewModeChange('mapa')}>MAPA</button>
          <button type="button" className={viewMode === 'red' ? 'active' : ''} onClick={() => onViewModeChange('red')}>RED</button>
          <button type="button" onClick={onTogglePlay} aria-label={playing ? 'Pausar timeline' : 'Reproducir timeline'}>{playing ? <Pause size={14} /> : <Play size={14} />}</button>
          <Maximize2 size={15} strokeWidth={1.4} aria-hidden="true" />
        </div>
      </div>
      <div className={`sfi-observatory-gold__map-stage is-${viewMode}`}>
        <WorldTensionMapRenderer
          map={state.globalMap}
          minimumIntensity={state.mapFilters.minimumIntensity}
          tensionType={state.mapFilters.tensionType}
          region={state.mapFilters.region}
          playing={playing}
          projectionMode="map"
        />
      </div>
    </main>
  );
}
