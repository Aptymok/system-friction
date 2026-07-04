'use client';

import type { ReactNode } from 'react';

export type ConsoleTone = 'ok' | 'watch' | 'bad' | 'muted';
export type ConsoleHubDef = { id: string; title: string; subtitle: string; icon: ReactNode; status?: string; dataClass?: 'real' | 'derived' | 'gated' | 'mixed' };
export type ConsoleStatusItem = { label: string; value: string | number; tone?: ConsoleTone; source?: string };
export type ConsoleFooterItem = { label: string; value: string | number };

type RootConsoleShellProps = {
  route: string;
  title: string;
  subtitle: string;
  hubs: ConsoleHubDef[];
  activeHubId: string;
  onSelectHub: (hubId: string) => void;
  statusItems?: ConsoleStatusItem[];
  footerItems?: ConsoleFooterItem[];
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

export function RootConsoleShell({ route, title, subtitle, hubs, activeHubId, onSelectHub, statusItems = [], footerItems = [], children }: RootConsoleShellProps) {
  const activeHub = hubs.find((hub) => hub.id === activeHubId) ?? hubs[0];
  return (
    <main className="root-console-shell">
      <div className="rc-bg" aria-hidden="true" />
      <aside className="rc-rail" aria-label="ROOT view rail">
        <div className="rc-mark"><span>SFI</span><b>ROOT</b></div>
        <nav className="rc-hubs" aria-label="ROOT views">
          {hubs.map((hub, index) => (
            <button key={hub.id} type="button" className={hub.id === activeHubId ? 'active' : ''} onClick={() => onSelectHub(hub.id)} title={`${hub.title} — ${hub.subtitle}`} aria-pressed={hub.id === activeHubId}>
              <span>{String(index + 1).padStart(2, '0')}</span><i>{hub.icon}</i><em>{hub.dataClass ?? 'mixed'}</em>
            </button>
          ))}
        </nav>
      </aside>
      <section className="rc-shell">
        <header className="rc-topbar">
          <div><span>Route</span><b>{route}</b></div>
          <div className="rc-title"><span>{subtitle}</span><b>{title}</b><em>{activeHub?.subtitle ?? 'ROOT observatory surface'}</em></div>
          <div className="rc-status">
            {statusItems.slice(0, 3).map((item) => <section key={`${item.label}:${item.value}`} title={item.source}><span>{item.label}</span><b className={toneClass(item.tone)}>{item.value}</b></section>)}
          </div>
        </header>
        <section className="rc-main">{children}</section>
        <footer className="rc-footer">{footerItems.map((item) => <span key={`${item.label}:${item.value}`}>{item.label} <b>{item.value}</b></span>)}</footer>
      </section>
      <style jsx>{`
        .root-console-shell{position:relative;min-height:100vh;display:grid;grid-template-columns:72px minmax(0,1fr);overflow:hidden;background:#020202;color:#e9dfc8;font-family:var(--sfi-font-mono),"JetBrains Mono",Consolas,monospace}.rc-bg{position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(circle at 50% 42%,rgba(190,155,72,.09),transparent 31%),radial-gradient(circle at 70% 18%,rgba(20,69,96,.14),transparent 34%),radial-gradient(circle at 22% 74%,rgba(26,52,69,.12),transparent 28%),linear-gradient(180deg,#020202,#050503 54%,#020202)}.rc-bg:before,.rc-bg:after{content:'';position:absolute;inset:0;pointer-events:none}.rc-bg:before{opacity:.46;background:radial-gradient(circle at 12% 22%,rgba(246,236,210,.42) 0 1px,transparent 1.4px),radial-gradient(circle at 42% 68%,rgba(246,236,210,.26) 0 1px,transparent 1.3px),radial-gradient(circle at 76% 34%,rgba(246,236,210,.22) 0 1px,transparent 1.2px);background-size:173px 149px,251px 211px,311px 241px}.rc-bg:after{opacity:.72;background:linear-gradient(rgba(216,182,81,.026) 1px,transparent 1px),linear-gradient(90deg,rgba(216,182,81,.022) 1px,transparent 1px),repeating-linear-gradient(0deg,transparent 0 7px,rgba(255,255,255,.014) 8px);background-size:38px 38px,38px 38px,100% 8px;mask-image:radial-gradient(circle at center,black 0 68%,transparent 100%)}.rc-rail,.rc-shell{position:relative;z-index:1}.rc-rail{min-height:100vh;border-right:1px solid rgba(216,182,81,.16);background:linear-gradient(180deg,rgba(7,6,4,.92),rgba(2,2,2,.96));box-shadow:inset -1px 0 0 rgba(255,255,255,.025),18px 0 60px rgba(0,0,0,.34);display:grid;grid-template-rows:112px 1fr;justify-items:center}.rc-mark{align-self:center;width:42px;height:80px;display:grid;place-items:center;border:1px solid rgba(216,182,81,.22);background:rgba(216,182,81,.055);box-shadow:0 0 28px rgba(216,182,81,.08)}.rc-mark span,.rc-mark b,.rc-hubs span,.rc-hubs em,.rc-topbar span,.rc-title em,.rc-footer,:global(.rc-tag){text-transform:uppercase;letter-spacing:.16em}.rc-mark span,.rc-hubs span,.rc-hubs em,.rc-topbar span{font-size:8px;color:#817660}.rc-mark b{font-size:10px;color:#f1d27b;font-weight:500;writing-mode:vertical-rl;text-orientation:mixed}.rc-hubs{width:100%;display:grid;align-content:start;justify-items:center;gap:8px}.rc-hubs button{width:48px;height:56px;display:grid;grid-template-rows:10px 1fr 10px;align-items:center;justify-items:center;border:1px solid rgba(216,182,81,.1);background:rgba(5,4,3,.4);color:rgba(233,223,200,.46);cursor:pointer}.rc-hubs button:hover,.rc-hubs button.active{border-color:rgba(241,210,123,.42);color:#f1d27b;background:rgba(216,182,81,.075);box-shadow:0 0 26px rgba(216,182,81,.1),inset 0 1px 0 rgba(255,255,255,.055)}.rc-hubs i svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.35;stroke-linecap:round;stroke-linejoin:round}.rc-shell{min-width:0;min-height:100vh;display:grid;grid-template-rows:58px minmax(0,1fr) 36px}.rc-topbar{display:grid;grid-template-columns:minmax(150px,220px) minmax(0,1fr) minmax(260px,360px);align-items:center;gap:14px;border-bottom:1px solid rgba(216,182,81,.14);background:linear-gradient(90deg,rgba(0,0,0,.74),rgba(8,7,5,.55),rgba(0,0,0,.72));padding:0 16px;box-shadow:0 18px 50px rgba(0,0,0,.28)}.rc-topbar b,.rc-status b,.rc-title b{display:block;font-weight:500}.rc-topbar>div:first-child b{margin-top:5px;font-size:11px;color:#f1d27b;letter-spacing:.12em}.rc-title{min-width:0;text-align:center}.rc-title b{margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;letter-spacing:.12em;color:#efe5cc;text-transform:uppercase}.rc-title em{display:block;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-style:normal;font-size:8px;color:#9f947a}.rc-status{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.rc-status section{min-width:0;border-left:1px solid rgba(216,182,81,.12);padding-left:10px}.rc-status b{margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;letter-spacing:.1em}.rc-main{min-width:0;min-height:0}.rc-footer{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(180px,1fr);align-items:center;overflow:hidden;border-top:1px solid rgba(216,182,81,.12);background:rgba(0,0,0,.68);color:#817660;font-size:8px}.rc-footer span{min-width:0;padding:0 13px;border-right:1px solid rgba(216,182,81,.08);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rc-footer b{color:#f1d27b;font-weight:500}:global(.rc-panel){border:1px solid rgba(216,182,81,.15);background:linear-gradient(180deg,rgba(8,7,5,.78),rgba(4,4,3,.68));box-shadow:inset 0 1px 0 rgba(241,210,123,.055),0 20px 58px rgba(0,0,0,.27);backdrop-filter:blur(14px)}:global(.rc-row){display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid rgba(216,182,81,.08);padding:8px 0}:global(.rc-tag){display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(216,182,81,.16);background:rgba(216,182,81,.055);padding:4px 6px;color:#c8a951;font-size:8px}:global(.rc-btn){border:1px solid rgba(216,182,81,.22);background:rgba(216,182,81,.065);color:#f1d27b;font:inherit;font-size:9px;letter-spacing:.12em;text-transform:uppercase;padding:8px 10px;cursor:pointer}.tone-ok,:global(.tone-ok){color:#8bd27c}.tone-watch,:global(.tone-watch){color:#d8b651}.tone-bad,:global(.tone-bad){color:#e36a52}.tone-muted,:global(.tone-muted){color:#817660}@media(max-width:1180px){.root-console-shell{grid-template-columns:58px minmax(0,1fr);overflow:auto}.rc-rail{position:sticky;top:0}.rc-hubs button{width:40px}.rc-topbar,.rc-footer{grid-template-columns:1fr;grid-auto-flow:row}.rc-topbar{min-height:136px;padding:12px 14px}.rc-title{text-align:left}}@media(max-width:760px){.root-console-shell{grid-template-columns:1fr}.rc-rail{min-height:auto;grid-template-rows:auto;grid-template-columns:68px 1fr;border-right:0;border-bottom:1px solid rgba(216,182,81,.16);padding:8px}.rc-mark{height:48px}.rc-hubs{grid-auto-flow:column;grid-auto-columns:44px;overflow-x:auto;justify-content:start;padding:0}.rc-shell{grid-template-rows:auto minmax(0,1fr) auto}}
      `}</style>
    </main>
  );
}
