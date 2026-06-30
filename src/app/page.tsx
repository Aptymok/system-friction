import Link from 'next/link';
import { ArrowRight, BrainCircuit, GitBranch, Layers3, LockKeyhole, Radar, Route, ShieldCheck, type LucideIcon } from 'lucide-react';

const nav = [
  ['SFI', '#sfi'],
  ['Field', '/field'],
  ['World Vector', '/world-vector'],
  ['Repository', '/repository'],
  ['Quienes somos', '#quienes'],
  ['Contacto', '/contact?offer=SFI-DR01'],
  ['Iniciar sesion', '/login'],
];

const flow: Array<[string, string, LucideIcon]> = [
  ['Signal Intake', 'Captura friccion declarada, evidencia y senales publicas/manuales.', Radar],
  ['Friction Map', 'Convierte bloqueo en lectura operativa y riesgo trazable.', Route],
  ['Neural Graph', 'Conecta evidencia, nodos, hipotesis, predicciones y outcomes.', GitBranch],
  ['AMV Memory', 'Recupera memoria, recurrencias y asociaciones con fallback textual.', BrainCircuit],
  ['Hypothesis Engine', 'Genera predicciones antes de actuar y conserva incertidumbre.', Layers3],
  ['Prediction Registry', 'Registra probabilidad, accion, outcome y calibracion.', ShieldCheck],
  ['Minimal Perturbation', 'Propone una accion reversible con ventana de retorno.', ArrowRight],
  ['Execution Queue', 'Nada se publica ni contacta sin aprobacion humana.', LockKeyhole],
  ['Learning Loop', 'Outcome -> calibracion -> AMV -> Graph -> siguiente decision.', BrainCircuit],
];

const productRoutes = [
  ['Mini MOP-H', '/field', 'Usuario normal', 'input -> lectura -> perturbacion -> SFI-DR01'],
  ['World Vector', '/world-vector', 'Observatorio', 'contexto mundial read-only y reportes draft'],
  ['Repository', '/repository', 'Evidencia publica', 'documentos, contratos y material institucional'],
  ['ROOT', '/root', 'Founder', 'Graph, AMV, Client Finder, Prediction Registry y Reports'],
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#060605] text-[#d8d2c2]">
      <header className="sticky top-0 z-40 border-b border-[#1e1c17] bg-[#060605]/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="shrink-0 font-mono text-[11px] uppercase tracking-[0.28em] text-[#c8a951]">System Friction Institute</Link>
          <nav className="flex min-w-0 max-w-full flex-wrap justify-start gap-2 font-mono text-[10px] uppercase tracking-[0.14em] lg:justify-end">
            {nav.map(([label, href]) => (
              <Link key={label} href={href} className={label === 'Iniciar sesion' ? 'whitespace-nowrap border border-[#c8a951] bg-[#c8a951] px-3 py-2 text-[#060605]' : 'whitespace-nowrap border border-[#2f2a1e] px-3 py-2 text-[#d8d2c2]'}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <section id="sfi" className="mx-auto grid min-h-[78vh] max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">SFI Operating System</p>
          <h1 className="mt-6 max-w-5xl text-5xl font-semibold leading-[1.02] text-[#f5eedc] md:text-7xl">
            Friccion observada, evidencia conectada, accion propuesta.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-[#9f9788]">
            SFI opera como consola agentica: lee sistemas atorados, cruza memoria y grafo, proyecta oportunidades, genera reportes y deja cada accion en aprobacion humana.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/field" className="inline-flex items-center gap-2 border border-[#c8a951] bg-[#c8a951] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#060605]">
              Iniciar Mini MOP-H <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/contact?offer=SFI-DR01" className="border border-[#c8a95166] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#c8a951]">Solicitar SFI-DR01</Link>
            <Link href="/repository" className="border border-[#2f2a1e] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#d8d2c2]">Ver evidencia</Link>
          </div>
        </div>

        <aside className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#c8a951]">Approval Queue</div>
          <div className="mt-5 grid gap-3">
            {['IFNORM draft', 'SFI-DR01 proposal', 'LinkedIn draft', 'Contact draft', 'Prediction outcome'].map((item) => (
              <div key={item} className="flex items-center justify-between gap-3 border border-[#272219] bg-[#060605] px-3 py-3">
                <span className="text-sm text-[#f5eedc]">{item}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#c8a951]">human approval</span>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="border-y border-[#1e1c17] bg-[#0b0b09] px-6 py-10">
        <div className="mx-auto grid max-w-7xl gap-3 md:grid-cols-3 xl:grid-cols-9">
          {flow.map(([label, textValue, Icon]) => (
            <article key={label} className="min-h-[178px] border border-[#2f2a1e] bg-[#060605] p-4">
              <Icon className="h-5 w-5 text-[#c8a951]" aria-hidden="true" />
              <h2 className="mt-4 text-sm font-semibold uppercase tracking-[0.08em] text-[#f5eedc]">{label}</h2>
              <p className="mt-3 text-xs leading-5 text-[#9f9788]">{textValue}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-12 lg:grid-cols-[1fr_1fr]">
        <div id="quienes" className="border border-[#2f2a1e] bg-[#0b0b09] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#c8a951]">Quienes somos</p>
          <h2 className="mt-4 text-3xl font-semibold text-[#f5eedc]">Instituto para diagnosticar friccion sistemica.</h2>
          <p className="mt-4 text-sm leading-7 text-[#9f9788]">
            System Friction Institute convierte senales, evidencia, memoria y prediccion en rutas de intervencion minima. El producto no automatiza contacto ni publicacion: prepara lectura, propuesta y calibracion para decision humana.
          </p>
        </div>

        <div className="grid gap-3">
          {productRoutes.map(([label, href, audience, value]) => (
            <Link key={label} href={href} className="grid gap-3 border border-[#2f2a1e] bg-[#0b0b09] p-4 md:grid-cols-[160px_150px_1fr]">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951]">{label}</span>
              <span className="text-sm text-[#f5eedc]">{audience}</span>
              <span className="text-sm text-[#9f9788]">{value}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
