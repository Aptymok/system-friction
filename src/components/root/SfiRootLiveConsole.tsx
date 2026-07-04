'use client';

import { useMemo, useState } from 'react';
import type { AgenticRootState } from '@/lib/agents/sfiAgents';
import { buildRootTopologyModel } from './rootTopologyModel';
import { ROOT_VIEW_DEFINITIONS, getRootViewDefinition, type RootViewId } from './rootViews';
import { ROOT_FUNCTIONS_CATALOG, getFunctionAvailability } from './rootFunctionsCatalog';
import { buildRootExpansionModel } from './rootExpansionModel';
import PredictionViewEngine from './engines/predictionViewEngine';
import AgentViewEngine from './engines/agentViewEngine';
import GovernanceViewEngine from './engines/governanceViewEngine';
import FunctionsViewEngine from './engines/functionsViewEngine';
import ExpansionViewEngine from './engines/expansionViewEngine';
import { RootSceneViewport } from './scene/RootSceneViewport';
import type { RootSceneModel, RootSceneNode } from './scene/rootSceneTypes';

type Tone = 'ok' | 'watch' | 'bad' | 'muted';

type DataSnapshot = {
  confidence: number;
  confidenceAvailable: boolean;
  predictions: unknown[];
  graphNodes: unknown[];
  evidence: unknown[];
  amvItems: unknown[];
  warnings: unknown[];
  queue: unknown[];
  agentCount: number;
  worldAgent: Record<string, unknown>;
  systemHealth: Record<string, unknown>;
  amv: Record<string, unknown>;
  cognitiveTwin: Record<string, unknown>;
  worldObservation: Record<string, unknown>;
};

type PanelItem = {
  id: string;
  label: string;
  body: string;
  status: string;
  source: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = 'not_available') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bounded(value: unknown, fallback = 0) {
  return Math.max(0, Math.min(1, num(value, fallback)));
}

function pct(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function statusTone(value: unknown): Tone {
  const raw = text(value, '').toLowerCase();
  if (/(fail|error|critical|degraded|collapsed|missing|deny|reject)/.test(raw)) return 'bad';
  if (/(pending|queued|warn|review|watch|medium|study|hold|partial|gated)/.test(raw)) return 'watch';
  if (/(ok|live|active|stable|operational|observed|available|build|approved)/.test(raw)) return 'ok';
  return 'muted';
}

function toneClass(tone: Tone) {
  return `tone-${tone}`;
}

function panelItemFromUnknown(item: unknown, index: number, source: string): PanelItem {
  const record = asRecord(item);
  const label = text(record.action ?? record.label ?? record.hypothesis_id ?? record.id ?? record.theme ?? record.type ?? record.status, `ROOT-${index + 1}`);
  const body = text(record.reason ?? record.description ?? record.prediccion_explicita ?? record.prediction ?? record.summary ?? record.expected_outcome ?? record.source ?? record.status, 'No detail available from source.');
  const status = text(record.status ?? record.recommendation ?? record.evidence_state ?? record.estado_observacion ?? record.current_signal_state, 'observed');
  return { id: `${source}-${index}-${label}`, label, body, status, source };
}

function buildInstituteScene(data: DataSnapshot): RootSceneModel {
  const topology = buildRootTopologyModel({
    confidence: data.confidence,
    graphNodeCount: data.graphNodes.length,
    evidenceCount: data.evidence.length,
    predictionCount: data.predictions.length,
    amvCount: data.amvItems.length,
    queueCount: data.queue.length,
    warningCount: data.warnings.length,
    agentCount: data.agentCount,
  });

  const domainNodes: RootSceneNode[] = topology.nodes.map((node) => ({
    id: `domain-${node.id}`,
    label: node.id === 'ROOT' ? 'GOV' : node.label,
    x: node.x,
    y: node.y,
    value: node.value,
    status: data.warnings.length ? 'watch' : 'observed',
    kind: 'domain',
    source: node.source,
    meaning: node.meaning,
    dataClass: node.source.includes('derived') ? 'derived' : 'mixed',
  }));

  const core: RootSceneNode = {
    id: 'root-core',
    label: 'ROOT',
    x: 50,
    y: 50,
    value: data.confidenceAvailable ? pct(data.confidence) : 'gated',
    status: data.warnings.length ? 'watch' : data.confidenceAvailable ? 'stable' : 'gated',
    kind: 'core',
    source: 'worldVector.today.observation.confidence + buildAgenticRootState()',
    meaning: 'Central ROOT observatory point. Confidence is shown only when the World Vector observation provides it.',
    dataClass: data.confidenceAvailable ? 'mixed' : 'gated',
  };

  return {
    title: 'Institute State',
    subtitle: 'ROOT orbital observatory',
    nodes: [core, ...domainNodes],
    edges: [
      ...topology.edges.map((edge) => ({
        id: edge.id,
        from: `domain-${edge.from}`,
        to: `domain-${edge.to}`,
        weight: edge.weight,
        kind: edge.kind,
        source: edge.source,
        meaning: edge.meaning,
      })),
      ...domainNodes.map((node) => ({
        id: `core-${node.id}`,
        from: core.id,
        to: node.id,
        weight: data.confidenceAvailable ? Math.max(0.22, data.confidence) : 0.16,
        kind: data.confidenceAvailable ? 'radial' : 'gated',
        source: 'ROOT scene radial adapter over rootTopologyModel',
        meaning: `ROOT can inspect the ${node.label} domain without duplicating the source model.`,
      })),
    ],
    rings: topology.rings.map((ring) => ({
      id: ring.id,
      radius: ring.radius + 8,
      weight: ring.weight,
      label: ring.id.toUpperCase(),
      source: ring.source,
      meaning: ring.meaning,
    })),
    annotations: [{ id: 'root-observatory-label', label: 'ROOT OBSERVATORY', x: 50, y: 9, source: 'scene label', meaning: 'Scene identity label.', dataClass: 'derived' }],
    readouts: [
      { id: 'confidence', label: 'confidence', value: data.confidenceAvailable ? pct(data.confidence) : 'gated', source: 'worldVector.today.observation.confidence', meaning: 'World Vector confidence when present.', dataClass: data.confidenceAvailable ? 'real' : 'gated' },
      { id: 'graph', label: 'graph', value: data.graphNodes.length, source: 'initialState.neuralGraph.nodes.length', meaning: 'Graph node count.', dataClass: 'real' },
      { id: 'evidence', label: 'evidence', value: data.evidence.length, source: 'initialState.neuralGraph.evidence.length', meaning: 'Evidence count.', dataClass: 'real' },
      { id: 'predictions', label: 'predictions', value: data.predictions.length, source: 'initialState.predictionRegistry.entries.length', meaning: 'Prediction registry count.', dataClass: 'real' },
      { id: 'amv', label: 'amv', value: data.amvItems.length, source: 'initialState.amv.items.length', meaning: 'AMV item count.', dataClass: 'real' },
      { id: 'warnings', label: 'warnings', value: data.warnings.length, source: 'initialState.systemHealth.warnings.length', meaning: 'System warning count.', dataClass: 'real' },
    ],
  };
}

function CenterScene({ viewId, data }: { viewId: RootViewId; data: DataSnapshot }) {
  if (viewId === 'prediction-registry') return <PredictionViewEngine entries={data.predictions} confidence={data.confidence} />;
  if (viewId === 'agentic-operations') {
    return (
      <AgentViewEngine
        worldVectorStatus={data.worldAgent.current_signal_state}
        graphStatus={data.systemHealth.graphStatus}
        amvStatus={data.amv.status}
        predictionStatus={data.systemHealth.predictionStatus}
        providerCount={data.agentCount}
        amvCount={data.amvItems.length}
        evidenceCount={data.evidence.length}
        predictionCount={data.predictions.length}
        warningCount={data.warnings.length}
      />
    );
  }
  if (viewId === 'founder-governance') return <GovernanceViewEngine queueCount={data.queue.length} predictionCount={data.predictions.length} warningCount={data.warnings.length} confidence={data.confidence} />;
  if (viewId === 'institute-functions') return <FunctionsViewEngine />;
  if (viewId === 'expansion-investigation') return <ExpansionViewEngine confidence={data.confidence} amvCount={data.amvItems.length} predictionCount={data.predictions.length} evidenceCount={data.evidence.length} />;
  return <RootSceneViewport model={buildInstituteScene(data)} />;
}

function Indicator({ label, value, source, tone }: { label: string; value: string; source: string; tone: Tone }) {
  return (
    <section className="indicator">
      <span>{label}</span>
      <b className={toneClass(tone)}>{value}</b>
      <em>{source}</em>
    </section>
  );
}

function ContextPanel({ title, items }: { title: string; items: PanelItem[] }) {
  return (
    <section className="side-panel">
      <header>
        <b>{title}</b>
        <span>{items.length} source rows</span>
      </header>
      <div className="context-list">
        {items.slice(0, 4).map((item) => (
          <article key={item.id}>
            <div>
              <span className={toneClass(statusTone(item.status))} />
              <b>{item.label}</b>
            </div>
            <p>{item.body}</p>
            <small>{item.source}</small>
          </article>
        ))}
        {items.length === 0 ? <p className="empty">No records available from the current ROOT source.</p> : null}
      </div>
    </section>
  );
}

function ReadingPanel({ title, dataClass, textValue }: { title: string; dataClass: string; textValue: string }) {
  return (
    <section className="side-panel reading-panel">
      <header>
        <b>{title}</b>
        <span>{dataClass}</span>
      </header>
      <p>{textValue}</p>
    </section>
  );
}

function buildContextItems(activeView: RootViewId, data: DataSnapshot): PanelItem[] {
  const expansion = buildRootExpansionModel({
    confidence: data.confidence,
    amvCount: data.amvItems.length,
    predictionCount: data.predictions.length,
    evidenceCount: data.evidence.length,
  });
  const agentItems = [
    { label: 'World Vector Agent', description: text(data.worldAgent.current_signal_state), status: data.worldAgent.current_signal_state, source: 'initialState.worldVectorAgent' },
    { label: 'Neural Graph Agent', description: `${data.graphNodes.length} nodes / ${data.evidence.length} evidence`, status: data.systemHealth.graphStatus, source: 'initialState.neuralGraph + initialState.systemHealth' },
    { label: 'AMV Agent', description: `${data.amvItems.length} memory items`, status: data.amv.status, source: 'initialState.amv' },
    { label: 'Prediction Registry', description: `${data.predictions.length} entries`, status: data.systemHealth.predictionStatus, source: 'initialState.predictionRegistry' },
  ];

  if (activeView === 'prediction-registry') return data.predictions.map((item, index) => panelItemFromUnknown(item, index, 'initialState.predictionRegistry.entries'));
  if (activeView === 'agentic-operations') return agentItems.map((item, index) => panelItemFromUnknown(item, index, item.source));
  if (activeView === 'founder-governance') return (data.queue.length ? data.queue : data.predictions).map((item, index) => panelItemFromUnknown(item, index, data.queue.length ? 'initialState.executionQueue' : 'initialState.predictionRegistry.entries'));
  if (activeView === 'institute-functions') return ROOT_FUNCTIONS_CATALOG.map((item, index) => panelItemFromUnknown(item, index, 'rootFunctionsCatalog'));
  if (activeView === 'expansion-investigation') return expansion.themes.map((item, index) => panelItemFromUnknown(item, index, 'rootExpansionModel.themes'));
  return data.evidence.map((item, index) => panelItemFromUnknown(item, index, 'initialState.neuralGraph.evidence'));
}

function readingForView(activeView: RootViewId, data: DataSnapshot) {
  if (activeView === 'institute-functions') return 'ROOT tools are grouped by declared function family. Available, partial and gated states come from the catalog.';
  if (activeView === 'expansion-investigation') return 'Expansion routes are derived from confidence, AMV, prediction and evidence counts. They are investigation signals, not publication proof.';
  if (activeView === 'prediction-registry') return data.predictions.length ? 'Prediction routes are generated from registry entries and their available probability fields.' : 'No prediction entries arrived in initialState.predictionRegistry.entries, so no hypothesis route is drawn.';
  return text(data.worldAgent.root_interpretation ?? data.worldObservation.interpretation, 'ROOT is observing the live state through buildAgenticRootState() and buildWorldVectorOperationalState().');
}

export default function SfiRootLiveConsole({ initialState, worldVector }: { initialState: AgenticRootState; worldVector: unknown }) {
  const [activeView, setActiveView] = useState<RootViewId>('institute-state');
  const view = getRootViewDefinition(activeView);
  const registry = asRecord(initialState.predictionRegistry);
  const graph = asRecord(initialState.neuralGraph);
  const amv = asRecord(initialState.amv);
  const systemHealth = asRecord(initialState.systemHealth);
  const world = asRecord(worldVector);
  const today = asRecord(world.today);
  const observation = asRecord(today.observation);
  const confidenceAvailable = typeof observation.confidence === 'number';
  const data: DataSnapshot = {
    confidence: bounded(observation.confidence, 0),
    confidenceAvailable,
    predictions: asArray(registry.entries),
    graphNodes: asArray(graph.nodes),
    evidence: asArray(graph.evidence),
    amvItems: asArray(amv.items),
    warnings: asArray(systemHealth.warnings),
    queue: asArray(initialState.executionQueue),
    agentCount: num(systemHealth.llmProvidersAvailable, 0),
    worldAgent: asRecord(initialState.worldVectorAgent),
    systemHealth,
    amv,
    cognitiveTwin: asRecord(initialState.cognitiveTwin),
    worldObservation: observation,
  };

  const functionsAvailability = getFunctionAvailability();
  const contextItems = useMemo(() => buildContextItems(activeView, data), [activeView, data]);
  const healthTone: Tone = data.warnings.length ? 'watch' : confidenceAvailable ? 'ok' : 'bad';
  const registryHealth = asRecord(registry.health).ok === true ? 'LIVE' : 'DEGRADED';
  const viewSource = activeView === 'institute-functions' ? 'rootFunctionsCatalog' : activeView === 'expansion-investigation' ? 'rootExpansionModel' : 'initialState + worldVector';

  return (
    <main className="root-console">
      <aside className="root-rail" aria-label="ROOT view rail">
        <div className="rail-mark">ROOT</div>
        {ROOT_VIEW_DEFINITIONS.map((rootView) => (
          <button
            key={rootView.id}
            type="button"
            className={activeView === rootView.id ? 'active' : ''}
            onClick={() => setActiveView(rootView.id)}
            title={rootView.title}
            aria-label={rootView.title}
          >
            {rootView.glyph}
          </button>
        ))}
      </aside>

      <section className="root-shell">
        <header className="root-topbar">
          <div>
            <span>Route</span>
            <b>/root</b>
          </div>
          <div className="topbar-title">
            <span>{view.subtitle}</span>
            <b>{view.title}</b>
          </div>
          <div className="topbar-status">
            <span>Registry</span>
            <b className={registryHealth === 'LIVE' ? 'tone-ok' : 'tone-watch'}>{registryHealth}</b>
          </div>
        </header>

        <div className="root-stage">
          <aside className="left-stack" aria-label="ROOT compact indicators">
            <Indicator label="World Signal" value={confidenceAvailable ? pct(data.confidence) : 'GATED'} source="worldVector.today.observation.confidence" tone={healthTone} />
            <Indicator label="Graph Evidence" value={`${data.graphNodes.length}/${data.evidence.length}`} source="initialState.neuralGraph" tone={data.evidence.length ? 'ok' : 'watch'} />
            <Indicator label="Agent Capacity" value={`${data.agentCount}`} source="initialState.systemHealth.llmProvidersAvailable" tone={data.agentCount > 0 ? 'ok' : 'bad'} />
          </aside>

          <section className="center-scene">
            <CenterScene viewId={activeView} data={data} />
          </section>

          <aside className="right-stack" aria-label="ROOT contextual panels">
            <ContextPanel title={view.rightTitle} items={contextItems} />
            <ReadingPanel title={view.readingTitle} dataClass={view.dataClass} textValue={readingForView(activeView, data)} />
          </aside>
        </div>

        <footer className="telemetry-strip">
          <span>Root Console <b>{activeView}</b></span>
          <span>Source <b>{viewSource}</b></span>
          <span>Generated <b>{text(initialState.generated_at, 'not_available')}</b></span>
          <span>Functions <b>{pct(functionsAvailability.score)}</b></span>
        </footer>
      </section>

      <style jsx>{`
        .root-console {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 58px 1fr;
          background: #020201;
          color: #e9dfc8;
          font-family: var(--sfi-font-mono), "JetBrains Mono", Consolas, monospace;
          overflow: hidden;
        }

        .root-rail {
          border-right: 1px solid rgba(218, 188, 102, .18);
          background: linear-gradient(180deg, #070604, #030302);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 9px;
          padding: 16px 0;
        }

        .rail-mark {
          color: #f1d27b;
          font-size: 10px;
          letter-spacing: .18em;
          writing-mode: vertical-rl;
          text-orientation: mixed;
          margin-bottom: 14px;
        }

        .root-rail button {
          width: 34px;
          height: 34px;
          border: 1px solid transparent;
          background: transparent;
          color: rgba(233, 223, 200, .46);
          font-size: 10px;
          letter-spacing: 0;
          cursor: pointer;
        }

        .root-rail button.active {
          border-color: rgba(241, 210, 123, .44);
          color: #f1d27b;
          background: rgba(218, 188, 102, .08);
          box-shadow: 0 0 22px rgba(218, 188, 102, .12);
        }

        .root-shell {
          min-width: 0;
          min-height: 100vh;
          display: grid;
          grid-template-rows: 54px 1fr 40px;
          background:
            radial-gradient(circle at 52% 45%, rgba(218, 188, 102, .10), transparent 35%),
            linear-gradient(rgba(255, 255, 255, .025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, .025) 1px, transparent 1px),
            #050504;
          background-size: 100% 100%, 34px 34px, 34px 34px;
        }

        .root-topbar {
          display: grid;
          grid-template-columns: 190px 1fr 180px;
          align-items: center;
          gap: 16px;
          border-bottom: 1px solid rgba(218, 188, 102, .16);
          background: rgba(0, 0, 0, .56);
          padding: 0 18px;
        }

        .root-topbar span,
        .telemetry-strip span,
        .indicator span,
        .indicator em,
        .side-panel header span,
        .context-list small {
          display: block;
          font-size: 8px;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: #817660;
        }

        .root-topbar b {
          display: block;
          margin-top: 4px;
          color: #f1d27b;
          font-size: 11px;
          letter-spacing: .12em;
          text-transform: uppercase;
          font-weight: 500;
        }

        .topbar-title {
          text-align: center;
        }

        .topbar-title b {
          color: #e9dfc8;
          font-size: 12px;
        }

        .topbar-status {
          text-align: right;
        }

        .root-stage {
          min-height: 0;
          display: grid;
          grid-template-columns: minmax(180px, 15vw) minmax(580px, 1fr) minmax(230px, 19vw);
          gap: 12px;
          padding: 12px 14px;
        }

        .left-stack,
        .right-stack {
          min-width: 0;
          display: grid;
          align-content: start;
          gap: 10px;
        }

        .center-scene {
          min-width: 0;
          min-height: calc(100vh - 130px);
        }

        .indicator,
        .side-panel {
          border: 1px solid rgba(218, 188, 102, .16);
          background: rgba(7, 6, 4, .76);
          box-shadow: inset 0 1px 0 rgba(241, 210, 123, .06), 0 16px 42px rgba(0, 0, 0, .28);
          backdrop-filter: blur(12px);
        }

        .indicator {
          padding: 12px;
        }

        .indicator b {
          display: block;
          margin-top: 10px;
          font-size: 26px;
          line-height: 1;
          letter-spacing: 0;
          font-weight: 500;
        }

        .indicator em {
          margin-top: 10px;
          font-style: normal;
          line-height: 1.35;
          text-transform: none;
          letter-spacing: .04em;
        }

        .side-panel {
          padding: 11px;
        }

        .side-panel header {
          display: flex;
          align-items: start;
          justify-content: space-between;
          gap: 10px;
          border-bottom: 1px solid rgba(218, 188, 102, .11);
          padding-bottom: 9px;
          margin-bottom: 9px;
        }

        .side-panel header b {
          font-size: 9px;
          letter-spacing: .13em;
          text-transform: uppercase;
          color: #f1d27b;
          font-weight: 500;
        }

        .context-list {
          display: grid;
          gap: 8px;
        }

        .context-list article {
          border-bottom: 1px solid rgba(218, 188, 102, .08);
          padding-bottom: 8px;
        }

        .context-list article div {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .context-list article div span {
          width: 6px;
          height: 6px;
          border-radius: 99px;
          background: currentColor;
          flex: 0 0 auto;
        }

        .context-list b {
          min-width: 0;
          font-size: 10px;
          line-height: 1.25;
          color: #e9dfc8;
          font-weight: 500;
          overflow-wrap: anywhere;
        }

        .context-list p,
        .reading-panel p,
        .empty {
          margin: 6px 0 0;
          font-size: 10px;
          line-height: 1.55;
          color: #bdb195;
        }

        .context-list p {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .context-list small {
          margin-top: 6px;
          text-transform: none;
          letter-spacing: .04em;
          overflow-wrap: anywhere;
        }

        .telemetry-strip {
          display: grid;
          grid-template-columns: 1.1fr 1fr 1.5fr .8fr;
          align-items: center;
          border-top: 1px solid rgba(218, 188, 102, .14);
          background: rgba(0, 0, 0, .62);
          overflow: hidden;
        }

        .telemetry-strip span {
          padding: 0 13px;
          border-right: 1px solid rgba(218, 188, 102, .09);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .telemetry-strip b {
          color: #f1d27b;
          font-weight: 500;
        }

        .tone-ok {
          color: #8bd27c;
        }

        .tone-watch {
          color: #d8b651;
        }

        .tone-bad {
          color: #e36a52;
        }

        .tone-muted {
          color: #817660;
        }

        @media (max-width: 1180px) {
          .root-console {
            grid-template-columns: 52px 1fr;
            overflow: auto;
          }

          .root-shell {
            grid-template-rows: auto auto auto;
          }

          .root-topbar,
          .root-stage,
          .telemetry-strip {
            grid-template-columns: 1fr;
          }

          .root-topbar {
            padding: 12px 14px;
          }

          .topbar-title,
          .topbar-status {
            text-align: left;
          }

          .center-scene {
            min-height: 660px;
          }

          .left-stack {
            grid-template-columns: repeat(3, 1fr);
          }

          .telemetry-strip span {
            padding: 9px 13px;
          }
        }

        @media (max-width: 720px) {
          .left-stack {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
