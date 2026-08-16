import Link from 'next/link';
import { getSfiLibraryDocuments, getSfiLibraryManifest } from '@/lib/sfi/library/manifest';

export const dynamic = 'force-static';

const boundaryItems = [
  'Library = metodo',
  'World Vector = contexto',
  'Field = captura',
  'Prediction Registry = memoria de hipotesis',
  'Atlas = memoria longitudinal',
  'Agents = comparacion y propuesta',
  'ROOT = decision',
];

export default function LibraryPage() {
  const manifest = getSfiLibraryManifest();
  const documents = getSfiLibraryDocuments();

  return (
    <main className="min-h-screen bg-transparent px-6 py-16 text-[#d8d2c2]">
      <div className="mx-auto max-w-6xl space-y-8">
        <header data-sfi-field-anchor="library-manifest" className="border border-[#332c20] bg-[#090908cc] p-6 backdrop-blur-xl md:p-9">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">Technical Library</p>
          <h1 className="mt-4 max-w-4xl font-serif text-5xl font-normal leading-[.95] text-[#f5eedc] md:text-7xl">
            Biblioteca técnica del System Friction Institute
          </h1>
          <p className="mt-5 max-w-3xl font-serif text-base leading-7 text-[#9f9788]">
            Índice canónico de métodos, protocolos y artefactos editoriales públicos. La biblioteca conserva método; no sustituye evidencia, observación ni autoridad.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 font-mono text-[9px] uppercase tracking-[0.13em] text-[#8f8878]">
            <span>{manifest.packageName}</span><span>version={manifest.version}</span>
            <Link className="text-[#c8a951]" href="/api/sfi/library/manifest">manifest</Link>
            <Link className="text-[#c8a951]" href="/api/sfi/library/health">health</Link>
          </div>
        </header>

        <section data-sfi-field-anchor="library-boundaries" className="grid gap-px border border-[#2f2a1e] bg-[#2f2a1e] md:grid-cols-2 lg:grid-cols-4">
          {boundaryItems.map((item) => (
            <div key={item} className="bg-[#080907d9] p-4 font-mono text-[10px] uppercase tracking-[0.12em] text-[#d8d2c2] backdrop-blur-lg">{item}</div>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {documents.map((document) => (
            <article data-sfi-field-anchor={`library-${document.id}`} key={document.id} className="group border border-[#2f2a1e] bg-[#090908c7] p-5 backdrop-blur-xl transition-colors hover:border-[#c8a95166]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#c8a951]">{document.id}</div><h2 className="mt-2 font-serif text-2xl font-normal text-[#f5eedc]">{document.title}</h2></div>
                <span className="border border-[#2f2a1e] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#8f8878]">{document.status}</span>
              </div>
              <p className="mt-4 font-serif text-sm leading-6 text-[#9f9788]">{document.function}</p>
              <dl className="mt-5 grid gap-3 text-xs md:grid-cols-2">
                <div><dt className="font-mono uppercase tracking-[0.14em] text-[#8f8878]">Audience</dt><dd className="mt-1 text-[#d8d2c2]">{document.audience.join(', ')}</dd></div>
                <div><dt className="font-mono uppercase tracking-[0.14em] text-[#8f8878]">Static file link</dt><dd className="mt-1 break-all text-[#d8d2c2]">{document.staticFilePath ?? document.publicPath}</dd></div>
              </dl>
              <Link href={document.publicPath} className="mt-5 inline-block border border-[#c8a95166] px-4 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#c8a951]">Open document</Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
