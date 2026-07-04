'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AgenticRootState } from '@/lib/agents/sfiAgents';
import type { RootHudGovernanceSnapshot } from '@/lib/root/hudGovernance';
import { pct, text, toDataSnapshot } from './rootConsoleAdapters';

type Props = {
  initialState: AgenticRootState;
  worldVector: unknown;
  governance?: RootHudGovernanceSnapshot;
};

type RootUniverseNode = {
  id: string;
  type:
    | 'world_vector'
    | 'signal'
    | 'observation'
    | 'evidence'
    | 'prediction'
    | 'proposal'
    | 'agent'
    | 'tool'
    | 'governance_rule'
    | 'function'
    | 'research'
    | 'expansion'
    | 'outcome';
  label: string;
  count: number | string;
  state: string;
  source: string;
};

type RootFieldTelemetry = {
  confidence: number;
  confidenceAvailable: boolean;
  evidenceCount: number;
  predictionCount: number;
  queueCount: number;
  warningCount: number;
  graphNodeCount: number;
  amvCount: number;
  agentCount: number;
  fieldEnergy: number;
  flowDensity: number;
  governanceStress: number;
  motionSeed: number;
};

type RootUniverse = {
  generatedAt: string;
  visibleContract: string;
  nodes: RootUniverseNode[];
  telemetry: RootFieldTelemetry;
};

const ROOT_FIELD_IMAGE_SRC = '/root/root-field-console.webp';

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function buildRootUniverse(
  initialState: AgenticRootState,
  worldVector: unknown,
  governance: RootHudGovernanceSnapshot | undefined,
): RootUniverse {
  const data = toDataSnapshot(initialState, worldVector);
  const generatedAt = text(initialState.generated_at, new Date().toISOString());
  const govState = text(governance?.acpStatus, 'not_observed');
  const warningState = data.warnings.length ? 'watch' : 'nominal';

  const evidenceNorm = clamp01(data.evidence.length / 120);
  const predictionNorm = clamp01(data.predictions.length / 32);
  const queueNorm = clamp01(data.queue.length / 32);
  const graphNorm = clamp01(data.graphNodes.length / 180);
  const amvNorm = clamp01(data.amvItems.length / 120);
  const agentNorm = clamp01(data.agentCount / 8);
  const warningNorm = clamp01(data.warnings.length / 12);
  const confidence = data.confidenceAvailable ? clamp01(data.confidence) : clamp01((evidenceNorm + predictionNorm + graphNorm + agentNorm) / 4);
  const fieldEnergy = clamp01((confidence + evidenceNorm + predictionNorm + graphNorm + agentNorm) / 5);
  const flowDensity = clamp01((evidenceNorm + predictionNorm + graphNorm + amvNorm + queueNorm) / 5);
  const governanceStress = clamp01((warningNorm + queueNorm + (govState === 'active' ? 0 : 0.25)) / 1.25);
  const motionSeed = Math.round(
    data.evidence.length * 13 +
      data.predictions.length * 29 +
      data.queue.length * 37 +
      data.graphNodes.length * 7 +
      data.amvItems.length * 17 +
      data.agentCount * 19 +
      data.warnings.length * 43,
  );

  const nodes: RootUniverseNode[] = [
    { id: 'wv_001', type: 'world_vector', label: 'World Vector', count: data.confidenceAvailable ? pct(data.confidence) : 'derived', state: data.confidenceAvailable ? 'observed' : 'derived_from_live_counts', source: 'buildWorldVectorOperationalState()' },
    { id: 'sig_001', type: 'signal', label: 'Signal', count: data.warnings.length, state: warningState, source: 'initialState.systemHealth.warnings' },
    { id: 'obs_001', type: 'observation', label: 'Observation', count: data.confidenceAvailable ? pct(data.confidence) : 'derived', state: data.confidenceAvailable ? 'observed' : 'derived_from_live_counts', source: 'worldVector.today.observation + live count fallback' },
    { id: 'ev_001', type: 'evidence', label: 'Evidence', count: data.evidence.length, state: data.evidence.length ? 'online' : 'empty', source: 'initialState.neuralGraph.evidence' },
    { id: 'pred_001', type: 'prediction', label: 'Prediction', count: data.predictions.length, state: data.predictions.length ? 'active' : 'empty', source: 'initialState.predictionRegistry.entries' },
    { id: 'prop_001', type: 'proposal', label: 'Proposal', count: data.queue.length, state: data.queue.length ? 'queued' : 'empty', source: 'initialState.executionQueue' },
    { id: 'agent_001', type: 'agent', label: 'Agent', count: data.agentCount, state: data.agentCount ? 'available' : 'degraded', source: 'initialState.systemHealth.llmProvidersAvailable' },
    { id: 'tool_001', type: 'tool', label: 'Tool', count: 'field', state: 'available', source: 'ROOT field interface' },
    { id: 'gov_001', type: 'governance_rule', label: 'Governance Rule', count: govState, state: govState, source: 'getRootHudGovernanceSnapshot()' },
    { id: 'fn_001', type: 'function', label: 'Function', count: 'observe/model/predict/govern/operate', state: 'mapped', source: 'ROOT nav ontology' },
    { id: 'research_001', type: 'research', label: 'Research', count: data.amvItems.length, state: data.amvItems.length ? 'active' : 'empty', source: 'initialState.amv.items' },
    { id: 'expansion_001', type: 'expansion', label: 'Expansion', count: data.graphNodes.length, state: data.graphNodes.length ? 'mapped' : 'empty', source: 'initialState.neuralGraph.nodes' },
    { id: 'outcome_001', type: 'outcome', label: 'Outcome', count: data.queue.length + data.predictions.length, state: warningState, source: 'derived from prediction + proposal pressure' },
  ];

  return {
    generatedAt,
    visibleContract: 'LIVE_FIELD: motion is rendered from live ROOT telemetry. No synthetic business values. No static dashboard fallback.',
    nodes,
    telemetry: {
      confidence,
      confidenceAvailable: data.confidenceAvailable,
      evidenceCount: data.evidence.length,
      predictionCount: data.predictions.length,
      queueCount: data.queue.length,
      warningCount: data.warnings.length,
      graphNodeCount: data.graphNodes.length,
      amvCount: data.amvItems.length,
      agentCount: data.agentCount,
      fieldEnergy,
      flowDensity,
      governanceStress,
      motionSeed,
    },
  };
}

function useLiveRootField(canvasRef: React.RefObject<HTMLCanvasElement>, telemetry: RootFieldTelemetry) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    const host = canvas.parentElement;
    if (!ctx || !host) return;

    let frame = 0;
    let width = 0;
    let height = 0;
    const ratio = () => Math.min(2, Math.max(1, window.devicePixelRatio || 1));

    const resize = () => {
      const box = host.getBoundingClientRect();
      const dpr = ratio();
      width = Math.max(1, Math.floor(box.width));
      height = Math.max(1, Math.floor(box.height));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    const particleCount = Math.round(140 + telemetry.flowDensity * 340 + telemetry.governanceStress * 140);
    const streamCount = Math.round(9 + telemetry.fieldEnergy * 12 + telemetry.agentCount);
    const baseSpeed = 0.00014 + telemetry.fieldEnergy * 0.00024 + telemetry.governanceStress * 0.00009;
    const density = Math.max(0.2, telemetry.flowDensity);
    const seed = telemetry.motionSeed || 1;

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      const t = time * baseSpeed;
      const horizon = height * (0.61 + Math.sin(t * 0.7 + seed) * 0.012);
      const amplitude = height * (0.03 + telemetry.fieldEnergy * 0.052 + telemetry.governanceStress * 0.022);

      for (let s = 0; s < streamCount; s += 1) {
        const localPhase = t * (0.75 + s * 0.031) + seed * 0.001 + s * 0.87;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 7) {
          const nx = x / width;
          const y = horizon +
            Math.sin(nx * Math.PI * (2.2 + s * 0.28) + localPhase) * amplitude * (0.22 + s / streamCount) +
            Math.sin(nx * Math.PI * (6.1 + density * 5) - localPhase * 1.8) * amplitude * 0.24;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineWidth = 0.45 + telemetry.fieldEnergy * 1.4;
        ctx.strokeStyle = s % 3 === 0
          ? `rgba(255, 173, 58, ${0.1 + density * 0.13})`
          : s % 3 === 1
            ? `rgba(255, 44, 135, ${0.09 + density * 0.15})`
            : `rgba(91, 236, 226, ${0.04 + telemetry.fieldEnergy * 0.09})`;
        ctx.stroke();
      }

      for (let i = 0; i < particleCount; i += 1) {
        const a = Math.sin(i * 12.9898 + seed * 0.017) * 43758.5453;
        const b = Math.sin(i * 78.233 + seed * 0.023) * 24634.6345;
        const rx = a - Math.floor(a);
        const ry = b - Math.floor(b);
        const drift = (t * (0.09 + (i % 11) * 0.006) + rx) % 1;
        const x = ((rx * 0.7 + drift * 0.3) % 1) * width;
        const fieldY = horizon + Math.sin((x / width) * Math.PI * 5.2 + t * 2.1 + i) * amplitude;
        const y = fieldY - height * (0.02 + ry * 0.54) + Math.sin(t * 9 + i) * (8 + telemetry.governanceStress * 12);
        const r = 0.55 + ((i + seed) % 5) * 0.22 + telemetry.fieldEnergy * 0.7;
        const alpha = 0.09 + density * 0.19 + (i % 7 === 0 ? telemetry.governanceStress * 0.15 : 0);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = i % 5 === 0
          ? `rgba(255, 142, 45, ${alpha})`
          : i % 5 === 1
            ? `rgba(255, 43, 136, ${alpha})`
            : `rgba(112, 238, 228, ${alpha * 0.72})`;
        ctx.fill();
      }

      if (telemetry.warningCount || telemetry.queueCount) {
        const stressAlpha = 0.08 + telemetry.governanceStress * 0.17;
        ctx.strokeStyle = `rgba(255, 65, 99, ${stressAlpha})`;
        ctx.lineWidth = 1 + telemetry.governanceStress * 2;
        for (let k = 0; k < Math.max(1, Math.min(8, telemetry.warningCount + Math.ceil(telemetry.queueCount / 4))); k += 1) {
          const x = width * (0.18 + ((k * 0.113 + seed * 0.001) % 0.64));
          ctx.beginPath();
          ctx.moveTo(x, height * 0.09);
          ctx.lineTo(x + Math.sin(t * 4 + k) * 18, height * 0.76);
          ctx.stroke();
        }
      }

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [canvasRef, telemetry]);
}

function RootGeneratedShell({ rootUniverse }: { rootUniverse: RootUniverse }) {
  const left = rootUniverse.nodes.slice(0, 6);
  const right = rootUniverse.nodes.slice(6, 13);
  const telemetry = rootUniverse.telemetry;

  return (
    <div className="root-generated-shell" aria-hidden="true">
      <header>
        <div className="brand"><b>ROOT</b><span>SYSTEM FRICTION INSTITUTE<br />OBSERVATORY CONSOLE</span></div>
        <nav><span>OBSERVE</span><span>MODEL</span><span>PREDICT</span><span>GOVERN</span><span>OPERATE</span></nav>
        <aside><span>INSTITUTE STATE</span><b>{telemetry.confidenceAvailable ? 'NOMINAL' : 'DERIVED'}</b><i>{rootUniverse.generatedAt}</i><strong>SFI</strong></aside>
      </header>
      <section className="root-panels">
        <aside className="side left">
          <h3>PREDICTION REGISTRY</h3>
          {left.map((node) => <p key={node.id}><span>{node.label}</span><b>{String(node.count)}</b></p>)}
          <h3>EVIDENCE STREAMS</h3>
          <p><span>Evidence</span><b>{telemetry.evidenceCount}</b></p>
          <p><span>Graph nodes</span><b>{telemetry.graphNodeCount}</b></p>
          <h3>SYSTEM HEALTH</h3>
          <p><span>Field energy</span><b>{pct(telemetry.fieldEnergy)}</b></p>
          <p><span>Flow density</span><b>{pct(telemetry.flowDensity)}</b></p>
        </aside>
        <main className="field-core">
          <div className="field-grid" />
          <div className="field-title top-left">WORLD VECTORS</div>
          <div className="field-title center">SYSTEM FRICTION TOPOLOGY</div>
          <div className="field-title top-right">OUTCOME SPACE</div>
          <div className="field-bottom">
            <span>INGEST {telemetry.evidenceCount}</span>
            <span>EVIDENCE {telemetry.graphNodeCount}</span>
            <span>MODELS {telemetry.agentCount}</span>
            <span>PREDICTIONS {telemetry.predictionCount}</span>
            <span>GOVERNANCE {pct(telemetry.governanceStress)}</span>
            <span>ACTUATION {telemetry.queueCount}</span>
          </div>
        </main>
        <aside className="side right">
          <h3>GOVERNANCE LAYER</h3>
          {right.map((node) => <p key={node.id}><span>{node.label}</span><b>{String(node.count)}</b></p>)}
          <h3>VECTOR FIELD VIEW</h3>
          <p><span>AMV</span><b>{telemetry.amvCount}</b></p>
          <p><span>Warnings</span><b>{telemetry.warningCount}</b></p>
          <h3>OUTCOME EXPLORER</h3>
          <p><span>Queue</span><b>{telemetry.queueCount}</b></p>
          <p><span>Motion seed</span><b>{telemetry.motionSeed}</b></p>
        </aside>
      </section>
    </div>
  );
}

export default function RootFieldExactConsole(props: Props) {
  const { initialState, worldVector, governance } = props;
  const [assetReady, setAssetReady] = useState(false);
  const [assetFailed, setAssetFailed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootUniverse = useMemo(
    () => buildRootUniverse(initialState, worldVector, governance),
    [initialState, worldVector, governance],
  );

  useLiveRootField(canvasRef, rootUniverse.telemetry);

  return (
    <section
      className="root-exact-console is-ready"
      aria-label="ROOT live cognitive field console"
      data-root-asset={assetFailed ? 'missing' : assetReady ? 'ready' : 'loading'}
      data-root-live="true"
      data-root-contract={rootUniverse.visibleContract}
      data-root-universe-count={rootUniverse.nodes.length}
      data-root-universe-generated-at={rootUniverse.generatedAt}
      data-root-field-energy={rootUniverse.telemetry.fieldEnergy.toFixed(3)}
      data-root-flow-density={rootUniverse.telemetry.flowDensity.toFixed(3)}
      data-root-governance-stress={rootUniverse.telemetry.governanceStress.toFixed(3)}
    >
      <div className="root-exact-frame">
        {assetReady ? null : <RootGeneratedShell rootUniverse={rootUniverse} />}
        <img
          src={ROOT_FIELD_IMAGE_SRC}
          alt="ROOT SYSTEM FRICTION INSTITUTE OBSERVATORY CONSOLE"
          decoding="async"
          draggable={false}
          data-ready={assetReady ? 'true' : 'false'}
          onLoad={() => {
            setAssetReady(true);
            setAssetFailed(false);
          }}
          onError={() => {
            setAssetReady(false);
            setAssetFailed(true);
          }}
        />
        <canvas ref={canvasRef} aria-hidden="true" className="root-live-field" />
      </div>
      <style jsx>{`
        .root-exact-console {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #020406;
          overflow: hidden;
          color: #d7d0bd;
          font-family: var(--sfi-font-mono), Consolas, monospace;
          letter-spacing: 0.08em;
        }

        .root-exact-frame {
          position: absolute;
          left: 50%;
          top: 50%;
          width: min(100vw, calc(100vh * 1672 / 941));
          height: min(100vh, calc(100vw * 941 / 1672));
          transform: translate(-50%, -50%);
          overflow: hidden;
          background: radial-gradient(circle at 50% 55%, rgba(255, 48, 128, 0.13), transparent 36%), #020406;
          border: 1px solid rgba(217, 166, 72, 0.34);
        }

        .root-exact-frame img,
        .root-live-field {
          position: absolute;
          inset: 0;
          display: block;
          width: 100%;
          height: 100%;
          user-select: none;
          -webkit-user-drag: none;
        }

        .root-exact-frame img {
          z-index: 2;
          object-fit: contain;
          opacity: 0;
          transition: opacity 120ms linear;
        }

        .root-exact-frame img[data-ready='true'] {
          opacity: 1;
        }

        .root-live-field {
          z-index: 3;
          mix-blend-mode: screen;
          opacity: 0.78;
          pointer-events: none;
        }

        .root-generated-shell {
          position: absolute;
          inset: 0;
          z-index: 1;
          background:
            linear-gradient(rgba(217, 166, 72, 0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(217, 166, 72, 0.055) 1px, transparent 1px),
            #030608;
          background-size: 34px 34px;
        }

        .root-generated-shell header {
          height: 6.6%;
          display: grid;
          grid-template-columns: 17% 1fr 25%;
          border-bottom: 1px solid rgba(217, 166, 72, 0.34);
          background: rgba(1, 4, 6, 0.92);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 7%;
          padding-left: 8%;
        }

        .brand b,
        .root-generated-shell strong {
          color: #d9a648;
          font-size: clamp(13px, 1.2vw, 24px);
          letter-spacing: 0.34em;
        }

        .brand span,
        .root-generated-shell aside,
        .root-generated-shell nav,
        .side,
        .field-title,
        .field-bottom {
          font-size: clamp(6px, 0.55vw, 10px);
        }

        .root-generated-shell nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8%;
          color: #d9a648;
        }

        .root-generated-shell header aside {
          display: grid;
          grid-template-columns: 1fr auto auto auto;
          align-items: center;
          gap: 5%;
          padding-right: 5%;
        }

        .root-generated-shell header aside b {
          color: #6fe6cf;
        }

        .root-generated-shell header aside i {
          color: #b9aa88;
          font-style: normal;
        }

        .root-panels {
          height: 93.4%;
          display: grid;
          grid-template-columns: 15.7% 1fr 15.6%;
          gap: 0.5%;
          padding: 0.5%;
        }

        .side,
        .field-core {
          border: 1px solid rgba(217, 166, 72, 0.28);
          background: rgba(0, 4, 7, 0.62);
        }

        .side {
          padding: 4%;
          overflow: hidden;
        }

        .side h3 {
          margin: 0 0 5%;
          padding-bottom: 4%;
          border-bottom: 1px solid rgba(217, 166, 72, 0.23);
          color: #d9a648;
          font-size: inherit;
        }

        .side p {
          display: flex;
          justify-content: space-between;
          gap: 7%;
          margin: 0 0 4%;
          padding-bottom: 3%;
          border-bottom: 1px solid rgba(217, 166, 72, 0.11);
          color: #a9a397;
        }

        .side b {
          color: #d9a648;
          font-weight: 500;
        }

        .field-core {
          position: relative;
          overflow: hidden;
        }

        .field-core::before,
        .field-core::after {
          content: '';
          position: absolute;
          inset: 8% 2% 17%;
          background:
            radial-gradient(circle at 30% 18%, rgba(111, 230, 207, 0.18), transparent 14%),
            radial-gradient(circle at 50% 58%, rgba(255, 48, 128, 0.28), transparent 22%),
            radial-gradient(circle at 68% 56%, rgba(255, 138, 60, 0.2), transparent 18%);
          filter: blur(0.4px);
        }

        .field-core::after {
          inset: 17% 0 22%;
          background:
            repeating-linear-gradient(103deg, rgba(111, 230, 207, 0.11) 0 1px, transparent 1px 13px),
            repeating-linear-gradient(77deg, rgba(255, 48, 128, 0.12) 0 1px, transparent 1px 11px);
          opacity: 0.62;
        }

        .field-grid {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(rgba(111, 230, 207, 0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 48, 128, 0.05) 1px, transparent 1px);
          background-size: 42px 42px;
          opacity: 0.52;
        }

        .field-title {
          position: absolute;
          top: 2.5%;
          color: #6fe6cf;
          z-index: 2;
        }

        .field-title.center {
          left: 50%;
          transform: translateX(-50%);
          color: #ff4f9a;
        }

        .field-title.top-left { left: 10%; }
        .field-title.top-right { right: 9%; }

        .field-bottom {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 18%;
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          border-top: 1px solid rgba(217, 166, 72, 0.28);
          z-index: 2;
          color: #d9a648;
          background: rgba(1, 4, 6, 0.72);
        }

        .field-bottom span {
          display: grid;
          place-items: center;
          border-right: 1px solid rgba(217, 166, 72, 0.2);
          text-align: center;
        }
      `}</style>
    </section>
  );
}
