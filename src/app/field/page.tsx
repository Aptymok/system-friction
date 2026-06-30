import Link from 'next/link';
import MiniMophField from '@/components/field/MiniMophField';

export const dynamic = 'force-static';

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
            </div>
            <nav className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
              <Link href="/" className="border border-[#2f2a1e] px-3 py-2 text-[#d8d2c2]">SFI</Link>
              <Link href="/world-vector" className="border border-[#2f2a1e] px-3 py-2 text-[#d8d2c2]">World Vector</Link>
              <Link href="/repository" className="border border-[#2f2a1e] px-3 py-2 text-[#d8d2c2]">Repository</Link>
              <Link href="/login?next=%2Ffield" className="border border-[#c8a95166] px-3 py-2 text-[#c8a951]">Iniciar sesion</Link>
            </nav>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-4">
          {stages.map(([label, value]) => (
            <div key={label} className="border border-[#2f2a1e] bg-[#0b0b09] p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8f8878]">{label}</div>
              <div className="mt-2 text-sm text-[#f5eedc]">{value}</div>
            </div>
          ))}
        </section>

        <MiniMophField />

        <section className="grid gap-4 md:grid-cols-3">
          <article className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">SFI-DR01</div>
            <p className="mt-3 text-sm leading-6 text-[#9f9788]">Mapa de friccion, evidencia, Neural Graph, AMV scan, hipotesis, prediccion, perturbacion minima y reporte ejecutivo.</p>
          </article>
          <article className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">User Twin</div>
            <p className="mt-3 text-sm leading-6 text-[#9f9788]">Con cuenta, el historial puede conectar lecturas, perturbaciones y retornos. Sin cuenta, la lectura queda como preview local.</p>
          </article>
          <article className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Approval boundary</div>
            <p className="mt-3 text-sm leading-6 text-[#9f9788]">El sistema propone. No publica, no contacta y no diagnostica salud mental.</p>
          </article>
        </section>
      </div>
    </main>
  );
}
