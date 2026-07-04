import { ROOT_FUNCTIONS_CATALOG, getFunctionAvailability } from '../rootFunctionsCatalog';

function statusColor(status: string) {
  if (status === 'available') return '#8bd27c';
  if (status === 'partial') return '#d8b651';
  return '#8e836c';
}
function pct(value: number) { return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`; }

export default function FunctionsViewEngine() {
  const availability = getFunctionAvailability();
  const items = ROOT_FUNCTIONS_CATALOG.slice(0, 16);
  return <div className="functions-engine"><div className="engine-title"><span>FUNCTIONAL MATRIX</span><b>INSTRUMENT ARRAY</b></div><svg viewBox="0 0 100 86" className="function-svg" aria-hidden="true"><circle cx="50" cy="43" r="10" fill="#050403" stroke="#f0cf78" strokeWidth="0.5" /><text x="50" y="44" textAnchor="middle" fill="#f0cf78" fontSize="2.2" fontFamily="monospace">TOOLS</text>{items.map((item, index) => { const angle = (index / items.length) * Math.PI * 2 - Math.PI / 2; const radius = index % 2 ? 31 : 24; const x = 50 + Math.cos(angle) * radius; const y = 43 + Math.sin(angle) * radius; return <g key={item.id}><line x1="50" y1="43" x2={x} y2={y} stroke="#c8a951" strokeOpacity="0.18" strokeWidth="0.18" /><rect x={x - 5} y={y - 3.2} width="10" height="6.4" rx="1.2" fill="#060504" stroke={statusColor(item.status)} strokeOpacity="0.82" strokeWidth="0.32" /><text x={x} y={y + 0.7} textAnchor="middle" fill="#e7dcc1" fontSize="1.45" fontFamily="monospace">{item.family.slice(0, 4).toUpperCase()}</text></g>; })}</svg><div className="function-readout"><span>total <b>{availability.total}</b></span><span>available <b>{availability.available}</b></span><span>partial <b>{availability.partial}</b></span><span>capacity <b>{pct(availability.score)}</b></span></div></div>;
}
