'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import './RootNeuralGraphView.css';

type GraphNode = {
  id: string;
  label: string;
  type: string;
  origin: string;
  provenance: string;
  lineage: string[];
  attributes: Record<string, unknown>;
  reality?: {
    stage: string; state: string; sourceVersion: string|null; captureTime: string|null; uncertainty: unknown|null;
    verificationState: string|null; authority: string|null; executionState: string|null;
    expectedReturn: unknown|null; observedReturn: unknown|null; applicableObligation: unknown|null;
  };
  methodSignal?: {
    relationCount: number;
    evidenceBoundRelationCount: number;
    relationTransition: boolean;
    weightChangeObserved: boolean;
    counterevidenceObserved: boolean;
    temporalStructureObserved: boolean;
    requiresTrajectory: boolean;
    requiresRivalHypothesis: boolean;
    expectationObserved: boolean;
    returnObserved: boolean;
    discriminatingObservationObserved: boolean;
    stoppingConditionObserved: boolean;
    contrastReady: boolean;
    contrastRecorded: boolean;
    learningCandidateObserved: boolean;
    learningPromoted: boolean;
    fieldReorganizationState: 'UNCHANGED' | 'CONTRAST_RECORDED' | 'LEARNING_QUARANTINED' | 'LEARNING_PROMOTED';
    observedWeightDelta: number | null;
    relationSupportRatio: number | null;
    provenanceCoverage: number | null;
    reorganizationMagnitude: number;
  };
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  relation: string;
  weight: number;
  origin: string;
  provenance: string;
  lineage: string[];
  attributes: Record<string, unknown>;
  reality?: { material: boolean; provenance: string; relation: string; state: string };
};

type GraphPayload = {
  sourceState: 'observed' | 'degraded' | 'missing';
  degradedReason: string | null;
  readPlane: 'SUPABASE' | 'NEON' | 'PROJECTION' | 'UNAVAILABLE';
  primaryDiagnostic: string | null;
  loadedAt: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  realityCoverage: { stage: string; observed: boolean }[];
  admission: { contract: string; admittedNodes: number; excludedNodes: number; excludedEdges: number };
};

type Position = { x: number; y: number };

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function nodeTone(node: GraphNode) {
  const state = String(node.reality?.state ?? node.attributes.epistemicClass ?? node.attributes.state ?? 'UNKNOWN').toUpperCase();
  const authority = String(node.reality?.authority ?? node.attributes.authority ?? '').toUpperCase();
  if (/FAIL|BREACH|REJECT|CONTRADICT|DEGRADED|FALSIF/.test(state)) return '#B85050';
  if (/AUTHORITY|AUTHORIZED|CANON|PERSIST/.test(authority+' '+state)) return '#C8A951';
  if (/OBSERVED|SIGNAL|EMERG/.test(state)) return '#4A7AAA';
  return '#6B635A';
}

type TemporalReading = {
  coordinate: number | null;
  basis: 'SEQUENCE' | 'CYCLE' | 'PHASE' | 'CHRONOLOGY' | 'UNKNOWN';
  label: string;
};

function numericAttribute(node: GraphNode, keys: readonly string[]) {
  for (const key of keys) {
    const value = node.attributes[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function stringAttribute(node: GraphNode, keys: readonly string[]) {
  for (const key of keys) {
    const value = node.attributes[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function temporalReading(node: GraphNode): TemporalReading {
  const sequence = numericAttribute(node, ['sequence','sequenceIndex','transitionIndex','eventIndex','order']);
  if (sequence !== null) return { coordinate: sequence, basis: 'SEQUENCE', label: `SEQUENCE · ${sequence}` };

  const cycle = numericAttribute(node, ['cycle','cycleIndex','cycleNumber','recurrence','recurrenceIndex']);
  if (cycle !== null) return { coordinate: cycle, basis: 'CYCLE', label: `CYCLE · ${cycle}` };

  const phase = stringAttribute(node, ['phase','temporalPhase','cyclePhase','statePhase']);
  if (phase) return { coordinate: null, basis: 'PHASE', label: `PHASE · ${phase}` };

  const candidates = [node.reality?.captureTime, node.attributes.observedAt, node.attributes.sourceObservedAt, node.attributes.createdAt, node.attributes.updatedAt];
  for (const value of candidates) {
    if (typeof value === 'string') {
      const ms = Date.parse(value);
      if (!Number.isNaN(ms)) return { coordinate: ms, basis: 'CHRONOLOGY', label: date(value) };
    }
  }
  return { coordinate: null, basis: 'UNKNOWN', label: 'UNKNOWN' };
}

function temporalValue(node: GraphNode) {
  return temporalReading(node).coordinate;
}

function regimeSignal(node: GraphNode) {
  const text = semanticText(node);
  if (/bifurcat|threshold|regime change|attractor|ejector/.test(text)) return 'REGIME CANDIDATE';
  if (/contradict|counterevidence|breach|degraded|fail/.test(text)) return 'FRICTION / DIVERGENCE';
  return 'PERSISTING / UNCLASSIFIED';
}

function short(value: string, max = 34) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function date(value: string | null) {
  if (!value) return 'MISSING';
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf())
    ? value
    : parsed.toLocaleString('en-US', { timeZone: 'America/Mexico_City', hour12: false });
}

function semanticText(node: GraphNode) {
  return [node.type, node.label, node.origin, node.provenance, ...node.lineage, ...Object.entries(node.attributes).flatMap(([key, value]) => [key, typeof value === 'string' ? value : ''])]
    .join(' ')
    .toLowerCase();
}

function realityStage(node: GraphNode) {
  if (node.reality?.stage) return node.reality.stage.toLowerCase();
  const text = semanticText(node);
  const stages: readonly string[] = ['world','capture','evidence','transformation','inference','verification','authority','action','return'];
  return stages.find((stage) => text.includes(stage)) ?? 'unclassified';
}

function reorganizationOffset(node: GraphNode, reading: string): Position {
  if (reading !== 'CURRENT_STATE' && reading !== 'RETURN_CONTRAST') return { x: 0, y: 0 };
  const state = node.methodSignal?.fieldReorganizationState ?? 'UNCHANGED';
  if (state === 'UNCHANGED') return { x: 0, y: 0 };

  // This is a reversible reading transform only. Canonical node coordinates/history
  // are not persisted or overwritten by learning projection.
  const supportRatio = node.methodSignal?.relationSupportRatio;
  const direction = supportRatio === null || supportRatio === undefined || supportRatio === 0.5
    ? (hash(`reorganization:${node.id}:${state}`) % 2 === 0 ? 1 : -1)
    : supportRatio > 0.5 ? 1 : -1;
  const magnitude = node.methodSignal?.reorganizationMagnitude ?? 0;
  if (magnitude <= 0) return { x: 0, y: 0 };
  const stateScale = state === 'LEARNING_PROMOTED' ? 54 : state === 'LEARNING_QUARANTINED' ? 30 : 18;
  const displacement = stateScale * magnitude;
  return { x: displacement * direction, y: state === 'LEARNING_PROMOTED' ? -24 * magnitude : 14 * magnitude };
}

function applyReorganizationReading(node: GraphNode, position: Position, reading: string, width: number, height: number): Position {
  const offset = reorganizationOffset(node, reading);
  return {
    x: Math.max(38, Math.min(width - 38, position.x + offset.x)),
    y: Math.max(38, Math.min(height - 38, position.y + offset.y)),
  };
}

function buildPositions(nodes: GraphNode[], reading: 'CURRENT_STATE'|'HIERARCHY'|'TRAJECTORY'|'RETROLONGITUDINAL'|'PROJECTION'|'FRICTION_REGIME'|'REALITY_CHAIN'|'RETURN_CONTRAST') {
  const width = 1180;
  const height = 700;
  const positions = new Map<string, Position>();
  const types = [...new Set(nodes.map((node) => node.type))].sort();

  if (reading === 'REALITY_CHAIN') {
    const stages = ['world','capture','evidence','transformation','inference','verification','authority','action','return','unclassified'] as const;
    const buckets = new Map(stages.map((stage) => [stage, [] as GraphNode[]]));
    for (const node of nodes) buckets.get(realityStage(node))?.push(node);
    stages.forEach((stage, stageIndex) => {
      const bucket = buckets.get(stage) ?? [];
      const x = 70 + (stageIndex * (width - 140)) / Math.max(1, stages.length - 1);
      bucket.forEach((node, index) => {
        const spread = Math.max(1, bucket.length - 1);
        const y = bucket.length === 1 ? height / 2 : 90 + (index * (height - 180)) / spread;
        positions.set(node.id, { x, y });
      });
    });
    return { positions, types, width, height };
  }

  if (reading === 'RETURN_CONTRAST') {
    const anchors: Record<string, number> = { return: 180, contrast: 360, learning: 560, memory: 790, canon: 980 };
    nodes.forEach((node, index) => {
      const text = semanticText(node);
      const reorganization = node.methodSignal?.fieldReorganizationState ?? 'UNCHANGED';
      const governedAnchor = reorganization === 'LEARNING_PROMOTED'
        ? 'memory'
        : reorganization === 'LEARNING_QUARANTINED'
          ? 'learning'
          : reorganization === 'CONTRAST_RECORDED'
            ? 'contrast'
            : null;
      const key = governedAnchor ?? Object.keys(anchors).find((candidate) => text.includes(candidate));
      const x = key ? anchors[key] : 540;
      const seed = hash(node.id);
      const base = { x, y: 70 + ((seed + index * 31) % 560) };
      positions.set(node.id, applyReorganizationReading(node, base, reading, width, height));
    });
    return { positions, types, width, height };
  }

  if (reading === 'FRICTION_REGIME') {
    nodes.forEach((node, index) => {
      const text = semanticText(node);
      const friction = ['unknown','missing','fail','breach','contradict','counterevidence','degraded','blocked'].filter((term) => text.includes(term)).length;
      const seed = hash(node.id);
      positions.set(node.id, {
        x: 100 + Math.min(4, friction) * 240,
        y: 70 + ((seed + index * 17) % 560),
      });
    });
    return { positions, types, width, height };
  }

  if (reading === 'TRAJECTORY' || reading === 'RETROLONGITUDINAL' || reading === 'PROJECTION') {
    const timed = nodes.map((node) => ({ node, time: temporalValue(node) })).sort((a,b) => (a.time ?? 0) - (b.time ?? 0));
    const known = timed.filter((item) => item.time !== null);
    const min = known[0]?.time ?? 0;
    const max = known[known.length - 1]?.time ?? min + 1;
    timed.forEach(({node,time}, index) => {
      const ratio = time === null ? .5 : (time-min)/Math.max(1,max-min);
      const forward = reading === 'RETROLONGITUDINAL' ? 1-ratio : ratio;
      const projected = reading === 'PROJECTION' && /HYPOTHESIZED|SIMULATED|EXPECTED/.test(String(node.reality?.state ?? node.attributes.epistemicClass ?? '').toUpperCase());
      positions.set(node.id, { x: 90 + forward*(width-180), y: 90 + ((hash(node.id)+index*29)%500) + (projected ? 40 : 0) });
    });
    return { positions, types, width, height };
  }

  if (reading === 'HIERARCHY') {
    const typeIndex = new Map(types.map((type,index)=>[type,index]));
    nodes.forEach((node,index)=>{
      const level=typeIndex.get(node.type) ?? 0;
      positions.set(node.id,{x:100+(level%5)*245,y:80+(Math.floor(level/5)*170)+((hash(node.id)+index*19)%120)});
    });
    return { positions, types, width, height };
  }

  const typeIndex = new Map(types.map((type, index) => [type, index]));
  for (const node of nodes) {
    const group = typeIndex.get(node.type) ?? 0;
    const groupAngle = (Math.PI * 2 * group) / Math.max(1, types.length) - Math.PI / 2;
    const centerX = width / 2 + Math.cos(groupAngle) * 330;
    const centerY = height / 2 + Math.sin(groupAngle) * 210;
    const seed = hash(node.id);
    const localAngle = ((seed % 360) / 180) * Math.PI;
    const localRadius = 24 + ((seed >>> 8) % 112);
    const base = {
      x: Math.max(38, Math.min(width - 38, centerX + Math.cos(localAngle) * localRadius)),
      y: Math.max(38, Math.min(height - 38, centerY + Math.sin(localAngle) * localRadius * 0.72)),
    };
    positions.set(node.id, applyReorganizationReading(node, base, reading, width, height));
  }
  return { positions, types, width, height };
}

export function RootNeuralGraphView({ graph }: { graph: GraphPayload }) {
  const searchParams=useSearchParams();
  const requestedReading=searchParams.get('reading');
  const allowedReadings=['CURRENT_STATE','HIERARCHY','TRAJECTORY','RETROLONGITUDINAL','PROJECTION','FRICTION_REGIME','REALITY_CHAIN','RETURN_CONTRAST'] as const;
  const initialReading=(allowedReadings as readonly string[]).includes(requestedReading||'') ? requestedReading as typeof allowedReadings[number] : 'CURRENT_STATE';
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reading, setReading] = useState<'CURRENT_STATE'|'HIERARCHY'|'TRAJECTORY'|'RETROLONGITUDINAL'|'PROJECTION'|'FRICTION_REGIME'|'REALITY_CHAIN'|'RETURN_CONTRAST'>(initialReading);

  const degree = useMemo(() => {
    const values = new Map<string, number>();
    for (const edge of graph.edges) {
      values.set(edge.source, (values.get(edge.source) ?? 0) + 1);
      values.set(edge.target, (values.get(edge.target) ?? 0) + 1);
    }
    return values;
  }, [graph.edges]);

  const allTypes = useMemo(
    () => [...new Set(graph.nodes.map((node) => node.type))].sort(),
    [graph.nodes],
  );

  const visibleNodes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return graph.nodes.filter((node) => {
      if (activeType !== 'ALL' && node.type !== activeType) return false;
      if (!needle) return true;
      return [node.label, node.type, node.origin, node.provenance, ...node.lineage]
        .some((value) => value.toLowerCase().includes(needle));
    });
  }, [activeType, graph.nodes, query]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const visibleEdges = useMemo(
    () => graph.edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)),
    [graph.edges, visibleNodeIds],
  );

  const topology = useMemo(() => buildPositions(graph.nodes, reading), [graph.nodes, reading]);
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);

  const selected = selectedId ? nodeById.get(selectedId) ?? null : null;
  const selectedEdges = useMemo(
    () => selected
      ? graph.edges.filter((edge) => edge.source === selected.id || edge.target === selected.id)
      : [],
    [graph.edges, selected],
  );

  const labelled = useMemo(() => {
    const candidates = [...visibleNodes]
      .sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0))
      .slice(0, 18)
      .map((node) => node.id);
    if (selectedId && !candidates.includes(selectedId)) candidates.push(selectedId);
    return new Set(candidates);
  }, [degree, selectedId, visibleNodes]);

  const continuity = graph.readPlane === 'NEON';
  const graphObserved = graph.sourceState === 'observed';
  const typeCount = allTypes.length;

  return (
    <main className="neuralGraphShell" data-neural-graph-contract="SFI-ROOT-NEURAL-GRAPH-1.0">
      <header className="neuralGraphHeader">
        <div>
          <span className="neuralGraphEyebrow">ROOT · SYSTEM FRICTION INSTITUTE · STATE / RELATION / TIME / RETURN</span>
          <h1>Observe the institution through its changing states.</h1>
          <p>ROOT organizes governed nodes according to SFI identity grammar, preserves hierarchy and provenance, follows trajectories through time, reconstructs material transitions, and separates observed history from present reconstruction and future projection.</p>
        </div>
      </header>

      <section className="neuralGraphPulse" aria-label="Neural Graph state">
        <article><span>NODES</span><strong>{graph.nodes.length}</strong><small>persisted + canonical projection</small></article>
        <article><span>RELATIONS</span><strong>{graph.edges.length}</strong><small>visible edges in SFI profile</small></article>
        <article data-state={graph.readPlane}><span>READ PLANE</span><strong>{graph.readPlane}</strong><small>{continuity ? 'Continuity active' : graph.readPlane === 'SUPABASE' ? 'Primary active' : 'Projection / unavailable'}</small></article>
        <article data-state={graph.sourceState}><span>GRAPH STATE</span><strong>{graph.sourceState.toUpperCase()}</strong><small>{graphObserved ? 'persisted graph observed' : 'degraded projection'}</small></article>
        <article><span>ONTOLOGY TYPES</span><strong>{typeCount}</strong><small>{allTypes.slice(0, 3).join(' · ') || 'MISSING'}</small></article>
      </section>

      <section className="neuralGraphControls" aria-label="Canonical cognitive field readings">
        <div className="neuralGraphFilters">
          {(['CURRENT_STATE','HIERARCHY','TRAJECTORY','RETROLONGITUDINAL','PROJECTION','FRICTION_REGIME','REALITY_CHAIN','RETURN_CONTRAST'] as const).map((mode) => (
            <button key={mode} className={reading === mode ? 'active' : ''} onClick={() => setReading(mode)}>
              {mode.replaceAll('_',' ')}
            </button>
          ))}
        </div>
        <p>
          {reading === 'REALITY_CHAIN'
            ? 'Reconstruct material passage: WORLD → CAPTURE → EVIDENCE → TRANSFORMATION → [INFERENCE] → VERIFICATION → AUTHORITY → ACTION → RETURN. Inference remains conditional.'
            : reading === 'TRAJECTORY'
              ? 'Follow observed state displacement through time. A trajectory is not a causal explanation.'
              : reading === 'RETROLONGITUDINAL'
                ? 'Reconstruct backward from the present while preserving the difference between what happened, what was observed then, what can be reconstructed now, and what was formalized later.'
                : reading === 'PROJECTION'
                  ? 'Project bounded future trajectories. HYPOTHESIZED / SIMULATED / EXPECTED never become OBSERVED by visualization.'
                  : reading === 'FRICTION_REGIME'
                    ? 'Expose friction, thresholds, attractors, divergence and regime-change candidates without promoting them to causal truth.'
                    : reading === 'RETURN_CONTRAST'
                      ? 'Contrast EXPECTED RETURN with OBSERVED RETURN. Case RETURN informs one trajectory; repeated RETURN may alter system memory.'
                      : reading === 'HIERARCHY'
                        ? 'Organize nodes by institutional and ontological hierarchy without equating visual prominence with truth or importance.'
                        : 'Current state: one governed institutional field. Identity, provenance, authority and epistemic state remain attached to each object.'}
        </p>
      </section>

      {reading === 'REALITY_CHAIN' ? (
        <section className="neuralGraphBoundary">
          <strong>MCDC COVERAGE · {graph.realityCoverage.filter((item) => item.observed).length}/{graph.realityCoverage.length}</strong>
          <span>{graph.realityCoverage.map((item) => `${item.observed ? '●' : '○'} ${item.stage}`).join(' · ')}</span>
        </section>
      ) : null}

      <section className="neuralGraphBoundary">
        <strong>RELATION ≠ CAUSALITY.</strong>
        <span>SOURCE ≠ EVIDENCE · MULTIPLE EVIDENCE ≠ CORROBORATED EVIDENCE · EXECUTION ≠ TRUTH · ACTION RESPONSE ≠ PERSISTED STATE · GRAPH ≠ RETURN.</span>
      </section>

      <section className="neuralGraphControls">
        <label>
          <span>SEARCH TOPOLOGY</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="node, type, provenance, lineage…"
          />
        </label>
        <div className="neuralGraphFilters" aria-label="Filter by node type">
          <button className={activeType === 'ALL' ? 'active' : ''} onClick={() => setActiveType('ALL')}>ALL · {graph.nodes.length}</button>
          {allTypes.map((type) => (
            <button key={type} className={activeType === type ? 'active' : ''} onClick={() => setActiveType(type)}>
              {type.toUpperCase()} · {graph.nodes.filter((node) => node.type === type).length}
            </button>
          ))}
        </div>
      </section>

      <div className="neuralGraphLayout">
        <section className="neuralGraphCanvas" aria-label="Canonical graph topology">
          <div className="neuralGraphCanvasMeta">
            <span>{reading.replaceAll('_',' ')} · VISIBLE {visibleNodes.length} NODES · {visibleEdges.length} EDGES · DOCUMENTARY EXCLUDED {graph.admission.excludedNodes}</span>
            <span>LOADED {date(graph.loadedAt)}</span>
          </div>
          <svg viewBox={`0 0 ${topology.width} ${topology.height}`} role="img" aria-label="System Friction Institute Neural Graph">
            <defs>
              <radialGradient id="sfiGraphGlow">
                <stop offset="0%" stopColor="#d5b36f" stopOpacity=".18" />
                <stop offset="100%" stopColor="#d5b36f" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx={topology.width / 2} cy={topology.height / 2} r="310" fill="url(#sfiGraphGlow)" />
            {visibleEdges.map((edge) => {
              const from = topology.positions.get(edge.source);
              const to = topology.positions.get(edge.target);
              if (!from || !to) return null;
              const selectedEdge = selectedId === edge.source || selectedId === edge.target;
              return (
                <line
                  key={edge.id}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  className={selectedEdge ? 'graphEdge selected' : 'graphEdge'}
                  strokeWidth={selectedEdge ? 1.4 : Math.max(.35, Math.min(1, edge.weight || .35))}
                />
              );
            })}
            {visibleNodes.map((node) => {
              const position = topology.positions.get(node.id);
              if (!position) return null;
              const selectedNode = selectedId === node.id;
              const showLabel = labelled.has(node.id);
              const radius = selectedNode ? 7 : 2.8 + Math.min(3.2, (degree.get(node.id) ?? 0) * .22);
              return (
                <g
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${node.label}, ${node.type}`}
                  onClick={() => setSelectedId(node.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') setSelectedId(node.id);
                  }}
                  className={selectedNode ? 'graphNode selected' : 'graphNode'}
                >
                  <circle cx={position.x} cy={position.y} r={radius + (selectedNode ? 8 : 3)} className="graphNodeHalo" />
                  <circle cx={position.x} cy={position.y} r={radius} fill={nodeTone(node)} />
                  {showLabel ? (
                    <text x={position.x + 9} y={position.y - 7} className="graphLabel">
                      {short(node.label)}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
          {!visibleNodes.length ? <div className="neuralGraphEmpty">No nodes match this filter.</div> : null}
        </section>

        <aside className="neuralGraphInspector">
          <div className="neuralGraphInspectorHead">
            <span>INSPECTOR</span>
            <strong>{selected ? selected.label : 'Select a node'}</strong>
          </div>
          {selected ? (
            <>
              <dl>
                <div><dt>TYPE</dt><dd>{selected.type}</dd></div>
                <div><dt>ORIGIN</dt><dd>{selected.origin}</dd></div>
                <div><dt>PROVENANCE</dt><dd>{selected.provenance}</dd></div>
                <div><dt>DEGREE</dt><dd>{degree.get(selected.id) ?? 0}</dd></div>
                <div><dt>ID</dt><dd>{selected.id}</dd></div>
                <div><dt>REALITY STAGE</dt><dd>{realityStage(selected).toUpperCase()}</dd></div>
                <div><dt>EPISTEMIC STATE</dt><dd>{selected.reality?.state ?? 'UNKNOWN'}</dd></div>
                <div><dt>VERIFICATION</dt><dd>{selected.reality?.verificationState ?? 'NOT VERIFIED'}</dd></div>
                <div><dt>AUTHORITY</dt><dd>{selected.reality?.authority ?? 'UNKNOWN'}</dd></div>
                <div><dt>EXECUTION</dt><dd>{selected.reality?.executionState ?? 'NOT OBSERVED'}</dd></div><div><dt>TEMPORAL BASIS</dt><dd>{temporalReading(selected).basis}</dd></div><div><dt>TIME / CYCLE</dt><dd>{temporalReading(selected).label}</dd></div><div><dt>METHOD NEED</dt><dd>{selected.methodSignal?.requiresTrajectory ? 'TRAJECTORY' : selected.methodSignal?.requiresRivalHypothesis ? 'RIVAL HYPOTHESIS' : 'NOT DERIVED'}</dd></div><div><dt>REGIME SIGNAL</dt><dd>{regimeSignal(selected)}</dd></div>
              </dl>
              <section>
                <span>FIELD-DERIVED METHOD SIGNAL</span>
                <p>RELATIONS · {selected.methodSignal?.relationCount ?? 0} · EVIDENCE-BOUND {selected.methodSignal?.evidenceBoundRelationCount ?? 0}</p>
                <p>TRANSITION · {selected.methodSignal?.relationTransition ? 'OBSERVED' : 'NOT OBSERVED'} · WEIGHT Δ {selected.methodSignal?.weightChangeObserved ? 'OBSERVED' : 'NOT OBSERVED'}</p>
                <p>COUNTEREVIDENCE · {selected.methodSignal?.counterevidenceObserved ? 'OBSERVED' : 'NOT OBSERVED'} · TEMPORAL STRUCTURE {selected.methodSignal?.temporalStructureObserved ? 'OBSERVED' : 'NOT OBSERVED'}</p>
                <p>EXPECTATION · {selected.methodSignal?.expectationObserved ? 'OBSERVED' : 'NOT OBSERVED'} · RETURN {selected.methodSignal?.returnObserved ? 'OBSERVED' : 'NOT OBSERVED'}</p>
                <p>DISCRIMINATOR · {selected.methodSignal?.discriminatingObservationObserved ? 'OBSERVED' : 'NOT OBSERVED'} · STOP {selected.methodSignal?.stoppingConditionObserved ? 'OBSERVED' : 'NOT OBSERVED'}</p>
                <p>CONTRAST READINESS · {selected.methodSignal?.contrastReady ? 'READY TO VERIFY' : 'OPEN / INCOMPLETE'}</p>
                <p>GOVERNED CONTRAST · {selected.methodSignal?.contrastRecorded ? 'RECORDED' : 'NOT RECORDED'} · LEARNING {selected.methodSignal?.learningCandidateObserved ? 'QUARANTINED' : 'NOT OBSERVED'}</p>
                <p>FIELD REORGANIZATION · {selected.methodSignal?.fieldReorganizationState ?? 'UNCHANGED'}</p>
                <p>REORGANIZATION MAGNITUDE · {selected.methodSignal ? selected.methodSignal.reorganizationMagnitude.toFixed(3) : '0.000'} · ΔWEIGHT {selected.methodSignal?.observedWeightDelta == null ? 'NOT OBSERVED' : selected.methodSignal.observedWeightDelta.toFixed(3)}</p>
                <p>RELATION SUPPORT · {selected.methodSignal?.relationSupportRatio == null ? 'UNKNOWN' : selected.methodSignal.relationSupportRatio.toFixed(3)} · PROVENANCE COVERAGE {selected.methodSignal?.provenanceCoverage == null ? 'UNKNOWN' : selected.methodSignal.provenanceCoverage.toFixed(3)}</p>
              </section>
              <section>
                <span>MCDC / RETURN</span>
                <p>EXPECTED · {selected.reality?.expectedReturn == null ? 'UNKNOWN' : String(selected.reality.expectedReturn)}</p>
                <p>OBSERVED · {selected.reality?.observedReturn == null ? 'NOT OBSERVED' : String(selected.reality.observedReturn)}</p>
                <p>OBLIGATION · {selected.reality?.applicableObligation == null ? 'UNKNOWN' : String(selected.reality.applicableObligation)}</p>
              </section>
              <section>
                <span>LINEAGE</span>
                {selected.lineage.length
                  ? selected.lineage.map((item) => <code key={item}>{item}</code>)
                  : <p>MISSING · no additional lineage declared.</p>}
              </section>
              <section>
                <span>RELATIONS</span>
                {selectedEdges.length ? selectedEdges.map((edge) => {
                  const outbound = edge.source === selected.id;
                  const other = nodeById.get(outbound ? edge.target : edge.source);
                  return (
                    <button
                      key={edge.id}
                      className="neuralGraphRelation"
                      onClick={() => setSelectedId(other?.id ?? null)}
                    >
                      <small>{outbound ? '→' : '←'} {edge.relation}</small>
                      <strong>{other?.label ?? (outbound ? edge.target : edge.source)}</strong>
                      <small>{edge.origin} · {edge.provenance}{edge.lineage.length ? ` · lineage ${edge.lineage.length}` : ''}</small>
                    </button>
                  );
                }) : <p>No visible relations.</p>}
              </section>
            </>
          ) : (
            <p>Select a node para ver procedencia, lineage y relaciones adyacentes. La vista no asigna significado causal a una arista.</p>
          )}
        </aside>
      </div>

      <footer className="neuralGraphFooter">
        <div>
          <span>RUNTIME</span>
          <p>{graphObserved ? 'Persisted canonical graph available.' : 'Degraded view: the documentary projection preserves observability without pretending persistence.'}</p>
        </div>
        <div>
          <span>PRIMARY DIAGNOSTIC</span>
          <p>{graph.primaryDiagnostic ?? 'PRIMARY READ AVAILABLE'}</p>
        </div>
        <div>
          <span>{graph.admission.contract} · WORLD-TO-CLAIM TRACEABILITY</span>
          <p>{reading === 'REALITY_CHAIN' ? 'Ask: why is this claim allowed to represent the world?' : 'Change the reading to inspect time, reconstruction, RETURN and regime dynamics without changing the underlying objects.'}</p>
        </div>
      </footer>
    </main>
  );
}
