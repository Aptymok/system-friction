import Link from 'next/link';

export const revalidate = 300;

const nav = [
  ['Field', '/field'],
  ['World Vector', '/world-vector'],
  ['Repository', '/repository'],
  ['ROOT', '/root'],
  ['Contacto', '/contact?offer=SFI-DR01'],
  ['Iniciar sesión', '/login'],
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#030302] text-[#e7dcc1]">
      <section className="relative min-h-screen border-x border-[#211b12] bg-[radial-gradient(circle_at_50%_20%,rgba(200,169,81,0.12),transparent_32%),linear-gradient(180deg,#050504_0%,#030302_48%,#080704_100%)] px-5 py-8 sm:px-8 lg:px-12">
        <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(200,169,81,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(200,169,81,0.05)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-[#c8a951]/10 to-transparent" />

        <header className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">
            SFI Operational Interface · stabilized shell
          </div>
          <nav className="flex flex-wrap gap-2">
            {nav.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className="border border-[#c8a951]/30 bg-[#070604]/80 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951] transition hover:border-[#f0cf78] hover:text-[#f0cf78]"
              >
                {label}
              </Link>
            ))}
          </nav>
        </header>

        <section className="relative z-10 mx-auto flex min-h-[70vh] max-w-6xl flex-col items-center justify-center py-20 text-center">
          <div className="mb-8 h-px w-40 bg-gradient-to-r from-transparent via-[#c8a951] to-transparent" />
          <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-[#8d8064]">System Friction Institute</p>
          <h1 className="mt-5 font-serif text-5xl font-normal tracking-[0.22em] text-[#f0e7d0] sm:text-7xl lg:text-8xl">
            SFI
          </h1>
          <p className="mt-7 max-w-3xl text-balance text-lg leading-8 text-[#cfc3aa] sm:text-xl">
            Observación longitudinal de fricción sistémica, memoria operativa, señales persistentes y rutas de intervención mínima.
          </p>

          <div className="mt-12 grid w-full max-w-5xl gap-3 text-left md:grid-cols-3">
            <article className="border border-[#272219] bg-[#080806]/80 p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#c8a951]">01 · Field</div>
              <p className="mt-3 text-sm leading-6 text-[#b9ad95]">Declara un sistema atorado y convierte fricción en observación accionable.</p>
              <Link href="/field" className="mt-5 inline-flex font-mono text-[10px] uppercase tracking-[0.16em] text-[#f0cf78]">Abrir Field →</Link>
            </article>
            <article className="border border-[#272219] bg-[#080806]/80 p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#c8a951]">02 · World Vector</div>
              <p className="mt-3 text-sm leading-6 text-[#b9ad95]">Lee tensión pública, señales por sector y estado de observación WorldSpect.</p>
              <Link href="/world-vector" className="mt-5 inline-flex font-mono text-[10px] uppercase tracking-[0.16em] text-[#f0cf78]">Abrir Vector →</Link>
            </article>
            <article className="border border-[#272219] bg-[#080806]/80 p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#c8a951]">03 · ROOT</div>
              <p className="mt-3 text-sm leading-6 text-[#b9ad95]">Ejecuta agentes, revisa memoria, reportes, predicciones y cola de aprobación.</p>
              <Link href="/root" className="mt-5 inline-flex font-mono text-[10px] uppercase tracking-[0.16em] text-[#f0cf78]">Abrir ROOT →</Link>
            </article>
          </div>
        </section>

        <footer className="relative z-10 flex flex-col gap-2 border-t border-[#211b12] pt-5 font-mono text-[9px] uppercase tracking-[0.22em] text-[#746a57] sm:flex-row sm:items-center sm:justify-between">
          <span>SFI · Observe · Understand · Align · Act</span>
          <span>No external action without human approval</span>
        </footer>
      </section>
    </main>
  );
}
