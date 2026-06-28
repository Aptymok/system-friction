import Link from 'next/link';

const footerLinks = [
  ['Politica de privacidad', '/privacy'],
  ['Centro de privacidad', '/privacy#centro'],
  ['Informacion', '/repository'],
  ['Crear cuenta', '/signup'],
  ['Solicitar auditoria', '/contact?reason=audit'],
  ['Apoyo', '/contact?reason=support'],
  ['Cookies', '/privacy#cookies'],
  ['Condiciones', '/privacy#condiciones'],
  ['Ayuda', '/contact?reason=help'],
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#060605] text-[#d8d2c2]">
      <section className="mx-auto flex min-h-[82vh] max-w-6xl flex-col justify-center px-6 py-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">System Friction Institute</p>
        <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-tight text-[#f5eedc] md:text-7xl">
          Entra al campo. Observa la friccion. Decide con evidencia.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#9f9788]">
          System Friction Institute convierte objetivos, evidencia y senales del mundo en tareas minimas, evaluaciones legibles y decisiones operativas.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/login" className="border border-[#c8a951] bg-[#c8a951] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#060605]">Ingresar</Link>
          <Link href="/signup" className="border border-[#c8a95166] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#c8a951]">Crear cuenta</Link>
          <Link href="/repository" className="border border-[#2f2a1e] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#d8d2c2]">Repositorio</Link>
        </div>
      </section>

      <section className="border-y border-[#1e1c17] bg-[#0b0b09] px-6 py-12">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1fr_320px]">
          <div>
            <h2 className="text-2xl font-semibold text-[#f5eedc]">Instituto para operar sistemas bajo friccion.</h2>
            <p className="mt-4 max-w-3xl leading-7 text-[#9f9788]">
              SFI trabaja con evidencia, perturbaciones minimas, memoria de decisiones y lectura de contexto. No promete control total: reduce ruido, muestra bloqueos y exige pruebas antes de cerrar tareas.
            </p>
          </div>
          <div className="border-l border-[#2f2a1e] pl-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Contacto</p>
            <p className="mt-3 text-sm leading-6 text-[#9f9788]">Para auditorias, colaboraciones o preguntas institucionales.</p>
            <Link href="/contact" className="mt-4 inline-block border border-[#c8a95166] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951]">Abrir contacto</Link>
          </div>
        </div>
      </section>

      <footer className="px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="flex flex-wrap gap-x-5 gap-y-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">
            {footerLinks.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">System Friction Institute © 2026</div>
        </div>
      </footer>
    </main>
  );
}
