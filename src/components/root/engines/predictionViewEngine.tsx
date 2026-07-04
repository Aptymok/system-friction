import { buildPredictionTopologyModel } from './predictionTopologyModel';

type Props = { entries: unknown[]; confidence: number };

function percent(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

export default function PredictionViewEngine({ entries, confidence }: Props) {
  const model = buildPredictionTopologyModel(entries, confidence);
  return (
    <div className="prediction-engine">
      <div className="engine-title"><span>PREDICTIVE TOPOLOGY</span><b>BRANCHING PROBABILITY SPACE</b></div>
      <svg viewBox="0 0 100 64" className="prediction-svg" aria-hidden="true">
        {[18, 32, 46, 60, 74, 88].map((x, index) => (
          <g key={x}>
            <line x1={x} y1="8" x2={x} y2="56" stroke="#c8a951" strokeOpacity="0.13" strokeWidth="0.18" />
            <text x={x} y="6" textAnchor="middle" fill="#8e836c" fontSize="1.8" fontFamily="monospace">{['NOW','T+1W','T+1M','T+3M','T+6M','T+12M'][index]}</text>
          </g>
        ))}
        <circle cx="8" cy="32" r="4.2" fill="#070604" stroke="#f0cf78" strokeWidth="0.35" />
        <text x="8" y="33" textAnchor="middle" fill="#f0cf78" fontSize="1.8" fontFamily="monospace">NOW</text>
        {model.paths.map((path) => (
          <g key={path.id}>
            <path d={`M8 32 ${path.nodes.map((node) => `L ${node.x} ${node.y}`).join(' ')}`} fill="none" stroke="#f0cf78" strokeOpacity={path.band === 'high' ? 0.88 : path.band === 'mediumHigh' ? 0.68 : path.band === 'medium' ? 0.48 : 0.26} strokeWidth="0.34" />
            {path.nodes.map((node) => <circle key={node.id} cx={node.x} cy={node.y} r="1.1" fill="#f0cf78" opacity="0.72" />)}
          </g>
        ))}
      </svg>
      <div className="prediction-readout">
        <span>drafts <b>{model.drafts.length}</b></span>
        <span>risk <b>{percent(model.falsificationRisk)}</b></span>
        <span>calibration <b>{percent(model.calibrationReadiness)}</b></span>
        <span>quality <b>{percent(model.qualityIndex)}</b></span>
      </div>
    </div>
  );
}
