'use client';

import { useMemo, useState } from 'react';
import type { AgenticRootState } from '@/lib/agents/sfiAgents';
import type { RootHudGovernanceSnapshot } from '@/lib/root/hudGovernance';
import RootLiveObservatory from './RootLiveObservatory';
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

const ROOT_FIELD_IMAGE_SRC = '/root/root-field-console.webp';

function buildRootUniverse(
  initialState: AgenticRootState,
  worldVector: unknown,
  governance: RootHudGovernanceSnapshot | undefined,
): { generatedAt: string; visibleContract: string; nodes: RootUniverseNode[] } {
  const data = toDataSnapshot(initialState, worldVector);
  const generatedAt = text(initialState.generated_at, new Date().toISOString());
  const govState = text(governance?.acpStatus, 'not_observed');
  const warningState = data.warnings.length ? 'watch' : 'nominal';

  const nodes: RootUniverseNode[] = [
    { id: 'wv_001', type: 'world_vector', label: 'World Vector', count: data.confidenceAvailable ? pct(data.confidence) : 'gated', state: data.confidenceAvailable ? 'observed' : 'gated', source: 'buildWorldVectorOperationalState()' },
    { id: 'sig_001', type: 'signal', label: 'Signal', count: data.warnings.length, state: warningState, source: 'initialState.systemHealth.warnings' },
    { id: 'obs_001', type: 'observation', label: 'Observation', count: data.confidenceAvailable ? pct(data.confidence) : 'missing', state: data.confidenceAvailable ? 'observed' : 'missing', source: 'worldVector.today.observation' },
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
    visibleContract: 'PIXEL_LOCKED_RASTER: live state is mapped to the ROOT Universe contract without mutating the visible raster.',
    nodes,
  };
}

export default function RootFieldExactConsole(props: Props) {
  const { initialState, worldVector, governance } = props;
  const [assetReady, setAssetReady] = useState(false);
  const [assetFailed, setAssetFailed] = useState(false);
  const rootUniverse = useMemo(
    () => buildRootUniverse(initialState, worldVector, governance),
    [initialState, worldVector, governance],
  );

  return (
    <>
      {assetReady ? null : <RootLiveObservatory {...props} />}
      <section
        className={`root-exact-console ${assetReady ? 'is-ready' : 'is-loading'}`}
        aria-label="ROOT frozen cognitive field console"
        data-root-asset={assetFailed ? 'missing' : assetReady ? 'ready' : 'loading'}
        data-root-universe-count={rootUniverse.nodes.length}
        data-root-universe-generated-at={rootUniverse.generatedAt}
      >
        <div className="root-exact-frame">
          <img
            src={ROOT_FIELD_IMAGE_SRC}
            alt="ROOT SYSTEM FRICTION INSTITUTE OBSERVATORY CONSOLE"
            decoding="async"
            draggable={false}
            onLoad={() => {
              setAssetReady(true);
              setAssetFailed(false);
            }}
            onError={() => {
              setAssetReady(false);
              setAssetFailed(true);
            }}
          />
        </div>
      </section>
      <style jsx>{`
        .root-exact-console {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #020406;
          overflow: hidden;
        }

        .root-exact-console.is-loading {
          opacity: 0;
          pointer-events: none;
        }

        .root-exact-console.is-ready {
          opacity: 1;
          pointer-events: none;
        }

        .root-exact-frame {
          position: absolute;
          left: 50%;
          top: 50%;
          width: min(100vw, calc(100vh * 1672 / 941));
          height: min(100vh, calc(100vw * 941 / 1672));
          transform: translate(-50%, -50%);
          overflow: hidden;
          background: #020406;
        }

        .root-exact-frame img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
          user-select: none;
          -webkit-user-drag: none;
        }
      `}</style>
    </>
  );
}
