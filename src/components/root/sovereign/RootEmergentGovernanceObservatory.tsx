'use client';

import { useMemo, useState } from 'react';
import type { RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import type { RootActionRequest, RootSelection } from './sovereignTypes';
import { RootGovernanceObservatory } from './RootGovernanceObservatory';
import { RootEmergentField, type RootEmergentNode, type RootEmergentTone, type RootEmergentTopology } from './visual/RootEmergentField';
import './root-emergent-governance.css';

function text(value: unknown, fallback = 'NO_VALUE') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function toneFromStatus(value: string | null | undefined): RootEmergentTone {
  const status = (value ?? '').toLowerCase();
  if (['observed','operational','available','verified','active','canonical','accepted','ready'].includes(status)) return 'ok';
  if (['degraded','blocked','error','critical','rejected','conflicted'].includes(status)) return 'bad';
  if (['declared','derived','inferred','candidate','pending','waiting_evidence','proposed','thin'].includes(status)) return 'warn';
  return 'idle';
}

function sourceTone(error: string | null | undefined, fallbackStatus?: string | null): RootEmergentTone {
  if (error) return 'bad';
  return toneFromStatus(fallbackStatus ?? 'observed');
}

export function RootEmergentGovernanceObservatory({
  state,
  refreshing,
  warning,
  onRefresh,
  onSelect,
  onAction,
}: {
  state: RootSovereignState;
  refreshing: boolean;
  warning: string | null;
  onRefresh: () => void;
  onSelect: (selection: RootSelection) => void;
  onAction: (action: RootActionRequest) => void;
}) {
  const [filter, setFilter] = useState<'all' | RootEmergentTopology>('all');
  const [activeModule, setActiveModule] = useState<string | null>(null);

  const field = useMemo(() => {
    const phiFact = state.interpretation.facts.find((fact) => fact.id === 'institutional-position');
    const phi = phiFact?.value.match(/([0-9]+(?:\.[0-9]+)?)/)?.[1] ?? '—';
    const sources = [state.system, state.governance, state.agents, state.predictions, state.amv, state.evidence, state.execution, state.telemetry, state.cognitiveRuntime, state.cognitiveTwin];
    const sourceOk = sources.filter((source) => !source.error).length;
    const systemOpen = state.system.data.matrix.reduce((sum, item) => sum + (item.openItems.value ?? 0), 0);
    const governanceOpen = state.governance.data.proposals.filter((row) => !['executed','blocked','rejected','closed'].includes(text(row.status, '').toLowerCase())).length
      + state.governance.data.mutations.filter((row) => !['executed','closed','rejected'].includes(text(row.status, '').toLowerCase())).length;
    const agents = state.cognitiveRuntime.data.agents;
    const operationalAgents = agents.filter((agent) => agent.status === 'operational').length;
    const twinCount = state.cognitiveTwin.data.memory.length + state.cognitiveTwin.data.decisions.length + state.cognitiveTwin.data.runs.length;
    const predictionOpen = state.predictions.data.runs.filter((row) => ['OPEN','WAITING_EVIDENCE','DUE','PROPOSED'].includes(text(row.status, '').toUpperCase())).length
      + state.predictions.data.legacyEntries.filter((row) => !['verified','closed','falsified'].includes(text(row.estado_observacion, '').toLowerCase())).length;
    const activeAttractors = state.amv.data.attractors.filter((row) => !['archived','retired','closed'].includes(text(row.status, '').toLowerCase())).length;
    const memoryCount = state.amv.data.memories.length + state.cognitiveTwin.data.memory.length + state.predictions.data.learningEvents.length;
    const evidenceObjects = state.evidence.data.objects.length;
    const evidenceRelations = state.evidence.data.edges.length;
    const graphStatus = state.evidence.error ? 'degraded' : state.evidence.data.nodes.length ? (state.evidence.data.nodes.length > 1 && !state.evidence.data.edges.length ? 'degraded' : 'observed') : 'missing';

    const nodes: RootEmergentNode[] = [
      { id:'institution', moduleId:'01', topology:'I', label:'INSTITUTIONAL STATE', value:`Φ ${phi}`, detail:`${state.interpretation.divergences.length} divergences`, tone:toneFromStatus(phiFact?.status), x:50, y:18 },
      { id:'system', moduleId:'02', topology:'I', label:'SYSTEM / INFRASTRUCTURE', value:`${systemOpen} OPEN`, detail:`${state.system.data.matrix.length} surfaces`, tone:sourceTone(state.system.error, state.system.dataClass), x:22, y:29 },
      { id:'authority', moduleId:'03', topology:'I', label:'IDENTITY / AUTHORITY', value:'ROOT', detail:'sovereign boundary', tone:'ok', x:79, y:28 },
      { id:'evidence', moduleId:'04', topology:'II', label:'EVIDENCE / GRAPH', value:`${evidenceObjects} OBJ`, detail:`${state.evidence.data.nodes.length}N / ${evidenceRelations}E`, tone:sourceTone(state.evidence.error, graphStatus), x:18, y:54 },
      { id:'runtime', moduleId:'05', topology:'II', label:'COGNITIVE RUNTIME', value:`${operationalAgents}/${agents.length || 0}`, detail:'operational agents', tone:sourceTone(state.cognitiveRuntime.error, state.cognitiveRuntime.data.status), x:36, y:40 },
      { id:'twin', moduleId:'06', topology:'II', label:'COGNITIVE TWIN', value:String(twinCount), detail:'memory · decisions · runs', tone:sourceTone(state.cognitiveTwin.error, state.cognitiveTwin.dataClass), x:65, y:40 },
      { id:'prediction', moduleId:'07', topology:'II', label:'PROJECTION / PREDICTION', value:`${predictionOpen} OPEN`, detail:`${state.predictions.data.outcomes.length} outcomes`, tone:sourceTone(state.predictions.error, state.predictions.dataClass), x:83, y:54 },
      { id:'attractors', moduleId:'08', topology:'II', label:'ATTRACTORS / PPOI', value:String(activeAttractors), detail:'active attractors', tone:sourceTone(state.amv.error, activeAttractors ? 'declared' : 'missing'), x:70, y:73 },
      { id:'memory', moduleId:'09', topology:'III', label:'MEMORY / TRAJECTORY', value:String(memoryCount), detail:`${state.predictions.data.learningEvents.length} learning events`, tone:sourceTone(state.amv.error || state.cognitiveTwin.error ? 'degraded' : null, memoryCount ? 'observed' : 'missing'), x:31, y:74 },
      { id:'governance', moduleId:'10', topology:'III', label:'GOVERNANCE / OPERATION', value:`${governanceOpen} OPEN`, detail:`${state.governance.data.audits.length} audited actions`, tone:sourceTone(state.governance.error, governanceOpen ? 'pending' : 'observed'), x:51, y:63 },
    ];

    return { phi, sourceHealth: `${sourceOk}/${sources.length} SOURCES · ${evidenceObjects} EVIDENCE OBJECTS`, nodes };
  }, [state]);

  const activate = (node: RootEmergentNode) => {
    setActiveModule(node.moduleId);
    const selectors: Record<string,string> = {
      '01': '.root-canonical__since',
      '02': '.root-canonical__surfaces',
      '03': '.root-canonical__header',
      '04': '.root-canonical__workspace',
      '05': '.root-canonical__tabs',
      '06': '.root-canonical__workspace',
      '07': '.root-canonical__workspace',
      '08': '.root-canonical__workspace',
      '09': '.root-canonical__since',
      '10': '.root-canonical__workspace',
    };
    const target = document.querySelector(selectors[node.moduleId] ?? '.root-canonical__workspace');
    if (target instanceof HTMLElement) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <main className="root-emergent-governance">
      <div className="root-emergent-filter" aria-label="ROOT topology filter">
        <span>TOPOLOGY</span>
        {(['all','I','II','III'] as const).map((item) => <button key={item} type="button" data-active={filter === item} onClick={() => setFilter(item)}>{item === 'all' ? 'Ø' : item}</button>)}
      </div>
      <RootEmergentField phi={field.phi} sourceHealth={field.sourceHealth} filter={filter} activeModule={activeModule} nodes={field.nodes} onActivate={activate} />
      <section className="root-instrument-layer" aria-label="ROOT instrument layer">
        <header><span>INSTRUMENT LAYER</span><strong>Particle topology above · operational controls below.</strong><small>FIELD REPRESENTATION ≠ CANONICAL WRITE</small></header>
        <RootGovernanceObservatory state={state} refreshing={refreshing} warning={warning} onRefresh={onRefresh} onSelect={onSelect} onAction={onAction} />
      </section>
    </main>
  );
}
