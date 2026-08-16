import Link from 'next/link';

const email = 'aptymok@gmail.com';

const entryTypes = [
  {
    key: '01',
    label: 'SYSTEM / ORGANIZATION',
    detail: 'Un sistema operativo con fricción, bloqueo, desgaste, divergencia o una decisión que requiere evidencia.',
    prompts: ['Nombre', 'Email/contacto', 'Organización', 'Sistema observado', 'Fricción o bloqueo', 'Evidencia disponible', 'Resultado buscado'],
  },
  {
    key: '02',
    label: 'CASE / FIELD',
    detail: 'Un caso concreto que puede entrar a observación, retorno longitudinal y perturbación mínima.',
    prompts: ['Nombre', 'Email/contacto', 'Caso', 'Estado actual', 'Qué ya ocurrió', 'Evidencia disponible', 'Qué necesitas contrastar'],
  },
  {
    key: '03',
    label: 'RESEARCH COLLABORATION',
    detail: 'Una hipótesis, protocolo, corpus, replicación, crítica metodológica o colaboración de investigación.',
    prompts: ['Nombre', 'Institución', 'Línea de investigación', 'Objeto o hipótesis', 'Método propuesto', 'Material disponible', 'Forma de colaboración'],
  },
  {
    key: '04',
    label: 'INSTITUTIONAL PARTNERSHIP',
    detail: 'Una organización, laboratorio, universidad, empresa o colectivo que busca una relación institucional con SFI.',
    prompts: ['Nombre', 'Organización', 'Rol', 'Objeto de la alianza', 'Capacidad que aporta', 'Capacidad que busca', 'Ventana temporal'],
  },
  {
    key: '05',
    label: 'METHOD / MODEL',
    detail: 'Un modelo, método o sistema que deba ser observado, contrastado, instrumentado o sometido a falsación.',
    prompts: ['Nombre', 'Método/modelo', 'Problema que resuelve', 'Supuestos principales', 'Evidencia disponible', 'Qué quieres que SFI contraste'],
  },
] as const;

function mailto(label: string, prompts: readonly string[]) {
  const subject = encodeURIComponent(`SFI ENGAGE · ${label}`);
  const body = encodeURIComponent(`${prompts.map((prompt) => `${prompt}:`).join('\n')}\n\nMensaje:\n`);
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#050504] text-[#d8d2c2]">
      <header className="border-b border-[#c8a95122] px-6 py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5">
          <Link href="/" className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#c8a951]">SFI · ENGAGE</Link>
          <div className="flex items-center gap-4 font-mono text-[9px] uppercase tracking-[0.16em] text-[#776e5d]">
            <Link href="/observatory">OBSERVE</Link>
            <Link href="/login?next=/studio" className="border border-[#c8a95155] px-3 py-2 text-[#c8a951]">ACCESS →</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:py-24">
        <div className="grid gap-12 border-b border-[#c8a95122] pb-16 lg:grid-cols-[0.65fr_1.35fr]">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#9a8248]">INSTITUTIONAL INTAKE · FIELD ENTRY</p>
          </div>
          <div>
            <h1 className="max-w-4xl font-serif text-5xl leading-[0.98] tracking-[-0.04em] text-[#f0e5cc] md:text-7xl">Bring something into the system.</h1>
            <p className="mt-7 max-w-3xl font-serif text-base leading-8 text-[#938b7d] md:text-lg">ENGAGE no es un buzón genérico. Es la frontera donde un sistema, caso, colaboración, alianza o método adquiere un objeto explícito antes de entrar a Field, Studio o una ruta gobernada.</p>
          </div>
        </div>

        <div className="grid border-l border-t border-[#c8a95122] md:grid-cols-2 xl:grid-cols-3">
          {entryTypes.map((entry) => (
            <a key={entry.key} href={mailto(entry.label, entry.prompts)} className="group min-h-72 border-b border-r border-[#c8a95122] p-6 no-underline transition hover:bg-[#0a0906]">
              <div className="flex items-center justify-between gap-4 font-mono text-[8px] uppercase tracking-[0.18em] text-[#806d40]">
                <span>{entry.key}</span>
                <span>EMAIL HANDOFF</span>
              </div>
              <h2 className="mt-10 font-serif text-2xl font-normal text-[#dbc99f]">{entry.label}</h2>
              <p className="mt-4 font-serif text-sm leading-7 text-[#81796c]">{entry.detail}</p>
              <div className="mt-8 font-mono text-[8px] uppercase tracking-[0.16em] text-[#9b844e] group-hover:text-[#d0b769]">OPEN INTAKE →</div>
            </a>
          ))}
        </div>

        <div className="mt-16 grid gap-5 lg:grid-cols-3">
          <section className="border border-[#c8a95122] bg-[#080706] p-6">
            <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#8b7745]">OBSERVE FIRST</span>
            <h2 className="mt-5 font-serif text-2xl text-[#d8c79f]">No necesitas contactar para mirar.</h2>
            <p className="mt-3 font-serif text-sm leading-7 text-[#81796c]">Si todavía estás delimitando el problema, entra primero a la superficie pública y observa cómo SFI separa señal, trayectoria y evidencia.</p>
            <Link href="/observatory?source=engage" className="mt-6 inline-block font-mono text-[9px] uppercase tracking-[0.16em] text-[#b79d5c]">ENTER OBSERVATORY ↗</Link>
          </section>
          <section className="border border-[#c8a95122] bg-[#080706] p-6">
            <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#8b7745]">FIELD ENTRY</span>
            <h2 className="mt-5 font-serif text-2xl text-[#d8c79f]">Ya tienes un caso.</h2>
            <p className="mt-3 font-serif text-sm leading-7 text-[#81796c]">Field permite comenzar con una observación estructurada antes de convertir el problema en una intervención o una afirmación.</p>
            <Link href="/field?source=engage" className="mt-6 inline-block font-mono text-[9px] uppercase tracking-[0.16em] text-[#b79d5c]">OPEN FIELD ↗</Link>
          </section>
          <section className="border border-[#c8a95122] bg-[#080706] p-6">
            <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#8b7745]">EXISTING ACCESS</span>
            <h2 className="mt-5 font-serif text-2xl text-[#d8c79f]">Ya eres parte del sistema.</h2>
            <p className="mt-3 font-serif text-sm leading-7 text-[#81796c]">No reinicies por contacto. Autentícate y continúa en Studio o en las superficies gobernadas que correspondan a tu identidad y rol.</p>
            <Link href="/login?next=/studio" className="mt-6 inline-block font-mono text-[9px] uppercase tracking-[0.16em] text-[#b79d5c]">ACCESS SFI ↗</Link>
          </section>
        </div>

        <div className="mt-12 border-l border-[#c8a95144] pl-4 font-mono text-[9px] leading-6 tracking-[0.08em] text-[#635d52]">
          <p>TRANSPORT STATUS · SERVER EMAIL DELIVERY CONTRACT NOT YET CANONICAL.</p>
          <p>ACTIVE FALLBACK · USER-INITIATED EMAIL HANDOFF TO {email}.</p>
        </div>
      </section>
    </main>
  );
}
