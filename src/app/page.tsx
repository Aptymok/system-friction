import { SfiWorldInterfaceHero } from '@/components/sfi/SfiWorldInterfaceHero';
import { buildSfiWorldInterfaceState } from '@/lib/sfi/worldInterfaceState';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const state = await buildSfiWorldInterfaceState();

  return (
    <main className="min-h-screen bg-[#030302] text-[#e7dcc1]">
      <SfiWorldInterfaceHero state={state} />
    </main>
  );
}
