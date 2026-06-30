import Link from 'next/link';

const email = 'aptymok@gmail.com';

const offer = [
  'Mapa de friccion',
  'Evidencia y Neural Graph',
  'AMV memory scan',
  'Hipotesis y prediccion',
  'Perturbacion minima',
  'Execution path',
  'Calibration loop',
  'Reporte ejecutivo',
  'Sesion de lectura',
];

export default function ContactPage() {
  const href = `mailto:${email}?subject=SFI-DR01%20Diagnostico%20de%20Friccion%20Sistemica&body=Nombre:%0AEmail:%0AOrganizacion:%0ASistema%20atorado:%0AEvidencia%20disponible:%0AResultado%20buscado:%0AMensaje:%0A`;

  return (
    <main className="min-h-screen bg-[#060605] px-6 py-10 text-[#d8d2c2]">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_380px]">
        <div className="border border-[#272219] bg-[#0b0b09] p-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">SFI-DR01</p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight text-[#f5eedc]">Diagnostico de Friccion Sistemica.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#9f9788]">
            Para equipos, founders o sistemas que tienen senales, bloqueos, desgaste o oportunidades visibles pero no una ruta clara de decision.
          </p>

          <form className="mt-7 grid gap-4">
            {['Nombre', 'Email/contacto', 'Organizacion', 'Sistema atorado', 'Evidencia disponible'].map((label) => (
              <label key={label} className="grid gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8f8878]">{label}</span>
                <input className="border border-[#272219] bg-[#060605] px-3 py-3 text-sm text-[#f5eedc]" />
              </label>
            ))}
            <label className="grid gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8f8878]">Mensaje</span>
              <textarea className="min-h-32 border border-[#272219] bg-[#060605] px-3 py-3 text-sm text-[#f5eedc]" />
            </label>
            <a href={href} className="inline-block border border-[#c8a951] bg-[#c8a951] px-5 py-3 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-[#060605]">Solicitar SFI-DR01</a>
            <p className="text-xs leading-5 text-[#8f8878]">Server email delivery: missing_email_delivery_contract. Fallback seguro `mailto:` hacia {email}.</p>
          </form>
        </div>

        <aside className="space-y-4">
          <section className="border border-[#272219] bg-[#0b0b09] p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Incluye</div>
            <div className="mt-4 grid gap-2">
              {offer.map((item) => (
                <div key={item} className="border border-[#272219] bg-[#060605] px-3 py-2 text-sm text-[#f5eedc]">{item}</div>
              ))}
            </div>
          </section>
          <section className="border border-[#272219] bg-[#0b0b09] p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Antes de contacto</div>
            <p className="mt-3 text-sm leading-6 text-[#9f9788]">Puedes iniciar con Mini MOP-H y traer una lectura preliminar con traza.</p>
            <Link href="/field" className="mt-4 inline-block border border-[#c8a95166] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951]">Abrir Field</Link>
          </section>
        </aside>
      </section>
    </main>
  );
}
