import { SfiWorldInterfaceHero as MapHome } from '@/components/sfi/SfiWorldInterfaceHero';
import { buildSfiWorldInterfaceState as buildHome } from '@/lib/sfi/worldInterfaceState';

export const revalidate = 300;

export default async function HomePage() {
  const home = await buildHome();

  return (
    <main className="min-h-screen bg-[#030302] text-[#e7dcc1]">
      <MapHome state={home} />
    </main>
  );
}
