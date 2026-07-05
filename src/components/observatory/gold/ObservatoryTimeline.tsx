import { Pause, Play } from 'lucide-react';
import type { ObservatoryGoldState } from '@/lib/observatory/gold/observatoryGoldState';

export function ObservatoryTimeline({ state, playing, onTogglePlay }: { state: ObservatoryGoldState; playing: boolean; onTogglePlay: () => void }) {
  return (
    <section className="sfi-observatory-gold__timeline sfi-observatory-gold__panel">
      <div className="sfi-observatory-gold__timeline-head">
        <div><h2>WORLD TIMELINE</h2><p>LINEA DE TIEMPO GLOBAL</p></div>
        <button type="button" onClick={onTogglePlay}>{playing ? <Pause size={14} /> : <Play size={14} />} VELOCIDAD 1X</button>
      </div>
      <div className="sfi-observatory-gold__timeline-line">
        {state.timeline.map((item, index) => (
          <div key={`${item.time}-${item.title}-${index}`} className={item.active ? 'active' : ''}>
            <span />
            <strong>{item.time}</strong>
            <em>{item.title}</em>
            <p>{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
