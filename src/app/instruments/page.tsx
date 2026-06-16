import Link from 'next/link';
import { navByIds } from '@/lib/navigation/sfiNavigation';

const instruments = [
  { name: 'MIHM', description: 'Régimen dinámico del sistema.', href: '/api/mihm/state', status: 'API', doc: 'docs/instruments' },
  { name: 'ScoreFriction', description: 'Vector cultural/audio y fricción sistémica.', href: '/scorefriction', status: 'active', doc: 'docs/scorefriction' },
  { name: 'SFI-PSI', description: 'Señales persistentes transmodales.', href: '/api/signals/state', status: 'API', doc: 'docs/instruments/SFI_PSI.md' },
  { name: 'WorldSpectrumVector', description: 'Presión externa y contexto.', href: '/api/worldspect/vector', status: 'API', doc: 'docs/root/ROOT_PHASE_9_WSV_MIHM.md' },
  { name: 'ROOT', description: 'Integración operativa.', href: '/root', status: 'protected', doc: 'docs/root' },
];

export default function InstrumentsPage() {
  const surfaces = navByIds(['root', 'scorefriction', 'scorefriction-operational', 'api-signals-state', 'api-worldspect-vector']);

  return (
    <main className="min-h-screen bg-[#060605] px-6 py-16 text-[#c8c4b8]">
      <section className="mx-auto max-w-6xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">SFI instruments</p>
        <h1 className="mt-5 text-4xl font-semibold text-[#f1ede0]">Instrumentos</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[#8f8878]">
          MIHM mide el régimen dinámico del sistema. PSI mide qué señal sobrevive al ruido.
        </p>
        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {instruments.map((instrument) => (
            <div key={instrument.name} className="border border-[#1e1c17] bg-[#0b0b09] p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-semibold text-[#f1ede0]">{instrument.name}</h2>
                <span className="border border-[#2e2c24] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[#c8a951]">{instrument.status}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#8f8878]">{instrument.description}</p>
              <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-[#6f6658]">Repo docs: {instrument.doc}</div>
              {instrument.href.startsWith('/api/') ? (
                <code className="mt-3 block text-xs text-[#c8a951]">{instrument.href}</code>
              ) : (
                <Link href={instrument.href} className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.14em] text-[#c8a951]">Abrir</Link>
              )}
            </div>
          ))}
        </div>
        <div className="mt-10 border border-[#1e1c17] p-5">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Superficies relacionadas</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {surfaces.map((item) => item.area === 'api' ? (
              <code key={item.id} className="border border-[#1e1c17] px-3 py-2 text-xs text-[#8f8878]">{item.href}</code>
            ) : (
              <Link key={item.id} href={item.href} className="border border-[#1e1c17] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#c8a951]">{item.title}</Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
