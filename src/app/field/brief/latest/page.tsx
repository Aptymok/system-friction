import Link from 'next/link';

export default function LatestFieldBriefPage() {
  return (
    <main className="min-h-screen bg-[#060605] px-5 py-12 text-[#ccc8bc] md:px-10">
      <article className="mx-auto max-w-4xl border-x border-[#242017] bg-[#0a0a09] px-6 py-10 md:px-12">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#8a7035]">SFI FIELD BRIEF 001 · PUBLICO</p>
        <h1 className="mt-6 font-serif text-5xl leading-tight text-[#C8A951]">Saturacion de validacion publica</h1>
        <p className="mt-8 font-mono text-[13px] leading-7 text-[#aaa497]">
          Un Field Brief es una unidad minima de observacion publica. No es articulo, post u opinion. Es una lectura breve, trazable y limitada de un regimen de friccion.
        </p>
        <dl className="mt-10 grid gap-4">
          {[
            ['Regimen observado', 'Saturacion de validacion publica.'],
            ['Friccion dominante', 'Produccion simbolica sin recepcion proporcional.'],
            ['Patron emergente', 'El campo incrementa volumen cuando no obtiene lectura.'],
            ['Evidencia visible', 'Sobreproduccion narrativa, respuesta diferida, fragmentacion de atencion y dependencia de confirmacion externa.'],
            ['Perturbacion minima', 'Publicar una observacion verificable, no una explicacion completa.'],
            ['Limite de lectura', 'Lectura colectiva. No diagnostico individual.'],
          ].map(([label, value]) => (
            <div key={label} className="border border-[#242017] p-4">
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#C8A951]">{label}</dt>
              <dd className="mt-3 font-mono text-[13px] leading-7 text-[#f4f0e7]">{value}</dd>
            </div>
          ))}
        </dl>
        <Link href="/" className="mt-10 inline-block border border-[#C8A951]/50 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#C8A951]">Volver al umbral</Link>
      </article>
    </main>
  );
}
