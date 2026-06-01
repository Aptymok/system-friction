// src/components/root/SystemOverridePanel.tsx
'use client';

import { useState } from 'react';

export function SystemOverridePanel() {
  const [intent, setIntent] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const submitIntent = async () => {
    const trimmed = intent.trim();
    if (!trimmed) return;
    setLoading(true);
    setStatus(null);
    try {
      await fetch('/api/admin/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          intent: trimmed,
          source: 'acp_root_text_control',
          confidenceThreshold: 0.7,
        }),
      });
      setStatus('Intención registrada. El ajuste queda trazado como control ACP.');
      setIntent('');
    } catch {
      setStatus('No se pudo registrar la intención.');
    } finally {
      setLoading(false);
    }
  };

  const pauseSystem = async () => {
    setLoading(true);
    try {
      await fetch('/api/admin/freeze', { method: 'POST', credentials: 'include' });
      setStatus('Pausa root registrada.');
    } catch {
      setStatus('No se pudo registrar la pausa root.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="border border-[#1e1c17] bg-[#0e0d0b] p-3">
      <div className="mb-2 font-mono text-[8px] uppercase tracking-[0.2em] text-[#8a7035]">Control Root</div>
      <textarea
        value={intent}
        onChange={(event) => setIntent(event.target.value)}
        className="min-h-20 w-full resize-none border border-[#1e1c17] bg-[#060605] p-2 font-mono text-[10px] text-[#ccc8bc] outline-none placeholder:text-[#35312a] focus:border-[#8a7035]"
        placeholder="Dile al sistema qué debe ajustar: pedir más evidencia, bajar riesgo, pausar cambios, elevar criterio, revisar una propuesta..."
      />
      <div className="mt-2 grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => void submitIntent()}
          disabled={loading || !intent.trim()}
          className="border border-[#8a7035] bg-[#2e2410] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.14em] text-[#c8a951] disabled:opacity-40"
        >
          Aplicar intención
        </button>
        <button
          type="button"
          onClick={() => void pauseSystem()}
          disabled={loading}
          className="border border-[#5a2020] bg-[#5a2020]/20 px-3 py-2 font-mono text-[8px] uppercase tracking-[0.14em] text-[#c87060] disabled:opacity-40"
        >
          Pausar
        </button>
      </div>
      {status ? <div className="mt-2 font-mono text-[8px] leading-5 text-[#8a7035]">{status}</div> : null}
    </section>
  );
}
