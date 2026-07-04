'use client';

import { useMemo, useState } from 'react';
import type { AgenticRootState } from '@/lib/agents/sfiAgents';
import { ROOT_VIEW_DEFINITIONS, getRootViewDefinition, type RootViewId } from './rootViews';
import { getFunctionAvailability } from './rootFunctionsCatalog';
import PredictionViewEngine from './engines/predictionViewEngine';
import AgentViewEngine from './engines/agentViewEngine';
import GovernanceViewEngine from './engines/governanceViewEngine';
import FunctionsViewEngine from './engines/functionsViewEngine';
import ExpansionViewEngine from './engines/expansionViewEngine';
import { RootSceneViewport } from './scene/RootSceneViewport';
import { ConsoleIcons, RootConsoleShell, type ConsoleCountItem, type ConsoleGaugeItem, type ConsoleHubDef, type ConsoleInterpretation } from './shell';
import { ContextPanel, Indicator, ReadingPanel } from './RootConsoleSidePanels';
import { asRecord, buildContextItems, buildInstituteScene, pct, readingForView, text, toDataSnapshot, type DataSnapshot, type Tone } from './rootConsoleAdapters';

const ROOT_VIEW_ICON_MAP = { 'institute-state': ConsoleIcons.pulse, 'prediction-registry': ConsoleIcons.branch, 'agentic-operations': ConsoleIcons.grid, 'founder-governance': ConsoleIcons.shield, 'institute-functions': ConsoleIcons.layers, 'expansion-investigation': ConsoleIcons.chart } satisfies Record<RootViewId, ConsoleHubDef['icon']>;
const ROOT_SHELL_HUBS: ConsoleHubDef[] = ROOT_VIEW_DEFINITIONS.map((view) => ({ id: view.id, title: view.title.replace('SFI ROOT / ', ''), subtitle: view.centerSubtitle, icon: ROOT_VIEW_ICON_MAP[view.id], dataClass: view.dataClass }));

function CenterScene({ viewId, data }: { viewId: RootViewId; data: DataSnapshot }) {
  if (viewId === 'prediction-registry') return <PredictionViewEngine entries={data.predictions} confidence={data.confidence} />;
  if (viewId === 'agentic-operations') return <AgentViewEngine worldVectorStatus={data.worldAgent.current_signal_state} graphStatus={data.systemHealth.graphStatus} amvStatus={data.amv.status} predictionStatus={data.systemHealth.predictionStatus} providerCount={data.agentCount} amvCount={data.amvItems.length} evidenceCount={data.evidence.length} predictionCount={data.predictions.length} warningCount={data.warnings.length} />;
  if (viewId === 'founder-governance') return <GovernanceViewEngine queueCount={data.queue.length} predictionCount={data.predictions.length} warningCount={data.warnings.length} confidence={data.confidence} />;
  if (viewId === 'institute-functions') return <FunctionsViewEngine />;
  if (viewId === 'expansion-investigation') return <ExpansionViewEngine confidence={data.confidence} amvCount={data.amvItems.length} predictionCount={data.predictions.length} evidenceCount={data.evidence.length} />;
  return <RootSceneViewport model={buildInstituteScene(data)} />;
}

function gaugeTone(tone: Tone) { return tone; }

function buildInterpretation(activeView: RootViewId, data: DataSnapshot): ConsoleInterpretation {
  if (activeView === 'expansion-investigation') return { title: 'Opportunity field reading', body: 'Expansion routes are derived from current confidence, AMV, prediction and evidence counts. The field can guide investigation, but it is not publication proof.', source: 'rootExpansionModel + initialState counts' };
  if (activeView === 'prediction-registry') return { title: 'Prediction registry reading', body: data.predictions.length ? 'Registry entries are present. Calibration, quality and risk surfaces should be treated as derived support for inspection, not automatic decision authority.' : 'DATA GATED: no prediction entries arrived in initialState.predictionRegistry.entries.', source: 'initialState.predictionRegistry.entries' };
  if (activeView === 'founder-governance') return { title: 'Decision chamber reading', body: 'ROOT can inspect, route, hold, approve or deny using existing action state. No parallel governance path is created by this shell.', source: 'initialState.executionQueue + predictionRegistry' };
  return { title: 'Institute state reading', body: readingForView(activeView, data), source: activeView === 'institute-functions' ? 'rootFunctionsCatalog' : 'worldVector.today.observation + initialState' };
}

export default function RootConsoleScreen({ initialState, worldVector }: { initialState: AgenticRootState; worldVector: unknown }) {
  const [activeView, setActiveView] = useState<RootViewId>('institute-state');
  const view = getRootViewDefinition(activeView);
  const registry = asRecord(initialState.predictionRegistry);
  const data = toDataSnapshot(initialState, worldVector);
  const functionsAvailability = getFunctionAvailability();
  const contextItems = useMemo(() => buildContextItems(activeView, data), [activeView, data]);
  const healthTone: Tone = data.warnings.length ? 'watch' : data.confidenceAvailable ? 'ok' : 'bad';
  const registryHealth = asRecord(registry.health).ok === true ? 'LIVE' : 'DEGRADED';
  const viewSource = activeView === 'institute-functions' ? 'rootFunctionsCatalog' : activeView === 'expansion-investigation' ? 'rootExpansionModel' : 'initialState + worldVector';
  const gaugeItems: ConsoleGaugeItem[] = [{ id: 'world-signal', label: 'World', sublabel: data.confidenceAvailable ? 'confidence' : 'data gated', value01: data.confidenceAvailable ? data.confidence : null, tone: gaugeTone(healthTone), source: 'worldVector.today.observation.confidence' }, { id: 'functions', label: 'Tools', sublabel: 'catalog capacity', value01: functionsAvailability.score, tone: 'watch', source: 'getFunctionAvailability()' }, { id: 'warnings', label: 'Strain', sublabel: 'warning pressure', value01: Math.min(1, data.warnings.length / 8), tone: data.warnings.length ? 'watch' : 'ok', source: 'initialState.systemHealth.warnings.length' }];
  const countItems: ConsoleCountItem[] = [{ id: 'predictions', label: 'Predictions', value: data.predictions.length, tone: data.predictions.length ? 'ok' : 'muted', source: 'initialState.predictionRegistry.entries.length' }, { id: 'amv', label: 'AMV', value: data.amvItems.length, tone: data.amvItems.length ? 'ok' : 'watch', source: 'initialState.amv.items.length' }, { id: 'queue', label: 'Queue', value: data.queue.length, tone: data.queue.length ? 'watch' : 'muted', source: 'initialState.executionQueue.length' }];
  return <RootConsoleShell route="/root" title={view.title} subtitle={view.subtitle} hubs={ROOT_SHELL_HUBS} activeHubId={activeView} onSelectHub={(hubId) => setActiveView(hubId as RootViewId)} statusItems={[{ label: 'Registry', value: registryHealth, tone: registryHealth === 'LIVE' ? 'ok' : 'watch', source: 'initialState.predictionRegistry.health' }, { label: 'World Signal', value: data.confidenceAvailable ? pct(data.confidence) : 'DATA GATED', tone: healthTone, source: 'worldVector.today.observation.confidence' }, { label: 'Warnings', value: data.warnings.length, tone: data.warnings.length ? 'watch' : 'ok', source: 'initialState.systemHealth.warnings.length' }, { label: 'Agents', value: data.agentCount, tone: data.agentCount > 0 ? 'ok' : 'bad', source: 'initialState.systemHealth.llmProvidersAvailable' }]} footerItems={[{ label: 'View', value: activeView }, { label: 'Source', value: viewSource }, { label: 'Generated', value: text(initialState.generated_at, 'not_available') }, { label: 'Functions', value: pct(functionsAvailability.score) }]} gaugeItems={gaugeItems} countItems={countItems} interpretation={buildInterpretation(activeView, data)} isDataGated={!data.confidenceAvailable}><div className="root-stage" data-root-view={activeView}><aside className="left-stack" aria-label="ROOT compact indicators"><Indicator label="World Signal" value={data.confidenceAvailable ? pct(data.confidence) : 'GATED'} source="worldVector.today.observation.confidence" tone={healthTone} /><Indicator label="Graph Evidence" value={`${data.graphNodes.length}/${data.evidence.length}`} source="initialState.neuralGraph" tone={data.evidence.length ? 'ok' : 'watch'} /><Indicator label="Agent Capacity" value={`${data.agentCount}`} source="initialState.systemHealth.llmProvidersAvailable" tone={data.agentCount > 0 ? 'ok' : 'bad'} /></aside><section className="center-scene"><CenterScene viewId={activeView} data={data} /></section><aside className="right-stack" aria-label="ROOT contextual panels"><ContextPanel title={view.rightTitle} items={contextItems} /><ReadingPanel title={view.readingTitle} dataClass={view.dataClass} textValue={readingForView(activeView, data)} /></aside></div><style jsx>{`.root-stage{min-width:0;min-height:calc(100vh - 230px);display:grid;grid-template-columns:minmax(164px,14vw) minmax(620px,1fr) minmax(250px,20vw);gap:10px}.left-stack,.right-stack{min-width:0;display:grid;align-content:start;gap:10px}.center-scene{min-width:0;min-height:calc(100vh - 240px)}@media(max-width:1180px){.root-stage{grid-template-columns:1fr;min-height:auto}.center-scene{min-height:680px}.left-stack{grid-template-columns:repeat(3,1fr)}}@media(max-width:720px){.left-stack{grid-template-columns:1fr}.center-scene{min-height:620px}}`}</style></RootConsoleShell>;
}
