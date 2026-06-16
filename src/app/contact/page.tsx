const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contact@systemfriction.org';
const contactHref = `mailto:${contactEmail}?subject=System%20Friction%20Institute%20Inquiry`;

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#060605] px-6 py-16 text-[#c8c4b8]">
      <section className="mx-auto max-w-3xl border border-[#1e1c17] bg-[#0b0b09] p-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">System Friction Institute</p>
        <h1 className="mt-5 text-4xl font-semibold text-[#f1ede0]">Contacto institucional</h1>
        <p className="mt-4 text-base leading-7 text-[#8f8878]">
          Para colaboraciones, análisis, observación de señales o integración institucional.
        </p>
        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {['colaboración', 'análisis de señales', 'integración de observatorios', 'revisión institucional'].map((area) => (
            <div key={area} className="border border-[#1e1c17] p-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[#c8a951]">{area}</div>
          ))}
        </div>
        <a href={contactHref} className="mt-8 inline-block border border-[#c8a95166] bg-[#c8a951] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#060605]">
          Contactar
        </a>
        <p className="mt-4 font-mono text-[10px] text-[#6f6658]">{contactEmail}</p>
      </section>
    </main>
  );
}
