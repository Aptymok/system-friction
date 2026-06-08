import { listAmvUseCases } from '@/lib/amv/registry/useCaseRegistry'

export function UseCaseLauncher() {
  return (
    <section className="grid gap-2 text-xs text-[#c9c3b4]">
      {listAmvUseCases().map((useCase) => (
        <div key={useCase.id} className="border border-[#27231b] bg-[#080807] p-2">
          <div className="text-[#d7cdb8]">{useCase.label}</div>
          <div className="mt-1 font-mono text-[10px] text-[#8f8678]">{useCase.scopeHint}</div>
        </div>
      ))}
    </section>
  )
}
