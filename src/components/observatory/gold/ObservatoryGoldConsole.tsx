'use client';

import { useState } from 'react';
import type { ObservatoryGoldState } from '@/lib/observatory/gold/observatoryGoldState';
import { ObservatoryBottomTensions } from './ObservatoryBottomTensions';
import { ObservatoryGoldHeader } from './ObservatoryGoldHeader';
import { ObservatoryLeftRail } from './ObservatoryLeftRail';
import { ObservatoryMainMap } from './ObservatoryMainMap';
import { ObservatoryMobileConsole } from './ObservatoryMobileConsole';
import { ObservatoryRightRail } from './ObservatoryRightRail';
import { ObservatoryTimeline } from './ObservatoryTimeline';

export function ObservatoryGoldConsole({ state }: { state: ObservatoryGoldState }) {
  const [viewMode, setViewMode] = useState<'mapa' | 'red'>('mapa');
  const [playing, setPlaying] = useState(true);
  const [minimumIntensity, setMinimumIntensity] = useState(state.mapFilters.minimumIntensity);
  const [tensionType, setTensionType] = useState(state.mapFilters.tensionType);
  const [region, setRegion] = useState(state.mapFilters.region);

  const displayState = {
    ...state,
    mapFilters: { minimumIntensity, tensionType, region },
  };

  const resetFilters = () => {
    setMinimumIntensity(state.mapFilters.minimumIntensity);
    setTensionType(state.mapFilters.tensionType);
    setRegion(state.mapFilters.region);
  };

  return (
    <div className="sfi-observatory-gold">
      <ObservatoryGoldStyles />
      <div className="sfi-observatory-gold__desktop">
        <ObservatoryGoldHeader state={displayState} />
        <div className="sfi-observatory-gold__grid">
          <ObservatoryLeftRail state={displayState} />
          <ObservatoryMainMap state={displayState} viewMode={viewMode} playing={playing} onViewModeChange={setViewMode} onTogglePlay={() => setPlaying((value) => !value)} />
          <ObservatoryRightRail state={displayState} />
          <ObservatoryBottomTensions
            state={displayState}
            minimumIntensity={minimumIntensity}
            tensionType={tensionType}
            region={region}
            onMinimumIntensityChange={setMinimumIntensity}
            onTensionTypeChange={setTensionType}
            onRegionChange={setRegion}
            onReset={resetFilters}
          />
          <ObservatoryTimeline state={displayState} playing={playing} onTogglePlay={() => setPlaying((value) => !value)} />
        </div>
      </div>
      <ObservatoryMobileConsole state={displayState} playing={playing} />
    </div>
  );
}

function ObservatoryGoldStyles() {
  return (
    <style>{`
.sfi-observatory-gold {
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
  background: linear-gradient(rgba(193,132,45,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(193,132,45,.025) 1px, transparent 1px), var(--sfi-bg);
  background-size: 34px 34px, 34px 34px, auto;
  color: var(--sfi-text);
  font-family: "Arial Narrow", "Roboto Condensed", "DIN Condensed", Arial, sans-serif;
}
.sfi-observatory-gold * { box-sizing: border-box; }
.sfi-observatory-gold button, .sfi-observatory-gold select, .sfi-observatory-gold input { font: inherit; }
.sfi-observatory-gold a { color: inherit; text-decoration: none; }
.sfi-observatory-gold button { color: inherit; background: transparent; cursor: pointer; }
.sfi-observatory-gold__desktop { min-height: 100vh; padding: 8px; }
.sfi-observatory-gold__header { height: 72px; display: grid; grid-template-columns: 470px 1fr 470px; align-items: center; border: 1px solid var(--sfi-border); background: rgba(5,6,8,.96); }
.sfi-observatory-gold__brand, .sfi-observatory-gold__system, .sfi-observatory-gold__nav { height: 100%; display: flex; align-items: center; }
.sfi-observatory-gold__brand { gap: 16px; padding: 0 22px; border-right: 1px solid var(--sfi-border-soft); }
.sfi-observatory-gold__sunmark { width: 34px; height: 34px; position: relative; border: 1px solid rgba(244,199,106,.55); border-radius: 50%; }
.sfi-observatory-gold__sunmark::before, .sfi-observatory-gold__sunmark::after { content: ""; position: absolute; inset: -8px; border: 1px dashed rgba(244,199,106,.34); border-radius: 50%; }
.sfi-observatory-gold__sunmark span { position: absolute; inset: 11px; background: var(--sfi-gold-bright); border-radius: 50%; box-shadow: 0 0 16px rgba(244,199,106,.55); }
.sfi-observatory-gold__brand-sfi { font-family: Georgia, serif; font-size: 32px; color: #eee1c5; letter-spacing: .12em; }
.sfi-observatory-gold__brand-name { font: 700 9px/1.35 ui-monospace, monospace; letter-spacing: .32em; }
.sfi-observatory-gold__slash { color: var(--sfi-gold); font-size: 25px; }
.sfi-observatory-gold__route-word { color: var(--sfi-gold); font: 700 18px ui-monospace, monospace; letter-spacing: .36em; }
.sfi-observatory-gold__nav { justify-content: center; gap: clamp(22px, 4vw, 58px); color: #a99a80; font: 700 10px ui-monospace, monospace; letter-spacing: .34em; }
.sfi-observatory-gold__system { justify-content: flex-end; gap: 14px; padding: 0 16px; border-left: 1px solid var(--sfi-border-soft); color: var(--sfi-muted); font: 700 9px ui-monospace, monospace; letter-spacing: .18em; }
.sfi-observatory-gold__system div { display: grid; gap: 6px; padding-left: 12px; border-left: 1px solid var(--sfi-border-soft); }
.sfi-observatory-gold__system strong { color: var(--sfi-gold-bright); }
.sfi-observatory-gold__system .is-critical, .sfi-observatory-gold__system .is-offline { color: var(--sfi-danger); }
.sfi-observatory-gold__mobile-menu { display: none; }
.sfi-observatory-gold__grid { display: grid; grid-template-columns: 340px minmax(680px, 1fr) 380px; grid-template-rows: minmax(505px, 54vh) 240px 132px; gap: 8px; margin-top: 8px; }
.sfi-observatory-gold__panel { position: relative; border: 1px solid var(--sfi-border); background: linear-gradient(180deg, rgba(8,11,15,.96), rgba(4,6,8,.94)); box-shadow: inset 0 0 0 1px rgba(244,199,106,.035); overflow: hidden; }
.sfi-observatory-gold__panel h1, .sfi-observatory-gold__panel h2, .sfi-observatory-gold__panel h3, .sfi-observatory-gold__panel p { margin: 0; }
.sfi-observatory-gold__panel h2 { color: #e6dcc5; font: 700 12px ui-monospace, monospace; letter-spacing: .32em; }
.sfi-observatory-gold__panel p { color: var(--sfi-muted); font: 500 11px/1.55 ui-monospace, monospace; letter-spacing: .05em; }
.sfi-observatory-gold__panel button,
.sfi-observatory-gold__panel-link { border: 0; color: var(--sfi-gold); font: 700 9px ui-monospace, monospace; letter-spacing: .18em; display: inline-flex; align-items: center; gap: 6px; width: max-content; }
.sfi-observatory-gold__left-rail, .sfi-observatory-gold__right-rail { display: grid; gap: 8px; min-height: 0; }
.sfi-observatory-gold__left-rail { grid-row: 1 / span 2; grid-template-rows: auto auto 1fr; }
.sfi-observatory-gold__right-rail { grid-column: 3; grid-template-rows: 1.05fr .95fr; }
.sfi-observatory-gold__panel-title { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 14px 8px; border-bottom: 1px solid var(--sfi-border-soft); }
.sfi-observatory-gold__panel-title span { color: var(--sfi-gold); font: 700 9px ui-monospace, monospace; letter-spacing: .16em; }
.sfi-observatory-gold__wsv-panel { padding-bottom: 12px; }
.sfi-observatory-gold__wsv-readout { display: grid; grid-template-columns: 1fr 150px; gap: 10px; align-items: end; padding: 16px 16px 10px; }
.sfi-observatory-gold__wsv-readout span { display: block; color: var(--sfi-gold); font: 700 25px ui-monospace, monospace; letter-spacing: .28em; }
.sfi-observatory-gold__wsv-readout strong { color: var(--sfi-gold-bright); font: 500 38px ui-monospace, monospace; }
.sfi-observatory-gold__wsv-readout em { color: var(--sfi-muted); font: 700 13px ui-monospace, monospace; font-style: normal; }
.sfi-observatory-gold__spark { width: 138px; height: 52px; }
.sfi-observatory-gold__spark polyline { fill: none; stroke: var(--sfi-gold-bright); stroke-width: 1.4; filter: drop-shadow(0 0 6px rgba(244,199,106,.42)); }
.sfi-observatory-gold__quad { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid var(--sfi-border-soft); }
.sfi-observatory-gold__quad span { padding: 12px 10px; border-right: 1px solid var(--sfi-border-soft); color: var(--sfi-muted); font: 700 9px ui-monospace, monospace; letter-spacing: .1em; }
.sfi-observatory-gold__quad strong { display: block; margin-top: 5px; color: var(--sfi-gold-bright); font-size: 17px; }
.sfi-observatory-gold__meaning { padding: 16px; display: grid; gap: 14px; align-content: start; }
.sfi-observatory-gold__signal-list { padding: 8px 14px; }
.sfi-observatory-gold__signal-list div, .sfi-observatory-gold__rank-list div, .sfi-observatory-gold__regional-list div { display: grid; grid-template-columns: 48px 1fr auto; gap: 10px; align-items: center; min-height: 32px; border-bottom: 1px solid rgba(193,132,45,.12); color: #a99a80; font: 600 10px ui-monospace, monospace; }
.sfi-observatory-gold__signal-list em, .sfi-observatory-gold__rank-list em { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-style: normal; color: #b8ad96; }
.sfi-observatory-gold__signal-list strong, .sfi-observatory-gold__rank-list strong, .sfi-observatory-gold__regional-list strong { color: var(--sfi-gold-bright); }
.sfi-observatory-gold__empty { padding: 12px; color: var(--sfi-muted) !important; }
.sfi-observatory-gold__main-map { grid-column: 2; display: grid; grid-template-rows: auto 1fr; min-height: 0; }
.sfi-observatory-gold__map-head { display: flex; justify-content: space-between; gap: 16px; padding: 13px 16px 9px; border-bottom: 1px solid var(--sfi-border-soft); }
.sfi-observatory-gold__map-head h1 { color: var(--sfi-gold); font: 700 13px ui-monospace, monospace; letter-spacing: .34em; }
.sfi-observatory-gold__map-head p { margin-top: 5px; }
.sfi-observatory-gold__map-controls { display: flex; align-items: center; gap: 8px; color: var(--sfi-muted); font: 700 9px ui-monospace, monospace; letter-spacing: .14em; }
.sfi-observatory-gold__map-controls button { border: 1px solid var(--sfi-border-soft); padding: 5px 12px; color: var(--sfi-muted); }
.sfi-observatory-gold__map-controls button.active { color: var(--sfi-gold-bright); border-color: var(--sfi-border); }
.sfi-observatory-gold__map-stage { position: relative; min-height: 380px; }
.sfi-observatory-gold__world-renderer { position: relative; width: 100%; height: 100%; min-height: 340px; overflow: hidden; background: #050608; }
.sfi-observatory-gold__world-canvas,
.sfi-observatory-gold__world-fallback { position: absolute; inset: 0; display: block; width: 100%; height: 100%; min-height: 340px; }
.sfi-observatory-gold__world-canvas { z-index: 2; }
.sfi-observatory-gold__world-fallback { z-index: 1; }
.sfi-observatory-gold__svg-globe-body { fill: rgba(10,12,12,.98); stroke: rgba(244,199,106,.44); stroke-width: 1.2; }
.sfi-observatory-gold__svg-topography { fill: none; stroke: rgba(201,147,58,.11); stroke-width: .7; }
.sfi-observatory-gold__svg-gridline { fill: none; stroke: rgba(193,132,45,.18); stroke-width: .7; }
.sfi-observatory-gold__svg-land { fill: rgba(24,21,14,.96); stroke: rgba(244,199,106,.48); stroke-width: 1.2; filter: drop-shadow(0 0 9px rgba(201,147,58,.16)); }
.sfi-observatory-gold__svg-flow { fill: none; stroke: var(--sfi-gold-bright); filter: drop-shadow(0 0 9px rgba(244,199,106,.48)); }
.sfi-observatory-gold__svg-node-halo { fill: rgba(244,199,106,.12); stroke: rgba(244,199,106,.68); stroke-width: 1; }
.sfi-observatory-gold__svg-node-core { fill: var(--sfi-gold-bright); filter: drop-shadow(0 0 10px rgba(244,199,106,.8)); }
.sfi-observatory-gold__world-fallback .is-danger .sfi-observatory-gold__svg-node-halo { fill: rgba(212,92,66,.14); stroke: rgba(212,92,66,.76); }
.sfi-observatory-gold__world-fallback .is-danger .sfi-observatory-gold__svg-node-core { fill: var(--sfi-danger); }
.sfi-observatory-gold__svg-empty rect { fill: rgba(5,6,8,.62); stroke: rgba(193,132,45,.34); }
.sfi-observatory-gold__svg-empty text, .sfi-observatory-gold__svg-label { fill: rgba(244,199,106,.72); font: 700 11px ui-monospace, monospace; letter-spacing: .08em; text-anchor: middle; }
.sfi-observatory-gold__svg-label { fill: rgba(216,210,194,.62); font-size: 10px; text-anchor: start; }
.sfi-observatory-gold__svg-frame { fill: none; stroke: rgba(244,199,106,.34); stroke-width: 1; }
.sfi-observatory-gold__daily { padding: 16px; display: grid; gap: 14px; }
.sfi-observatory-gold__daily-head { display: flex; justify-content: space-between; color: var(--sfi-gold); }
.sfi-observatory-gold__daily-head span { display: block; margin-top: 6px; color: var(--sfi-muted); font: 700 10px ui-monospace, monospace; letter-spacing: .12em; }
.sfi-observatory-gold__daily h3 { color: var(--sfi-gold-bright); font: 700 18px/1.25 ui-monospace, monospace; letter-spacing: .08em; }
.sfi-observatory-gold__daily-stats { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid var(--sfi-border-soft); border-bottom: 1px solid var(--sfi-border-soft); }
.sfi-observatory-gold__daily-stats span { padding: 12px 0; color: var(--sfi-muted); font: 700 9px ui-monospace, monospace; letter-spacing: .12em; }
.sfi-observatory-gold__daily-stats strong { display: block; color: var(--sfi-gold-bright); font-size: 22px; margin-top: 6px; }
.sfi-observatory-gold__daily-stats em { font-style: normal; color: var(--sfi-muted); }
.sfi-observatory-gold__vectors { padding-bottom: 14px; }
.sfi-observatory-gold__vector-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; padding: 12px 14px; }
.sfi-observatory-gold__vector-grid div { display: grid; grid-template-columns: 30px 1fr auto 14px; gap: 8px; align-items: center; min-height: 36px; color: var(--sfi-muted); font: 700 10px ui-monospace, monospace; border-bottom: 1px solid var(--sfi-border-soft); }
.sfi-observatory-gold__vector-grid div.active { color: var(--sfi-gold-bright); }
.sfi-observatory-gold__vector-icon { width: 28px; height: 28px; fill: none; stroke: currentColor; stroke-width: 1.2; }
.sfi-observatory-gold__bottom-grid { grid-column: 2 / span 2; display: grid; grid-template-columns: 1fr 1.45fr 1fr; gap: 8px; min-height: 0; }
.sfi-observatory-gold__bottom-grid article { padding: 14px; }
.sfi-observatory-gold__bottom-grid article > p { margin-top: 5px; }
.sfi-observatory-gold__rank-list { margin: 12px 0; }
.sfi-observatory-gold__regional { display: grid; grid-template-columns: 1fr 190px; grid-template-rows: auto auto 1fr; gap: 4px 14px; }
.sfi-observatory-gold__regional h2, .sfi-observatory-gold__regional p { grid-column: 1 / span 2; }
.sfi-observatory-gold__mini-map { width: 100%; height: 150px; stroke: rgba(201,147,58,.48); fill: none; }
.sfi-observatory-gold__mini-map circle { fill: rgba(244,199,106,.8); stroke: rgba(212,92,66,.7); filter: drop-shadow(0 0 8px rgba(244,199,106,.45)); }
.sfi-observatory-gold__regional-list div { grid-template-columns: 1fr auto; min-height: 23px; }
.sfi-observatory-gold__filters { display: grid; gap: 14px; }
.sfi-observatory-gold__filters label { display: grid; grid-template-columns: 1fr auto; gap: 8px; color: var(--sfi-muted); font: 700 10px ui-monospace, monospace; letter-spacing: .12em; }
.sfi-observatory-gold__filters input, .sfi-observatory-gold__filters select { grid-column: 1 / span 2; width: 100%; accent-color: var(--sfi-gold-bright); border: 1px solid var(--sfi-border-soft); background: rgba(0,0,0,.3); color: var(--sfi-text); padding: 7px; }
.sfi-observatory-gold__timeline { grid-column: 1 / span 3; padding: 14px 18px 18px; }
.sfi-observatory-gold__timeline-head { display: flex; justify-content: space-between; align-items: start; }
.sfi-observatory-gold__timeline-head p { margin-top: 5px; }
.sfi-observatory-gold__timeline-head button { border: 1px solid var(--sfi-border-soft); padding: 7px 10px; }
.sfi-observatory-gold__timeline-line { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 10px; margin-top: 22px; border-top: 1px solid var(--sfi-gold); }
.sfi-observatory-gold__timeline-line div { position: relative; padding-top: 16px; color: var(--sfi-muted); font: 700 9px ui-monospace, monospace; min-width: 0; }
.sfi-observatory-gold__timeline-line div > span { position: absolute; top: -5px; left: 0; width: 10px; height: 10px; border: 1px solid var(--sfi-gold-bright); border-radius: 50%; background: var(--sfi-bg); }
.sfi-observatory-gold__timeline-line .active > span { width: 28px; height: 28px; top: -14px; background: var(--sfi-gold-bright); box-shadow: 0 0 34px rgba(244,199,106,.9); }
.sfi-observatory-gold__timeline-line strong { display: block; color: var(--sfi-gold-bright); font-size: 13px; }
.sfi-observatory-gold__timeline-line em { display: block; margin-top: 5px; color: #b8ad96; font-style: normal; }
.sfi-observatory-gold__timeline-line p { margin-top: 4px; font-size: 9px; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.sfi-observatory-gold__mobile-console { display: none; }
@media (max-width: 1180px) {
  .sfi-observatory-gold__desktop { display: none; }
  .sfi-observatory-gold__mobile-console { display: block; min-height: 100vh; padding: 14px 14px 82px; background: var(--sfi-bg); }
  .sfi-observatory-gold__mobile-header, .sfi-observatory-gold__mobile-panel, .sfi-observatory-gold__mobile-nav { border: 1px solid var(--sfi-border); background: rgba(8,11,15,.92); }
  .sfi-observatory-gold__mobile-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 14px; margin-bottom: 10px; }
  .sfi-observatory-gold__mobile-header span { display: block; color: var(--sfi-text); font: 700 10px ui-monospace, monospace; letter-spacing: .22em; }
  .sfi-observatory-gold__mobile-header strong { display: block; margin-top: 5px; color: var(--sfi-gold); font: 700 18px ui-monospace, monospace; letter-spacing: .28em; }
  .sfi-observatory-gold__mobile-panel { margin-bottom: 10px; padding: 14px; overflow: hidden; }
  .sfi-observatory-gold__mobile-kicker { color: #beb49c; font: 700 10px ui-monospace, monospace; letter-spacing: .16em; text-transform: uppercase; }
  .sfi-observatory-gold__mobile-wsv strong { color: var(--sfi-gold-bright); font: 500 34px ui-monospace, monospace; }
  .sfi-observatory-gold__mobile-wsv span { color: var(--sfi-muted); margin-left: 8px; }
  .sfi-observatory-gold__mobile-quad { display: grid; grid-template-columns: repeat(4, 1fr); margin-top: 12px; border-top: 1px solid var(--sfi-border-soft); }
  .sfi-observatory-gold__mobile-quad span { padding-top: 10px; color: var(--sfi-muted); font: 700 8px ui-monospace, monospace; }
  .sfi-observatory-gold__mobile-quad strong { display: block; color: var(--sfi-gold-bright); font-size: 14px; margin-top: 5px; }
  .sfi-observatory-gold__mobile-panel h2 { margin: 9px 0 6px; color: var(--sfi-gold-bright); font: 700 15px ui-monospace, monospace; }
  .sfi-observatory-gold__mobile-panel p { color: var(--sfi-muted); font: 600 11px/1.45 ui-monospace, monospace; }
  .sfi-observatory-gold__mobile-panel button,
  .sfi-observatory-gold__mobile-action { border: 0; margin-top: 10px; color: var(--sfi-gold); font: 700 10px ui-monospace, monospace; display: inline-flex; }
  .sfi-observatory-gold__mobile-vector-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
  .sfi-observatory-gold__mobile-vector-row span { width: 38px; height: 38px; display: grid; place-items: center; border: 1px solid var(--sfi-border-soft); color: var(--sfi-muted); border-radius: 50%; font: 700 9px ui-monospace, monospace; }
  .sfi-observatory-gold__mobile-vector-row .active { color: var(--sfi-gold-bright); border-color: var(--sfi-border); }
  .sfi-observatory-gold__mobile-map { height: 260px; margin-top: 10px; border: 1px solid var(--sfi-border-soft); }
  .sfi-observatory-gold__mobile-row { display: grid; grid-template-columns: 48px 1fr auto; gap: 8px; align-items: center; min-height: 30px; border-bottom: 1px solid var(--sfi-border-soft); color: #a99a80; font: 700 10px ui-monospace, monospace; }
  .sfi-observatory-gold__mobile-row em { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-style: normal; color: #b8ad96; }
  .sfi-observatory-gold__mobile-row strong { color: var(--sfi-gold-bright); }
  .sfi-observatory-gold__mobile-nav { position: fixed; left: 14px; right: 14px; bottom: 12px; z-index: 20; display: grid; grid-template-columns: repeat(5, 1fr); padding: 10px 4px; }
  .sfi-observatory-gold__mobile-nav a { text-align: center; color: var(--sfi-muted); font: 700 8px ui-monospace, monospace; letter-spacing: .06em; }
  .sfi-observatory-gold__mobile-nav a:first-child { color: var(--sfi-gold-bright); }
}
@media (min-width: 1181px) and (max-width: 1520px) {
  .sfi-observatory-gold__header { grid-template-columns: 420px 1fr 390px; }
  .sfi-observatory-gold__grid { grid-template-columns: 300px minmax(560px, 1fr) 330px; }
  .sfi-observatory-gold__nav { gap: 24px; }
}
    `}</style>
  );
}
