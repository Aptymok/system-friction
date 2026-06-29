import Link from 'next/link';

export const dynamic = 'force-static';

export default function OperatorFieldPage() {
  const captureItems = [
    'literal phrases',
    'silences',
    'contradictions',
    'bodily shifts',
    'evidence source',
    'timestamp',
    'operator note',
    'estimated phenotype',
    'EP_estado',
    'SSP expected',
    'explicit prediction',
    'perturbation proposal',
  ];

  return (
    <main className="min-h-screen bg-[#060605] px-6 py-10 text-[#d8d2c2]">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="border border-[#2f2a1e] bg-[#0b0b09] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">Operator Field</p>
          <h1 className="mt-4 text-4xl font-semibold text-[#f5eedc]">Capture before claim, prediction before perturbation.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#9f9788]">
            This Phase 01 route aligns to WB-001 and names the capture contract. It does not write to Supabase,
            close cycles, publish, diagnose or mutate protocols. Phase 02 uses this capture boundary before ROOT
            registers a live prediction.
          </p>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          {captureItems.map((item) => (
            <div key={item} className="border border-[#2f2a1e] bg-[#0b0b09] p-4 font-mono text-[10px] uppercase tracking-[0.12em] text-[#d8d2c2]">
              {item}
            </div>
          ))}
        </section>

        <section className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Phase 01 boundary</div>
          <p className="mt-4 text-sm leading-6 text-[#9f9788]">
            Operator capture can support future Prediction Registry entries only when source, timestamp, operator note,
            EP_estado and SSP context are present. ROOT remains responsible for governed approvals and Atlas promotion.
            Prediction registration must happen before perturbation to count as predictive evidence.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/root/predictions/new" className="border border-[#c8a95166] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951]">
              ROOT Prediction
            </Link>
            <Link href="/library/SFI-WB-001_Operator_Workbook.html" className="border border-[#c8a95166] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951]">
              Open WB-001
            </Link>
            <Link href="/library/phenotypes" className="border border-[#2f2a1e] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#d8d2c2]">
              Phenotypes
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
