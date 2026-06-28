import Link from 'next/link';

const publicDocs = [
  {
    title: 'System Friction Institute',
    summary: 'Marco publico: friccion, evidencia, perturbacion minima y cierre operativo.',
    status: 'public_explanation',
  },
  {
    title: 'Metodo operativo',
    summary: 'Un objetivo produce tareas, cada tarea exige evidencia, la evidencia permite evaluar y decidir.',
    status: 'public_method',
  },
  {
    title: 'Repositorio de evidencia aprobada',
    summary: 'Solo muestra artefactos aprobados para publico. Inventarios internos, esquemas y prompts root quedan protegidos.',
    status: 'approved_only',
  },
];

export default function RepositoryPage() {
  return (
    <main className="min-h-screen bg-[#060605] px-6 py-14 text-[#d8d2c2]">
      <section className="mx-auto max-w-5xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">Repositorio publico</p>
        <h1 className="mt-5 text-4xl font-semibold text-[#f5eedc]">Documentacion y evidencia aprobada.</h1>
        <p className="mt-4 max-w-3xl leading-7 text-[#9f9788]">
          Este repositorio no expone material privado, inventarios de base de datos, prompts internos, datos ROOT ni evidencia de usuarios. Lo privado se revisa desde `/root`.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {publicDocs.map((doc) => (
            <article key={doc.title} className="border border-[#272219] bg-[#0b0b09] p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951]">{doc.status}</div>
              <h2 className="mt-3 text-xl text-[#f5eedc]">{doc.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#9f9788]">{doc.summary}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 border border-[#272219] bg-[#0b0b09] p-5">
          <h2 className="text-xl text-[#f5eedc]">Links externos</h2>
          <p className="mt-3 text-sm leading-6 text-[#9f9788]">Medium, LinkedIn institucional y LinkedIn fundador se muestran cuando esten configurados publicamente.</p>
          <div className="mt-4 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.14em]">
            <Link href="/contact" className="border border-[#c8a95166] px-3 py-2 text-[#c8a951]">Solicitar material</Link>
            <Link href="/privacy" className="border border-[#272219] px-3 py-2 text-[#d8d2c2]">Privacidad</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
