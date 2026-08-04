import type { Metadata } from 'next';
import Link from 'next/link';
import { SfiSurfaceGuide } from '@/components/sfi/SfiSurfaceGuide';

export const dynamic = 'force-dynamic';

const WORLD_FIELD_RUNTIME = '/field/world-observatory/index.html?v=20260802.1923';

export const metadata: Metadata = {
  title: 'Campo Mundial · señales localizadas · SFI',
  description: 'Exploración localizada de señales, eventos y tensiones observadas por System Friction Institute.',
};

export default function FieldMapPage() {
  return (
    <main className="min-h-screen bg-[#050504] text-[#d8d1c0]">
      <SfiSurfaceGuide
        current="world-field"
        eyebrow="SFI · observación localizada"
        title="Explora dónde se manifiestan las señales."
        description="El Campo Mundial permite localizar eventos y tensiones sin convertirlos inmediatamente en explicación. Selecciona una observación para entender su contexto; la síntesis agregada y publicable se encuentra en el Observatorio Público."
      >
        <Link href="/observatory">VER SÍNTESIS PÚBLICA</Link>
      </SfiSurfaceGuide>
      <section className="border-t border-[#302b20] bg-[#050504] p-2 md:p-4">
        <div className="mx-auto max-w-[1800px] overflow-hidden border border-[#302b20] bg-black">
          <iframe
            src={WORLD_FIELD_RUNTIME}
            title="Campo Mundial de System Friction Institute"
            className="block h-[calc(100vh-250px)] min-h-[680px] w-full border-0"
            loading="eager"
            referrerPolicy="same-origin"
          />
        </div>
      </section>
    </main>
  );
}
