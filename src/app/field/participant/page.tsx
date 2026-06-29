import Link from 'next/link';

export const dynamic = 'force-static';

export default function ParticipantFieldPage() {
  return (
    <main className="min-h-screen bg-[#060605] px-6 py-10 text-[#d8d2c2]">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="border border-[#2f2a1e] bg-[#0b0b09] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">Participant Field</p>
          <h1 className="mt-4 text-4xl font-semibold text-[#f5eedc]">72-hour marks without technical interpretation.</h1>
          <p className="mt-3 text-sm leading-6 text-[#9f9788]">
            This Phase 01 route is a public-safe placeholder for WB-002-aligned capture. It explains the future boundary
            and links to the workbook; it does not collect private data or submit DB writes yet.
          </p>
        </header>

        <section className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Future capture starts as PENDING</div>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[#9f9788]">
            <li>Record repeated thoughts, events or marks during the 72-hour window.</li>
            <li>Reflect on what changed, what was noticed, what was avoided and what was yours.</li>
            <li>Do not receive phenotype interpretation, diagnosis or operator inference by default.</li>
            <li>Keep observation low-friction and privacy-preserving until a governed capture layer exists.</li>
            <li>Technical interpretation remains operator/ROOT governed.</li>
          </ul>
          <Link href="/library/SFI-WB-002_Participant_Workbook.html" className="mt-5 inline-block border border-[#c8a95166] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951]">
            Open WB-002
          </Link>
        </section>
      </div>
    </main>
  );
}
