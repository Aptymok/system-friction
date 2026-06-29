import Link from 'next/link';
import { getSfiPhenotypeRegistry, SFI_PHENOTYPE_REGISTRY_BOUNDARY } from '@/lib/sfi/phenotypes/registry';

export const dynamic = 'force-static';

export default function PhenotypeRegistryPage() {
  const phenotypes = getSfiPhenotypeRegistry();

  return (
    <main className="min-h-screen bg-[#060605] px-6 py-10 text-[#d8d2c2]">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="border border-[#2f2a1e] bg-[#0b0b09] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">Phenotype Registry</p>
          <h1 className="mt-4 text-4xl font-semibold text-[#f5eedc]">Hypothesis support, not diagnosis.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#9f9788]">
            These entries structure observation and prediction work. They are not identity labels, diagnoses,
            psychological categories or public claims.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="border border-[#c8a95166] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951]" href="/library">
              Library
            </Link>
            <Link className="border border-[#2f2a1e] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#d8d2c2]" href="/api/sfi/phenotypes">
              API
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {phenotypes.map((phenotype) => (
            <article key={phenotype.id} className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">{phenotype.id}</div>
              <h2 className="mt-2 text-xl font-semibold text-[#f5eedc]">{phenotype.label}</h2>
              <p className="mt-4 text-sm leading-6 text-[#9f9788]">{phenotype.signature}</p>
              <div className="mt-5 grid gap-3 text-xs md:grid-cols-2">
                <div>
                  <div className="font-mono uppercase tracking-[0.14em] text-[#8f8878]">Evidence state</div>
                  <div className="mt-1 text-[#d8d2c2]">{phenotype.evidence_state}</div>
                </div>
                <div>
                  <div className="font-mono uppercase tracking-[0.14em] text-[#8f8878]">Use</div>
                  <div className="mt-1 text-[#d8d2c2]">{phenotype.use}</div>
                </div>
              </div>
              <p className="mt-4 border-t border-[#2f2a1e] pt-4 text-xs leading-5 text-[#c87060]">{phenotype.do_not}</p>
              <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8f8878]">
                Required before use: {phenotype.required_before_use.join(' / ')}
              </div>
            </article>
          ))}
        </section>

        <section className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Boundary</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <h2 className="text-sm font-semibold text-[#f5eedc]">Used to</h2>
              <ul className="mt-3 space-y-2 text-sm text-[#9f9788]">
                {SFI_PHENOTYPE_REGISTRY_BOUNDARY.purpose.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#f5eedc]">Not used as</h2>
              <ul className="mt-3 space-y-2 text-sm text-[#9f9788]">
                {SFI_PHENOTYPE_REGISTRY_BOUNDARY.not.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
