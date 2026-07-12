import Link from 'next/link';
import { AmvPhaseStatusPanel } from '@/components/amv/AmvPhaseStatusPanel';
import MiniMophField from '@/components/field/MiniMophField';

export const dynamic = 'force-dynamic';

const stages = [
  ['Signal intake', 'Sistema atorado'],
  ['Agentic reading', 'MOP-H + AMV + Graph'],
  ['Minimal perturbation', '72h reversible'],
  ['SFI-DR01', 'Diagnostico trazable'],
];

export default function FieldPage() {
  return (
    <main className="min-h-screen bg-[#060605] px-6 py-8 text-[#d8d2c2]">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">SFI Field</p>
              <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-tight text-[#f5eedc]">
                Mini MOP-H para convertir friccion declarada en una perturbacion minima.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#9f9788]">
                FIELD es una superficie autenticada. Los casos, evidencias y retornos pertenecen al usuario y permanecen privados por defecto.
              </p>
            </div>
            <nav className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
              <Link href="/" className="border border-[#2f2a1e] px-3 py-2 text-[#d8d2c2]">SFI</Link>
              <Link href="/world-vector" className="border border-[#2f2a1e] px-3 py-2 text-[#d8d2c2]">World Vector</Link>
              <Link href="/repository" className="border border-[#2f2a1e] px-3 py-2 text-[#d8d2c2]">Repository</Link>
            </nav>
          </div>
        </header>

        <AmvPhaseStatusPanel endpoint="/api/observatory/instrument-status" compact title="FIELD · INSTRUMENT MATURITY" />

        <section className="grid gap-3 md:grid-cols-4">
          {stages.map(([label, value]) => (
            <div key={label} className="border border-[#2f2a1e] bg-[#0b0b09] p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8f8878]">{label}</div>
              <div className="mt-2 text-sm text-[#f5eedc]">{value}</div>
            </div>
          ))}
        </section>

        <MiniMophField />

        <section className="grid gap-4 md:grid-cols-2">
          <article className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Participant</div>
            <h2 className="mt-2 text-2xl font-semibold text-[#f5eedc]">72-hour low-friction observation</h2>
            <p className="mt-4 text-sm leading-6 text-[#9f9788]">
              Participant Field aligns with WB-002: repeated signals, marks and reflections. Observation starts as PENDING and does not return technical phenotype interpretation by default.
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
              Operator Field aligns with WB-001: literal phrases, silences, contradictions, timestamps, source, operator note, explicit prediction and perturbation proposal.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/operator/field" className="border border-[#c8a95166] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951]">
                Operator Field
              </Link>
              <Link href="/library/SFI-WB-001_Operator_Workbook.html" className="border border-[#2f2a1e] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#d8d2c2]">
                WB-001
              </Link>
            </div>
          </article>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">SFI-DR01</div>
            <p className="mt-3 text-sm leading-6 text-[#9f9788]">Mapa de friccion, evidencia, Neural Graph, AMV scan, hipotesis, prediccion, perturbacion minima y reporte ejecutivo.</p>
          </article>
          <article className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">User Twin</div>
            <p className="mt-3 text-sm leading-6 text-[#9f9788]">El historial conecta lecturas, perturbaciones y retornos únicamente dentro de la cuenta propietaria.</p>
          </article>
          <article className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Operational position</div>
            <p className="mt-3 text-sm leading-6 text-[#9f9788]">Library formalizes the method. World Vector contextualizes the world. FIELD captures evidence. ROOT governs without exposing administrative actions to FIELD users.</p>
          </article>
        </section>
      </div>
    </main>
  );
}
