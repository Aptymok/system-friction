'use client';

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './CognitiveSpinePark.css';

export type SfiParkState = 'LIVE' | 'READY' | 'ATTENTION' | 'GATED' | 'DEGRADED' | 'UNOBSERVED' | 'CLOSED';
export type SfiParkZone = {
  id: string;
  label: string;
  state: SfiParkState;
  detail: string;
  count?: number;
  live?: boolean;
  x: number;
  y: number;
};
export type SfiParkStat = { label: string; value: string | number; state?: SfiParkState };
export type SfiParkFocus = { id: string; kind: string; title: string; status: string; detail?: string | null };

type Props = {
  enabled: boolean;
  mode: 'institutional' | 'case';
  title: string;
  subtitle: string;
  openLabel?: string;
  focus: SfiParkFocus | null;
  focusOptions?: SfiParkFocus[];
  onFocusChange?: (id: string) => void;
  zones: SfiParkZone[];
  stats: SfiParkStat[];
  toolbar?: ReactNode;
  inspector?: (zone: SfiParkZone) => ReactNode;
  footer?: ReactNode;
};

function stateClass(state: SfiParkState) {
  return `state-${state.toLowerCase()}`;
}

function zoneStyle(zone: SfiParkZone) {
  return {
    '--park-x-d': `${zone.x * 0.61}%`,
    '--park-x-m': `${zone.x}%`,
    '--park-y': `${zone.y}%`,
  } as CSSProperties;
}

export function CognitiveSpinePark({
  enabled, mode, title, subtitle, openLabel = 'ENTER OPERATING OBSERVATORY', focus, focusOptions = [], onFocusChange,
  zones, stats, toolbar, inspector, footer,
}: Props) {
  const [open, setOpen] = useState(false);
  const [zoneId, setZoneId] = useState('core');
  const selected = useMemo(() => zones.find((zone) => zone.id === zoneId) ?? zones[0] ?? null, [zones, zoneId]);

  useEffect(() => {
    if (selected || !zones.length) return;
    setZoneId(zones[0].id);
  }, [selected, zones]);

  if (!open) {
    return <button className="sfiParkOpen" disabled={!enabled} onClick={() => setOpen(true)}>
      <strong>{openLabel}</strong>
      <span>{mode === 'institutional' ? 'INSTITUTIONAL STATE' : 'YOUR CASE SPACE'} · OBSERVE FIRST</span>
    </button>;
  }
  if (typeof document === 'undefined') return null;

  return createPortal(
    <section className={`sfiPark sfiPark-${mode}`} aria-label={title}>
      <div className="sfiParkStage">
        <picture className="sfiParkArt" aria-hidden="true">
          <source media="(max-width: 640px)" srcSet="/cognitive-spine/park-mobile.avif" />
          <source media="(max-width: 980px)" srcSet="/cognitive-spine/park-tablet.avif" />
          <img src="/cognitive-spine/park-desktop.avif" alt="" />
        </picture>
        <video className="sfiParkVideo" autoPlay muted loop playsInline preload="metadata" aria-hidden="true">
          <source src="/cognitive-spine/park-ambient.mp4" type="video/mp4" />
        </video>
        <div className="sfiParkAmbient" aria-hidden="true" />

        <header className="sfiParkHeader">
          <div><small>SYSTEM FRICTION INSTITUTE · OPERATING ANATOMY</small><strong>{title}</strong><span>{subtitle}</span></div>
          <button onClick={() => setOpen(false)}>CLOSE</button>
        </header>

        {zones.map((zone) => <button
          key={zone.id}
          className={`sfiParkHotspot ${stateClass(zone.state)} ${zone.live ? 'is-live' : ''} ${selected?.id === zone.id ? 'active' : ''}`}
          style={zoneStyle(zone)}
          onClick={() => setZoneId(zone.id)}
          aria-label={`${zone.label}: ${zone.state}`}
        >
          <i /><span><b>{zone.label}</b><small>{zone.state}{typeof zone.count === 'number' ? ` · ${zone.count}` : ''}</small></span>
        </button>)}

        <aside className="sfiParkBoard" aria-live="polite">
          <div className="sfiParkStats">{stats.map((stat) => <div key={stat.label} className={stateClass(stat.state ?? 'UNOBSERVED')}><small>{stat.label}</small><b>{stat.value}</b></div>)}</div>

          <div className="sfiParkFocus">
            <small>OBSERVED OBJECT · NEVER LOST</small>
            <strong>{focus?.title ?? 'NO CASE / OBJECT SELECTED'}</strong>
            <span>{focus ? `${focus.kind} · ${focus.status}${focus.detail ? ` · ${focus.detail}` : ''}` : 'Select or create an object before interpreting activity.'}</span>
            {focusOptions.length > 1 && <div className="sfiParkFocusOptions">{focusOptions.slice(0, 12).map((item) => <button key={item.id} className={focus?.id === item.id ? 'active' : ''} onClick={() => onFocusChange?.(item.id)}>{item.kind}</button>)}</div>}
          </div>

          {selected && <section className="sfiParkSelected">
            <small>SELECTED ORGAN</small>
            <h2>{selected.label}</h2>
            <p>{selected.detail}</p>
            <dl>
              <div><dt>STATE</dt><dd className={stateClass(selected.state)}>{selected.state}</dd></div>
              {typeof selected.count === 'number' && <div><dt>OBJECTS</dt><dd>{selected.count}</dd></div>}
              <div><dt>OBSERVED ACTIVITY</dt><dd>{selected.live ? 'YES' : 'NO / NOT OBSERVED'}</dd></div>
            </dl>
          </section>}

          <div className="sfiParkBoardScroll">
            {selected && inspector?.(selected)}
            {toolbar && <section className="sfiParkControls"><small>CONTEXTUAL CONTROLS</small>{toolbar}</section>}
          </div>
        </aside>

        <div className="sfiParkTruth"><span>AMBIENT MOTION ≠ ACTIVITY</span><span>LIVE = OBSERVED EVENT ONLY</span><span>CANON = ROOT ONLY</span></div>
        <footer className="sfiParkFooter">{footer ?? <>OBSERVE <i>→</i> CONTEXT <i>→</i> DECIDE WHEN REQUIRED <i>→</i> EXECUTE <i>→</i> RETURN <i>→</i> OBSERVE AGAIN</>}</footer>
      </div>
    </section>,
    document.body,
  );
}
