const email = 'aptymok@gmail.com';

export default function ContactPage() {
  const href = `mailto:${email}?subject=System%20Friction%20Institute&body=Nombre:%0AEmail:%0AOrganizacion:%0AQue%20buscas:%0APor%20que%20contactas:%0AMensaje:%0A`;

  return (
    <main className="min-h-screen bg-[#060605] px-6 py-14 text-[#d8d2c2]">
      <section className="mx-auto max-w-3xl border border-[#272219] bg-[#0b0b09] p-7">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">Contacto</p>
        <h1 className="mt-5 text-4xl font-semibold text-[#f5eedc]">Contactar System Friction Institute.</h1>
        <form className="mt-7 grid gap-4">
          {['Nombre', 'Email/contacto', 'Que quieres', 'Por que contactas', 'Organizacion opcional'].map((label) => (
            <label key={label} className="grid gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8f8878]">{label}</span>
              <input className="border border-[#272219] bg-[#060605] px-3 py-3 text-sm text-[#f5eedc]" />
            </label>
          ))}
          <label className="grid gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8f8878]">Mensaje opcional</span>
            <textarea className="min-h-28 border border-[#272219] bg-[#060605] px-3 py-3 text-sm text-[#f5eedc]" />
          </label>
          <a href={href} className="inline-block border border-[#c8a951] bg-[#c8a951] px-5 py-3 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-[#060605]">Enviar por correo</a>
          <p className="text-xs leading-5 text-[#8f8878]">Server email delivery: missing_email_delivery_contract. Se usa fallback seguro `mailto:` hacia {email}.</p>
        </form>
        <div className="mt-8 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#c8a951]">
          <a href="https://systemfriction.org">Main site</a>
          <span>Medium: not_configured</span>
          <span>Institute LinkedIn: not_configured</span>
          <span>Founder LinkedIn: not_configured</span>
        </div>
      </section>
    </main>
  );
}
