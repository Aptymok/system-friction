import type { StudioGoldState } from '@/lib/studio/gold/studioGoldState';
import { StudioEnginesBar } from './StudioEnginesBar';
import { StudioGoldHeader } from './StudioGoldHeader';
import { StudioLeftRail } from './StudioLeftRail';
import { StudioLowerAnalysisGrid } from './StudioLowerAnalysisGrid';
import { StudioMainWaveLab } from './StudioMainWaveLab';
import { StudioMobileConsole } from './StudioMobileConsole';
import { StudioRightLensRail } from './StudioRightLensRail';

export function StudioGoldConsole({ state }: { state: StudioGoldState }) {
  return (
    <div className="sfi-studio-gold">
      <StudioGoldStyles />
      <div className="sfi-studio-gold__desktop">
        <StudioGoldHeader state={state} />
        <div className="sfi-studio-gold__grid">
          <StudioLeftRail state={state} />
          <StudioMainWaveLab state={state} />
          <StudioRightLensRail state={state} />
          <StudioLowerAnalysisGrid state={state} />
          <StudioEnginesBar state={state} />
        </div>
      </div>
      <StudioMobileConsole state={state} />
    </div>
  );
}

function StudioGoldStyles() {
  return (
    <style>{`
.sfi-studio-gold {
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
  background:
    linear-gradient(rgba(193, 132, 45, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(193, 132, 45, 0.025) 1px, transparent 1px),
    radial-gradient(circle at 50% -10%, rgba(201, 147, 58, 0.10), transparent 34%),
    var(--sfi-bg);
  background-size: 36px 36px, 36px 36px, auto, auto;
  color: var(--sfi-text);
  font-family: "Arial Narrow", "Roboto Condensed", "DIN Condensed", Arial, sans-serif;
  letter-spacing: 0;
}

.sfi-studio-gold * { box-sizing: border-box; }
.sfi-studio-gold button { font: inherit; color: inherit; background: transparent; border: 0; cursor: default; }

.sfi-studio-gold__desktop {
  min-height: 100vh;
  padding: 8px;
}

.sfi-studio-gold__header {
  height: 72px;
  display: grid;
  grid-template-columns: 430px 1fr 330px;
  align-items: center;
  border: 1px solid var(--sfi-border);
  background: rgba(5, 6, 8, 0.96);
}

.sfi-studio-gold__brand,
.sfi-studio-gold__system,
.sfi-studio-gold__nav {
  height: 100%;
  display: flex;
  align-items: center;
}

.sfi-studio-gold__brand { gap: 16px; padding: 0 22px; border-right: 1px solid var(--sfi-border-soft); }
.sfi-studio-gold__sunmark { width: 34px; height: 34px; position: relative; border: 1px solid rgba(244, 199, 106, 0.55); border-radius: 50%; }
.sfi-studio-gold__sunmark::before, .sfi-studio-gold__sunmark::after {
  content: ""; position: absolute; inset: -8px; border: 1px dashed rgba(244, 199, 106, 0.34); border-radius: 50%;
}
.sfi-studio-gold__sunmark span { position: absolute; inset: 11px; background: var(--sfi-gold-bright); border-radius: 50%; box-shadow: 0 0 16px rgba(244, 199, 106, 0.55); }
.sfi-studio-gold__brand-sfi { font-family: Georgia, serif; font-size: 32px; color: #eee1c5; letter-spacing: 0.12em; }
.sfi-studio-gold__brand-name { font: 700 9px/1.35 ui-monospace, monospace; letter-spacing: 0.32em; color: var(--sfi-text); }
.sfi-studio-gold__slash { color: var(--sfi-gold); font-size: 25px; }
.sfi-studio-gold__studio-word { color: var(--sfi-gold); font: 700 18px ui-monospace, monospace; letter-spacing: 0.36em; }
.sfi-studio-gold__nav { justify-content: center; gap: clamp(24px, 4vw, 64px); color: #a99a80; font: 700 10px ui-monospace, monospace; letter-spacing: 0.36em; }
.sfi-studio-gold__system { justify-content: flex-end; gap: 18px; padding: 0 18px; border-left: 1px solid var(--sfi-border-soft); color: var(--sfi-muted); font: 700 9px ui-monospace, monospace; letter-spacing: 0.22em; }
.sfi-studio-gold__system div { display: grid; gap: 6px; padding-left: 14px; border-left: 1px solid var(--sfi-border-soft); }
.sfi-studio-gold__system strong { color: var(--sfi-gold-bright); }
.sfi-studio-gold__system strong::before { content: ""; display: inline-block; width: 7px; height: 7px; margin-right: 6px; background: currentColor; border-radius: 50%; box-shadow: 0 0 10px currentColor; }
.sfi-studio-gold__system .is-critical, .sfi-studio-gold__system .is-offline { color: var(--sfi-danger); }
.sfi-studio-gold__time strong::before { content: none; }
.sfi-studio-gold__mobile-menu { display: none; }

.sfi-studio-gold__grid {
  display: grid;
  grid-template-columns: 340px minmax(640px, 1fr) 380px;
  grid-template-rows: minmax(430px, 46vh) auto 150px;
  gap: 8px;
  margin-top: 8px;
}

.sfi-studio-gold__panel {
  position: relative;
  border: 1px solid var(--sfi-border);
  background: linear-gradient(180deg, rgba(8, 11, 15, 0.96), rgba(4, 6, 8, 0.94));
  box-shadow: inset 0 0 0 1px rgba(244, 199, 106, 0.035);
  overflow: hidden;
}
.sfi-studio-gold__panel::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(120deg, transparent, rgba(244, 199, 106, 0.035), transparent 44%);
}
.sfi-studio-gold__panel h1, .sfi-studio-gold__panel h2, .sfi-studio-gold__panel h3, .sfi-studio-gold__panel p { margin: 0; }
.sfi-studio-gold__panel h2 { color: #e6dcc5; font: 700 12px ui-monospace, monospace; letter-spacing: 0.32em; }
.sfi-studio-gold__panel h2 span, .sfi-studio-gold__panel-title button, .sfi-studio-gold__action { color: var(--sfi-gold); }
.sfi-studio-gold__panel p { color: var(--sfi-muted); font: 500 11px/1.5 ui-monospace, monospace; letter-spacing: 0.08em; }
.sfi-studio-gold__left-rail, .sfi-studio-gold__right-rail { display: grid; gap: 8px; min-height: 0; }
.sfi-studio-gold__left-rail { grid-row: 1 / span 2; grid-template-rows: auto auto 1fr; }
.sfi-studio-gold__right-rail { grid-column: 3; grid-template-rows: 1fr 1fr; }
.sfi-studio-gold__panel-title { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px 8px; border-bottom: 1px solid var(--sfi-border-soft); }
.sfi-studio-gold__panel-title button, .sfi-studio-gold__action { font: 700 9px ui-monospace, monospace; letter-spacing: 0.18em; }
.sfi-studio-gold__active-case { padding-bottom: 12px; }
.sfi-studio-gold__eyebrow { padding: 12px 14px 0; color: var(--sfi-gold) !important; font-weight: 700 !important; }
.sfi-studio-gold__active-case h3 { padding: 6px 14px 0; color: var(--sfi-gold-bright); font: 700 18px ui-monospace, monospace; letter-spacing: 0.22em; text-transform: uppercase; }
.sfi-studio-gold__case-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 8px 14px 10px; color: var(--sfi-muted); font: 700 10px ui-monospace, monospace; letter-spacing: 0.08em; text-transform: uppercase; }
.sfi-studio-gold__case-stats { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--sfi-border-soft); border-bottom: 1px solid var(--sfi-border-soft); }
.sfi-studio-gold__case-stats div { padding: 10px 14px; border-right: 1px solid var(--sfi-border-soft); }
.sfi-studio-gold__case-stats strong { display: block; color: var(--sfi-gold-bright); font: 700 20px ui-monospace, monospace; }
.sfi-studio-gold__case-stats span, .sfi-studio-gold__hypothesis span, .sfi-studio-gold__synthesis span { display: block; color: var(--sfi-gold); font: 700 9px ui-monospace, monospace; letter-spacing: 0.18em; }
.sfi-studio-gold__hypothesis { padding: 14px; }
.sfi-studio-gold__hypothesis p { margin-top: 8px; color: #b9ad93; }
.sfi-studio-gold__hypothesis.compact { padding: 8px 12px; border-top: 1px solid var(--sfi-border-soft); border-bottom: 1px solid var(--sfi-border-soft); }
.sfi-studio-gold__list { padding: 8px 14px; }
.sfi-studio-gold__row { display: grid; grid-template-columns: 52px 1fr auto; gap: 10px; align-items: center; min-height: 28px; border-bottom: 1px solid rgba(193, 132, 45, 0.11); color: #a99a80; font: 600 11px ui-monospace, monospace; }
.sfi-studio-gold__row em { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-style: normal; color: #a7a08d; }
.sfi-studio-gold__row strong { color: var(--sfi-gold-bright); font-weight: 700; }
.sfi-studio-gold__empty { padding: 12px 0; color: #8d826e !important; }
.sfi-studio-gold__total { display: flex; justify-content: space-between; padding: 12px 14px; border-top: 1px solid var(--sfi-border-soft); color: var(--sfi-gold); font: 700 11px ui-monospace, monospace; letter-spacing: 0.18em; }

.sfi-studio-gold__wave-lab { grid-column: 2; min-height: 0; display: grid; grid-template-rows: auto 1fr 70px; }
.sfi-studio-gold__wave-head { display: flex; justify-content: space-between; gap: 16px; padding: 13px 16px 9px; border-bottom: 1px solid var(--sfi-border-soft); }
.sfi-studio-gold__wave-head h1 { color: #ddd4c1; font: 700 13px ui-monospace, monospace; letter-spacing: 0.28em; }
.sfi-studio-gold__wave-head h1 span { color: var(--sfi-gold); }
.sfi-studio-gold__wave-head p { margin-top: 5px; }
.sfi-studio-gold__wave-controls { display: flex; align-items: center; gap: 10px; color: var(--sfi-muted); font: 700 9px ui-monospace, monospace; letter-spacing: 0.14em; }
.sfi-studio-gold__wave-controls button { border: 1px solid var(--sfi-border-soft); padding: 5px 15px; color: var(--sfi-gold); letter-spacing: 0.24em; }
.sfi-studio-gold__wave-stage { min-height: 260px; position: relative; }
.sfi-studio-gold__wave-canvas { display: block; width: 100%; height: 100%; min-height: 220px; }
.sfi-studio-gold__metric-strip { display: grid; grid-template-columns: repeat(6, 1fr); border-top: 1px solid var(--sfi-border-soft); }
.sfi-studio-gold__metric-strip div { padding: 12px 12px; border-right: 1px solid var(--sfi-border-soft); min-width: 0; }
.sfi-studio-gold__metric-strip span { display: block; color: var(--sfi-muted); font: 700 9px ui-monospace, monospace; letter-spacing: 0.14em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sfi-studio-gold__metric-strip strong { color: var(--sfi-gold-bright); font: 500 24px ui-monospace, monospace; }
.sfi-studio-gold__metric-strip em { color: #8d826e; font: 700 9px ui-monospace, monospace; font-style: normal; }

.sfi-studio-gold__lens-panel { padding: 16px; }
.sfi-studio-gold__lens-panel h2 { margin-bottom: 5px; }
.sfi-studio-gold__lens-body { display: grid; grid-template-columns: 160px 1fr; gap: 16px; align-items: center; margin-top: 18px; }
.sfi-studio-gold__radar, .sfi-studio-gold__diamond, .sfi-studio-gold__matrix-radar, .sfi-studio-gold__pmv-field, .sfi-studio-gold__engine-icon { width: 100%; stroke: rgba(201, 147, 58, 0.72); fill: none; overflow: visible; }
.sfi-studio-gold__radar polygon, .sfi-studio-gold__diamond polygon, .sfi-studio-gold__matrix-radar polygon { stroke: rgba(201, 147, 58, 0.35); }
.sfi-studio-gold__radar .is-live, .sfi-studio-gold__matrix-radar .is-live { fill: rgba(201, 147, 58, 0.14); stroke: var(--sfi-gold-bright); }
.sfi-studio-gold__radar circle, .sfi-studio-gold__diamond circle, .sfi-studio-gold__matrix-radar circle, .sfi-studio-gold__pmv-field circle { fill: rgba(244, 199, 106, 0.82); stroke: rgba(244, 199, 106, 0.72); }
.sfi-studio-gold__lens-values { display: grid; gap: 12px; }
.sfi-studio-gold__lens-values div { display: flex; justify-content: space-between; gap: 16px; border-bottom: 1px solid var(--sfi-border-soft); padding-bottom: 5px; color: var(--sfi-muted); font: 700 10px ui-monospace, monospace; letter-spacing: 0.14em; }
.sfi-studio-gold__lens-values strong { color: var(--sfi-gold-bright); font-size: 14px; }

.sfi-studio-gold__lower-grid { grid-column: 2 / span 2; display: grid; grid-template-columns: 1.18fr 1fr 1fr 1.06fr 1fr; gap: 8px; min-height: 330px; }
.sfi-studio-gold__lower-grid article { min-width: 0; padding: 13px 14px; }
.sfi-studio-gold__lower-grid article > p { margin-top: 5px; }
.sfi-studio-gold__object-eval { display: grid; grid-template-rows: auto auto 1fr auto auto; gap: 10px; }
.sfi-studio-gold__object-eval .sfi-studio-gold__panel-title { margin: -13px -14px 0; }
.sfi-studio-gold__object-head strong { display: block; color: var(--sfi-gold-bright); font: 700 14px ui-monospace, monospace; letter-spacing: 0.1em; text-transform: uppercase; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sfi-studio-gold__object-head span { display: block; margin-top: 5px; color: var(--sfi-muted); font: 700 9px ui-monospace, monospace; letter-spacing: 0.12em; }
.sfi-studio-gold__object-measures { display: grid; gap: 6px; }
.sfi-studio-gold__object-measures div { display: grid; grid-template-columns: 54px 1fr auto; gap: 8px; align-items: center; min-height: 24px; border-bottom: 1px solid var(--sfi-border-soft); color: var(--sfi-muted); font: 700 9px ui-monospace, monospace; }
.sfi-studio-gold__object-measures em { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-style: normal; color: #b8ad96; }
.sfi-studio-gold__object-measures strong { color: var(--sfi-gold-bright); font-size: 10px; }
.sfi-studio-gold__agent-strip { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; }
.sfi-studio-gold__agent-strip span { min-width: 0; padding: 6px 5px; border: 1px solid var(--sfi-border-soft); color: var(--sfi-muted); font: 700 8px/1.25 ui-monospace, monospace; text-transform: uppercase; }
.sfi-studio-gold__agent-strip span.is-active { color: var(--sfi-gold-bright); border-color: var(--sfi-border); }
.sfi-studio-gold__agent-strip span.is-blocked { color: var(--sfi-danger); opacity: .78; }
.sfi-studio-gold__agent-strip strong { display: block; margin-top: 4px; color: currentColor; }
.sfi-studio-gold__matrix-radar { height: 190px; margin-top: 8px; }
.sfi-studio-gold__matrix-radar text { fill: var(--sfi-muted); font: 700 8px ui-monospace, monospace; text-anchor: middle; letter-spacing: 0.12em; }
.sfi-studio-gold__panel-foot, .sfi-studio-gold__mini-metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; border-top: 1px solid var(--sfi-border-soft); padding-top: 10px; color: var(--sfi-muted); font: 700 9px ui-monospace, monospace; letter-spacing: 0.12em; }
.sfi-studio-gold__panel-foot strong, .sfi-studio-gold__mini-metrics strong { display: block; margin-top: 4px; color: var(--sfi-gold-bright); font-size: 16px; }
.sfi-studio-gold__pmv-meta { display: grid; gap: 5px; margin: 14px 0 8px; color: var(--sfi-gold); font: 700 10px ui-monospace, monospace; letter-spacing: 0.12em; }
.sfi-studio-gold__pmv-meta strong { color: var(--sfi-gold-bright); font-size: 15px; }
.sfi-studio-gold__pmv-meta em { color: var(--sfi-muted); font-style: normal; }
.sfi-studio-gold__pmv-field { height: 118px; }
.sfi-studio-gold__pmv-field polyline, .sfi-studio-gold__spark polyline { fill: none; stroke: var(--sfi-gold-bright); stroke-width: 1.3; }
.sfi-studio-gold__mini-metrics { grid-template-columns: repeat(4, 1fr); font-size: 8px; }
.sfi-studio-gold__trajectory-list { display: grid; gap: 8px; margin: 14px 0 10px; }
.sfi-studio-gold__trajectory-list div { display: grid; grid-template-columns: minmax(88px, 1fr) 96px 36px; gap: 10px; align-items: center; color: var(--sfi-muted); font: 700 9px ui-monospace, monospace; }
.sfi-studio-gold__trajectory-list span strong { display: block; color: #c7b790; }
.sfi-studio-gold__trajectory-list em { color: var(--sfi-gold-bright); font-style: normal; text-align: right; }
.sfi-studio-gold__spark { width: 96px; height: 28px; }
.sfi-studio-gold__synthesis { display: grid; grid-template-rows: auto auto repeat(3, 1fr) auto; gap: 10px; }
.sfi-studio-gold__synthesis div { border-top: 1px solid var(--sfi-border-soft); padding-top: 9px; min-height: 0; }
.sfi-studio-gold__synthesis p { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.sfi-studio-gold__synthesis footer { display: flex; justify-content: space-between; border-top: 1px solid var(--sfi-border-soft); padding-top: 11px; color: var(--sfi-gold); font: 700 10px ui-monospace, monospace; letter-spacing: 0.12em; }
.sfi-studio-gold__synthesis footer strong { color: var(--sfi-gold-bright); font-size: 18px; }

.sfi-studio-gold__engines { grid-column: 1 / span 3; padding: 14px 16px 18px; }
.sfi-studio-gold__engine-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 18px; margin-top: 14px; }
.sfi-studio-gold__engine { display: grid; grid-template-columns: 58px 1fr; gap: 12px; align-items: center; border-right: 1px solid var(--sfi-border-soft); min-width: 0; }
.sfi-studio-gold__engine h3 { color: var(--sfi-gold); font: 700 10px ui-monospace, monospace; letter-spacing: 0.12em; text-transform: uppercase; }
.sfi-studio-gold__engine p { margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sfi-studio-gold__engine strong { display: block; margin-top: 8px; color: var(--sfi-gold-bright); font: 700 16px ui-monospace, monospace; }
.sfi-studio-gold__engine-icon { width: 58px; height: 58px; }
.sfi-studio-gold__engine-icon polygon { fill: rgba(201, 147, 58, 0.12); }
.sfi-studio-gold__engine.is-blocked { opacity: 0.58; }

.sfi-studio-gold__mobile-console { display: none; }

@media (max-width: 1180px) {
  .sfi-studio-gold__desktop { display: none; }
  .sfi-studio-gold__mobile-console {
    min-height: 100vh;
    display: block;
    padding: 14px 14px 82px;
    background: var(--sfi-bg);
  }
  .sfi-studio-gold__mobile-status,
  .sfi-studio-gold__mobile-header,
  .sfi-studio-gold__mobile-panel,
  .sfi-studio-gold__bottom-nav {
    border: 1px solid var(--sfi-border);
    background: rgba(8, 11, 15, 0.92);
  }
  .sfi-studio-gold__mobile-status { display: flex; justify-content: space-between; padding: 8px 12px; color: #efe0bd; font: 700 11px ui-monospace, monospace; letter-spacing: 0.08em; border-bottom: 0; }
  .sfi-studio-gold__mobile-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 14px; margin-bottom: 10px; }
  .sfi-studio-gold__mobile-header span { display: block; color: var(--sfi-text); font: 700 10px ui-monospace, monospace; letter-spacing: 0.22em; }
  .sfi-studio-gold__mobile-header strong { display: block; margin-top: 5px; color: var(--sfi-gold); font: 700 18px ui-monospace, monospace; letter-spacing: 0.32em; }
  .sfi-studio-gold__mobile-panel { margin-bottom: 10px; padding: 14px; overflow: hidden; }
  .sfi-studio-gold__mobile-panel-title { color: #beb49c; font: 700 10px ui-monospace, monospace; letter-spacing: 0.16em; text-transform: uppercase; }
  .sfi-studio-gold__mobile-panel h2 { margin: 8px 0 4px; color: var(--sfi-gold-bright); font: 700 16px ui-monospace, monospace; letter-spacing: 0.12em; text-transform: uppercase; }
  .sfi-studio-gold__mobile-panel p { margin: 4px 0 0; color: var(--sfi-muted); font: 600 11px/1.45 ui-monospace, monospace; }
  .sfi-studio-gold__mobile-triplet { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; margin-top: 12px; border-top: 1px solid var(--sfi-border-soft); }
  .sfi-studio-gold__mobile-triplet span { padding-top: 10px; color: var(--sfi-muted); font: 700 9px ui-monospace, monospace; letter-spacing: 0.08em; }
  .sfi-studio-gold__mobile-triplet strong, .sfi-studio-gold__mobile-panel > strong { display: block; margin-top: 5px; color: var(--sfi-gold-bright); font-size: 18px; }
  .sfi-studio-gold__mobile-wave { height: 150px; margin: 10px -4px 0; border: 1px solid var(--sfi-border-soft); }
  .sfi-studio-gold__mobile-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .sfi-studio-gold__mobile-row { display: grid; grid-template-columns: 58px 1fr auto; gap: 8px; align-items: center; min-height: 30px; border-bottom: 1px solid var(--sfi-border-soft); color: #a99a80; font: 700 10px ui-monospace, monospace; }
  .sfi-studio-gold__mobile-row em { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-style: normal; color: #b8ad96; }
  .sfi-studio-gold__mobile-row strong { color: var(--sfi-gold-bright); }
  .sfi-studio-gold__mobile-progress { height: 2px; margin-top: 14px; background: rgba(193, 132, 45, 0.18); }
  .sfi-studio-gold__mobile-progress span { display: block; height: 100%; background: var(--sfi-gold-bright); max-width: 100%; }
  .sfi-studio-gold__bottom-nav { position: fixed; left: 14px; right: 14px; bottom: 12px; z-index: 10; display: grid; grid-template-columns: repeat(5, 1fr); padding: 10px 4px; }
  .sfi-studio-gold__bottom-nav span { text-align: center; color: var(--sfi-muted); font: 700 8px ui-monospace, monospace; letter-spacing: 0.08em; }
  .sfi-studio-gold__bottom-nav span:first-child { color: var(--sfi-gold-bright); }
}

@media (min-width: 1181px) and (max-width: 1500px) {
  .sfi-studio-gold__grid { grid-template-columns: 300px minmax(560px, 1fr) 320px; }
  .sfi-studio-gold__header { grid-template-columns: 390px 1fr 300px; }
  .sfi-studio-gold__nav { gap: 24px; }
  .sfi-studio-gold__lower-grid { grid-template-columns: repeat(2, 1fr); }
  .sfi-studio-gold__engines { grid-column: 1 / span 3; }
  .sfi-studio-gold__engine-grid { grid-template-columns: repeat(3, 1fr); }
}
    `}</style>
  );
}
