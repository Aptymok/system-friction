import Link from 'next/link';

const hierarchy = [
  'Regulacion perceptual',
  'Presencia sostenida',
  'Seguridad psicologica',
  'Claridad estructural',
  'Exactitud funcional',
  'Velocidad',
  'Estetica',
];

export default function SfiCoreV2Page() {
  return (
    <main className="min-h-screen bg-[#060605] px-5 py-12 text-[#ccc8bc] md:px-10">
      <article className="mx-auto max-w-4xl border-x border-[#242017] bg-[#0a0a09] px-6 py-10 md:px-12">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#8a7035]">SYSTEM FRICTION INSTITUTE · CANON PUBLICO</p>
        <h1 className="mt-6 font-serif text-5xl leading-tight text-[#C8A951]">SFI-CORE.v2</h1>
        <p className="mt-3 font-serif text-2xl text-[#f4f0e7]">Kernel operativo de arquitectura perceptual</p>
        <p className="mt-8 font-mono text-[13px] leading-7 text-[#aaa497]">
          SFI-CORE.v2 regula como el sistema observa. Define los limites perceptuales del Instituto: desaceleracion antes que velocidad, presencia antes que estimulacion, observacion antes que persuasion, estructura antes que estetica.
        </p>
        <div className="my-10 border-y border-[#3a3220] py-8 font-mono text-2xl text-[#f4f0e7]">(+1) Observacion + (0) Estructura - (1) Vacio = 0</div>
        <p className="font-mono text-[13px] leading-7 text-[#aaa497]">
          Todo sistema SFI debe cerrar en equilibrio perceptual. Si aumenta dispersion, se invalida. Si induce presencia, puede operar. Si persuade en lugar de observar, deja de ser SFI.
        </p>
        <div className="mt-10 grid gap-3">
          {hierarchy.map((item, index) => (
            <div key={item} className="flex gap-4 border border-[#242017] p-4 font-mono text-[12px] uppercase tracking-[0.08em]">
              <span className="text-[#8a7035]">{index + 1}</span>
              <span className="text-[#f4f0e7]">{item}</span>
            </div>
          ))}
        </div>
        <Link href="/" className="mt-10 inline-block border border-[#C8A951]/50 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#C8A951]">Volver al umbral</Link>
      </article>
    </main>
  );
}
