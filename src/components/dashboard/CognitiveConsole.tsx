// src/components/dashboard/CognitiveConsole.tsx
'use client';
import { useSystemState } from '@/lib/hooks/useSystemState';
import { useGate } from '@/lib/hooks/useGate';

export function CognitiveConsole({ readonly }: { readonly?: boolean } = {}) {
  const { gap, plans, systemStatus } = useSystemState();
  const { execute, escalate, block, canExecute } = useGate();

  return (
    <div className="terminal-panel p-4 space-y-6">
      <div className="grid grid-cols-3 gap-4 border-b border-gold/20 pb-4">
        <div>
          <div className="text-xs text-zinc-500">Esperado</div>
          <div className="text-2xl font-mono">{gap.expected?.toFixed(3) ?? '—'}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">Real</div>
          <div className="text-2xl font-mono">{gap.actual?.toFixed(3) ?? '—'}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">Δ</div>
          <div className={`text-2xl font-mono ${gap.delta < 0 ? 'text-red-500' : 'text-green-500'}`}>
            {gap.delta?.toFixed(3) ?? '—'}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-mono text-gold">Planes activos</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
          {plans.map((plan: { label: string; score: number; risk: string }) => (
            <div key={plan.label} className="border border-gold/20 p-2 rounded">
              <div className="font-bold">{plan.label}</div>
              <div className="text-xs">Score: {plan.score}</div>
              <div className="text-xs text-zinc-500">Riesgo: {plan.risk}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gold/20 pt-4 flex gap-4">
        <button
          onClick={execute}
          disabled={readonly || !canExecute}
          className="bg-gold text-void px-4 py-2 rounded font-mono text-xs disabled:opacity-50"
        >
          EJECUTAR
        </button>
        <button
          onClick={escalate}
          disabled={readonly}
          className="border border-gold/30 px-4 py-2 rounded font-mono text-xs disabled:opacity-50"
        >
          ESCALAR
        </button>
        <button
          onClick={block}
          disabled={readonly}
          className="border border-red-500/50 text-red-500 px-4 py-2 rounded font-mono text-xs disabled:opacity-50"
        >
          BLOQUEAR
        </button>
      </div>

      <div className="text-[10px] text-zinc-600 border-t border-gold/20 pt-2">
        Estado: {systemStatus.state} | Incertidumbre: {systemStatus.uncertainty} | Estabilidad: {systemStatus.stability}
      </div>
    </div>
  );
}
