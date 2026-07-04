import type { StudioGoldState } from '@/lib/studio/gold/studioGoldState';
import { StudioEvaluationPanel } from './StudioEvaluationPanel';
import { StudioGoldConsole } from './StudioGoldConsole';

export function StudioGoldConsoleWithEvaluation({ state }: { state: StudioGoldState }) {
  return (
    <>
      <StudioGoldConsole state={state} />
      <div className="sfi-studio-gold sfi-studio-gold__evaluation-dock">
        <StudioEvaluationPanel state={state} />
      </div>
      <style>{`
.sfi-studio-gold__evaluation-dock {
  min-height: auto;
  padding: 0 8px 8px;
  background: #050608;
}
.sfi-studio-gold__evaluation-dock .sfi-studio-gold__evaluation {
  max-width: none;
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
  border: 1px solid rgba(193, 132, 45, 0.18);
  background: rgba(5, 6, 8, 0.72);
}
.sfi-studio-gold__evaluation-row > span {
  color: var(--sfi-gold);
  font: 700 9px ui-monospace, monospace;
  letter-spacing: 0.16em;
}
.sfi-studio-gold__evaluation-row strong {
  display: block;
  color: #e6dcc5;
  font: 700 10px ui-monospace, monospace;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.sfi-studio-gold__evaluation-row em {
  display: block;
  margin-top: 4px;
  color: var(--sfi-gold);
  font: 700 8px ui-monospace, monospace;
  font-style: normal;
  letter-spacing: 0.08em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sfi-studio-gold__evaluation-row p {
  color: var(--sfi-muted);
  font: 500 9px/1.35 ui-monospace, monospace;
  letter-spacing: 0.04em;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.sfi-studio-gold__evaluation-row b {
  align-self: end;
  width: max-content;
  padding: 4px 6px;
  border: 1px solid rgba(193, 132, 45, 0.28);
  color: var(--sfi-gold-bright);
  font: 700 8px ui-monospace, monospace;
  letter-spacing: 0.08em;
}
.sfi-studio-gold__evaluation-row b.is-blocked,
.sfi-studio-gold__evaluation-row b.is-unavailable {
  color: var(--sfi-danger);
}
.sfi-studio-gold__evaluation-row b.is-degraded {
  color: var(--sfi-amber);
}
.sfi-studio-gold__evaluation-foot {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 0 10px 12px;
  color: var(--sfi-muted);
  font: 700 9px ui-monospace, monospace;
  letter-spacing: 0.12em;
}
.sfi-studio-gold__evaluation-foot strong {
  color: var(--sfi-gold-bright);
  font-size: 15px;
}
@media (max-width: 1180px) {
  .sfi-studio-gold__evaluation-dock {
    padding: 0 14px 96px;
  }
  .sfi-studio-gold__evaluation-list {
    grid-template-columns: 1fr;
  }
}
      `}</style>
    </>
  );
}
