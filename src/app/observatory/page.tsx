import type { Metadata } from 'next';
import { SfiObservatoryHero } from '@/components/sfi/SfiObservatoryHero';
import { buildSfiWorldInterfaceState } from '@/lib/sfi/worldInterfaceState';
import { buildWorldInterpretation } from '@/lib/sfi/observatory/worldInterpretation';
import { terminatorMapPoints, subsolarPoint } from '@/lib/sfi/observatory/solarTerminator';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Observatorio · Lectura en tiempo real',
  description:
    'Observatorio SFI: lectura longitudinal en vivo de IHG, NTI, LDI y World Spect Vector sobre el campo de fricción sistémica global, con interpretación generada por IA y terminador día/noche real.',
};

export default async function ObservatoryPage() {
  const state = await buildSfiWorldInterfaceState();

  // El terminador se calcula al momento de esta renderización (dentro de la
  // ventana de caché de 5 min de `revalidate`). No es decorativo: usa la
  // posición solar real de este instante (src/lib/sfi/observatory/solarTerminator.ts).
  const now = new Date();
  const terminator = terminatorMapPoints(now);
  const subsolar = subsolarPoint(now);

  // La interpretación de IA se genera server-side, anclada solo a los
  // números reales del state (ver worldInterpretation.ts). Si ningún
  // proveedor está configurado, degrada honestamente en vez de inventar texto.
  const interpretation = await buildWorldInterpretation(state);

  return (
    <main className="min-h-screen bg-[#020201]">
      <SfiObservatoryHero
        state={state}
        terminator={terminator}
        subsolar={subsolar}
        interpretation={interpretation}
      />
    </main>
  );
}
