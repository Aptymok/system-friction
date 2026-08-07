import type { Metadata } from 'next';
import { SfiHomeExperience } from '@/components/sfi/SfiHomeExperience';
import { buildSfiWorldInterfaceState as buildHome } from '@/lib/sfi/worldInterfaceState';
import { resolvePublicRuntimeState } from '@/lib/sfi/publicRuntimeSnapshot';
import { buildPublicInstitutionalAttractorState } from '@/lib/institution/publicAttractor';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'System Friction Institute · Observe before intervention',
  description: 'System Friction Institute observes evidence, trajectories, attractors and returns before proposing minimum governed perturbations.',
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const [home, attractor] = await Promise.all([
    resolvePublicRuntimeState('home', buildHome),
    buildPublicInstitutionalAttractorState(),
  ]);

  return (
    <main className="min-h-screen bg-[#030302] text-[#e7dcc1]">
      <SfiHomeExperience state={home} attractor={attractor} />
    </main>
  );
}