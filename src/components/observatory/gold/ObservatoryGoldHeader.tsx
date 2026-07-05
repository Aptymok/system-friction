import { Grid3X3, Menu } from 'lucide-react';
import type { ObservatoryGoldState } from '@/lib/observatory/gold/observatoryGoldState';

function utcParts(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return { time: '--:--:-- UTC', date: '-- --- ----', coords: 'LAT -- / LON --' };
  const day = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).toUpperCase();
  return { time: `${date.toISOString().slice(11, 19)} UTC`, date: day, coords: 'LAT 0.00 / LON 0.00' };
}

export function ObservatoryGoldHeader({ state }: { state: ObservatoryGoldState }) {
  const stamp = utcParts(state.generatedAt);

  return (
    <header className="sfi-observatory-gold__header">
      <div className="sfi-observatory-gold__brand">
        <div className="sfi-observatory-gold__sunmark"><span /></div>
        <div className="sfi-observatory-gold__brand-sfi">SFI</div>
        <div className="sfi-observatory-gold__brand-name">SYSTEM FRICTION<br />INSTITUTE</div>
        <div className="sfi-observatory-gold__slash">/</div>
        <div className="sfi-observatory-gold__route-word">OBSERVATORY</div>
      </div>
      <nav className="sfi-observatory-gold__nav" aria-label="Observatory modes">
        {['OBSERVAR', 'MODELAR', 'SIMULAR', 'CONDENSAR', 'EJECUTAR'].map((item) => <span key={item}>{item}</span>)}
      </nav>
      <div className="sfi-observatory-gold__system">
        <div><span>ESTADO DEL SISTEMA</span><strong className={`is-${state.systemState}`}>{state.systemState.toUpperCase()}</strong></div>
        <div><span>{stamp.time}</span><strong>{stamp.date}</strong></div>
        <div><span>COORDENADAS</span><strong>{stamp.coords}</strong></div>
        <Grid3X3 size={15} strokeWidth={1.6} aria-hidden="true" />
        <Menu className="sfi-observatory-gold__mobile-menu" size={18} strokeWidth={1.6} aria-hidden="true" />
      </div>
    </header>
  );
}
