'use client';

import { Menu } from 'lucide-react';
import type { RootGovernanceState } from '@/lib/root/gold/rootGovernanceState';

export function RootGoldHeader({ state }: { state: RootGovernanceState }) {
  const date = new Date(state.generatedAt);
  const time = Number.isNaN(date.getTime()) ? '--:-- UTC' : date.toISOString().slice(11, 16) + ' UTC';
  const day = Number.isNaN(date.getTime()) ? 'DATE_UNAVAILABLE' : date.toISOString().slice(0, 10);
  return (
    <header className="sfi-root-gold__header">
      <div className="sfi-root-gold__brand">
        <div className="sfi-root-gold__sunmark"><span /></div>
        <div className="sfi-root-gold__brand-sfi">SFI</div>
        <div className="sfi-root-gold__brand-name">SYSTEM FRICTION<br />INSTITUTE</div>
        <div className="sfi-root-gold__slash">/</div>
        <div className="sfi-root-gold__route-word">ROOT / GOBERNANZA</div>
      </div>
      <nav className="sfi-root-gold__nav" aria-label="ROOT modes">
        {['OBSERVAR', 'MODELAR', 'SIMULAR', 'GOBERNAR', 'EJECUTAR'].map((item) => <span className={item === 'GOBERNAR' ? 'active' : ''} key={item}>{item}</span>)}
      </nav>
      <div className="sfi-root-gold__system">
        <div><span>ESTADO DEL SISTEMA</span><strong className={`is-${state.systemState}`}>{state.systemState.toUpperCase()}</strong></div>
        <div><span>{time}</span><strong>{day}</strong></div>
        <Menu size={18} strokeWidth={1.6} aria-hidden="true" />
      </div>
    </header>
  );
}
