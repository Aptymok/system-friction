import { buildAgentLatticeModel } from './agentLatticeModel';

type Props = {
  worldVectorStatus: unknown;
  graphStatus: unknown;
  amvStatus: unknown;
  predictionStatus: unknown;
  providerCount: number;
  amvCount: number;
  evidenceCount: number;
  predictionCount: number;
  warningCount: number;
};

function colorFor(status: string) {
  if (status === 'active') return '#8bd27c';
  if (status === 'degraded') return '#d8b651';
  if (status === 'queued') return '#84a9c9';
  return '#8e836c';
}

function percent(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

export default function AgentViewEngine(props: Props) {
  const model = buildAgentLatticeModel(props);
  const byId = Object.fromEntries(model.nodes.map((node) => [node.id, node]));
  return (
    <div className="agent-engine">
      <div className="engine-title"><span>INTERNAL AGENT LATTICE</span><b>ROOT ORCHESTRATOR</b></div>
      <svg viewBox="0 0 100 76" className="agent-svg" aria-hidden="true">
        {[14, 24, 34].map((r) => <circle key={r} cx="50" cy="44" r={r} fill="none" stroke="#c8a951" strokeOpacity="0.18" strokeWidth="0.2" />)}
        {model.links.map((link) => {
          const from = byId[link.from];
          const to = byId[link.to];
          if (!from || !to) return null;
          return <line key={link.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={link.kind === 'failed' ? '#e36a52' : '#c8a951'} strokeOpacity={link.weight} strokeWidth={link.kind === 'primary' ? '0.38' : '0.22'} strokeDasharray={link.kind === 'weak' ? '1 2' : undefined} />;
        })}
        {model.nodes.map((node) => <g key={node.id}><circle cx={node.x} cy={node.y} r={node.id === 'root-orchestrator' ? 7.2 : 5.1} fill="#060504" stroke={colorFor(node.status)} strokeOpacity="0.92" strokeWidth="0.42" /><text x={node.x} y={node.y - 0.8} textAnchor="middle" fill="#f0cf78" fontSize="1.75" fontFamily="monospace">{node.label.split(' ')[0]}</text><text x={node.x} y={node.y + 2.5} textAnchor="middle" fill="#a99d82" fontSize="1.45" fontFamily="monospace">{node.status}</text></g>)}
      </svg>
      <div className="agent-readout">
        <span>health <b>{percent(model.healthIndex)}</b></span>
        <span>deps <b>{percent(model.dependencyHealth)}</b></span>
        <span>memory <b>{percent(model.memoryIntegrity)}</b></span>
        <span>throughput <b>{percent(model.throughputScore)}</b></span>
      </div>
    </div>
  );
}
