import type { Metadata } from 'next';
import { SfiInstitutionalSurface } from '@/components/sfi/SfiInstitutionalSurface';
import { buildSfiWorldInterfaceState as buildHome } from '@/lib/sfi/worldInterfaceState';
import { resolvePublicRuntimeState } from '@/lib/sfi/publicRuntimeSnapshot';
import { buildPublicInstitutionalAttractorState } from '@/lib/institution/publicAttractor';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'System Friction Institute · Observe systems before intervention',
  description: 'System Friction Institute observes evidence, trajectories, attractors and returns before proposing minimum governed perturbations.',
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const [home, attractor] = await Promise.all([
    resolvePublicRuntimeState('home', buildHome),
    buildPublicInstitutionalAttractorState(),
  ]);

  return <SfiInstitutionalSurface state={home} attractor={attractor} />;
}
