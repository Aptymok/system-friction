import Link from 'next/link';
import WorldVectorRuntimePanel from '@/components/world-vector/WorldVectorRuntimePanel';
import { calculateW10 } from '@/core/formulas/canonicalFormulas';

export const dynamic = 'force-static';

const boundary = [
  'Observation only',
  'No approval',
  'No publishing',
  'No cycle close',
  'No ROOT authority',
  'No private evidence exposure',
];

export default function WorldVectorPage() {
  const w10 = calculateW10([0.7, 0.8, 0.9], 0.85, 1.1);

  return (
    <main className="min-h-screen bg-[#060605] px-6 py-10 text-[#d8d2c2]">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="border border-[#2f2a1e] bg-[#0b0b09] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">World Vector Observatory</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight text-[#f5eedc]">
            World Vector observes context. ROOT decides action.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#9f9788]">
            This page is static-safe. Runtime health is fetched in the browser from the read-only agent health endpoint.
            Cron may breathe and preserve operational memory, but it does not approve drafts, publish externally,
            close cycles or mutate governed ROOT state.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/api/world-vector/agents/health" className="border border-[#c8a95166] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951]">
              Health API
            </Link>
            <Link href="/library" className="border border-[#2f2a1e] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#d8d2c2]">
              Library
            </Link>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <div className="border border-[#2f2a1e] bg-[#0b0b09] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951]">Métrica canónica</p>
            <p className="mt-2 text-2xl font-semibold text-[#f5eedc]">W_10</p>
            <p className="mt-1 text-sm text-[#9f9788]">Valor agregado: {w10.toFixed(3)}</p>
          </div>
          {boundary.map((item) => (
            <div key={item} className="border border-[#2f2a1e] bg-[#0b0b09] p-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[#d8d2c2]">
              {item}
            </div>
          ))}
        </section>

        <WorldVectorRuntimePanel />
      </div>
    </main>
  );
}
