import type { RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import { GovernancePipeline } from '../visual/GovernancePipeline';
import { SystemMatrix } from '../visual/SystemMatrix';
import type { RootSelection } from '../sovereignTypes';

export function RootOverviewView({ state, onSelect }: { state: RootSovereignState; onSelect: (selection: RootSelection) => void }) {
  const warnings = state.warnings.slice(0, 8); const legacy = state.predictions.data.legacyEntries;
  return <section className="rs-view"><div className="rs-view-title"><span>OVERVIEW</span><h1>SYSTEM MATRIX</h1><p>Qué está operativo, degradado o requiere intervención.</p></div><SystemMatrix items={state.system.data.matrix} onSelect={onSelect} /><div className="rs-overview-grid"><article><header>PROPOSAL PIPELINE</header><GovernancePipeline proposals={state.governance.data.proposals} /></article><article><header>PREDICTION STATUS</header><div className="rs-stat-strip"><span><b>{state.predictions.data.runs.length || 'NO MEDIDO'}</b>ENGINE RUNS</span><span><b>{legacy.filter((entry) => String(entry.estado_observacion) === 'pendiente').length}</b>LEGACY OPEN</span><span><b>{state.predictions.data.outcomes.length || 'NO MEDIDO'}</b>OUTCOMES</span></div></article><article><header>WARNING PRIORITY QUEUE</header>{warnings.length ? <ol className="rs-warning-list">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ol> : <div className="rs-empty compact"><b>SIN ALERTAS</b></div>}</article></div></section>;
}
