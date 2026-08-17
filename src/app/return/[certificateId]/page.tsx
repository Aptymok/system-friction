import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { readPublicReturnCertificate } from '@/lib/returns/returnCertificateService';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ certificateId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { certificateId } = await params;
  return {
    title: `${certificateId} · SFI Return Certificate`,
    description: 'Public provenance and return record issued by System Friction Institute.',
    robots: { index: true, follow: true },
    alternates: { canonical: `/return/${encodeURIComponent(certificateId)}` },
  };
}

function display(value: unknown) {
  return typeof value === 'string' && value ? value : '—';
}

export default async function ReturnCertificatePage({ params }: PageProps) {
  const { certificateId } = await params;
  const certificate = await readPublicReturnCertificate(certificateId.toUpperCase());
  if (!certificate) notFound();

  return (
    <main className="min-h-screen bg-[#070806] px-5 py-10 text-[#e8e2d5] md:px-10 md:py-16">
      <article className="mx-auto max-w-6xl border border-[#e8e2d526] bg-[#090a08]">
        <header className="grid gap-8 border-b border-[#e8e2d526] p-6 md:grid-cols-[1.3fr_.7fr] md:p-10">
          <div>
            <p className="font-mono text-[9px] tracking-[0.22em] text-[#75aaa9]">SYSTEM FRICTION INSTITUTE · RETURN CERTIFICATE</p>
            <h1 className="mt-5 break-words font-serif text-4xl tracking-[-0.04em] text-[#f3ede2] md:text-7xl">{certificate.certificate_id}</h1>
            <p className="mt-5 max-w-3xl font-serif text-base leading-7 text-[#aaa69c]">
              This certificate records a public return trace and its provenance. It does not, by itself, certify the truth of the publication, validate a model, or convert platform engagement into evidence.
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-px bg-[#e8e2d51f] font-mono text-[9px]">
            <div className="bg-[#070806] p-4"><dt className="text-[#77736a]">STATE</dt><dd className="mt-2 text-[#e5c77f]">{certificate.state.toUpperCase()}</dd></div>
            <div className="bg-[#070806] p-4"><dt className="text-[#77736a]">CLASS</dt><dd className="mt-2">{certificate.epistemic_class}</dd></div>
            <div className="bg-[#070806] p-4"><dt className="text-[#77736a]">PLATFORM</dt><dd className="mt-2">{certificate.platform.toUpperCase()}</dd></div>
            <div className="bg-[#070806] p-4"><dt className="text-[#77736a]">TRACE</dt><dd className="mt-2 break-all">{certificate.trace_id}</dd></div>
          </dl>
        </header>

        <section className="grid gap-px bg-[#e8e2d51f] md:grid-cols-3">
          {[
            ['PROGRAM', certificate.program_id],
            ['OBJECT', certificate.object_id],
            ['PARENT TRACE', certificate.parent_trace_id],
            ['SCHEDULED', certificate.scheduled_at],
            ['PUBLISHED', certificate.published_at],
            ['OBSERVED', certificate.observed_at],
          ].map(([label, value]) => (
            <div key={label} className="bg-[#090a08] p-6">
              <span className="font-mono text-[8px] tracking-[0.16em] text-[#77736a]">{label}</span>
              <strong className="mt-3 block break-words font-mono text-[11px] font-normal text-[#d6d0c4]">{display(value)}</strong>
            </div>
          ))}
        </section>

        <section className="grid gap-8 border-t border-[#e8e2d526] p-6 md:grid-cols-2 md:p-10">
          <div>
            <p className="font-mono text-[8px] tracking-[0.16em] text-[#75aaa9]">EXTERNAL PUBLICATION</p>
            {certificate.external_url ? (
              <a className="mt-4 block break-all font-serif text-xl text-[#e5c77f] underline decoration-[#e5c77f66] underline-offset-4" href={certificate.external_url} rel="noreferrer" target="_blank">
                {certificate.external_url}
              </a>
            ) : (
              <p className="mt-4 font-serif text-xl text-[#817b70]">PENDING EXTERNAL URL</p>
            )}
          </div>
          <div>
            <p className="font-mono text-[8px] tracking-[0.16em] text-[#75aaa9]">WATERMARK / STEGANOGRAPHIC LAYER</p>
            <p className="mt-4 font-mono text-[10px] leading-6 text-[#aaa69c]">SCHEME · {display(certificate.watermark_scheme)}</p>
            <p className="font-mono text-[10px] leading-6 text-[#aaa69c]">TOKEN · {display(certificate.watermark_token)}</p>
            <p className="mt-3 font-serif text-sm leading-6 text-[#817b70]">A robust watermark is a provenance aid, not an absolute survival guarantee. Platform transcoding may alter or remove hidden carriers.</p>
          </div>
        </section>

        <section className="border-t border-[#e8e2d526] p-6 md:p-10">
          <p className="font-mono text-[8px] tracking-[0.16em] text-[#75aaa9]">INTEGRITY</p>
          <div className="mt-5 grid gap-5 font-mono text-[9px] leading-6 md:grid-cols-2">
            <div><span className="text-[#77736a]">ASSET SHA-256</span><code className="mt-2 block break-all text-[#d6d0c4]">{certificate.asset_sha256}</code></div>
            <div><span className="text-[#77736a]">PAYLOAD SHA-256</span><code className="mt-2 block break-all text-[#d6d0c4]">{display(certificate.payload_sha256)}</code></div>
            <div className="md:col-span-2"><span className="text-[#77736a]">CERTIFICATE RECORD DIGEST</span><code className="mt-2 block break-all text-[#e5c77f]">{certificate.record_digest}</code></div>
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-[#e8e2d526] p-6 font-mono text-[8px] tracking-[0.13em] text-[#716c62] md:flex-row md:justify-between md:p-10">
          <span>RECORD ≠ EVIDENCE</span>
          <span>PUBLICATION ≠ VALIDATION</span>
          <span>SFI · RETURN / PROVENANCE V1</span>
        </footer>
      </article>
    </main>
  );
}
