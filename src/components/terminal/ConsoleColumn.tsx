'use client';

import { useMemo, useState } from 'react';
import { useNodeStore } from '@/lib/store/nodeStore';
import { sendAudit } from '@/lib/api/audit';

export function ConsoleColumn() {
  const { addLog, status, audits, logs, metrics } = useNodeStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const recentLogs = useMemo(() => logs.slice(0, 6), [logs]);

  const loadIndicator = Math.min(1, Math.max(0, metrics.ldi * 1.2));
  const highNTI = metrics.nti > 0.72
  const highIHG = metrics.ihg > 0.7
  const lagging = metrics.ldi > 0.45

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    addLog(`> ${input}`, 'user');
    try {
      const result = await sendAudit(input);
      if (result.success) {
        addLog(`[Sistema] IHG: ${result.metrics.ihg.toFixed(3)} | Patrón: ${result.metrics.pattern}`, 'system', 'auditPulse');
        addLog(`Acción propuesta: ${result.recommendations[0]}`, 'action');
      } else {
        addLog(`Error: ${result.error}`, 'error', 'evasion');
      }
    } catch (err) {
      addLog(`Error de conexión`, 'error');
    }
    setInput('');
    setLoading(false);
  };

  return (
    <section className={`terminal-panel flex h-full flex-col border border-white/10 p-4 shadow-[0_0_40px_rgba(0,0,0,0.24)] ${highNTI ? 'bg-[#100604] animate-jitter border-rose-500/10' : highIHG ? 'bg-[#071212] border-cyan-500/10' : 'bg-[#070707]/95'}`}>
      <div className="mb-4 border-b border-white/10 pb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-zinc-500">Centro de vigilancia</p>
        <h1 className="mt-2 text-2xl font-semibold uppercase tracking-[0.16em] text-paper">Observatorio operacional</h1>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-2">
        <div className="rounded-3xl border border-white/10 bg-[#060606]/90 p-4">
          <div className="flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.32em] text-zinc-500">
            <div>
              <p className="text-gold">Resumen activo</p>
              <p className="mt-1 text-[11px] text-zinc-400">Pulso operativo del nodo</p>
            </div>
            <div className="rounded-full border border-white/10 bg-[#111111]/80 px-3 py-1 text-[11px] text-zinc-300">
              Latencia {Math.round(loadIndicator * 100)}%
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-zinc-300">
            {audits[0]
              ? `Ultima auditoría: ${audits[0].pattern || audits[0].verdict}. IHG ${audits[0].ihg.toFixed(3)}, NTI ${audits[0].nti.toFixed(3)}, LDI ${audits[0].ldi.toFixed(3)}.`
              : 'No hay auditorías activas. Abre un registro para que el nodo genere su primer pulso longitudinal.'}
          </p>
          <div className="mt-4 grid gap-2">
            {['IHG', 'NTI', 'LDI', 'Deriva', 'Estabilidad'].map((label, index) => {
              const value = [metrics.ihg, metrics.nti, metrics.ldi, metrics.narrativeDrift ?? 0, metrics.executionStability ?? 0][index];
              return (
                <div key={label} className="flex items-center gap-3 text-[10px] text-zinc-300">
                  <span className="w-16 text-zinc-500">{label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${Math.round(value * 100)}%` }} />
                  </div>
                  <span className="w-10 text-right text-zinc-400">{Math.round(value * 100)}%</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className={`rounded-3xl border border-white/10 p-4 ${highNTI ? 'bg-[#150506] border-rose-500/15' : 'bg-[#060606]/90'}`}>
          <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.28em] text-zinc-500">
            <span>Console stream</span>
            <span>Logs / protocolos</span>
          </div>
          <div className="space-y-2">
            {lagging && (
              <div className="rounded border border-rose-500/10 bg-rose-500/5 p-3 text-[11px] text-rose-200">
                Performance: los paquetes se atrasan en tiempo longitudinal. La infraestructura pide atención mínima urgente.
              </div>
            )}
            {recentLogs.length === 0 ? (
              <div className="rounded border border-white/10 bg-[#0b0b0b]/80 p-3 text-[11px] text-zinc-500">Flujo de eventos inactivo. La primera acción llenará el histórico.</div>
            ) : (
              recentLogs.map((log, index) => (
                <div key={`${log.timestamp}-${index}`} className={`rounded border border-white/10 px-3 py-2 text-[11px] ${highNTI ? 'bg-[#120000]/90 text-rose-100' : 'bg-[#0b0b0b]/80 text-zinc-300'}`}>
                  <div className="flex items-center justify-between gap-3 text-[9px] uppercase tracking-[0.28em] text-zinc-500">
                    <span>{log.type}</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className={`mt-2 leading-relaxed ${highNTI ? 'animate-glitch text-rose-100' : 'text-zinc-300'}`}>{log.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-4">
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-zinc-500">Interacción directa</p>
          <p className="text-sm text-zinc-400">Describe la fricción o evento que el nodo debe observar.</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 rounded border border-white/10 bg-[#090909] px-3 py-2 text-sm text-paper outline-none transition focus:border-gold/40"
            placeholder="Registrar evento / detectar evasión..."
            disabled={status === 'frozen' || loading}
          />
          <button
            onClick={handleSend}
            disabled={status === 'frozen' || loading}
            className="rounded border border-gold/30 bg-gold/10 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-gold transition hover:bg-gold hover:text-[#070707] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? '...' : 'Enviar'}
          </button>
        </div>
      </div>
    </section>
  );
}