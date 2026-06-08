import type { AmvProjectionResult } from '@/lib/amv/core/amvProjectionTypes'

export function AmvProjectionVisor({ result }: { result: AmvProjectionResult }) {
  return (
    <section className="border border-[#27231b] bg-[#080807] p-3 text-xs text-[#c9c3b4]">
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#8a7035]">Projection Visor</div>
      <div className="mt-2 text-[#8f8678]">sandboxOnly: {String(result.sandboxOnly)} · feedsRegime: {String(result.feedsRegime)}</div>
      <div className="mt-3 grid gap-2">
        {result.scenarios.map((scenario) => (
          <div key={scenario.id} className="border border-[#27231b] p-2">
            <div className="text-[#d7cdb8]">{scenario.label}</div>
            <div className="mt-1 font-mono text-[10px] text-[#8f8678]">{scenario.impact} · {scenario.evidenceBoundary}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
