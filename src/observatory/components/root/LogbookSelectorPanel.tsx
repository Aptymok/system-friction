'use client';

import { useEffect, useState } from 'react';

type Row = Record<string, unknown>;

const FILTERS = [
  ['all', 'Todas'],
  ['twin', 'Mi Twin'],
  ['world', 'WorldSpect'],
  ['scorefriction', 'ScoreFriction'],
  ['amv', 'AMV Thoughts'],
  ['self_observability', 'Self Observability'],
  ['reconstruction', 'Reconstruction'],
  ['system', 'Errores / Fallbacks'],
];

export function LogbookSelectorPanel() {
  const [scope, setScope] = useState('all');
  const [entries, setEntries] = useState<Row[]>([]);

  useEffect(() => {
    fetch(`/api/logbook/visible?role=system&scope=${encodeURIComponent(scope)}`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => setEntries(Array.isArray(data.entries) ? data.entries : []))
      .catch(() => setEntries([]));
  }, [scope]);

  return (
    <div className="border border-[#1e1c17] bg-[#080706] p-3 font-mono text-[10px] text-[#9c9282]">
      <div className="mb-2 text-[9px] uppercase tracking-[0.18em] text-[#c8a951]">Bitacora visible</div>
      <select value={scope} onChange={(event) => setScope(event.target.value)} className="mb-2 w-full border border-[#1e1c17] bg-[#060605] p-2 text-[#d8d0bd]">
        {FILTERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <div className="max-h-64 overflow-auto">
        {entries.slice(0, 20).map((entry) => (
          <div key={String(entry.id)} className="border-b border-[#1e1c17] py-2">
            <b className="text-[#d8d0bd]">{String(entry.title ?? entry.event_type)}</b>
            <div>{String(entry.summary ?? '')}</div>
          </div>
        ))}
        {!entries.length ? <div>sin entradas visibles</div> : null}
      </div>
    </div>
  );
}


