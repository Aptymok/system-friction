export type NoMamesInsight = {
  unseen: string
  whyItMatters: string
  ignoredChange: string
  minimalIntervention: string
  missingEvidence: string
}

export function NoMamesInsightPanel({ insight }: { insight?: Partial<NoMamesInsight> }) {
  const rows = [
    ['lo que nadie esta viendo', insight?.unseen ?? 'sin datos suficientes'],
    ['por que importa', insight?.whyItMatters ?? 'sin datos suficientes'],
    ['que cambia si se ignora', insight?.ignoredChange ?? 'sin datos suficientes'],
    ['que intervencion minima existe', insight?.minimalIntervention ?? 'sin datos suficientes'],
    ['que evidencia falta', insight?.missingEvidence ?? 'sin datos suficientes'],
  ]

  return (
    <section className="border border-[#27231b] bg-[#080807] p-3 text-xs text-[#c9c3b4]">
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#8a7035]">No Mames Insight</div>
      <div className="mt-3 grid gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="border border-[#27231b] p-2">
            <div className="font-mono text-[10px] uppercase text-[#8f8678]">{label}</div>
            <div className="mt-1 text-[#d7cdb8]">{value}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
