import type { AmvProjectionScenario } from '@/lib/amv/core/amvProjectionTypes'

export function ScenarioMatrixPanel({ scenarios }: { scenarios: AmvProjectionScenario[] }) {
  return (
    <section className="border border-[#27231b] bg-[#080807] p-3 text-xs text-[#c9c3b4]">
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#8a7035]">Scenario Matrix</div>
      <div className="mt-2 grid grid-cols-[1fr_80px_90px] gap-2 font-mono text-[10px] text-[#8f8678]">
        <span>escenario</span>
        <span>prob</span>
        <span>impacto</span>
        {scenarios.map((scenario) => (
          <>
            <span key={`${scenario.id}-label`} className="text-[#d7cdb8]">{scenario.label}</span>
            <span key={`${scenario.id}-prob`}>{Math.round(scenario.probability * 100)}%</span>
            <span key={`${scenario.id}-impact`}>{scenario.impact}</span>
          </>
        ))}
      </div>
    </section>
  )
}
