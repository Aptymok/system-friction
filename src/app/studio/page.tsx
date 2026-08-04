import Link from 'next/link';
import { StudioProductionConsole } from '@/components/studio/production/StudioProductionConsole';
import { SfiSurfaceGuide } from '@/components/sfi/SfiSurfaceGuide';
import { readStudioProductionState } from '@/lib/studio/production/studioProductionAdapter';
import { requireAuthenticatedUser, requireFounder } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';

export default async function StudioPage({ searchParams }: { searchParams?: Promise<{ objectId?: string | string[] }> }) {
  const { user } = await requireAuthenticatedUser();
  const params = searchParams ? await Promise.resolve(searchParams) : {};
  const objectId = typeof params.objectId === 'string' && params.objectId.trim() ? params.objectId.trim() : null;
  let includeLegacy = false;
  try {
    await requireFounder();
    includeLegacy = true;
  } catch {
    includeLegacy = false;
  }
  const state = await readStudioProductionState({ ownerId: user.id, includeLegacy, objectId });

  return (
    <main className="min-h-screen bg-[#050504]">
      <SfiSurfaceGuide
        current="studio"
        eyebrow="SFI · análisis y transformación"
        title="Trabaja sobre un objeto sin perder su origen ni su retorno."
        description="STUDIO recibe un objeto o señal ya observado, muestra qué información lo sostiene y permite analizar, modelar o probar una transformación. Una salida de STUDIO sólo adquiere valor cuando puede regresar a FIELD como condición observable, intervención reversible o resultado verificable."
      >
        <Link href="/interface/observatory">VOLVER A MI TRAYECTORIA</Link>
      </SfiSurfaceGuide>
      <StudioProductionConsole state={state} />
    </main>
  );
}
