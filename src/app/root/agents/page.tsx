import Link from 'next/link';
import WorldVectorRuntimePanel from '@/components/world-vector/WorldVectorRuntimePanel';

export const dynamic = 'force-static';

const rootAgentRoutes = [
  { label: 'Prediction Registry health', href: '/api/sfi/predictions/health' },
  { label: 'Prediction Registry', href: '/root/predictions' },
  { label: 'Register prediction', href: '/root/predictions/new' },
  { label: 'Pending return windows', href: '/root/predictions' },
  { label: 'Evidence State Agent', href: '/api/sfi/predictions/health' },
  { label: 'Return Window Agent', href: '/api/sfi/predictions/health' },
  { label: 'Future Atlas', href: '/root/atlas' },
];

export default function RootAgentsPage() {
  return (
    <main className="min-h-screen bg-[#060605] px-6 py-10 text-[#d8d2c2]">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="border border-[#2f2a1e] bg-[#0b0b09] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">ROOT Agents Boundary</p>
          <h1 className="mt-4 text-4xl font-semibold text-[#f5eedc]">Agents compare and propose. ROOT decides.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#9f9788]">
            This ROOT dashboard exposes read-only health links and governed routes. It does not publish,
            promote Atlas entries or grant cron authority to close cycles.
          </p>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <Link href="/world-vector" className="border border-[#2f2a1e] bg-[#0b0b09] p-4 text-sm text-[#d8d2c2]">
            World Vector observatory
          </Link>
          <Link href="/api/world-vector/agents/health" className="border border-[#2f2a1e] bg-[#0b0b09] p-4 text-sm text-[#d8d2c2]">
            World Vector health
          </Link>
          <Link href="/library" className="border border-[#2f2a1e] bg-[#0b0b09] p-4 text-sm text-[#d8d2c2]">
            Library integrity
          </Link>
          <Link href="/api/sfi/library/health" className="border border-[#2f2a1e] bg-[#0b0b09] p-4 text-sm text-[#d8d2c2]">
            Library health API
          </Link>
          {rootAgentRoutes.map((route) => (
            <Link key={`${route.href}:${route.label}`} href={route.href} className="border border-[#2f2a1e] bg-[#0b0b09] p-4 text-sm text-[#8f8878]">
              {route.label}
            </Link>
          ))}
        </section>

        <WorldVectorRuntimePanel />

        <section className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Non-authority rule</div>
          <p className="mt-4 text-sm leading-6 text-[#9f9788]">
            Protocol mutation, phenotype mutation, Atlas promotion, publication and cycle close require governed ROOT
            approval. System actor credentials are not ROOT credentials.
          </p>
          <p className="mt-3 text-sm leading-6 text-[#9f9788]">
            Prediction agents classify evidence state and return windows only. They do not fill results, rewrite protocols
            or mutate phenotype definitions.
          </p>
        </section>
      </div>
    </main>
  );
}
