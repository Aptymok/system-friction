import Link from 'next/link';
import NewPredictionForm from '@/components/root/predictions/NewPredictionForm';

export const dynamic = 'force-static';

export default function NewRootPredictionPage() {
  return (
    <main className="min-h-screen bg-[#060605] px-6 py-10 text-[#d8d2c2]">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="border border-[#2f2a1e] bg-[#0b0b09] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">New Prediction</p>
          <h1 className="mt-4 text-4xl font-semibold text-[#f5eedc]">Register before perturbation.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#9f9788]">
            This governed form creates a private Prediction Registry entry. It does not publish, diagnose,
            promote to Atlas or mutate the phenotype registry.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/root/predictions" className="border border-[#2f2a1e] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#d8d2c2]">
              Registry
            </Link>
            <Link href="/library/SFI-WB-001_Operator_Workbook.html" className="border border-[#2f2a1e] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#d8d2c2]">
              WB-001
            </Link>
          </div>
        </header>

        <NewPredictionForm />
      </div>
    </main>
  );
}
