import { SfiObservatoryOS } from '@/observatory/components/os/SfiObservatoryOS';
import CanonicalWorldSpectStatus from '@/components/worldspect/CanonicalWorldSpectStatus';

export default function ObservatoryPage() {
  return (
    <>
      <CanonicalWorldSpectStatus surface="observatory" />
      <section
        data-sfi-runtime-panel="SFI_RUNTIME_PANEL_MARKER"
        className="mx-auto my-4 grid max-w-7xl gap-3 px-4 lg:grid-cols-2"
      >
        <article className="rounded-2xl border border-teal-300/15 bg-black/40 p-4 text-stone-100">
          <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-teal-100/65">
            WorldSpect operativo
          </p>
          <h2 className="mt-2 text-lg font-semibold">Lectura operacional activa</h2>
          <p className="mt-2 text-xs leading-5 text-stone-300/75">
            /api/worldspect/state queda montado como lectura canónica visible del mundo.
          </p>
        </article>

        <article className="rounded-2xl border border-amber-300/15 bg-black/40 p-4 text-stone-100">
          <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-amber-100/65">
            ROOT Neural Graph Live
          </p>
          <h2 className="mt-2 text-lg font-semibold">Grafo ROOT conectado</h2>
          <p className="mt-2 text-xs leading-5 text-stone-300/75">
            /api/root/neural-graph/live queda montado como capa viva del Hub.
          </p>
        </article>
      </section>

      <SfiObservatoryOS />
    </>
  );
}

