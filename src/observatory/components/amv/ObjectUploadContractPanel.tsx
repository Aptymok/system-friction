import type { AmvUploadContract } from '@/lib/amv/core/uploadContract'

export function ObjectUploadContractPanel({ contract }: { contract: AmvUploadContract }) {
  return (
    <section className="border border-[#27231b] bg-[#080807] p-3 text-xs text-[#c9c3b4]">
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#8a7035]">Upload contract</div>
      <p className="mt-2">Objeto: {contract.objectType}. Storage real: {String(contract.storageEnabled)}.</p>
      <p className="mt-1 text-[#8f8678]">{contract.status}</p>
    </section>
  )
}
