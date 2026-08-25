'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

export type CognitiveSpineFocus = {
  id: string;
  kind: string;
  title: string;
  status?: string | null;
  detail?: string | null;
};

type Row = Record<string, any>;

type Props = {
  enabled: boolean;
  focusOptions: CognitiveSpineFocus[];
  twinOpenCount: number;
};

const LAYER_META: Record<string, { label: string; question: string; x: number; y: number }> = {
  observe: { label: 'SENSORY', question: '¿Qué está ocurriendo?', x: 15, y: 16 },
  reconstruct: { label: 'RECONSTRUCT', question: '¿Qué contexto falta?', x: 10, y: 36 },
  simulate: { label: 'SIMULATION', question: '¿Qué cambia si cambia algo?', x: 14, y: 61 },
  understand: { label: 'COUPLING', question: '¿Qué está conectado?', x: 28, y: 79 },
  project: { label: 'TRAJECTORY', question: '¿Qué trayectoria emerge?', x: 72, y: 79 },
  decide: { label: 'DELIBERATION', question: '¿Debe hacerse?', x: 86, y: 61 },
  act: { label: 'EXECUTION', question: '¿Cómo se ejecuta?', x: 90, y: 36 },
  learn: { label: 'RETURN', question: '¿Qué regresó de realidad?', x: 85, y: 16 },
};

function stateClass(value: unknown) {
  const state = String(value ?? '').toLowerCase();
  if (/missing|failed|blocked|critical|degraded/.test(state)) return 'isBlocked';
  if (/gated|queued|waiting|pending|ready/.test(state)) return 'isAttention';
  if (/operational|observed|accepted|recorded|connected|functional/.test(state)) return 'isReady';
  return '';
}

function short(value: unknown, fallback = '—') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function compactHash(value: unknown) {
  const text = short(value, '—');
  return text.length > 22 ? `${text.slice(0, 10)}…${text.slice(-8)}` : text;
}

export function CognitiveSpineAnatomy({ enabled, focusOptions, twinOpenCount }: Props) {
  const [open, setOpen] = useState(false);
  const [spine, setSpine] = useState<Row | null>(null);
  const [runtime, setRuntime] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string>('');
  const [selectedLayer, setSelectedLayer] = useState<string>('observe');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  useEffect(() => {
    if (!focusOptions.length) {
      setFocusId('');
      return;
    }
    if (!focusOptions.some((item) => item.id === focusId)) setFocusId(focusOptions[0].id);
  }, [focusOptions, focusId]);

  useEffect(() => {
    if (!enabled || !open) return;
    let stop = false;
    const pull = async () => {
      try {
        const [spineResponse, runtimeResponse] = await Promise.all([
          fetch('/api/root/cognitive-spine/status', { cache: 'no-store' }),
          fetch('/api/root/cognitive-runtime', { cache: 'no-store' }),
        ]);
        const [spineJson, runtimeJson] = await Promise.all([
          spineResponse.json().catch(() => null),
          runtimeResponse.json().catch(() => null),
        ]);
        if (stop) return;
        setSpine(spineResponse.ok && spineJson?.ok ? spineJson : null);
        setRuntime(runtimeResponse.ok && runtimeJson?.ok ? runtimeJson : null);
        const failures = [
          !spineResponse.ok ? `spine ${spineResponse.status}:${spineJson?.error ?? 'read_failed'}` : null,
          !runtimeResponse.ok ? `runtime ${runtimeResponse.status}:${runtimeJson?.error ?? 'read_failed'}` : null,
        ].filter(Boolean);
        setError(failures.length ? failures.join(' · ') : null);
      } catch (cause) {
        if (!stop) setError(cause instanceof Error ? cause.message : String(cause));
      }
    };
    void pull();
    const timer = window.setInterval(pull, 30000);
    return () => { stop = true; window.clearInterval(timer); };
  }, [enabled, open]);

  const runtimeState = runtime?.runtime ?? null;
  const agents: Row[] = Array.isArray(runtimeState?.agents) ? runtimeState.agents : [];
  const layers: Row[] = Array.isArray(runtimeState?.layers) ? runtimeState.layers : [];
  const events: Row[] = Array.isArray(runtimeState?.eventGraph?.recentEvents) ? runtimeState.eventGraph.recentEvents : [];
  const spineStatus = spine?.status ?? null;
  const focus = focusOptions.find((item) => item.id === focusId) ?? focusOptions[0] ?? null;
  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) ?? null;
  const selectedLayerState = layers.find((layer) => layer.id === selectedLayer) ?? null;
  const selectedLayerAgents = agents.filter((agent) => agent.layer === selectedLayer);
  const lastExecution = selectedAgent
    ? events.find((event) => event.eventName === 'SFI_AGENT_EXECUTED' && event.sourceId === selectedAgent.id) ?? null
    : null;

  const counts = useMemo(() => ({
    total: agents.length,
    operational: agents.filter((agent) => agent.status === 'operational').length,
    gated: agents.filter((agent) => agent.status === 'gated').length,
    degraded: agents.filter((agent) => agent.status === 'degraded').length,
    missing: agents.filter((agent) => agent.status === 'missing').length,
  }), [agents]);

  if (!open) {
    return <button className="csOpen" disabled={!enabled} onClick={() => setOpen(true)}>
      <span>COGNITIVE SPINE</span><small>ANATOMÍA OPERACIONAL · {twinOpenCount} TWIN/CYCLOS</small>
    </button>;
  }

  if (typeof document === 'undefined') return null;

  return createPortal(<section className="csOverlay" aria-label="Cognitive Spine operational anatomy">
    <header className="csHead">
      <div><small>SFI · ROOT · OBSERVATIONAL ANATOMY</small><strong>COGNITIVE SPINE</strong></div>
      <div className="csHeadState"><span>{counts.operational}/{counts.total || 21} AGENTS OBSERVED</span><span>{spineStatus?.available ? 'SPINE AVAILABLE' : 'SPINE UNAVAILABLE'}</span></div>
      <button onClick={() => setOpen(false)}>CLOSE</button>
    </header>

    <div className="csFocusStrip">
      <div><small>OBSERVATION FOCUS</small><strong>{focus?.title ?? 'SFI institutional state'}</strong><span>{focus ? `${focus.kind} · ${focus.status ?? 'state unknown'} · ${focus.detail ?? focus.id}` : 'No actionable object selected; anatomy remains institutional.'}</span></div>
      <div className="csFocusChoices">
        {focusOptions.slice(0, 8).map((item) => <button key={item.id} className={item.id === focus?.id ? 'active' : ''} onClick={() => setFocusId(item.id)}>{item.kind}</button>)}
      </div>
    </div>

    <div className="csBody">
      <div className="csAnatomy">
        <div className="csSkull"><span>CT-A01</span><small>{twinOpenCount} open</small></div>
        <div className="csSpineAxis" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index}/>)}</div>
        {Array.from({ length: 7 }, (_, index) => <span key={`l${index}`} className={`csRib csRibL r${index + 1}`} aria-hidden="true"/>)}
        {Array.from({ length: 7 }, (_, index) => <span key={`r${index}`} className={`csRib csRibR r${index + 1}`} aria-hidden="true"/>)}

        <button className={`csObservedObject ${stateClass(focus?.status)}`} onClick={() => setSelectedAgentId('')}>
          <small>OBSERVED OBJECT</small><strong>{focus ? focus.title.slice(0, 36) : 'INSTITUTION'}</strong><span>{focus?.status ?? 'observing'}</span>
        </button>

        {layers.map((layer) => {
          const meta = LAYER_META[String(layer.id)] ?? { label: String(layer.id).toUpperCase(), question: short(layer.question), x: 50, y: 50 };
          const layerAgents = agents.filter((agent) => agent.layer === layer.id);
          return <div key={layer.id} className={`csOrgan ${selectedLayer === layer.id ? 'active' : ''}`} style={{ left: `${meta.x}%`, top: `${meta.y}%` }}>
            <button className={`csOrganHead ${stateClass(layer.status)}`} onClick={() => { setSelectedLayer(String(layer.id)); setSelectedAgentId(''); }}>
              <small>{meta.label}</small><strong>{layerAgents.length}</strong><span>{short(layer.status)}</span>
            </button>
            <div className="csAgentFigures" aria-label={`${meta.label} agents`}>
              {layerAgents.map((agent) => <button key={agent.id} title={`${agent.name} · ${agent.status}`} className={`csAgentFigure ${stateClass(agent.status)} ${selectedAgentId === agent.id ? 'active' : ''}`} onClick={() => { setSelectedLayer(String(layer.id)); setSelectedAgentId(String(agent.id)); }}><i/><span/></button>)}
            </div>
          </div>;
        })}
        <div className="csReturnArrow"><span>RETURN</span><i>→ OBSERVATION</i></div>
      </div>

      <aside className="csInspector">
        <section>
          <small>COGNITIVE SPINE SNAPSHOT</small>
          <dl>
            <div><dt>snapshot</dt><dd>{compactHash(spineStatus?.snapshot?.hash)}</dd></div>
            <div><dt>cutoff</dt><dd>{short(spineStatus?.snapshot?.sourceCutoff)}</dd></div>
            <div><dt>sources</dt><dd>{spineStatus?.state?.sources ?? '—'}</dd></div>
            <div><dt>evidence</dt><dd>{spineStatus?.state?.evidence ?? '—'}</dd></div>
            <div><dt>memory</dt><dd>{spineStatus?.state?.memory ?? '—'}</dd></div>
            <div><dt>decisions</dt><dd>{spineStatus?.state?.decisions ?? '—'}</dd></div>
            <div><dt>contradictions</dt><dd>{spineStatus?.state?.contradictions ?? '—'}</dd></div>
            <div><dt>verification debt</dt><dd>{spineStatus?.state?.verificationDebt ?? '—'}</dd></div>
          </dl>
        </section>

        <section>
          {selectedAgent ? <>
            <small>AGENT · {short(selectedAgent.layer).toUpperCase()}</small>
            <h3>{short(selectedAgent.name, selectedAgent.id)}</h3>
            <p>{short(selectedAgent.purpose)}</p>
            <dl>
              <div><dt>status</dt><dd className={stateClass(selectedAgent.status)}>{short(selectedAgent.status)}</dd></div>
              <div><dt>domain</dt><dd>{short(selectedAgent.domain)}</dd></div>
              <div><dt>authority</dt><dd>{short(selectedAgent.authorityLevel)}</dd></div>
              <div><dt>human gate</dt><dd>{selectedAgent.humanApprovalRequired ? 'YES' : 'NO'}</dd></div>
              <div><dt>last observed execution</dt><dd>{short(lastExecution?.occurredAt, 'none in recent event window')}</dd></div>
            </dl>
            {Array.isArray(selectedAgent.evidence?.warnings) && selectedAgent.evidence.warnings.length > 0 && <div className="csWarnings">{selectedAgent.evidence.warnings.slice(0, 4).map((warning: string) => <span key={warning}>{warning}</span>)}</div>}
          </> : <>
            <small>LAYER · {short(selectedLayerState?.id, selectedLayer).toUpperCase()}</small>
            <h3>{LAYER_META[selectedLayer]?.label ?? selectedLayer.toUpperCase()}</h3>
            <p>{LAYER_META[selectedLayer]?.question ?? short(selectedLayerState?.question)}</p>
            <dl>
              <div><dt>status</dt><dd className={stateClass(selectedLayerState?.status)}>{short(selectedLayerState?.status)}</dd></div>
              <div><dt>agents</dt><dd>{selectedLayerAgents.length}</dd></div>
              <div><dt>operational</dt><dd>{selectedLayerAgents.filter((agent) => agent.status === 'operational').length}</dd></div>
              <div><dt>gated</dt><dd>{selectedLayerAgents.filter((agent) => agent.status === 'gated').length}</dd></div>
            </dl>
            <div className="csAgentList">{selectedLayerAgents.map((agent) => <button key={agent.id} onClick={() => setSelectedAgentId(String(agent.id))}><b>{short(agent.name, agent.id)}</b><span className={stateClass(agent.status)}>{short(agent.status)}</span></button>)}</div>
          </>}
        </section>

        <section>
          <small>BOUNDARY</small>
          <p>Spine context is not evidence. Agent registration is not execution. Twin learning is not validation. ROOT canon remains a separate governed promotion.</p>
          {error && <p className="csError">DEGRADED · {error}</p>}
        </section>
      </aside>
    </div>

    <footer className="csFooter">
      <span>OBSERVE</span><i>→</i><span>CONTEXT</span><i>→</i><span>AGENTS</span><i>→</i><span>EXECUTE</span><i>→</i><span>RETURN</span><i>→</i><strong>OBSERVE AGAIN</strong>
      <small>Human action appears only at a real authority boundary.</small>
    </footer>
  </section>, document.body);
}
