import Link from 'next/link';
import { buildSfiSurfaceState } from '@/lib/navigation/sfiSurfaceState';

export default function SurfacesPage() {
  const surfaces = buildSfiSurfaceState();

  return (
    <main className="min-h-screen bg-[#060605] px-6 py-16 text-[#c8c4b8]">
      <section className="mx-auto max-w-6xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">SFI surfaces</p>
        <h1 className="mt-5 text-4xl font-semibold text-[#f1ede0]">Mapa de superficies SFI</h1>
        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {surfaces.map((surface) => {
            const isApi = surface.href.startsWith('/api/');
            return (
              <article key={surface.id} className="border border-[#1e1c17] bg-[#0b0b09] p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-[#f1ede0]">{surface.title}</h2>
                  <span className="border border-[#2e2c24] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[#c8a951]">{surface.status}</span>
                </div>
                {isApi ? (
                  <code className="mt-3 block text-xs text-[#c8a951]">{surface.href}</code>
                ) : (
                  <Link href={surface.href} className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.14em] text-[#c8a951]">{surface.href}</Link>
                )}
                <div className="mt-4">
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#6f6658]">Conexiones</div>
                  <p className="mt-2 text-sm leading-6 text-[#8f8878]">{surface.connectedTo.join(', ') || 'sin conexión declarada'}</p>
                </div>
                {surface.notes.length ? (
                  <ul className="mt-4 space-y-2 text-sm leading-6 text-[#8f8878]">
                    {surface.notes.map((note) => <li key={note}>{note}</li>)}
                  </ul>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
