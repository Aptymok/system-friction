import Link from 'next/link';
import { getSfiLibraryDocuments, getSfiLibraryManifest } from '@/lib/sfi/library/manifest';

export const dynamic = 'force-static';

const boundaryItems = [
  ['LIBRARY', 'METHOD / CANON'],
  ['WORLD VECTOR', 'CONTEXT'],
  ['FIELD', 'CAPTURE / RETURN'],
  ['PREDICTION REGISTRY', 'HYPOTHESIS MEMORY'],
  ['ATLAS', 'LONGITUDINAL MEMORY'],
  ['AGENTS', 'COMPARE / PROPOSE'],
  ['ROOT', 'GOVERN / ADMIT'],
] as const;

export default function LibraryPage() {
  const manifest = getSfiLibraryManifest();
  const documents = getSfiLibraryDocuments();
  const canonical = documents.filter((document) => /CANON|APPROV|ACTIVE|PUBLISHED|READY/i.test(document.status)).length;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020405] px-4 py-4 text-[#d9e0df] sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(48,188,204,.15),transparent_34%),radial-gradient(circle_at_88%_34%,rgba(111,62,157,.11),transparent_28%),linear-gradient(rgba(76,164,173,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(76,164,173,.025)_1px,transparent_1px)] bg-[size:auto,auto,42px_42px,42px_42px]" />
      </div>

      <div className="relative mx-auto max-w-[1580px] border border-[#17313a] bg-[#030708e8] shadow-[0_30px_120px_rgba(0,0,0,.72)]">
        <header className="grid gap-px border-b border-[#17313a] bg-[#17313a] xl:grid-cols-[1.4fr_2fr_auto]">
          <div className="bg-[#030809] px-5 py-4">
            <div className="font-mono text-[8px] uppercase tracking-[0.26em] text-[#64d9e4]">SYSTEM FRICTION INSTITUTE</div>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-[#eef4f2]">LIBRARY · CANONICAL ARTIFACT INDEX</h1>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-[#7f969a]">Static editorial and technical artifacts. This surface indexes the existing package; it does not read private evidence and cannot promote institutional truth.</p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-[#17313a] sm:grid-cols-4">
            {[
              ['PACKAGE', manifest.packageName],
              ['VERSION', manifest.version],
              ['DOCUMENTS', String(documents.length)],
              ['CANON / READY', String(canonical)],
            ].map(([label, value]) => <div key={label} className="bg-[#040a0c] px-4 py-4"><span className="block font-mono text-[7px] tracking-[0.18em] text-[#54737a]">{label}</span><strong className="mt-2 block break-all font-mono text-[10px] font-medium text-[#cfe9e7]">{value}</strong></div>)}
          </div>
          <div className="flex items-center gap-2 bg-[#030809] px-4 py-4 font-mono text-[8px] uppercase tracking-[0.14em]">
            <Link className="border border-[#24515c] px-3 py-2 text-[#6ed7df] hover:border-[#55d8e3]" href="/api/sfi/library/manifest">MANIFEST</Link>
            <Link className="border border-[#24515c] px-3 py-2 text-[#6ed7df] hover:border-[#55d8e3]" href="/api/sfi/library/health">HEALTH</Link>
          </div>
        </header>

        <section className="grid gap-px border-b border-[#17313a] bg-[#17313a] md:grid-cols-4 xl:grid-cols-7">
          {boundaryItems.map(([label, role]) => (
            <div key={label} className="bg-[#04090a] px-4 py-3">
              <span className="block font-mono text-[7px] uppercase tracking-[0.16em] text-[#55767b]">{label}</span>
              <strong className="mt-1 block font-mono text-[8px] font-medium tracking-[0.08em] text-[#baa977]">{role}</strong>
            </div>
          ))}
        </section>

        <section className="grid gap-px bg-[#17313a] lg:grid-cols-2 2xl:grid-cols-3">
          {documents.map((document, index) => (
            <article key={document.id} className="group relative min-h-[280px] overflow-hidden bg-[#030708] p-5 transition-colors hover:bg-[#051014]">
              <div className="pointer-events-none absolute right-[-38px] top-[-38px] h-32 w-32 rounded-full border border-[#27515a44] shadow-[0_0_55px_rgba(60,206,218,.05)]" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-[7px] uppercase tracking-[0.22em] text-[#57d4df]">{String(index + 1).padStart(2, '0')} · {document.id}</div>
                  <h2 className="mt-3 max-w-xl text-lg font-semibold leading-6 text-[#e5ece9]">{document.title}</h2>
                </div>
                <span className="shrink-0 border border-[#4d3e713d] bg-[#0a0710] px-2 py-1 font-mono text-[7px] uppercase tracking-[0.12em] text-[#b78ed0]">{document.status}</span>
              </div>
              <p className="mt-4 text-xs leading-5 text-[#7f9294]">{document.function}</p>
              <dl className="mt-5 grid gap-4 border-t border-[#132a30] pt-4 text-[10px] sm:grid-cols-2">
                <div><dt className="font-mono text-[7px] uppercase tracking-[0.16em] text-[#55767b]">AUDIENCE</dt><dd className="mt-2 text-[#afbfbd]">{document.audience.join(', ')}</dd></div>
                <div><dt className="font-mono text-[7px] uppercase tracking-[0.16em] text-[#55767b]">PERSISTED PATH</dt><dd className="mt-2 break-all font-mono text-[8px] leading-4 text-[#8ca3a5]">{document.staticFilePath ?? document.publicPath}</dd></div>
              </dl>
              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="font-mono text-[7px] uppercase tracking-[0.12em] text-[#876e9a]">RECORD ≠ EVIDENCE · DOCUMENT ≠ EXECUTION AUTHORITY</span>
                <Link href={document.publicPath} className="border border-[#24515c] bg-[#041014] px-4 py-2 font-mono text-[8px] uppercase tracking-[0.14em] text-[#7bdee5] hover:border-[#63dce5] hover:text-[#c7f8f7]">OPEN</Link>
              </div>
            </article>
          ))}
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#17313a] bg-[#020607] px-5 py-3 font-mono text-[7px] uppercase tracking-[0.13em] text-[#59787d]">
          <span>LIBRARY = CANONICAL ARTIFACT SURFACE · STATIC PACKAGE</span>
          <span className="text-[#9179a2]">NO PRIVATE EVIDENCE READ · NO CANONICAL WRITE BY VIEW</span>
        </footer>
      </div>
    </main>
  );
}
