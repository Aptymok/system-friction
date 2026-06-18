'use client';

import { useEffect, useState } from 'react';

type Row = Record<string, unknown>;

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

export function RootLiveGraphPanel() {
  const [graph, setGraph] = useState<Row | null>(null);

  useEffect(() => {
    fetch('/api/root/neural-graph/live', { cache: 'no-store' })
      .then((response) => response.json())
      .then(setGraph)
      .catch((error) => setGraph({ ok: false, nodes: [], edges: [], error: error instanceof Error ? error.message : 'graph_failed' }));
  }, []);

  const nodes = rows(graph?.nodes);
  const edges = rows(graph?.edges);

  return (
    <div className="pointer-events-auto absolute bottom-3 right-3 z-20 max-h-[42vh] w-[520px] overflow-auto border border-[#1e1c17] bg-[#060605]/92 p-3 font-mono text-[10px] text-[#9c9282]">
      <div className="mb-2 flex items-center justify-between text-[9px] uppercase tracking-[0.18em]">
        <span className="text-[#c8a951]">Neural Graph Vivo</span>
        <span>{nodes.length} nodos / {edges.length} aristas</span>
      </div>
      {!nodes.length ? <div>sin datos suficientes</div> : null}
      <div className="grid grid-cols-2 gap-2">
        {nodes.slice(0, 16).map((node) => (
          <div key={String(node.id)} className="border-l border-[#1e1c17] pl-2">
            <b className="block text-[#d8d0bd]">{String(node.type)}</b>
            <span>{String(node.label)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

