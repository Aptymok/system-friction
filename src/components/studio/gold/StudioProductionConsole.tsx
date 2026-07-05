import type { StudioGoldState } from '@/lib/studio/gold/studioGoldState';
import { StudioEvaluationPanel } from './StudioEvaluationPanel';
import { StudioGoldConsole } from './StudioGoldConsole';
import { StudioObjectIntakePanel } from './StudioObjectIntakePanel';

export function StudioProductionConsole({ state }: { state: StudioGoldState }) {
  return (
    <>
      <StudioPurplePatch />
      <StudioGoldConsole state={state} />
      <StudioObjectIntakePanel />
      <div className="sfi-studio-gold sfi-studio-gold__evaluation-footer">
        <StudioEvaluationPanel state={state} />
      </div>
    </>
  );
}

function StudioPurplePatch() {
  return (
    <style>{`
.sfi-studio-gold {
  --sfi-border: rgba(186, 92, 255, 0.36);
  --sfi-border-soft: rgba(255, 121, 217, 0.18);
  --sfi-gold: #ba5cff;
  --sfi-gold-bright: #ff79d9;
  --sfi-amber: #ff8b45;
  --sfi-text: #eadff0;
  --sfi-muted: #9b88a8;
  --sfi-ok: #45f0ff;
  --sfi-danger: #ff5b7e;
}
.sfi-studio-gold__header,
.sfi-studio-gold__panel {
  border-color: rgba(186, 92, 255, 0.34);
  background: linear-gradient(180deg, rgba(10, 7, 16, 0.97), rgba(4, 5, 9, 0.96));
}
.sfi-studio-gold__wave-canvas {
  filter: hue-rotate(285deg) saturate(1.35) contrast(1.08);
}
.sfi-studio-gold__brand-sfi,
.sfi-studio-gold__studio-word,
.sfi-studio-gold__panel h2 span,
.sfi-studio-gold__action {
  color: #ff79d9;
}
.sfi-studio-gold__sunmark,
.sfi-studio-gold__sunmark::before,
.sfi-studio-gold__sunmark::after {
  border-color: rgba(255, 121, 217, 0.52);
}
.sfi-studio-gold__sunmark span {
  background: #ff79d9;
  box-shadow: 0 0 18px rgba(255, 121, 217, 0.72);
}
.sfi-studio-gold__evaluation-footer {
  min-height: auto;
  padding: 0 8px 8px;
  background: #050608;
}
.sfi-studio-gold__evaluation-list {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 1px;
  padding: 10px;
}
.sfi-studio-gold__evaluation-row {
  display: grid;
  grid-template-rows: auto auto auto;
  gap: 6px;
  min-width: 0;
  padding: 10px;
  border: 1px solid rgba(186, 92, 255, 0.22);
  background: rgba(9, 6, 14, 0.76);
}
.sfi-studio-gold__evaluation-row > span,
.sfi-studio-gold__evaluation-row em {
  color: #ff79d9;
  font: 700 8px ui-monospace, monospace;
  letter-spacing: .1em;
  font-style: normal;
}
.sfi-studio-gold__evaluation-row strong {
  display: block;
  color: #f4d6ff;
  font: 700 10px ui-monospace, monospace;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.sfi-studio-gold__evaluation-row p {
  color: #9b88a8;
  font: 500 9px/1.35 ui-monospace, monospace;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.sfi-studio-gold__evaluation-row b {
  align-self: end;
  width: max-content;
  padding: 4px 6px;
  border: 1px solid rgba(255, 121, 217, .25);
  color: #45f0ff;
  font: 700 8px ui-monospace, monospace;
}
.sfi-studio-gold__evaluation-row b.is-blocked,
.sfi-studio-gold__evaluation-row b.is-unavailable {
  color: #ff5b7e;
}
.sfi-studio-gold__evaluation-row b.is-degraded {
  color: #ff8b45;
}
.sfi-studio-gold__evaluation-foot {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 0 10px 12px;
  color: #9b88a8;
  font: 700 9px ui-monospace, monospace;
  letter-spacing: .12em;
}
.sfi-studio-gold__evaluation-foot strong {
  color: #ff79d9;
}
@media (max-width: 1180px) {
  .sfi-studio-gold__evaluation-footer { padding: 0 14px 96px; }
  .sfi-studio-gold__evaluation-list { grid-template-columns: 1fr; }
}
    `}</style>
  );
}
