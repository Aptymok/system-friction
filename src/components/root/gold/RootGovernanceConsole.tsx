'use client';

import { useState } from 'react';
import type { RootGovernanceState } from '@/lib/root/gold/rootGovernanceState';
import { RootAgentsRail } from './RootAgentsRail';
import { RootGoldHeader } from './RootGoldHeader';
import { RootGovernanceEnginesBar } from './RootGovernanceEnginesBar';
import { RootGovernanceField } from './RootGovernanceField';
import { RootLowerGovernanceModules } from './RootLowerGovernanceModules';
import { RootMobileGovernance } from './RootMobileGovernance';
import { RootProjectionsRail } from './RootProjectionsRail';
import type { RootGovernanceViewMode } from './visual/rootGoldTypes';

export function RootGovernanceConsole({ state }: { state: RootGovernanceState }) {
  const [mode, setMode] = useState<RootGovernanceViewMode>('topologia');
  const [playing, setPlaying] = useState(true);
  return (
    <div className="sfi-root-gold">
      <RootGoldStyles />
      <div className="sfi-root-gold__desktop">
        <RootGoldHeader state={state} />
        <div className="sfi-root-gold__grid">
          <RootAgentsRail state={state} />
          <RootGovernanceField state={state} mode={mode} playing={playing} onMode={setMode} onToggle={() => setPlaying((value) => !value)} />
          <RootProjectionsRail state={state} />
          <RootLowerGovernanceModules state={state} />
          <RootGovernanceEnginesBar state={state} />
        </div>
      </div>
      <RootMobileGovernance state={state} />
    </div>
  );
}

function RootGoldStyles() {
  return <style jsx global>{`
.sfi-root-gold {
  --sfi-bg: #050608;
  --sfi-bg-soft: #080b0f;
  --sfi-panel: rgba(6, 9, 12, 0.92);
  --sfi-border: rgba(193, 132, 45, 0.38);
  --sfi-border-soft: rgba(193, 132, 45, 0.18);
  --sfi-gold: #c9933a;
  --sfi-gold-bright: #f4c76a;
  --sfi-amber: #e2a13a;
  --sfi-text: #d8d2c2;
  --sfi-muted: #7c7465;
  --sfi-danger: #d45c42;
  --sfi-ok: #d7b56d;
  min-height: 100vh;
  background: radial-gradient(circle at 50% 30%, rgba(201,147,58,.08), transparent 34%), var(--sfi-bg);
  color: var(--sfi-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  letter-spacing: .04em;
}
.sfi-root-gold * { box-sizing: border-box; }
.sfi-root-gold button, .sfi-root-gold input, .sfi-root-gold select { font: inherit; }
.sfi-root-gold button { color: inherit; background: transparent; cursor: pointer; }
.sfi-root-gold__desktop { min-height: 100vh; padding: 8px; }
.sfi-root-gold__header { height: 72px; display: grid; grid-template-columns: 520px 1fr 430px; align-items: center; border: 1px solid var(--sfi-border); background: rgba(5,6,8,.96); }
.sfi-root-gold__brand, .sfi-root-gold__nav, .sfi-root-gold__system { height: 100%; display: flex; align-items: center; }
.sfi-root-gold__brand { gap: 15px; padding: 0 22px; border-right: 1px solid var(--sfi-border-soft); }
.sfi-root-gold__sunmark { width: 34px; height: 34px; position: relative; border: 1px solid rgba(244,199,106,.55); border-radius: 50%; }
.sfi-root-gold__sunmark::before, .sfi-root-gold__sunmark::after { content: ""; position: absolute; inset: -8px; border: 1px dashed rgba(244,199,106,.3); border-radius: 50%; }
.sfi-root-gold__sunmark span { position: absolute; inset: 11px; background: var(--sfi-gold-bright); border-radius: 50%; box-shadow: 0 0 16px rgba(244,199,106,.55); }
.sfi-root-gold__brand-sfi { font-family: Georgia, serif; color: #eee1c5; font-size: 32px; letter-spacing: .1em; }
.sfi-root-gold__brand-name { font: 700 9px/1.35 ui-monospace, monospace; letter-spacing: .32em; }
.sfi-root-gold__slash { color: var(--sfi-gold); font-size: 25px; }
.sfi-root-gold__route-word { color: var(--sfi-gold); font: 700 17px ui-monospace, monospace; letter-spacing: .24em; white-space: nowrap; }
.sfi-root-gold__nav { justify-content: center; gap: clamp(20px, 3.2vw, 54px); color: #a99a80; font: 700 10px ui-monospace, monospace; letter-spacing: .32em; }
.sfi-root-gold__nav .active { color: var(--sfi-gold-bright); }
.sfi-root-gold__system { justify-content: flex-end; gap: 14px; padding: 0 16px; border-left: 1px solid var(--sfi-border-soft); color: var(--sfi-muted); font: 700 9px ui-monospace, monospace; letter-spacing: .16em; }
.sfi-root-gold__system div { display: grid; gap: 6px; padding-left: 12px; border-left: 1px solid var(--sfi-border-soft); }
.sfi-root-gold__system strong { color: var(--sfi-gold-bright); }
.sfi-root-gold__system .is-critical, .sfi-root-gold__system .is-offline { color: var(--sfi-danger); }
.sfi-root-gold__grid { display: grid; grid-template-columns: 350px minmax(720px, 1fr) 370px; grid-template-rows: minmax(520px, 55vh) 265px 132px; gap: 8px; margin-top: 8px; }
.sfi-root-gold__panel { position: relative; overflow: hidden; border: 1px solid var(--sfi-border); background: linear-gradient(180deg, rgba(8,11,15,.96), rgba(4,6,8,.94)); box-shadow: inset 0 0 0 1px rgba(244,199,106,.035); }
.sfi-root-gold__panel h1, .sfi-root-gold__panel h2, .sfi-root-gold__panel h3, .sfi-root-gold__panel p { margin: 0; }
.sfi-root-gold__panel h2 { color: #e6dcc5; font: 700 12px ui-monospace, monospace; letter-spacing: .28em; }
.sfi-root-gold__panel p { color: var(--sfi-muted); font: 600 11px/1.55 ui-monospace, monospace; }
.sfi-root-gold__panel button { border: 0; color: var(--sfi-gold); font: 700 9px ui-monospace, monospace; letter-spacing: .16em; }
.sfi-root-gold__panel-title { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px 8px; border-bottom: 1px solid var(--sfi-border-soft); gap: 12px; }
.sfi-root-gold__panel-title span { color: var(--sfi-gold); font: 700 9px ui-monospace, monospace; letter-spacing: .16em; }
.sfi-root-gold__left-rail, .sfi-root-gold__right-rail { display: grid; gap: 8px; min-height: 0; }
.sfi-root-gold__left-rail { grid-row: 1 / span 2; grid-template-rows: 1.08fr .88fr 1fr; }
.sfi-root-gold__right-rail { grid-column: 3; grid-template-rows: 1.18fr .82fr; }
.sfi-root-gold__tabs { display: flex; gap: 6px; padding: 10px 14px; border-bottom: 1px solid var(--sfi-border-soft); }
.sfi-root-gold__tabs button { border: 1px solid var(--sfi-border-soft); padding: 5px 8px; color: var(--sfi-muted); }
.sfi-root-gold__tabs button.active { color: var(--sfi-gold-bright); border-color: var(--sfi-border); }
.sfi-root-gold__agent-list, .sfi-root-gold__compact-list, .sfi-root-gold__projection-list { padding: 8px 14px; }
.sfi-root-gold__agent-list div, .sfi-root-gold__compact-list div, .sfi-root-gold__projection-list div { display: grid; grid-template-columns: 72px 1fr auto auto; gap: 8px; align-items: center; min-height: 32px; border-bottom: 1px solid rgba(193,132,45,.12); color: #a99a80; font: 700 10px ui-monospace, monospace; }
.sfi-root-gold__projection-list div { grid-template-columns: 78px 1fr auto; }
.sfi-root-gold__agent-list em, .sfi-root-gold__compact-list em, .sfi-root-gold__projection-list em { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #b8ad96; font-style: normal; }
.sfi-root-gold__agent-list strong, .sfi-root-gold__compact-list strong, .sfi-root-gold__projection-list strong { color: var(--sfi-gold-bright); }
.sfi-root-gold__agent-list i, .sfi-root-gold__compact-list i { color: var(--sfi-muted); font-style: normal; text-transform: uppercase; }
.sfi-root-gold__agent-list .is-blocked, .sfi-root-gold__agent-list .is-offline { color: var(--sfi-danger); }
.sfi-root-gold__empty { padding: 12px; color: var(--sfi-muted) !important; }
.sfi-root-gold__main { grid-column: 2; display: grid; grid-template-rows: auto 1fr auto; min-height: 0; }
.sfi-root-gold__main-head { display: flex; justify-content: space-between; gap: 16px; padding: 13px 16px 9px; border-bottom: 1px solid var(--sfi-border-soft); }
.sfi-root-gold__main-head h1 { color: var(--sfi-gold); font: 700 14px ui-monospace, monospace; letter-spacing: .34em; }
.sfi-root-gold__main-head p { margin-top: 5px; }
.sfi-root-gold__controls { display: flex; align-items: center; gap: 8px; color: var(--sfi-muted); font: 700 9px ui-monospace, monospace; letter-spacing: .14em; }
.sfi-root-gold__controls button { border: 1px solid var(--sfi-border-soft); padding: 5px 10px; color: var(--sfi-muted); display: inline-flex; align-items: center; }
.sfi-root-gold__controls button.active { color: var(--sfi-gold-bright); border-color: var(--sfi-border); }
.sfi-root-gold__topology-stage { position: relative; min-height: 400px; }
.sfi-root-gold__topology-canvas { display: block; width: 100%; height: 100%; min-height: 360px; }
.sfi-root-gold__metrics-row { display: grid; grid-template-columns: repeat(5, 1fr); border-top: 1px solid var(--sfi-border-soft); }
.sfi-root-gold__metrics-row span, .sfi-root-gold__module-data span { padding: 12px 10px; border-right: 1px solid var(--sfi-border-soft); color: var(--sfi-muted); font: 700 9px ui-monospace, monospace; letter-spacing: .1em; }
.sfi-root-gold__metrics-row strong, .sfi-root-gold__module-data strong { display: block; margin-top: 5px; color: var(--sfi-gold-bright); font-size: 18px; }
.sfi-root-gold__provenance { padding-bottom: 14px; }
.sfi-root-gold__provenance p { padding: 8px 14px 0; }
.sfi-root-gold__lower-grid { grid-column: 2 / span 2; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; min-height: 0; }
.sfi-root-gold__lower-grid article { padding: 14px; }
.sfi-root-gold__mini-world, .sfi-root-gold__vector-preview { width: 100%; height: 104px; margin-top: 10px; fill: none; stroke: rgba(201,147,58,.42); }
.sfi-root-gold__mini-world circle, .sfi-root-gold__vector-preview circle { fill: rgba(244,199,106,.78); stroke: rgba(212,92,66,.6); filter: drop-shadow(0 0 8px rgba(244,199,106,.45)); }
.sfi-root-gold__module-data { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--sfi-border-soft); margin-top: 8px; }
.sfi-root-gold__atlas-list, .sfi-root-gold__tools-list { display: grid; gap: 5px; margin-top: 8px; color: var(--sfi-muted); font: 700 9px ui-monospace, monospace; }
.sfi-root-gold__atlas-list div { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; }
.sfi-root-gold__tools-list div { display: grid; grid-template-columns: 1fr auto; gap: 5px 8px; border-bottom: 1px solid var(--sfi-border-soft); padding-bottom: 5px; }
.sfi-root-gold__tools-list em { grid-column: 1 / -1; font-style: normal; font-size: 8px; line-height: 1.35; color: #776f61; }
.sfi-root-gold__engines { grid-column: 1 / span 3; }
.sfi-root-gold__engine-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; padding: 13px 18px 18px; }
.sfi-root-gold__engine-grid div { display: grid; grid-template-columns: 46px 1fr auto; gap: 4px 10px; align-items: center; border-right: 1px solid var(--sfi-border-soft); min-width: 0; }
.sfi-root-gold__engine-grid svg { grid-row: 1 / span 3; width: 42px; height: 42px; fill: none; stroke: var(--sfi-gold-bright); stroke-width: 1; }
.sfi-root-gold__engine-grid span { color: var(--sfi-gold); font: 700 10px ui-monospace, monospace; }
.sfi-root-gold__engine-grid em { grid-column: 2 / span 2; color: var(--sfi-muted); font: 600 9px/1.25 ui-monospace, monospace; font-style: normal; }
.sfi-root-gold__engine-grid strong { color: var(--sfi-gold-bright); }
.sfi-root-gold__engine-grid i { color: var(--sfi-muted); font-style: normal; }
.sfi-root-gold__mobile { display: none; }
@media (max-width: 1180px) {
  .sfi-root-gold__desktop { display: none; }
  .sfi-root-gold__mobile { display: block; min-height: 100vh; padding: 14px 14px 82px; background: var(--sfi-bg); }
  .sfi-root-gold__mobile-header, .sfi-root-gold__mobile-panel, .sfi-root-gold__mobile-nav { border: 1px solid var(--sfi-border); background: rgba(8,11,15,.92); }
  .sfi-root-gold__mobile-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 14px; margin-bottom: 10px; }
  .sfi-root-gold__mobile-header span { display: block; color: var(--sfi-text); font: 700 10px ui-monospace, monospace; letter-spacing: .22em; }
  .sfi-root-gold__mobile-header strong { display: block; margin-top: 5px; color: var(--sfi-gold); font: 700 18px ui-monospace, monospace; letter-spacing: .24em; }
  .sfi-root-gold__mobile-panel { margin-bottom: 10px; padding: 14px; overflow: hidden; }
  .sfi-root-gold__mobile-kicker { color: #beb49c; font: 700 10px ui-monospace, monospace; letter-spacing: .16em; text-transform: uppercase; }
  .sfi-root-gold__mobile-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
  .sfi-root-gold__mobile-summary span { color: var(--sfi-muted); font: 700 9px ui-monospace, monospace; }
  .sfi-root-gold__mobile-summary strong { display: block; color: var(--sfi-gold-bright); font-size: 20px; margin-top: 5px; }
  .sfi-root-gold__mobile-topology { height: 310px; padding-bottom: 0; }
  .sfi-root-gold__mobile-topology .sfi-root-gold__topology-canvas { min-height: 250px; }
  .sfi-root-gold__mobile-row { display: grid; grid-template-columns: 86px 1fr auto; gap: 8px; align-items: center; min-height: 31px; border-bottom: 1px solid var(--sfi-border-soft); color: #a99a80; font: 700 9px ui-monospace, monospace; }
  .sfi-root-gold__mobile-row em { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-style: normal; color: #b8ad96; }
  .sfi-root-gold__mobile-row strong, .sfi-root-gold__mobile-panel > strong { color: var(--sfi-gold-bright); }
  .sfi-root-gold__mobile-panel p { margin-top: 10px; color: var(--sfi-muted); font: 600 11px/1.45 ui-monospace, monospace; }
  .sfi-root-gold__mobile-nav { position: fixed; left: 14px; right: 14px; bottom: 12px; z-index: 20; display: grid; grid-template-columns: repeat(5, 1fr); padding: 10px 4px; }
  .sfi-root-gold__mobile-nav span { text-align: center; color: var(--sfi-muted); font: 700 8px ui-monospace, monospace; letter-spacing: .04em; }
  .sfi-root-gold__mobile-nav span:first-child { color: var(--sfi-gold-bright); }
}
@media (max-width: 1500px) {
  .sfi-root-gold__header { grid-template-columns: 460px 1fr 390px; }
  .sfi-root-gold__grid { grid-template-columns: 310px minmax(580px, 1fr) 320px; }
  .sfi-root-gold__engine-grid { grid-template-columns: repeat(3, 1fr); }
}
`}</style>;
}
