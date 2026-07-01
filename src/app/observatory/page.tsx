import type { Metadata } from 'next';
import { SfiObservatoryHero } from '@/components/sfi/SfiObservatoryHero';
import { buildSfiWorldInterfaceState } from '@/lib/sfi/worldInterfaceState';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Observatorio · Lectura en tiempo real',
  description:
    'Observatorio SFI: lectura longitudinal en vivo de IHG, NTI, LDI y World Spect Vector sobre el campo de fricción sistémica global.',
};

export default async function ObservatoryPage() {
  const state = await buildSfiWorldInterfaceState();

  return (
    <main className="min-h-screen bg-[#020201]">
      <SfiObservatoryHero state={state} />
    </main>
  );
}
