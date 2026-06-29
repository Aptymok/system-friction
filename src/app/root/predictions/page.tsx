import Link from 'next/link';
import PredictionRegistryPanel from '@/components/root/predictions/PredictionRegistryPanel';

export const dynamic = 'force-static';

export default function RootPredictionsPage() {
  return (
    <main className="min-h-screen bg-[#060605] px-6 py-10 text-[#d8d2c2]">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="border border-[#2f2a1e] bg-[#0b0b09] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">Prediction Registry</p>
          <h1 className="mt-4 text-4xl font-semibold text-[#f5eedc]">ROOT-governed hypothesis memory.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#9f9788]">
            ROOT registers hypotheses before perturbation, records return windows and reviews evidence state.
            No public browsing, Atlas promotion or automatic publication happens here.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/root/predictions/new" className="border border-[#c8a95166] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951]">
              New prediction
            </Link>
            <Link href="/library/phenotypes" className="border border-[#2f2a1e] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#d8d2c2]">
              Phenotypes
            </Link>
            <Link href="/field" className="border border-[#2f2a1e] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#d8d2c2]">
              Field
            </Link>
            <Link href="/operator/field" className="border border-[#2f2a1e] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#d8d2c2]">
              Operator Field
            </Link>
          </div>
        </header>

        <PredictionRegistryPanel />
      </div>
    </main>
  );
}
