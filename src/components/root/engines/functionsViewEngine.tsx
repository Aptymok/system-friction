import { ROOT_FUNCTIONS_CATALOG, getFunctionAvailability } from '../rootFunctionsCatalog';

function statusOpacity(status: string) {
  if (status === 'available') return 0.9;
  if (status === 'partial') return 0.58;
  return 0.25;
}

function percent(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

export default function FunctionsViewEngine() {
  const availability = getFunctionAvailability();
  const items = ROOT_FUNCTIONS_CATALOG.slice(0, 16);
  return (
    <div className="functions-engine">
      <div className="engine-title"><span>FUNCTIONAL MATRIX</span><b>INSTRUMENT ARRAY</b></div>
      <svg viewBox="0 0 100 76" className="functions-svg" aria-hidden="true">
        <circle cx="50" cy="38" r="10" fill="#050403" stroke="#f0cf78" strokeWidth="0.45" />
        <text x="50" y="39" textAnchor="middle" fill="#f0cf78" fontSize="2.2" fontFamily="monospace">TOOLS</text>
        {items.map((item, index) => {
          const angle = (index / items.length) * Math.PI * 2 - Math.PI / 2;
          const radius = index % 2 ? 29 : 22;
          const x = 50 + Math.cos(angle) * radius;
          const y = 38 + Math.sin(angle) * radius;
          const opacity = statusOpacity(item.status);
          return <g key={item.id}><line x1="50" y1="38" x2={x} y2={y} stroke="#c8a951" strokeOpacity={opacity * 0.42} strokeWidth="0.18" /><rect x={x - 5.3} y={y - 3.5} width="10.6" height="7" rx="1.4" fill="#060504" stroke="#f0cf78" strokeOpacity={opacity} strokeWidth="0.26" /><text x={x} y={y + 0.6} textAnchor="middle" fill="#f0cf78" fontSize="1.35" fontFamily="monospace">{item.family.slice(0,4).toUpperCase()}</text></g>;
        })}
        {[16,24,32].map((r) => <circle key={r} cx="50" cy="38" r={r} fill="none" stroke="#c8a951" strokeOpacity="0.10" strokeWidth="0.16" />)}
      </svg>
      <div className="functions-readout"><span>total <b>{availability.total}</b></span><span>available <b>{availability.available}</b></span><span>partial <b>{availability.partial}</b></span><span>capacity <b>{percent(availability.score)}</b></span></div>
    </div>
  );
}
