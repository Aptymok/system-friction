type Props = { queueCount: number; predictionCount: number; warningCount: number; confidence: number };

function clamp(value: number) { return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)); }
function pct(value: number) { return `${Math.round(clamp(value) * 100)}%`; }

export default function GovernanceViewEngine({ queueCount, predictionCount, warningCount, confidence }: Props) {
  const pressure = clamp((queueCount * 0.10) + (predictionCount * 0.04) + (warningCount * 0.08));
  const velocity = clamp(confidence - pressure * 0.28);
  const routes = [
    { id: 'APPROVE', x: 50, y: 15, weight: clamp(confidence * 0.8) },
    { id: 'DENY', x: 82, y: 38, weight: clamp(warningCount / 8) },
    { id: 'HOLD', x: 70, y: 70, weight: clamp(pressure) },
    { id: 'INSPECT', x: 30, y: 70, weight: clamp((predictionCount + warningCount) / 20) },
    { id: 'ROUTE', x: 18, y: 38, weight: clamp(queueCount / 10) },
  ];
  return <div className="governance-engine"><div className="engine-title"><span>GOVERNANCE DECISION CHAMBER</span><b>ROOT DECISION MATRIX</b></div><svg viewBox="0 0 100 86" className="decision-svg" aria-hidden="true"><circle cx="50" cy="44" r="25" fill="none" stroke="#c8a951" strokeOpacity="0.2" strokeWidth="0.25" />{routes.map((route) => <g key={route.id}><line x1="50" y1="44" x2={route.x} y2={route.y} stroke="#c8a951" strokeOpacity={0.2 + route.weight * 0.56} strokeWidth="0.32" /><circle cx={route.x} cy={route.y} r="5.6" fill="#060504" stroke="#f0cf78" strokeOpacity={0.4 + route.weight * 0.55} strokeWidth="0.4" /><text x={route.x} y={route.y + 0.8} textAnchor="middle" fill="#f0cf78" fontSize="1.8" fontFamily="monospace">{route.id}</text></g>)}<circle cx="50" cy="44" r="9" fill="#050403" stroke="#f0cf78" strokeWidth="0.5" /><text x="50" y="43" textAnchor="middle" fill="#f0cf78" fontSize="2.2" fontFamily="monospace">ROOT</text><text x="50" y="47" textAnchor="middle" fill="#a99d82" fontSize="1.6" fontFamily="monospace">DECISION</text></svg><div className="decision-readout"><span>pressure <b>{pct(pressure)}</b></span><span>velocity <b>{pct(velocity)}</b></span><span>queue <b>{queueCount}</b></span><span>warnings <b>{warningCount}</b></span></div></div>;
}
