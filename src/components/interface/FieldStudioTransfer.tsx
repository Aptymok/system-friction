'use client';

import { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

type TransferNode = {
  id: string;
  label: string;
  nodeType: string;
  observedAt: string;
};

function typeLabel(value: string) {
  const labels: Record<string, string> = {
    attractor: 'dirección persistente',
    mark: 'aparición observada',
    event: 'evento',
    evidence: 'evidencia',
    intervention: 'microejecución',
    return: 'retorno',
    learning: 'aprendizaje',
  };
  return labels[value] ?? 'punto observado';
}

export function FieldStudioTransfer({ caseId, nodes }: { caseId: string; nodes: TransferNode[] }) {
  const [nodeId, setNodeId] = useState(nodes[0]?.id ?? '');
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function send() {
    if (!nodeId || status === 'sending') return;
    setStatus('sending');
    setMessage(null);
    try {
      const response = await fetch('/api/interface/observatory/send-to-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, nodeId }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || 'No fue posible preparar este punto para STUDIO.');
      window.location.assign(body.nextPath);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'No fue posible preparar este punto para STUDIO.');
    }
  }

  return (
    <section className="border border-[#302a1f] bg-[#090908] p-5">
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#c8a951]">Continuar en STUDIO</div>
      <h2 className="mt-3 text-xl text-[#f1e5ca]">Trabajar un punto sin perder su procedencia</h2>
      <p className="mt-3 text-xs leading-6 text-[#8d8474]">Elige una observación real de tu trayectoria. STUDIO la recibirá como objeto de análisis con su fecha, tipo y vínculo al caso. El traslado no cambia su significado ni ejecuta una intervención.</p>

      {nodes.length ? (
        <>
          <label className="mt-5 grid gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#91866d]">Punto de la trayectoria</span>
            <select value={nodeId} onChange={(event) => setNodeId(event.target.value)} className="border border-[#302a1f] bg-[#050504] px-3 py-3 text-sm text-[#eee4cb] outline-none focus:border-[#c8a951]">
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>{node.label} · {typeLabel(node.nodeType)}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => void send()} disabled={!nodeId || status === 'sending'} className="mt-4 inline-flex w-full items-center justify-center gap-2 border border-[#66552c] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951] disabled:opacity-35">
            {status === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {status === 'sending' ? 'Preparando objeto' : 'Abrir este punto en STUDIO'}
          </button>
        </>
      ) : (
        <p className="mt-4 text-sm leading-6 text-[#918979]">Todavía no existe un punto persistido que pueda enviarse. Conserva una aparición, carga evidencia o registra un retorno primero.</p>
      )}

      {message ? <p className="mt-4 border border-[#6b352a] bg-[#160d0a] p-3 text-xs leading-6 text-[#d89685]">{message}</p> : null}
    </section>
  );
}
