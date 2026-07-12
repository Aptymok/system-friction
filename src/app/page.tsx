import type { Metadata } from 'next';
import { SfiHomeExperience } from '@/components/sfi/SfiHomeExperience';
import { buildSfiWorldInterfaceState as buildHome } from '@/lib/sfi/worldInterfaceState';
import { resolvePublicRuntimeState } from '@/lib/sfi/publicRuntimeSnapshot';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'System Friction Institute · Choose an operational entry',
  description: 'Enter through Observatory, FIELD, Studio, ScoreFriction or the Repository according to the signal, system or evidence you need to observe.',
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const home = await resolvePublicRuntimeState('home', buildHome);

  return (
    <main className="min-h-screen bg-[#030302] text-[#e7dcc1]">
      <SfiHomeExperience state={home} />
    </main>
  );
}
