import type { AmvGraphState } from '@/lib/amv/core/amvGraphTypes'

export function AmvGraphField({ graph }: { graph: AmvGraphState }) {
  return (
    <section className="border border-[#27231b] bg-[#080807] p-3 text-xs text-[#c9c3b4]">
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#8a7035]">AMV Graph</div>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        {graph.nodes.map((node) => (
          <div key={node.id} className="border border-[#27231b] p-2">
            <div className="font-semibold text-[#d7cdb8]">{node.label}</div>
            <div className="mt-1 font-mono text-[10px] text-[#8f8678]">{node.type} · {node.evidenceTrust} · {node.archiveLayer}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
