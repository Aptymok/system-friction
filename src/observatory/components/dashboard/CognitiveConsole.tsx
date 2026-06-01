// src/components/dashboard/CognitiveConsole.tsx
'use client';
import { useSystemState } from '@/observatory/hooks/useSystemState';
import { useGate } from '@/observatory/hooks/useGate';

export function CognitiveConsole({ readonly }: { readonly?: boolean } = {}) {
  const { gap, plans, systemStatus } = useSystemState();
  const { execute, escalate, block, canExecute } = useGate();

  return (
    <section className="border border-[#1e1c17] bg-[#0e0d0b]">
      <div className="border-b border-[#1e1c17] px-4 py-3">
        <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-[#8a7035]">Cognitive Delta Sandbox</p>
        <h2 className="mt-1 font-serif text-lg text-[#c8a951]">Simulación cognitiva local</h2>
        <p className="mt-1 font-mono text-[9px] tracking-[0.08em] text-[#7a7568]">No es una decisión real del campo. Es una maqueta de contraste hasta conectarse a MIHM/Twin.</p>
      </div>

      <div className="grid grid-cols-3 border-b border-[#1e1c17] text-center font-mono text-[9px]">
        <div className="border-r border-[#1e1c17] p-3">
          <div className="text-[8px] uppercase tracking-[0.16em] text-[#35312a]">Esperado</div>
          <div className="mt-1 text-base text-[#c8a951]">{gap.expected?.toFixed(3) ?? '—'}</div>
        </div>
        <div className="border-r border-[#1e1c17] p-3">
          <div className="text-[8px] uppercase tracking-[0.16em] text-[#35312a]">Observado</div>
          <div className="mt-1 text-base text-[#c8a951]">{gap.actual?.toFixed(3) ?? '—'}</div>
        </div>
        <div className="p-3">
          <div className="text-[8px] uppercase tracking-[0.16em] text-[#35312a]">Brecha Δ</div>
          <div className={`mt-1 text-base ${gap.delta < 0 ? 'text-[#c87060]' : 'text-[#6ab88a]'}`}>{gap.delta?.toFixed(3) ?? '—'}</div>
        </div>
      </div>

      <div className="p-3">
        <h3 className="font-mono text-[8px] uppercase tracking-[0.22em] text-[#8a7035]">Rutas simuladas</h3>
        <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-3">
          {plans.map((plan: { label: string; score: number; risk: string }) => (
            <div key={plan.label} className="border border-[#1e1c17] bg-[#131210] p-3 font-mono text-[9px]">
              <div className="text-[#c8a951]">Ruta {plan.label}</div>
              <div className="mt-1 text-[#7a7568]">Score: {plan.score}</div>
              <div className="text-[#35312a]">Riesgo: {plan.risk}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-[#1e1c17] p-3">
        <button onClick={execute} disabled={readonly || !canExecute} className="border border-[#8a7035] bg-[#2e2410] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.16em] text-[#c8a951] disabled:opacity-40">Registrar ruta</button>
        <button onClick={escalate} disabled={readonly} className="border border-[#1e1c17] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.16em] text-[#7a7568] disabled:opacity-40">Escalar a ACP</button>
        <button onClick={block} disabled={readonly} className="border border-[#5a2020] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.16em] text-[#c87060] disabled:opacity-40">Bloquear ruta</button>
      </div>

      <div className="border-t border-[#1e1c17] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.12em] text-[#35312a]">
        Estado: {systemStatus.state} · Incertidumbre: {systemStatus.uncertainty} · Estabilidad: {systemStatus.stability}
      </div>
    </section>
  );
}
