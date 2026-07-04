import { buildRootExpansionModel } from '../rootExpansionModel';

type Props = { confidence: number; amvCount: number; predictionCount: number; evidenceCount: number };
function pct(value: number) { return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`; }

export default function ExpansionViewEngine(props: Props) {
  const model = buildRootExpansionModel(props);
  return <div className="expansion-engine"><div className="engine-title"><span>OPPORTUNITY FIELD</span><b>EMERGING ROUTES</b></div><svg viewBox="0 0 100 86" className="expansion-svg" aria-hidden="true"><circle cx="50" cy="43" r="8" fill="#050403" stroke="#f0cf78" strokeWidth="0.5" /><text x="50" y="44" textAnchor="middle" fill="#f0cf78" fontSize="2.2" fontFamily="monospace">FIELD</text>{model.themes.map((theme, index) => { const angle = (index / model.themes.length) * Math.PI * 2 - Math.PI / 2; const radius = 20 + theme.persistence * 20; const x = 50 + Math.cos(angle) * radius; const y = 43 + Math.sin(angle) * radius; const opacity = 0.2 + theme.persistence * 0.62; return <g key={theme.id}><line x1="50" y1="43" x2={x} y2={y} stroke="#c8a951" strokeOpacity={opacity} strokeWidth="0.25" /><circle cx={x} cy={y} r={3.6 + theme.persistence * 2.3} fill="#060504" stroke="#f0cf78" strokeOpacity={opacity} strokeWidth="0.35" /><text x={x} y={y + 0.8} textAnchor="middle" fill="#e7dcc1" fontSize="1.35" fontFamily="monospace">{theme.recommendation.toUpperCase()}</text></g>; })}</svg><div className="expansion-readout"><span>themes <b>{model.themes.length}</b></span><span>investigations <b>{model.investigations.length}</b></span><span>attractor <b>{pct(model.attractorIndex)}</b></span><span>derived <b>YES</b></span></div></div>;
}
