import { notFound } from 'next/navigation';
import { readPublicMopsCertificate } from '@/lib/sfi/artifacts/artifactRegistry';

export const dynamic = 'force-dynamic';

function compact(value: string | null) {
  if (!value) return '—';
  return value.length > 34 ? `${value.slice(0, 16)}…${value.slice(-12)}` : value;
}

export default async function MopsEvidenceCertificatePage({ params }: { params: Promise<{ artifactId: string }> }) {
  const { artifactId } = await params;
  const certificate = await readPublicMopsCertificate(decodeURIComponent(artifactId)).catch(() => null);
  if (!certificate) notFound();
  const artifact = certificate.artifact;
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_22%,rgba(70,53,142,.18),transparent_31%),linear-gradient(#020608,#03090d_60%,#010405)] px-5 py-8 font-mono text-[#dbe8ec]">
      <section className="mx-auto max-w-6xl overflow-hidden border border-cyan-200/15 bg-black/25 shadow-[0_30px_100px_rgba(0,0,0,.45)]">
        <header className="flex flex-col gap-6 border-b border-cyan-200/10 p-6 md:flex-row md:items-center md:justify-between">
          <div><p className="text-[9px] tracking-[.26em] text-cyan-200/45">SYSTEM FRICTION INSTITUTE</p><h1 className="mt-2 text-2xl tracking-[.16em]">MOPS EVIDENCE</h1><p className="mt-2 text-[10px] text-fuchsia-200/65">{artifact.artifactId}</p></div>
          <div className="flex items-center gap-4"><div className="grid h-20 w-20 place-items-center rounded-full border border-cyan-200/30 shadow-[0_0_35px_rgba(84,215,229,.12),inset_0_0_25px_rgba(84,215,229,.08)]"><div className="text-center"><strong className="block text-[11px] text-cyan-200">VERIFIED</strong><span className="text-[7px] text-cyan-100/40">MOPS</span></div></div><div className="text-[9px] leading-5 text-cyan-100/45"><p>VISIBILITY · {artifact.visibility}</p><p>CERTIFICATE · {artifact.certificateStatus}</p><p>EXACT HASH · {certificate.exactIdentityVerified ? 'PRESENT' : 'NOT DECLARED'}</p></div></div>
        </header>

        <div className="grid md:grid-cols-[1.35fr_.65fr]">
          <section className="border-b border-cyan-200/10 p-6 md:border-b-0 md:border-r">
            <p className="text-[8px] tracking-[.18em] text-cyan-200/45">ARTIFACT</p>
            <h2 className="mt-3 text-xl tracking-[.1em]">{artifact.objectLabel}</h2>
            <div className="mt-6 grid grid-cols-2 gap-px bg-cyan-100/10 md:grid-cols-3">
              {[
                ['PROJECT', artifact.projectKey],['NODE', artifact.nodeKey],['VERSION', artifact.version],['MEDIA', artifact.mediaType],['CREATED', artifact.createdAt],['SOURCE OBJECT', artifact.sourceObjectId],
              ].map(([label,value]) => <div key={label} className="min-h-20 bg-[#031015] p-3"><span className="text-[7px] text-cyan-100/35">{label}</span><strong className="mt-3 block break-words text-[10px] font-medium text-cyan-50/85">{value ?? '—'}</strong></div>)}
            </div>
            <div className="mt-6 border border-cyan-200/10 bg-[#020a0e]/80 p-4">
              <p className="text-[8px] tracking-[.18em] text-cyan-200/45">IDENTITY PROOFS</p>
              <dl className="mt-3 grid gap-2 text-[8px]">
                <div className="grid grid-cols-[150px_1fr]"><dt className="text-cyan-100/35">EXACT HASH</dt><dd className="break-all text-cyan-50/70">{artifact.exactHash ? `${artifact.exactHash.algorithm}:${artifact.exactHash.value}` : 'NOT DECLARED'}</dd></div>
                <div className="grid grid-cols-[150px_1fr]"><dt className="text-cyan-100/35">PERCEPTUAL</dt><dd className="break-all text-cyan-50/70">{artifact.perceptualFingerprint ? `${artifact.perceptualFingerprint.algorithm}:${artifact.perceptualFingerprint.value}` : 'NOT DECLARED'}</dd></div>
                <div className="grid grid-cols-[150px_1fr]"><dt className="text-cyan-100/35">LINEAGE ROOT</dt><dd className="break-all text-cyan-50/70">{artifact.lineageRootHash ?? '—'}</dd></div>
                <div className="grid grid-cols-[150px_1fr]"><dt className="text-cyan-100/35">ANALYSIS SNAPSHOT</dt><dd className="break-all text-cyan-50/70">{artifact.analysisSnapshotHash ?? '—'}</dd></div>
                <div className="grid grid-cols-[150px_1fr]"><dt className="text-cyan-100/35">MIHM SNAPSHOT</dt><dd className="break-all text-cyan-50/70">{artifact.mihmSnapshotHash ?? '—'}</dd></div>
              </dl>
            </div>
          </section>

          <aside className="p-6">
            <p className="text-[8px] tracking-[.18em] text-cyan-200/45">PUBLIC LINEAGE</p>
            <div className="mt-4 grid gap-2">{certificate.publicLineage.length ? certificate.publicLineage.map((item) => <div key={`${item.relation}:${item.ref}`} className="border border-fuchsia-200/10 bg-fuchsia-300/[.025] p-3"><span className="text-[7px] text-fuchsia-200/45">{item.relation}</span><strong className="mt-2 block break-all text-[9px] font-medium">{item.ref}</strong></div>) : <div className="text-[9px] text-cyan-100/35">NO PUBLIC LINEAGE DECLARED</div>}</div>
            <p className="mt-7 text-[8px] tracking-[.18em] text-cyan-200/45">MANIFESTATIONS</p>
            <div className="mt-4 grid gap-2">{certificate.manifestations.length ? certificate.manifestations.map((item) => <a key={item.id} href={item.externalUrl} target="_blank" rel="noreferrer" className="border border-cyan-200/10 bg-cyan-300/[.025] p-3 no-underline transition hover:border-cyan-200/30"><div className="flex justify-between gap-3"><span className="text-[7px] text-cyan-200/50">{item.platform.toUpperCase()}</span><span className="text-[7px] text-emerald-200/55">{item.verification}</span></div><strong className="mt-2 block text-[9px] font-medium text-cyan-50/85">{item.relationType}</strong><small className="mt-1 block break-all text-[7px] text-cyan-100/35">{compact(item.externalUrl)}</small></a>) : <div className="text-[9px] text-cyan-100/35">NO PUBLIC MANIFESTATIONS</div>}</div>
          </aside>
        </div>

        <footer className="flex flex-col gap-2 border-t border-cyan-200/10 px-6 py-4 text-[8px] text-cyan-100/35 md:flex-row md:justify-between"><span>IDENTITY ≠ HASH ALGORITHM · PUBLIC CERTIFICATE ≠ TRUTH AUTHORITY</span><span>ISSUED {certificate.issuedAt}</span></footer>
      </section>
    </main>
  );
}
