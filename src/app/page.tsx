import Link from 'next/link';
import { SFI_NAVIGATION, navByArea, navByIds, type SfiNavItem } from '@/lib/navigation/sfiNavigation';

const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contact@systemfriction.org';
const contactHref = `mailto:${contactEmail}?subject=System%20Friction%20Institute%20Inquiry`;

function SurfaceCard({ item }: { item: SfiNavItem }) {
  const isApi = item.area === 'api';
  const className = "block border border-[#1e1c17] bg-[#0b0b09] p-4 transition hover:border-[#c8a95155]";

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-[#f1ede0]">{item.title}</h3>
        <span className="border border-[#2e2c24] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[#c8a951]">{item.status}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#8f8878]">{item.description}</p>
      <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6f6658]">{item.href}</div>
    </>
  );

  return isApi ? <div className={className}>{content}</div> : <Link href={item.href} className={className}>{content}</Link>;
}

function Section({ id, title, items }: { id: string; title: string; items: SfiNavItem[] }) {
  if (!items.length) return null;

  return (
    <section id={id} className="border-t border-[#1e1c17] py-14">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="text-2xl font-semibold text-[#f1ede0]">{title}</h2>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#4d4639]">{items.length} superficies</div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => <SurfaceCard key={item.id} item={item} />)}
      </div>
    </section>
  );
}

export default function HomePage() {
  const observatories = navByArea('observatory');
  const instruments = navByArea('instrument');
  const dashboards = navByArea('dashboard');
  const access = navByIds(['login', 'user', 'terminal']);
  const primary = SFI_NAVIGATION.find((item) => item.id === 'root');
  const score = SFI_NAVIGATION.find((item) => item.id === 'scorefriction');

  return (
    <main className="min-h-screen bg-[#060605] text-[#c8c4b8]">
      <header className="sticky top-0 z-40 border-b border-[#1e1c17] bg-[#060605]/95 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center gap-5 overflow-x-auto px-6 py-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[#8f8878]">
          <Link href="/" className="mr-auto text-[#c8a951]">SFI</Link>
          <Link href="/">Inicio</Link>
          <Link href="/root">Observatorio</Link>
          <Link href="/scorefriction">ScoreFriction</Link>
          <Link href="/world-vector">WorldVector</Link>
          <Link href="/instruments">Instrumentos</Link>
          <Link href="/surfaces">Superficies</Link>
          <Link href="/contact">Contacto</Link>
          <Link href="/login">Log in</Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">Observatorio institucional</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-tight text-[#f1ede0] md:text-7xl">System Friction Institute</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-[#9b9484]">
            Observatorio, laboratorio e infraestructura para detectar señales persistentes, fricción sistémica y trayectorias emergentes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {primary ? <Link href={primary.href} className="border border-[#c8a951] bg-[#c8a951] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#060605]">Entrar al observatorio</Link> : null}
            {score ? <Link href={score.href} className="border border-[#c8a95155] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#c8a951]">Explorar ScoreFriction</Link> : null}
          </div>
        </div>
        <aside className="border border-[#1e1c17] bg-[#0b0b09] p-5">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#c8a951]">Contacto institucional</h2>
          <p className="mt-4 text-sm leading-6 text-[#8f8878]">
            Para colaboraciones, análisis, observación de señales o integración institucional.
          </p>
          <a href={contactHref} className="mt-5 inline-block border border-[#c8a95166] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951]">Contactar</a>
        </aside>
      </section>

      <div className="mx-auto max-w-7xl px-6">
        <Section id="observatorios" title="Observatorios" items={observatories} />
        <Section id="instrumentos" title="Instrumentos" items={instruments} />
        <Section id="dashboards" title="Dashboards y superficies" items={dashboards} />
        <Section id="acceso" title="Acceso" items={access} />
        <Section id="apis" title="APIs de estado" items={navByArea('api')} />
      </div>

      <footer className="border-t border-[#1e1c17] px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#c8a951]">System Friction Institute</div>
            <p className="mt-2 text-sm text-[#7d7668]">Registrar no es concluir. Registrar es sostener la trayectoria.</p>
          </div>
          <div className="flex gap-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8f8878]">
            <Link href="/surfaces">Surfaces</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/login">Log in</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
