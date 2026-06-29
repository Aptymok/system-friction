import Link from 'next/link';
import PredictionDetailPanel from '@/components/root/predictions/PredictionDetailPanel';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ hypothesisId: string }> | { hypothesisId: string };
};

export default async function RootPredictionDetailPage({ params }: PageProps) {
  const resolved = await Promise.resolve(params);
  const hypothesisId = decodeURIComponent(resolved.hypothesisId);

  return (
    <main className="min-h-screen bg-[#060605] px-6 py-10 text-[#d8d2c2]">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="border border-[#2f2a1e] bg-[#0b0b09] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">Prediction Detail</p>
          <h1 className="mt-4 break-words text-4xl font-semibold text-[#f5eedc]">{hypothesisId}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#9f9788]">
            Review evidence classification and record return windows. Atlas promotion and publication are still out of scope.
          </p>
          <Link href="/root/predictions" className="mt-5 inline-block border border-[#2f2a1e] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#d8d2c2]">
            Back to registry
          </Link>
        </header>

        <PredictionDetailPanel hypothesisId={hypothesisId} />
      </div>
    </main>
  );
}
