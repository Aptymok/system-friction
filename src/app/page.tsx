import { SfiWorldInterfaceHero as MapHome } from '@/components/sfi/SfiWorldInterfaceHero';
import { buildSfiWorldInterfaceState as buildHome } from '@/lib/sfi/worldInterfaceState';
import { resolvePublicRuntimeState } from '@/lib/sfi/publicRuntimeSnapshot';

export const revalidate = 300;

export default async function HomePage() {
  const home = await resolvePublicRuntimeState('home', buildHome);

  return (
    <main className="min-h-screen bg-[#030302] text-[#e7dcc1]">
      <MapHome state={home} />
    </main>
  );
}
