import { Grid3X3, Menu } from 'lucide-react';
import type { StudioGoldState } from '@/lib/studio/gold/studioGoldState';

function formatUtc(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { time: '--:--:-- UTC', day: '-- --- ----' };
  return {
    time: `${date.toISOString().slice(11, 19)} UTC`,
    day: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).toUpperCase(),
  };
}

export function StudioGoldHeader({ state }: { state: StudioGoldState }) {
  const stamp = formatUtc(state.generatedAt);
  const statusLabel = state.systemState === 'nominal' ? 'NOMINAL' : state.systemState.toUpperCase();

  return (
    <header className="sfi-studio-gold__header">
      <div className="sfi-studio-gold__brand">
        <div className="sfi-studio-gold__sunmark" aria-hidden="true">
          <span />
        </div>
        <div className="sfi-studio-gold__brand-sfi">SFI</div>
        <div className="sfi-studio-gold__brand-name">SYSTEM FRICTION<br />INSTITUTE</div>
        <div className="sfi-studio-gold__slash">/</div>
        <div className="sfi-studio-gold__studio-word">STUDIO</div>
      </div>

      <nav className="sfi-studio-gold__nav" aria-label="Studio modes">
        {['OBSERVAR', 'MODELAR', 'EVALUAR', 'SIMULAR', 'GOBERNAR', 'EJECUTAR'].map((item) => (
          <span key={item}>{item}</span>
        ))}
      </nav>

      <div className="sfi-studio-gold__system">
        <div>
          <span>ESTADO DEL SISTEMA</span>
          <strong className={`is-${state.systemState}`}>{statusLabel}</strong>
        </div>
        <div className="sfi-studio-gold__time">
          <strong>{stamp.time}</strong>
          <span>{stamp.day}</span>
        </div>
        <Grid3X3 size={15} strokeWidth={1.6} aria-hidden="true" />
        <Menu className="sfi-studio-gold__mobile-menu" size={18} strokeWidth={1.6} aria-hidden="true" />
      </div>
    </header>
  );
}
