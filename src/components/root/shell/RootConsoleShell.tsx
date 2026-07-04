'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { RootHudGovernanceSnapshot } from '@/lib/root/hudGovernance';
import { RootOperationalTrigger } from './RootOperationalTrigger';
import { CountTile, RadialGauge, type GaugeTone } from './RadialGauge';

export type ConsoleTone = 'ok' | 'watch' | 'bad' | 'muted';
export type ConsoleHubDef = { id: string; title: string; subtitle: string; icon: ReactNode; status?: string; dataClass?: 'real' | 'derived' | 'gated' | 'mixed' };
export type ConsoleStatusItem = { label: string; value: string | number; tone?: ConsoleTone; source?: string };
export type ConsoleFooterItem = { label: string; value: string | number };
export type ConsoleGaugeItem = { id: string; label: string; sublabel?: string; value01: number | null; tone: GaugeTone; source: string };
export type ConsoleCountItem = { id: string; label: string; value: number | string; tone: GaugeTone; source: string };
export type ConsoleInterpretation = { title: string; body: string; source: string; ctaLabel?: string; onCta?: () => void };

type RootConsoleShellProps = {
  route: string;
  title: string;
  subtitle: string;
  hubs: ConsoleHubDef[];
  activeHubId: string;
  onSelectHub: (hubId: string) => void;
  statusItems?: ConsoleStatusItem[];
  footerItems?: ConsoleFooterItem[];
  gaugeItems?: ConsoleGaugeItem[];
  countItems?: ConsoleCountItem[];
  interpretation?: ConsoleInterpretation | null;
  governance?: RootHudGovernanceSnapshot;
  isDataGated?: boolean;
  children: ReactNode;
};

function Icon({ children }: { children: ReactNode }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{children}</svg>;
}

export const ConsoleIcons = {
  pulse: <Icon><circle cx="12" cy="12" r="3.4" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /><circle cx="12" cy="12" r="8" /></Icon>,
  branch: <Icon><circle cx="6" cy="12" r="2.4" /><circle cx="18" cy="6" r="2.4" /><circle cx="18" cy="18" r="2.4" /><path d="M8.2 11.1 15.8 7M8.2 12.9l7.6 4.1" /></Icon>,
  grid: <Icon><path d="M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z" /></Icon>,
  shield: <Icon><path d="M12 3.5 19 6v5.2c0 4.2-2.6 7.1-7 9.2-4.4-2.1-7-5-7-9.2V6z" /><path d="M12 7.5v8.5M8.5 12h7" /></Icon>,
  layers: <Icon><path d="M12 3.8 20 8l-8 4.2L4 8zM4 12l8 4.2 8-4.2M4 16l8 4.2 8-4.2" /></Icon>,
  chart: <Icon><path d="M4 19h16M6 16.5 10 12l3 2.7L18.5 6" /><circle cx="10" cy="12" r="1.4" /><circle cx="18.5" cy="6" r="1.4" /></Icon>,
} as const;

function toneClass(tone?: ConsoleTone) { return tone ? `tone-${tone}` : 'tone-muted'; }
function dataClassGlyph(dataClass?: ConsoleHubDef['dataClass']) { if (dataClass === 'real') return '●'; if (dataClass === 'derived') return '◆'; if (dataClass === 'gated') return '○'; return '◐'; }

const BRAND_TICKER = ['SFI · OBSERVE · UNDERSTAND · ALIGN · ACT', 'NO SINGLE ENTITY · NO CENTRAL AUTHORITY · NO PERMANENT ADVANTAGE', 'SYSTEMS THINKING FOR A COMPLEX WORLD'];

function useOperatorClock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date().toISOString().replace('T', ' ').slice(0, 19) + 'Z');
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return now ?? '----:--:-- --:--:--Z';
}

function GovernanceBadge({ governance }: { governance?: RootHudGovernanceSnapshot }) {
  const status = governance?.acpStatus ?? 'degraded';
  const tone: ConsoleTone = status === 'active' ? 'ok' : status === 'blind' ? 'bad' : 'watch';
  const label = status === 'active' ? 'ACP PRESENT' : status === 'blind' ? 'BLIND MODE' : 'ACP UNCONFIRMED';
  const signalLabel = status === 'active' ? 'SIGNAL SECURE' : 'SIGNAL UNVERIFIED';
  return (
    <div className="rc-badge" title={governance?.source ?? 'DATA GATED: governance snapshot not provided'}>
      <span className={`rc-badge-dot ${toneClass(tone)}`} aria-hidden="true" />
      <div className="rc-badge-text">
        <b className={toneClass(tone)}>{label}</b>
        <em>{signalLabel} · last_seen {governance?.acpLastSeenAt ?? 'not_observed'}</em>
      </div>
    </div>
  );
}

function InterpretationCard({ interpretation, onDismiss }: { interpretation: ConsoleInterpretation; onDismiss: () => void }) {
  return (
    <div className="rc-interp" role="dialog" aria-label="ROOT interpretation">
      <button type="button" className="rc-interp-close" onClick={onDismiss} aria-label="Close">×</button>
      <span className="rc-interp-kicker">INTERPRETATION</span>
      <b className="rc-interp-title">{interpretation.title}</b>
      <p className="rc-interp-body">{interpretation.body}</p>
      <div className="rc-interp-foot">
        <em>{interpretation.source}</em>
        {interpretation.onCta ? <button type="button" className="rc-interp-cta" onClick={interpretation.onCta}>{interpretation.ctaLabel ?? 'ACCESS'}</button> : null}
      </div>
      <style jsx>{`.rc-interp{position:absolute;z-index:6;top:14%;left:50%;transform:translateX(-50%);width:min(420px,88%);border-radius:16px;border:1px solid rgba(178,140,255,.28);background:linear-gradient(180deg,rgba(24,20,42,.86),rgba(10,9,20,.9));box-shadow:0 0 0 1px rgba(255,255,255,.03) inset,0 30px 80px rgba(0,0,0,.55),0 0 60px rgba(124,92,255,.1);backdrop-filter:blur(22px);padding:18px 20px}.rc-interp-close{position:absolute;top:10px;right:12px;width:20px;height:20px;border:none;background:transparent;color:#8890a8;cursor:pointer;font-size:14px;line-height:1}.rc-interp-kicker{display:block;font-family:var(--sfi-font-mono),monospace;font-size:8px;letter-spacing:.2em;color:#b8a0ff}.rc-interp-title{display:block;margin-top:8px;font-family:var(--sfi-font-display),sans-serif;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#f3f0ff}.rc-interp-body{margin-top:10px;font-size:11px;line-height:1.6;color:#c7cade}.rc-interp-foot{margin-top:14px;display:flex;align-items:center;justify-content:space-between;gap:10px}.rc-interp-foot em{font-style:normal;font-family:var(--sfi-font-mono),monospace;font-size:7px;letter-spacing:.04em;color:#5b6178;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rc-interp-cta{flex-shrink:0;border:1px solid rgba(178,140,255,.4);background:rgba(124,92,255,.16);color:#d7c9ff;font-family:var(--sfi-font-mono),monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;padding:7px 12px;border-radius:8px;cursor:pointer}.rc-interp-cta:hover{background:rgba(124,92,255,.26)}`}</style>
    </div>
  );
}

export function RootConsoleShell({ route, title, subtitle, hubs, activeHubId, onSelectHub, statusItems = [], footerItems = [], gaugeItems = [], countItems = [], interpretation, governance, isDataGated = false, children }: RootConsoleShellProps) {
  const clock = useOperatorClock();
  const [interpretationDismissed, setInterpretationDismissed] = useState(false);
  const tickerItems = [...footerItems.map((item) => `${item.label}: ${item.value}`), ...BRAND_TICKER];

  return (
    <main className="root-console-shell">
      <div className="rc-nebula" aria-hidden="true" />
      <div className="rc-stars" aria-hidden="true" />
      <aside className="rc-rail" aria-label="ROOT view rail">
        <div className="rc-mark"><span className="rc-mark-glyph">SFI</span><b>ROOT</b><small>{subtitle}</small></div>
        <nav className="rc-hubs" aria-label="ROOT views">
          {hubs.map((hub) => (
            <button key={hub.id} type="button" className={hub.id === activeHubId ? 'active' : ''} onClick={() => onSelectHub(hub.id)} aria-pressed={hub.id === activeHubId}>
              <i>{hub.icon}</i>
              <span className="rc-hub-title">{hub.title}</span>
              <em>{dataClassGlyph(hub.dataClass)} {hub.dataClass ?? 'mixed'}</em>
            </button>
          ))}
        </nav>
        <div className="rc-rail-foot"><span>UTC</span><b>{clock}</b></div>
      </aside>
      <section className="rc-shell">
        <header className="rc-topbar">
          <div className="rc-topbar-left"><span className="rc-tiny-label">ROOT · {route}</span><span className="rc-tiny-label muted">SFI-ROOT-OBSERVATORY · v.CONSOLE</span></div>
          <div className="rc-wordmark"><b>{title}</b><span>SYSTEM FRICTION INSTITUTE</span><em>OBSERVATORY ENVIRONMENT</em></div>
          <div className="rc-topbar-right"><span className="rc-tiny-label">UTC {clock}</span><span className="rc-tiny-label muted">NODE SFI-ROOT-01 · {governance?.acpStatus === 'active' ? 'SIGNAL SECURE' : 'SIGNAL UNVERIFIED'}</span></div>
        </header>
        <div className="rc-subbar">
          <GovernanceBadge governance={governance} />
          <div className="rc-status-row">{statusItems.slice(0, 4).map((item) => <div key={`${item.label}:${item.value}`} className="rc-status-chip" title={item.source}><span>{item.label}</span><b className={toneClass(item.tone)}>{item.value}</b></div>)}</div>
          <RootOperationalTrigger job={isDataGated ? 'all' : 'reports'} compact />
        </div>
        <section className="rc-main">
          {interpretation && !interpretationDismissed ? <InterpretationCard interpretation={interpretation} onDismiss={() => setInterpretationDismissed(true)} /> : null}
          <div className="rc-center">{children}</div>
          {(gaugeItems.length || countItems.length) ? <aside className="rc-dock" aria-label="ROOT real-time metrics dock">{gaugeItems.map((gauge) => <div key={gauge.id} className="rc-dock-card" title={gauge.source}><RadialGauge value01={gauge.value01} label={gauge.label} sublabel={gauge.sublabel} tone={gauge.tone} /></div>)}{countItems.map((count) => <div key={count.id} className="rc-dock-card compact" title={count.source}><CountTile value={count.value} label={count.label} source={count.source} tone={count.tone} /></div>)}</aside> : null}
        </section>
        <footer className="rc-footer"><div className="rc-footer-track">{[...tickerItems, ...tickerItems].map((entry, index) => <span key={`${entry}-${index}`}>{entry}</span>)}</div></footer>
      </section>
      <style jsx>{`.root-console-shell{position:relative;min-height:100vh;display:grid;grid-template-columns:168px minmax(0,1fr);overflow:hidden;background:#04050c;color:#e6e8f5;font-family:var(--sfi-font-mono),"JetBrains Mono",Consolas,monospace}.rc-nebula{position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(circle at 18% 20%,rgba(124,92,255,.16),transparent 32%),radial-gradient(circle at 78% 12%,rgba(56,217,224,.13),transparent 30%),radial-gradient(circle at 85% 78%,rgba(240,160,75,.09),transparent 34%),radial-gradient(circle at 30% 85%,rgba(216,79,192,.1),transparent 30%),linear-gradient(180deg,#03040a,#050512 55%,#03040a)}.rc-stars{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.55;background-image:radial-gradient(1.4px 1.4px at 20% 30%,rgba(255,255,255,.55) 50%,transparent 52%),radial-gradient(1.2px 1.2px at 60% 70%,rgba(255,255,255,.4) 50%,transparent 52%),radial-gradient(1px 1px at 80% 20%,rgba(255,255,255,.45) 50%,transparent 52%),radial-gradient(1.3px 1.3px at 35% 85%,rgba(255,255,255,.35) 50%,transparent 52%),radial-gradient(1px 1px at 90% 55%,rgba(255,255,255,.3) 50%,transparent 52%);background-size:210px 190px,260px 230px,300px 260px,190px 220px,240px 210px}.rc-rail,.rc-shell{position:relative;z-index:1}.rc-rail{min-height:100vh;border-right:1px solid rgba(255,255,255,.07);background:linear-gradient(180deg,rgba(10,10,20,.82),rgba(4,4,10,.9));display:grid;grid-template-rows:auto 1fr 40px}.rc-mark{padding:18px 14px;display:grid;gap:3px;border-bottom:1px solid rgba(255,255,255,.06)}.rc-mark-glyph{font-family:var(--sfi-font-display),sans-serif;font-size:9px;letter-spacing:.3em;color:#8890a8}.rc-mark b{font-family:var(--sfi-font-display),sans-serif;font-size:16px;letter-spacing:.14em;color:#f3f0ff}.rc-mark small{font-size:7px;letter-spacing:.1em;text-transform:uppercase;color:#5b6178}.rc-hubs{padding:10px;display:grid;align-content:start;gap:6px;overflow-y:auto}.rc-hubs button{display:grid;grid-template-columns:18px 1fr;grid-template-rows:auto auto;align-items:center;gap:9px;border-radius:10px;border:1px solid transparent;background:transparent;color:#8890a8;padding:9px 10px;cursor:pointer;text-align:left;transition:background .15s ease,border-color .15s ease,color .15s ease}.rc-hubs button i svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.5}.rc-hub-title{font-size:9.5px;letter-spacing:.05em;text-transform:uppercase;grid-column:2;grid-row:1}.rc-hubs em{grid-column:2;grid-row:2;font-style:normal;font-size:6.5px;letter-spacing:.08em;color:#4d5268}.rc-hubs button:hover{background:rgba(255,255,255,.04);color:#e6e8f5}.rc-hubs button.active{background:linear-gradient(90deg,rgba(124,92,255,.16),rgba(56,217,224,.06));border-color:rgba(124,92,255,.3);color:#f3f0ff;box-shadow:0 0 22px rgba(124,92,255,.12)}.rc-rail-foot{align-self:end;padding:0 14px 12px;display:grid;gap:2px}.rc-rail-foot span{font-size:7px;letter-spacing:.14em;color:#4d5268;text-transform:uppercase}.rc-rail-foot b{font-size:8px;color:#8890a8}.rc-shell{min-width:0;min-height:100vh;display:grid;grid-template-rows:auto auto minmax(0,1fr) 30px}.rc-topbar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;padding:16px 22px 10px;border-bottom:1px solid rgba(255,255,255,.05)}.rc-topbar-left{display:grid;gap:3px}.rc-topbar-right{display:grid;gap:3px;justify-items:end;text-align:right}.rc-tiny-label{font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:#8890a8}.rc-tiny-label.muted{color:#4d5268}.rc-wordmark{text-align:center;display:grid;justify-items:center;gap:3px}.rc-wordmark b{font-family:var(--sfi-font-display),sans-serif;font-size:20px;letter-spacing:.32em;color:#f6f4ff;text-shadow:0 0 30px rgba(124,92,255,.25)}.rc-wordmark span{font-size:8px;letter-spacing:.28em;color:#a9adc4;text-transform:uppercase}.rc-wordmark em{font-style:normal;font-size:7px;letter-spacing:.2em;color:#5b6178;text-transform:uppercase}.rc-subbar{display:flex;align-items:center;gap:14px;padding:9px 22px;border-bottom:1px solid rgba(255,255,255,.05);flex-wrap:wrap}.rc-badge{display:flex;align-items:center;gap:8px;flex-shrink:0}.rc-badge-dot{width:8px;height:8px;border-radius:50%;background:currentColor;box-shadow:0 0 10px currentColor;animation:rc-pulse 2.2s ease-in-out infinite}@keyframes rc-pulse{0%,100%{opacity:.5}50%{opacity:1}}.rc-badge-text{display:grid;gap:1px}.rc-badge-text b{font-size:9px;letter-spacing:.08em}.rc-badge-text em{font-style:normal;font-size:7px;color:#5b6178;white-space:nowrap}.rc-status-row{display:flex;gap:10px;flex-wrap:wrap;flex:1;min-width:0}.rc-status-chip{display:flex;align-items:center;gap:6px;border:1px solid rgba(255,255,255,.07);border-radius:8px;background:rgba(255,255,255,.02);padding:5px 9px}.rc-status-chip span{font-size:7.5px;letter-spacing:.08em;color:#8890a8;text-transform:uppercase}.rc-status-chip b{font-size:9.5px;letter-spacing:.04em}.rc-main{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 132px;gap:10px;padding:12px 14px;min-height:0}.rc-center{position:relative;min-width:0;min-height:calc(100vh - 230px)}.rc-dock{display:grid;align-content:start;gap:8px}.rc-dock-card{border-radius:14px;border:1px solid rgba(255,255,255,.07);background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.01));backdrop-filter:blur(14px);padding:8px;display:grid;place-items:center}.rc-dock-card.compact{padding:2px}.rc-footer{overflow:hidden;border-top:1px solid rgba(255,255,255,.06);background:rgba(3,3,8,.75)}.rc-footer-track{display:flex;width:max-content;animation:rc-footer-scroll 40s linear infinite}.rc-footer span{padding:7px 18px;font-size:8px;letter-spacing:.1em;color:#5b6178;white-space:nowrap;border-right:1px solid rgba(255,255,255,.05);text-transform:uppercase}@keyframes rc-footer-scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}:global(.rc-panel){position:relative;border-radius:16px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(20,20,34,.6),rgba(8,8,16,.68));box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 24px 60px rgba(0,0,0,.4);backdrop-filter:blur(18px)}:global(.rc-row){display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid rgba(255,255,255,.05);padding:8px 0}:global(.rc-tag){display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(124,92,255,.24);border-radius:6px;background:rgba(124,92,255,.08);padding:4px 6px;color:#c7bdff;font-size:8px}:global(.rc-btn){border:1px solid rgba(124,92,255,.32);border-radius:8px;background:rgba(124,92,255,.12);color:#d7c9ff;font:inherit;font-size:9px;letter-spacing:.12em;text-transform:uppercase;padding:8px 12px;cursor:pointer;white-space:nowrap;transition:background .15s ease,box-shadow .15s ease}:global(.rc-btn:hover:not(:disabled)){background:rgba(124,92,255,.22);box-shadow:0 0 22px rgba(124,92,255,.18)}:global(.rc-btn:disabled){opacity:.5;cursor:progress}.tone-ok,:global(.tone-ok){color:#33d6a6}.tone-watch,:global(.tone-watch){color:#ffb066}.tone-bad,:global(.tone-bad){color:#ff5f7e}.tone-muted,:global(.tone-muted){color:#8890a8}@media(max-width:1180px){.root-console-shell{grid-template-columns:1fr}.rc-rail{position:sticky;top:0;min-height:auto;grid-template-rows:none;grid-template-columns:auto 1fr auto;align-items:center}.rc-mark{border-bottom:0;border-right:1px solid rgba(255,255,255,.06)}.rc-hubs{grid-auto-flow:column;overflow-x:auto;padding:8px}.rc-hubs button{grid-template-columns:16px auto;grid-template-rows:none}.rc-hub-title{grid-row:1}.rc-hubs em{display:none}.rc-rail-foot{padding:0 10px}.rc-topbar{grid-template-columns:1fr;justify-items:center;text-align:center}.rc-topbar-left,.rc-topbar-right{justify-items:center;text-align:center}.rc-main{grid-template-columns:1fr}.rc-dock{grid-auto-flow:column;overflow-x:auto;grid-template-columns:none}}`}</style>
    </main>
  );
}
