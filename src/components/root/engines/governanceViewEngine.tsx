type Props = { queueCount: number; warningCount: number; predictionCount: number; evidenceCount: number };

function clamp(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function percent(value: number) {
  return `${Math.round(clamp(value) * 100)}%`;
}

export default function GovernanceViewEngine({ queueCount, warningCount, predictionCount, evidenceCount }: Props) {
  const load = clamp((queueCount + predictionCount * 0.35 + warningCount * 0.55) / 18);
  const evidence = clamp(evidenceCount / 24);
  const routes = [
    { id: 'APPROVE', x: 50, y: 14, weight: clamp(evidence * 0.82) },
    { id: 'HOLD', x: 82, y: 36, weight: clamp(load * 0.72) },
    { id: 'ROUTE', x: 70, y: 66, weight: clamp((load + evidence) / 2) },
    { id: 'INSPECT', x: 30, y: 66, weight: clamp(evidence * 0.66 + load * 0.22) },
    { id: 'REVIEW', x: 18, y: 36, weight: clamp(warningCount / 8) },
  ];
  return (
    <div className="governance-engine">
      <div className="engine-title"><span>GOVERNANCE DECISION CHAMBER</span><b>ROOT DECISION MATRIX</b></div>
      <svg viewBox="0 0 100 76" className="governance-svg" aria-hidden="true">
        <circle cx="50" cy="42" r="12" fill="#050403" stroke="#f0cf78" strokeWidth="0.45" />
        <text x="50" y="40.8" textAnchor="middle" fill="#f0cf78" fontSize="2.3" fontFamily="monospace">ROOT</text>
        <text x="50" y="44.6" textAnchor="middle" fill="#a99d82" fontSize="1.5" fontFamily="monospace">DECISION</text>
        {routes.map((route) => <g key={route.id}><line x1="50" y1="42" x2={route.x} y2={route.y} stroke="#c8a951" strokeOpacity={0.18 + route.weight * 0.62} strokeWidth={0.18 + route.weight * 0.42} /><circle cx={route.x} cy={route.y} r="6" fill="#060504" stroke="#f0cf78" strokeOpacity={0.28 + route.weight * 0.62} strokeWidth="0.35" /><text x={route.x} y={route.y + 0.6} textAnchor="middle" fill="#f0cf78" fontSize="1.65" fontFamily="monospace">{route.id}</text></g>)}
        {[20,30,40].map((r) => <circle key={r} cx="50" cy="42" r={r} fill="none" stroke="#c8a951" strokeOpacity="0.10" strokeWidth="0.16" />)}
      </svg>
      <div className="governance-readout"><span>load <b>{percent(load)}</b></span><span>evidence <b>{percent(evidence)}</b></span><span>warnings <b>{warningCount}</b></span><span>queue <b>{queueCount}</b></span></div>
    </div>
  );
}
