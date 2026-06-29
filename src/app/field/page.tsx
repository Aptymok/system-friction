import Link from 'next/link';

export const dynamic = 'force-static';

export default function FieldPage() {
  return (
    <main className="min-h-screen bg-[#060605] px-6 py-10 text-[#d8d2c2]">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="border border-[#2f2a1e] bg-[#0b0b09] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">Field</p>
          <h1 className="mt-4 text-4xl font-semibold text-[#f5eedc]">Capture boundary for observed signal.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#9f9788]">
            Field is the future capture surface. In Phase 01 it routes participants and operators to the correct workbook
            boundary without storing private observations, diagnosing anyone or interpreting phenotype patterns publicly.
            In Phase 02, operator capture may lead to a ROOT-governed Prediction Registry entry.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Participant</div>
            <h2 className="mt-2 text-2xl font-semibold text-[#f5eedc]">72-hour low-friction observation</h2>
            <p className="mt-4 text-sm leading-6 text-[#9f9788]">
              Participant Field aligns with WB-002: repeated signals, marks and reflections. Observation starts as PENDING
              and does not return technical phenotype interpretation by default.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/field/participant" className="border border-[#c8a95166] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951]">
                Participant Field
              </Link>
              <Link href="/library/SFI-WB-002_Participant_Workbook.html" className="border border-[#2f2a1e] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#d8d2c2]">
                WB-002
              </Link>
            </div>
          </article>

          <article className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Operator</div>
            <h2 className="mt-2 text-2xl font-semibold text-[#f5eedc]">Evidence capture before hypothesis memory</h2>
            <p className="mt-4 text-sm leading-6 text-[#9f9788]">
              Operator Field aligns with WB-001: literal phrases, silences, contradictions, timestamps, source,
              operator note, explicit prediction and perturbation proposal.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/operator/field" className="border border-[#c8a95166] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951]">
                Operator Field
              </Link>
              <Link href="/root/predictions/new" className="border border-[#2f2a1e] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#d8d2c2]">
                ROOT Prediction
              </Link>
              <Link href="/library/SFI-WB-001_Operator_Workbook.html" className="border border-[#2f2a1e] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#d8d2c2]">
                WB-001
              </Link>
            </div>
          </article>
        </section>

        <section className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Operational position</div>
          <p className="mt-4 text-sm leading-6 text-[#9f9788]">
            Library formalizes the method. World Vector contextualizes the world. Field captures signal.
            Prediction Registry stores ROOT-timestamped hypotheses. Atlas stores longitudinal memory later.
            ROOT decides what becomes evidence, archive, Atlas candidate or public output.
          </p>
        </section>
      </div>
    </main>
  );
}
