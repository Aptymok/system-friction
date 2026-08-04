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
  const cameFromField = state.activeObject.sourceUri?.startsWith('field://') === true;

  return (
    <main className="min-h-screen bg-[#050504]">
      <SfiSurfaceGuide
        current="studio"
        eyebrow="SFI · análisis y transformación"
        title={cameFromField ? 'Este objeto llegó desde una trayectoria de FIELD.' : 'Trabaja sobre un objeto sin perder su origen ni su retorno.'}
        description={cameFromField
          ? 'STUDIO conserva el punto observado y su procedencia. Todavía no lo considera una conclusión: aquí puede analizarse, relacionarse o convertirse en una prueba reversible que después regrese a FIELD.'
          : 'STUDIO recibe un objeto o señal ya observado, muestra qué información lo sostiene y permite analizar, modelar o probar una transformación. Una salida sólo adquiere valor cuando puede regresar a FIELD como condición observable, intervención reversible o resultado verificable.'}
      >
        <Link href="/interface/observatory">VOLVER A MI TRAYECTORIA</Link>
      </SfiSurfaceGuide>

      {cameFromField ? (
        <section className="border-b border-[#302a1f] bg-[#080807] px-5 py-5 text-[#d8d1c0] md:px-10">
          <div className="mx-auto grid max-w-[1500px] gap-4 md:grid-cols-3">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#c8a951]">Objeto recibido</span>
              <p className="mt-2 text-lg text-[#f0e5cc]">{state.activeObject.title}</p>
            </div>
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#c8a951]">Estado actual</span>
              <p className="mt-2 text-sm leading-6 text-[#9a907e]">Conservado como objeto de análisis. No se ha convertido automáticamente en hipótesis, diagnóstico ni intervención.</p>
            </div>
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#c8a951]">Retorno esperado</span>
              <p className="mt-2 text-sm leading-6 text-[#9a907e]">Una condición observable, una transformación verificable o una microejecución reversible que pueda registrarse de nuevo en FIELD.</p>
            </div>
          </div>
        </section>
      ) : null}

      <StudioProductionConsole state={state} />
    </main>
  );
}
